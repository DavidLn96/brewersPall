import { useEffect, useMemo, useState } from 'react';
import { BookOpen, FlaskConical, Menu, Search, Settings as SettingsIcon, Wrench } from 'lucide-react';
import { useRoute, linkProps, navigate, type Route } from './router';
import { useStore } from './store/AppStore';
import { RecipeList } from './pages/RecipeList';
import { RecipeEditor } from './pages/RecipeEditor';
import { RecipeView } from './pages/RecipeView';
import { EquipmentPage } from './pages/Equipment';
import { SettingsPage } from './pages/Settings';
import { MethodsPage } from './pages/Methods';
import { findStyle } from './data/styles';

const NAV: { route: Route; label: string; icon: typeof BookOpen; match: Route['name'][] }[] = [
  { route: { name: 'recipes' }, label: 'My Recipes', icon: FlaskConical, match: ['recipes', 'recipe', 'edit'] },
  { route: { name: 'equipment' }, label: 'Equipment', icon: Wrench, match: ['equipment'] },
  { route: { name: 'settings' }, label: 'Preferences', icon: SettingsIcon, match: ['settings'] },
  { route: { name: 'methods' }, label: 'How calculations work', icon: BookOpen, match: ['methods'] },
];

export function App() {
  const route = useRoute();
  const { persistent, data, updateSettings, mode } = useStore();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => setNavOpen(false), [route]);
  useEffect(() => {
    const r = route.name === 'edit' || route.name === 'recipe' ? data.recipes.find((x) => x.id === route.id) : null;
    document.title = r ? `${r.name} · Brewlab` : 'Brewlab Recipe Builder';
  }, [route, data.recipes]);

  return (
    <div className="shell">
      <a href="#main" className="skip-link" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>
        Skip to content
      </a>
      <aside className={`rail ${navOpen ? 'open' : ''}`} aria-label="Main navigation">
        <a className="brand" {...linkProps({ name: 'recipes' })}>
          <span className="brand-mark" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 2h8l-1 12H5L4 2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M4.4 6h7.2" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </span>
          <span>
            <span className="brand-name">Brewlab</span>
            <span className="brand-phase" style={{ display: 'block' }}>Recipe builder</span>
          </span>
        </a>
        <nav className="nav">
          <div className="nav-group">Brew</div>
          {NAV.slice(0, 2).map((n) => (
            <NavLink key={n.label} {...n} active={n.match.includes(route.name)} />
          ))}
          <div className="nav-group">Reference</div>
          {NAV.slice(2).map((n) => (
            <NavLink key={n.label} {...n} active={n.match.includes(route.name)} />
          ))}
        </nav>
        <div className="rail-foot">
          <span>
            <span className={`dot ${persistent ? '' : 'off'}`} aria-hidden="true" />
            {mode === 'cloud' ? 'Saved to your account' : persistent ? 'Saved in this browser' : 'Not saving: storage blocked'}
          </span>
          <span style={{ opacity: 0.7 }}>{data.recipes.length} recipe{data.recipes.length === 1 ? '' : 's'} · {data.equipment.length} profile{data.equipment.length === 1 ? '' : 's'}</span>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button type="button" className="icon-btn menu-btn" aria-label="Open navigation" aria-expanded={navOpen} onClick={() => setNavOpen((o) => !o)}>
            <Menu size={18} />
          </button>
          <GlobalSearch />
          <div className="topbar-spacer" />
          <div className="seg" role="group" aria-label="Units">
            <button type="button" aria-pressed={data.settings.unitSystem === 'metric'} onClick={() => updateSettings({ unitSystem: 'metric' })}>
              METRIC
            </button>
            <button type="button" aria-pressed={data.settings.unitSystem === 'us'} onClick={() => updateSettings({ unitSystem: 'us' })}>
              US
            </button>
          </div>
          <AccountMenu />
        </header>
        {navOpen && <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} onClick={() => setNavOpen(false)} aria-hidden="true" />}
        <main id="main" tabIndex={-1} style={{ outline: 'none' }}>
          {route.name === 'recipes' && <RecipeList />}
          {route.name === 'recipe' && <RecipeView id={route.id} />}
          {route.name === 'edit' && <RecipeEditor id={route.id} />}
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
  const [open, setOpen] = useState(false);
  if (!account) return null;
  const initials = account.name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className="account" style={{ position: 'relative' }}>
      <button type="button" className="icon-btn" style={{ width: 34, height: 34 }} aria-label={`Account: ${account.name}`} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="avatar">{account.avatarUrl ? <img src={account.avatarUrl} alt="" referrerPolicy="no-referrer" /> : initials}</span>
      </button>
      {open && (
        <div className="account-menu" onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
          <div>
            <div style={{ fontWeight: 600 }}>{account.name}</div>
            <div className="xs faint">{account.email}</div>
          </div>
          <button type="button" className="btn" onClick={() => signOut?.()}>
            Sign out
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
        aria-label="Search recipes"
        placeholder="Search recipes, styles, ingredients"
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
          {results.length === 0 && <li className="small faint" style={{ padding: 8 }}>No recipes match.</li>}
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
