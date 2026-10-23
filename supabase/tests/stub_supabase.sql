-- Minimal stand-in for Supabase's auth schema so the migration and RLS can be
-- tested on plain Postgres. Mirrors how Supabase derives auth.uid() from the JWT.
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to anon, authenticated;
grant usage on schema public to anon, authenticated;
