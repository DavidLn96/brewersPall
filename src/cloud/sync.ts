/**
 * Cloud persistence. The app keeps working on in-memory AppData; this module loads it
 * from Supabase and pushes the difference after each change.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { EquipmentProfile, Recipe } from '../domain/types';
import type { AppData } from '../store/storage';
import { equipmentProfileSchema, recipeSchema, settingsSchema, DEFAULT_SETTINGS, type Settings } from '../store/schema';

export interface Changes {
  recipeUpserts: Recipe[];
  recipeDeletes: string[];
  equipmentUpserts: EquipmentProfile[];
  equipmentDeletes: string[];
  settings: Settings | null;
}

/** What changed between two snapshots. Unchanged objects are skipped by reference. */
export function diff(prev: AppData, next: AppData): Changes {
  const byId = <T extends { id: string }>(xs: T[]) => new Map(xs.map((x) => [x.id, x]));
  const pr = byId(prev.recipes);
  const pe = byId(prev.equipment);
  const nr = byId(next.recipes);
  const ne = byId(next.equipment);
  return {
    recipeUpserts: next.recipes.filter((r) => pr.get(r.id) !== r),
    recipeDeletes: prev.recipes.filter((r) => !nr.has(r.id)).map((r) => r.id),
    equipmentUpserts: next.equipment.filter((e) => pe.get(e.id) !== e),
    equipmentDeletes: prev.equipment.filter((e) => !ne.has(e.id)).map((e) => e.id),
    settings: prev.settings !== next.settings ? next.settings : null,
  };
}

export const isEmpty = (c: Changes) => !c.recipeUpserts.length && !c.recipeDeletes.length && !c.equipmentUpserts.length && !c.equipmentDeletes.length && !c.settings;

/** Merge two change sets, later wins. Used when a push fails and must be retried. */
export function mergeChanges(a: Changes, b: Changes): Changes {
  const merge = <T extends { id: string }>(ups: T[], dels: string[], ups2: T[], dels2: string[]) => {
    const m = new Map(ups.map((x) => [x.id, x]));
    dels2.forEach((id) => m.delete(id));
    ups2.forEach((x) => m.set(x.id, x));
    const d = new Set([...dels.filter((id) => !ups2.some((x) => x.id === id)), ...dels2]);
    return { ups: [...m.values()], dels: [...d] };
  };
  const r = merge(a.recipeUpserts, a.recipeDeletes, b.recipeUpserts, b.recipeDeletes);
  const e = merge(a.equipmentUpserts, a.equipmentDeletes, b.equipmentUpserts, b.equipmentDeletes);
  return { recipeUpserts: r.ups, recipeDeletes: r.dels, equipmentUpserts: e.ups, equipmentDeletes: e.dels, settings: b.settings ?? a.settings };
}

export interface CloudLoad {
  data: AppData;
  skipped: number;
  /** True when the account has no saved data yet (first sign-in). */
  empty: boolean;
}

/** Load the signed-in user's own data. Recipes are readable by every signed-in user, so they are filtered by owner. */
export async function loadCloud(client: SupabaseClient, userId: string): Promise<CloudLoad> {
  const [r, e, s] = await Promise.all([
    client.from('recipes').select('data').eq('user_id', userId).order('updated_at', { ascending: false }),
    client.from('equipment_profiles').select('data'),
    client.from('user_settings').select('data').maybeSingle(),
  ]);
  const err = r.error ?? e.error ?? s.error;
  if (err) throw new Error(err.message);
  let skipped = 0;
  const recipes: Recipe[] = [];
  for (const row of r.data ?? []) {
    const p = recipeSchema.safeParse(row.data);
    if (p.success) recipes.push(p.data as Recipe);
    else skipped++;
  }
  const equipment: EquipmentProfile[] = [];
  for (const row of e.data ?? []) {
    const p = equipmentProfileSchema.safeParse(row.data);
    if (p.success) equipment.push(p.data as EquipmentProfile);
    else skipped++;
  }
  const settings = settingsSchema.safeParse(s.data?.data);
  return {
    data: { recipes, equipment, settings: settings.success ? settings.data : DEFAULT_SETTINGS, seeded: true },
    skipped,
    empty: recipes.length === 0 && equipment.length === 0 && !s.data,
  };
}

/** Push a change set. Rows are keyed by (user_id, id); user_id comes from the session via the column default and RLS. */
export async function pushChanges(client: SupabaseClient, c: Changes): Promise<void> {
  const ops: PromiseLike<{ error: { message: string } | null }>[] = [];
  if (c.recipeUpserts.length) ops.push(client.from('recipes').upsert(c.recipeUpserts.map((x) => ({ id: x.id, data: x })), { onConflict: 'user_id,id' }));
  if (c.recipeDeletes.length) ops.push(client.from('recipes').delete().in('id', c.recipeDeletes));
  if (c.equipmentUpserts.length) ops.push(client.from('equipment_profiles').upsert(c.equipmentUpserts.map((x) => ({ id: x.id, data: x })), { onConflict: 'user_id,id' }));
  if (c.equipmentDeletes.length) ops.push(client.from('equipment_profiles').delete().in('id', c.equipmentDeletes));
  if (c.settings) ops.push(client.from('user_settings').upsert({ data: c.settings }, { onConflict: 'user_id' }));
  const results = await Promise.all(ops);
  const failed = results.find((x) => x.error);
  if (failed?.error) throw new Error(failed.error.message);
}

export interface PublicRecipe {
  ownerId: string;
  /** Owner's display name from their sign-in profile; null for recipes saved before names were recorded. */
  ownerName: string | null;
  recipe: Recipe;
}

type PublicRow = { user_id: string; owner_name: string | null; data: unknown };
const PUBLIC_COLUMNS = 'user_id, owner_name, data';

function toPublic(row: PublicRow): PublicRecipe | null {
  const p = recipeSchema.safeParse(row.data);
  return p.success ? { ownerId: row.user_id, ownerName: row.owner_name, recipe: p.data as Recipe } : null;
}

/** The most recently updated recipes of every user. Rows that fail validation are left out. */
export async function loadPublicRecipes(client: SupabaseClient, limit = 500): Promise<PublicRecipe[]> {
  const { data, error } = await client.from('recipes').select(PUBLIC_COLUMNS).order('updated_at', { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  return ((data ?? []) as PublicRow[]).map(toPublic).filter((x): x is PublicRecipe => x !== null);
}

export async function loadPublicRecipe(client: SupabaseClient, ownerId: string, id: string): Promise<PublicRecipe | null> {
  const { data, error } = await client.from('recipes').select(PUBLIC_COLUMNS).eq('user_id', ownerId).eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toPublic(data as PublicRow) : null;
}
