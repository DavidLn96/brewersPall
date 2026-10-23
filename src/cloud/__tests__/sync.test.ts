import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { diff, isEmpty, loadCloud, loadPublicRecipes, mergeChanges, pushChanges } from '../sync';
import { defaultProfiles, exampleRecipe, duplicateRecipe } from '../../store/factory';
import { DEFAULT_SETTINGS } from '../../store/schema';
import type { AppData } from '../../store/storage';

const base = (): AppData => {
  const equipment = defaultProfiles();
  return { recipes: [exampleRecipe(equipment[0])], equipment, settings: DEFAULT_SETTINGS, seeded: true };
};

describe('diff', () => {
  it('finds nothing when unchanged', () => {
    const a = base();
    expect(isEmpty(diff(a, a))).toBe(true);
  });

  it('finds edits, additions and deletions', () => {
    const a = base();
    const edited = { ...a.recipes[0], name: 'Renamed' };
    const added = duplicateRecipe(a.recipes[0]);
    const b: AppData = { ...a, recipes: [edited, added], equipment: a.equipment.slice(1), settings: { ...a.settings, unitSystem: 'us' } };
    const c = diff(a, b);
    expect(c.recipeUpserts.map((r) => r.id)).toEqual([edited.id, added.id]);
    expect(c.recipeDeletes).toEqual([]);
    expect(c.equipmentDeletes).toEqual([a.equipment[0].id]);
    expect(c.settings?.unitSystem).toBe('us');
    expect(diff(b, { ...b, recipes: [added] }).recipeDeletes).toEqual([edited.id]);
  });

  it('treats everything as new against an empty snapshot (first sign-in)', () => {
    const a = base();
    const c = diff({ recipes: [], equipment: [], settings: DEFAULT_SETTINGS, seeded: true }, a);
    expect(c.recipeUpserts).toHaveLength(1);
    expect(c.equipmentUpserts).toHaveLength(3);
  });
});

describe('mergeChanges', () => {
  it('keeps the latest version and resolves upsert/delete conflicts', () => {
    const a = base();
    const r = a.recipes[0];
    const v1 = { ...r, name: 'v1' };
    const v2 = { ...r, name: 'v2' };
    const empty = { recipeUpserts: [], recipeDeletes: [], equipmentUpserts: [], equipmentDeletes: [], settings: null };
    const m = mergeChanges({ ...empty, recipeUpserts: [v1] }, { ...empty, recipeUpserts: [v2] });
    expect(m.recipeUpserts).toEqual([v2]);
    const deleted = mergeChanges({ ...empty, recipeUpserts: [v1] }, { ...empty, recipeDeletes: [r.id] });
    expect(deleted.recipeUpserts).toEqual([]);
    expect(deleted.recipeDeletes).toEqual([r.id]);
    const recreated = mergeChanges({ ...empty, recipeDeletes: [r.id] }, { ...empty, recipeUpserts: [v2] });
    expect(recreated.recipeDeletes).toEqual([]);
    expect(recreated.recipeUpserts).toEqual([v2]);
  });
});

/** Records the calls a Supabase query builder receives. */
function fakeClient(tables: Record<string, unknown[]> = {}, fail?: string) {
  const calls: { table: string; op: string; arg: unknown; opts?: unknown }[] = [];
  const result = (data: unknown) => Promise.resolve({ data, error: fail ? { message: fail } : null });
  const client = {
    from(table: string) {
      return {
        select: () => {
          const rows = tables[table] ?? [];
          const q = {
            eq: (col: string, val: unknown) => {
              calls.push({ table, op: 'eq', arg: [col, val] });
              return q;
            },
            order: () => q,
            limit: () => q,
            maybeSingle: () => result(rows[0] ?? null),
            then: (f: (v: unknown) => unknown) => result(rows).then(f),
          };
          return q;
        },
        upsert: (arg: unknown, opts: unknown) => {
          calls.push({ table, op: 'upsert', arg, opts });
          return result(null);
        },
        delete: () => ({
          in: (_col: string, ids: string[]) => {
            calls.push({ table, op: 'delete', arg: ids });
            return result(null);
          },
        }),
      };
    },
  };
  return { client: client as unknown as SupabaseClient, calls };
}

describe('pushChanges', () => {
  it('sends upserts keyed by id and deletes by id; never sends user_id', async () => {
    const a = base();
    const { client, calls } = fakeClient();
    await pushChanges(client, { recipeUpserts: a.recipes, recipeDeletes: ['old'], equipmentUpserts: [], equipmentDeletes: [], settings: a.settings });
    expect(calls.map((c) => `${c.table}:${c.op}`)).toEqual(['recipes:upsert', 'recipes:delete', 'user_settings:upsert']);
    const rows = calls[0].arg as { id: string; data: unknown; user_id?: string }[];
    expect(rows[0].id).toBe(a.recipes[0].id);
    expect(rows[0].user_id).toBeUndefined();
    expect(calls[0].opts).toEqual({ onConflict: 'user_id,id' });
  });

  it('rejects when the database refuses a write', async () => {
    const { client } = fakeClient({}, 'new row violates row-level security policy');
    await expect(pushChanges(client, { recipeUpserts: base().recipes, recipeDeletes: [], equipmentUpserts: [], equipmentDeletes: [], settings: null })).rejects.toThrow(/row-level security/);
  });
});

describe('loadCloud', () => {
  it('validates rows and reports an empty account', async () => {
    const a = base();
    const { client } = fakeClient({ recipes: [{ data: a.recipes[0] }, { data: { name: 'broken' } }], equipment_profiles: [{ data: a.equipment[0] }], user_settings: [] });
    const res = await loadCloud(client, 'u1');
    expect(res.data.recipes).toHaveLength(1);
    expect(res.skipped).toBe(1);
    expect(res.empty).toBe(false);
    const empty = await loadCloud(fakeClient().client, 'u1');
    expect(empty.empty).toBe(true);
  });

  it('loads only the signed-in user\'s recipes', async () => {
    const { client, calls } = fakeClient({ recipes: [] });
    await loadCloud(client, 'u1');
    expect(calls).toContainEqual({ table: 'recipes', op: 'eq', arg: ['user_id', 'u1'] });
  });
});

describe('loadPublicRecipes', () => {
  it('returns every user\'s valid recipes with the owner', async () => {
    const a = base();
    const { client } = fakeClient({ recipes: [{ user_id: 'u1', owner_name: 'Ana', data: a.recipes[0] }, { user_id: 'u2', owner_name: null, data: { name: 'broken' } }] });
    const res = await loadPublicRecipes(client);
    expect(res).toHaveLength(1);
    expect(res[0]).toMatchObject({ ownerId: 'u1', ownerName: 'Ana', recipe: { id: a.recipes[0].id } });
  });
});
