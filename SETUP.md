# Phase 2 setup: Supabase + Google sign-in

About 15 minutes. You need a Supabase account and a Google Cloud account.

## 1. Create the Supabase project
1. supabase.com → New project. Note the project URL and the **anon** key
   (Project Settings → API). Never use the `service_role` key in the app.
2. SQL Editor → paste and run `supabase/migrations/20261023000000_init.sql`.
   (Or with the Supabase CLI: `supabase link` then `supabase db push`.)

## 2. Google OAuth client
1. console.cloud.google.com → APIs & Services → OAuth consent screen: External, add your app name and email.
2. Credentials → Create credentials → OAuth client ID → Web application.
3. Authorized redirect URI: `https://<your-project>.supabase.co/auth/v1/callback`
4. Copy the client ID and secret.

## 3. Turn on Google in Supabase
1. Authentication → Sign In / Providers → Google → enable, paste client ID and secret.
2. Disable the Email provider so Google is the only way in.
3. Authentication → URL Configuration: Site URL = your deployed URL
   (e.g. `https://brewlab.vercel.app`); add `http://localhost:5173` to Redirect URLs for local dev.

## 4. Run locally
```bash
cp .env.example .env.local   # fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

## 5. Deploy (Vercel)
Import the GitHub repo in Vercel (framework: Vite), add the two `VITE_SUPABASE_*`
environment variables, deploy. Put the resulting URL in Supabase's Site URL (step 3.3).

## Security model
- Every table has row-level security: a signed-in user can read and write only rows whose
  `user_id` is their own. The browser never sends `user_id`; Postgres fills it from the session.
- Check constraints reject malformed or oversized recipe documents server-side.
- `npm run test:db` replays the migration on a throwaway Postgres and verifies a second
  user cannot read, change, delete or spoof another user's rows, and anonymous access is refused.

## Without Supabase settings
If the `VITE_SUPABASE_*` variables are missing, the app runs in browser-only mode (Phase 1).
