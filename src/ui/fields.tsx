import { useEffect, useId, useState, type ReactNode } from 'react';
import { decimalsFor, fromDisplay, roundTo, toDisplay, unitLabel, type QuantityKind, type UnitSystem } from '../domain/units';

interface NumberInputProps {
  /** Canonical value. */
  value: number;
  onChange: (canonical: number) => void;
  /** When set, the value is shown in the user's unit system and converted back on edit. */
  kind?: QuantityKind;
  system?: UnitSystem;
  unit?: string;
  decimals?: number;
  min?: number;
  max?: number;
  step?: number;
  id?: string;
  ariaLabel?: string;
  /** Show the value in another form (e.g. SG for PPG). */
  format?: { toDisplay: (v: number) => number; fromDisplay: (v: number) => number };
}

/**
 * Numeric input that keeps the raw text while the user types (so "1." or "" is allowed),
 * converts display units to canonical units, and rejects values outside [min, max].
 */
export function NumberInput({ value, onChange, kind, system = 'metric', unit, decimals, min = 0, max, step, id, ariaLabel, format }: NumberInputProps) {
  const toD = (v: number) => (format ? format.toDisplay(v) : kind ? toDisplay(kind, system, v) : v);
  const fromD = (v: number) => (format ? format.fromDisplay(v) : kind ? fromDisplay(kind, system, v) : v);
  const d = decimals ?? (kind ? decimalsFor(kind, system) : 2);
  const shown = (v: number) => (Number.isFinite(v) ? String(roundTo(toD(v), d)) : '');
  const [text, setText] = useState(shown(value));
  const [focused, setFocused] = useState(false);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    if (!focused) setText(shown(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, system, kind, focused]);

  const u = unit ?? (kind ? unitLabel(kind, system) : undefined);
  const commit = (t: string) => {
    const n = Number(t.replace(',', '.'));
    if (t.trim() === '' || !Number.isFinite(n)) {
      setInvalid(t.trim() !== '');
      return;
    }
    const dispMin = min;
    if (n < dispMin || (max != null && n > max)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    onChange(fromD(n));
  };

  const input = (
    <input
      id={id}
      className="input"
      inputMode="decimal"
      aria-label={ariaLabel}
      aria-invalid={invalid || undefined}
      value={text}
      step={step}
      onFocus={(e) => {
        setFocused(true);
        e.currentTarget.select();
      }}
      onBlur={() => {
        setFocused(false);
        setInvalid(false);
        setText(shown(value));
      }}
      onChange={(e) => {
        setText(e.target.value);
        commit(e.target.value);
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          const s = step ?? 10 ** -Math.min(d, 2);
          const cur = Number(text) || 0;
          const next = roundTo(cur + (e.key === 'ArrowUp' ? s : -s), Math.max(d, 3));
          if (next < min || (max != null && next > max)) return;
          setText(String(next));
          onChange(fromD(next));
        }
      }}
    />
  );
  if (!u) return input;
  return (
    <span className="unit-input" style={{ ['--unit-pad' as string]: `${12 + u.length * 7}px` }}>
      {input}
      <span className="unit" aria-hidden="true">
        {u}
      </span>
    </span>
  );
}

export function Field({ label, hint, children, htmlFor, className }: { label: string; hint?: ReactNode; children: ReactNode; htmlFor?: string; className?: string }) {
  return (
    <div className={`field ${className ?? ''}`}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

/** Field + NumberInput with a generated id. */
export function NumberField(props: NumberInputProps & { label: string; hint?: ReactNode; className?: string }) {
  const auto = useId();
  const id = props.id ?? auto;
  const { label, hint, className, ...rest } = props;
  return (
    <Field label={label} hint={hint} htmlFor={id} className={className}>
      <NumberInput {...rest} id={id} />
    </Field>
  );
}

export function SelectField<T extends string>({ label, value, options, onChange, hint, id, className }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; hint?: ReactNode; id?: string; className?: string }) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <Field label={label} hint={hint} htmlFor={fid} className={className}>
      <select id={fid} className="select" value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function TextField({ label, value, onChange, placeholder, hint, id, multiline, className }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; hint?: ReactNode; id?: string; multiline?: boolean; className?: string }) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <Field label={label} hint={hint} htmlFor={fid} className={className}>
      {multiline ? (
        <textarea id={fid} className="textarea" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input id={fid} className="input" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </Field>
  );
}

export function Select<T extends string>({ value, options, onChange, ariaLabel, id }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; ariaLabel: string; id?: string }) {
  return (
    <select id={id} className="select" aria-label={ariaLabel} value={value} onChange={(e) => onChange(e.target.value as T)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
