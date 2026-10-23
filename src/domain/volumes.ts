/**
 * Volume and water calculations.
 *
 * Volume chain (liters), working back from the batch target:
 *
 *   strike + sparge water
 *     − grain absorption − mash tun dead space         = pre-boil volume
 *   pre-boil − boil-off (rate × hours)                 = post-boil volume, hot
 *   post-boil hot × (1 − cooling shrinkage)            = post-boil volume, cooled
 *   cooled − kettle losses − hop absorption            = into fermenter
 *   into fermenter − fermenter losses                  = packaged volume
 *
 * Batch target "fermenter" fixes the into-fermenter volume; "kettle" fixes the hot
 * post-boil volume. Everything else is derived from the equipment profile, so
 * calibrate the profile against measured brew-day volumes.
 *
 * Assumptions & limitations:
 * - Full-volume boils only. Extract top-off water is not modeled.
 * - BIAB is modeled as a full-volume, no-sparge mash in the kettle.
 * - Extract method: steeping grains absorb water like mashed grain; all water is steep water.
 * - Grain displacement in the mash: 0.67 L/kg (≈0.08 gal/lb), used for capacity checks only.
 */
import type { BatchTarget, BrewMethod, Equipment } from './types';

export const GRAIN_DISPLACEMENT_L_PER_KG = 0.67;
/** Metric strike constant (Palmer, How to Brew): 0.41 for L/kg and °C (0.2 for qt/lb and °F). */
export const STRIKE_CONSTANT_METRIC = 0.41;

export interface VolumeInputs {
  method: BrewMethod;
  batchVolumeL: number;
  batchTarget: BatchTarget;
  boilMinutes: number;
  equipment: Equipment;
  /** Mass of grain in the mash or steep (kg). */
  mashGrainKg: number;
  /** Mass of hops added to the kettle: boil, first-wort and whirlpool (g). */
  kettleHopsG: number;
  /** Temperature of the first mash rest (°C), for the strike temperature. */
  mashTempC: number | null;
}

export interface VolumeResult {
  preBoilL: number;
  boilOffL: number;
  postBoilHotL: number;
  postBoilCoolL: number;
  intoFermenterL: number;
  packagedL: number;
  grainAbsorptionL: number;
  hopAbsorptionL: number;
  totalWaterL: number;
  mashWaterL: number;
  spargeWaterL: number;
  /** Actual water-to-grain ratio of the mash (L/kg), null without grain. */
  mashRatioLPerKg: number | null;
  /** Total mash volume including grain displacement (L). */
  mashVolumeL: number;
  strikeTempC: number | null;
  warnings: string[];
}

export function calculateVolumes(input: VolumeInputs): VolumeResult {
  const eq = input.equipment;
  const warnings: string[] = [];
  const shrink = clampFraction(eq.coolingShrinkagePct / 100);
  const hopAbsorptionL = (Math.max(0, input.kettleHopsG) * Math.max(0, eq.hopAbsorptionMlPerG)) / 1000;
  const kettleLoss = Math.max(0, eq.kettleLossL);
  const batch = Math.max(0, input.batchVolumeL);

  let postBoilHotL: number;
  let postBoilCoolL: number;
  let intoFermenterL: number;
  if (input.batchTarget === 'fermenter') {
    intoFermenterL = batch;
    postBoilCoolL = batch + kettleLoss + hopAbsorptionL;
    postBoilHotL = postBoilCoolL / (1 - shrink);
  } else {
    postBoilHotL = batch;
    postBoilCoolL = batch * (1 - shrink);
    intoFermenterL = Math.max(0, postBoilCoolL - kettleLoss - hopAbsorptionL);
    if (postBoilCoolL - kettleLoss - hopAbsorptionL <= 0 && batch > 0) {
      warnings.push('Kettle losses exceed the post-boil volume, so no wort reaches the fermenter.');
    }
  }

  const boilOffL = Math.max(0, eq.boilOffLPerHr) * (Math.max(0, input.boilMinutes) / 60);
  const preBoilL = postBoilHotL + boilOffL;
  const packagedL = Math.max(0, intoFermenterL - Math.max(0, eq.fermenterLossL));

  const grainKg = Math.max(0, input.mashGrainKg);
  const grainAbsorptionL = grainKg * Math.max(0, eq.grainAbsorptionLPerKg);

  let totalWaterL: number;
  let mashWaterL: number;
  let spargeWaterL: number;
  switch (input.method) {
    case 'biab':
      totalWaterL = preBoilL + grainAbsorptionL + Math.max(0, eq.mashTunDeadspaceL);
      mashWaterL = totalWaterL;
      spargeWaterL = 0;
      break;
    case 'extract':
      totalWaterL = preBoilL + grainAbsorptionL;
      mashWaterL = totalWaterL;
      spargeWaterL = 0;
      break;
    default: {
      totalWaterL = preBoilL + grainAbsorptionL + Math.max(0, eq.mashTunDeadspaceL);
      const strike = grainKg * Math.max(0, eq.mashThicknessLPerKg) + Math.max(0, eq.mashTunDeadspaceL);
      mashWaterL = Math.min(strike, totalWaterL);
      spargeWaterL = totalWaterL - mashWaterL;
      if (grainKg > 0 && strike > totalWaterL) {
        warnings.push('Mash thickness needs more water than the whole batch uses, so no sparge water remains. Lower the mash thickness or consider a no-sparge mash.');
      }
    }
  }

  const mashRatioLPerKg = grainKg > 0 ? mashWaterL / grainKg : null;
  const mashVolumeL = mashWaterL + grainKg * GRAIN_DISPLACEMENT_L_PER_KG;

  const strikeTempC =
    mashRatioLPerKg && input.mashTempC != null && input.method !== 'extract'
      ? strikeWaterTemp(mashRatioLPerKg, eq.grainTempC, input.mashTempC)
      : null;

  if (eq.kettleVolumeL > 0 && preBoilL > eq.kettleVolumeL) {
    warnings.push(`Pre-boil volume (${preBoilL.toFixed(1)} L) is more than the kettle holds (${eq.kettleVolumeL.toFixed(1)} L).`);
  }
  if (input.method === 'biab') {
    if (eq.kettleVolumeL > 0 && mashVolumeL > eq.kettleVolumeL) {
      warnings.push(`Full-volume mash with grain (${mashVolumeL.toFixed(1)} L) is more than the kettle holds (${eq.kettleVolumeL.toFixed(1)} L).`);
    }
  } else if (input.method !== 'extract' && eq.mashTunVolumeL > 0 && mashVolumeL > eq.mashTunVolumeL) {
    warnings.push(`Mash volume with grain (${mashVolumeL.toFixed(1)} L) is more than the mash tun holds (${eq.mashTunVolumeL.toFixed(1)} L).`);
  }

  return {
    preBoilL,
    boilOffL,
    postBoilHotL,
    postBoilCoolL,
    intoFermenterL,
    packagedL,
    grainAbsorptionL,
    hopAbsorptionL,
    totalWaterL,
    mashWaterL,
    spargeWaterL,
    mashRatioLPerKg,
    mashVolumeL,
    strikeTempC,
    warnings,
  };
}

/**
 * Strike water temperature for a single infusion (John Palmer, How to Brew):
 *   Tw = (0.41 / r) × (T2 − T1) + T2
 * r: water-to-grain ratio (L/kg), T1: grain temperature (°C), T2: target mash temperature (°C).
 * Assumes a preheated mash tun (no heat loss to the vessel).
 */
export function strikeWaterTemp(ratioLPerKg: number, grainTempC: number, targetTempC: number): number {
  if (ratioLPerKg <= 0) return targetTempC;
  return (STRIKE_CONSTANT_METRIC / ratioLPerKg) * (targetTempC - grainTempC) + targetTempC;
}

function clampFraction(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.min(0.5, Math.max(0, v));
}
