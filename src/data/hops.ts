export interface HopCatalogItem {
  id: string;
  name: string;
  origin: string;
  /** Typical alpha acid (%). Use the value printed on your package. */
  alpha: number;
  purpose: 'bittering' | 'aroma' | 'dual';
  notes?: string;
}

const h = (id: string, name: string, origin: string, alpha: number, purpose: HopCatalogItem['purpose'], notes?: string): HopCatalogItem => ({ id, name, origin, alpha, purpose, notes });

export const HOPS: HopCatalogItem[] = [
  h('amarillo', 'Amarillo', 'US', 9, 'aroma', 'Orange, grapefruit'),
  h('cascade', 'Cascade', 'US', 6, 'aroma', 'Grapefruit, floral'),
  h('centennial', 'Centennial', 'US', 10, 'dual', 'Citrus, floral'),
  h('chinook', 'Chinook', 'US', 13, 'dual', 'Pine, spice, grapefruit'),
  h('citra', 'Citra', 'US', 12.5, 'dual', 'Tropical fruit, citrus'),
  h('columbus', 'Columbus (CTZ)', 'US', 15, 'bittering', 'Dank, resinous'),
  h('crystal', 'Crystal', 'US', 4.5, 'aroma', 'Woody, spicy'),
  h('el-dorado', 'El Dorado', 'US', 15, 'dual', 'Pear, watermelon, candy'),
  h('idaho-7', 'Idaho 7', 'US', 13, 'dual', 'Apricot, pine, tea'),
  h('magnum', 'Magnum', 'DE', 13, 'bittering', 'Clean bittering'),
  h('mosaic', 'Mosaic', 'US', 12, 'dual', 'Blueberry, tropical, earthy'),
  h('mount-hood', 'Mount Hood', 'US', 5, 'aroma', 'Herbal, noble-like'),
  h('northern-brewer', 'Northern Brewer', 'DE', 8.5, 'dual', 'Mint, pine'),
  h('nugget', 'Nugget', 'US', 13, 'bittering', 'Herbal'),
  h('sabro', 'Sabro', 'US', 14, 'dual', 'Coconut, tangerine'),
  h('simcoe', 'Simcoe', 'US', 13, 'dual', 'Pine, passion fruit'),
  h('sterling', 'Sterling', 'US', 7.5, 'aroma', 'Herbal, spicy'),
  h('strata', 'Strata', 'US', 15, 'dual', 'Passion fruit, dank'),
  h('warrior', 'Warrior', 'US', 16, 'bittering', 'Clean bittering'),
  h('willamette', 'Willamette', 'US', 5, 'aroma', 'Earthy, floral'),
  h('east-kent-goldings', 'East Kent Goldings', 'UK', 5.5, 'aroma', 'Honey, earthy'),
  h('fuggle', 'Fuggle', 'UK', 4.5, 'aroma', 'Woody, earthy'),
  h('challenger', 'Challenger', 'UK', 7.5, 'dual', 'Spicy, cedar'),
  h('target', 'Target', 'UK', 11, 'bittering', 'Sage, spicy'),
  h('hallertau-mf', 'Hallertauer Mittelfrüh', 'DE', 4, 'aroma', 'Noble, floral, spice'),
  h('hallertau-blanc', 'Hallertau Blanc', 'DE', 9, 'aroma', 'White wine, gooseberry'),
  h('hersbrucker', 'Hersbrucker', 'DE', 3, 'aroma', 'Floral, fruity'),
  h('perle', 'Perle', 'DE', 8, 'dual', 'Mint, spice'),
  h('spalter', 'Spalter', 'DE', 4.5, 'aroma', 'Noble, spicy'),
  h('tettnanger', 'Tettnanger', 'DE', 4.5, 'aroma', 'Noble, herbal'),
  h('saaz', 'Saaz', 'CZ', 3.5, 'aroma', 'Noble, earthy, spice'),
  h('styrian-golding', 'Styrian Golding (Savinjski)', 'SI', 4, 'aroma', 'Earthy, white pepper'),
  h('galaxy', 'Galaxy', 'AU', 14, 'dual', 'Passion fruit, peach'),
  h('nelson-sauvin', 'Nelson Sauvin', 'NZ', 12, 'dual', 'White wine grape, gooseberry'),
  h('motueka', 'Motueka', 'NZ', 7, 'aroma', 'Lime, tropical'),
];

export const HOP_USE_LABEL = {
  boil: 'Boil',
  'first-wort': 'First wort',
  mash: 'Mash',
  whirlpool: 'Whirlpool',
  'dry-hop': 'Dry hop',
} as const;
