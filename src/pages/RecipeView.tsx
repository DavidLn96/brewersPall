import { useMemo, useState } from 'react';
import { ArrowLeft, Copy, FileDown, Pencil, Trash2 } from 'lucide-react';
import { useStore } from '../store/AppStore';
import { calculateRecipe } from '../domain/recipe';
import { compareToStyle } from '../domain/style';
import { findStyle } from '../data/styles';
import { FERMENTABLE_CATEGORY_LABEL } from '../data/fermentables';
import { MISC_USE_LABEL } from '../data/miscs';
import { linkProps, navigate } from '../router';
import { duplicateRecipe } from '../store/factory';
import { ConfirmDialog, Notice } from '../ui/common';
import { ColorStrip } from '../ui/StatsPanel';
import { fmt, fmtSg, HOP_USE_LABEL, hopTimeLabel, massL, massS, METHOD_LABEL, MISC_TIME_UNIT, relativeDate, temp, vol } from '../ui/format';
import { downloadPdf } from '../ui/pdfAction';

export function RecipeView({ id }: { id: string }) {
  const { data, upsertRecipe, deleteRecipe, mode } = useStore();
  const recipe = data.recipes.find((r) => r.id === id);
  const settings = data.settings;
  const s = settings.unitSystem;
  const stats = useMemo(() => (recipe ? calculateRecipe(recipe, settings) : null), [recipe, settings]);
  const [confirm, setConfirm] = useState(false);

  if (!recipe || !stats) {
    return (
      <div className="page">
        <h1>Recipe not found</h1>
        <p className="muted" style={{ marginTop: 8 }}>
          It may have been deleted. <a {...linkProps({ name: 'recipes' })}>Back to My Recipes</a>
        </p>
      </div>
    );
  }
  const style = findStyle(recipe.styleId);
  const v = stats.volumes;
  const cmp = style ? compareToStyle(stats, style) : [];
  const fm = (m: string, n: number) => (m === 'og' || m === 'fg' ? fmtSg(n) : m === 'abv' ? `${fmt(n, 1)}%` : fmt(n, m === 'srm' ? 1 : 0));

  return (
    <div className="page" style={{ maxWidth: 1080 }}>
      <div className="page-head">
        <a className="btn btn-ghost" {...linkProps({ name: 'recipes' })}>
          <ArrowLeft size={15} aria-hidden="true" /> My Recipes
        </a>
        <div className="actions">
          <button type="button" className="btn btn-ghost btn-danger" onClick={() => setConfirm(true)}>
            <Trash2 size={15} aria-hidden="true" /> Delete
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              const copy = duplicateRecipe(recipe);
              upsertRecipe(copy);
              navigate({ name: 'edit', id: copy.id });
            }}
          >
            <Copy size={15} aria-hidden="true" /> Duplicate
          </button>
          <a className="btn" {...linkProps({ name: 'edit', id: recipe.id })}>
            <Pencil size={15} aria-hidden="true" /> Edit
          </a>
          <button type="button" className="btn btn-primary" onClick={() => void downloadPdf(recipe, stats, settings)}>
            <FileDown size={15} aria-hidden="true" /> Download PDF
          </button>
        </div>
      </div>

      <article className="sheet">
        <header className="sheet-head">
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="label">{style ? `${style.code} · ${style.name}` : 'No style selected'}</div>
            <h1 style={{ marginTop: 4 }}>{recipe.name || 'Untitled recipe'}</h1>
            {recipe.description && <p className="muted" style={{ marginTop: 6, maxWidth: '65ch' }}>{recipe.description}</p>}
          </div>
          <dl className="stat-list" style={{ padding: 0, minWidth: 220, alignContent: 'start' }}>
            <dt>Method</dt>
            <dd style={{ fontFamily: 'var(--font-sans)' }}>{METHOD_LABEL[recipe.method]}</dd>
            <dt>Batch</dt>
            <dd>
              {vol(recipe.batchVolumeL, s)} <span className="faint">{recipe.batchTarget === 'fermenter' ? 'fermenter' : 'kettle'}</span>
            </dd>
            <dt>Boil</dt>
            <dd>{recipe.boilMinutes} min</dd>
            <dt>Efficiency</dt>
            <dd>{fmt(recipe.efficiencyPct, 0)}%</dd>
            {recipe.author && (
              <>
                <dt>Brewer</dt>
                <dd style={{ fontFamily: 'var(--font-sans)' }}>{recipe.author}</dd>
              </>
            )}
            <dt>Updated</dt>
            <dd style={{ fontFamily: 'var(--font-sans)' }}>{relativeDate(recipe.updatedAt)}</dd>
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
            Estimated from the recipe. {settings.ibuMethod === 'tinseth' ? 'Tinseth' : 'Rager'} IBU, {settings.colorMethod} color, {settings.abvMethod} ABV formula.
          </p>
        </div>

        {stats.warnings.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stats.warnings.map((w) => (
              <Notice key={w}>{w}</Notice>
            ))}
          </div>
        )}

        <SheetTable
          title="Fermentables"
          head={['Fermentable', 'Type', 'Amount', 'Share', 'Color', 'Added']}
          right={[2, 3, 4]}
          rows={recipe.fermentables.map((f) => {
            const st = stats.fermentables.find((x) => x.id === f.id);
            return [f.name, FERMENTABLE_CATEGORY_LABEL[f.category], massL(f.amountKg, s), `${fmt(st?.weightPct ?? 0, 1)}%`, `${fmt(f.colorLovibond, 1)} °L`, f.stage === 'mash' ? (recipe.method === 'extract' ? 'Steep' : 'Mash') : f.stage === 'boil' ? 'Boil' : 'Fermenter'];
          })}
          foot={`Total ${massL(stats.totalFermentableKg, s)}`}
        />
        <SheetTable
          title="Hops"
          head={['Hop', 'Alpha', 'Amount', 'Use', 'Time', 'IBU']}
          right={[1, 2, 5]}
          rows={recipe.hops.map((h) => [h.name, `${fmt(h.alphaPct, 1)}%`, massS(h.amountG, s), HOP_USE_LABEL[h.use], hopTimeLabel(h, s), fmt(stats.hops.find((x) => x.id === h.id)?.ibu ?? 0, 1)])}
          foot={`Total ${massS(stats.totalHopsG, s)} · ${fmt(stats.ibu, 1)} IBU`}
        />
        <div className="two-col">
          <SheetTable title="Yeast" head={['Strain', 'Attenuation', 'Temperature']} right={[1, 2]} rows={recipe.yeasts.map((y) => [`${y.name}${y.product ? ` (${y.lab} ${y.product})` : ''}${y.starter ? ' · starter' : ''}`, `${fmt(y.attenuationPct, 0)}%`, `${temp(y.tempMinC, s)}–${temp(y.tempMaxC, s)}`])} />
          <SheetTable title="Other ingredients" head={['Ingredient', 'Added', 'Amount']} right={[2]} rows={recipe.miscs.map((m) => [m.name, `${MISC_USE_LABEL[m.use]}${MISC_TIME_UNIT[m.use] ? ` · ${m.time} ${MISC_TIME_UNIT[m.use]}` : ''}`, `${m.amount} ${m.unit}`])} />
        </div>
        <div className="two-col">
          <SheetTable title={recipe.method === 'extract' ? 'Steeping' : 'Mash schedule'} head={['Step', 'Temperature', 'Time']} right={[1, 2]} rows={recipe.mashSteps.map((m) => [m.name, temp(m.tempC, s), `${m.minutes} min`])} />
          <SheetTable title="Fermentation" head={['Step', 'Temperature', 'Days']} right={[1, 2]} rows={recipe.fermentationSteps.map((f) => [f.name, temp(f.tempC, s), String(f.days)])} />
        </div>
        <div className="two-col">
          <section className="sheet-section">
            <h2>Water and volumes</h2>
            <dl className="stat-list" style={{ padding: 0 }}>
              <dt>Total water</dt>
              <dd>{vol(v.totalWaterL, s)}</dd>
              {recipe.method === 'extract' ? (
                <>
                  <dt>Steep water</dt>
                  <dd>{vol(v.mashWaterL, s)}</dd>
                </>
              ) : (
                <>
                  <dt>{recipe.method === 'biab' ? 'Full-volume mash' : 'Strike water'}</dt>
                  <dd>{vol(v.mashWaterL, s)}</dd>
                  {recipe.method !== 'biab' && (
                    <>
                      <dt>Sparge water</dt>
                      <dd>{vol(v.spargeWaterL, s)}</dd>
                    </>
                  )}
                  <dt>Strike temperature</dt>
                  <dd>{v.strikeTempC == null ? '–' : temp(v.strikeTempC, s)}</dd>
                </>
              )}
              <dt>Pre-boil</dt>
              <dd>
                {vol(v.preBoilL, s)} <span className="faint">@ {fmtSg(stats.preBoilGravity)}</span>
              </dd>
              <dt>Post-boil (hot)</dt>
              <dd>{vol(v.postBoilHotL, s)}</dd>
              <dt>Into fermenter</dt>
              <dd>{vol(v.intoFermenterL, s)}</dd>
              <dt>Packaged</dt>
              <dd>{vol(v.packagedL, s)}</dd>
            </dl>
          </section>
          <section className="sheet-section">
            <h2>Color and style</h2>
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
                          {c.status === 'in' ? 'In range' : c.status === 'low' ? 'Low' : 'High'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="small muted" style={{ padding: 12 }}>
                  No style selected.
                </p>
              )}
            </div>
          </section>
        </div>
        {recipe.notes.trim() && (
          <section className="sheet-section">
            <h2>Notes</h2>
            <p style={{ whiteSpace: 'pre-wrap', maxWidth: '72ch' }}>{recipe.notes}</p>
          </section>
        )}
      </article>

      {confirm && (
        <ConfirmDialog
          title={`Delete ${recipe.name || 'this recipe'}?`}
          body={`This removes the recipe from ${mode === 'cloud' ? 'your account' : 'this browser'}. It cannot be undone unless you have an export.`}
          confirmLabel="Delete recipe"
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

function SheetTable({ title, head, rows, right = [], foot }: { title: string; head: string[]; rows: string[][]; right?: number[]; foot?: string }) {
  return (
    <section className="sheet-section">
      <h2>{title}</h2>
      {rows.length === 0 ? (
        <p className="small faint">None.</p>
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
