import { Fragment } from 'react';
import { useI18n } from '../i18n';

export function MethodsPage() {
  const { t } = useI18n();
  const m = t.methods;
  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <div className="page-head">
        <div>
          <h1>{m.title}</h1>
          <p className="sub">{m.sub}</p>
        </div>
      </div>
      <div className="prose">
        <p className="small muted">{m.units}</p>
        {m.sections.map((sec) => (
          <Fragment key={sec.h}>
            <h2>{sec.h}</h2>
            {sec.formula && <code className="formula">{sec.formula}</code>}
            {sec.items && (
              <ul>
                {sec.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            )}
            {sec.note && <p className="small muted">{sec.note}</p>}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
