import { useStore } from '../store/AppStore';
import { SelectField, TextField } from '../ui/fields';
import { Section } from '../ui/common';
import { linkProps } from '../router';
import type { Settings } from '../store/schema';
import { LANGS, useI18n, type Lang } from '../i18n';

export function SettingsPage() {
  const { data, updateSettings, persistent, mode } = useStore();
  const st = data.settings;
  const { t, lang, setLang } = useI18n();
  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <div className="page-head">
        <div>
          <h1>{t.settings.title}</h1>
          <p className="sub">{t.settings.sub}</p>
        </div>
      </div>
      <div className="editor-main">
        <Section title={t.settings.unitsBrewer}>
          <div className="section-body grid grid-3">
            <SelectField<Settings['unitSystem']>
              label={t.settings.units}
              value={st.unitSystem}
              onChange={(v) => updateSettings({ unitSystem: v })}
              options={[
                { value: 'metric', label: t.settings.metricLong },
                { value: 'us', label: t.settings.usLong },
              ]}
            />
            <SelectField<Lang> label={t.settings.language} value={lang} onChange={setLang} options={LANGS} hint={t.settings.languageHint} />
            <TextField label={t.settings.brewerName} value={st.brewerName} onChange={(v) => updateSettings({ brewerName: v })} placeholder={t.settings.brewerNamePh} />
          </div>
        </Section>
        <Section title={t.settings.methods}>
          <div className="section-body grid grid-3">
            <SelectField<Settings['ibuMethod']>
              label={t.settings.ibu}
              value={st.ibuMethod}
              onChange={(v) => updateSettings({ ibuMethod: v })}
              options={[
                { value: 'tinseth', label: 'Tinseth' },
                { value: 'rager', label: 'Rager' },
              ]}
              hint={t.settings.ibuHint}
            />
            <SelectField<Settings['colorMethod']>
              label={t.settings.color}
              value={st.colorMethod}
              onChange={(v) => updateSettings({ colorMethod: v })}
              options={[
                { value: 'morey', label: 'Morey' },
                { value: 'daniels', label: 'Daniels' },
                { value: 'mosher', label: 'Mosher' },
              ]}
              hint={t.settings.colorHint}
            />
            <SelectField<Settings['abvMethod']>
              label={t.settings.abv}
              value={st.abvMethod}
              onChange={(v) => updateSettings({ abvMethod: v })}
              options={[
                { value: 'standard', label: t.settings.abvStandard },
                { value: 'alternate', label: t.settings.abvAlternate },
              ]}
              hint={t.settings.abvHint}
            />
          </div>
          <p className="small muted" style={{ padding: '0 16px 16px' }}>
            {t.settings.methodsLink} <a {...linkProps({ name: 'methods' })}>{t.app.methods}</a>.
          </p>
        </Section>
        <Section title={t.settings.storage}>
          <div className="section-body small muted">
            {mode === 'cloud'
              ? t.settings.storageCloud
              : persistent
              ? t.settings.storageLocal
              : t.settings.storageBlocked}
          </div>
        </Section>
      </div>
    </div>
  );
}
