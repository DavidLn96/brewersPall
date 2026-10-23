import type { FermentableCategory, FermentableStage } from '../domain/types';

export interface FermentableCatalogItem {
  id: string;
  name: string;
  category: FermentableCategory;
  /** Potential extract (PPG). Typical values; check your maltster's analysis sheet. */
  ppg: number;
  /** Color (°Lovibond). */
  lovibond: number;
  stage: FermentableStage;
  fermentable?: boolean;
  /** Recommended maximum share of the grist (%), where it matters. */
  maxPct?: number;
  notes?: string;
}

const g = (id: string, name: string, category: FermentableCategory, ppg: number, lovibond: number, extra: Partial<FermentableCatalogItem> = {}): FermentableCatalogItem => ({
  id,
  name,
  category,
  ppg,
  lovibond,
  stage: category === 'extract' || category === 'sugar' ? 'boil' : 'mash',
  ...extra,
});

/** Generic ingredient data with typical published values. */
export const FERMENTABLES: FermentableCatalogItem[] = [
  g('pilsner', 'Pilsner Malt', 'base', 37, 1.6),
  g('pale-2row', 'Pale Malt, 2-Row (US)', 'base', 37, 1.8),
  g('pale-ale', 'Pale Ale Malt', 'base', 37, 3),
  g('maris-otter', 'Maris Otter Pale Malt', 'base', 38, 3),
  g('vienna', 'Vienna Malt', 'base', 35, 3.5),
  g('munich-light', 'Munich Malt, Light', 'base', 35, 6),
  g('munich-dark', 'Munich Malt, Dark', 'base', 34, 10),
  g('wheat-malt', 'Wheat Malt, Pale', 'base', 37, 2),
  g('rye-malt', 'Rye Malt', 'base', 30, 3.5),
  g('smoked-malt', 'Smoked Malt (Beechwood)', 'base', 37, 3),
  g('carapils', 'Carapils / Dextrin Malt', 'crystal', 33, 1.5, { maxPct: 10 }),
  g('crystal-10', 'Crystal / Caramel 10L', 'crystal', 35, 10, { maxPct: 20 }),
  g('crystal-20', 'Crystal / Caramel 20L', 'crystal', 35, 20, { maxPct: 20 }),
  g('crystal-40', 'Crystal / Caramel 40L', 'crystal', 34, 40, { maxPct: 15 }),
  g('crystal-60', 'Crystal / Caramel 60L', 'crystal', 34, 60, { maxPct: 15 }),
  g('crystal-80', 'Crystal / Caramel 80L', 'crystal', 33, 80, { maxPct: 10 }),
  g('crystal-120', 'Crystal / Caramel 120L', 'crystal', 33, 120, { maxPct: 10 }),
  g('caramunich', 'Caramunich-type Malt', 'crystal', 33, 56, { maxPct: 10 }),
  g('special-b', 'Special B', 'crystal', 30, 140, { maxPct: 10 }),
  g('honey-malt', 'Honey Malt', 'specialty', 34, 25, { maxPct: 10 }),
  g('biscuit', 'Biscuit Malt', 'specialty', 35, 23, { maxPct: 15 }),
  g('victory', 'Victory-type Toasted Malt', 'specialty', 34, 28, { maxPct: 15 }),
  g('aromatic', 'Aromatic Malt', 'specialty', 35, 20, { maxPct: 15 }),
  g('melanoidin', 'Melanoidin Malt', 'specialty', 33, 28, { maxPct: 15 }),
  g('acidulated', 'Acidulated Malt', 'specialty', 27, 2, { maxPct: 10, notes: 'Lowers mash pH; about 1% lowers pH ≈ 0.1.' }),
  g('pale-chocolate', 'Pale Chocolate Malt', 'roasted', 33, 200, { maxPct: 10 }),
  g('chocolate', 'Chocolate Malt', 'roasted', 28, 350, { maxPct: 10 }),
  g('carafa-ii', 'Dehusked Black Malt (Carafa II-type)', 'roasted', 32, 425, { maxPct: 5 }),
  g('black-patent', 'Black Patent Malt', 'roasted', 25, 500, { maxPct: 5 }),
  g('roasted-barley', 'Roasted Barley', 'roasted', 25, 300, { maxPct: 10 }),
  g('flaked-oats', 'Flaked Oats', 'adjunct', 33, 1, { maxPct: 30 }),
  g('oat-malt', 'Oat Malt', 'adjunct', 28, 2, { maxPct: 30 }),
  g('flaked-wheat', 'Flaked Wheat', 'adjunct', 34, 2, { maxPct: 40 }),
  g('flaked-barley', 'Flaked Barley', 'adjunct', 32, 2, { maxPct: 20 }),
  g('flaked-maize', 'Flaked Maize (Corn)', 'adjunct', 37, 1, { maxPct: 40 }),
  g('flaked-rice', 'Flaked Rice', 'adjunct', 38, 1, { maxPct: 40 }),
  g('rice-hulls', 'Rice Hulls', 'adjunct', 0, 0, { fermentable: false, notes: 'Lautering aid. Adds no extract.' }),
  g('dme-light', 'Dry Malt Extract, Light', 'extract', 44, 4),
  g('dme-amber', 'Dry Malt Extract, Amber', 'extract', 44, 10),
  g('dme-dark', 'Dry Malt Extract, Dark', 'extract', 44, 30),
  g('dme-wheat', 'Dry Malt Extract, Wheat', 'extract', 44, 3),
  g('lme-pilsen', 'Liquid Malt Extract, Pilsen', 'extract', 37, 2.3),
  g('lme-light', 'Liquid Malt Extract, Light', 'extract', 37, 4),
  g('lme-amber', 'Liquid Malt Extract, Amber', 'extract', 37, 10),
  g('dextrose', 'Corn Sugar (Dextrose)', 'sugar', 42, 0),
  g('sucrose', 'Table Sugar (Sucrose)', 'sugar', 46, 0),
  g('brown-sugar', 'Brown Sugar', 'sugar', 45, 15),
  g('candi-clear', 'Belgian Candi Sugar, Clear', 'sugar', 36, 0.5),
  g('candi-dark', 'Belgian Candi Syrup, Dark', 'sugar', 32, 180),
  g('honey', 'Honey', 'sugar', 35, 2),
  g('maple-syrup', 'Maple Syrup', 'sugar', 30, 35),
  g('molasses', 'Molasses', 'sugar', 36, 80),
  g('lactose', 'Lactose (Milk Sugar)', 'sugar', 41, 0, { fermentable: false, notes: 'Not fermented by brewing yeast; stays in the FG.' }),
  g('maltodextrin', 'Maltodextrin', 'sugar', 40, 0, { fermentable: false, notes: 'Adds body; essentially unfermentable.' }),
];

