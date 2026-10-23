import { describe, expect, it } from 'vitest';
import { calculateRecipe } from '../recipe';
import { calculateVolumes } from '../volumes';
import { tinsethUtilization, ibuFromUtilization } from '../ibu';
import { galToL, lbToKg, ozToG } from '../units';
import { baseRecipe, LOSSLESS } from './fixtures';

describe('volumes', () => {
  const eq = { ...LOSSLESS, kettleLossL: 1.5, hopAbsorptionMlPerG: 10, coolingShrinkagePct: 4, boilOffLPerHr: 4, grainAbsorptionLPerKg: 1, mashTunDeadspaceL: 1, mashThicknessLPerKg: 3 };

  it('works back from a fermenter target', () => {
    const v = calculateVolumes({ method: 'all-grain', batchVolumeL: 20, batchTarget: 'fermenter', boilMinutes: 60, equipment: eq, mashGrainKg: 5, kettleHopsG: 100, mashTempC: 66 });
    // cooled = 20 + 1.5 + 100 g × 10 mL/g = 22.5; hot = 22.5 / 0.96 = 23.4375; pre-boil = +4 = 27.4375
    expect(v.hopAbsorptionL).toBeCloseTo(1, 9);
    expect(v.postBoilCoolL).toBeCloseTo(22.5, 9);
    expect(v.postBoilHotL).toBeCloseTo(23.4375, 9);
    expect(v.preBoilL).toBeCloseTo(27.4375, 9);
    // water = pre-boil + 5 kg × 1 L/kg + 1 L dead space = 33.4375; strike = 5 × 3 + 1 = 16
    expect(v.totalWaterL).toBeCloseTo(33.4375, 9);
    expect(v.mashWaterL).toBeCloseTo(16, 9);
    expect(v.spargeWaterL).toBeCloseTo(17.4375, 9);
    // strike temp: 0.41 / 3.2 × (66 − 20) + 66 = 71.89 °C
    expect(v.strikeTempC).toBeCloseTo(71.894, 3);
    expect(v.warnings).toHaveLength(0);
  });

  it('works forward from a kettle target', () => {
    const v = calculateVolumes({ method: 'all-grain', batchVolumeL: 25, batchTarget: 'kettle', boilMinutes: 90, equipment: eq, mashGrainKg: 5, kettleHopsG: 0, mashTempC: 66 });
    expect(v.postBoilHotL).toBe(25);
    expect(v.postBoilCoolL).toBeCloseTo(24, 9);
    expect(v.intoFermenterL).toBeCloseTo(22.5, 9);
    expect(v.preBoilL).toBeCloseTo(31, 9);
  });

  it('models BIAB as a full-volume mash', () => {
    const v = calculateVolumes({ method: 'biab', batchVolumeL: 20, batchTarget: 'fermenter', boilMinutes: 60, equipment: { ...eq, mashTunDeadspaceL: 0, kettleVolumeL: 30 }, mashGrainKg: 5, kettleHopsG: 0, mashTempC: 66 });
    expect(v.spargeWaterL).toBe(0);
    expect(v.mashWaterL).toBeCloseTo(v.totalWaterL, 9);
    // 21.5 / 0.96 + 4 = 26.396 pre-boil, + 5 L absorption = 31.396 water; with grain 34.75 L > 30 L kettle.
    expect(v.warnings.some((w) => w.includes('kettle holds'))).toBe(true);
  });

  it('warns when kettle losses exceed a kettle-target batch', () => {
    const v = calculateVolumes({ method: 'all-grain', batchVolumeL: 1, batchTarget: 'kettle', boilMinutes: 60, equipment: { ...eq, kettleLossL: 5 }, mashGrainKg: 1, kettleHopsG: 0, mashTempC: 66 });
    expect(v.intoFermenterL).toBe(0);
    expect(v.warnings.length).toBeGreaterThan(0);
  });

  it('flags a mash too thick for the available water', () => {
    const v = calculateVolumes({ method: 'all-grain', batchVolumeL: 5, batchTarget: 'fermenter', boilMinutes: 60, equipment: { ...eq, mashThicknessLPerKg: 4 }, mashGrainKg: 10, kettleHopsG: 0, mashTempC: 66 });
    expect(v.spargeWaterL).toBe(0);
    expect(v.warnings.some((w) => w.includes('sparge'))).toBe(true);
  });
});

describe('calculateRecipe', () => {
  it('matches the textbook OG: 10 lb of 37 PPG malt, 5 gal, 75%', () => {
    // 10 × 37 × 0.75 / 5 = 55.5 points
    const s = calculateRecipe(baseRecipe());
    expect(s.og).toBeCloseTo(1.0555, 4);
    expect(s.brewhouseEfficiencyPct).toBeCloseTo(75, 6);
    expect(s.kettleEfficiencyPct).toBeCloseTo(75, 6);
  });

  it('keeps brewhouse efficiency meaningful when kettle losses exist', () => {
    // Same grain, 2 L kettle loss: brewhouse 75% still gives 55.5 points in the fermenter.
    const s = calculateRecipe(baseRecipe({ equipment: { ...LOSSLESS, kettleLossL: 2 } }));
    expect(s.og).toBeCloseTo(1.0555, 4);
    expect(s.kettleEfficiencyPct).toBeGreaterThan(75);
  });

  it('applies ending-kettle efficiency to a kettle target', () => {
    // 5 gal hot, 4% shrinkage → 4.8 gal cooled. 10 × 37 × 0.75 / 4.8 = 57.81 points
    const s = calculateRecipe(baseRecipe({ batchTarget: 'kettle', equipment: { ...LOSSLESS, coolingShrinkagePct: 4 } }));
    expect(s.og).toBeCloseTo(1.05781, 4);
  });

  it('scales gravity with batch size and efficiency', () => {
    const a = calculateRecipe(baseRecipe());
    const b = calculateRecipe(baseRecipe({ batchVolumeL: galToL(10) }));
    const c = calculateRecipe(baseRecipe({ efficiencyPct: 60 }));
    expect((b.og - 1) / (a.og - 1)).toBeCloseTo(0.5, 6);
    expect((c.og - 1) / (a.og - 1)).toBeCloseTo(0.8, 6);
  });

  it('extracts and sugars ignore mash efficiency', () => {
    const r = baseRecipe({
      method: 'extract',
      efficiencyPct: 50,
      batchVolumeL: 20,
      fermentables: [{ id: 'd', name: 'DME', category: 'extract', potentialPpg: 44, colorLovibond: 4, amountKg: 3, stage: 'boil', fermentable: true }],
    });
    // 44 × 3 kg × 8.3454 / 20 L = 55.08 points
    expect(calculateRecipe(r).og).toBeCloseTo(1.05508, 4);
  });

  it('keeps lactose out of attenuation', () => {
    const r = baseRecipe({
      fermentables: [
        { id: 'f1', name: '2-Row', category: 'base', potentialPpg: 37, colorLovibond: 2, amountKg: lbToKg(10), stage: 'mash', fermentable: true },
        { id: 'l', name: 'Lactose', category: 'sugar', potentialPpg: 41, colorLovibond: 0, amountKg: lbToKg(1), stage: 'boil', fermentable: false },
      ],
      yeasts: [{ id: 'y', name: 'Ale', lab: 'X', form: 'dry', attenuationPct: 80, tempMinC: 15, tempMaxC: 22, packs: 1, starter: false }],
    });
    const s = calculateRecipe(r);
    // grain 55.5 points, lactose 41 / 5 = 8.2 points. FG = 55.5 × 0.2 + 8.2 = 19.3 points.
    expect(s.og).toBeCloseTo(1.0637, 4);
    expect(s.fg).toBeCloseTo(1.0193, 4);
    expect(s.abv).toBeCloseTo((s.og - s.fg) * 131.25, 6);
  });

  it('dilutes fermenter additions only in the fermenter volume', () => {
    const r = baseRecipe({
      fermentables: [{ id: 's', name: 'Dextrose', category: 'sugar', potentialPpg: 42, colorLovibond: 0, amountKg: lbToKg(1), stage: 'fermenter', fermentable: true }],
      equipment: { ...LOSSLESS, kettleLossL: 3 },
    });
    // 42 points × 1 lb / 5 gal = 8.4 points regardless of kettle losses.
    const s = calculateRecipe(r);
    expect(s.og).toBeCloseTo(1.0084, 4);
    expect(s.totalGrainKg).toBe(0);
  });

  it('sums IBU per addition on cooled post-boil volume', () => {
    const r = baseRecipe({
      hops: [
        { id: 'h1', name: 'Bittering', alphaPct: 6, amountG: ozToG(1), use: 'boil', time: 60, form: 'pellet' },
        { id: 'h2', name: 'Dry', alphaPct: 12, amountG: 100, use: 'dry-hop', time: 4, form: 'pellet' },
      ],
    });
    const s = calculateRecipe(r);
    const expected = ibuFromUtilization(tinsethUtilization(s.boilGravity, 60), 6, ozToG(1), galToL(5));
    expect(s.hops[0].ibu).toBeCloseTo(expected, 9);
    expect(s.hops[1].ibu).toBe(0);
    expect(s.ibu).toBeCloseTo(expected, 9);
    expect(s.buGu).toBeCloseTo(s.ibu / 55.5, 2);
    // Lossless equipment: boil gravity equals OG.
    expect(s.boilGravity).toBeCloseTo(s.og, 6);
    // Hand-calculated at OG 1.0555: U = 1.0021 × 0.2191 = 0.2196; 0.2196 × 0.06 × 7490 / 5 = 19.73
    expect(s.ibu).toBeCloseTo(19.73, 1);
  });

  it('uses Rager when selected', () => {
    const r = baseRecipe({ hops: [{ id: 'h1', name: 'B', alphaPct: 6, amountG: ozToG(1), use: 'boil', time: 60, form: 'pellet' }] });
    const t = calculateRecipe(r, { ibuMethod: 'tinseth', colorMethod: 'morey', abvMethod: 'standard' });
    const g = calculateRecipe(r, { ibuMethod: 'rager', colorMethod: 'morey', abvMethod: 'standard' });
    expect(g.ibu).toBeGreaterThan(t.ibu);
  });

  it('reports percentages and color contribution', () => {
    const r = baseRecipe({
      fermentables: [
        { id: 'a', name: '2-Row', category: 'base', potentialPpg: 37, colorLovibond: 2, amountKg: lbToKg(9), stage: 'mash', fermentable: true },
        { id: 'b', name: 'C60', category: 'crystal', potentialPpg: 34, colorLovibond: 60, amountKg: lbToKg(1), stage: 'mash', fermentable: true },
      ],
    });
    const s = calculateRecipe(r);
    expect(s.fermentables[0].weightPct).toBeCloseTo(90, 6);
    expect(s.fermentables[1].weightPct).toBeCloseTo(10, 6);
    expect(s.mcu).toBeCloseTo((18 + 60) / 5, 6);
    expect(s.fermentables[1].mcu).toBeCloseTo(12, 6);
  });

  it('assumes 75% attenuation with no yeast, and says so', () => {
    const s = calculateRecipe(baseRecipe());
    expect(s.attenuationAssumed).toBe(true);
    expect(s.fg).toBeCloseTo(1 + 55.5 * 0.25 / 1000, 5);
    expect(s.warnings.some((w) => w.includes('No yeast'))).toBe(true);
  });

  it('uses the highest attenuation of multiple yeasts', () => {
    const y = (id: string, att: number) => ({ id, name: id, lab: 'X', form: 'dry' as const, attenuationPct: att, tempMinC: 15, tempMaxC: 22, packs: 1, starter: false });
    const s = calculateRecipe(baseRecipe({ yeasts: [y('a', 70), y('b', 85)] }));
    expect(s.attenuationPct).toBe(85);
    expect(s.pitch?.isLager).toBe(false);
  });

  it('handles an empty recipe without NaN', () => {
    const s = calculateRecipe(baseRecipe({ fermentables: [], batchVolumeL: 0 }));
    for (const v of [s.og, s.fg, s.abv, s.ibu, s.srm, s.ebc, s.kettleEfficiencyPct]) {
      expect(Number.isFinite(v)).toBe(true);
    }
    expect(s.og).toBe(1);
    expect(s.abv).toBe(0);
    expect(s.buGu).toBeNull();
  });

  it('ignores zero and negative amounts', () => {
    const r = baseRecipe();
    r.fermentables.push({ id: 'z', name: 'Zero', category: 'base', potentialPpg: 37, colorLovibond: 500, amountKg: 0, stage: 'mash', fermentable: true });
    const s = calculateRecipe(r);
    expect(s.og).toBeCloseTo(1.0555, 4);
    expect(s.fermentables[1].mcu).toBe(0);
  });

  it('warns when a boil addition is longer than the boil', () => {
    const r = baseRecipe({ boilMinutes: 30, hops: [{ id: 'h', name: 'Magnum', alphaPct: 12, amountG: 20, use: 'boil', time: 60, form: 'pellet' }] });
    expect(calculateRecipe(r).warnings.some((w) => w.includes('Magnum'))).toBe(true);
  });

  it('warns about impossible efficiency', () => {
    const r = baseRecipe({ efficiencyPct: 90, equipment: { ...LOSSLESS, kettleLossL: 10 } });
    expect(calculateRecipe(r).warnings.some((w) => w.includes('not possible'))).toBe(true);
  });
});
