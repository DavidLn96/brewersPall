import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { AppStoreProvider } from './store/AppStore';
import { supabase } from './cloud/client';
import { CloudRoot } from './cloud/CloudRoot';
import './styles.css';

// With Supabase settings the app requires Google sign-in and saves to the account.
// Without them it runs in browser-only mode.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {supabase ? (
      <CloudRoot>
        <App />
      </CloudRoot>
    ) : (
      <AppStoreProvider>
        <App />
      </AppStoreProvider>
    )}
  </StrictMode>,
);
