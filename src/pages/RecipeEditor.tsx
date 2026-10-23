import { useMemo } from 'react';
import { useI18n, type Dict } from '../i18n';
import { Check, Eye, FileDown, Loader2, Plus, TriangleAlert } from 'lucide-react';
import type { Fermentable, Hop, HopForm, MashStep, FermentationStep, Misc, MiscType, MiscUnit, MiscUse, Recipe, Yeast, BrewMethod, BatchTarget } from '../domain/types';
import { calculateRecipe } from '../domain/recipe';
import { srmToHex } from '../domain/color';
import { findStyle, STYLES } from '../data/styles';
import { FERMENTABLES, type FermentableCatalogItem } from '../data/fermentables';
import { HOPS, type HopCatalogItem } from '../data/hops';
import { YEASTS, type YeastCatalogItem } from '../data/yeasts';
import { MISCS, MISC_UNITS, type MiscCatalogItem } from '../data/miscs';
import { useStore } from '../store/AppStore';
import { customFermentable, customHop, customMisc, customYeast, equipmentFromProfile, fermentableFromCatalog, hopFromCatalog, miscFromCatalog, uid, yeastFromCatalog } from '../store/factory';
import { linkProps } from '../router';
import { NumberField, NumberInput, Select, SelectField, TextField } from '../ui/fields';
import { Picker, type PickerOption } from '../ui/Picker';
import { CellLabel, moveItem, Notice, RowActions, Section } from '../ui/common';
import { MobileStats, StatsPanel } from '../ui/StatsPanel';
import { fmt, massL, massS, miscTimeUnit, ppgFormat } from '../ui/format';
import { downloadPdf } from '../ui/pdfAction';
import { SignInButton } from '../ui/SignInButton';
import type { UnitSystem } from '../domain/units';

const fermentableOptions = (t: Dict): PickerOption<FermentableCatalogItem>[] =>
  FERMENTABLES.map((f) => ({
    key: f.id,
    label: f.name,
    meta: `${(1 + f.ppg / 1000).toFixed(3)} · ${f.lovibond}°L`,
    group: t.fermCategory[f.category],
    item: f,
  }));
const hopOptions: PickerOption<HopCatalogItem>[] = HOPS.map((h) => ({ key: h.id, label: h.name, meta: `${h.alpha}% AA · ${h.origin}`, keywords: h.notes, item: h }));
const yeastOptions = (t: Dict): PickerOption<YeastCatalogItem>[] => YEASTS.map((y) => ({ key: y.id, label: `${y.lab} ${y.product} ${y.name}`, meta: `${y.attenuation}% · ${t.yeastForm[y.form]}`, group: y.lab, keywords: y.notes, item: y }));
const miscOptions = (t: Dict): PickerOption<MiscCatalogItem>[] => MISCS.map((m) => ({ key: m.id, label: m.name, meta: t.miscType[m.type], group: t.miscType[m.type], item: m }));

/** Turn a label map into select options, keeping the map's key order. */
const optionsOf = <K extends string>(labels: Record<K, string>) => (Object.keys(labels) as K[]).map((value) => ({ value, label: labels[value] }));

export function RecipeEditor({ id }: { id: string }) {
  const { data, upsertRecipe, saveState, persistent, mode, signIn } = useStore();
  const recipe = data.recipes.find((r) => r.id === id);
  const settings = data.settings;
  const s = settings.unitSystem;
  const stats = useMemo(() => (recipe ? calculateRecipe(recipe, settings) : null), [recipe, settings]);
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
            {t.editor.recipeName}
          </label>
          <input id="recipe-name" className="title-input" value={recipe.name} onChange={(e) => update({ name: e.target.value })} placeholder={t.editor.recipeName} />
          <div className="actions" style={{ marginTop: 4 }}>
            <span className="tag">{t.method[recipe.method]}</span>
            {style && <span className="tag accent">{style.code} {style.name}</span>}
            <SaveState state={saveState} persistent={persistent} cloud={mode === 'cloud'} draft={!!signIn} />
            {signIn && <SignInButton label={t.editor.signInToSave} className="btn btn-sm" />}
          </div>
        </div>
        <div className="actions">
          <a className="btn" {...linkProps({ name: 'recipe', id: recipe.id })}>
            <Eye size={15} aria-hidden="true" /> {t.editor.viewSheet}
          </a>
          <button type="button" className="btn btn-primary" onClick={() => void downloadPdf(recipe, stats, settings, lang)}>
            <FileDown size={15} aria-hidden="true" /> {t.common.downloadPdf}
          </button>
        </div>
      </div>

      <MobileStats stats={stats} />

      <div className="editor" style={{ marginTop: 12 }}>
        <div className="editor-main">
          <Section title={t.editor.batch} id="batch">
            <div className="section-body grid grid-4">
              <SelectField<string>
                label={t.editor.equipmentProfile}
                className="span-2"
                value={recipe.equipmentProfileId ?? ''}
                onChange={applyProfile}
                options={[...(recipe.equipmentProfileId && !data.equipment.some((e) => e.id === recipe.equipmentProfileId) ? [{ value: recipe.equipmentProfileId, label: t.editor.deletedProfile(recipe.equipment.name) }] : []), ...(recipe.equipmentProfileId ? [] : [{ value: '', label: t.editor.customEquipment }]), ...data.equipment.map((e) => ({ value: e.id, label: e.name }))]}
                hint={t.editor.profileHint}
              />
              <SelectField<BrewMethod>
                label={t.editor.method}
                value={recipe.method}
                onChange={(m) => update({ method: m })}
                options={optionsOf<BrewMethod>(t.method)}
              />
              <SelectField<string> label={t.editor.style} value={recipe.styleId ?? ''} onChange={(v) => update({ styleId: v || null })} options={[{ value: '', label: t.editor.noStyle }, ...STYLES.map((st) => ({ value: st.id, label: `${st.code} ${st.name}` }))]} />
              <SelectField<BatchTarget>
                label={t.editor.batchMeasured}
                value={recipe.batchTarget}
                onChange={(v) => update({ batchTarget: v })}
                options={optionsOf<BatchTarget>(t.batchTarget)}
              />
              <NumberField label={t.editor.batchSize} kind="volume" system={s} value={recipe.batchVolumeL} onChange={(v) => update({ batchVolumeL: v })} max={s === 'us' ? 1000 : 4000} />
              <NumberField label={t.editor.boilTime} unit={t.common.min} decimals={0} value={recipe.boilMinutes} onChange={(v) => update({ boilMinutes: Math.round(v) })} max={300} />
              <NumberField
                label={recipe.batchTarget === 'fermenter' ? t.editor.brewhouseEff : t.editor.kettleEff}
                unit="%"
                decimals={1}
                value={recipe.efficiencyPct}
                onChange={(v) => update({ efficiencyPct: v })}
                max={100}
                hint={isExtract ? t.editor.effExtract : recipe.batchTarget === 'fermenter' ? t.editor.effFermenter : t.editor.effKettle}
              />
            </div>
          </Section>

          <FermentablesSection recipe={recipe} stats={stats} system={s} setList={(l) => setList('fermentables', l)} patch={(i, p) => patchItem('fermentables', i, p)} />
          <HopsSection recipe={recipe} stats={stats} system={s} setList={(l) => setList('hops', l)} patch={(i, p) => patchItem('hops', i, p)} />
          <YeastSection recipe={recipe} system={s} setList={(l) => setList('yeasts', l)} patch={(i, p) => patchItem('yeasts', i, p)} />
          <MiscSection recipe={recipe} setList={(l) => setList('miscs', l)} patch={(i, p) => patchItem('miscs', i, p)} />
          <StepsSection<MashStep>
            title={isExtract ? t.editor.steeping : t.editor.mashSchedule}
            items={recipe.mashSteps}
            system={s}
            timeUnit={t.common.min}
            timeKey="minutes"
            onChange={(l) => setList('mashSteps', l)}
            newItem={() => ({ id: uid('m_'), name: recipe.mashSteps.length === 0 ? (isExtract ? t.defaults.steep : t.defaults.saccharification) : t.defaults.mashOut, tempC: recipe.mashSteps.length === 0 ? 66 : 76, minutes: recipe.mashSteps.length === 0 ? 60 : 10 })}
            hint={isExtract ? undefined : t.editor.firstStepHint}
          />
          <StepsSection<FermentationStep>
            title={t.editor.fermSchedule}
            items={recipe.fermentationSteps}
            system={s}
            timeUnit={t.common.days}
            timeKey="days"
            onChange={(l) => setList('fermentationSteps', l)}
            newItem={() => ({ id: uid('fs_'), name: recipe.fermentationSteps.length === 0 ? t.defaults.primary : t.defaults.conditioning, tempC: recipe.fermentationSteps.length === 0 ? 19 : 4, days: recipe.fermentationSteps.length === 0 ? 14 : 7 })}
          />
          <EquipmentSection recipe={recipe} system={s} update={update} />

          <Section title={t.editor.notes} id="notes">
            <div className="section-body grid grid-2">
              <TextField label={t.editor.brewer} value={recipe.author} onChange={(v) => update({ author: v })} placeholder={settings.brewerName || t.editor.yourName} />
              <TextField label={t.editor.description} value={recipe.description} onChange={(v) => update({ description: v })} placeholder={t.editor.descriptionPh} />
              <TextField className="span-2" label={t.editor.brewingNotes} multiline value={recipe.notes} onChange={(v) => update({ notes: v })} placeholder={t.editor.brewingNotesPh} />
            </div>
          </Section>
        </div>

        <aside className="editor-side" aria-label={t.editor.statsAside}>
          <StatsPanel stats={stats} recipe={recipe} style={style} settings={settings} />
        </aside>
      </div>
    </div>
  );
}

function SaveState({ state, persistent, cloud, draft }: { state: 'saved' | 'saving' | 'error'; persistent: boolean; cloud: boolean; draft: boolean }) {
  const { t } = useI18n();
  if (!persistent)
    return (
      <span className="save-state error">
        <TriangleAlert size={13} aria-hidden="true" /> {t.editor.notSavedBlocked}
      </span>
    );
  if (state === 'error')
    return (
      <span className="save-state error" role="alert">
        <TriangleAlert size={13} aria-hidden="true" /> {cloud ? t.editor.retrying : t.editor.storageFull}
      </span>
    );
  return (
    <span className="save-state" aria-live="polite">
      {state === 'saving' ? <Loader2 size={13} aria-hidden="true" /> : <Check size={13} aria-hidden="true" />}
      {state === 'saving' ? t.editor.saving : cloud ? t.app.savedAccount : draft ? t.editor.draft : t.app.savedBrowser}
    </span>
  );
}

type StatsT = ReturnType<typeof calculateRecipe>;

function FermentablesSection({ recipe, stats, system, setList, patch }: { recipe: Recipe; stats: StatsT; system: UnitSystem; setList: (l: Fermentable[]) => void; patch: (id: string, p: Partial<Fermentable>) => void }) {
  const { t } = useI18n();
  const options = useMemo(() => fermentableOptions(t), [t]);
  const list = recipe.fermentables;
  const hasBase = list.some((f) => f.category === 'base' || f.category === 'extract');
  const defaultKg = (c: FermentableCatalogItem) =>
    c.category === 'base' ? (hasBase ? 0.5 : 4) : c.category === 'extract' ? (hasBase ? 0.5 : 2.5) : c.category === 'sugar' ? 0.25 : c.category === 'roasted' ? 0.15 : 0.3;
  return (
    <Section
      title={t.editor.fermentables}
      id="fermentables"
      count={list.length}
      actions={<Picker label={t.editor.addFermentable} placeholder={t.editor.addFermentablePh} options={options} onPick={(c) => setList([...list, fermentableFromCatalog(c, defaultKg(c))])} onCustom={(n) => setList([...list, customFermentable(n)])} />}
      footer={
        list.length > 0 && (
          <>
            <span>
              {t.common.total} <strong>{massL(stats.totalFermentableKg, system)}</strong>
            </span>
            <span>
              {t.editor.grain} <strong>{massL(stats.totalGrainKg, system)}</strong>
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
          <strong>{t.editor.noFermTitle}</strong>
          {t.editor.noFermBody}
        </div>
      ) : (
        <div className="table-scroll">
          <table className="itable stack">
            <thead>
              <tr>
                <th>{t.editor.fermentable}</th>
                <th className="r">{t.editor.amount}</th>
                <th className="r">{t.editor.potential}</th>
                <th className="r">{t.editor.color}</th>
                <th>{t.editor.added}</th>
                <th>
                  <span className="sr-only">{t.common.actions}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((f, i) => {
                const st = stats.fermentables.find((x) => x.id === f.id);
                return (
                  <tr key={f.id}>
                    <td className="name-cell">
                      <CellLabel>{t.editor.fermentable}</CellLabel>
                      <input className="input name-input" aria-label={t.editor.fermentableName} value={f.name} onChange={(e) => patch(f.id, { name: e.target.value })} />
                      <div className="meta">
                        <span className="swatch-dot" style={{ background: srmToHex(f.colorLovibond) }} />
                        {t.fermCategory[f.category]}
                        {!f.fermentable && ` · ${t.editor.unfermentable}`}
                        <span className="mono" title={`${fmt(st?.mcu ?? 0, 1)} MCU`}>
                          {' · '}
                          {fmt(st?.weightPct ?? 0, 1)}% · {fmt(st?.ogPoints ?? 0, 1)} {t.stats.pts}
                        </span>
                      </div>
                      <div className="bar" aria-hidden="true">
                        <span style={{ width: `${Math.min(100, st?.weightPct ?? 0)}%` }} />
                      </div>
                    </td>
                    <td style={{ width: 112, minWidth: 112 }}>
                      <CellLabel>{t.editor.amount}</CellLabel>
                      <NumberInput ariaLabel={t.editor.ariaAmount(f.name)} kind="massLarge" system={system} value={f.amountKg} onChange={(v) => patch(f.id, { amountKg: v })} max={1000} />
                    </td>
                    <td style={{ width: 96, minWidth: 96 }}>
                      <CellLabel>{t.editor.potentialSg}</CellLabel>
                      <NumberInput ariaLabel={t.editor.ariaPotential(f.name)} format={ppgFormat} decimals={3} min={1} max={1.05} step={0.001} value={f.potentialPpg} onChange={(v) => patch(f.id, { potentialPpg: v })} />
                    </td>
                    <td style={{ width: 92, minWidth: 92 }}>
                      <CellLabel>{t.editor.color}</CellLabel>
                      <NumberInput ariaLabel={t.editor.ariaColor(f.name)} unit="°L" decimals={1} max={1000} value={f.colorLovibond} onChange={(v) => patch(f.id, { colorLovibond: v })} />
                    </td>
                    <td style={{ width: 112, minWidth: 112 }}>
                      <CellLabel>{t.editor.added}</CellLabel>
                      <Select ariaLabel={t.editor.ariaStage(f.name)} value={f.stage} options={optionsOf(recipe.method === 'extract' ? { ...t.stage, mash: t.steep } : t.stage)} onChange={(v) => patch(f.id, { stage: v })} />
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
  const { t } = useI18n();
  const list = recipe.hops;
  const lastTime = list.length ? list[list.length - 1].time : recipe.boilMinutes;
  return (
    <Section
      title={t.editor.hops}
      id="hops"
      count={list.length}
      actions={<Picker label={t.editor.addHop} placeholder={t.editor.addHopPh} options={hopOptions} onPick={(c) => setList([...list, hopFromCatalog(c, list.length === 0 ? 20 : 30, list.length === 0 ? recipe.boilMinutes : Math.max(0, Math.min(lastTime, 15)))])} onCustom={(n) => setList([...list, customHop(n)])} />}
      footer={
        list.length > 0 && (
          <>
            <span>
              {t.common.total} <strong>{massS(stats.totalHopsG, system)}</strong>
            </span>
            <span>
              IBU <strong>{fmt(stats.ibu, 1)}</strong>
            </span>
            <span>
              {t.editor.boilGravity} <strong>{stats.boilGravity.toFixed(3)}</strong>
            </span>
          </>
        )
      }
    >
      {list.length === 0 ? (
        <div className="empty">
          <strong>{t.editor.noHopsTitle}</strong>
          {t.editor.noHopsBody}
        </div>
      ) : (
        <div className="table-scroll">
          <table className="itable stack">
            <thead>
              <tr>
                <th>{t.editor.hop}</th>
                <th className="r">{t.editor.alpha}</th>
                <th className="r">{t.editor.amount}</th>
                <th>{t.editor.use}</th>
                <th>{t.editor.time}</th>
                <th className="r">IBU</th>
                <th>
                  <span className="sr-only">{t.common.actions}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((h, i) => {
                const st = stats.hops.find((x) => x.id === h.id);
                return (
                  <tr key={h.id}>
                    <td className="name-cell">
                      <CellLabel>{t.editor.hop}</CellLabel>
                      <input className="input name-input" aria-label={t.editor.hopName} value={h.name} onChange={(e) => patch(h.id, { name: e.target.value })} />
                      <div className="meta">
                        <select className="select meta-select" aria-label={t.editor.ariaForm(h.name)} value={h.form} onChange={(e) => patch(h.id, { form: e.target.value as HopForm })}>
                          {optionsOf<HopForm>(t.hopForm).map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td style={{ width: 76, minWidth: 76 }}>
                      <CellLabel>{t.editor.alphaAcid}</CellLabel>
                      <NumberInput ariaLabel={t.editor.ariaAlpha(h.name)} unit="%" decimals={1} max={30} value={h.alphaPct} onChange={(v) => patch(h.id, { alphaPct: v })} />
                    </td>
                    <td style={{ width: 92, minWidth: 92 }}>
                      <CellLabel>{t.editor.amount}</CellLabel>
                      <NumberInput ariaLabel={t.editor.ariaAmount(h.name)} kind="massSmall" system={system} value={h.amountG} onChange={(v) => patch(h.id, { amountG: v })} max={100000} />
                    </td>
                    <td style={{ width: 108, minWidth: 108 }}>
                      <CellLabel>{t.editor.use}</CellLabel>
                      <Select
                        ariaLabel={t.editor.ariaUse(h.name)}
                        value={h.use}
                        options={optionsOf(t.hopUse)}
                        onChange={(u) => patch(h.id, { use: u, time: u === 'dry-hop' ? 4 : u === 'whirlpool' ? 20 : u === 'boil' ? Math.min(h.time, recipe.boilMinutes) : h.time, whirlpoolTempC: u === 'whirlpool' ? (h.whirlpoolTempC ?? 80) : h.whirlpoolTempC })}
                      />
                    </td>
                    <td style={{ width: h.use === 'whirlpool' ? 156 : 84, minWidth: h.use === 'whirlpool' ? 156 : 84 }}>
                      <CellLabel>{h.use === 'dry-hop' ? t.editor.daysLabel : h.use === 'boil' || h.use === 'whirlpool' ? t.editor.minutes : t.editor.time}</CellLabel>
                      {h.use === 'boil' || h.use === 'whirlpool' || h.use === 'dry-hop' ? (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <NumberInput ariaLabel={t.editor.ariaTime(h.name)} unit={h.use === 'dry-hop' ? t.common.daysShort : t.common.min} decimals={0} max={h.use === 'boil' ? 300 : 90} value={h.time} onChange={(v) => patch(h.id, { time: v })} />
                          {h.use === 'whirlpool' && <NumberInput ariaLabel={t.editor.ariaWhirlpoolTemp(h.name)} kind="temperature" system={system} decimals={0} max={212} value={h.whirlpoolTempC ?? 80} onChange={(v) => patch(h.id, { whirlpoolTempC: Math.min(100, v) })} />}
                        </div>
                      ) : (
                        <span className="small faint">{h.use === 'first-wort' ? t.time.hopFirstWort : t.time.hopMash}</span>
                      )}
                    </td>
                    <td className="r readout" style={{ width: 60, minWidth: 60 }} title={t.editor.utilization(fmt((st?.utilization ?? 0) * 100, 1))}>
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
  const { t } = useI18n();
  const options = useMemo(() => yeastOptions(t), [t]);
  const list = recipe.yeasts;
  return (
    <Section title={t.editor.yeast} id="yeast" count={list.length} actions={<Picker label={t.editor.addYeast} placeholder={t.editor.addYeastPh} options={options} onPick={(c) => setList([...list, yeastFromCatalog(c)])} onCustom={(n) => setList([...list, customYeast(n)])} />}>
      {list.length === 0 ? (
        <div className="empty">
          <strong>{t.editor.noYeastTitle}</strong>
          {t.editor.noYeastBody}
        </div>
      ) : (
        <div className="table-scroll">
          <table className="itable stack">
            <thead>
              <tr>
                <th>{t.editor.strain}</th>
                <th>{t.editor.form}</th>
                <th className="r">{t.editor.attenuation}</th>
                <th className="r">{t.editor.tempRange}</th>
                <th className="r">{t.editor.packs}</th>
                <th>{t.editor.starter}</th>
                <th>
                  <span className="sr-only">{t.common.actions}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((y, i) => (
                <tr key={y.id}>
                  <td className="name-cell">
                    <CellLabel>{t.editor.strain}</CellLabel>
                    <input className="input name-input" aria-label={t.editor.yeastName} value={y.name} onChange={(e) => patch(y.id, { name: e.target.value })} />
                    <div className="meta" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input className="input meta-select" aria-label={t.editor.yeastLab} value={[y.lab, y.product].filter(Boolean).join(' ')} onChange={(e) => patch(y.id, { lab: e.target.value, product: undefined })} />
                    </div>
                  </td>
                  <td style={{ width: 96, minWidth: 96 }}>
                    <CellLabel>{t.editor.form}</CellLabel>
                    <Select ariaLabel={t.editor.ariaForm(y.name)} value={y.form} options={optionsOf(t.yeastForm)} onChange={(v) => patch(y.id, { form: v })} />
                  </td>
                  <td style={{ width: 92, minWidth: 92 }}>
                    <CellLabel>{t.editor.attenuation}</CellLabel>
                    <NumberInput ariaLabel={t.editor.ariaAttenuation(y.name)} unit="%" decimals={0} max={100} value={y.attenuationPct} onChange={(v) => patch(y.id, { attenuationPct: v })} />
                  </td>
                  <td style={{ width: 150, minWidth: 150 }}>
                    <CellLabel>{t.editor.tempRangeLong}</CellLabel>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <NumberInput ariaLabel={t.editor.ariaMinTemp(y.name)} kind="temperature" system={system} decimals={0} min={-10} max={120} value={y.tempMinC} onChange={(v) => patch(y.id, { tempMinC: v })} />
                      <NumberInput ariaLabel={t.editor.ariaMaxTemp(y.name)} kind="temperature" system={system} decimals={0} min={-10} max={120} value={y.tempMaxC} onChange={(v) => patch(y.id, { tempMaxC: v })} />
                    </div>
                  </td>
                  <td style={{ width: 70, minWidth: 70 }}>
                    <CellLabel>{t.editor.packs}</CellLabel>
                    <NumberInput ariaLabel={t.editor.ariaPacks(y.name)} decimals={1} max={50} value={y.packs} onChange={(v) => patch(y.id, { packs: v })} />
                  </td>
                  <td style={{ width: 80, minWidth: 80 }}>
                    <CellLabel>{t.editor.starter}</CellLabel>
                    <label className="check">
                      <input type="checkbox" checked={y.starter} onChange={(e) => patch(y.id, { starter: e.target.checked })} />
                      <span className="small">{t.common.yes}</span>
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
              <Notice tone="info">{t.editor.multiYeast}</Notice>
            </div>
          )}
        </div>
      )}
    </Section>
  );
}

function MiscSection({ recipe, setList, patch }: { recipe: Recipe; setList: (l: Misc[]) => void; patch: (id: string, p: Partial<Misc>) => void }) {
  const { t } = useI18n();
  const options = useMemo(() => miscOptions(t), [t]);
  const list = recipe.miscs;
  return (
    <Section title={t.editor.misc} id="misc" count={list.length} actions={<Picker label={t.editor.addMisc} placeholder={t.editor.addMiscPh} options={options} onPick={(c) => setList([...list, miscFromCatalog(c)])} onCustom={(n) => setList([...list, customMisc(n)])} />}>
      {list.length === 0 ? (
        <div className="empty">
          <strong>{t.editor.noMiscTitle}</strong>
          {t.editor.noMiscBody}
        </div>
      ) : (
        <div className="table-scroll">
          <table className="itable stack">
            <thead>
              <tr>
                <th>{t.editor.ingredient}</th>
                <th>{t.editor.type}</th>
                <th>{t.editor.added}</th>
                <th className="r">{t.editor.time}</th>
                <th className="r">{t.editor.amount}</th>
                <th>
                  <span className="sr-only">{t.common.actions}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((m, i) => (
                <tr key={m.id}>
                  <td className="name-cell">
                    <CellLabel>{t.editor.ingredient}</CellLabel>
                    <input className="input name-input" aria-label={t.editor.ingredientName} value={m.name} onChange={(e) => patch(m.id, { name: e.target.value })} />
                  </td>
                  <td style={{ width: 112, minWidth: 112 }}>
                    <CellLabel>{t.editor.type}</CellLabel>
                    <Select<MiscType> ariaLabel={t.editor.ariaType(m.name)} value={m.type} options={optionsOf<MiscType>(t.miscType)} onChange={(v) => patch(m.id, { type: v })} />
                  </td>
                  <td style={{ width: 118, minWidth: 118 }}>
                    <CellLabel>{t.editor.added}</CellLabel>
                    <Select<MiscUse> ariaLabel={t.editor.ariaAddition(m.name)} value={m.use} options={optionsOf<MiscUse>(t.miscUse)} onChange={(v) => patch(m.id, { use: v })} />
                  </td>
                  <td style={{ width: 92, minWidth: 92 }}>
                    <CellLabel>{t.editor.time}</CellLabel>
                    {miscTimeUnit(m.use, t) ? <NumberInput ariaLabel={t.editor.ariaTime(m.name)} unit={miscTimeUnit(m.use, t)} decimals={0} max={500} value={m.time} onChange={(v) => patch(m.id, { time: v })} /> : <span className="small faint">{t.time.atPackaging}</span>}
                  </td>
                  <td style={{ width: 170, minWidth: 170 }}>
                    <CellLabel>{t.editor.amount}</CellLabel>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <NumberInput ariaLabel={t.editor.ariaAmount(m.name)} decimals={2} max={100000} value={m.amount} onChange={(v) => patch(m.id, { amount: v })} />
                      <Select<MiscUnit> ariaLabel={t.editor.ariaUnit(m.name)} value={m.unit} options={MISC_UNITS.map((u) => ({ value: u, label: u }))} onChange={(v) => patch(m.id, { unit: v })} />
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
  const { t } = useI18n();
  const patch = (id: string, p: Partial<T>) => onChange(items.map((x) => (x.id === id ? { ...x, ...p } : x)));
  return (
    <Section
      title={title}
      count={items.length}
      actions={
        <button type="button" className="btn btn-sm" onClick={() => onChange([...items, newItem()])}>
          <Plus size={14} aria-hidden="true" /> {t.editor.addStep}
        </button>
      }
    >
      {items.length === 0 ? (
        <div className="empty">{t.editor.noSteps}</div>
      ) : (
        <div className="table-scroll">
          <table className="itable stack">
            <thead>
              <tr>
                <th>{t.editor.step}</th>
                <th className="r">{t.editor.temperature}</th>
                <th className="r">{t.editor.duration}</th>
                <th>
                  <span className="sr-only">{t.common.actions}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((st, i) => (
                <tr key={st.id}>
                  <td className="name-cell">
                    <CellLabel>{t.editor.step}</CellLabel>
                    <input className="input name-input" aria-label={t.editor.stepName} value={st.name} onChange={(e) => patch(st.id, { name: e.target.value } as Partial<T>)} />
                  </td>
                  <td style={{ width: 112, minWidth: 112 }}>
                    <CellLabel>{t.editor.temperature}</CellLabel>
                    <NumberInput ariaLabel={t.editor.ariaTemp(st.name)} kind="temperature" system={system} min={-10} max={220} value={st.tempC} onChange={(v) => patch(st.id, { tempC: v } as Partial<T>)} />
                  </td>
                  <td style={{ width: 110, minWidth: 110 }}>
                    <CellLabel>{t.editor.duration}</CellLabel>
                    <NumberInput ariaLabel={t.editor.ariaDuration(st.name)} unit={timeUnit} decimals={0} max={1000} value={st[timeKey] as number} onChange={(v) => patch(st.id, { [timeKey]: v } as Partial<T>)} />
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
  const { t } = useI18n();
  const eq = recipe.equipment;
  const set = (p: Partial<Recipe['equipment']>) => update({ equipment: { ...eq, ...p } });
  return (
    <Section title={t.editor.equipment} id="equipment">
      <div className="section-body grid grid-4">
        <NumberField label={t.eq.boilOff} kind="rate" system={system} value={eq.boilOffLPerHr} onChange={(v) => set({ boilOffLPerHr: v })} max={100} />
        <NumberField label={t.eq.kettleLoss} kind="volume" system={system} value={eq.kettleLossL} onChange={(v) => set({ kettleLossL: v })} max={100} hint={t.eq.kettleLossHint} />
        <NumberField label={t.eq.shrinkage} unit="%" decimals={1} max={10} value={eq.coolingShrinkagePct} onChange={(v) => set({ coolingShrinkagePct: v })} />
        <NumberField label={t.eq.fermenterLoss} kind="volume" system={system} value={eq.fermenterLossL} onChange={(v) => set({ fermenterLossL: v })} max={100} hint={t.eq.fermenterLossHint} />
        <NumberField label={t.eq.grainAbsorption} kind="absorption" system={system} value={eq.grainAbsorptionLPerKg} onChange={(v) => set({ grainAbsorptionLPerKg: v })} max={5} />
        <NumberField label={t.eq.hopAbsorption} unit="mL/g" decimals={1} value={eq.hopAbsorptionMlPerG} onChange={(v) => set({ hopAbsorptionMlPerG: v })} max={50} hint={t.eq.hopAbsorptionHint} />
        {recipe.method !== 'biab' && recipe.method !== 'extract' && (
          <>
            <NumberField label={t.eq.mashThickness} kind="thickness" system={system} value={eq.mashThicknessLPerKg} onChange={(v) => set({ mashThicknessLPerKg: v })} max={10} />
            <NumberField label={t.eq.deadspace} kind="volume" system={system} value={eq.mashTunDeadspaceL} onChange={(v) => set({ mashTunDeadspaceL: v })} max={50} />
          </>
        )}
        <NumberField label={t.eq.grainTemp} kind="temperature" system={system} min={-20} max={140} value={eq.grainTempC} onChange={(v) => set({ grainTempC: v })} />
        <NumberField label={t.eq.kettleVolume} kind="volume" system={system} value={eq.kettleVolumeL} onChange={(v) => set({ kettleVolumeL: v })} max={2000} hint={t.eq.kettleVolumeHint} />
        {recipe.method !== 'biab' && recipe.method !== 'extract' && <NumberField label={t.eq.tunVolume} kind="volume" system={system} value={eq.mashTunVolumeL} onChange={(v) => set({ mashTunVolumeL: v })} max={2000} />}
      </div>
    </Section>
  );
}
