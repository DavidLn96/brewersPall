/**
 * Style guideline comparison.
 */
export interface StyleRange {
  min: number;
  max: number;
}

export interface BeerStyle {
  id: string;
  /** Guideline code, e.g. "21A". */
  code: string;
  name: string;
  category: string;
  og: StyleRange;
  fg: StyleRange;
  ibu: StyleRange;
  srm: StyleRange;
  abv: StyleRange;
}

export type RangeStatus = 'low' | 'in' | 'high';

export function rangeStatus(value: number, range: StyleRange, tolerance = 0): RangeStatus {
  if (value < range.min - tolerance) return 'low';
  if (value > range.max + tolerance) return 'high';
  return 'in';
}

export interface StyleComparison {
  metric: 'og' | 'fg' | 'abv' | 'ibu' | 'srm';
  value: number;
  range: StyleRange;
  status: RangeStatus;
}

export function compareToStyle(stats: { og: number; fg: number; abv: number; ibu: number; srm: number }, style: BeerStyle): StyleComparison[] {
  const metrics = ['og', 'fg', 'abv', 'ibu', 'srm'] as const;
  return metrics.map((metric) => ({
    metric,
    value: stats[metric],
    range: style[metric],
    // Compare gravities at the precision brewers read them (0.001).
    status: rangeStatus(metric === 'og' || metric === 'fg' ? Math.round(stats[metric] * 1000) / 1000 : stats[metric], style[metric]),
  }));
}
