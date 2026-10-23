import { describe, expect, it } from 'vitest';
import { en } from '../en';
import { es } from '../es';
import type { CalcWarning } from '../../domain/recipe';

const codes = Object.keys(en.warnings) as CalcWarning['code'][];
const sample: Omit<CalcWarning, 'code'> = { volumeL: 31.4, capacityL: 30, pct: 75, name: 'Magnum', minutes: 60, boilMinutes: 30 };

describe('translations', () => {
  it('have the same number of table columns in each language', () => {
    for (const d of [en.view, en.pdf] as const) {
      for (const [k, v] of Object.entries(d)) {
        if (!Array.isArray(v)) continue;
        const other = (d === en.view ? es.view : es.pdf) as Record<string, unknown>;
        expect((other[k] as unknown[]).length, k).toBe(v.length);
      }
    }
    expect(es.methods.sections.length).toBe(en.methods.sections.length);
    expect(es.equipment.tips.length).toBe(en.equipment.tips.length);
  });

  it('render every calculation warning in both languages', () => {
    for (const code of codes) {
      for (const d of [en, es]) {
        const text = d.warnings[code]({ code, ...sample });
        expect(text.length, code).toBeGreaterThan(10);
        expect(text, code).not.toContain('undefined');
      }
    }
  });
});
