/**
 * localStorage persistence. Phase 1 keeps everything in the browser.
 *
 * Every read is validated; a record that fails validation is skipped (and counted)
 * rather than crashing the app. If storage is unavailable (private mode, blocked
 * site data) the app keeps working in memory and tells the user.
 */
import { z } from 'zod';
import type { EquipmentProfile, Recipe } from '../domain/types';
import { equipmentProfileSchema, recipeSchema, settingsSchema, DEFAULT_SETTINGS, type Settings } from './schema';

export const STORAGE_KEY = 'brewpal:data:v1';

export interface AppData {
  recipes: Recipe[];
  equipment: EquipmentProfile[];
  settings: Settings;
  /** True once the example recipe has been offered, so deleting it is permanent. */
  seeded: boolean;
}

export interface LoadResult {
  data: AppData | null;
  available: boolean;
  skipped: number;
}

const envelope = z.object({
  version: z.literal(1),
  recipes: z.array(z.unknown()),
  equipment: z.array(z.unknown()),
  settings: z.unknown(),
  seeded: z.boolean().optional(),
});

export function storageAvailable(storage: Storage | undefined = safeLocalStorage()): boolean {
  if (!storage) return false;
  try {
    const k = '__brewpal_probe__';
    storage.setItem(k, '1');
    storage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

export function loadData(storage: Storage | undefined = safeLocalStorage()): LoadResult {
  if (!storageAvailable(storage)) return { data: null, available: false, skipped: 0 };
  let raw: string | null = null;
  try {
    raw = storage!.getItem(STORAGE_KEY);
  } catch {
    return { data: null, available: false, skipped: 0 };
  }
  if (!raw) return { data: null, available: true, skipped: 0 };
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { data: null, available: true, skipped: 1 };
  }
  const env = envelope.safeParse(json);
  if (!env.success) return { data: null, available: true, skipped: 1 };
  let skipped = 0;
  const recipes: Recipe[] = [];
  for (const r of env.data.recipes) {
    const p = recipeSchema.safeParse(r);
    if (p.success) recipes.push(p.data as Recipe);
    else skipped++;
  }
  const equipment: EquipmentProfile[] = [];
  for (const e of env.data.equipment) {
    const p = equipmentProfileSchema.safeParse(e);
    if (p.success) equipment.push(p.data as EquipmentProfile);
    else skipped++;
  }
  const s = settingsSchema.safeParse(env.data.settings);
  return {
    data: { recipes, equipment, settings: s.success ? s.data : DEFAULT_SETTINGS, seeded: env.data.seeded ?? true },
    available: true,
    skipped,
  };
}

export function saveData(data: AppData, storage: Storage | undefined = safeLocalStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, ...data }));
    return true;
  } catch {
    return false;
  }
}

function safeLocalStorage(): Storage | undefined {
  try {
    return typeof window !== 'undefined' ? window.localStorage : undefined;
  } catch {
    return undefined;
  }
}
