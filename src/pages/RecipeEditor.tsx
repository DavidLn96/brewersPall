import { useMemo } from 'react';
import { Check, Eye, FileDown, Loader2, Plus, TriangleAlert } from 'lucide-react';
import type { Fermentable, FermentableStage, Hop, HopForm, HopUse, MashStep, FermentationStep, Misc, MiscType, MiscUnit, MiscUse, Recipe, Yeast, BrewMethod, BatchTarget } from '../domain/types';
import { calculateRecipe } from '../domain/recipe';
import { srmToHex } from '../domain/color';
import { findStyle, STYLES } from '../data/styles';
import { FERMENTABLES, FERMENTABLE_CATEGORY_LABEL, type FermentableCatalogItem } from '../data/fermentables';
import { HOPS, type HopCatalogItem } from '../data/hops';
import { YEASTS, type YeastCatalogItem } from '../data/yeasts';
import { MISCS, MISC_TYPE_LABEL, MISC_UNITS, MISC_USE_LABEL, type MiscCatalogItem } from '../data/miscs';
import { useStore } from '../store/AppStore';
import { customFermentable, customHop, customMisc, customYeast, equipmentFromProfile, fermentableFromCatalog, hopFromCatalog, miscFromCatalog, uid, yeastFromCatalog } from '../store/factory';
import { linkProps } from '../router';
import { NumberField, NumberInput, Select, SelectField, TextField } from '../ui/fields';
import { Picker, type PickerOption } from '../ui/Picker';
import { CellLabel, moveItem, Notice, RowActions, Section } from '../ui/common';
import { MobileStats, StatsPanel } from '../ui/StatsPanel';
import { fmt, HOP_USE_LABEL, massL, massS, METHOD_LABEL, MISC_TIME_UNIT, ppgFormat } from '../ui/format';
import { downloadPdf } from '../ui/pdfAction';
import type { UnitSystem } from '../domain/units';

const fermentableOptions: PickerOption<FermentableCatalogItem>[] = FERMENTABLES.map((f) => ({
  key: f.id,
  label: f.name,
  meta: `${(1 + f.ppg / 1000).toFixed(3)} · ${f.lovibond}°L`,
  group: FERMENTABLE_CATEGORY_LABEL[f.category],
  item: f,
}));
const hopOptions: PickerOption<HopCatalogItem>[] = HOPS.map((h) => ({ key: h.id, label: h.name, meta: `${h.alpha}% AA · ${h.origin}`, keywords: h.notes, item: h }));
const yeastOptions: PickerOption<YeastCatalogItem>[] = YEASTS.map((y) => ({ key: y.id, label: `${y.lab} ${y.product} ${y.name}`, meta: `${y.attenuation}% · ${y.form}`, group: y.lab, keywords: y.notes, item: y }));
const miscOptions: PickerOption<MiscCatalogItem>[] = MISCS.map((m) => ({ key: m.id, label: m.name, meta: MISC_TYPE_LABEL[m.type], group: MISC_TYPE_LABEL[m.type], item: m }));

const STAGES: { value: FermentableStage; label: string }[] = [
  { value: 'mash', label: 'Mash' },
  { value: 'boil', label: 'Boil' },
  { value: 'fermenter', label: 'Fermenter' },
];
const HOP_USES = (Object.keys(HOP_USE_LABEL) as HopUse[]).map((u) => ({ value: u, label: HOP_USE_LABEL[u] }));
const HOP_FORMS: { value: HopForm; label: string }[] = [
  { value: 'pellet', label: 'Pellet' },
  { value: 'leaf', label: 'Leaf' },
  { value: 'cryo', label: 'Cryo' },
];

export function RecipeEditor({ id }: { id: string }) {
  const { data, upsertRecipe, saveState, persistent, mode } = useStore();
  const recipe = data.recipes.find((r) => r.id === id);
  const settings = data.settings;
  const s = settings.unitSystem;
  const stats = useMemo(() => (recipe ? calculateRecipe(recipe, settings) : null), [recipe, settings]);

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
  const update = (patch: Partial<Recipe>) => upsertRecipe({ ...recipe, ...patch });
  const setList = <K extends 'fermentables' | 'hops' | 'yeasts' | 'miscs' | 'mashSteps' | 'fermentationSteps'>(key: K, list: Recipe[K]) => update({ [key]: list } as Partial<Recipe>);
  const patchItem = <K extends 'fermentables' | 'hops' | 'yeasts' | 'miscs' | 'mashSteps' | 'fermentationSteps'>(key: K, itemId: string, patch: Partial<Recipe[K][number]>) =>
    setList(key, (recipe[key] as { id: string }[]).map((x) => (x.id === itemId ? { ...x, ...patch } : x)) as Recipe[K]);

  const applyProfile = (profileId: string) => {
    const p = data.equipment.find((e) => e.id === profileId);
    if (!p) return;
    update({ equipmentProfileId: p.id, equipment: equipmentFromProfile(p), method: p.method, batchTarget: p.batchTarget, efficiencyPct: p.defaultEfficiencyPct });
  };

  const isExtract = recipe.method === 'extract';

  return (
    <div className="page">
      <div className="page-head" style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 320px', minWidth: 0 }}>
          <label htmlFor="recipe-name" className="sr-only">
            Recipe name
          </label>
          <input id="recipe-name" className="title-input" value={recipe.name} onChange={(e) => update({ name: e.target.value })} placeholder="Recipe name" />
          <div className="actions" style={{ marginTop: 4 }}>
            <span className="tag">{METHOD_LABEL[recipe.method]}</span>
            {style && <span className="tag accent">{style.code} {style.name}</span>}
            <SaveState state={saveState} persistent={persistent} cloud={mode === 'cloud'} />
          </div>
        </div>
        <div className="actions">
          <a className="btn" {...linkProps({ name: 'recipe', id: recipe.id })}>
            <Eye size={15} aria-hidden="true" /> View sheet
          </a>
          <button type="button" className="btn btn-primary" onClick={() => void downloadPdf(recipe, stats, settings)}>
            <FileDown size={15} aria-hidden="true" /> Download PDF
          </button>
        </div>
      </div>

      <MobileStats stats={stats} />

      <div className="editor" style={{ marginTop: 12 }}>
        <div className="editor-main">
          <Section title="Batch" id="batch">
            <div className="section-body grid grid-4">
              <SelectField<string>
                label="Equipment profile"
                className="span-2"
                value={recipe.equipmentProfileId ?? ''}
                onChange={applyProfile}
                options={[...(recipe.equipmentProfileId && !data.equipment.some((e) => e.id === recipe.equipmentProfileId) ? [{ value: recipe.equipmentProfileId, label: `${recipe.equipment.name} (deleted)` }] : []), ...(recipe.equipmentProfileId ? [] : [{ value: '', label: 'Custom equipment' }]), ...data.equipment.map((e) => ({ value: e.id, label: e.name }))]}
                hint="Choosing a profile copies its volumes and losses into this recipe."
              />
              <SelectField<BrewMethod>
                label="Method"
                value={recipe.method}
                onChange={(m) => update({ method: m })}
                options={(Object.keys(METHOD_LABEL) as BrewMethod[]).map((m) => ({ value: m, label: METHOD_LABEL[m] }))}
              />
              <SelectField<string> label="Style" value={recipe.styleId ?? ''} onChange={(v) => update({ styleId: v || null })} options={[{ value: '', label: 'No style' }, ...STYLES.map((st) => ({ value: st.id, label: `${st.code} ${st.name}` }))]} />
              <SelectField<BatchTarget>
                label="Batch size measured"
                value={recipe.batchTarget}
                onChange={(t) => update({ batchTarget: t })}
                options={[
                  { value: 'fermenter', label: 'Into fermenter' },
                  { value: 'kettle', label: 'Post-boil kettle' },
                ]}
              />
              <NumberField label="Batch size" kind="volume" system={s} value={recipe.batchVolumeL} onChange={(v) => update({ batchVolumeL: v })} max={s === 'us' ? 1000 : 4000} />
              <NumberField label="Boil time" unit="min" decimals={0} value={recipe.boilMinutes} onChange={(v) => update({ boilMinutes: Math.round(v) })} max={300} />
              <NumberField
                label={recipe.batchTarget === 'fermenter' ? 'Brewhouse efficiency' : 'Kettle efficiency'}
                unit="%"
                decimals={1}
                value={recipe.efficiencyPct}
                onChange={(v) => update({ efficiencyPct: v })}
                max={100}
                hint={isExtract ? 'Applies to steeping grains only.' : recipe.batchTarget === 'fermenter' ? 'Extract that reaches the fermenter.' : 'Extract in the kettle after the boil.'}
              />
            </div>
          </Section>

          <FermentablesSection recipe={recipe} stats={stats} system={s} setList={(l) => setList('fermentables', l)} patch={(i, p) => patchItem('fermentables', i, p)} />
          <HopsSection recipe={recipe} stats={stats} system={s} setList={(l) => setList('hops', l)} patch={(i, p) => patchItem('hops', i, p)} />
          <YeastSection recipe={recipe} system={s} setList={(l) => setList('yeasts', l)} patch={(i, p) => patchItem('yeasts', i, p)} />
          <MiscSection recipe={recipe} setList={(l) => setList('miscs', l)} patch={(i, p) => patchItem('miscs', i, p)} />
          <StepsSection<MashStep>
            title={isExtract ? 'Steeping' : 'Mash schedule'}
            items={recipe.mashSteps}
            system={s}
            timeUnit="min"
            timeKey="minutes"
            onChange={(l) => setList('mashSteps', l)}
            newItem={() => ({ id: uid('m_'), name: recipe.mashSteps.length === 0 ? 'Saccharification' : 'Mash out', tempC: recipe.mashSteps.length === 0 ? 66 : 76, minutes: recipe.mashSteps.length === 0 ? 60 : 10 })}
            hint={isExtract ? undefined : 'The first step sets the strike water temperature.'}
          />
          <StepsSection<FermentationStep>
            title="Fermentation schedule"
            items={recipe.fermentationSteps}
            system={s}
            timeUnit="days"
            timeKey="days"
            onChange={(l) => setList('fermentationSteps', l)}
            newItem={() => ({ id: uid('fs_'), name: recipe.fermentationSteps.length === 0 ? 'Primary' : 'Conditioning', tempC: recipe.fermentationSteps.length === 0 ? 19 : 4, days: recipe.fermentationSteps.length === 0 ? 14 : 7 })}
          />
          <EquipmentSection recipe={recipe} system={s} update={update} />

          <Section title="Notes" id="notes">
            <div className="section-body grid grid-2">
              <TextField label="Brewer" value={recipe.author} onChange={(v) => update({ author: v })} placeholder={settings.brewerName || 'Your name'} />
              <TextField label="Short description" value={recipe.description} onChange={(v) => update({ description: v })} placeholder="What this beer is about" />
              <TextField className="span-2" label="Brewing notes" multiline value={recipe.notes} onChange={(v) => update({ notes: v })} placeholder="Process notes, water adjustments, tasting goals…" />
            </div>
          </Section>
        </div>

        <aside className="editor-side" aria-label="Recipe statistics">
          <StatsPanel stats={stats} recipe={recipe} style={style} settings={settings} />
        </aside>
      </div>
    </div>
  );
}

function SaveState({ state, persistent, cloud }: { state: 'saved' | 'saving' | 'error'; persistent: boolean; cloud: boolean }) {
  if (!persistent)
    return (
      <span className="save-state error">
        <TriangleAlert size={13} aria-hidden="true" /> Not saved: this browser blocks local storage
      </span>
    );
  if (state === 'error')
    return (
      <span className="save-state error" role="alert">
        <TriangleAlert size={13} aria-hidden="true" /> {cloud ? 'Not saved yet. Retrying when the connection is back.' : 'Could not save. Storage may be full.'}
      </span>
    );
  return (
    <span className="save-state" aria-live="polite">
      {state === 'saving' ? <Loader2 size={13} aria-hidden="true" /> : <Check size={13} aria-hidden="true" />}
      {state === 'saving' ? 'Saving…' : cloud ? 'Saved to your account' : 'Saved in this browser'}
    </span>
  );
}

type StatsT = ReturnType<typeof calculateRecipe>;

function FermentablesSection({ recipe, stats, system, setList, patch }: { recipe: Recipe; stats: StatsT; system: UnitSystem; setList: (l: Fermentable[]) => void; patch: (id: string, p: Partial<Fermentable>) => void }) {
  const list = recipe.fermentables;
  const hasBase = list.some((f) => f.category === 'base' || f.category === 'extract');
  const defaultKg = (c: FermentableCatalogItem) =>
    c.category === 'base' ? (hasBase ? 0.5 : 4) : c.category === 'extract' ? (hasBase ? 0.5 : 2.5) : c.category === 'sugar' ? 0.25 : c.category === 'roasted' ? 0.15 : 0.3;
  return (
    <Section
      title="Fermentables"
      id="fermentables"
      count={list.length}
      actions={<Picker label="Add fermentable" placeholder="Add malt, extract or sugar…" options={fermentableOptions} onPick={(c) => setList([...list, fermentableFromCatalog(c, defaultKg(c))])} onCustom={(n) => setList([...list, customFermentable(n)])} />}
      footer={
        list.length > 0 && (
          <>
            <span>
              Total <strong>{massL(stats.totalFermentableKg, system)}</strong>
            </span>
            <span>
              Grain <strong>{massL(stats.totalGrainKg, system)}</strong>
            </span>
            <span>
              OG <strong>{stats.og.toFixed(3)}</strong>
            </span>
          </>
        )
      }
    >
      {list.length === 0 ? (
        <div className="empty">
          <strong>No fermentables yet.</strong>
          Search above to add a base malt, extract or sugar. Gravity and color update as you go.
        </div>
      ) : (
        <div className="table-scroll">
          <table className="itable stack">
            <thead>
              <tr>
                <th>Fermentable</th>
                <th className="r">Amount</th>
                <th className="r">Potential</th>
                <th className="r">Color</th>
                <th>Added</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((f, i) => {
                const st = stats.fermentables.find((x) => x.id === f.id);
                return (
                  <tr key={f.id}>
                    <td className="name-cell">
                      <CellLabel>Fermentable</CellLabel>
                      <input className="input name-input" aria-label="Fermentable name" value={f.name} onChange={(e) => patch(f.id, { name: e.target.value })} />
                      <div className="meta">
                        <span className="swatch-dot" style={{ background: srmToHex(f.colorLovibond) }} />
                        {FERMENTABLE_CATEGORY_LABEL[f.category]}
                        {!f.fermentable && ' · unfermentable'}
                        <span className="mono" title={`${fmt(st?.mcu ?? 0, 1)} MCU`}>
                          {' · '}
                          {fmt(st?.weightPct ?? 0, 1)}% · {fmt(st?.ogPoints ?? 0, 1)} pts
                        </span>
                      </div>
                      <div className="bar" aria-hidden="true">
                        <span style={{ width: `${Math.min(100, st?.weightPct ?? 0)}%` }} />
                      </div>
                    </td>
                    <td style={{ width: 112, minWidth: 112 }}>
                      <CellLabel>Amount</CellLabel>
                      <NumberInput ariaLabel={`${f.name} amount`} kind="massLarge" system={system} value={f.amountKg} onChange={(v) => patch(f.id, { amountKg: v })} max={1000} />
                    </td>
                    <td style={{ width: 96, minWidth: 96 }}>
                      <CellLabel>Potential (SG)</CellLabel>
                      <NumberInput ariaLabel={`${f.name} potential gravity`} format={ppgFormat} decimals={3} min={1} max={1.05} step={0.001} value={f.potentialPpg} onChange={(v) => patch(f.id, { potentialPpg: v })} />
                    </td>
                    <td style={{ width: 92, minWidth: 92 }}>
                      <CellLabel>Color</CellLabel>
                      <NumberInput ariaLabel={`${f.name} color in Lovibond`} unit="°L" decimals={1} max={1000} value={f.colorLovibond} onChange={(v) => patch(f.id, { colorLovibond: v })} />
                    </td>
                    <td style={{ width: 112, minWidth: 112 }}>
                      <CellLabel>Added</CellLabel>
                      <Select ariaLabel={`${f.name} addition stage`} value={f.stage} options={STAGES} onChange={(v) => patch(f.id, { stage: v })} />
                    </td>
                    <td className="actions-cell" style={{ width: 112, minWidth: 112 }}>
                      <RowActions name={f.name} index={i} length={list.length} onMove={(a, b) => setList(moveItem(list, a, b))} onDuplicate={() => setList([...list.slice(0, i + 1), { ...f, id: uid('f_') }, ...list.slice(i + 1)])} onRemove={() => setList(list.filter((x) => x.id !== f.id))} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

function HopsSection({ recipe, stats, system, setList, patch }: { recipe: Recipe; stats: StatsT; system: UnitSystem; setList: (l: Hop[]) => void; patch: (id: string, p: Partial<Hop>) => void }) {
  const list = recipe.hops;
  const lastTime = list.length ? list[list.length - 1].time : recipe.boilMinutes;
  return (
    <Section
      title="Hops"
      id="hops"
      count={list.length}
      actions={<Picker label="Add hop" placeholder="Add hop variety…" options={hopOptions} onPick={(c) => setList([...list, hopFromCatalog(c, list.length === 0 ? 20 : 30, list.length === 0 ? recipe.boilMinutes : Math.max(0, Math.min(lastTime, 15)))])} onCustom={(n) => setList([...list, customHop(n)])} />}
      footer={
        list.length > 0 && (
          <>
            <span>
              Total <strong>{massS(stats.totalHopsG, system)}</strong>
            </span>
            <span>
              IBU <strong>{fmt(stats.ibu, 1)}</strong>
            </span>
            <span>
              Boil gravity <strong>{stats.boilGravity.toFixed(3)}</strong>
            </span>
          </>
        )
      }
    >
      {list.length === 0 ? (
        <div className="empty">
          <strong>No hops yet.</strong>
          Add a bittering hop at the start of the boil, then flavor, whirlpool and dry-hop additions.
        </div>
      ) : (
        <div className="table-scroll">
          <table className="itable stack">
            <thead>
              <tr>
                <th>Hop</th>
                <th className="r">Alpha</th>
                <th className="r">Amount</th>
                <th>Use</th>
                <th>Time</th>
                <th className="r">IBU</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((h, i) => {
                const st = stats.hops.find((x) => x.id === h.id);
                return (
                  <tr key={h.id}>
                    <td className="name-cell">
                      <CellLabel>Hop</CellLabel>
                      <input className="input name-input" aria-label="Hop name" value={h.name} onChange={(e) => patch(h.id, { name: e.target.value })} />
                      <div className="meta">
                        <select className="select meta-select" aria-label={`${h.name} form`} value={h.form} onChange={(e) => patch(h.id, { form: e.target.value as HopForm })}>
                          {HOP_FORMS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td style={{ width: 76, minWidth: 76 }}>
                      <CellLabel>Alpha acid</CellLabel>
                      <NumberInput ariaLabel={`${h.name} alpha acid`} unit="%" decimals={1} max={30} value={h.alphaPct} onChange={(v) => patch(h.id, { alphaPct: v })} />
                    </td>
                    <td style={{ width: 92, minWidth: 92 }}>
                      <CellLabel>Amount</CellLabel>
                      <NumberInput ariaLabel={`${h.name} amount`} kind="massSmall" system={system} value={h.amountG} onChange={(v) => patch(h.id, { amountG: v })} max={100000} />
                    </td>
                    <td style={{ width: 108, minWidth: 108 }}>
                      <CellLabel>Use</CellLabel>
                      <Select
                        ariaLabel={`${h.name} use`}
                        value={h.use}
                        options={HOP_USES}
                        onChange={(u) => patch(h.id, { use: u, time: u === 'dry-hop' ? 4 : u === 'whirlpool' ? 20 : u === 'boil' ? Math.min(h.time, recipe.boilMinutes) : h.time, whirlpoolTempC: u === 'whirlpool' ? (h.whirlpoolTempC ?? 80) : h.whirlpoolTempC })}
                      />
                    </td>
                    <td style={{ width: h.use === 'whirlpool' ? 156 : 84, minWidth: h.use === 'whirlpool' ? 156 : 84 }}>
                      <CellLabel>{h.use === 'dry-hop' ? 'Days' : h.use === 'boil' || h.use === 'whirlpool' ? 'Minutes' : 'Time'}</CellLabel>
                      {h.use === 'boil' || h.use === 'whirlpool' || h.use === 'dry-hop' ? (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <NumberInput ariaLabel={`${h.name} time`} unit={h.use === 'dry-hop' ? 'd' : 'min'} decimals={0} max={h.use === 'boil' ? 300 : 90} value={h.time} onChange={(v) => patch(h.id, { time: v })} />
                          {h.use === 'whirlpool' && <NumberInput ariaLabel={`${h.name} whirlpool temperature`} kind="temperature" system={system} decimals={0} max={212} value={h.whirlpoolTempC ?? 80} onChange={(v) => patch(h.id, { whirlpoolTempC: Math.min(100, v) })} />}
                        </div>
                      ) : (
                        <span className="small faint">{h.use === 'first-wort' ? `Full boil +10%` : 'Mash, ≈20% of boil'}</span>
                      )}
                    </td>
                    <td className="r readout" style={{ width: 60, minWidth: 60 }} title={`Utilization ${fmt((st?.utilization ?? 0) * 100, 1)}%`}>
                      <CellLabel>IBU</CellLabel>
                      {fmt(st?.ibu ?? 0, 1)}
                    </td>
                    <td className="actions-cell" style={{ width: 112, minWidth: 112 }}>
                      <RowActions name={h.name} index={i} length={list.length} onMove={(a, b) => setList(moveItem(list, a, b))} onDuplicate={() => setList([...list.slice(0, i + 1), { ...h, id: uid('h_') }, ...list.slice(i + 1)])} onRemove={() => setList(list.filter((x) => x.id !== h.id))} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

function YeastSection({ recipe, system, setList, patch }: { recipe: Recipe; system: UnitSystem; setList: (l: Yeast[]) => void; patch: (id: string, p: Partial<Yeast>) => void }) {
  const list = recipe.yeasts;
  return (
    <Section title="Yeast" id="yeast" count={list.length} actions={<Picker label="Add yeast" placeholder="Add yeast strain…" options={yeastOptions} onPick={(c) => setList([...list, yeastFromCatalog(c)])} onCustom={(n) => setList([...list, customYeast(n)])} />}>
      {list.length === 0 ? (
        <div className="empty">
          <strong>No yeast yet.</strong>
          FG uses the yeast’s attenuation. Until you add one, it assumes 75%.
        </div>
      ) : (
        <div className="table-scroll">
          <table className="itable stack">
            <thead>
              <tr>
                <th>Strain</th>
                <th>Form</th>
                <th className="r">Attenuation</th>
                <th className="r">Temp. range</th>
                <th className="r">Packs</th>
                <th>Starter</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((y, i) => (
                <tr key={y.id}>
                  <td className="name-cell">
                    <CellLabel>Strain</CellLabel>
                    <input className="input name-input" aria-label="Yeast name" value={y.name} onChange={(e) => patch(y.id, { name: e.target.value })} />
                    <div className="meta" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input className="input meta-select" aria-label="Yeast lab and product" value={[y.lab, y.product].filter(Boolean).join(' ')} onChange={(e) => patch(y.id, { lab: e.target.value, product: undefined })} />
                    </div>
                  </td>
                  <td style={{ width: 96, minWidth: 96 }}>
                    <CellLabel>Form</CellLabel>
                    <Select ariaLabel={`${y.name} form`} value={y.form} options={[{ value: 'dry', label: 'Dry' }, { value: 'liquid', label: 'Liquid' }]} onChange={(v) => patch(y.id, { form: v })} />
                  </td>
                  <td style={{ width: 92, minWidth: 92 }}>
                    <CellLabel>Attenuation</CellLabel>
                    <NumberInput ariaLabel={`${y.name} attenuation`} unit="%" decimals={0} max={100} value={y.attenuationPct} onChange={(v) => patch(y.id, { attenuationPct: v })} />
                  </td>
                  <td style={{ width: 150, minWidth: 150 }}>
                    <CellLabel>Temperature range</CellLabel>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <NumberInput ariaLabel={`${y.name} minimum temperature`} kind="temperature" system={system} decimals={0} min={-10} max={120} value={y.tempMinC} onChange={(v) => patch(y.id, { tempMinC: v })} />
                      <NumberInput ariaLabel={`${y.name} maximum temperature`} kind="temperature" system={system} decimals={0} min={-10} max={120} value={y.tempMaxC} onChange={(v) => patch(y.id, { tempMaxC: v })} />
                    </div>
                  </td>
                  <td style={{ width: 70, minWidth: 70 }}>
                    <CellLabel>Packs</CellLabel>
                    <NumberInput ariaLabel={`${y.name} packs`} decimals={1} max={50} value={y.packs} onChange={(v) => patch(y.id, { packs: v })} />
                  </td>
                  <td style={{ width: 80, minWidth: 80 }}>
                    <CellLabel>Starter</CellLabel>
                    <label className="check">
                      <input type="checkbox" checked={y.starter} onChange={(e) => patch(y.id, { starter: e.target.checked })} />
                      <span className="small">Yes</span>
                    </label>
                  </td>
                  <td className="actions-cell" style={{ width: 112, minWidth: 112 }}>
                    <RowActions name={y.name} index={i} length={list.length} onMove={(a, b) => setList(moveItem(list, a, b))} onDuplicate={() => setList([...list.slice(0, i + 1), { ...y, id: uid('y_') }, ...list.slice(i + 1)])} onRemove={() => setList(list.filter((x) => x.id !== y.id))} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length > 1 && (
            <div style={{ padding: '0 16px 12px' }}>
              <Notice tone="info">With several strains, FG uses the highest attenuation.</Notice>
            </div>
          )}
        </div>
      )}
    </Section>
  );
}

function MiscSection({ recipe, setList, patch }: { recipe: Recipe; setList: (l: Misc[]) => void; patch: (id: string, p: Partial<Misc>) => void }) {
  const list = recipe.miscs;
  return (
    <Section title="Other ingredients" id="misc" count={list.length} actions={<Picker label="Add other ingredient" placeholder="Add spice, fruit, salt, fining…" options={miscOptions} onPick={(c) => setList([...list, miscFromCatalog(c)])} onCustom={(n) => setList([...list, customMisc(n)])} />}>
      {list.length === 0 ? (
        <div className="empty">
          <strong>Nothing else yet.</strong>
          Finings, water salts, spices, fruit, coffee and other additions go here.
        </div>
      ) : (
        <div className="table-scroll">
          <table className="itable stack">
            <thead>
              <tr>
                <th>Ingredient</th>
                <th>Type</th>
                <th>Added</th>
                <th className="r">Time</th>
                <th className="r">Amount</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((m, i) => (
                <tr key={m.id}>
                  <td className="name-cell">
                    <CellLabel>Ingredient</CellLabel>
                    <input className="input name-input" aria-label="Ingredient name" value={m.name} onChange={(e) => patch(m.id, { name: e.target.value })} />
                  </td>
                  <td style={{ width: 112, minWidth: 112 }}>
                    <CellLabel>Type</CellLabel>
                    <Select<MiscType> ariaLabel={`${m.name} type`} value={m.type} options={(Object.keys(MISC_TYPE_LABEL) as MiscType[]).map((t) => ({ value: t, label: MISC_TYPE_LABEL[t] }))} onChange={(v) => patch(m.id, { type: v })} />
                  </td>
                  <td style={{ width: 118, minWidth: 118 }}>
                    <CellLabel>Added</CellLabel>
                    <Select<MiscUse> ariaLabel={`${m.name} addition`} value={m.use} options={(Object.keys(MISC_USE_LABEL) as MiscUse[]).map((t) => ({ value: t, label: MISC_USE_LABEL[t] }))} onChange={(v) => patch(m.id, { use: v })} />
                  </td>
                  <td style={{ width: 92, minWidth: 92 }}>
                    <CellLabel>Time</CellLabel>
                    {MISC_TIME_UNIT[m.use] ? <NumberInput ariaLabel={`${m.name} time`} unit={MISC_TIME_UNIT[m.use]} decimals={0} max={500} value={m.time} onChange={(v) => patch(m.id, { time: v })} /> : <span className="small faint">At packaging</span>}
                  </td>
                  <td style={{ width: 170, minWidth: 170 }}>
                    <CellLabel>Amount</CellLabel>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <NumberInput ariaLabel={`${m.name} amount`} decimals={2} max={100000} value={m.amount} onChange={(v) => patch(m.id, { amount: v })} />
                      <Select<MiscUnit> ariaLabel={`${m.name} unit`} value={m.unit} options={MISC_UNITS.map((u) => ({ value: u, label: u }))} onChange={(v) => patch(m.id, { unit: v })} />
                    </div>
                  </td>
                  <td className="actions-cell" style={{ width: 112, minWidth: 112 }}>
                    <RowActions name={m.name} index={i} length={list.length} onMove={(a, b) => setList(moveItem(list, a, b))} onDuplicate={() => setList([...list.slice(0, i + 1), { ...m, id: uid('x_') }, ...list.slice(i + 1)])} onRemove={() => setList(list.filter((x) => x.id !== m.id))} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

function StepsSection<T extends { id: string; name: string; tempC: number }>({ title, items, system, timeUnit, timeKey, onChange, newItem, hint }: { title: string; items: T[]; system: UnitSystem; timeUnit: string; timeKey: keyof T & string; onChange: (l: T[]) => void; newItem: () => T; hint?: string }) {
  const patch = (id: string, p: Partial<T>) => onChange(items.map((x) => (x.id === id ? { ...x, ...p } : x)));
  return (
    <Section
      title={title}
      count={items.length}
      actions={
        <button type="button" className="btn btn-sm" onClick={() => onChange([...items, newItem()])}>
          <Plus size={14} aria-hidden="true" /> Add step
        </button>
      }
    >
      {items.length === 0 ? (
        <div className="empty">No steps yet.</div>
      ) : (
        <div className="table-scroll">
          <table className="itable stack">
            <thead>
              <tr>
                <th>Step</th>
                <th className="r">Temperature</th>
                <th className="r">Duration</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((st, i) => (
                <tr key={st.id}>
                  <td className="name-cell">
                    <CellLabel>Step</CellLabel>
                    <input className="input name-input" aria-label="Step name" value={st.name} onChange={(e) => patch(st.id, { name: e.target.value } as Partial<T>)} />
                  </td>
                  <td style={{ width: 112, minWidth: 112 }}>
                    <CellLabel>Temperature</CellLabel>
                    <NumberInput ariaLabel={`${st.name} temperature`} kind="temperature" system={system} min={-10} max={220} value={st.tempC} onChange={(v) => patch(st.id, { tempC: v } as Partial<T>)} />
                  </td>
                  <td style={{ width: 110, minWidth: 110 }}>
                    <CellLabel>Duration</CellLabel>
                    <NumberInput ariaLabel={`${st.name} duration`} unit={timeUnit} decimals={0} max={1000} value={st[timeKey] as number} onChange={(v) => patch(st.id, { [timeKey]: v } as Partial<T>)} />
                  </td>
                  <td className="actions-cell" style={{ width: 96, minWidth: 96 }}>
                    <RowActions name={st.name} index={i} length={items.length} onMove={(a, b) => onChange(moveItem(items, a, b))} onRemove={() => onChange(items.filter((x) => x.id !== st.id))} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {hint && <p className="xs faint" style={{ padding: '0 16px 12px' }}>{hint}</p>}
    </Section>
  );
}

function EquipmentSection({ recipe, system, update }: { recipe: Recipe; system: UnitSystem; update: (p: Partial<Recipe>) => void }) {
  const eq = recipe.equipment;
  const set = (p: Partial<Recipe['equipment']>) => update({ equipment: { ...eq, ...p } });
  return (
    <Section title="Equipment and losses" id="equipment">
      <div className="section-body grid grid-4">
        <NumberField label="Boil-off rate" kind="rate" system={system} value={eq.boilOffLPerHr} onChange={(v) => set({ boilOffLPerHr: v })} max={100} />
        <NumberField label="Kettle loss" kind="volume" system={system} value={eq.kettleLossL} onChange={(v) => set({ kettleLossL: v })} max={100} hint="Trub, chiller, dead space" />
        <NumberField label="Cooling shrinkage" unit="%" decimals={1} max={10} value={eq.coolingShrinkagePct} onChange={(v) => set({ coolingShrinkagePct: v })} />
        <NumberField label="Fermenter loss" kind="volume" system={system} value={eq.fermenterLossL} onChange={(v) => set({ fermenterLossL: v })} max={100} hint="Yeast cake, samples" />
        <NumberField label="Grain absorption" kind="absorption" system={system} value={eq.grainAbsorptionLPerKg} onChange={(v) => set({ grainAbsorptionLPerKg: v })} max={5} />
        <NumberField label="Hop absorption" unit="mL/g" decimals={1} value={eq.hopAbsorptionMlPerG} onChange={(v) => set({ hopAbsorptionMlPerG: v })} max={50} hint="Kettle hops only" />
        {recipe.method !== 'biab' && recipe.method !== 'extract' && (
          <>
            <NumberField label="Mash thickness" kind="thickness" system={system} value={eq.mashThicknessLPerKg} onChange={(v) => set({ mashThicknessLPerKg: v })} max={10} />
            <NumberField label="Mash tun dead space" kind="volume" system={system} value={eq.mashTunDeadspaceL} onChange={(v) => set({ mashTunDeadspaceL: v })} max={50} />
          </>
        )}
        <NumberField label="Grain temperature" kind="temperature" system={system} min={-20} max={140} value={eq.grainTempC} onChange={(v) => set({ grainTempC: v })} />
        <NumberField label="Kettle volume" kind="volume" system={system} value={eq.kettleVolumeL} onChange={(v) => set({ kettleVolumeL: v })} max={2000} hint="For capacity warnings" />
        {recipe.method !== 'biab' && recipe.method !== 'extract' && <NumberField label="Mash tun volume" kind="volume" system={system} value={eq.mashTunVolumeL} onChange={(v) => set({ mashTunVolumeL: v })} max={2000} />}
      </div>
    </Section>
  );
}
