import { formatQuantity, type UnitSystem } from '../domain/units';
import type { BrewMethod, FermentableStage, Hop, MiscUse } from '../domain/types';
import type { Dict } from '../i18n';

export const fmtSg = (sg: number) => sg.toFixed(3);
export const fmt = (v: number, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : '–');
export const vol = (l: number, s: UnitSystem, d?: number) => formatQuantity('volume', s, l, d);
export const massL = (kg: number, s: UnitSystem, d?: number) => formatQuantity('massLarge', s, kg, d);
export const massS = (g: number, s: UnitSystem, d?: number) => formatQuantity('massSmall', s, g, d);
export const temp = (c: number, s: UnitSystem) => formatQuantity('temperature', s, c, 0).replace(' °', '°');

export function hopTimeLabel(h: Pick<Hop, 'use' | 'time' | 'whirlpoolTempC'>, s: UnitSystem, t: Dict): string {
  switch (h.use) {
    case 'boil':
      return `${h.time} ${t.common.min}`;
    case 'whirlpool':
      return `${h.time} ${t.common.min} @ ${temp(h.whirlpoolTempC ?? 80, s)}`;
    case 'dry-hop':
      return `${h.time} ${t.common.days}`;
    default:
      return '—';
  }
}

/** Time unit for an "other ingredient" addition; empty when the addition has no time. */
export function miscTimeUnit(use: MiscUse, t: Dict): string {
  return use === 'bottling' ? '' : use === 'primary' || use === 'secondary' ? t.common.days : t.common.min;
}

/** Where a fermentable goes in, with "Steep" in place of "Mash" for extract brews. */
export function stageLabel(stage: FermentableStage, method: BrewMethod, t: Dict): string {
  return stage === 'mash' && method === 'extract' ? t.steep : t.stage[stage];
}

export function relativeDate(iso: string, t: Dict): string {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return t.time.justNow;
  if (diff < 3600) return t.time.minAgo(Math.floor(diff / 60));
  if (diff < 86400) return t.time.hoursAgo(Math.floor(diff / 3600));
  return d.toLocaleDateString(t.locale, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** SG potential shown for a PPG value: 37 → 1.037. */
export const ppgFormat = { toDisplay: (ppg: number) => 1 + ppg / 1000, fromDisplay: (sg: number) => (sg - 1) * 1000 };
