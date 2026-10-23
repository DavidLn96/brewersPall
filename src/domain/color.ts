/**
 * Beer color.
 *
 * Malt Color Units: MCU = Σ (weight_lb × color_°L) / volume_gal
 *
 * Volume: post-boil wort volume (cooled). Inputs to this module are canonical
 * (kg, °L, liters) and converted to the US units the formulas were fit in.
 *
 * Methods (SRM from MCU):
 *   morey:   SRM = 1.4922 × MCU^0.6859      (Dan Morey; recommended over the full range)
 *   daniels: SRM = 0.2 × MCU + 8.4          (Ray Daniels; intended for MCU > ~11)
 *   mosher:  SRM = 0.3 × MCU + 4.7          (Randy Mosher; intended for MCU > ~7)
 * Below their intended range Daniels and Mosher are linear fits that overstate pale beers;
 * we return MCU itself when it is lower than the formula's result for very pale worts,
 * since color cannot exceed what is added at low MCU (MCU ≈ SRM below ~10).
 *
 * EBC ≈ SRM × 1.97.
 */
import type { ColorMethod } from './types';
import { kgToLb, lToGal } from './units';

export function mcu(items: { amountKg: number; colorLovibond: number }[], liters: number): number {
  if (liters <= 0) return 0;
  const gal = lToGal(liters);
  return items.reduce((s, f) => s + kgToLb(f.amountKg) * f.colorLovibond, 0) / gal;
}

export function srmFromMcu(m: number, method: ColorMethod = 'morey'): number {
  if (m <= 0) return 0;
  switch (method) {
    case 'morey':
      return 1.4922 * Math.pow(m, 0.6859);
    case 'daniels':
      return Math.min(m, 0.2 * m + 8.4);
    case 'mosher':
      return Math.min(m, 0.3 * m + 4.7);
  }
}

export const srmToEbc = (srm: number) => srm * 1.97;
export const ebcToSrm = (ebc: number) => ebc / 1.97;

/**
 * Approximate on-screen color for an SRM value (display only, not a measurement).
 * Interpolates a commonly used SRM → sRGB reference table.
 */
const SRM_RGB: [number, [number, number, number]][] = [
  [1, [255, 230, 153]], [2, [255, 216, 120]], [3, [255, 202, 90]], [4, [255, 191, 66]],
  [5, [251, 177, 35]], [6, [248, 166, 0]], [7, [243, 156, 0]], [8, [234, 143, 0]],
  [9, [229, 133, 0]], [10, [222, 124, 0]], [12, [207, 105, 0]], [14, [191, 87, 0]],
  [16, [176, 71, 0]], [18, [161, 57, 0]], [20, [149, 45, 0]], [24, [127, 28, 0]],
  [28, [107, 17, 0]], [32, [91, 10, 0]], [36, [77, 5, 0]], [40, [61, 1, 0]],
];

export function srmToHex(srm: number): string {
  const s = Math.max(1, Math.min(40, srm || 1));
  let lo = SRM_RGB[0];
  let hi = SRM_RGB[SRM_RGB.length - 1];
  for (let i = 0; i < SRM_RGB.length - 1; i++) {
    if (s >= SRM_RGB[i][0] && s <= SRM_RGB[i + 1][0]) {
      lo = SRM_RGB[i];
      hi = SRM_RGB[i + 1];
      break;
    }
  }
  const t = hi[0] === lo[0] ? 0 : (s - lo[0]) / (hi[0] - lo[0]);
  const c = lo[1].map((v, i) => Math.round(v + (hi[1][i] - v) * t));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}
