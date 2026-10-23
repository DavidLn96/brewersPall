import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';
import { signInWithGoogle, signOut, supabase } from './client';
import { loadCloud, type CloudLoad } from './sync';
import { AppStoreProvider, type Account } from '../store/AppStore';
import { Notice } from '../ui/common';
import { LangToggle, useI18n, type Dict } from '../i18n';

function accountFrom(session: Session, t: Dict): Account {
  const u = session.user;
  const meta = (u.user_metadata ?? {}) as { full_name?: string; name?: string; avatar_url?: string; picture?: string };
  return { id: u.id, email: u.email ?? '', name: meta.full_name || meta.name || u.email || t.signin.defaultName, avatarUrl: meta.avatar_url || meta.picture };
}

/** Signs the user in with Google, loads their data, then renders the app in cloud mode. */
export function CloudRoot({ children }: { children: ReactNode }) {
  const client = supabase!;
  const { t } = useI18n();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [load, setLoad] = useState<CloudLoad | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    client.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = client.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, [client]);

  const userId = session?.user.id;
  const fetchData = useCallback(() => {
    if (!userId) return;
    setError(null);
    setLoad(null);
    loadCloud(client, userId)
      .then(setLoad)
      .catch((e: Error) => setError(e.message));
  }, [client, userId]);

  useEffect(() => {
    if (userId) fetchData();
    else setLoad(null);
  }, [userId, fetchData]);

  if (session === undefined) return <Splash label={t.signin.checking} />;
  if (!session) return <SignIn />;
  if (error)
    return (
      <Splash>
        <Notice tone="bad">{t.signin.loadError(error)}</Notice>
        <div className="actions" style={{ justifyContent: 'center' }}>
          <button type="button" className="btn btn-primary" onClick={fetchData}>
            {t.signin.tryAgain}
          </button>
          <button type="button" className="btn" onClick={() => void signOut()}>
            {t.app.signOut}
          </button>
        </div>
      </Splash>
    );
  if (!load) return <Splash label={t.signin.loading} />;
  return (
    <AppStoreProvider key={session.user.id} cloud={{ client, account: accountFrom(session, t), initial: load, signOut: () => void signOut() }}>
      {children}
    </AppStoreProvider>
  );
}

function Splash({ label, children }: { label?: string; children?: ReactNode }) {
  return (
    <div className="signin">
      <div className="signin-card" role="status">
        <Brand />
        {label && (
          <p className="muted small" style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 size={15} className="spin" aria-hidden="true" /> {label}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}

function SignIn() {
  const { t } = useI18n();
  useEffect(() => {
    document.title = t.app.docTitle;
  }, [t]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const go = async () => {
    setBusy(true);
    setError(null);
    const { error: e } = await signInWithGoogle();
    if (e) {
      setError(e.message);
      setBusy(false);
    }
  };
  return (
    <div className="signin">
      <main className="signin-card">
        <Brand />
        <div>
          <h1 style={{ fontSize: '1.5rem' }}>{t.signin.headline}</h1>
          <p className="muted small" style={{ marginTop: 8 }}>
            {t.signin.intro}
          </p>
        </div>
        {error && <Notice tone="bad">{t.signin.failed(error)}</Notice>}
        <button type="button" className="btn google-btn" onClick={go} disabled={busy}>
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
            <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
          </svg>
          {busy ? t.signin.opening : t.signin.continue}
        </button>
        <p className="xs faint">{t.signin.privacy}</p>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <LangToggle />
        </div>
      </main>
    </div>
  );
}

function Brand() {
  return (
    <div className="brand" style={{ color: 'var(--ink)', padding: 0, justifyContent: 'center' }}>
      <span className="brand-mark" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M4 2h8l-1 12H5L4 2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M4.4 6h7.2" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </span>
      <span className="brand-name">Brewlab</span>
    </div>
  );
}
