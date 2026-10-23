-- RLS and validation checks. Run after stub_supabase.sql and the migration.
\set ON_ERROR_STOP on
insert into auth.users values ('11111111-1111-1111-1111-111111111111'), ('22222222-2222-2222-2222-222222222222');

create function pg_temp.recipe(n text) returns jsonb language sql as $$
  select jsonb_build_object('name', n, 'method', 'biab', 'batchTarget', 'fermenter', 'batchVolumeL', 20, 'boilMinutes', 60,
    'efficiencyPct', 70, 'equipment', '{}'::jsonb, 'fermentables', '[]'::jsonb, 'hops', '[]'::jsonb, 'yeasts', '[]'::jsonb, 'miscs', '[]'::jsonb)
$$;

-- Alice writes a recipe.
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
insert into public.recipes (id, data) values ('r1', pg_temp.recipe('Alice IPA'));
do $$ begin assert (select count(*) from public.recipes) = 1, 'alice sees her recipe'; end $$;

-- Bob cannot see, change or delete it, and cannot write rows as Alice.
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
do $$ begin assert (select count(*) from public.recipes) = 0, 'bob sees nothing'; end $$;
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
do $$ begin assert (select name from public.recipes where id = 'r1') = 'Alice IPA', 'alice row unchanged'; end $$;

-- Anonymous visitors cannot read anything.
reset role;
set role anon;
do $$
begin
  begin
    perform 1 from public.recipes;
    raise exception 'anon read allowed';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select 'RLS tests passed' as result;
