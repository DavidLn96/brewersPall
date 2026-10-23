import { useEffect, useMemo, useState } from 'react';
import { BookOpen, FlaskConical, Globe, Menu, Search, Settings as SettingsIcon, Wrench } from 'lucide-react';
import { useRoute, linkProps, navigate, type Route } from './router';
import { useStore } from './store/AppStore';
import { RecipeList } from './pages/RecipeList';
import { RecipeEditor } from './pages/RecipeEditor';
import { RecipeView } from './pages/RecipeView';
import { EquipmentPage } from './pages/Equipment';
import { SettingsPage } from './pages/Settings';
import { MethodsPage } from './pages/Methods';
import { PublicRecipeList, PublicRecipeView } from './pages/PublicRecipes';
import { findStyle } from './data/styles';
import { LangToggle, useI18n, type Dict } from './i18n';

const NAV: { route: Route; label: (t: Dict) => string; icon: typeof BookOpen; match: Route['name'][]; group: 'brew' | 'reference'; cloudOnly?: boolean }[] = [
  { route: { name: 'recipes' }, label: (t) => t.app.myRecipes, icon: FlaskConical, match: ['recipes', 'recipe', 'edit'], group: 'brew' },
  { route: { name: 'public' }, label: (t) => t.app.publicRecipes, icon: Globe, match: ['public', 'publicRecipe'], group: 'brew', cloudOnly: true },
  { route: { name: 'equipment' }, label: (t) => t.app.equipment, icon: Wrench, match: ['equipment'], group: 'brew' },
  { route: { name: 'settings' }, label: (t) => t.app.preferences, icon: SettingsIcon, match: ['settings'], group: 'reference' },
  { route: { name: 'methods' }, label: (t) => t.app.methods, icon: BookOpen, match: ['methods'], group: 'reference' },
];

export function App() {
  const route = useRoute();
  const { persistent, data, updateSettings, mode } = useStore();
  const { t } = useI18n();
  const [navOpen, setNavOpen] = useState(false);

  const nav = NAV.filter((n) => !n.cloudOnly || mode === 'cloud');
  useEffect(() => setNavOpen(false), [route]);
  useEffect(() => {
    const r = route.name === 'edit' || route.name === 'recipe' ? data.recipes.find((x) => x.id === route.id) : null;
    document.title = r ? `${r.name || t.common.untitled} · Brewlab` : t.app.docTitle;
  }, [route, data.recipes, t]);

  return (
    <div className="shell">
      <a href="#main" className="skip-link" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>
        {t.app.skip}
      </a>
      <aside className={`rail ${navOpen ? 'open' : ''}`} aria-label={t.app.mainNav}>
        <a className="brand" {...linkProps({ name: 'recipes' })}>
          <span className="brand-mark" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 2h8l-1 12H5L4 2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M4.4 6h7.2" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </span>
          <span>
            <span className="brand-name">Brewlab</span>
            <span className="brand-phase" style={{ display: 'block' }}>{t.app.brandSub}</span>
          </span>
        </a>
        <nav className="nav">
          <div className="nav-group">{t.app.groupBrew}</div>
          {nav.filter((n) => n.group === 'brew').map((n) => (
            <NavLink key={n.route.name} {...n} label={n.label(t)} active={n.match.includes(route.name)} />
          ))}
          <div className="nav-group">{t.app.groupReference}</div>
          {nav.filter((n) => n.group === 'reference').map((n) => (
            <NavLink key={n.route.name} {...n} label={n.label(t)} active={n.match.includes(route.name)} />
          ))}
        </nav>
        <div className="rail-foot">
          <span>
            <span className={`dot ${persistent ? '' : 'off'}`} aria-hidden="true" />
            {mode === 'cloud' ? t.app.savedAccount : persistent ? t.app.savedBrowser : t.app.storageBlocked}
          </span>
          <span style={{ opacity: 0.7 }}>{t.app.counts(data.recipes.length, data.equipment.length)}</span>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button type="button" className="icon-btn menu-btn" aria-label={t.app.openNav} aria-expanded={navOpen} onClick={() => setNavOpen((o) => !o)}>
            <Menu size={18} />
          </button>
          <GlobalSearch />
          <div className="topbar-spacer" />
          <div className="seg" role="group" aria-label={t.app.units}>
            <button type="button" aria-pressed={data.settings.unitSystem === 'metric'} onClick={() => updateSettings({ unitSystem: 'metric' })}>
              {t.app.metric}
            </button>
            <button type="button" aria-pressed={data.settings.unitSystem === 'us'} onClick={() => updateSettings({ unitSystem: 'us' })}>
              {t.app.us}
            </button>
          </div>
          <LangToggle />
          <AccountMenu />
        </header>
        {navOpen && <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} onClick={() => setNavOpen(false)} aria-hidden="true" />}
        <main id="main" tabIndex={-1} style={{ outline: 'none' }}>
          {route.name === 'recipes' && <RecipeList />}
          {route.name === 'recipe' && <RecipeView id={route.id} />}
          {route.name === 'edit' && <RecipeEditor id={route.id} />}
          {route.name === 'public' && <PublicRecipeList />}
          {route.name === 'publicRecipe' && <PublicRecipeView owner={route.owner} id={route.id} />}
          {route.name === 'equipment' && <EquipmentPage />}
          {route.name === 'settings' && <SettingsPage />}
          {route.name === 'methods' && <MethodsPage />}
        </main>
      </div>
    </div>
  );
}

function AccountMenu() {
  const { account, signOut } = useStore();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  if (!account) return null;
  const initials = account.name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className="account" style={{ position: 'relative' }}>
      <button type="button" className="icon-btn" style={{ width: 34, height: 34 }} aria-label={t.app.account(account.name)} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="avatar">{account.avatarUrl ? <img src={account.avatarUrl} alt="" referrerPolicy="no-referrer" /> : initials}</span>
      </button>
      {open && (
        <div className="account-menu" onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
          <div>
            <div style={{ fontWeight: 600 }}>{account.name}</div>
            <div className="xs faint">{account.email}</div>
          </div>
          <button type="button" className="btn" onClick={() => signOut?.()}>
            {t.app.signOut}
          </button>
        </div>
      )}
    </div>
  );
}

function NavLink({ route, label, icon: Icon, active }: { route: Route; label: string; icon: typeof BookOpen; active: boolean }) {
  return (
    <a {...linkProps(route)} aria-current={active ? 'page' : undefined}>
      <Icon size={16} aria-hidden="true" />
      {label}
    </a>
  );
}

function GlobalSearch() {
  const { data } = useStore();
  const { t } = useI18n();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return data.recipes.filter((r) => [r.name, findStyle(r.styleId)?.name, ...r.hops.map((h) => h.name), ...r.fermentables.map((f) => f.name)].some((x) => x?.toLowerCase().includes(t))).slice(0, 8);
  }, [q, data.recipes]);
  return (
    <div className="search" role="search">
      <Search size={15} aria-hidden="true" />
      <input
        aria-label={t.app.searchLabel}
        placeholder={t.app.searchPlaceholder}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && results[0]) {
            navigate({ name: 'recipe', id: results[0].id });
            setQ('');
            setOpen(false);
          }
          if (e.key === 'Escape') setOpen(false);
        }}
      />
      {open && q.trim() && (
        <ul className="search-results">
          {results.length === 0 && <li className="small faint" style={{ padding: 8 }}>{t.app.searchNone}</li>}
          {results.map((r) => (
            <li key={r.id}>
              <a
                {...linkProps({ name: 'recipe', id: r.id })}
                onMouseDown={(e) => {
                  e.preventDefault();
                  navigate({ name: 'recipe', id: r.id });
                  setQ('');
                  setOpen(false);
                }}
              >
                <span>{r.name}</span>
                <span className="faint xs">{findStyle(r.styleId)?.name ?? ''}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
