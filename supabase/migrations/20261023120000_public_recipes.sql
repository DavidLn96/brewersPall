-- Public recipes: every signed-in user can read every recipe.
--
-- Writes stay owner-only (the insert, update and delete policies from the init
-- migration are unchanged). Equipment profiles and settings stay private.
-- Anonymous visitors still have no access.

-- Display name of the recipe's owner, shown on the public list. It is set by the
-- trigger below from the signed-in user's Google profile, never by the browser.
alter table public.recipes add column owner_name text check (char_length(owner_name) <= 200);

-- Fill in names for recipes saved before this migration.
update public.recipes r
set owner_name = left(coalesce(nullif(u.raw_user_meta_data->>'full_name', ''), nullif(u.raw_user_meta_data->>'name', '')), 200)
from auth.users u
where u.id = r.user_id and r.owner_name is null;

create or replace function public.brewpal_set_owner_name() returns trigger
language plpgsql as $$
declare
  meta jsonb := coalesce(auth.jwt() -> 'user_metadata', '{}'::jsonb);
begin
  new.owner_name := left(coalesce(
    nullif(meta->>'full_name', ''),
    nullif(meta->>'name', ''),
    case when tg_op = 'UPDATE' then old.owner_name end
  ), 200);
  return new;
end $$;

create trigger recipes_owner_name before insert or update on public.recipes
for each row execute function public.brewpal_set_owner_name();

drop policy "owners read recipes" on public.recipes;
create policy "signed-in users read all recipes" on public.recipes for select to authenticated using (true);

create index recipes_updated_idx on public.recipes (updated_at desc);
