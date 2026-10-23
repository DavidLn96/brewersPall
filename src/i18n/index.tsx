import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { en, type Dict } from './en';
import { es } from './es';

export type Lang = 'es' | 'en';
export type { Dict };

export const LANGS: { value: Lang; label: string }[] = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
];
export const DEFAULT_LANG: Lang = 'es';
const DICTS: Record<Lang, Dict> = { es, en };
const KEY = 'brewlab.lang';

export const dictFor = (lang: Lang): Dict => DICTS[lang];

/** The language is a per-browser preference, so it also applies on the sign-in screen. */
function readLang(): Lang {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'en' || v === 'es' ? v : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

interface I18n {
  lang: Lang;
  t: Dict;
  setLang: (l: Lang) => void;
}

const Ctx = createContext<I18n>({ lang: DEFAULT_LANG, t: DICTS[DEFAULT_LANG], setLang: () => {} });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readLang);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {
      // Storage blocked: the choice lasts for this tab only.
    }
  }, []);
  const value = useMemo(() => ({ lang, t: DICTS[lang], setLang }), [lang, setLang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);

/** ES / EN segmented toggle. */
export function LangToggle() {
  const { lang, setLang, t } = useI18n();
  return (
    <div className="seg" role="group" aria-label={t.app.language}>
      {LANGS.map((l) => (
        <button key={l.value} type="button" lang={l.value} aria-pressed={lang === l.value} title={l.label} onClick={() => setLang(l.value)}>
          {l.value.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
