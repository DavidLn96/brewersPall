-- RLS and validation checks. Run after stub_supabase.sql and the migration.
\set ON_ERROR_STOP on
insert into auth.users values ('11111111-1111-1111-1111-111111111111', '{"full_name": "Alice Old"}'), ('22222222-2222-2222-2222-222222222222', '{}');

create function pg_temp.recipe(n text) returns jsonb language sql as $$
  select jsonb_build_object('name', n, 'method', 'biab', 'batchTarget', 'fermenter', 'batchVolumeL', 20, 'boilMinutes', 60,
    'efficiencyPct', 70, 'equipment', '{}'::jsonb, 'fermentables', '[]'::jsonb, 'hops', '[]'::jsonb, 'yeasts', '[]'::jsonb, 'miscs', '[]'::jsonb)
$$;

-- Alice writes a recipe. Her name comes from her profile, not from the request body.
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
select set_config('request.jwt.claims', '{"user_metadata": {"full_name": "Alice Brewer"}}', false);
insert into public.recipes (id, data, owner_name) values ('r1', pg_temp.recipe('Alice IPA'), 'Spoofed Name');
do $$ begin assert (select count(*) from public.recipes) = 1, 'alice sees her recipe'; end $$;
do $$ begin assert (select owner_name from public.recipes where id = 'r1') = 'Alice Brewer', 'owner name set from profile'; end $$;

-- Recipes are public to signed-in users: Bob can read Alice's recipe,
-- but cannot change or delete it, and cannot write rows as Alice.
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
select set_config('request.jwt.claims', '{"user_metadata": {}}', false);
do $$ begin assert (select count(*) from public.recipes) = 1, 'bob reads alice recipe'; end $$;
update public.recipes set data = pg_temp.recipe('hacked');
delete from public.recipes;
do $$
begin
  begin
    insert into public.recipes (user_id, id, data) values ('11111111-1111-1111-1111-111111111111', 'r2', pg_temp.recipe('spoof'));
    raise exception 'spoofed insert succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;
-- Same id is fine for Bob: keys are per user.
insert into public.recipes (id, data) values ('r1', pg_temp.recipe('Bob Stout'));

-- Server-side validation rejects bad documents.
do $$
begin
  begin
    insert into public.recipes (id, data) values ('bad', pg_temp.recipe('x') || '{"efficiencyPct": 140}');
    raise exception 'invalid efficiency accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.recipes (id, data) values ('bad2', '"not an object"');
    raise exception 'non-object accepted';
  exception when check_violation then null;
  end;
end $$;

-- Alice's row is untouched.
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
do $$ begin assert (select name from public.recipes where id = 'r1' and user_id = auth.uid()) = 'Alice IPA', 'alice row unchanged'; end $$;
do $$ begin assert (select count(*) from public.recipes) = 2, 'alice reads both recipes'; end $$;

-- Equipment profiles stay private.
insert into public.equipment_profiles (id, data) values ('e1', '{"name": "Alice kettle"}');
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
do $$ begin assert (select count(*) from public.equipment_profiles) = 0, 'bob cannot see alice equipment'; end $$;

-- Anonymous visitors can read recipes, but cannot write them or read anything else.
reset role;
set role anon;
select set_config('request.jwt.claim.sub', '', false);
do $$ begin assert (select count(*) from public.recipes) = 2, 'anon reads all recipes'; end $$;
do $$
begin
  begin
    insert into public.recipes (user_id, id, data) values ('11111111-1111-1111-1111-111111111111', 'r9', pg_temp.recipe('anon'));
    raise exception 'anon insert allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.recipes set data = pg_temp.recipe('anon');
    raise exception 'anon update allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.recipes;
    raise exception 'anon delete allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.equipment_profiles;
    raise exception 'anon equipment read allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.user_settings;
    raise exception 'anon settings read allowed';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select 'RLS tests passed' as result;
