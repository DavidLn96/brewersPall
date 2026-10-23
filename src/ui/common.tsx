import { useEffect, useRef, type ReactNode } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, Copy, Info, Trash2 } from 'lucide-react';
import { useI18n } from '../i18n';

export function Section({ title, count, actions, children, footer, id }: { title: string; count?: number; actions?: ReactNode; children: ReactNode; footer?: ReactNode; id?: string }) {
  return (
    <section className="section" aria-labelledby={id ? `${id}-title` : undefined}>
      <div className="section-head">
        <h2 id={id ? `${id}-title` : undefined}>
          {title}
          {count != null && <span className="count">{count}</span>}
        </h2>
        {actions && <div className="actions">{actions}</div>}
      </div>
      {children}
      {footer && <div className="section-foot">{footer}</div>}
    </section>
  );
}

export function RowActions({ index, length, onMove, onDuplicate, onRemove, name }: { index: number; length: number; onMove: (from: number, to: number) => void; onDuplicate?: () => void; onRemove: () => void; name: string }) {
  const { t } = useI18n();
  return (
    <div className="row-actions">
      <button type="button" className="icon-btn" aria-label={t.rows.moveUp(name)} disabled={index === 0} onClick={() => onMove(index, index - 1)}>
        <ArrowUp size={15} />
      </button>
      <button type="button" className="icon-btn" aria-label={t.rows.moveDown(name)} disabled={index === length - 1} onClick={() => onMove(index, index + 1)}>
        <ArrowDown size={15} />
      </button>
      {onDuplicate && (
        <button type="button" className="icon-btn" aria-label={t.rows.duplicate(name)} onClick={onDuplicate}>
          <Copy size={14} />
        </button>
      )}
      <button type="button" className="icon-btn danger" aria-label={t.rows.remove(name)} onClick={onRemove}>
        <Trash2 size={14} />
      </button>
    </div>
  );
}

export function CellLabel({ children }: { children: ReactNode }) {
  return (
    <span className="cell-label" aria-hidden="true">
      {children}
    </span>
  );
}

export function Notice({ children, tone = 'warn' }: { children: ReactNode; tone?: 'warn' | 'info' | 'bad' }) {
  return (
    <div className={`notice ${tone === 'warn' ? '' : tone}`} role={tone === 'bad' ? 'alert' : undefined}>
      {tone === 'info' ? <Info size={15} aria-hidden="true" /> : <AlertTriangle size={15} aria-hidden="true" />}
      <span>{children}</span>
    </div>
  );
}

/** In-page confirmation (native confirm() is unavailable in some embeds). */
export function ConfirmDialog({ title, body, confirmLabel, onConfirm, onCancel, danger }: { title: string; body: ReactNode; confirmLabel: string; onConfirm: () => void; onCancel: () => void; danger?: boolean }) {
  const { t } = useI18n();
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);
  return (
    <div className="dialog-backdrop" onMouseDown={onCancel}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dlg-title" onMouseDown={(e) => e.stopPropagation()}>
        <h2 id="dlg-title">{title}</h2>
        <div className="muted small">{body}</div>
        <div className="actions" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={onCancel}>
            {t.common.cancel}
          </button>
          <button type="button" ref={ref} className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, [message, onDone]);
  return (
    <div className="toast" role="status">
      {message}
    </div>
  );
}

export function moveItem<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const copy = arr.slice();
  const [x] = copy.splice(from, 1);
  copy.splice(to, 0, x);
  return copy;
}
