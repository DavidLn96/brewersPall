/**
 * Bitterness (IBU) calculations.
 *
 * IBU ≈ mg/L of iso-alpha acids:
 *   IBU = utilization × (alpha% / 100) × grams × 1000 / liters
 *
 * Volume: post-boil wort volume, cooled (the volume whose gravity the OG describes).
 * Gravity: the average of pre-boil and post-boil gravity, as an estimate of the gravity
 * during the boil.
 *
 * Limitations: neither model accounts for kettle geometry, hop freshness, pH, or
 * isomerization after flameout beyond the whirlpool model below. Treat results as
 * estimates and calibrate against your own tasting.
 */
import type { Hop, IbuMethod } from './types';

/**
 * Tinseth utilization (Glenn Tinseth, 1997).
 *   bigness = 1.65 × 0.000125^(Gb − 1)
 *   boilTime = (1 − e^(−0.04 t)) / 4.15
 *   U = bigness × boilTime
 * Inputs: boil gravity (SG), time (minutes). Output: utilization as a fraction.
 * Reference: Tinseth's table gives 0.231 at SG 1.050 and 60 min.
 */
export function tinsethUtilization(boilGravity: number, minutes: number): number {
  if (minutes <= 0) return 0;
  const bigness = 1.65 * Math.pow(0.000125, boilGravity - 1);
  const timeFactor = (1 - Math.exp(-0.04 * minutes)) / 4.15;
  return bigness * timeFactor;
}

/**
 * Rager utilization (Jackie Rager, Zymurgy 1990).
 *   U% = 18.11 + 13.86 × tanh((t − 31.32) / 18.27)
 *   gravity adjustment GA = (Gb − 1.050) / 0.2 when Gb > 1.050, else 0
 *   IBU = W × U × AA × 1000 / (V × (1 + GA))
 * Returns the effective utilization fraction U / (1 + GA).
 * Reference: Rager's table gives about 30.8% at 60 minutes.
 */
export function ragerUtilization(boilGravity: number, minutes: number): number {
  if (minutes <= 0) return 0;
  const u = (18.11 + 13.86 * Math.tanh((minutes - 31.32) / 18.27)) / 100;
  const ga = boilGravity > 1.05 ? (boilGravity - 1.05) / 0.2 : 0;
  return Math.max(0, u) / (1 + ga);
}

/**
 * Relative isomerization rate at temperature T compared to boiling (100 °C), from
 * Malowicki's alpha-acid isomerization kinetics (2005), as used in the mIBU method:
 *   k(T) / k(100 °C) = 2.39×10¹¹ × e^(−9773 / T[K])
 * About 1.0 at 100 °C, 0.23 at 80 °C, 0.05 at 65 °C.
 */
export function relativeIsomerizationRate(tempC: number): number {
  const k = tempC + 273.15;
  return 2.39e11 * Math.exp(-9773 / k);
}

/** Convention used for first-wort hops: full boil time plus 10% utilization. */
export const FIRST_WORT_BONUS = 1.1;
/** Convention used for mash hops: 20% of the utilization of a full-length boil addition. */
export const MASH_HOP_FACTOR = 0.2;
export const DEFAULT_WHIRLPOOL_TEMP_C = 80;

/**
 * Utilization for one hop addition, by use.
 * - boil: method utilization at its boil time, capped at the boil duration.
 * - first-wort: full boil time × 1.1 (common convention; FWH bitterness studies vary).
 * - mash: 0.2 × full-boil utilization (rough convention; little isomerization occurs in the mash).
 * - whirlpool: method utilization at an equivalent time = steep minutes × relative rate at the
 *   whirlpool temperature. Ignores isomerization while the wort cools further.
 * - dry-hop: 0. Dry hops add little iso-alpha acid; their bitterness contribution is not modeled.
 */
export function hopUtilization(hop: Pick<Hop, 'use' | 'time' | 'whirlpoolTempC'>, boilGravity: number, boilMinutes: number, method: IbuMethod): number {
  const u = method === 'rager' ? ragerUtilization : tinsethUtilization;
  switch (hop.use) {
    case 'boil':
      // An addition cannot boil longer than the boil itself.
      return u(boilGravity, Math.min(hop.time, boilMinutes));
    case 'first-wort':
      return u(boilGravity, boilMinutes) * FIRST_WORT_BONUS;
    case 'mash':
      return u(boilGravity, boilMinutes) * MASH_HOP_FACTOR;
    case 'whirlpool': {
      const rate = relativeIsomerizationRate(hop.whirlpoolTempC ?? DEFAULT_WHIRLPOOL_TEMP_C);
      return u(boilGravity, hop.time * rate);
    }
    case 'dry-hop':
      return 0;
  }
}

/** IBU for one addition. alphaPct in percent, grams, liters. */
export function ibuFromUtilization(utilization: number, alphaPct: number, grams: number, liters: number): number {
  if (liters <= 0) return 0;
  return (utilization * (alphaPct / 100) * grams * 1000) / liters;
}
