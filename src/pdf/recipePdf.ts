/**
 * Recipe sheet PDF, generated in the browser with jsPDF (vector text, A4/Letter by unit system).
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Recipe } from '../domain/types';
import type { RecipeStats } from '../domain/recipe';
import { srmToHex } from '../domain/color';
import { compareToStyle } from '../domain/style';
import { findStyle } from '../data/styles';
import type { Settings } from '../store/schema';
import { saveFile } from '../ui/download';
import { fmt, fmtSg, hopTimeLabel, massL, massS, miscTimeUnit, stageLabel, temp, vol } from '../ui/format';
import { DEFAULT_LANG, dictFor, type Lang } from '../i18n';

const INK: [number, number, number] = [31, 28, 25];
const MUTED: [number, number, number] = [110, 103, 94];
const LINE: [number, number, number] = [214, 207, 197];
const ACCENT: [number, number, number] = [181, 101, 29];

/** Standard PDF fonts use WinAnsi encoding; map characters outside it to plain equivalents. */
const SUB = '₀₁₂₃₄₅₆₇₈₉';
export function pdfText(t: string): string {
  return t
    .replace(/[₀-₉]/g, (c) => String(SUB.indexOf(c)))
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/≈/g, '~')
    .replace(/[^\x00-\xFF–—•…]/g, '?');
}

export function buildRecipePdf(recipe: Recipe, stats: RecipeStats, settings: Settings, lang: Lang = DEFAULT_LANG): jsPDF {
  const t = dictFor(lang);
  const s = settings.unitSystem;
  const doc = new jsPDF({ unit: 'pt', format: s === 'us' ? 'letter' : 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;
  let y = M;

  // Header
  doc.setFillColor(...ACCENT);
  doc.rect(M, y, 18, 4, 'F');
  y += 22;
  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(pdfText(recipe.name || t.common.untitled), M, y);
  y += 18;
  const style = findStyle(recipe.styleId);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  const meta = [style ? `${style.code} ${style.name}` : null, t.method[recipe.method], `${vol(recipe.batchVolumeL, s)} ${recipe.batchTarget === 'fermenter' ? t.pdf.intoFermenter : t.pdf.postBoil}`, t.pdf.boil(recipe.boilMinutes), recipe.author ? t.pdf.brewer(recipe.author) : null].filter(Boolean).join('  ·  ');
  doc.text(pdfText(meta), M, y);
  if (recipe.description) {
    y += 14;
    const lines = doc.splitTextToSize(pdfText(recipe.description), W - 2 * M);
    doc.text(lines, M, y);
    y += (lines.length - 1) * 12;
  }
  y += 16;

  // Stats band
  const cells: [string, string][] = [
    ['OG', fmtSg(stats.og)],
    ['FG', fmtSg(stats.fg)],
    ['ABV', `${fmt(stats.abv, 1)}%`],
    ['IBU', fmt(stats.ibu, 0)],
    [t.pdf.colorSrm, fmt(stats.srm, 1)],
    [t.pdf.efficiency, `${fmt(recipe.efficiencyPct, 0)}%`],
  ];
  const cw = (W - 2 * M) / cells.length;
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.75);
  doc.rect(M, y, W - 2 * M, 46);
  cells.forEach(([k, v], i) => {
    const x = M + i * cw;
    if (i > 0) doc.line(x, y, x, y + 46);
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.setFont('helvetica', 'bold');
    doc.text(pdfText(k.toUpperCase()), x + 10, y + 15);
    doc.setFont('courier', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...INK);
    doc.text(v, x + 10, y + 34);
  });
  // Color chip in the color cell
  const hex = srmToHex(stats.srm);
  doc.setFillColor(parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16));
  doc.rect(M + 5 * cw - 18, y + 10, 8, 26, 'F');
  y += 58;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(pdfText(`${t.pdf.estimated(settings.ibuMethod === 'tinseth' ? 'Tinseth' : 'Rager', settings.colorMethod[0].toUpperCase() + settings.colorMethod.slice(1), t.stats.abvMethod[settings.abvMethod])} ${fmt(stats.ebc, 1)} EBC · BU:GU ${stats.buGu == null ? '–' : fmt(stats.buGu, 2)}`), M, y);
  y += 14;

  const table = (title: string, head: string[], body: (string | number)[][], rightCols: number[] = []) => {
    if (body.length === 0) return;
    if (y > doc.internal.pageSize.getHeight() - 100) {
      doc.addPage();
      y = M;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text(pdfText(title.toUpperCase()), M, y + 10);
    autoTable(doc, {
      startY: y + 16,
      head: [head.map(pdfText)],
      body: body.map((r) => r.map((c) => pdfText(String(c)))),
      margin: { left: M, right: M },
      theme: 'plain',
      styles: { font: 'helvetica', fontSize: 9, textColor: INK, cellPadding: { top: 4, bottom: 4, left: 4, right: 4 }, lineColor: LINE, lineWidth: { bottom: 0.5 } },
      headStyles: { fontStyle: 'bold', fontSize: 7.5, textColor: MUTED, lineWidth: { bottom: 0.9 }, lineColor: INK },
      columnStyles: Object.fromEntries(rightCols.map((c) => [c, { halign: 'right' as const }])),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 18;
  };

  table(
    t.view.fermentables,
    t.pdf.fermHead,
    recipe.fermentables.map((f) => {
      const st = stats.fermentables.find((x) => x.id === f.id);
      return [f.name, t.fermCategory[f.category], massL(f.amountKg, s), `${fmt(st?.weightPct ?? 0, 1)}%`, `${fmt(f.colorLovibond, 1)} °L`, stageLabel(f.stage, recipe.method, t), fmt(st?.ogPoints ?? 0, 1)];
    }),
    [2, 3, 4, 6],
  );
  table(
    t.view.hops,
    t.pdf.hopHead,
    recipe.hops.map((h) => [h.name, `${fmt(h.alphaPct, 1)}%`, massS(h.amountG, s), t.hopUse[h.use], hopTimeLabel(h, s, t), t.hopForm[h.form], fmt(stats.hops.find((x) => x.id === h.id)?.ibu ?? 0, 1)]),
    [1, 2, 6],
  );
  table(
    t.view.yeast,
    t.pdf.yeastHead,
    recipe.yeasts.map((yy) => [yy.name, [yy.lab, yy.product].filter(Boolean).join(' '), t.yeastForm[yy.form], `${fmt(yy.attenuationPct, 0)}%`, `${temp(yy.tempMinC, s)}–${temp(yy.tempMaxC, s)}`, fmt(yy.packs, 1), yy.starter ? t.common.yes : t.common.no]),
    [3, 5],
  );
  table(
    t.view.misc,
    t.pdf.miscHead,
    recipe.miscs.map((m) => [m.name, t.miscUse[m.use], miscTimeUnit(m.use, t) ? `${m.time} ${miscTimeUnit(m.use, t)}` : '—', `${m.amount} ${m.unit}`]),
    [2, 3],
  );
  table(recipe.method === 'extract' ? t.view.steeping : t.view.mashSchedule, t.view.stepHead, recipe.mashSteps.map((m) => [m.name, temp(m.tempC, s), `${m.minutes} ${t.common.min}`]), [1, 2]);
  table(t.view.fermentation, t.view.fermStepHead, recipe.fermentationSteps.map((f) => [f.name, temp(f.tempC, s), `${f.days}`]), [1, 2]);

  const v = stats.volumes;
  const volRows: [string, string][] = [
    [t.vols.totalWater, vol(v.totalWaterL, s)],
    ...(recipe.method === 'extract'
      ? ([[t.vols.steepWater, vol(v.mashWaterL, s)]] as [string, string][])
      : ([
          [recipe.method === 'biab' ? t.pdf.fullVolumeMashWater : t.vols.strikeWater, vol(v.mashWaterL, s)],
          ...(recipe.method === 'biab' ? [] : [[t.vols.spargeWater, vol(v.spargeWaterL, s)] as [string, string]]),
          [t.vols.strikeTemp, v.strikeTempC == null ? '–' : temp(v.strikeTempC, s)],
        ] as [string, string][])),
    [t.pdf.preBoilVolume, vol(v.preBoilL, s)],
    [t.stats.preBoilGravity, fmtSg(stats.preBoilGravity)],
    [t.pdf.postBoilVolume, vol(v.postBoilHotL, s)],
    [t.vols.intoFermenter, vol(v.intoFermenterL, s)],
    [t.pdf.packagedEst, vol(v.packagedL, s)],
  ];
  table(t.view.waterVolumes, ['', t.pdf.planned], volRows, [1]);

  if (style) {
    const cmp = compareToStyle(stats, style);
    const f = (m: string, n: number) => (m === 'og' || m === 'fg' ? fmtSg(n) : m === 'abv' ? `${fmt(n, 1)}%` : fmt(n, m === 'srm' ? 1 : 0));
    table(t.pdf.style(`${style.code} ${style.name}`), t.pdf.styleHead, cmp.map((c) => [c.metric.toUpperCase(), f(c.metric, c.value), `${f(c.metric, c.range.min)} – ${f(c.metric, c.range.max)}`, c.status === 'in' ? t.common.inRange : c.status === 'low' ? t.common.low : t.common.high]), [1, 2]);
  }

  if (recipe.notes.trim()) {
    if (y > doc.internal.pageSize.getHeight() - 80) {
      doc.addPage();
      y = M;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(t.pdf.notes, M, y + 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    const lines = doc.splitTextToSize(pdfText(recipe.notes), W - 2 * M);
    doc.text(lines, M, y + 26);
  }

  // Footer on every page
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const H = doc.internal.pageSize.getHeight();
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.setFont('helvetica', 'normal');
    doc.text(`Brewlab · ${new Date().toLocaleDateString(t.locale)}`, M, H - 24);
    doc.text(`${i} / ${pages}`, W - M, H - 24, { align: 'right' });
  }
  return doc;
}

export function pdfFileName(recipe: Recipe): string {
  const base = (recipe.name || 'recipe').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'recipe';
  return `${base}.pdf`;
}

export function downloadRecipePdf(recipe: Recipe, stats: RecipeStats, settings: Settings, lang: Lang) {
  return saveFile(buildRecipePdf(recipe, stats, settings, lang).output('blob'), pdfFileName(recipe));
}
