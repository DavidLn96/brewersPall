/**
 * Gravity, attenuation and alcohol calculations.
 */
import type { AbvMethod } from './types';

/** Gravity points: (SG − 1) × 1000. 1.050 → 50. */
export const sgToPoints = (sg: number) => (sg - 1) * 1000;
export const pointsToSg = (points: number) => 1 + points / 1000;

/**
 * Specific gravity to degrees Plato.
 * Cubic polynomial fit to the ASBC Plato table (as published by e.g. Hackbarth 2011 / brewersfriend):
 *   °P = −616.868 + 1111.14·SG − 630.272·SG² + 135.997·SG³
 * Valid for roughly SG 1.000–1.130. Input: SG. Output: °P.
 */
export function sgToPlato(sg: number): number {
  return -616.868 + 1111.14 * sg - 630.272 * sg ** 2 + 135.997 * sg ** 3;
}

/**
 * Degrees Plato to specific gravity (inverse approximation commonly used in brewing):
 *   SG = 1 + °P / (258.6 − (°P / 258.2) × 227.1)
 * Agrees with sgToPlato to within ~0.0005 SG over 0–30 °P.
 */
export function platoToSg(plato: number): number {
  return 1 + plato / (258.6 - (plato / 258.2) * 227.1);
}

/**
 * Final gravity from original gravity and apparent attenuation.
 *
 * Assumption: apparent attenuation applies only to fermentable points; unfermentable
 * points (lactose, maltodextrin) remain in full.
 *
 * @param fermentablePoints gravity points from fermentable sugars
 * @param unfermentablePoints gravity points from unfermentable sugars
 * @param attenuationPct apparent attenuation, percent (0–100)
 * @returns FG as SG
 */
export function estimateFg(fermentablePoints: number, unfermentablePoints: number, attenuationPct: number): number {
  const att = clamp(attenuationPct, 0, 100) / 100;
  return pointsToSg(fermentablePoints * (1 - att) + unfermentablePoints);
}

/**
 * ABV (% by volume).
 *
 * standard:  ABV = (OG − FG) × 131.25. The common homebrew approximation; accurate to
 *            about ±0.2% ABV for beers under ~7% ABV, under-reads strong beers.
 * alternate: ABV = 76.08 × (OG − FG) / (1.775 − OG) × (FG / 0.794). Usually attributed to
 *            Ray Daniels' "Designing Great Beers"; more accurate for high-gravity beers.
 *
 * Inputs: SG. Output: percent. Returns 0 if FG ≥ OG.
 */
export function abv(og: number, fg: number, method: AbvMethod = 'standard'): number {
  if (!(og > fg)) return 0;
  if (method === 'alternate') return ((76.08 * (og - fg)) / (1.775 - og)) * (fg / 0.794);
  return (og - fg) * 131.25;
}

/** Apparent attenuation (%) from OG and FG. */
export function apparentAttenuation(og: number, fg: number): number {
  const p = sgToPoints(og);
  if (p <= 0) return 0;
  return ((p - sgToPoints(fg)) / p) * 100;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
