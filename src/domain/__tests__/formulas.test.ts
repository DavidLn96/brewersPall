/**
 * Formula tests against published reference values and hand calculations
 * done in the formula's original (US) units.
 */
import { describe, expect, it } from 'vitest';
import { abv, apparentAttenuation, estimateFg, platoToSg, sgToPlato } from '../gravity';
import { hopUtilization, ibuFromUtilization, ragerUtilization, relativeIsomerizationRate, tinsethUtilization } from '../ibu';
import { mcu, srmFromMcu, srmToEbc, srmToHex } from '../color';
import { cellsNeededBillions, pitchRate } from '../yeast';
import { strikeWaterTemp } from '../volumes';
import { cToF, fToC, galToL, lbToKg, ozToG, qtPerLbToLPerKg, galPerLbToLPerKg, fromDisplay, toDisplay, PPG_TO_PKL } from '../units';
import { compareToStyle, rangeStatus } from '../style';

describe('unit conversions', () => {
  it('uses exact definitions', () => {
    expect(galToL(1)).toBeCloseTo(3.785411784, 9);
    expect(lbToKg(1)).toBeCloseTo(0.45359237, 8);
    expect(ozToG(1)).toBeCloseTo(28.349523125, 9);
    expect(cToF(100)).toBeCloseTo(212, 9);
    expect(fToC(32)).toBeCloseTo(0, 9);
    expect(cToF(-40)).toBeCloseTo(-40, 9);
  });

  it('converts brewing ratios', () => {
    // 1.25 qt/lb is the classic "medium" mash, about 2.6 L/kg.
    expect(qtPerLbToLPerKg(1.25)).toBeCloseTo(2.608, 3);
    // 0.12 gal/lb grain absorption is about 1.0 L/kg.
    expect(galPerLbToLPerKg(0.12)).toBeCloseTo(1.0014, 3);
    // 1 PPG ≈ 8.3454 points per kg per liter.
    expect(PPG_TO_PKL).toBeCloseTo(8.3454, 4);
  });

  it('round-trips every display kind', () => {
    const kinds = ['massLarge', 'massSmall', 'volume', 'temperature', 'rate', 'thickness', 'absorption'] as const;
    for (const k of kinds) {
      expect(fromDisplay(k, 'us', toDisplay(k, 'us', 12.345))).toBeCloseTo(12.345, 9);
      expect(toDisplay(k, 'metric', 7)).toBe(7);
    }
  });
});

describe('gravity and alcohol', () => {
  it('converts SG to Plato (ASBC fit)', () => {
    expect(sgToPlato(1.0)).toBeCloseTo(0, 1);
    expect(sgToPlato(1.04)).toBeCloseTo(10.0, 1);
    expect(sgToPlato(1.1)).toBeCloseTo(23.8, 1);
  });

  it('inverts Plato within 0.0005 SG', () => {
    for (const sg of [1.01, 1.04, 1.06, 1.09, 1.12]) {
      expect(Math.abs(platoToSg(sgToPlato(sg)) - sg)).toBeLessThan(0.0005);
    }
  });

  it('estimates FG from attenuation, keeping unfermentables', () => {
    expect(estimateFg(50, 0, 75)).toBeCloseTo(1.0125, 6);
    // 50 fermentable points at 75% + 5 points lactose → 12.5 + 5.
    expect(estimateFg(50, 5, 75)).toBeCloseTo(1.0175, 6);
    expect(estimateFg(50, 0, 150)).toBeCloseTo(1.0, 6); // clamped
  });

  it('calculates ABV by both methods', () => {
    expect(abv(1.05, 1.01)).toBeCloseTo(5.25, 6);
    // 76.08 × 0.04 / 0.725 × (1.010 / 0.794) = 5.339
    expect(abv(1.05, 1.01, 'alternate')).toBeCloseTo(5.339, 2);
    expect(abv(1.01, 1.02)).toBe(0);
    expect(abv(1.05, 1.05)).toBe(0);
  });

  it('calculates apparent attenuation', () => {
    expect(apparentAttenuation(1.05, 1.01)).toBeCloseTo(80, 6);
    expect(apparentAttenuation(1.0, 1.0)).toBe(0);
  });
});

describe('bitterness', () => {
  it('matches Tinseth table values', () => {
    // Tinseth's published table: 1.050 / 60 min → 0.231.
    expect(tinsethUtilization(1.05, 60)).toBeCloseTo(0.231, 3);
    // Hand-calculated: 1.65 × 0.000125^0.03 × (1 − e^−1.2) / 4.15 = 1.2598 × 0.16838 = 0.2121
    expect(tinsethUtilization(1.03, 30)).toBeCloseTo(0.2121, 3);
    // Hand-calculated: 1.65 × 0.000125^0.08 × (1 − e^−0.4) / 4.15 = 0.80390 × 0.07944 = 0.0639
    expect(tinsethUtilization(1.08, 10)).toBeCloseTo(0.0639, 3);
    expect(tinsethUtilization(1.05, 0)).toBe(0);
  });

  it('computes Tinseth IBU for 1 oz of 6% AA at 60 min in 5 gal', () => {
    // US form: IBU = U × AA × oz × 7490 / gal = 0.2307 × 0.06 × 7490 / 5 = 20.73
    const u = tinsethUtilization(1.05, 60);
    expect(ibuFromUtilization(u, 6, ozToG(1), galToL(5))).toBeCloseTo(20.73, 1);
  });

  it('matches Rager table values', () => {
    // Rager: 60 min → 30.8%; 15 min → 8.1%.
    expect(ragerUtilization(1.05, 60)).toBeCloseTo(0.308, 3);
    expect(ragerUtilization(1.04, 15)).toBeCloseTo(0.081, 2);
    // Gravity adjustment above 1.050: GA = (1.070 − 1.050) / 0.2 = 0.1.
    expect(ragerUtilization(1.07, 60)).toBeCloseTo(ragerUtilization(1.05, 60) / 1.1, 6);
  });

  it('models hop uses', () => {
    const base = tinsethUtilization(1.05, 60);
    expect(hopUtilization({ use: 'boil', time: 60 }, 1.05, 60, 'tinseth')).toBeCloseTo(base, 9);
    expect(hopUtilization({ use: 'boil', time: 90 }, 1.05, 60, 'tinseth')).toBeCloseTo(base, 9);
    expect(hopUtilization({ use: 'first-wort', time: 0 }, 1.05, 60, 'tinseth')).toBeCloseTo(base * 1.1, 9);
    expect(hopUtilization({ use: 'mash', time: 0 }, 1.05, 60, 'tinseth')).toBeCloseTo(base * 0.2, 9);
    expect(hopUtilization({ use: 'dry-hop', time: 4 }, 1.05, 60, 'tinseth')).toBe(0);
    const wp = hopUtilization({ use: 'whirlpool', time: 20, whirlpoolTempC: 80 }, 1.05, 60, 'tinseth');
    expect(wp).toBeGreaterThan(0);
    expect(wp).toBeLessThan(tinsethUtilization(1.05, 20));
  });

  it('uses Malowicki relative isomerization rates', () => {
    expect(relativeIsomerizationRate(100)).toBeCloseTo(1.0, 1);
    expect(relativeIsomerizationRate(80)).toBeCloseTo(0.23, 2);
    expect(relativeIsomerizationRate(65)).toBeLessThan(0.07);
  });

  it('returns 0 IBU for zero volume', () => {
    expect(ibuFromUtilization(0.23, 6, 28, 0)).toBe(0);
  });
});

describe('color', () => {
  it('calculates MCU and Morey SRM', () => {
    // 10 lb at 2 °L + 0.5 lb at 60 °L in 5 gal → MCU (20 + 30) / 5 = 10 → SRM 1.4922 × 10^0.6859 = 7.24
    const m = mcu([{ amountKg: lbToKg(10), colorLovibond: 2 }, { amountKg: lbToKg(0.5), colorLovibond: 60 }], galToL(5));
    expect(m).toBeCloseTo(10, 6);
    expect(srmFromMcu(m, 'morey')).toBeCloseTo(7.24, 2);
    expect(srmToEbc(10)).toBeCloseTo(19.7, 6);
  });

  it('calculates Daniels and Mosher in their ranges', () => {
    expect(srmFromMcu(30, 'daniels')).toBeCloseTo(14.4, 6);
    expect(srmFromMcu(30, 'mosher')).toBeCloseTo(13.7, 6);
    // Below range, never exceeds MCU.
    expect(srmFromMcu(3, 'daniels')).toBe(3);
  });

  it('handles zero inputs', () => {
    expect(mcu([], 0)).toBe(0);
    expect(srmFromMcu(0)).toBe(0);
  });

  it('maps SRM to a display color', () => {
    expect(srmToHex(1)).toBe('#ffe699');
    expect(srmToHex(40)).toBe('#3d0100');
    expect(srmToHex(100)).toBe('#3d0100');
    expect(srmToHex(11)).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe('strike water', () => {
  it('matches Palmer’s US example in metric', () => {
    // 1.5 qt/lb, grain 70 °F, target 150 °F → (0.2 / 1.5) × 80 + 150 = 160.7 °F (71.5 °C).
    const t = strikeWaterTemp(qtPerLbToLPerKg(1.5), fToC(70), fToC(150));
    expect(cToF(t)).toBeCloseTo(160.7, 0);
    expect(Math.abs(cToF(t) - 160.67)).toBeLessThan(0.3);
  });

  it('returns target temperature with no ratio', () => {
    expect(strikeWaterTemp(0, 20, 66)).toBe(66);
  });
});

describe('yeast pitching', () => {
  it('selects standard rates', () => {
    expect(pitchRate(false, 1.05)).toBe(0.75);
    expect(pitchRate(false, 1.07)).toBe(1.0);
    expect(pitchRate(true, 1.05)).toBe(1.5);
    expect(pitchRate(true, 1.07)).toBe(2.0);
  });

  it('calculates cells for 20 L of 1.048 ale', () => {
    // 0.75 M/mL/°P × 20 000 mL × 11.9 °P = 178.6 billion
    expect(cellsNeededBillions(20, 1.048, 0.75)).toBeCloseTo(0.75 * 20 * sgToPlato(1.048), 6);
    expect(cellsNeededBillions(20, 1.048, 0.75)).toBeCloseTo(178.6, 0);
    expect(cellsNeededBillions(0, 1.048, 0.75)).toBe(0);
  });
});

describe('style comparison', () => {
  const style = { id: 'x', code: '18B', name: 'APA', category: '', og: { min: 1.045, max: 1.06 }, fg: { min: 1.01, max: 1.015 }, ibu: { min: 30, max: 50 }, srm: { min: 5, max: 10 }, abv: { min: 4.5, max: 6.2 } };

  it('classifies values', () => {
    expect(rangeStatus(5, { min: 1, max: 10 })).toBe('in');
    expect(rangeStatus(0.5, { min: 1, max: 10 })).toBe('low');
    expect(rangeStatus(11, { min: 1, max: 10 })).toBe('high');
  });

  it('compares gravities at 0.001 precision', () => {
    const res = compareToStyle({ og: 1.0604, fg: 1.012, abv: 5.5, ibu: 60, srm: 3 }, style);
    expect(res.find((r) => r.metric === 'og')?.status).toBe('in');
    expect(res.find((r) => r.metric === 'ibu')?.status).toBe('high');
    expect(res.find((r) => r.metric === 'srm')?.status).toBe('low');
  });
});
