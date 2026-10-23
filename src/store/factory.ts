import type { Equipment, EquipmentProfile, Fermentable, Hop, Misc, Recipe, Yeast } from '../domain/types';
import type { FermentableCatalogItem } from '../data/fermentables';
import type { HopCatalogItem } from '../data/hops';
import type { YeastCatalogItem } from '../data/yeasts';
import type { MiscCatalogItem } from '../data/miscs';
import { DEFAULT_PROFILES } from '../data/equipment';

export function uid(prefix = ''): string {
  const rand = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return prefix + rand;
}

export const now = () => new Date().toISOString();

export function equipmentFromProfile(p: EquipmentProfile | Omit<EquipmentProfile, 'updatedAt'>): Equipment {
  return {
    name: p.name,
    kettleVolumeL: p.kettleVolumeL,
    mashTunVolumeL: p.mashTunVolumeL,
    mashTunDeadspaceL: p.mashTunDeadspaceL,
    kettleLossL: p.kettleLossL,
    fermenterLossL: p.fermenterLossL,
    boilOffLPerHr: p.boilOffLPerHr,
    coolingShrinkagePct: p.coolingShrinkagePct,
    grainAbsorptionLPerKg: p.grainAbsorptionLPerKg,
    hopAbsorptionMlPerG: p.hopAbsorptionMlPerG,
    mashThicknessLPerKg: p.mashThicknessLPerKg,
    grainTempC: p.grainTempC,
  };
}

export function defaultProfiles(): EquipmentProfile[] {
  const t = now();
  return DEFAULT_PROFILES.map((p) => ({ ...p, updatedAt: t }));
}

export function newRecipe(profile: EquipmentProfile | undefined, author: string): Recipe {
  const p = profile ?? defaultProfiles()[0];
  const t = now();
  return {
    id: uid('r_'),
    name: 'Untitled recipe',
    author,
    description: '',
    notes: '',
    styleId: null,
    method: p.method,
    batchVolumeL: p.defaultBatchL,
    batchTarget: p.batchTarget,
    boilMinutes: p.defaultBoilMinutes,
    efficiencyPct: p.defaultEfficiencyPct,
    equipmentProfileId: p.id,
    equipment: equipmentFromProfile(p),
    fermentables: [],
    hops: [],
    yeasts: [],
    miscs: [],
    mashSteps: p.method === 'extract' ? [{ id: uid('m_'), name: 'Steep', tempC: 68, minutes: 30 }] : [{ id: uid('m_'), name: 'Saccharification', tempC: 66, minutes: 60 }],
    fermentationSteps: [{ id: uid('fs_'), name: 'Primary', tempC: 19, days: 14 }],
    createdAt: t,
    updatedAt: t,
  };
}

export function fermentableFromCatalog(c: FermentableCatalogItem, amountKg: number): Fermentable {
  return {
    id: uid('f_'),
    catalogId: c.id,
    name: c.name,
    category: c.category,
    potentialPpg: c.ppg,
    colorLovibond: c.lovibond,
    amountKg,
    stage: c.stage,
    fermentable: c.fermentable ?? true,
  };
}

export function customFermentable(name: string): Fermentable {
  return { id: uid('f_'), name, category: 'specialty', potentialPpg: 34, colorLovibond: 10, amountKg: 0.25, stage: 'mash', fermentable: true };
}

export function hopFromCatalog(c: HopCatalogItem, amountG: number, time: number): Hop {
  return { id: uid('h_'), catalogId: c.id, name: c.name, alphaPct: c.alpha, amountG, use: 'boil', time, form: 'pellet' };
}

export function customHop(name: string): Hop {
  return { id: uid('h_'), name, alphaPct: 8, amountG: 25, use: 'boil', time: 15, form: 'pellet' };
}

export function yeastFromCatalog(c: YeastCatalogItem): Yeast {
  return {
    id: uid('y_'),
    catalogId: c.id,
    name: c.name,
    lab: c.lab,
    product: c.product,
    form: c.form,
    attenuationPct: c.attenuation,
    tempMinC: c.tempMinC,
    tempMaxC: c.tempMaxC,
    packs: 1,
    starter: false,
  };
}

export function customYeast(name: string): Yeast {
  return { id: uid('y_'), name, lab: 'Custom', form: 'liquid', attenuationPct: 75, tempMinC: 18, tempMaxC: 22, packs: 1, starter: false };
}

export function miscFromCatalog(c: MiscCatalogItem): Misc {
  return { id: uid('x_'), catalogId: c.id, name: c.name, type: c.type, use: c.use, time: c.time, amount: c.amount, unit: c.unit, notes: c.notes };
}

export function customMisc(name: string): Misc {
  return { id: uid('x_'), name, type: 'other', use: 'boil', time: 10, amount: 1, unit: 'g' };
}

/** Give every nested item a fresh id so a copy never shares ids with its source. */
export function duplicateRecipe(r: Recipe): Recipe {
  const t = now();
  return {
    ...structuredClone(r),
    id: uid('r_'),
    name: `${r.name} (copy)`,
    fermentables: r.fermentables.map((x) => ({ ...x, id: uid('f_') })),
    hops: r.hops.map((x) => ({ ...x, id: uid('h_') })),
    yeasts: r.yeasts.map((x) => ({ ...x, id: uid('y_') })),
    miscs: r.miscs.map((x) => ({ ...x, id: uid('x_') })),
    mashSteps: r.mashSteps.map((x) => ({ ...x, id: uid('m_') })),
    fermentationSteps: r.fermentationSteps.map((x) => ({ ...x, id: uid('fs_') })),
    createdAt: t,
    updatedAt: t,
  };
}

/** An example recipe so a first visit shows a working builder. Marked as an example in its name. */
export function exampleRecipe(profile: EquipmentProfile): Recipe {
  const r = newRecipe(profile, '');
  return {
    ...r,
    name: 'Example: Cascade Pale Ale',
    description: 'A sample recipe to explore the builder. Edit it, duplicate it, or delete it.',
    styleId: 'bjcp2021-18b',
    fermentables: [
      { id: uid('f_'), catalogId: 'pale-2row', name: 'Pale Malt, 2-Row (US)', category: 'base', potentialPpg: 37, colorLovibond: 1.8, amountKg: 4.5, stage: 'mash', fermentable: true },
      { id: uid('f_'), catalogId: 'munich-light', name: 'Munich Malt, Light', category: 'base', potentialPpg: 35, colorLovibond: 6, amountKg: 0.4, stage: 'mash', fermentable: true },
      { id: uid('f_'), catalogId: 'crystal-40', name: 'Crystal / Caramel 40L', category: 'crystal', potentialPpg: 34, colorLovibond: 40, amountKg: 0.3, stage: 'mash', fermentable: true },
    ],
    hops: [
      { id: uid('h_'), catalogId: 'magnum', name: 'Magnum', alphaPct: 13, amountG: 18, use: 'boil', time: 60, form: 'pellet' },
      { id: uid('h_'), catalogId: 'cascade', name: 'Cascade', alphaPct: 6, amountG: 30, use: 'boil', time: 10, form: 'pellet' },
      { id: uid('h_'), catalogId: 'cascade', name: 'Cascade', alphaPct: 6, amountG: 40, use: 'whirlpool', time: 20, whirlpoolTempC: 80, form: 'pellet' },
      { id: uid('h_'), catalogId: 'cascade', name: 'Cascade', alphaPct: 6, amountG: 50, use: 'dry-hop', time: 4, form: 'pellet' },
    ],
    yeasts: [{ id: uid('y_'), catalogId: 'us-05', name: 'SafAle American Ale', lab: 'Fermentis', product: 'US-05', form: 'dry', attenuationPct: 80, tempMinC: 18, tempMaxC: 22, packs: 1, starter: false }],
    miscs: [{ id: uid('x_'), catalogId: 'whirlfloc', name: 'Whirlfloc tablet', type: 'fining', use: 'boil', time: 15, amount: 1, unit: 'each' }],
    fermentationSteps: [
      { id: uid('fs_'), name: 'Primary', tempC: 19, days: 10 },
      { id: uid('fs_'), name: 'Cold crash', tempC: 2, days: 2 },
    ],
  };
}
