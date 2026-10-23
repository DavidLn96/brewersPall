import type { BeerStyle } from '../domain/style';

type Row = [code: string, name: string, category: string, og: [number, number], fg: [number, number], ibu: [number, number], srm: [number, number], abv: [number, number]];

/**
 * Vital statistics from the BJCP 2021 Beer Style Guidelines (a selection of common styles).
 * Verify against the published guidelines before competition entry.
 */
const ROWS: Row[] = [
  ['1A', 'American Light Lager', 'Standard American Beer', [1.028, 1.04], [0.998, 1.008], [8, 12], [2, 3], [2.8, 4.2]],
  ['1B', 'American Lager', 'Standard American Beer', [1.04, 1.05], [1.004, 1.01], [8, 18], [2, 3.5], [4.2, 5.3]],
  ['1C', 'Cream Ale', 'Standard American Beer', [1.042, 1.055], [1.006, 1.012], [8, 20], [2, 5], [4.2, 5.6]],
  ['1D', 'American Wheat Beer', 'Standard American Beer', [1.04, 1.055], [1.008, 1.013], [15, 30], [3, 6], [4.0, 5.5]],
  ['2A', 'International Pale Lager', 'International Lager', [1.042, 1.05], [1.008, 1.012], [18, 25], [2, 6], [4.6, 6.0]],
  ['3B', 'Czech Premium Pale Lager', 'Czech Lager', [1.044, 1.06], [1.013, 1.017], [30, 45], [3.5, 6], [4.2, 5.8]],
  ['4A', 'Munich Helles', 'Pale Malty European Lager', [1.044, 1.048], [1.006, 1.012], [16, 22], [3, 5], [4.7, 5.4]],
  ['5B', 'Kölsch', 'Pale Bitter European Beer', [1.044, 1.05], [1.007, 1.011], [18, 30], [3.5, 5], [4.4, 5.2]],
  ['5D', 'German Pils', 'Pale Bitter European Beer', [1.044, 1.05], [1.008, 1.013], [22, 40], [2, 4], [4.4, 5.2]],
  ['6A', 'Märzen', 'Amber Malty European Lager', [1.054, 1.06], [1.01, 1.014], [18, 24], [8, 17], [5.6, 6.3]],
  ['10A', 'Weissbier', 'German Wheat Beer', [1.044, 1.053], [1.008, 1.014], [8, 15], [2, 6], [4.3, 5.6]],
  ['11A', 'Ordinary Bitter', 'British Bitter', [1.03, 1.039], [1.007, 1.011], [25, 35], [8, 14], [3.2, 3.8]],
  ['11B', 'Best Bitter', 'British Bitter', [1.04, 1.048], [1.008, 1.012], [25, 40], [8, 16], [3.8, 4.6]],
  ['13B', 'British Brown Ale', 'Brown British Beer', [1.04, 1.052], [1.008, 1.013], [20, 30], [12, 22], [4.2, 5.4]],
  ['15A', 'Irish Red Ale', 'Irish Beer', [1.036, 1.046], [1.01, 1.014], [18, 28], [9, 14], [3.8, 5.0]],
  ['15B', 'Irish Stout', 'Irish Beer', [1.036, 1.044], [1.007, 1.011], [25, 45], [25, 40], [3.8, 5.0]],
  ['16A', 'Sweet Stout', 'Dark British Beer', [1.044, 1.06], [1.012, 1.024], [20, 40], [30, 40], [4.0, 6.0]],
  ['16B', 'Oatmeal Stout', 'Dark British Beer', [1.045, 1.065], [1.01, 1.018], [25, 40], [22, 40], [4.2, 5.9]],
  ['18B', 'American Pale Ale', 'Pale American Ale', [1.045, 1.06], [1.01, 1.015], [30, 50], [5, 10], [4.5, 6.2]],
  ['19A', 'American Amber Ale', 'Amber and Brown American Beer', [1.045, 1.06], [1.01, 1.015], [25, 40], [10, 17], [4.5, 6.2]],
  ['19C', 'American Brown Ale', 'Amber and Brown American Beer', [1.045, 1.06], [1.01, 1.016], [20, 30], [18, 35], [4.3, 6.2]],
  ['20A', 'American Porter', 'American Porter and Stout', [1.05, 1.07], [1.012, 1.018], [25, 50], [22, 40], [4.8, 6.5]],
  ['20B', 'American Stout', 'American Porter and Stout', [1.05, 1.075], [1.01, 1.022], [35, 75], [30, 40], [5.0, 7.0]],
  ['20C', 'Imperial Stout', 'American Porter and Stout', [1.075, 1.115], [1.018, 1.03], [50, 90], [30, 40], [8.0, 12.0]],
  ['21A', 'American IPA', 'IPA', [1.056, 1.07], [1.008, 1.014], [40, 70], [6, 14], [5.5, 7.5]],
  ['21C', 'Hazy IPA', 'IPA', [1.06, 1.085], [1.01, 1.015], [25, 60], [3, 7], [6.0, 9.0]],
  ['22A', 'Double IPA', 'Strong American Ale', [1.065, 1.085], [1.008, 1.018], [60, 100], [6, 14], [7.5, 10.0]],
  ['24A', 'Witbier', 'Belgian Ale', [1.044, 1.052], [1.008, 1.012], [8, 20], [2, 4], [4.5, 5.5]],
  ['24B', 'Belgian Pale Ale', 'Belgian Ale', [1.048, 1.054], [1.01, 1.014], [20, 30], [8, 14], [4.8, 5.5]],
  ['25B', 'Saison', 'Strong Belgian Ale', [1.048, 1.065], [1.002, 1.008], [20, 35], [5, 14], [5.0, 7.0]],
  ['26B', 'Belgian Dubbel', 'Monastic Ale', [1.062, 1.075], [1.008, 1.018], [15, 25], [10, 17], [6.0, 7.6]],
  ['26C', 'Belgian Tripel', 'Monastic Ale', [1.075, 1.085], [1.008, 1.014], [20, 40], [4.5, 7], [7.5, 9.5]],
];

const r = ([min, max]: [number, number]) => ({ min, max });

export const STYLES: BeerStyle[] = ROWS.map(([code, name, category, og, fg, ibu, srm, abv]) => ({
  id: `bjcp2021-${code.toLowerCase()}`,
  code,
  name,
  category,
  og: r(og),
  fg: r(fg),
  ibu: r(ibu),
  srm: r(srm),
  abv: r(abv),
}));

export const findStyle = (id: string | null) => (id ? STYLES.find((s) => s.id === id) ?? null : null);
