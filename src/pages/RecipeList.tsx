import { useMemo, useRef, useState } from 'react';
import { Copy, Download, FileDown, Pencil, Plus, Search, Trash2, Upload } from 'lucide-react';
import { useStore } from '../store/AppStore';
import { calculateRecipe } from '../domain/recipe';
import { srmToHex } from '../domain/color';
import { findStyle } from '../data/styles';
import { duplicateRecipe, newRecipe, uid } from '../store/factory';
import { linkProps, navigate } from '../router';
import { fmt, fmtSg, METHOD_LABEL, relativeDate, vol } from '../ui/format';
import { ConfirmDialog, Notice, Toast } from '../ui/common';
import { exportFileSchema, describeIssues } from '../store/schema';
import { downloadPdf } from '../ui/pdfAction';
import type { Recipe } from '../domain/types';
import { downloadText } from '../ui/download';

export function RecipeList() {
  const { data, upsertRecipe, deleteRecipe, importRecipes, persistent, skipped, mode, localImportCount, importLocal, dismissLocalImport } = useStore();
  const [q, setQ] = useState('');
  const [toDelete, setToDelete] = useState<Recipe | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [importErrors, setImportErrors] = useState<string[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const settings = data.settings;

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
    const r = newRecipe(profile, settings.brewerName);
    upsertRecipe(r);
    navigate({ name: 'edit', id: r.id });
  };

  const exportAll = () => {
    const file = { format: 'brewpal-recipes', version: 1, exportedAt: new Date().toISOString(), recipes: data.recipes };
    downloadText(JSON.stringify(file, null, 2), `brewlab-recipes-${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
    setToast(`Exported ${data.recipes.length} recipe${data.recipes.length === 1 ? '' : 's'}`);
  };

  const onImport = async (file: File) => {
    setImportErrors(null);
    if (file.size > 5_000_000) {
      setImportErrors(['The file is larger than 5 MB. Export files from this app are much smaller; check that you chose the right file.']);
      return;
    }
    let json: unknown;
    try {
      json = JSON.parse(await file.text());
    } catch {
      setImportErrors(['The file is not valid JSON. Choose a file exported from Brewlab.']);
      return;
    }
    const parsed = exportFileSchema.safeParse(json);
    if (!parsed.success) {
      setImportErrors(['The file is not a Brewlab recipe export, or some values are out of range:', ...describeIssues(parsed.error)]);
      return;
    }
    const existing = new Set(data.recipes.map((r) => r.id));
    const incoming = (parsed.data.recipes as Recipe[]).map((r) => (existing.has(r.id) ? { ...r, id: uid('r_') } : r));
    importRecipes(incoming);
    setToast(`Imported ${incoming.length} recipe${incoming.length === 1 ? '' : 's'}`);
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>My Recipes</h1>
          <p className="sub">{mode === 'cloud' ? 'Recipes are saved to your account and available on any device where you sign in.' : 'Recipes are saved in this browser. Export them to keep a backup or move them to another device.'}</p>
        </div>
        <div className="actions">
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
            <Upload size={15} aria-hidden="true" /> Import
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
            <Download size={15} aria-hidden="true" /> Export all
          </button>
          <button type="button" className="btn btn-primary" onClick={create}>
            <Plus size={15} aria-hidden="true" /> New recipe
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        {localImportCount > 0 && (
          <div className="notice info" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ flex: 1, minWidth: 200 }}>
              This browser has {localImportCount} recipe{localImportCount === 1 ? '' : 's'} from before you signed in. Copy {localImportCount === 1 ? 'it' : 'them'} into your account?
            </span>
            <button type="button" className="btn btn-sm btn-primary" onClick={() => { importLocal(); setToast(`Imported ${localImportCount} recipe${localImportCount === 1 ? '' : 's'}`); }}>
              Import {localImportCount === 1 ? 'recipe' : 'recipes'}
            </button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={dismissLocalImport}>
              Not now
            </button>
          </div>
        )}
        {!persistent && <Notice tone="bad">This browser is blocking local storage, so recipes will be lost when you close the tab. Export them before leaving.</Notice>}
        {skipped > 0 && <Notice>{skipped} saved item{skipped === 1 ? '' : 's'} could not be read and {skipped === 1 ? 'was' : 'were'} skipped.</Notice>}
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
            <input className="input" style={{ paddingLeft: 32 }} aria-label="Filter recipes" placeholder="Filter by name, style or ingredient" value={q} onChange={(e) => setQ(e.target.value)} />
          </span>
          <span className="small faint">
            {rows.length} of {data.recipes.length}
          </span>
        </div>
        {data.recipes.length === 0 ? (
          <div className="empty" style={{ padding: 32 }}>
            <strong>No recipes yet.</strong>
            Create a recipe to start designing. Stats update as you add ingredients, and you can download a PDF sheet at any time.
            <div style={{ marginTop: 12 }}>
              <button type="button" className="btn btn-primary" onClick={create}>
                <Plus size={15} aria-hidden="true" /> New recipe
              </button>
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div className="empty">No recipes match “{q}”.</div>
        ) : (
          <div className="table-scroll">
            <table className="recipe-table">
              <thead>
                <tr>
                  <th>Recipe</th>
                  <th className="hide-sm">Style</th>
                  <th className="r hide-sm">Batch</th>
                  <th className="r">OG</th>
                  <th className="r">ABV</th>
                  <th className="r">IBU</th>
                  <th className="r">Color</th>
                  <th className="hide-sm">Updated</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ r, stats, style }) => (
                  <tr key={r.id}>
                    <td>
                      <a className="rname" {...linkProps({ name: 'recipe', id: r.id })}>
                        {r.name || 'Untitled recipe'}
                      </a>
                      <div className="xs faint">{METHOD_LABEL[r.method]}</div>
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
                    <td className="hide-sm small faint">{relativeDate(r.updatedAt)}</td>
                    <td>
                      <div className="row-actions">
                        <a className="icon-btn" aria-label={`Edit ${r.name}`} title="Edit" {...linkProps({ name: 'edit', id: r.id })}>
                          <Pencil size={14} />
                        </a>
                        <button type="button" className="icon-btn" aria-label={`Download PDF of ${r.name}`} title="Download PDF" onClick={() => void downloadPdf(r, stats, settings)}>
                          <FileDown size={15} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label={`Duplicate ${r.name}`}
                          title="Duplicate"
                          onClick={() => {
                            upsertRecipe(duplicateRecipe(r));
                            setToast(`Duplicated ${r.name}`);
                          }}
                        >
                          <Copy size={14} />
                        </button>
                        <button type="button" className="icon-btn danger" aria-label={`Delete ${r.name}`} title="Delete" onClick={() => setToDelete(r)}>
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
          title={`Delete ${toDelete.name || 'this recipe'}?`}
          body={`This removes the recipe from ${mode === 'cloud' ? 'your account' : 'this browser'}. It cannot be undone unless you have an export.`}
          confirmLabel="Delete recipe"
          danger
          onCancel={() => setToDelete(null)}
          onConfirm={() => {
            deleteRecipe(toDelete.id);
            setToast(`Deleted ${toDelete.name}`);
            setToDelete(null);
          }}
        />
      )}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
