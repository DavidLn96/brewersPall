import type { MiscType, MiscUnit, MiscUse } from '../domain/types';

export interface MiscCatalogItem {
  id: string;
  name: string;
  type: MiscType;
  use: MiscUse;
  time: number;
  unit: MiscUnit;
  /** Suggested amount for a ~20 L batch, as a starting point only. */
  amount: number;
  notes?: string;
}

const m = (id: string, name: string, type: MiscType, use: MiscUse, time: number, amount: number, unit: MiscUnit, notes?: string): MiscCatalogItem => ({ id, name, type, use, time, amount, unit, notes });

export const MISCS: MiscCatalogItem[] = [
  m('whirlfloc', 'Whirlfloc tablet', 'fining', 'boil', 15, 1, 'each'),
  m('irish-moss', 'Irish moss', 'fining', 'boil', 15, 1, 'tsp'),
  m('gelatin', 'Gelatin', 'fining', 'secondary', 3, 1, 'tsp'),
  m('yeast-nutrient', 'Yeast nutrient', 'nutrient', 'boil', 10, 1, 'tsp'),
  m('gypsum', 'Gypsum (CaSO₄)', 'water-agent', 'mash', 60, 5, 'g'),
  m('calcium-chloride', 'Calcium chloride (CaCl₂)', 'water-agent', 'mash', 60, 4, 'g'),
  m('epsom', 'Epsom salt (MgSO₄)', 'water-agent', 'mash', 60, 2, 'g'),
  m('table-salt', 'Table salt (NaCl)', 'water-agent', 'mash', 60, 1, 'g'),
  m('lactic-acid', 'Lactic acid 88%', 'acid', 'mash', 60, 2, 'mL'),
  m('phosphoric-acid', 'Phosphoric acid 10%', 'acid', 'mash', 60, 5, 'mL'),
  m('campden', 'Campden tablet', 'water-agent', 'mash', 60, 1, 'each', 'Removes chlorine and chloramine.'),
  m('coriander', 'Coriander seed, crushed', 'spice', 'boil', 5, 14, 'g'),
  m('orange-peel-sweet', 'Sweet orange peel', 'spice', 'boil', 5, 14, 'g'),
  m('orange-peel-bitter', 'Bitter orange peel', 'spice', 'boil', 5, 10, 'g'),
  m('cinnamon', 'Cinnamon stick', 'spice', 'boil', 5, 1, 'each'),
  m('vanilla', 'Vanilla bean', 'flavor', 'secondary', 7, 2, 'each'),
  m('cacao-nibs', 'Cacao nibs', 'flavor', 'secondary', 5, 115, 'g'),
  m('coffee', 'Coffee beans, coarse', 'flavor', 'secondary', 1, 60, 'g'),
  m('raspberry', 'Raspberry purée', 'fruit', 'secondary', 7, 1.5, 'kg'),
  m('cherry', 'Tart cherries', 'fruit', 'secondary', 7, 2, 'kg'),
  m('mango', 'Mango purée', 'fruit', 'secondary', 5, 1.5, 'kg'),
];

export const MISC_USE_LABEL: Record<MiscUse, string> = {
  mash: 'Mash',
  boil: 'Boil',
  whirlpool: 'Whirlpool',
  primary: 'Primary',
  secondary: 'Secondary',
  bottling: 'Bottling',
};

export const MISC_TYPE_LABEL: Record<MiscType, string> = {
  spice: 'Spice',
  fruit: 'Fruit',
  flavor: 'Flavor',
  fining: 'Fining',
  'water-agent': 'Water agent',
  acid: 'Acid',
  nutrient: 'Nutrient',
  sugar: 'Sugar',
  other: 'Other',
};

export const MISC_UNITS: MiscUnit[] = ['g', 'kg', 'oz', 'lb', 'mL', 'L', 'fl oz', 'tsp', 'tbsp', 'each'];
