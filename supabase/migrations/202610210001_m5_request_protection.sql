-- Additive only: G1 tables, RPCs, grants and policies are untouched.
begin;
create table public.request_buckets (
 bucket text not null check (bucket ~ '^[a-f0-9]{64}$'),
 window_start bigint not null,
 used integer not null check (used >= 0),
 expires_at timestamptz not null,
 primary key (bucket, window_start)
);
create index request_buckets_expiry on public.request_buckets(expires_at);
create table public.request_protection_checks (
 environment text not null check (environment in ('preview','production')),
 fingerprint text not null check (fingerprint ~ '^[a-f0-9]{64}$'),
 policy_version text not null check (policy_version = 'm5a-v1'),
 verified_at timestamptz not null default now(),
 primary key (environment, fingerprint)
);
alter table public.request_buckets enable row level security;
alter table public.request_protection_checks enable row level security;
revoke all on public.request_buckets, public.request_protection_checks from public, anon, authenticated;
grant all on public.request_buckets, public.request_protection_checks to service_role;

create function public.consume_request_budget(p_buckets jsonb, p_environment text default null, p_fingerprint text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare b jsonb; n bigint := floor(extract(epoch from clock_timestamp()));
 w integer; lim integer; cost integer; start_at bigint; current_used integer;
 retry integer := 0; k text;
begin
 if p_environment is not null or p_fingerprint is not null then
  if not exists (select 1 from public.request_protection_checks where environment=p_environment
   and fingerprint=p_fingerprint and policy_version='m5a-v1') then
   raise exception using errcode='PT503', message='PROTECTION_UNVERIFIED';
  end if;
 end if;
 if p_buckets is null or jsonb_typeof(p_buckets) <> 'array' then
  raise exception using errcode='22023', message='INVALID_BUDGET';
 end if;
 if jsonb_array_length(p_buckets) not between 1 and 5 then
  raise exception using errcode='22023', message='INVALID_BUDGET';
 end if;
 -- Stable lock order prevents deadlocks when several dimensions are charged together.
 for b in select value from jsonb_array_elements(p_buckets) order by value->>'key' loop
  k:=b->>'key'; w:=(b->>'seconds')::integer; lim:=(b->>'limit')::integer; cost:=(b->>'cost')::integer;
  if k is null or k !~ '^[a-f0-9]{64}$' or w is null or w not between 1 and 86400
   or lim is null or lim not between 1 and 20000 or cost is null or cost not between 1 and 180 or cost > lim then
   raise exception using errcode='22023', message='INVALID_BUDGET';
  end if;
  start_at:=n/w*w;
  insert into public.request_buckets as r(bucket,window_start,used,expires_at)
   values(k,start_at,cost,to_timestamp(n)+interval '24 hours')
   on conflict(bucket,window_start) do update set used=least(r.used+cost,lim+cost)
   returning used into current_used;
  if current_used>lim then retry:=greatest(retry,(start_at+w-n)::integer); end if;
 end loop;
 delete from public.request_buckets where (bucket,window_start) in
  (select bucket,window_start from public.request_buckets where expires_at < clock_timestamp() limit 500);
 return jsonb_build_object('allowed',retry=0,'retry_after',retry,'policy_version','m5a-v1');
end $$;
revoke all on function public.consume_request_budget(jsonb,text,text) from public, anon, authenticated;
grant execute on function public.consume_request_budget(jsonb,text,text) to service_role;
commit;
