import { useStore } from '../store/AppStore';
import { SelectField, TextField } from '../ui/fields';
import { Section } from '../ui/common';
import { linkProps } from '../router';
import type { Settings } from '../store/schema';

export function SettingsPage() {
  const { data, updateSettings, persistent, mode } = useStore();
  const st = data.settings;
  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <div className="page-head">
        <div>
          <h1>Brewing Preferences</h1>
          <p className="sub">These apply to every recipe. Values are stored in canonical units, so switching units never changes a recipe.</p>
        </div>
      </div>
      <div className="editor-main">
        <Section title="Units and brewer">
          <div className="section-body grid grid-2">
            <SelectField<Settings['unitSystem']>
              label="Units"
              value={st.unitSystem}
              onChange={(v) => updateSettings({ unitSystem: v })}
              options={[
                { value: 'metric', label: 'Metric (kg, g, L, °C)' },
                { value: 'us', label: 'US customary (lb, oz, gal, °F)' },
              ]}
            />
            <TextField label="Default brewer name" value={st.brewerName} onChange={(v) => updateSettings({ brewerName: v })} placeholder="Used on new recipes" />
          </div>
        </Section>
        <Section title="Calculation methods">
          <div className="section-body grid grid-3">
            <SelectField<Settings['ibuMethod']>
              label="Bitterness (IBU)"
              value={st.ibuMethod}
              onChange={(v) => updateSettings({ ibuMethod: v })}
              options={[
                { value: 'tinseth', label: 'Tinseth' },
                { value: 'rager', label: 'Rager' },
              ]}
              hint="Tinseth is the common default. Rager reads higher for long boils."
            />
            <SelectField<Settings['colorMethod']>
              label="Color (SRM)"
              value={st.colorMethod}
              onChange={(v) => updateSettings({ colorMethod: v })}
              options={[
                { value: 'morey', label: 'Morey' },
                { value: 'daniels', label: 'Daniels' },
                { value: 'mosher', label: 'Mosher' },
              ]}
              hint="Morey works across the full range."
            />
            <SelectField<Settings['abvMethod']>
              label="Alcohol (ABV)"
              value={st.abvMethod}
              onChange={(v) => updateSettings({ abvMethod: v })}
              options={[
                { value: 'standard', label: 'Standard (×131.25)' },
                { value: 'alternate', label: 'Alternate (high gravity)' },
              ]}
              hint="Alternate is more accurate above about 7% ABV."
            />
          </div>
          <p className="small muted" style={{ padding: '0 16px 16px' }}>
            Formulas, assumptions and limits are listed on <a {...linkProps({ name: 'methods' })}>How calculations work</a>.
          </p>
        </Section>
        <Section title="Storage">
          <div className="section-body small muted">
            {mode === 'cloud'
              ? 'Recipes, equipment and preferences are saved to your account in the Brewlab database. Only you can read them.'
              : persistent
              ? 'Recipes, equipment and preferences are saved in this browser’s local storage. Clearing site data removes them, so export your recipes from My Recipes as a backup.'
              : 'This browser is blocking local storage. Changes last only until the tab closes.'}
          </div>
        </Section>
      </div>
    </div>
  );
}
