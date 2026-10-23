import { useEffect, useState } from 'react';

export type Route =
  | { name: 'recipes' }
  | { name: 'recipe'; id: string }
  | { name: 'edit'; id: string }
  | { name: 'equipment' }
  | { name: 'settings' }
  | { name: 'methods' };

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'recipes' && parts[1] && parts[2] === 'edit') return { name: 'edit', id: decodeURIComponent(parts[1]) };
  if (parts[0] === 'recipes' && parts[1]) return { name: 'recipe', id: decodeURIComponent(parts[1]) };
  if (parts[0] === 'equipment') return { name: 'equipment' };
  if (parts[0] === 'settings') return { name: 'settings' };
  if (parts[0] === 'methods') return { name: 'methods' };
  return { name: 'recipes' };
}

export function href(route: Route): string {
  switch (route.name) {
    case 'recipes':
      return '#/recipes';
    case 'recipe':
      return `#/recipes/${encodeURIComponent(route.id)}`;
    case 'edit':
      return `#/recipes/${encodeURIComponent(route.id)}/edit`;
    default:
      return `#/${route.name}`;
  }
}

// Route state lives in memory and mirrors to the hash when the host allows it,
// so the app still navigates inside sandboxed frames that ignore hash changes.
let current: Route = typeof window !== 'undefined' ? parseHash(window.location.hash) : { name: 'recipes' };
const listeners = new Set<(r: Route) => void>();

export function navigate(route: Route) {
  current = route;
  try {
    const h = href(route);
    if (window.location.hash !== h) history.pushState(null, '', h);
  } catch {
    /* hash not writable in this frame */
  }
  listeners.forEach((l) => l(route));
  try {
    window.scrollTo({ top: 0 });
  } catch {
    /* ignore */
  }
}

export function useRoute(): Route {
  const [route, setRoute] = useState(current);
  useEffect(() => {
    const l = (r: Route) => setRoute(r);
    listeners.add(l);
    const onPop = () => {
      current = parseHash(window.location.hash);
      listeners.forEach((fn) => fn(current));
    };
    window.addEventListener('popstate', onPop);
    window.addEventListener('hashchange', onPop);
    return () => {
      listeners.delete(l);
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('hashchange', onPop);
    };
  }, []);
  return route;
}

/** Intercept clicks on in-app links so they use the in-memory router. */
export function linkProps(route: Route) {
  return {
    href: href(route),
    onClick: (e: React.MouseEvent) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      navigate(route);
    },
  };
}
