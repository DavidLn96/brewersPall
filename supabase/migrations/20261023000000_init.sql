-- Brewlab Phase 2 schema.
--
-- Each row belongs to one Supabase Auth user. Row-level security restricts every
-- read and write to the row's owner, so ownership is enforced by the database and
-- never by the browser. The recipe body is stored as JSON (validated in the app with
-- zod); check constraints below reject malformed or oversized documents server-side.

-- Validates the numeric fields the calculation engine depends on.
create or replace function public.brewpal_valid_recipe(d jsonb) returns boolean
language sql immutable as $$
  select jsonb_typeof(d) = 'object'
    and jsonb_typeof(d->'name') = 'string' and char_length(d->>'name') <= 200
    and d->>'method' in ('all-grain', 'biab', 'extract', 'partial-mash')
    and d->>'batchTarget' in ('fermenter', 'kettle')
    and jsonb_typeof(d->'batchVolumeL') = 'number' and (d->>'batchVolumeL')::numeric between 0 and 10000
    and jsonb_typeof(d->'boilMinutes') = 'number' and (d->>'boilMinutes')::numeric between 0 and 1000
    and jsonb_typeof(d->'efficiencyPct') = 'number' and (d->>'efficiencyPct')::numeric between 0 and 100
    and jsonb_typeof(d->'equipment') = 'object'
    and jsonb_typeof(d->'fermentables') = 'array' and jsonb_array_length(d->'fermentables') <= 100
    and jsonb_typeof(d->'hops') = 'array' and jsonb_array_length(d->'hops') <= 100
    and jsonb_typeof(d->'yeasts') = 'array' and jsonb_array_length(d->'yeasts') <= 20
    and jsonb_typeof(d->'miscs') = 'array' and jsonb_array_length(d->'miscs') <= 100
$$;

create table public.recipes (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (char_length(id) between 1 and 100),
  data jsonb not null check (octet_length(data::text) <= 262144 and public.brewpal_valid_recipe(data)),
  name text generated always as (data->>'name') stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index recipes_user_updated_idx on public.recipes (user_id, updated_at desc);

create table public.equipment_profiles (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (char_length(id) between 1 and 100),
  data jsonb not null check (octet_length(data::text) <= 16384 and jsonb_typeof(data) = 'object' and jsonb_typeof(data->'name') = 'string'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data jsonb not null check (octet_length(data::text) <= 8192 and jsonb_typeof(data) = 'object'),
  updated_at timestamptz not null default now()
);

create or replace function public.brewpal_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger recipes_touch before update on public.recipes for each row execute function public.brewpal_touch();
create trigger equipment_touch before update on public.equipment_profiles for each row execute function public.brewpal_touch();
create trigger settings_touch before update on public.user_settings for each row execute function public.brewpal_touch();

alter table public.recipes enable row level security;
alter table public.equipment_profiles enable row level security;
alter table public.user_settings enable row level security;

-- Owner-only access. `(select auth.uid())` is evaluated once per statement.
create policy "owners read recipes" on public.recipes for select to authenticated using (user_id = (select auth.uid()));
create policy "owners insert recipes" on public.recipes for insert to authenticated with check (user_id = (select auth.uid()));
create policy "owners update recipes" on public.recipes for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "owners delete recipes" on public.recipes for delete to authenticated using (user_id = (select auth.uid()));

create policy "owners read equipment" on public.equipment_profiles for select to authenticated using (user_id = (select auth.uid()));
create policy "owners insert equipment" on public.equipment_profiles for insert to authenticated with check (user_id = (select auth.uid()));
create policy "owners update equipment" on public.equipment_profiles for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "owners delete equipment" on public.equipment_profiles for delete to authenticated using (user_id = (select auth.uid()));

create policy "owners read settings" on public.user_settings for select to authenticated using (user_id = (select auth.uid()));
create policy "owners insert settings" on public.user_settings for insert to authenticated with check (user_id = (select auth.uid()));
create policy "owners update settings" on public.user_settings for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Anonymous visitors get nothing.
revoke all on public.recipes, public.equipment_profiles, public.user_settings from anon;
grant select, insert, update, delete on public.recipes, public.equipment_profiles to authenticated;
grant select, insert, update on public.user_settings to authenticated;
