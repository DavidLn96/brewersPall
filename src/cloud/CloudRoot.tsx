import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';
import { signInWithGoogle, signOut, supabase } from './client';
import { loadCloud, type CloudLoad } from './sync';
import { AppStoreProvider, type Account } from '../store/AppStore';
import { Notice } from '../ui/common';
import { useI18n, type Dict } from '../i18n';

function accountFrom(session: Session, t: Dict): Account {
  const u = session.user;
  const meta = (u.user_metadata ?? {}) as { full_name?: string; name?: string; avatar_url?: string; picture?: string };
  return { id: u.id, email: u.email ?? '', name: meta.full_name || meta.name || u.email || t.signin.defaultName, avatarUrl: meta.avatar_url || meta.picture };
}

/**
 * Visitors who are not signed in use the app with drafts kept in this browser and can
 * read public recipes. After Google sign-in, the user's data is loaded and saved to the account.
 */
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
  const guestSignIn = useCallback(async () => {
    const { error } = await signInWithGoogle();
    return error ? error.message : null;
  }, []);
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
  if (!session)
    return (
      <AppStoreProvider key="guest" signIn={guestSignIn}>
        {children}
      </AppStoreProvider>
    );
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
