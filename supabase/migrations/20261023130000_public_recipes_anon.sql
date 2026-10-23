-- Public recipes are visible without signing in.
--
-- Anonymous visitors may read recipes only. Every write still needs a signed-in
-- owner (anon has no insert, update or delete grant), and equipment profiles and
-- settings stay private to their owner.

grant select on public.recipes to anon;

drop policy "signed-in users read all recipes" on public.recipes;
create policy "anyone reads recipes" on public.recipes for select to anon, authenticated using (true);
