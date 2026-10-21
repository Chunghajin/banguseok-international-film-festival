begin;

create schema g1_private;
revoke all on schema g1_private from public, anon, authenticated;
grant usage on schema g1_private to service_role;

create function g1_private.valid_payload(survey jsonb, selections jsonb, result jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare item jsonb; q text; seen text[] := '{}';
begin
  if jsonb_typeof(survey) <> 'object' or jsonb_typeof(selections) <> 'array'
    or jsonb_typeof(result) <> 'object' then return false; end if;
  if (select count(*) from jsonb_object_keys(survey)) <> 6
    or not survey ?& array['q1','q2','q3','q4','q5','q6'] then return false; end if;
  foreach q in array array['q1','q2','q3','q4','q5'] loop
    if survey->q <> 'null'::jsonb and (jsonb_typeof(survey->q) <> 'number'
      or survey->>q !~ '^[0-4]$') then return false; end if;
  end loop;
  if survey->'q6' <> 'null'::jsonb and (jsonb_typeof(survey->'q6') <> 'string'
    or survey->>'q6' not in ('zero','one_to_five','six_to_twenty','twentyone_to_fifty',
      'fiftyone_to_hundred','hundredone_plus','unknown')) then return false; end if;
  if jsonb_array_length(selections) not between 3 and 6 then return false; end if;
  for item in select value from jsonb_array_elements(selections) loop
    if jsonb_typeof(item) <> 'object' or not item ?& array[
      'category_id','tmdb_id','title','original_title','release_year','poster_path']
      or (select count(*) from jsonb_object_keys(item)) <> 6 then return false; end if;
    if item->>'category_id' not in ('grand','lifetime','sorry','once','dissent','rescue')
      or item->>'category_id' = any(seen)
      or jsonb_typeof(item->'category_id') <> 'string'
      or jsonb_typeof(item->'tmdb_id') <> 'number' or item->>'tmdb_id' !~ '^[1-9][0-9]*$'
      or (item->>'tmdb_id')::numeric > 2147483647
      or jsonb_typeof(item->'title') <> 'string' or length(btrim(item->>'title')) = 0
      then return false; end if;
    if item->'original_title' <> 'null'::jsonb and jsonb_typeof(item->'original_title') <> 'string'
      then return false; end if;
    if item->'release_year' <> 'null'::jsonb and (jsonb_typeof(item->'release_year') <> 'number'
      or item->>'release_year' !~ '^[0-9]{4}$') then return false; end if;
    if item->'poster_path' <> 'null'::jsonb and (jsonb_typeof(item->'poster_path') <> 'string'
      or item->>'poster_path' !~ '^/[A-Za-z0-9_-]+\.(jpg|png|webp)$') then return false; end if;
    seen := array_append(seen, item->>'category_id');
  end loop;
  if not result ?& array['special_award_id','variant_id','special_award_title',
    'award_sentence','selection_sentence','volume_sentence','answered_count','evidence_ids']
    or (select count(*) from jsonb_object_keys(result)) <> 8 then return false; end if;
  foreach q in array array['special_award_id','variant_id','special_award_title','award_sentence','selection_sentence'] loop
    if jsonb_typeof(result->q) <> 'string' or length(result->>q) = 0 then return false; end if;
  end loop;
  if result->>'special_award_id' not in ('consensus','audience','interpretation','credits','secret','sealed','chair')
    or result->>'variant_id' !~ '^(C|A|I|K|S|Z|H)[0-2]$'
    or jsonb_typeof(result->'answered_count') <> 'number'
    or result->>'answered_count' !~ '^[0-5]$'
    or jsonb_typeof(result->'evidence_ids') <> 'array'
    or (result->'volume_sentence' <> 'null'::jsonb and jsonb_typeof(result->'volume_sentence') <> 'string')
    then return false; end if;
  return true;
exception when others then return false;
end $$;
revoke all on function g1_private.valid_payload(jsonb,jsonb,jsonb) from public, anon, authenticated;
grant execute on function g1_private.valid_payload(jsonb,jsonb,jsonb) to service_role;

create table public.festivals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  client_draft_id uuid not null,
  nickname text not null check (length(btrim(nickname)) between 1 and 120 and nickname !~ '[[:cntrl:]]'),
  survey jsonb not null,
  selections jsonb not null,
  result jsonb not null,
  survey_version text not null check (survey_version = 'survey-v1.1'),
  catalog_version text not null check (catalog_version = 'awards-v1.1'),
  rules_version text not null check (rules_version = 'result-v1.1'),
  revision integer not null default 1 check (revision >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, client_draft_id),
  check (g1_private.valid_payload(survey, selections, result))
);
create index festivals_owner_updated on public.festivals(owner_id, updated_at desc);

create table public.festival_shares (
  festival_id uuid primary key references public.festivals(id) on delete cascade,
  token text not null unique check (token ~ '^[A-Za-z0-9_-]{43}$'),
  public_snapshot jsonb not null,
  published_revision integer not null check (published_revision >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.festivals enable row level security;
alter table public.festival_shares enable row level security;
revoke all on public.festivals, public.festival_shares from public, anon, authenticated;
grant select on public.festivals to authenticated;
grant select, insert, update, delete on public.festivals, public.festival_shares to service_role;
create policy owner_read on public.festivals for select to authenticated
  using (owner_id = (select auth.uid()));
-- No client write policies or share policies: deny by default, alongside revoked grants.

create function public.save_festival(
  p_owner uuid, p_draft uuid, p_nickname text, p_survey jsonb, p_selections jsonb,
  p_result jsonb, p_survey_version text, p_catalog_version text, p_rules_version text,
  p_id uuid default null, p_expected_revision integer default null
) returns public.festivals language plpgsql security invoker set search_path = '' as $$
declare f public.festivals; previous_identity jsonb; incoming_identity jsonb;
begin
  if p_owner is null or p_draft is null then raise sqlstate '22023' using message = 'INVALID_INPUT'; end if;
  if p_id is null then
    insert into public.festivals(owner_id,client_draft_id,nickname,survey,selections,result,
      survey_version,catalog_version,rules_version)
    values(p_owner,p_draft,p_nickname,p_survey,p_selections,p_result,p_survey_version,p_catalog_version,p_rules_version)
    on conflict(owner_id,client_draft_id) do nothing returning * into f;
    if found then return f; end if;
    select * into f from public.festivals where owner_id=p_owner and client_draft_id=p_draft for update;
    select jsonb_agg(jsonb_build_array(x->>'category_id',x->'tmdb_id') order by x->>'category_id')
      into previous_identity from jsonb_array_elements(f.selections) x;
    select jsonb_agg(jsonb_build_array(x->>'category_id',x->'tmdb_id') order by x->>'category_id')
      into incoming_identity from jsonb_array_elements(p_selections) x;
    if f.nickname is distinct from p_nickname or f.survey is distinct from p_survey
      or previous_identity is distinct from incoming_identity
      or f.survey_version is distinct from p_survey_version or f.catalog_version is distinct from p_catalog_version
      or f.rules_version is distinct from p_rules_version then
      raise sqlstate 'PT409' using message = 'CONFLICT';
    end if;
    return f;
  end if;
  select * into f from public.festivals where id=p_id and owner_id=p_owner for update;
  if not found then raise sqlstate 'PT404' using message = 'NOT_FOUND'; end if;
  if p_expected_revision is null or f.revision <> p_expected_revision then
    raise sqlstate 'PT409' using message = 'CONFLICT'; end if;
  if f.client_draft_id <> p_draft then raise sqlstate '22023' using message = 'INVALID_DRAFT'; end if;
  update public.festivals set nickname=p_nickname, survey=p_survey, selections=p_selections,
    result=p_result, survey_version=p_survey_version, catalog_version=p_catalog_version,
    rules_version=p_rules_version, revision=revision+1, updated_at=now()
    where id=p_id and owner_id=p_owner returning * into f;
  return f;
end $$;

create function public.publish_festival(p_owner uuid, p_id uuid, p_expected_revision integer,
  p_token text, p_unpublish boolean default false)
returns public.festival_shares language plpgsql security invoker set search_path = '' as $$
declare f public.festivals; s public.festival_shares;
begin
  select * into f from public.festivals where id=p_id and owner_id=p_owner for update;
  if not found then raise sqlstate 'PT404' using message = 'NOT_FOUND'; end if;
  if p_expected_revision is null or f.revision <> p_expected_revision then
    raise sqlstate 'PT409' using message = 'CONFLICT'; end if;
  if p_unpublish then
    delete from public.festival_shares where festival_id=p_id;
    return null;
  end if;
  insert into public.festival_shares(festival_id,token,public_snapshot,published_revision)
  values (f.id,p_token,jsonb_build_object(
    'nickname',f.nickname,'special_award_title',f.result->'special_award_title',
    'award_sentence',f.result->'award_sentence','selection_sentence',f.result->'selection_sentence',
    'volume_sentence',f.result->'volume_sentence','selections',f.selections,
    'awarded_count',jsonb_array_length(f.selections),'brand_version','1.1',
    'created_year',extract(year from f.created_at at time zone 'UTC')::integer),f.revision)
  on conflict(festival_id) do update set public_snapshot=excluded.public_snapshot,
    published_revision=excluded.published_revision, updated_at=now()
  returning * into s;
  return s;
end $$;

revoke all on function public.save_festival(uuid,uuid,text,jsonb,jsonb,jsonb,text,text,text,uuid,integer)
  from public, anon, authenticated;
revoke all on function public.publish_festival(uuid,uuid,integer,text,boolean)
  from public, anon, authenticated;
grant execute on function public.save_festival(uuid,uuid,text,jsonb,jsonb,jsonb,text,text,text,uuid,integer) to service_role;
grant execute on function public.publish_festival(uuid,uuid,integer,text,boolean) to service_role;

commit;
