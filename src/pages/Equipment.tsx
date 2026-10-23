import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useStore } from '../store/AppStore';
import type { BatchTarget, BrewMethod, EquipmentProfile } from '../domain/types';
import { defaultProfiles, uid, now } from '../store/factory';
import { NumberField, SelectField, TextField } from '../ui/fields';
import { ConfirmDialog, Notice, Section } from '../ui/common';
import { METHOD_LABEL, vol } from '../ui/format';

export function EquipmentPage() {
  const { data, upsertEquipment, deleteEquipment } = useStore();
  const s = data.settings.unitSystem;
  const [selected, setSelected] = useState<string | null>(data.equipment[0]?.id ?? null);
  const [confirm, setConfirm] = useState<EquipmentProfile | null>(null);
  const profile = data.equipment.find((e) => e.id === selected) ?? null;
  const usedBy = (id: string) => data.recipes.filter((r) => r.equipmentProfileId === id).length;

  const create = () => {
    const base = defaultProfiles()[1];
    const p: EquipmentProfile = { ...base, id: uid('eq_'), name: 'New equipment profile', notes: '', updatedAt: now() };
    upsertEquipment(p);
    setSelected(p.id);
  };
  const set = (patch: Partial<EquipmentProfile>) => profile && upsertEquipment({ ...profile, ...patch });

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Equipment Profiles</h1>
          <p className="sub">Profiles hold your system’s volumes and losses. A recipe copies the profile when you choose it, so editing a profile later does not change saved recipes.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={create}>
          <Plus size={15} aria-hidden="true" /> New profile
        </button>
      </div>

      <div className="editor" style={{ gridTemplateColumns: 'minmax(220px, 280px) minmax(0, 1fr)' }}>
        <nav className="panel" aria-label="Equipment profiles" style={{ padding: 4 }}>
          {data.equipment.length === 0 && <div className="empty">No profiles. Create one to set your volumes and losses.</div>}
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
                  {METHOD_LABEL[e.method]} · {vol(e.defaultBatchL, s, 1)}
                </span>
              </span>
            </button>
          ))}
        </nav>

        {profile ? (
          <div className="editor-main">
            <Section
              title="Profile"
              actions={
                <button type="button" className="btn btn-sm btn-ghost btn-danger" onClick={() => setConfirm(profile)}>
                  <Trash2 size={14} aria-hidden="true" /> Delete
                </button>
              }
            >
              <div className="section-body grid grid-4">
                <TextField className="span-2" label="Name" value={profile.name} onChange={(v) => set({ name: v })} />
                <SelectField<BrewMethod> label="Method" value={profile.method} onChange={(v) => set({ method: v })} options={(Object.keys(METHOD_LABEL) as BrewMethod[]).map((m) => ({ value: m, label: METHOD_LABEL[m] }))} />
                <SelectField<BatchTarget> label="Batch size measured" value={profile.batchTarget} onChange={(v) => set({ batchTarget: v })} options={[{ value: 'fermenter', label: 'Into fermenter' }, { value: 'kettle', label: 'Post-boil kettle' }]} />
                <NumberField label="Default batch size" kind="volume" system={s} value={profile.defaultBatchL} onChange={(v) => set({ defaultBatchL: v })} max={4000} />
                <NumberField label="Default boil" unit="min" decimals={0} value={profile.defaultBoilMinutes} onChange={(v) => set({ defaultBoilMinutes: v })} max={300} />
                <NumberField label="Target efficiency" unit="%" decimals={1} max={100} value={profile.defaultEfficiencyPct} onChange={(v) => set({ defaultEfficiencyPct: v })} />
                <NumberField label="Grain temperature" kind="temperature" system={s} min={-20} max={140} value={profile.grainTempC} onChange={(v) => set({ grainTempC: v })} />
              </div>
            </Section>
            <Section title="Vessels and losses">
              <div className="section-body grid grid-4">
                <NumberField label="Kettle volume" kind="volume" system={s} value={profile.kettleVolumeL} onChange={(v) => set({ kettleVolumeL: v })} max={4000} />
                <NumberField label="Mash tun volume" kind="volume" system={s} value={profile.mashTunVolumeL} onChange={(v) => set({ mashTunVolumeL: v })} max={4000} hint="0 for BIAB" />
                <NumberField label="Mash tun dead space" kind="volume" system={s} value={profile.mashTunDeadspaceL} onChange={(v) => set({ mashTunDeadspaceL: v })} max={100} />
                <NumberField label="Mash thickness" kind="thickness" system={s} value={profile.mashThicknessLPerKg} onChange={(v) => set({ mashThicknessLPerKg: v })} max={10} />
                <NumberField label="Boil-off rate" kind="rate" system={s} value={profile.boilOffLPerHr} onChange={(v) => set({ boilOffLPerHr: v })} max={200} />
                <NumberField label="Cooling shrinkage" unit="%" decimals={1} max={10} value={profile.coolingShrinkagePct} onChange={(v) => set({ coolingShrinkagePct: v })} />
                <NumberField label="Kettle loss" kind="volume" system={s} value={profile.kettleLossL} onChange={(v) => set({ kettleLossL: v })} max={100} />
                <NumberField label="Fermenter loss" kind="volume" system={s} value={profile.fermenterLossL} onChange={(v) => set({ fermenterLossL: v })} max={100} />
                <NumberField label="Grain absorption" kind="absorption" system={s} value={profile.grainAbsorptionLPerKg} onChange={(v) => set({ grainAbsorptionLPerKg: v })} max={5} />
                <NumberField label="Hop absorption" unit="mL/g" decimals={1} max={50} value={profile.hopAbsorptionMlPerG} onChange={(v) => set({ hopAbsorptionMlPerG: v })} />
                <TextField className="span-2" label="Notes" value={profile.notes ?? ''} onChange={(v) => set({ notes: v })} />
              </div>
              {usedBy(profile.id) > 0 && (
                <div style={{ padding: '0 16px 16px' }}>
                  <Notice tone="info">
                    {usedBy(profile.id)} recipe{usedBy(profile.id) === 1 ? '' : 's'} were built with this profile. They keep their own copy; choose the profile again in a recipe to pick up changes.
                  </Notice>
                </div>
              )}
            </Section>
            <Section title="Calibrating your profile">
              <div className="section-body prose small">
                <ul>
                  <li>
                    <strong>Boil-off:</strong> measure the kettle volume at the start and end of a plain-water boil of one hour. The difference is your hourly rate.
                  </li>
                  <li>
                    <strong>Kettle loss:</strong> after transferring to the fermenter, measure what stays behind (trub, hops, chiller, below the valve).
                  </li>
                  <li>
                    <strong>Grain absorption:</strong> (water added − wort collected − dead space) ÷ grain weight. BIAB with squeezing is often 0.5–0.7 L/kg; a cooler tun around 1.0 L/kg.
                  </li>
                  <li>
                    <strong>Efficiency:</strong> after a few brews, compare measured OG and fermenter volume to the recipe. Adjust until estimates match your results.
                  </li>
                  <li>
                    <strong>Cooling shrinkage:</strong> wort contracts about 4% from boiling to pitching temperature. Most brewers leave this at 4%.
                  </li>
                </ul>
              </div>
            </Section>
          </div>
        ) : (
          <div className="panel empty">Select or create a profile.</div>
        )}
      </div>

      {confirm && (
        <ConfirmDialog
          title={`Delete ${confirm.name}?`}
          body="Recipes built with this profile keep their own equipment values."
          confirmLabel="Delete profile"
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
