import { useMemo, useRef, useState } from 'react';
import { Copy, Download, FileDown, Pencil, Plus, Search, Trash2, Upload } from 'lucide-react';
import { useStore } from '../store/AppStore';
import { calculateRecipe } from '../domain/recipe';
import { srmToHex } from '../domain/color';
import { findStyle } from '../data/styles';
import { duplicateRecipe, newRecipe, uid } from '../store/factory';
import { linkProps, navigate } from '../router';
import { fmt, fmtSg, relativeDate, vol } from '../ui/format';
import { ConfirmDialog, Notice, Toast } from '../ui/common';
import { exportFileSchema, describeIssues } from '../store/schema';
import { downloadPdf } from '../ui/pdfAction';
import type { Recipe } from '../domain/types';
import { downloadText } from '../ui/download';
import { useI18n } from '../i18n';

export function RecipeList() {
  const { data, upsertRecipe, deleteRecipe, importRecipes, persistent, skipped, mode, localImportCount, importLocal, dismissLocalImport } = useStore();
  const [q, setQ] = useState('');
  const [toDelete, setToDelete] = useState<Recipe | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [importErrors, setImportErrors] = useState<string[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const settings = data.settings;
  const { t, lang } = useI18n();

  const rows = useMemo(
    () =>
      [...data.recipes]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map((r) => ({ r, stats: calculateRecipe(r, settings), style: findStyle(r.styleId) }))
        .filter(({ r, style }) => {
          const t = q.trim().toLowerCase();
          if (!t) return true;
          return [r.name, r.description, style?.name, style?.code, ...r.fermentables.map((f) => f.name), ...r.hops.map((h) => h.name), ...r.yeasts.map((y) => y.name)].some((x) => x?.toLowerCase().includes(t));
        }),
    [data.recipes, settings, q],
  );

  const create = () => {
    const profile = data.equipment[0];
    const r = newRecipe(profile, settings.brewerName, { untitled: t.common.untitled, ...t.defaults });
    upsertRecipe(r);
    navigate({ name: 'edit', id: r.id });
  };

  const exportAll = () => {
    const file = { format: 'brewpal-recipes', version: 1, exportedAt: new Date().toISOString(), recipes: data.recipes };
    downloadText(JSON.stringify(file, null, 2), `brewlab-recipes-${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
    setToast(t.list.exported(data.recipes.length));
  };

  const onImport = async (file: File) => {
    setImportErrors(null);
    if (file.size > 5_000_000) {
      setImportErrors([t.list.tooLarge]);
      return;
    }
    let json: unknown;
    try {
      json = JSON.parse(await file.text());
    } catch {
      setImportErrors([t.list.notJson]);
      return;
    }
    const parsed = exportFileSchema.safeParse(json);
    if (!parsed.success) {
      setImportErrors([t.list.notExport, ...describeIssues(parsed.error)]);
      return;
    }
    const existing = new Set(data.recipes.map((r) => r.id));
    const incoming = (parsed.data.recipes as Recipe[]).map((r) => (existing.has(r.id) ? { ...r, id: uid('r_') } : r));
    importRecipes(incoming);
    setToast(t.list.imported(incoming.length));
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>{t.list.title}</h1>
          <p className="sub">{mode === 'cloud' ? t.list.subCloud : t.list.subLocal}</p>
        </div>
        <div className="actions">
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
            <Upload size={15} aria-hidden="true" /> {t.list.import}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onImport(f);
              e.target.value = '';
            }}
          />
          <button type="button" className="btn" onClick={exportAll} disabled={data.recipes.length === 0}>
            <Download size={15} aria-hidden="true" /> {t.list.exportAll}
          </button>
          <button type="button" className="btn btn-primary" onClick={create}>
            <Plus size={15} aria-hidden="true" /> {t.list.newRecipe}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        {localImportCount > 0 && (
          <div className="notice info" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ flex: 1, minWidth: 200 }}>
              {t.list.localImport(localImportCount)}
            </span>
            <button type="button" className="btn btn-sm btn-primary" onClick={() => { importLocal(); setToast(t.list.imported(localImportCount)); }}>
              {t.list.importButton(localImportCount)}
            </button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={dismissLocalImport}>
              {t.list.notNow}
            </button>
          </div>
        )}
        {!persistent && <Notice tone="bad">{t.list.storageBlocked}</Notice>}
        {skipped > 0 && <Notice>{t.list.skipped(skipped)}</Notice>}
        {importErrors && (
          <Notice tone="bad">
            {importErrors.map((e, i) => (
              <span key={i} style={{ display: 'block' }}>
                {e}
              </span>
            ))}
          </Notice>
        )}
      </div>

      <div className="panel">
        <div className="toolbar">
          <span className="search" style={{ maxWidth: 360 }}>
            <Search size={15} aria-hidden="true" />
            <input className="input" style={{ paddingLeft: 32 }} aria-label={t.list.filterLabel} placeholder={t.list.filterPlaceholder} value={q} onChange={(e) => setQ(e.target.value)} />
          </span>
          <span className="small faint">
            {t.list.countOf(rows.length, data.recipes.length)}
          </span>
        </div>
        {data.recipes.length === 0 ? (
          <div className="empty" style={{ padding: 32 }}>
            <strong>{t.list.emptyTitle}</strong>
            {t.list.emptyBody}
            <div style={{ marginTop: 12 }}>
              <button type="button" className="btn btn-primary" onClick={create}>
                <Plus size={15} aria-hidden="true" /> {t.list.newRecipe}
              </button>
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div className="empty">{t.list.noMatch(q)}</div>
        ) : (
          <div className="table-scroll">
            <table className="recipe-table">
              <thead>
                <tr>
                  <th>{t.list.colRecipe}</th>
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
                {rows.map(({ r, stats, style }) => (
                  <tr key={r.id}>
                    <td>
                      <a className="rname" {...linkProps({ name: 'recipe', id: r.id })}>
                        {r.name || t.common.untitled}
                      </a>
                      <div className="xs faint">{t.method[r.method]}</div>
                    </td>
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
                        <a className="icon-btn" aria-label={t.list.editName(r.name)} title={t.common.edit} {...linkProps({ name: 'edit', id: r.id })}>
                          <Pencil size={14} />
                        </a>
                        <button type="button" className="icon-btn" aria-label={t.list.pdfName(r.name)} title={t.common.downloadPdf} onClick={() => void downloadPdf(r, stats, settings, lang)}>
                          <FileDown size={15} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label={t.list.duplicateName(r.name)}
                          title={t.common.duplicate}
                          onClick={() => {
                            upsertRecipe(duplicateRecipe(r, t.common.copyOf));
                            setToast(t.list.duplicated(r.name));
                          }}
                        >
                          <Copy size={14} />
                        </button>
                        <button type="button" className="icon-btn danger" aria-label={t.list.deleteName(r.name)} title={t.common.delete} onClick={() => setToDelete(r)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toDelete && (
        <ConfirmDialog
          title={t.list.deleteTitle(toDelete.name)}
          body={t.list.deleteBody(mode === 'cloud')}
          confirmLabel={t.list.deleteConfirm}
          danger
          onCancel={() => setToDelete(null)}
          onConfirm={() => {
            deleteRecipe(toDelete.id);
            setToast(t.list.deleted(toDelete.name));
            setToDelete(null);
          }}
        />
      )}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
