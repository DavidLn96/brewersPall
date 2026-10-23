import { useId, useMemo, useRef, useState } from 'react';
import { Plus, Search } from 'lucide-react';

export interface PickerOption<T> {
  key: string;
  label: string;
  meta?: string;
  group?: string;
  /** Extra text matched by search but not shown. */
  keywords?: string;
  item: T;
}

interface PickerProps<T> {
  options: PickerOption<T>[];
  placeholder: string;
  onPick: (item: T) => void;
  onCustom: (name: string) => void;
  label: string;
}

/**
 * Searchable ingredient combobox (WAI-ARIA combobox pattern).
 * Arrow keys move, Enter picks, Escape closes. The last option adds a custom ingredient.
 */
export function Picker<T>({ options, placeholder, onPick, onCustom, label }: PickerProps<T>) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const res = terms.length
      ? options.filter((o) => {
          const hay = `${o.label} ${o.meta ?? ''} ${o.group ?? ''} ${o.keywords ?? ''}`.toLowerCase();
          return terms.every((t) => hay.includes(t));
        })
      : options;
    return res.slice(0, 60);
  }, [q, options]);

  const customName = q.trim();
  const total = filtered.length + (customName ? 1 : 0);

  const choose = (i: number) => {
    if (i < filtered.length) onPick(filtered[i].item);
    else if (customName) onCustom(customName);
    setQ('');
    setOpen(false);
    setActive(0);
    inputRef.current?.focus();
  };

  let lastGroup: string | undefined;
  return (
    <div className="picker">
      <span className="search" style={{ maxWidth: 'none' }}>
        <Search size={15} aria-hidden="true" />
        <input
          ref={inputRef}
          className="input"
          style={{ paddingLeft: 32 }}
          role="combobox"
          aria-label={label}
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && total > 0 ? `${listId}-${active}` : undefined}
          placeholder={placeholder}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setOpen(true);
              setActive((a) => Math.min(total - 1, a + 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            } else if (e.key === 'Enter') {
              if (open && total > 0) {
                e.preventDefault();
                choose(active);
              }
            } else if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
        />
      </span>
      {open && total > 0 && (
        <ul className="picker-list" id={listId} role="listbox" aria-label={label}>
          {filtered.map((o, i) => {
            const header = o.group && o.group !== lastGroup ? o.group : null;
            lastGroup = o.group;
            return [
              header && !q ? (
                <li key={`g-${header}`} className="group" role="presentation">
                  {header}
                </li>
              ) : null,
              <li
                key={o.key}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(i);
                }}
                onMouseEnter={() => setActive(i)}
              >
                <span>{o.label}</span>
                {o.meta && <span className="opt-meta">{o.meta}</span>}
              </li>,
            ];
          })}
          {customName && (
            <li
              id={`${listId}-${filtered.length}`}
              role="option"
              aria-selected={active === filtered.length}
              className="opt-custom"
              onMouseDown={(e) => {
                e.preventDefault();
                choose(filtered.length);
              }}
              onMouseEnter={() => setActive(filtered.length)}
            >
              <span>
                <Plus size={13} aria-hidden="true" style={{ verticalAlign: -2, marginRight: 4 }} />
                Add custom “{customName}”
              </span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
