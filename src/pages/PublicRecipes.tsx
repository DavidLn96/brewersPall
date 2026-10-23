import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CopyPlus, FileDown, Loader2, RefreshCw, Search } from 'lucide-react';
import { useStore } from '../store/AppStore';
import { supabase } from '../cloud/client';
import { loadPublicRecipe, loadPublicRecipes, type PublicRecipe } from '../cloud/sync';
import { calculateRecipe } from '../domain/recipe';
import { srmToHex } from '../domain/color';
import { findStyle } from '../data/styles';
import { duplicateRecipe } from '../store/factory';
import { linkProps, navigate, type Route } from '../router';
import { fmt, fmtSg, relativeDate, vol } from '../ui/format';
import { Notice } from '../ui/common';
import { downloadPdf } from '../ui/pdfAction';
import { useI18n, type Dict } from '../i18n';
import { RecipeSheet } from './RecipeView';

const brewerOf = (p: PublicRecipe, t: Dict) => p.ownerName || p.recipe.author || t.public.unknownBrewer;

/** Copy a public recipe into the user's own recipes and open it for editing. */
function useCopyToMine() {
  const { upsertRecipe } = useStore();
  return (p: PublicRecipe) => {
    // The owner's equipment profile is not in this account, so the copy keeps its values as custom equipment.
    const copy = { ...duplicateRecipe(p.recipe, (n) => n), equipmentProfileId: null };
    upsertRecipe(copy);
    navigate({ name: 'edit', id: copy.id });
  };
}

export function PublicRecipeList() {
  const { data, account } = useStore();
  const { t, lang } = useI18n();
  const copyToMine = useCopyToMine();
  const settings = data.settings;
  const [rows, setRows] = useState<PublicRecipe[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');

  const load = useCallback(() => {
    if (!supabase) return;
    setRows(null);
    setError(null);
    loadPublicRecipes(supabase)
      .then(setRows)
      .catch((e: Error) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (rows ?? [])
      .map((p) => ({ p, stats: calculateRecipe(p.recipe, settings), style: findStyle(p.recipe.styleId) }))
      .filter(({ p, style }) => {
        if (!term) return true;
        const r = p.recipe;
        return [r.name, r.description, brewerOf(p, t), style?.name, style?.code, ...r.fermentables.map((f) => f.name), ...r.hops.map((h) => h.name), ...r.yeasts.map((y) => y.name)].some((x) => x?.toLowerCase().includes(term));
      });
  }, [rows, settings, q, t]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>{t.app.publicRecipes}</h1>
          <p className="sub">{t.public.sub}</p>
        </div>
        {supabase && (
          <button type="button" className="btn" onClick={load} disabled={rows === null && !error}>
            <RefreshCw size={15} aria-hidden="true" /> {t.public.refresh}
          </button>
        )}
      </div>

      {!supabase ? (
        <Notice tone="info">{t.public.localOnly}</Notice>
      ) : error ? (
        <Notice tone="bad">{t.public.loadError(error)}</Notice>
      ) : (
        <div className="panel">
          <div className="toolbar">
            <span className="search" style={{ maxWidth: 360 }}>
              <Search size={15} aria-hidden="true" />
              <input className="input" style={{ paddingLeft: 32 }} aria-label={t.list.filterLabel} placeholder={t.list.filterPlaceholder} value={q} onChange={(e) => setQ(e.target.value)} />
            </span>
            {rows && <span className="small faint">{t.list.countOf(shown.length, rows.length)}</span>}
          </div>
          {rows === null ? (
            <p className="empty muted" role="status" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Loader2 size={15} className="spin" aria-hidden="true" /> {t.public.loading}
            </p>
          ) : rows.length === 0 ? (
            <div className="empty">{t.public.empty}</div>
          ) : shown.length === 0 ? (
            <div className="empty">{t.list.noMatch(q)}</div>
          ) : (
            <div className="table-scroll">
              <table className="recipe-table">
                <thead>
                  <tr>
                    <th>{t.list.colRecipe}</th>
                    <th className="hide-sm">{t.public.colBrewer}</th>
                    <th className="hide-sm">{t.list.colStyle}</th>
                    <th className="r hide-sm">{t.list.colBatch}</th>
                    <th className="r">OG</th>
                    <th className="r">ABV</th>
                    <th className="r">IBU</th>
                    <th className="r">{t.list.colColor}</th>
                    <th className="hide-sm">{t.list.colUpdated}</th>
                    <th>
                      <span className="sr-only">{t.common.actions}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map(({ p, stats, style }) => {
                    const r = p.recipe;
                    const mine = p.ownerId === account?.id;
                    const route: Route = mine ? { name: 'recipe', id: r.id } : { name: 'publicRecipe', owner: p.ownerId, id: r.id };
                    return (
                      <tr key={`${p.ownerId}/${r.id}`}>
                        <td>
                          <a className="rname" {...linkProps(route)}>
                            {r.name || t.common.untitled}
                          </a>
                          <div className="xs faint">
                            {t.method[r.method]}
                            {mine && <span className="tag accent" style={{ marginLeft: 6 }}>{t.public.yours}</span>}
                          </div>
                        </td>
                        <td className="hide-sm small">{brewerOf(p, t)}</td>
                        <td className="hide-sm small muted">{style ? `${style.code} ${style.name}` : '—'}</td>
                        <td className="r mono small hide-sm">{vol(r.batchVolumeL, settings.unitSystem, 1)}</td>
                        <td className="r mono">{fmtSg(stats.og)}</td>
                        <td className="r mono">{fmt(stats.abv, 1)}%</td>
                        <td className="r mono">{fmt(stats.ibu, 0)}</td>
                        <td className="r mono" style={{ whiteSpace: 'nowrap' }}>
                          <span className="swatch-dot" style={{ background: srmToHex(stats.srm) }} />
                          {fmt(stats.srm, 0)}
                        </td>
                        <td className="hide-sm small faint">{relativeDate(r.updatedAt, t)}</td>
                        <td>
                          <div className="row-actions">
                            <button type="button" className="icon-btn" aria-label={t.list.pdfName(r.name)} title={t.common.downloadPdf} onClick={() => void downloadPdf(r, stats, settings, lang)}>
                              <FileDown size={15} />
                            </button>
                            {!mine && (
                              <button type="button" className="icon-btn" aria-label={`${t.public.copy}: ${r.name}`} title={t.public.copy} onClick={() => copyToMine(p)}>
                                <CopyPlus size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function PublicRecipeView({ owner, id }: { owner: string; id: string }) {
  const { data } = useStore();
  const { t, lang } = useI18n();
  const copyToMine = useCopyToMine();
  const settings = data.settings;
  const [entry, setEntry] = useState<PublicRecipe | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    setEntry(undefined);
    setError(null);
    loadPublicRecipe(supabase, owner, id)
      .then(setEntry)
      .catch((e: Error) => setError(e.message));
  }, [owner, id]);

  const stats = useMemo(() => (entry ? calculateRecipe(entry.recipe, settings) : null), [entry, settings]);

  const back = (
    <a className="btn btn-ghost" {...linkProps({ name: 'public' })}>
      <ArrowLeft size={15} aria-hidden="true" /> {t.app.publicRecipes}
    </a>
  );

  if (!supabase || error || entry === null) {
    return (
      <div className="page">
        <div className="page-head">{back}</div>
        <Notice tone={error ? 'bad' : 'info'}>{!supabase ? t.public.localOnly : error ? t.public.loadError(error) : t.public.notFound}</Notice>
      </div>
    );
  }
  if (!entry || !stats) {
    return (
      <div className="page">
        <div className="page-head">{back}</div>
        <p className="muted" role="status" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Loader2 size={15} className="spin" aria-hidden="true" /> {t.public.loading}
        </p>
      </div>
    );
  }

  return (
    <div className="page" style={{ maxWidth: 1080 }}>
      <div className="page-head">
        {back}
        <div className="actions">
          <button type="button" className="btn" onClick={() => void downloadPdf(entry.recipe, stats, settings, lang)}>
            <FileDown size={15} aria-hidden="true" /> {t.common.downloadPdf}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => copyToMine(entry)}>
            <CopyPlus size={15} aria-hidden="true" /> {t.public.copy}
          </button>
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <Notice tone="info">{t.public.readOnly}</Notice>
      </div>
      <RecipeSheet recipe={entry.recipe} stats={stats} settings={settings} byline={t.public.by(brewerOf(entry, t))} />
    </div>
  );
}
