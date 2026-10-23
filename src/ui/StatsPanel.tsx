import { srmToHex } from '../domain/color';
import { compareToStyle, type BeerStyle, type StyleComparison } from '../domain/style';
import type { RecipeStats } from '../domain/recipe';
import type { Recipe } from '../domain/types';
import type { UnitSystem } from '../domain/units';
import { fmt, fmtSg, massL, temp, vol } from './format';
import { Notice } from './common';
import type { Settings } from '../store/schema';

const METRIC_LABEL: Record<StyleComparison['metric'], string> = { og: 'OG', fg: 'FG', abv: 'ABV', ibu: 'IBU', srm: 'SRM' };

function fmtMetric(m: StyleComparison['metric'], v: number) {
  if (m === 'og' || m === 'fg') return fmtSg(v);
  if (m === 'abv') return `${fmt(v, 1)}%`;
  return fmt(v, m === 'srm' ? 1 : 0);
}

/** Horizontal range bar: the style's range is the green band, the pin is the recipe. */
function RangeRow({ c }: { c: StyleComparison }) {
  const span = c.range.max - c.range.min || 1;
  const lo = Math.min(c.range.min - span * 0.6, c.value);
  const hi = Math.max(c.range.max + span * 0.6, c.value);
  const pos = (v: number) => ((v - lo) / (hi - lo)) * 100;
  const label = `${METRIC_LABEL[c.metric]} ${fmtMetric(c.metric, c.value)}, style range ${fmtMetric(c.metric, c.range.min)} to ${fmtMetric(c.metric, c.range.max)}, ${c.status === 'in' ? 'in range' : c.status === 'low' ? 'below range' : 'above range'}`;
  return (
    <div className="style-row" role="img" aria-label={label}>
      <span className="k">{METRIC_LABEL[c.metric]}</span>
      <div>
        <div className="range-track">
          <div className="rail-line" />
          <div className="band" style={{ left: `${pos(c.range.min)}%`, width: `${pos(c.range.max) - pos(c.range.min)}%` }} />
          <div className={`pin ${c.status}`} style={{ left: `${Math.max(1, Math.min(99, pos(c.value)))}%` }} />
        </div>
        <div className="range-ends" aria-hidden="true">
          <span style={{ marginLeft: `${Math.max(0, pos(c.range.min) - 6)}%` }}>{fmtMetric(c.metric, c.range.min)}</span>
          <span style={{ marginRight: `${Math.max(0, 100 - pos(c.range.max) - 6)}%` }}>{fmtMetric(c.metric, c.range.max)}</span>
        </div>
      </div>
      <span className={`val ${c.status === 'in' ? 'status-in' : 'status-out'}`}>
        {fmtMetric(c.metric, c.value)}
        <span className="sr-only">{c.status === 'in' ? ' in range' : c.status === 'low' ? ' below range' : ' above range'}</span>
        <span aria-hidden="true">{c.status === 'in' ? '' : c.status === 'low' ? ' ↓' : ' ↑'}</span>
      </span>
    </div>
  );
}

const GRADIENT = `linear-gradient(90deg, ${[1, 3, 5, 8, 11, 15, 20, 26, 33, 40].map((s, i, a) => `${srmToHex(s)} ${(i / (a.length - 1)) * 100}%`).join(', ')})`;

export function ColorStrip({ srm, ebc }: { srm: number; ebc: number }) {
  const pos = Math.min(100, (Math.min(40, srm) / 40) * 100);
  return (
    <div className="color-strip">
      <div className="glass" style={{ background: srmToHex(srm) }} role="img" aria-label={`Estimated color ${fmt(srm, 1)} SRM`} />
      <div className="srm-scale">
        <div className="label">Color</div>
        <div className="srm-gradient" style={{ background: GRADIENT }} aria-hidden="true">
          <span className="mark" style={{ left: `calc(${pos}% - 1px)` }} />
        </div>
        <div className="small mono">
          {fmt(srm, 1)} SRM <span className="faint">· {fmt(ebc, 1)} EBC</span>
        </div>
      </div>
    </div>
  );
}

export function StatsPanel({ stats, recipe, style, settings }: { stats: RecipeStats; recipe: Recipe; style: BeerStyle | null; settings: Settings }) {
  const s: UnitSystem = settings.unitSystem;
  const v = stats.volumes;
  const comparisons = style ? compareToStyle(stats, style) : [];
  const inRange = comparisons.filter((c) => c.status === 'in').length;
  const isMash = recipe.method !== 'extract';

  return (
    <>
      <section className="instrument" aria-labelledby="stats-title">
        <div className="instrument-head">
          <h2 id="stats-title" className="label" style={{ fontSize: '0.75rem' }}>
            Estimated stats
          </h2>
          <span className="tag" title="Calculated from the recipe. Measured values are recorded on brew day.">
            Estimate
          </span>
        </div>
        <div className="readouts" aria-live="polite">
          <Readout k="OG" v={fmtSg(stats.og)} sub={`${fmt((stats.og - 1) * 1000, 1)} pts`} />
          <Readout k="FG" v={fmtSg(stats.fg)} sub={`${fmt(stats.attenuationPct, 0)}% att.${stats.attenuationAssumed ? '*' : ''}`} />
          <Readout k="ABV" v={fmt(stats.abv, 1)} u="%" sub={settings.abvMethod === 'alternate' ? 'alternate' : 'standard'} />
          <Readout k="IBU" v={fmt(stats.ibu, 0)} sub={settings.ibuMethod === 'tinseth' ? 'Tinseth' : 'Rager'} />
          <Readout k="BU:GU" v={stats.buGu == null ? '–' : fmt(stats.buGu, 2)} sub="bitterness ratio" />
          <Readout k="Efficiency" v={fmt(recipe.batchTarget === 'fermenter' ? stats.brewhouseEfficiencyPct : stats.kettleEfficiencyPct, 0)} u="%" sub={recipe.batchTarget === 'fermenter' ? 'brewhouse' : 'kettle'} />
        </div>
        <ColorStrip srm={stats.srm} ebc={stats.ebc} />
        <dl className="stat-list">
          <dt className="group label">Volumes</dt>
          <dt>Into fermenter</dt>
          <dd>{vol(v.intoFermenterL, s)}</dd>
          <dt>Post-boil (hot)</dt>
          <dd>{vol(v.postBoilHotL, s)}</dd>
          <dt>Pre-boil</dt>
          <dd>{vol(v.preBoilL, s)}</dd>
          <dt>Packaged</dt>
          <dd>{vol(v.packagedL, s)}</dd>
          <dt className="group label">Water</dt>
          <dt>Total water</dt>
          <dd>{vol(v.totalWaterL, s)}</dd>
          {isMash ? (
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
          ) : (
            <>
              <dt>Steep water</dt>
              <dd>{vol(v.mashWaterL, s)}</dd>
            </>
          )}
          <dt className="group label">Ingredients</dt>
          <dt>{isMash ? 'Grain bill' : 'Steeping grain'}</dt>
          <dd>{massL(stats.totalGrainKg, s)}</dd>
          <dt>Pre-boil gravity</dt>
          <dd>{fmtSg(stats.preBoilGravity)}</dd>
          <dt>{recipe.batchTarget === 'fermenter' ? 'Implied mash efficiency' : 'Brewhouse efficiency'}</dt>
          <dd>{fmt(recipe.batchTarget === 'fermenter' ? stats.kettleEfficiencyPct : stats.brewhouseEfficiencyPct, 0)}%</dd>
          {stats.pitch && (
            <>
              <dt>Yeast cells needed</dt>
              <dd title={`${stats.pitch.rate} million cells / mL / °P (${stats.pitch.isLager ? 'lager' : 'ale'})`}>{fmt(stats.pitch.cellsBillions, 0)} B</dd>
            </>
          )}
        </dl>
        {stats.attenuationAssumed && (
          <p className="xs faint" style={{ padding: '0 16px 12px' }}>
            * Attenuation assumed until you add a yeast.
          </p>
        )}
      </section>

      {style ? (
        <section className="instrument" aria-labelledby="style-title">
          <div className="instrument-head">
            <h2 id="style-title" className="label" style={{ fontSize: '0.75rem' }}>
              {style.code} {style.name}
            </h2>
            <span className={`tag ${inRange === comparisons.length ? 'accent' : ''}`}>
              {inRange}/{comparisons.length} in range
            </span>
          </div>
          <div className="style-rows">
            {comparisons.map((c) => (
              <RangeRow key={c.metric} c={c} />
            ))}
          </div>
        </section>
      ) : (
        <div className="instrument">
          <p className="small muted" style={{ padding: 16 }}>
            Choose a style to compare this recipe against BJCP guideline ranges.
          </p>
        </div>
      )}

      {stats.warnings.length > 0 && (
        <div className="instrument">
          <div className="warnings" role="status">
            {stats.warnings.map((w) => (
              <Notice key={w}>{w}</Notice>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function Readout({ k, v, u, sub }: { k: string; v: string; u?: string; sub?: string }) {
  return (
    <div className="readout-cell">
      <div className="label">{k}</div>
      <div>
        <span className="v">{v}</span>
        {u && <span className="u">{u}</span>}
      </div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}

/** Compact sticky summary for narrow screens. */
export function MobileStats({ stats }: { stats: RecipeStats }) {
  const items: [string, string][] = [
    ['OG', fmtSg(stats.og)],
    ['FG', fmtSg(stats.fg)],
    ['ABV', `${fmt(stats.abv, 1)}%`],
    ['IBU', fmt(stats.ibu, 0)],
    ['SRM', fmt(stats.srm, 1)],
  ];
  return (
    <div className="mobile-stats" aria-hidden="true">
      {items.map(([k, v]) => (
        <div key={k}>
          <div className="label" style={{ fontSize: '0.625rem' }}>
            {k}
          </div>
          <div className="v">
            {k === 'SRM' && <span className="swatch-dot" style={{ background: srmToHex(stats.srm) }} />}
            {v}
          </div>
        </div>
      ))}
    </div>
  );
}
