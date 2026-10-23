/**
 * Unit conversions.
 *
 * Internal (canonical) units used everywhere in the domain layer:
 *   mass (grain, extract, sugar)  kilograms (kg)
 *   mass (hops, small additions)  grams (g)
 *   volume                        liters (L)
 *   temperature                   degrees Celsius (°C)
 *   time                          minutes (boil, mash) or days (fermentation)
 *   gravity                       specific gravity (SG, e.g. 1.050)
 *   color                         SRM (Lovibond for malt color input)
 *
 * The UI converts at the edge using these helpers. Nothing below the UI
 * accepts US customary values, so liters and gallons cannot mix silently.
 */

export const LB_PER_KG = 2.20462262185;
export const G_PER_OZ = 28.349523125;
export const L_PER_GAL = 3.785411784; // US gallon
export const L_PER_QT = L_PER_GAL / 4;

export const kgToLb = (kg: number) => kg * LB_PER_KG;
export const lbToKg = (lb: number) => lb / LB_PER_KG;
export const gToOz = (g: number) => g / G_PER_OZ;
export const ozToG = (oz: number) => oz * G_PER_OZ;
export const lToGal = (l: number) => l / L_PER_GAL;
export const galToL = (gal: number) => gal * L_PER_GAL;
export const cToF = (c: number) => (c * 9) / 5 + 32;
export const fToC = (f: number) => ((f - 32) * 5) / 9;

/** Mash thickness / grain absorption: L/kg <-> qt/lb. */
export const lPerKgToQtPerLb = (v: number) => (v / L_PER_QT) / LB_PER_KG;
export const qtPerLbToLPerKg = (v: number) => v * L_PER_QT * LB_PER_KG;
/** Grain absorption: L/kg <-> gal/lb. */
export const lPerKgToGalPerLb = (v: number) => (v / L_PER_GAL) / LB_PER_KG;
export const galPerLbToLPerKg = (v: number) => v * L_PER_GAL * LB_PER_KG;

/**
 * Gravity points per (kg/L). One PPG (point per pound per gallon) equals
 * LB_PER_KG * L_PER_GAL ≈ 8.3454 points per kg per liter.
 */
export const PPG_TO_PKL = LB_PER_KG * L_PER_GAL;

export type UnitSystem = 'metric' | 'us';

/** Quantity kinds the UI can display in either unit system. */
export type QuantityKind =
  | 'massLarge'
  | 'massSmall'
  | 'volume'
  | 'temperature'
  | 'rate'
  | 'thickness'
  | 'absorption';

interface KindDef {
  metric: string;
  us: string;
  toDisplay: (canonical: number) => number;
  fromDisplay: (display: number) => number;
  /** Decimal places shown in the UI. */
  decimals: { metric: number; us: number };
}

const identity = (v: number) => v;

export const KINDS: Record<QuantityKind, KindDef> = {
  massLarge: { metric: 'kg', us: 'lb', toDisplay: kgToLb, fromDisplay: lbToKg, decimals: { metric: 3, us: 2 } },
  massSmall: { metric: 'g', us: 'oz', toDisplay: gToOz, fromDisplay: ozToG, decimals: { metric: 1, us: 2 } },
  volume: { metric: 'L', us: 'gal', toDisplay: lToGal, fromDisplay: galToL, decimals: { metric: 2, us: 2 } },
  temperature: { metric: '°C', us: '°F', toDisplay: cToF, fromDisplay: fToC, decimals: { metric: 1, us: 1 } },
  rate: { metric: 'L/hr', us: 'gal/hr', toDisplay: lToGal, fromDisplay: galToL, decimals: { metric: 2, us: 2 } },
  thickness: { metric: 'L/kg', us: 'qt/lb', toDisplay: lPerKgToQtPerLb, fromDisplay: qtPerLbToLPerKg, decimals: { metric: 2, us: 2 } },
  absorption: { metric: 'L/kg', us: 'gal/lb', toDisplay: lPerKgToGalPerLb, fromDisplay: galPerLbToLPerKg, decimals: { metric: 2, us: 3 } },
};

export function unitLabel(kind: QuantityKind, system: UnitSystem): string {
  return KINDS[kind][system];
}

/** Convert a canonical value to the display unit system. */
export function toDisplay(kind: QuantityKind, system: UnitSystem, canonical: number): number {
  return system === 'metric' ? identity(canonical) : KINDS[kind].toDisplay(canonical);
}

/** Convert a value entered in the display unit system to canonical units. */
export function fromDisplay(kind: QuantityKind, system: UnitSystem, display: number): number {
  return system === 'metric' ? identity(display) : KINDS[kind].fromDisplay(display);
}

export function decimalsFor(kind: QuantityKind, system: UnitSystem): number {
  return KINDS[kind].decimals[system];
}

export function formatQuantity(kind: QuantityKind, system: UnitSystem, canonical: number, decimals?: number): string {
  const d = decimals ?? decimalsFor(kind, system);
  const v = toDisplay(kind, system, canonical);
  return `${roundTo(v, d).toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: 0 })} ${unitLabel(kind, system)}`;
}

export function roundTo(v: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(v * f) / f;
}
