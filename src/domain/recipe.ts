/**
 * Whole-recipe calculation. Combines the gravity, volume, bitterness and color models
 * into the numbers shown in the recipe builder. Pure function of (recipe, options).
 *
 * Extract model:
 *   extract (points·L) of a fermentable = PPG × kg × 8.3454
 *   - mash stage   × kettle efficiency (mash/steep efficiency)
 *   - boil stage   × 100%  (extracts and sugars dissolve completely)
 *   - fermenter    × 100%, diluted in the fermenter volume only
 *
 * Efficiency input:
 *   target = kettle    → the input is ending-kettle efficiency (extract in kettle / potential of mashed grain).
 *   target = fermenter → the input is brewhouse efficiency (extract into the fermenter / potential).
 *                        Kettle efficiency = brewhouse × post-boil cooled volume / into-fermenter volume.
 * Mash efficiency is reported equal to kettle efficiency; no extract is lost during the boil.
 *
 * Gravity values are for cooled wort. FG uses the highest attenuation of the recipe's yeasts.
 */
import { abv, estimateFg, pointsToSg } from './gravity';
import { hopUtilization, ibuFromUtilization } from './ibu';
import { srmFromMcu, srmToEbc } from './color';
import { calculateVolumes, type CalcWarning, type VolumeResult } from './volumes';
import { cellsNeededBillions, LAGER_MAX_TEMP_C, pitchRate } from './yeast';
import { kgToLb, lToGal, PPG_TO_PKL } from './units';
import type { CalcOptions, Recipe } from './types';

export type { CalcWarning };
import { DEFAULT_CALC_OPTIONS } from './types';

export const DEFAULT_ATTENUATION_PCT = 75;

export interface FermentableStat {
  id: string;
  /** Share of total fermentable weight (%). */
  weightPct: number;
  /** Gravity points this item adds to the OG. */
  ogPoints: number;
  /** Malt color units contributed. */
  mcu: number;
}

export interface HopStat {
  id: string;
  utilization: number;
  ibu: number;
}

export interface RecipeStats {
  og: number;
  fg: number;
  abv: number;
  ibu: number;
  srm: number;
  ebc: number;
  mcu: number;
  /** BU:GU ratio (IBU / OG points). null when OG is 1.000. */
  buGu: number | null;
  preBoilGravity: number;
  boilGravity: number;
  attenuationPct: number;
  attenuationAssumed: boolean;
  totalFermentableKg: number;
  totalGrainKg: number;
  totalHopsG: number;
  kettleEfficiencyPct: number;
  brewhouseEfficiencyPct: number;
  volumes: VolumeResult;
  fermentables: FermentableStat[];
  hops: HopStat[];
  pitch: { isLager: boolean; rate: number; cellsBillions: number } | null;
  warnings: CalcWarning[];
}

export function calculateRecipe(recipe: Recipe, options: CalcOptions = DEFAULT_CALC_OPTIONS): RecipeStats {
  const warnings: CalcWarning[] = [];
  const ferms = recipe.fermentables.filter((f) => f.amountKg > 0);
  const mashFerms = ferms.filter((f) => f.stage === 'mash');
  const kettleHopsG = recipe.hops
    .filter((h) => h.use === 'boil' || h.use === 'first-wort' || h.use === 'whirlpool')
    .reduce((s, h) => s + Math.max(0, h.amountG), 0);

  const firstMash = recipe.mashSteps[0];
  const volumes = calculateVolumes({
    method: recipe.method,
    batchVolumeL: recipe.batchVolumeL,
    batchTarget: recipe.batchTarget,
    boilMinutes: recipe.boilMinutes,
    equipment: recipe.equipment,
    mashGrainKg: mashFerms.reduce((s, f) => s + f.amountKg, 0),
    kettleHopsG,
    mashTempC: firstMash ? firstMash.tempC : null,
  });
  warnings.push(...volumes.warnings);

  const vCool = volumes.postBoilCoolL;
  const vFerm = volumes.intoFermenterL;
  const eff = Math.max(0, recipe.efficiencyPct) / 100;
  const kettleEff = recipe.batchTarget === 'kettle' ? eff : vFerm > 0 ? (eff * vCool) / vFerm : 0;
  const brewhouseEff = recipe.batchTarget === 'fermenter' ? eff : vCool > 0 ? (eff * vFerm) / vCool : 0;
  if (kettleEff > 1) {
    warnings.push({ code: 'impossibleEfficiency', pct: kettleEff * 100 });
  }

  // Extract (points·L) per fermentable, and its concentration in the fermenter.
  const extractOf = (ppg: number, kg: number) => ppg * kg * PPG_TO_PKL;
  let fermentablePts = 0;
  let unfermentablePts = 0;
  let kettleExtract = 0;
  const fermStats: FermentableStat[] = [];
  const totalKg = ferms.reduce((s, f) => s + f.amountKg, 0);
  let mcuTotal = 0;

  for (const f of recipe.fermentables) {
    if (!(f.amountKg > 0)) {
      fermStats.push({ id: f.id, weightPct: 0, ogPoints: 0, mcu: 0 });
      continue;
    }
    const ext = extractOf(f.potentialPpg, f.amountKg);
    let pts = 0;
    let colorVol = vCool;
    if (f.stage === 'fermenter') {
      pts = vFerm > 0 ? ext / vFerm : 0;
      colorVol = vFerm;
    } else {
      const inKettle = f.stage === 'mash' ? ext * kettleEff : ext;
      kettleExtract += inKettle;
      pts = vCool > 0 ? inKettle / vCool : 0;
    }
    if (f.fermentable) fermentablePts += pts;
    else unfermentablePts += pts;
    const m = colorVol > 0 ? (kgToLb(f.amountKg) * f.colorLovibond) / lToGal(colorVol) : 0;
    mcuTotal += m;
    fermStats.push({ id: f.id, weightPct: totalKg > 0 ? (f.amountKg / totalKg) * 100 : 0, ogPoints: pts, mcu: m });
  }

  const ogPoints = fermentablePts + unfermentablePts;
  const og = pointsToSg(ogPoints);
  const postBoilKettleSg = pointsToSg(vCool > 0 ? kettleExtract / vCool : 0);
  const preBoilCooled = volumes.preBoilL * (1 - recipe.equipment.coolingShrinkagePct / 100);
  const preBoilGravity = pointsToSg(preBoilCooled > 0 ? kettleExtract / preBoilCooled : 0);
  const boilGravity = (preBoilGravity + postBoilKettleSg) / 2;

  const yeasts = recipe.yeasts.filter((y) => y.attenuationPct > 0);
  const attenuationAssumed = yeasts.length === 0;
  const attenuationPct = attenuationAssumed ? DEFAULT_ATTENUATION_PCT : Math.max(...yeasts.map((y) => y.attenuationPct));
  if (attenuationAssumed && ferms.length > 0) {
    warnings.push({ code: 'noYeast', pct: DEFAULT_ATTENUATION_PCT });
  }
  const fg = ogPoints > 0 ? estimateFg(fermentablePts, unfermentablePts, attenuationPct) : 1;

  const hopStats: HopStat[] = recipe.hops.map((h) => {
    const u = hopUtilization(h, boilGravity, recipe.boilMinutes, options.ibuMethod);
    return { id: h.id, utilization: u, ibu: ibuFromUtilization(u, h.alphaPct, Math.max(0, h.amountG), vCool) };
  });
  for (const h of recipe.hops) {
    if (h.use === 'boil' && h.time > recipe.boilMinutes) {
      warnings.push({ code: 'hopBoilTooLong', name: h.name, minutes: h.time, boilMinutes: recipe.boilMinutes });
    }
  }
  const ibu = hopStats.reduce((s, h) => s + h.ibu, 0);
  const srm = srmFromMcu(mcuTotal, options.colorMethod);

  const primary = yeasts[0] ?? recipe.yeasts[0];
  let pitch: RecipeStats['pitch'] = null;
  if (primary && og > 1) {
    const isLager = primary.tempMaxC <= LAGER_MAX_TEMP_C;
    const rate = pitchRate(isLager, og);
    pitch = { isLager, rate, cellsBillions: cellsNeededBillions(vFerm, og, rate) };
  }

  if (recipe.batchVolumeL <= 0) warnings.push({ code: 'zeroBatch' });

  return {
    og,
    fg,
    abv: abv(og, fg, options.abvMethod),
    ibu,
    srm,
    ebc: srmToEbc(srm),
    mcu: mcuTotal,
    buGu: ogPoints > 0 ? ibu / ogPoints : null,
    preBoilGravity,
    boilGravity,
    attenuationPct,
    attenuationAssumed,
    totalFermentableKg: totalKg,
    totalGrainKg: mashFerms.reduce((s, f) => s + f.amountKg, 0),
    totalHopsG: recipe.hops.reduce((s, h) => s + Math.max(0, h.amountG), 0),
    kettleEfficiencyPct: kettleEff * 100,
    brewhouseEfficiencyPct: brewhouseEff * 100,
    volumes,
    fermentables: fermStats,
    hops: hopStats,
    pitch,
    warnings,
  };
}

