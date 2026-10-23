import { useMemo, useState } from 'react';
import type { Recipe } from '../domain/types';
import type { RecipeStats } from '../domain/recipe';
import type { Settings } from '../store/schema';
import { ArrowLeft, Copy, FileDown, Pencil, Trash2 } from 'lucide-react';
import { useStore } from '../store/AppStore';
import { calculateRecipe } from '../domain/recipe';
import { compareToStyle } from '../domain/style';
import { findStyle } from '../data/styles';
import { linkProps, navigate } from '../router';
import { duplicateRecipe } from '../store/factory';
import { ConfirmDialog, Notice } from '../ui/common';
import { ColorStrip } from '../ui/StatsPanel';
import { fmt, fmtSg, hopTimeLabel, massL, massS, miscTimeUnit, relativeDate, stageLabel, temp, vol } from '../ui/format';
import { useI18n } from '../i18n';
import { downloadPdf } from '../ui/pdfAction';

export function RecipeView({ id }: { id: string }) {
  const { data, upsertRecipe, deleteRecipe, mode } = useStore();
  const recipe = data.recipes.find((r) => r.id === id);
  const settings = data.settings;
  const stats = useMemo(() => (recipe ? calculateRecipe(recipe, settings) : null), [recipe, settings]);
  const [confirm, setConfirm] = useState(false);
  const { t, lang } = useI18n();

  if (!recipe || !stats) {
    return (
      <div className="page">
        <h1>{t.common.recipeNotFound}</h1>
        <p className="muted" style={{ marginTop: 8 }}>
          {t.common.maybeDeleted} <a {...linkProps({ name: 'recipes' })}>{t.common.backToRecipes}</a>
        </p>
      </div>
    );
  }

  return (
    <div className="page" style={{ maxWidth: 1080 }}>
      <div className="page-head">
        <a className="btn btn-ghost" {...linkProps({ name: 'recipes' })}>
          <ArrowLeft size={15} aria-hidden="true" /> {t.app.myRecipes}
        </a>
        <div className="actions">
          <button type="button" className="btn btn-ghost btn-danger" onClick={() => setConfirm(true)}>
            <Trash2 size={15} aria-hidden="true" /> {t.common.delete}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              const copy = duplicateRecipe(recipe, t.common.copyOf);
              upsertRecipe(copy);
              navigate({ name: 'edit', id: copy.id });
            }}
          >
            <Copy size={15} aria-hidden="true" /> {t.common.duplicate}
          </button>
          <a className="btn" {...linkProps({ name: 'edit', id: recipe.id })}>
            <Pencil size={15} aria-hidden="true" /> {t.common.edit}
          </a>
          <button type="button" className="btn btn-primary" onClick={() => void downloadPdf(recipe, stats, settings, lang)}>
            <FileDown size={15} aria-hidden="true" /> {t.common.downloadPdf}
          </button>
        </div>
      </div>

      <RecipeSheet recipe={recipe} stats={stats} settings={settings} />

      {confirm && (
        <ConfirmDialog
          title={t.list.deleteTitle(recipe.name)}
          body={t.list.deleteBody(mode === 'cloud')}
          confirmLabel={t.list.deleteConfirm}
          danger
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            deleteRecipe(recipe.id);
            navigate({ name: 'recipes' });
          }}
        />
      )}
    </div>
  );
}


/** The read-only recipe sheet, shared by your own recipes and public ones. */
export function RecipeSheet({ recipe, stats, settings, byline }: { recipe: Recipe; stats: RecipeStats; settings: Settings; byline?: string }) {
  const { t } = useI18n();
  const s = settings.unitSystem;
  const style = findStyle(recipe.styleId);
  const v = stats.volumes;
  const cmp = style ? compareToStyle(stats, style) : [];
  const fm = (m: string, n: number) => (m === 'og' || m === 'fg' ? fmtSg(n) : m === 'abv' ? `${fmt(n, 1)}%` : fmt(n, m === 'srm' ? 1 : 0));

  return (
  <article className="sheet">
    <header className="sheet-head">
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="label">{style ? `${style.code} · ${style.name}` : t.view.noStyle}</div>
        <h1 style={{ marginTop: 4 }}>{recipe.name || t.common.untitled}</h1>
        {byline && <p className="small muted" style={{ marginTop: 4 }}>{byline}</p>}
        {recipe.description && <p className="muted" style={{ marginTop: 6, maxWidth: '65ch' }}>{recipe.description}</p>}
      </div>
      <dl className="stat-list" style={{ padding: 0, minWidth: 220, alignContent: 'start' }}>
        <dt>{t.view.method}</dt>
        <dd style={{ fontFamily: 'var(--font-sans)' }}>{t.method[recipe.method]}</dd>
        <dt>{t.view.batch}</dt>
        <dd>
          {vol(recipe.batchVolumeL, s)} <span className="faint">{t.batchTargetShort[recipe.batchTarget]}</span>
        </dd>
        <dt>{t.view.boil}</dt>
        <dd>{recipe.boilMinutes} {t.common.min}</dd>
        <dt>{t.view.efficiency}</dt>
        <dd>{fmt(recipe.efficiencyPct, 0)}%</dd>
        {recipe.author && (
          <>
            <dt>{t.view.brewer}</dt>
            <dd style={{ fontFamily: 'var(--font-sans)' }}>{recipe.author}</dd>
          </>
        )}
        <dt>{t.view.updated}</dt>
        <dd style={{ fontFamily: 'var(--font-sans)' }}>{relativeDate(recipe.updatedAt, t)}</dd>
      </dl>
    </header>

    <div>
      <div className="sheet-stats">
        {[
          ['OG', fmtSg(stats.og)],
          ['FG', fmtSg(stats.fg)],
          ['ABV', `${fmt(stats.abv, 1)}%`],
          ['IBU', fmt(stats.ibu, 0)],
          ['SRM', fmt(stats.srm, 1)],
          ['BU:GU', stats.buGu == null ? '–' : fmt(stats.buGu, 2)],
        ].map(([k, val]) => (
          <div key={k}>
            <div className="label">{k}</div>
            <div className="v">{val}</div>
          </div>
        ))}
      </div>
      <p className="xs faint" style={{ marginTop: 6 }}>
        {t.view.estimatedNote(settings.ibuMethod === 'tinseth' ? 'Tinseth' : 'Rager', settings.colorMethod[0].toUpperCase() + settings.colorMethod.slice(1), t.stats.abvMethod[settings.abvMethod])}
      </p>
    </div>

    {stats.warnings.length > 0 && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {stats.warnings.map((w, i) => (
          <Notice key={i}>{t.warnings[w.code](w)}</Notice>
        ))}
      </div>
    )}

    <SheetTable
      title={t.view.fermentables}
      head={t.view.fermHead}
      right={[2, 3, 4]}
      rows={recipe.fermentables.map((f) => {
        const st = stats.fermentables.find((x) => x.id === f.id);
        return [f.name, t.fermCategory[f.category], massL(f.amountKg, s), `${fmt(st?.weightPct ?? 0, 1)}%`, `${fmt(f.colorLovibond, 1)} °L`, stageLabel(f.stage, recipe.method, t)];
      })}
      foot={`${t.common.total} ${massL(stats.totalFermentableKg, s)}`}
    />
    <SheetTable
      title={t.view.hops}
      head={t.view.hopHead}
      right={[1, 2, 5]}
      rows={recipe.hops.map((h) => [h.name, `${fmt(h.alphaPct, 1)}%`, massS(h.amountG, s), t.hopUse[h.use], hopTimeLabel(h, s, t), fmt(stats.hops.find((x) => x.id === h.id)?.ibu ?? 0, 1)])}
      foot={`${t.common.total} ${massS(stats.totalHopsG, s)} · ${fmt(stats.ibu, 1)} IBU`}
    />
    <div className="two-col">
      <SheetTable title={t.view.yeast} head={t.view.yeastHead} right={[1, 2]} rows={recipe.yeasts.map((y) => [`${y.name}${y.product ? ` (${y.lab} ${y.product})` : ''}${y.starter ? ` · ${t.view.starter}` : ''}`, `${fmt(y.attenuationPct, 0)}%`, `${temp(y.tempMinC, s)}–${temp(y.tempMaxC, s)}`])} />
      <SheetTable title={t.view.misc} head={t.view.miscHead} right={[2]} rows={recipe.miscs.map((m) => [m.name, `${t.miscUse[m.use]}${miscTimeUnit(m.use, t) ? ` · ${m.time} ${miscTimeUnit(m.use, t)}` : ''}`, `${m.amount} ${m.unit}`])} />
    </div>
    <div className="two-col">
      <SheetTable title={recipe.method === 'extract' ? t.view.steeping : t.view.mashSchedule} head={t.view.stepHead} right={[1, 2]} rows={recipe.mashSteps.map((m) => [m.name, temp(m.tempC, s), `${m.minutes} ${t.common.min}`])} />
      <SheetTable title={t.view.fermentation} head={t.view.fermStepHead} right={[1, 2]} rows={recipe.fermentationSteps.map((f) => [f.name, temp(f.tempC, s), String(f.days)])} />
    </div>
    <div className="two-col">
      <section className="sheet-section">
        <h2>{t.view.waterVolumes}</h2>
        <dl className="stat-list" style={{ padding: 0 }}>
          <dt>{t.vols.totalWater}</dt>
          <dd>{vol(v.totalWaterL, s)}</dd>
          {recipe.method === 'extract' ? (
            <>
              <dt>{t.vols.steepWater}</dt>
              <dd>{vol(v.mashWaterL, s)}</dd>
            </>
          ) : (
            <>
              <dt>{recipe.method === 'biab' ? t.vols.fullVolumeMash : t.vols.strikeWater}</dt>
              <dd>{vol(v.mashWaterL, s)}</dd>
              {recipe.method !== 'biab' && (
                <>
                  <dt>{t.vols.spargeWater}</dt>
                  <dd>{vol(v.spargeWaterL, s)}</dd>
                </>
              )}
              <dt>{t.vols.strikeTemp}</dt>
              <dd>{v.strikeTempC == null ? '–' : temp(v.strikeTempC, s)}</dd>
            </>
          )}
          <dt>{t.vols.preBoil}</dt>
          <dd>
            {vol(v.preBoilL, s)} <span className="faint">@ {fmtSg(stats.preBoilGravity)}</span>
          </dd>
          <dt>{t.vols.postBoilHot}</dt>
          <dd>{vol(v.postBoilHotL, s)}</dd>
          <dt>{t.vols.intoFermenter}</dt>
          <dd>{vol(v.intoFermenterL, s)}</dd>
          <dt>{t.vols.packaged}</dt>
          <dd>{vol(v.packagedL, s)}</dd>
        </dl>
      </section>
      <section className="sheet-section">
        <h2>{t.view.colorStyle}</h2>
        <div style={{ border: '1px solid var(--line)', borderRadius: 6 }}>
          <ColorStrip srm={stats.srm} ebc={stats.ebc} />
          {style ? (
            <table className="sheet-table">
              <tbody>
                {cmp.map((c) => (
                  <tr key={c.metric}>
                    <td className="label">{c.metric.toUpperCase()}</td>
                    <td className="r">{fm(c.metric, c.value)}</td>
                    <td className="r faint">
                      {fm(c.metric, c.range.min)} – {fm(c.metric, c.range.max)}
                    </td>
                    <td className={c.status === 'in' ? 'status-in' : 'status-out'} style={{ fontFamily: 'var(--font-sans)' }}>
                      {c.status === 'in' ? t.common.inRange : c.status === 'low' ? t.common.low : t.common.high}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="small muted" style={{ padding: 12 }}>
              {t.view.noStyleShort}
            </p>
          )}
        </div>
      </section>
    </div>
    {recipe.notes.trim() && (
      <section className="sheet-section">
        <h2>{t.view.notes}</h2>
        <p style={{ whiteSpace: 'pre-wrap', maxWidth: '72ch' }}>{recipe.notes}</p>
      </section>
    )}
  </article>
  );
}

function SheetTable({ title, head, rows, right = [], foot }: { title: string; head: string[]; rows: string[][]; right?: number[]; foot?: string }) {
  const { t } = useI18n();
  return (
    <section className="sheet-section">
      <h2>{title}</h2>
      {rows.length === 0 ? (
        <p className="small faint">{t.common.none}</p>
      ) : (
        <div className="table-scroll">
          <table className="sheet-table">
            <thead>
              <tr>
                {head.map((h, i) => (
                  <th key={h} className={right.includes(i) ? 'r' : undefined}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j} className={right.includes(j) ? 'r' : undefined}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {foot && rows.length > 0 && <p className="xs muted mono" style={{ marginTop: 6, textAlign: 'right' }}>{foot}</p>}
    </section>
  );
}
