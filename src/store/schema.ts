/**
 * Runtime validation for data read from localStorage or imported files.
 * Anything coming from outside the running app is parsed here before use.
 */
import { z } from 'zod';

const num = z.number().finite();
const nonNeg = num.min(0);
const id = z.string().min(1);

export const equipmentSchema = z.object({
  name: z.string(),
  kettleVolumeL: nonNeg,
  mashTunVolumeL: nonNeg,
  mashTunDeadspaceL: nonNeg,
  kettleLossL: nonNeg,
  fermenterLossL: nonNeg,
  boilOffLPerHr: nonNeg,
  coolingShrinkagePct: num.min(0).max(50),
  grainAbsorptionLPerKg: nonNeg,
  hopAbsorptionMlPerG: nonNeg,
  mashThicknessLPerKg: nonNeg,
  grainTempC: num.min(-20).max(60),
});

const method = z.enum(['all-grain', 'biab', 'extract', 'partial-mash']);
const target = z.enum(['fermenter', 'kettle']);

export const equipmentProfileSchema = equipmentSchema.extend({
  id,
  method,
  batchTarget: target,
  defaultBatchL: nonNeg,
  defaultBoilMinutes: nonNeg,
  defaultEfficiencyPct: num.min(0).max(100),
  notes: z.string().optional(),
  updatedAt: z.string(),
});

export const fermentableSchema = z.object({
  id,
  catalogId: z.string().optional(),
  name: z.string(),
  category: z.enum(['base', 'crystal', 'specialty', 'roasted', 'adjunct', 'extract', 'sugar']),
  supplier: z.string().optional(),
  potentialPpg: num.min(0).max(50),
  colorLovibond: num.min(0).max(1000),
  amountKg: nonNeg,
  stage: z.enum(['mash', 'boil', 'fermenter']),
  fermentable: z.boolean(),
});

export const hopSchema = z.object({
  id,
  catalogId: z.string().optional(),
  name: z.string(),
  alphaPct: num.min(0).max(30),
  amountG: nonNeg,
  use: z.enum(['boil', 'first-wort', 'mash', 'whirlpool', 'dry-hop']),
  time: nonNeg,
  whirlpoolTempC: num.min(0).max(100).optional(),
  form: z.enum(['pellet', 'leaf', 'cryo']),
});

export const yeastSchema = z.object({
  id,
  catalogId: z.string().optional(),
  name: z.string(),
  lab: z.string(),
  product: z.string().optional(),
  form: z.enum(['dry', 'liquid']),
  attenuationPct: num.min(0).max(100),
  tempMinC: num,
  tempMaxC: num,
  packs: nonNeg,
  starter: z.boolean(),
});

export const miscSchema = z.object({
  id,
  catalogId: z.string().optional(),
  name: z.string(),
  type: z.enum(['spice', 'fruit', 'flavor', 'fining', 'water-agent', 'acid', 'nutrient', 'sugar', 'other']),
  use: z.enum(['mash', 'boil', 'whirlpool', 'primary', 'secondary', 'bottling']),
  time: nonNeg,
  amount: nonNeg,
  unit: z.enum(['g', 'kg', 'mL', 'L', 'tsp', 'tbsp', 'each', 'oz', 'lb', 'fl oz']),
  notes: z.string().optional(),
});

export const recipeSchema = z.object({
  id,
  name: z.string(),
  author: z.string(),
  description: z.string(),
  notes: z.string(),
  styleId: z.string().nullable(),
  method,
  batchVolumeL: nonNeg,
  batchTarget: target,
  boilMinutes: nonNeg,
  efficiencyPct: num.min(0).max(100),
  equipmentProfileId: z.string().nullable(),
  equipment: equipmentSchema,
  fermentables: z.array(fermentableSchema),
  hops: z.array(hopSchema),
  yeasts: z.array(yeastSchema),
  miscs: z.array(miscSchema),
  mashSteps: z.array(z.object({ id, name: z.string(), tempC: num, minutes: nonNeg })),
  fermentationSteps: z.array(z.object({ id, name: z.string(), tempC: num, days: nonNeg })),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const settingsSchema = z.object({
  unitSystem: z.enum(['metric', 'us']),
  ibuMethod: z.enum(['tinseth', 'rager']),
  colorMethod: z.enum(['morey', 'daniels', 'mosher']),
  abvMethod: z.enum(['standard', 'alternate']),
  brewerName: z.string(),
});

export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  unitSystem: 'metric',
  ibuMethod: 'tinseth',
  colorMethod: 'morey',
  abvMethod: 'standard',
  brewerName: '',
};

/** Export file format for one or more recipes. */
export const exportFileSchema = z.object({
  format: z.literal('brewpal-recipes'),
  version: z.literal(1),
  exportedAt: z.string(),
  recipes: z.array(recipeSchema).min(1),
});

/** Turn zod issues into short messages a brewer can act on. */
export function describeIssues(error: z.ZodError, max = 5): string[] {
  return error.issues.slice(0, max).map((i) => `${i.path.join(' › ') || 'file'}: ${i.message}`);
}
