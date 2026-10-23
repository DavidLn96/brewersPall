import type { Recipe } from '../domain/types';
import type { RecipeStats } from '../domain/recipe';
import type { Settings } from '../store/schema';
import type { Lang } from '../i18n';

/** Load the PDF module on demand so jsPDF stays out of the initial bundle. */
export async function downloadPdf(recipe: Recipe, stats: RecipeStats, settings: Settings, lang: Lang) {
  const { downloadRecipePdf } = await import('../pdf/recipePdf');
  return downloadRecipePdf(recipe, stats, settings, lang);
}
