import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { EquipmentProfile, Recipe } from '../domain/types';
import { loadData, saveData, type AppData } from './storage';
import { DEFAULT_SETTINGS, type Settings } from './schema';
import { defaultProfiles, exampleRecipe, now, uid } from './factory';
import type { SupabaseClient } from '@supabase/supabase-js';
import { diff, isEmpty, mergeChanges, pushChanges, type Changes, type CloudLoad } from '../cloud/sync';

export interface Account {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export interface CloudConfig {
  client: SupabaseClient;
  account: Account;
  initial: CloudLoad;
  signOut: () => void;
}

interface Store {
  data: AppData;
  /** Where data is saved: this browser only, or the signed-in account. */
  mode: 'local' | 'cloud';
  account: Account | null;
  signOut: (() => void) | null;
  /** Recipes saved in this browser (Phase 1) that can be copied into the account. */
  localImportCount: number;
  importLocal: () => void;
  dismissLocalImport: () => void;
  /** False when the browser refuses localStorage; data then lives only in this tab. */
  persistent: boolean;
  saveState: 'saved' | 'saving' | 'error';
  skipped: number;
  upsertRecipe: (r: Recipe) => void;
  deleteRecipe: (id: string) => void;
  importRecipes: (rs: Recipe[]) => void;
  upsertEquipment: (e: EquipmentProfile) => void;
  deleteEquipment: (id: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
}

const Ctx = createContext<Store | null>(null);

function initialData(): { data: AppData; persistent: boolean; skipped: number } {
  const res = loadData();
  if (res.data) {
    const data = res.data;
    if (data.equipment.length === 0) data.equipment = defaultProfiles();
    return { data, persistent: res.available, skipped: res.skipped };
  }
  const equipment = defaultProfiles();
  return {
    data: { recipes: [exampleRecipe(equipment[0])], equipment, settings: DEFAULT_SETTINGS, seeded: true },
    persistent: res.available,
    skipped: res.skipped,
  };
}

function initialCloudData(cloud: CloudConfig): { data: AppData; persistent: boolean; skipped: number } {
  const { data, empty, skipped } = cloud.initial;
  if (!empty) return { data: data.equipment.length ? data : { ...data, equipment: defaultProfiles() }, persistent: true, skipped };
  // First sign-in: start with the default profiles and the example recipe.
  const equipment = defaultProfiles();
  return { data: { recipes: [exampleRecipe(equipment[0])], equipment, settings: data.settings, seeded: true }, persistent: true, skipped };
}

const EMPTY: AppData = { recipes: [], equipment: [], settings: DEFAULT_SETTINGS, seeded: true };
const importKey = (userId: string) => `brewpal:imported:${userId}`;

function readLocalRecipes(userId: string): Recipe[] {
  try {
    if (window.localStorage.getItem(importKey(userId))) return [];
  } catch {
    return [];
  }
  return (loadData().data?.recipes ?? []).filter((r) => !r.name.startsWith('Example:'));
}

export function AppStoreProvider({ children, cloud }: { children: ReactNode; cloud?: CloudConfig }) {
  const [init] = useState(() => (cloud ? initialCloudData(cloud) : initialData()));
  const [data, setData] = useState<AppData>(init.data);
  const [saveState, setSaveState] = useState<Store['saveState']>('saved');
  const first = useRef(true);
  const synced = useRef<AppData>(cloud && !cloud.initial.empty ? init.data : EMPTY);
  const pending = useRef<Changes | null>(null);
  const [localRecipes, setLocalRecipes] = useState<Recipe[]>(() => (cloud ? readLocalRecipes(cloud.account.id) : []));

  // Local mode: debounced write-through to localStorage.
  useEffect(() => {
    if (cloud) return;
    if (first.current) {
      first.current = false;
      if (init.persistent) saveData(data);
      return;
    }
    if (!init.persistent) return;
    setSaveState('saving');
    const t = setTimeout(() => setSaveState(saveData(data) ? 'saved' : 'error'), 250);
    return () => clearTimeout(t);
  }, [data, init.persistent, cloud]);

  // Cloud mode: push what changed since the last successful sync. Failed pushes are
  // kept and merged into the next attempt, and retried every few seconds.
  useEffect(() => {
    if (!cloud) return;
    const c = diff(synced.current, data);
    synced.current = data;
    pending.current = pending.current ? mergeChanges(pending.current, c) : c;
    if (isEmpty(pending.current)) return;
    setSaveState('saving');
    let retry: ReturnType<typeof setTimeout> | undefined;
    const flush = () => {
      const batch = pending.current;
      if (!batch || isEmpty(batch)) return;
      pending.current = null;
      pushChanges(cloud.client, batch)
        .then(() => {
          if (!pending.current) setSaveState('saved');
        })
        .catch(() => {
          pending.current = pending.current ? mergeChanges(batch, pending.current) : batch;
          setSaveState('error');
          retry = setTimeout(flush, 5000);
        });
    };
    const t = setTimeout(flush, 600);
    return () => {
      clearTimeout(t);
      if (retry) clearTimeout(retry);
    };
  }, [data, cloud]);

  const importLocal = useCallback(() => {
    if (!cloud) return;
    setData((d) => {
      const ids = new Set(d.recipes.map((r) => r.id));
      const incoming = localRecipes.map((r) => (ids.has(r.id) ? { ...r, id: uid('r_') } : r));
      return { ...d, recipes: [...incoming, ...d.recipes] };
    });
    try {
      window.localStorage.setItem(importKey(cloud.account.id), new Date().toISOString());
    } catch {
      /* ignore */
    }
    setLocalRecipes([]);
  }, [cloud, localRecipes]);
  const dismissLocalImport = useCallback(() => {
    if (!cloud) return;
    try {
      window.localStorage.setItem(importKey(cloud.account.id), 'dismissed');
    } catch {
      /* ignore */
    }
    setLocalRecipes([]);
  }, [cloud]);

  const upsertRecipe = useCallback((r: Recipe) => {
    setData((d) => {
      const updated = { ...r, updatedAt: now() };
      const exists = d.recipes.some((x) => x.id === r.id);
      return { ...d, recipes: exists ? d.recipes.map((x) => (x.id === r.id ? updated : x)) : [updated, ...d.recipes] };
    });
  }, []);
  const deleteRecipe = useCallback((id: string) => setData((d) => ({ ...d, recipes: d.recipes.filter((x) => x.id !== id) })), []);
  const importRecipes = useCallback((rs: Recipe[]) => setData((d) => ({ ...d, recipes: [...rs, ...d.recipes] })), []);
  const upsertEquipment = useCallback((e: EquipmentProfile) => {
    setData((d) => {
      const updated = { ...e, updatedAt: now() };
      const exists = d.equipment.some((x) => x.id === e.id);
      return { ...d, equipment: exists ? d.equipment.map((x) => (x.id === e.id ? updated : x)) : [...d.equipment, updated] };
    });
  }, []);
  const deleteEquipment = useCallback((id: string) => setData((d) => ({ ...d, equipment: d.equipment.filter((x) => x.id !== id) })), []);
  const updateSettings = useCallback((patch: Partial<Settings>) => setData((d) => ({ ...d, settings: { ...d.settings, ...patch } })), []);

  const value = useMemo<Store>(
    () => ({
      data,
      mode: cloud ? 'cloud' : 'local',
      account: cloud?.account ?? null,
      signOut: cloud?.signOut ?? null,
      localImportCount: localRecipes.length,
      importLocal,
      dismissLocalImport,
      persistent: init.persistent,
      saveState,
      skipped: init.skipped,
      upsertRecipe,
      deleteRecipe,
      importRecipes,
      upsertEquipment,
      deleteEquipment,
      updateSettings,
    }),
    [data, cloud, localRecipes.length, importLocal, dismissLocalImport, init.persistent, init.skipped, saveState, upsertRecipe, deleteRecipe, importRecipes, upsertEquipment, deleteEquipment, updateSettings],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside AppStoreProvider');
  return s;
}

export function useSettings(): Settings {
  return useStore().data.settings;
}
