/**
 * Brewing domain models. All quantities are in canonical units (see units.ts).
 */

export type BrewMethod = 'all-grain' | 'biab' | 'extract' | 'partial-mash';
/**
 * What the batch volume refers to.
 * - fermenter: volume of wort transferred into the fermenter; efficiency is brewhouse efficiency.
 * - kettle: post-boil volume in the kettle at flameout; efficiency is ending-kettle (mash) efficiency.
 */
export type BatchTarget = 'fermenter' | 'kettle';

export type FermentableCategory = 'base' | 'crystal' | 'specialty' | 'roasted' | 'adjunct' | 'extract' | 'sugar';
/** mash: extracted at the recipe's mash/steep efficiency. boil: 100% dissolved. fermenter: added after the boil. */
export type FermentableStage = 'mash' | 'boil' | 'fermenter';

export interface Fermentable {
  id: string;
  catalogId?: string;
  name: string;
  category: FermentableCategory;
  supplier?: string;
  /** Potential extract in PPG (gravity points per pound per US gallon at 100% extraction). */
  potentialPpg: number;
  /** Color in degrees Lovibond. */
  colorLovibond: number;
  /** Mass in kg. */
  amountKg: number;
  stage: FermentableStage;
  /** False for sugars yeast cannot ferment (lactose, maltodextrin). */
  fermentable: boolean;
}

export type HopUse = 'boil' | 'first-wort' | 'mash' | 'whirlpool' | 'dry-hop';
export type HopForm = 'pellet' | 'leaf' | 'cryo';

export interface Hop {
  id: string;
  catalogId?: string;
  name: string;
  alphaPct: number;
  amountG: number;
  use: HopUse;
  /** Boil minutes (boil), steep minutes (whirlpool), or contact days (dry-hop). Ignored for first-wort and mash. */
  time: number;
  /** Whirlpool / hop-stand temperature in °C. */
  whirlpoolTempC?: number;
  form: HopForm;
}

export type YeastForm = 'dry' | 'liquid';

export interface Yeast {
  id: string;
  catalogId?: string;
  name: string;
  lab: string;
  product?: string;
  form: YeastForm;
  /** Apparent attenuation, percent. */
  attenuationPct: number;
  tempMinC: number;
  tempMaxC: number;
  /** Number of packs/vials/sachets pitched. */
  packs: number;
  starter: boolean;
}

export type MiscType = 'spice' | 'fruit' | 'flavor' | 'fining' | 'water-agent' | 'acid' | 'nutrient' | 'sugar' | 'other';
export type MiscUse = 'mash' | 'boil' | 'whirlpool' | 'primary' | 'secondary' | 'bottling';
export type MiscUnit = 'g' | 'kg' | 'mL' | 'L' | 'tsp' | 'tbsp' | 'each' | 'oz' | 'lb' | 'fl oz';

export interface Misc {
  id: string;
  catalogId?: string;
  name: string;
  type: MiscType;
  use: MiscUse;
  /** Minutes before end of boil, or days for fermenter additions. */
  time: number;
  amount: number;
  unit: MiscUnit;
  notes?: string;
}

export interface MashStep {
  id: string;
  name: string;
  tempC: number;
  minutes: number;
}

export interface FermentationStep {
  id: string;
  name: string;
  tempC: number;
  days: number;
}

export interface Equipment {
  name: string;
  /** Usable kettle volume (L). Used only for capacity warnings. 0 = unknown. */
  kettleVolumeL: number;
  /** Mash tun volume (L). Used only for capacity warnings. 0 = unknown. */
  mashTunVolumeL: number;
  /** Wort left in the mash tun below the outlet (L). */
  mashTunDeadspaceL: number;
  /** Wort left in the kettle: trub, chiller, dead space (L). */
  kettleLossL: number;
  /** Losses between fermenter and packaging: yeast cake, sampling (L). */
  fermenterLossL: number;
  /** Boil-off rate (L/hr). */
  boilOffLPerHr: number;
  /** Volume reduction from cooling boiling wort to pitching temperature (%). */
  coolingShrinkagePct: number;
  /** Water retained by spent grain (L/kg). */
  grainAbsorptionLPerKg: number;
  /** Wort retained by kettle hops (mL/g). */
  hopAbsorptionMlPerG: number;
  /** Water to grain ratio for the strike infusion (L/kg). Ignored for BIAB full-volume mashes. */
  mashThicknessLPerKg: number;
  /** Grain temperature at mash-in (°C). */
  grainTempC: number;
}

export interface EquipmentProfile extends Equipment {
  id: string;
  method: BrewMethod;
  batchTarget: BatchTarget;
  defaultBatchL: number;
  defaultBoilMinutes: number;
  defaultEfficiencyPct: number;
  notes?: string;
  updatedAt: string;
}

export interface Recipe {
  id: string;
  name: string;
  author: string;
  description: string;
  notes: string;
  styleId: string | null;
  method: BrewMethod;
  batchVolumeL: number;
  batchTarget: BatchTarget;
  boilMinutes: number;
  /** Brewhouse efficiency when target = fermenter, ending-kettle efficiency when target = kettle (%). */
  efficiencyPct: number;
  equipmentProfileId: string | null;
  equipment: Equipment;
  fermentables: Fermentable[];
  hops: Hop[];
  yeasts: Yeast[];
  miscs: Misc[];
  mashSteps: MashStep[];
  fermentationSteps: FermentationStep[];
  createdAt: string;
  updatedAt: string;
}

export type IbuMethod = 'tinseth' | 'rager';
export type ColorMethod = 'morey' | 'daniels' | 'mosher';
export type AbvMethod = 'standard' | 'alternate';

export interface CalcOptions {
  ibuMethod: IbuMethod;
  colorMethod: ColorMethod;
  abvMethod: AbvMethod;
}

export const DEFAULT_CALC_OPTIONS: CalcOptions = {
  ibuMethod: 'tinseth',
  colorMethod: 'morey',
  abvMethod: 'standard',
};
