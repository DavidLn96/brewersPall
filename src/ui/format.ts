import { formatQuantity, type UnitSystem } from '../domain/units';
import type { BrewMethod, HopUse, Hop, MiscUse } from '../domain/types';

export const fmtSg = (sg: number) => sg.toFixed(3);
export const fmt = (v: number, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : '–');
export const vol = (l: number, s: UnitSystem, d?: number) => formatQuantity('volume', s, l, d);
export const massL = (kg: number, s: UnitSystem, d?: number) => formatQuantity('massLarge', s, kg, d);
export const massS = (g: number, s: UnitSystem, d?: number) => formatQuantity('massSmall', s, g, d);
export const temp = (c: number, s: UnitSystem) => formatQuantity('temperature', s, c, 0).replace(' °', '°');

export const METHOD_LABEL: Record<BrewMethod, string> = {
  'all-grain': 'All grain',
  biab: 'BIAB',
  extract: 'Extract',
  'partial-mash': 'Partial mash',
};

export const HOP_USE_LABEL: Record<HopUse, string> = {
  boil: 'Boil',
  'first-wort': 'First wort',
  mash: 'Mash',
  whirlpool: 'Whirlpool',
  'dry-hop': 'Dry hop',
};

export function hopTimeLabel(h: Pick<Hop, 'use' | 'time' | 'whirlpoolTempC'>, s: UnitSystem): string {
  switch (h.use) {
    case 'boil':
      return `${h.time} min`;
    case 'whirlpool':
      return `${h.time} min @ ${temp(h.whirlpoolTempC ?? 80, s)}`;
    case 'dry-hop':
      return `${h.time} days`;
    default:
      return '—';
  }
}

export const MISC_TIME_UNIT: Record<MiscUse, string> = {
  mash: 'min',
  boil: 'min',
  whirlpool: 'min',
  primary: 'days',
  secondary: 'days',
  bottling: '',
};

export function relativeDate(iso: string): string {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** SG potential shown for a PPG value: 37 → 1.037. */
export const ppgFormat = { toDisplay: (ppg: number) => 1 + ppg / 1000, fromDisplay: (sg: number) => (sg - 1) * 1000 };
