import { useState } from 'react';
import { LogIn } from 'lucide-react';
import { useStore } from '../store/AppStore';
import { useI18n } from '../i18n';
import { Toast } from './common';

/** Google sign-in for visitors. Renders nothing once signed in or when accounts are not configured. */
export function SignInButton({ label, className = 'btn btn-primary btn-sm' }: { label?: string; className?: string }) {
  const { signIn } = useStore();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!signIn) return null;
  const go = async () => {
    setBusy(true);
    const e = await signIn();
    // On success the browser leaves for Google, so only failures come back here.
    if (e) {
      setError(t.signin.failed(e));
      setBusy(false);
    }
  };
  return (
    <>
      <button type="button" className={className} onClick={go} disabled={busy} title={t.app.signInTitle}>
        <LogIn size={14} aria-hidden="true" /> {busy ? t.signin.opening : (label ?? t.app.signIn)}
      </button>
      {error && <Toast message={error} onDone={() => setError(null)} />}
    </>
  );
}
