import type { YeastForm } from '../domain/types';

export interface YeastCatalogItem {
  id: string;
  lab: string;
  product: string;
  name: string;
  form: YeastForm;
  /** Typical apparent attenuation (%), midpoint of the manufacturer's stated range. */
  attenuation: number;
  tempMinC: number;
  tempMaxC: number;
  flocculation: 'low' | 'medium' | 'high';
  notes?: string;
}

const y = (id: string, lab: string, product: string, name: string, form: YeastForm, attenuation: number, tempMinC: number, tempMaxC: number, flocculation: YeastCatalogItem['flocculation'], notes?: string): YeastCatalogItem => ({ id, lab, product, name, form, attenuation, tempMinC, tempMaxC, flocculation, notes });

/** Typical published values. Check the manufacturer's current data sheet. */
export const YEASTS: YeastCatalogItem[] = [
  y('us-05', 'Fermentis', 'US-05', 'SafAle American Ale', 'dry', 80, 18, 22, 'medium', 'Clean, neutral American ale'),
  y('s-04', 'Fermentis', 'S-04', 'SafAle English Ale', 'dry', 75, 15, 20, 'high'),
  y('wb-06', 'Fermentis', 'WB-06', 'SafAle Wheat', 'dry', 86, 18, 24, 'low'),
  y('be-256', 'Fermentis', 'BE-256', 'SafAle Abbaye', 'dry', 84, 18, 26, 'high'),
  y('t-58', 'Fermentis', 'T-58', 'SafAle Belgian Spicy', 'dry', 75, 15, 24, 'medium'),
  y('k-97', 'Fermentis', 'K-97', 'SafAle German Ale', 'dry', 82, 12, 25, 'low'),
  y('w-34-70', 'Fermentis', 'W-34/70', 'SafLager German Lager', 'dry', 82, 9, 15, 'high'),
  y('s-23', 'Fermentis', 'S-23', 'SafLager Lager', 'dry', 82, 9, 15, 'high'),
  y('nottingham', 'Lallemand', 'Nottingham', 'LalBrew Nottingham English Ale', 'dry', 80, 10, 22, 'high'),
  y('windsor', 'Lallemand', 'Windsor', 'LalBrew Windsor British Ale', 'dry', 70, 15, 22, 'low'),
  y('verdant', 'Lallemand', 'Verdant IPA', 'LalBrew Verdant IPA', 'dry', 78, 18, 23, 'medium'),
  y('voss', 'Lallemand', 'Voss', 'LalBrew Voss Kveik', 'dry', 79, 25, 40, 'high'),
  y('belle-saison', 'Lallemand', 'Belle Saison', 'LalBrew Belle Saison', 'dry', 90, 15, 35, 'low'),
  y('diamond', 'Lallemand', 'Diamond', 'LalBrew Diamond Lager', 'dry', 80, 10, 15, 'high'),
  y('wy1056', 'Wyeast', '1056', 'American Ale', 'liquid', 75, 16, 22, 'low'),
  y('wy1318', 'Wyeast', '1318', 'London Ale III', 'liquid', 73, 18, 23, 'high'),
  y('wy1968', 'Wyeast', '1968', 'London ESB Ale', 'liquid', 69, 18, 22, 'high'),
  y('wy3068', 'Wyeast', '3068', 'Weihenstephan Weizen', 'liquid', 75, 18, 24, 'low'),
  y('wy3711', 'Wyeast', '3711', 'French Saison', 'liquid', 80, 18, 25, 'low'),
  y('wy2124', 'Wyeast', '2124', 'Bohemian Lager', 'liquid', 75, 9, 14, 'medium'),
  y('wlp001', 'White Labs', 'WLP001', 'California Ale', 'liquid', 77, 18, 23, 'medium'),
  y('wlp002', 'White Labs', 'WLP002', 'English Ale', 'liquid', 67, 18, 20, 'high'),
  y('wlp029', 'White Labs', 'WLP029', 'German Ale / Kölsch', 'liquid', 76, 18, 21, 'medium'),
  y('wlp300', 'White Labs', 'WLP300', 'Hefeweizen Ale', 'liquid', 74, 20, 22, 'low'),
  y('wlp530', 'White Labs', 'WLP530', 'Abbey Ale', 'liquid', 77, 19, 22, 'medium'),
  y('wlp830', 'White Labs', 'WLP830', 'German Lager', 'liquid', 77, 10, 13, 'medium'),
];
