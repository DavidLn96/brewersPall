import { describe, expect, it } from 'vitest';
import { buildRecipePdf, pdfFileName, pdfText } from '../recipePdf';
import { defaultProfiles, exampleRecipe } from '../../store/factory';
import { calculateRecipe } from '../../domain/recipe';
import { DEFAULT_SETTINGS } from '../../store/schema';

describe('recipe PDF', () => {
  it('builds a PDF for metric and US units in each language', () => {
    const r = exampleRecipe(defaultProfiles()[0]);
    const s = calculateRecipe(r);
    for (const [unitSystem, lang] of [['metric', 'es'], ['us', 'en'], ['metric', 'en']] as const) {
      const doc = buildRecipePdf(r, s, { ...DEFAULT_SETTINGS, unitSystem }, lang);
      const out = doc.output('arraybuffer');
      expect(new TextDecoder().decode(out.slice(0, 5))).toBe('%PDF-');
      expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    }
  });

  it('makes safe file names and text', () => {
    expect(pdfFileName({ name: 'Example: Cascade Pale Ale!' } as never)).toBe('example-cascade-pale-ale.pdf');
    expect(pdfFileName({ name: '' } as never)).toBe('recipe.pdf');
    expect(pdfFileName({ name: 'Cerveza Ámbar Ñandú' } as never)).toBe('cerveza-ambar-nandu.pdf');
    expect(pdfText('Gypsum (CaSO₄) “quoted”')).toBe('Gypsum (CaSO4) "quoted"');
  });
});
