import { describe, expect, it } from 'vitest';
import { loadData, saveData, STORAGE_KEY } from '../storage';
import { DEFAULT_SETTINGS, exportFileSchema, recipeSchema } from '../schema';
import { defaultProfiles, duplicateRecipe, exampleRecipe } from '../factory';
import { calculateRecipe } from '../../domain/recipe';

class MemoryStorage implements Storage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  clear() { this.m.clear(); }
  getItem(k: string) { return this.m.get(k) ?? null; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  removeItem(k: string) { this.m.delete(k); }
  setItem(k: string, v: string) { this.m.set(k, v); }
}
class BlockedStorage extends MemoryStorage {
  setItem() { throw new Error('SecurityError'); }
}

const sample = () => {
  const equipment = defaultProfiles();
  return { recipes: [exampleRecipe(equipment[0])], equipment, settings: DEFAULT_SETTINGS, seeded: true };
};

describe('storage', () => {
  it('round-trips app data', () => {
    const st = new MemoryStorage();
    const data = sample();
    expect(saveData(data, st)).toBe(true);
    const res = loadData(st);
    expect(res.available).toBe(true);
    expect(res.skipped).toBe(0);
    expect(res.data?.recipes[0]).toEqual(data.recipes[0]);
    expect(res.data?.equipment).toHaveLength(3);
  });

  it('skips invalid records instead of failing', () => {
    const st = new MemoryStorage();
    const data = sample();
    saveData(data, st);
    const raw = JSON.parse(st.getItem(STORAGE_KEY)!);
    raw.recipes.push({ id: 'bad', name: 'Broken', batchVolumeL: -3 });
    st.setItem(STORAGE_KEY, JSON.stringify(raw));
    const res = loadData(st);
    expect(res.data?.recipes).toHaveLength(1);
    expect(res.skipped).toBe(1);
  });

  it('survives corrupt JSON', () => {
    const st = new MemoryStorage();
    st.setItem(STORAGE_KEY, '{not json');
    const res = loadData(st);
    expect(res.data).toBeNull();
    expect(res.available).toBe(true);
  });

  it('reports blocked storage', () => {
    expect(loadData(new BlockedStorage()).available).toBe(false);
    expect(saveData(sample(), new BlockedStorage())).toBe(false);
  });
});

describe('recipes', () => {
  it('example recipe validates and lands in its style', () => {
    const r = exampleRecipe(defaultProfiles()[0]);
    expect(recipeSchema.safeParse(r).success).toBe(true);
    const s = calculateRecipe(r);
    expect(s.og).toBeGreaterThan(1.045);
    expect(s.og).toBeLessThan(1.06);
    expect(s.ibu).toBeGreaterThan(30);
    expect(s.ibu).toBeLessThan(50);
  });

  it('duplicates with fresh ids', () => {
    const r = exampleRecipe(defaultProfiles()[0]);
    const d = duplicateRecipe(r);
    expect(d.id).not.toBe(r.id);
    expect(d.fermentables.map((f) => f.id)).not.toEqual(r.fermentables.map((f) => f.id));
    expect(d.fermentables.map((f) => f.amountKg)).toEqual(r.fermentables.map((f) => f.amountKg));
  });

  it('validates export files', () => {
    const r = exampleRecipe(defaultProfiles()[0]);
    expect(exportFileSchema.safeParse({ format: 'brewpal-recipes', version: 1, exportedAt: 'x', recipes: [r] }).success).toBe(true);
    expect(exportFileSchema.safeParse({ format: 'other', version: 1, exportedAt: 'x', recipes: [r] }).success).toBe(false);
    expect(exportFileSchema.safeParse({ format: 'brewpal-recipes', version: 1, exportedAt: 'x', recipes: [] }).success).toBe(false);
    expect(exportFileSchema.safeParse({ format: 'brewpal-recipes', version: 1, exportedAt: 'x', recipes: [{ ...r, efficiencyPct: 140 }] }).success).toBe(false);
  });
});
