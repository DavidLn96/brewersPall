import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useStore } from '../store/AppStore';
import type { BatchTarget, BrewMethod, EquipmentProfile } from '../domain/types';
import { defaultProfiles, uid, now } from '../store/factory';
import { NumberField, SelectField, TextField } from '../ui/fields';
import { ConfirmDialog, Notice, Section } from '../ui/common';
import { vol } from '../ui/format';
import { useI18n } from '../i18n';

export function EquipmentPage() {
  const { data, upsertEquipment, deleteEquipment } = useStore();
  const s = data.settings.unitSystem;
  const { t } = useI18n();
  const [selected, setSelected] = useState<string | null>(data.equipment[0]?.id ?? null);
  const [confirm, setConfirm] = useState<EquipmentProfile | null>(null);
  const profile = data.equipment.find((e) => e.id === selected) ?? null;
  const usedBy = (id: string) => data.recipes.filter((r) => r.equipmentProfileId === id).length;

  const create = () => {
    const base = defaultProfiles()[1];
    const p: EquipmentProfile = { ...base, id: uid('eq_'), name: t.defaults.newProfile, notes: '', updatedAt: now() };
    upsertEquipment(p);
    setSelected(p.id);
  };
  const set = (patch: Partial<EquipmentProfile>) => profile && upsertEquipment({ ...profile, ...patch });

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>{t.equipment.title}</h1>
          <p className="sub">{t.equipment.sub}</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={create}>
          <Plus size={15} aria-hidden="true" /> {t.equipment.newProfile}
        </button>
      </div>

      <div className="editor" style={{ gridTemplateColumns: 'minmax(220px, 280px) minmax(0, 1fr)' }}>
        <nav className="panel" aria-label={t.equipment.navLabel} style={{ padding: 4 }}>
          {data.equipment.length === 0 && <div className="empty">{t.equipment.empty}</div>}
          {data.equipment.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => setSelected(e.id)}
              aria-current={e.id === selected ? 'true' : undefined}
              className="btn btn-ghost"
              style={{ width: '100%', justifyContent: 'space-between', height: 'auto', padding: '8px 10px', background: e.id === selected ? 'var(--accent-soft)' : undefined, textAlign: 'left', whiteSpace: 'normal' }}
            >
              <span>
                <span style={{ display: 'block', fontWeight: 600 }}>{e.name}</span>
                <span className="xs faint">
                  {t.method[e.method]} · {vol(e.defaultBatchL, s, 1)}
                </span>
              </span>
            </button>
          ))}
        </nav>

        {profile ? (
          <div className="editor-main">
            <Section
              title={t.equipment.profile}
              actions={
                <button type="button" className="btn btn-sm btn-ghost btn-danger" onClick={() => setConfirm(profile)}>
                  <Trash2 size={14} aria-hidden="true" /> {t.common.delete}
                </button>
              }
            >
              <div className="section-body grid grid-4">
                <TextField className="span-2" label={t.equipment.name} value={profile.name} onChange={(v) => set({ name: v })} />
                <SelectField<BrewMethod> label={t.editor.method} value={profile.method} onChange={(v) => set({ method: v })} options={(Object.keys(t.method) as BrewMethod[]).map((m) => ({ value: m, label: t.method[m] }))} />
                <SelectField<BatchTarget> label={t.editor.batchMeasured} value={profile.batchTarget} onChange={(v) => set({ batchTarget: v })} options={[{ value: 'fermenter', label: t.batchTarget.fermenter }, { value: 'kettle', label: t.batchTarget.kettle }]} />
                <NumberField label={t.equipment.defaultBatch} kind="volume" system={s} value={profile.defaultBatchL} onChange={(v) => set({ defaultBatchL: v })} max={4000} />
                <NumberField label={t.equipment.defaultBoil} unit={t.common.min} decimals={0} value={profile.defaultBoilMinutes} onChange={(v) => set({ defaultBoilMinutes: v })} max={300} />
                <NumberField label={t.equipment.targetEff} unit="%" decimals={1} max={100} value={profile.defaultEfficiencyPct} onChange={(v) => set({ defaultEfficiencyPct: v })} />
                <NumberField label={t.eq.grainTemp} kind="temperature" system={s} min={-20} max={140} value={profile.grainTempC} onChange={(v) => set({ grainTempC: v })} />
              </div>
            </Section>
            <Section title={t.equipment.vessels}>
              <div className="section-body grid grid-4">
                <NumberField label={t.eq.kettleVolume} kind="volume" system={s} value={profile.kettleVolumeL} onChange={(v) => set({ kettleVolumeL: v })} max={4000} />
                <NumberField label={t.eq.tunVolume} kind="volume" system={s} value={profile.mashTunVolumeL} onChange={(v) => set({ mashTunVolumeL: v })} max={4000} hint={t.eq.tunVolumeHint} />
                <NumberField label={t.eq.deadspace} kind="volume" system={s} value={profile.mashTunDeadspaceL} onChange={(v) => set({ mashTunDeadspaceL: v })} max={100} />
                <NumberField label={t.eq.mashThickness} kind="thickness" system={s} value={profile.mashThicknessLPerKg} onChange={(v) => set({ mashThicknessLPerKg: v })} max={10} />
                <NumberField label={t.eq.boilOff} kind="rate" system={s} value={profile.boilOffLPerHr} onChange={(v) => set({ boilOffLPerHr: v })} max={200} />
                <NumberField label={t.eq.shrinkage} unit="%" decimals={1} max={10} value={profile.coolingShrinkagePct} onChange={(v) => set({ coolingShrinkagePct: v })} />
                <NumberField label={t.eq.kettleLoss} kind="volume" system={s} value={profile.kettleLossL} onChange={(v) => set({ kettleLossL: v })} max={100} />
                <NumberField label={t.eq.fermenterLoss} kind="volume" system={s} value={profile.fermenterLossL} onChange={(v) => set({ fermenterLossL: v })} max={100} />
                <NumberField label={t.eq.grainAbsorption} kind="absorption" system={s} value={profile.grainAbsorptionLPerKg} onChange={(v) => set({ grainAbsorptionLPerKg: v })} max={5} />
                <NumberField label={t.eq.hopAbsorption} unit="mL/g" decimals={1} max={50} value={profile.hopAbsorptionMlPerG} onChange={(v) => set({ hopAbsorptionMlPerG: v })} />
                <TextField className="span-2" label={t.equipment.notes} value={profile.notes ?? ''} onChange={(v) => set({ notes: v })} />
              </div>
              {usedBy(profile.id) > 0 && (
                <div style={{ padding: '0 16px 16px' }}>
                  <Notice tone="info">
                    {t.equipment.usedBy(usedBy(profile.id))}
                  </Notice>
                </div>
              )}
            </Section>
            <Section title={t.equipment.calibrating}>
              <div className="section-body prose small">
                <ul>
                  {t.equipment.tips.map(([k, v]) => (
                    <li key={k}>
                      <strong>{k}</strong> {v}
                    </li>
                  ))}
                </ul>
              </div>
            </Section>
          </div>
        ) : (
          <div className="panel empty">{t.equipment.selectOrCreate}</div>
        )}
      </div>

      {confirm && (
        <ConfirmDialog
          title={t.equipment.deleteTitle(confirm.name)}
          body={t.equipment.deleteBody}
          confirmLabel={t.equipment.deleteConfirm}
          danger
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            deleteEquipment(confirm.id);
            setSelected(data.equipment.find((e) => e.id !== confirm.id)?.id ?? null);
            setConfirm(null);
          }}
        />
      )}
    </div>
  );
}
