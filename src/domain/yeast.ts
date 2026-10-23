/**
 * Yeast pitching rate.
 *
 * Cells needed (billions) = rate (million cells / mL / °P) × wort volume (mL) × gravity (°P) / 1000
 *
 * Rates follow the widely used professional guideline (also used by Mr Malty and
 * Brewer's Friend calculators):
 *   ale    0.75 M cells/mL/°P   (1.0 above OG 1.060)
 *   lager  1.5  M cells/mL/°P   (2.0 above OG 1.060)
 * The ale/lager split is inferred from the strain's maximum recommended temperature
 * (≤ 16 °C ⇒ lager). Cell counts in a pack vary with age and handling and are not modeled.
 */
import { sgToPlato } from './gravity';

export const LAGER_MAX_TEMP_C = 16;

export function pitchRate(isLager: boolean, og: number): number {
  const high = og > 1.06;
  if (isLager) return high ? 2.0 : 1.5;
  return high ? 1.0 : 0.75;
}

export function cellsNeededBillions(volumeL: number, og: number, rateMPerMlPerP: number): number {
  if (volumeL <= 0 || og <= 1) return 0;
  return (rateMPerMlPerP * volumeL * 1000 * sgToPlato(og)) / 1000;
}
