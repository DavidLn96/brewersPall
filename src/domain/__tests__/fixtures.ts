import type { Equipment, Recipe } from '../types';
import { galToL, lbToKg } from '../units';

/** Equipment with no losses, so results can be checked against textbook formulas. */
export const LOSSLESS: Equipment = {
  name: 'Lossless',
  kettleVolumeL: 0,
  mashTunVolumeL: 0,
  mashTunDeadspaceL: 0,
  kettleLossL: 0,
  fermenterLossL: 0,
  boilOffLPerHr: 0,
  coolingShrinkagePct: 0,
  grainAbsorptionLPerKg: 0,
  hopAbsorptionMlPerG: 0,
  mashThicknessLPerKg: 3,
  grainTempC: 20,
};

export function baseRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 'r1',
    name: 'Test',
    author: '',
    description: '',
    notes: '',
    styleId: null,
    method: 'all-grain',
    batchVolumeL: galToL(5),
    batchTarget: 'fermenter',
    boilMinutes: 60,
    efficiencyPct: 75,
    equipmentProfileId: null,
    equipment: { ...LOSSLESS },
    fermentables: [
      { id: 'f1', name: '2-Row', category: 'base', potentialPpg: 37, colorLovibond: 2, amountKg: lbToKg(10), stage: 'mash', fermentable: true },
    ],
    hops: [],
    yeasts: [],
    miscs: [],
    mashSteps: [{ id: 'm1', name: 'Saccharification', tempC: 66, minutes: 60 }],
    fermentationSteps: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}
