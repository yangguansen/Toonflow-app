create table if not exists public.credit_wallets (
  owner_id uuid primary key references public.profiles(id) on delete cascade,
  balance_microcredits bigint not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_usage (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  media_type text not null check (media_type in ('image', 'video', 'audio')),
  provider_id text not null,
  model_id text not null,
  status text not null default 'running' check (status in ('running', 'succeeded', 'failed')),
  estimated_cost_usd_micros bigint not null default 0 check (estimated_cost_usd_micros >= 0),
  actual_cost_usd_micros bigint check (actual_cost_usd_micros >= 0),
  reserved_microcredits bigint not null default 0 check (reserved_microcredits >= 0),
  charged_microcredits bigint not null default 0 check (charged_microcredits >= 0),
  provider_generation_id text,
  is_byok boolean,
  error_code text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  usage_id uuid references public.ai_usage(id) on delete set null,
  kind text not null check (kind in ('grant', 'reserve', 'settle', 'release')),
  amount_microcredits bigint not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists aiUsageOwnerCreatedIndex
on public.ai_usage(owner_id, created_at desc);

create index if not exists aiUsageProjectCreatedIndex
on public.ai_usage(project_id, created_at desc);

create index if not exists creditLedgerOwnerCreatedIndex
on public.credit_ledger(owner_id, created_at desc);

drop trigger if exists setCreditWalletsUpdatedAt on public.credit_wallets;
create trigger setCreditWalletsUpdatedAt
before update on public.credit_wallets
for each row execute function public.setUpdatedAt();

alter table public.credit_wallets enable row level security;
alter table public.ai_usage enable row level security;
alter table public.credit_ledger enable row level security;

drop policy if exists creditWalletsSelectOwn on public.credit_wallets;
create policy creditWalletsSelectOwn on public.credit_wallets
for select to authenticated
using (owner_id = auth.uid());

drop policy if exists aiUsageSelectOwn on public.ai_usage;
create policy aiUsageSelectOwn on public.ai_usage
for select to authenticated
using (owner_id = auth.uid());

drop policy if exists creditLedgerSelectOwn on public.credit_ledger;
create policy creditLedgerSelectOwn on public.credit_ledger
for select to authenticated
using (owner_id = auth.uid());

revoke all on public.credit_wallets from anon, authenticated;
grant select on public.credit_wallets to authenticated;

revoke all on public.ai_usage from anon, authenticated;
grant select on public.ai_usage to authenticated;

revoke all on public.credit_ledger from anon, authenticated;
grant select on public.credit_ledger to authenticated;

create or replace function public.reserve_ai_usage(
  p_usage_id uuid,
  p_project_id uuid,
  p_media_type text,
  p_provider_id text,
  p_model_id text,
  p_estimated_cost_usd_micros bigint,
  p_reserved_microcredits bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner uuid := auth.uid();
  v_balance bigint;
begin
  if v_owner is null then
    raise exception 'AI_CREDITS_UNAUTHORIZED';
  end if;
  if p_usage_id is null or p_reserved_microcredits is null or p_reserved_microcredits <= 0 then
    raise exception 'AI_CREDITS_INVALID_RESERVATION';
  end if;
  if p_estimated_cost_usd_micros is null or p_estimated_cost_usd_micros < 0 then
    raise exception 'AI_CREDITS_INVALID_COST';
  end if;
  if p_project_id is not null and not exists (
    select 1 from public.projects where id = p_project_id and owner_id = v_owner
  ) then
    raise exception 'AI_CREDITS_PROJECT_NOT_FOUND';
  end if;

  insert into public.credit_wallets (owner_id)
  values (v_owner)
  on conflict (owner_id) do nothing;

  select balance_microcredits into v_balance
  from public.credit_wallets
  where owner_id = v_owner
  for update;

  if v_balance < p_reserved_microcredits then
    raise exception 'AI_CREDITS_INSUFFICIENT';
  end if;

  insert into public.ai_usage (
    id, owner_id, project_id, media_type, provider_id, model_id,
    estimated_cost_usd_micros, reserved_microcredits
  ) values (
    p_usage_id, v_owner, p_project_id, p_media_type, p_provider_id, p_model_id,
    p_estimated_cost_usd_micros, p_reserved_microcredits
  );

  update public.credit_wallets
  set balance_microcredits = balance_microcredits - p_reserved_microcredits
  where owner_id = v_owner;

  insert into public.credit_ledger (owner_id, usage_id, kind, amount_microcredits)
  values (v_owner, p_usage_id, 'reserve', -p_reserved_microcredits);

  return jsonb_build_object(
    'balanceMicrocredits', v_balance - p_reserved_microcredits,
    'reservedMicrocredits', p_reserved_microcredits
  );
end;
$$;

create or replace function public.settle_ai_usage(
  p_usage_id uuid,
  p_actual_cost_usd_micros bigint,
  p_charged_microcredits bigint,
  p_provider_generation_id text default null,
  p_is_byok boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner uuid := auth.uid();
  v_status text;
  v_reserved bigint;
  v_charged bigint;
  v_delta bigint;
  v_balance bigint;
begin
  if v_owner is null then
    raise exception 'AI_CREDITS_UNAUTHORIZED';
  end if;
  if p_actual_cost_usd_micros is null or p_actual_cost_usd_micros < 0
    or p_charged_microcredits is null or p_charged_microcredits < 0 then
    raise exception 'AI_CREDITS_INVALID_SETTLEMENT';
  end if;

  select status, reserved_microcredits into v_status, v_reserved
  from public.ai_usage
  where id = p_usage_id and owner_id = v_owner
  for update;
  if not found then
    raise exception 'AI_CREDITS_USAGE_NOT_FOUND';
  end if;

  select balance_microcredits into v_balance
  from public.credit_wallets
  where owner_id = v_owner
  for update;

  if v_status <> 'running' then
    return jsonb_build_object('balanceMicrocredits', v_balance, 'settled', false);
  end if;

  v_charged := p_charged_microcredits;
  v_delta := v_charged - v_reserved;

  update public.credit_wallets
  set balance_microcredits = balance_microcredits - v_delta
  where owner_id = v_owner
  returning balance_microcredits into v_balance;

  if v_delta <> 0 then
    insert into public.credit_ledger (owner_id, usage_id, kind, amount_microcredits)
    values (v_owner, p_usage_id, 'settle', -v_delta);
  end if;

  update public.ai_usage
  set status = 'succeeded',
      actual_cost_usd_micros = p_actual_cost_usd_micros,
      charged_microcredits = v_charged,
      provider_generation_id = p_provider_generation_id,
      is_byok = p_is_byok,
      error_code = null,
      finished_at = now()
  where id = p_usage_id;

  return jsonb_build_object('balanceMicrocredits', v_balance, 'settled', true);
end;
$$;

create or replace function public.fail_ai_usage(
  p_usage_id uuid,
  p_actual_cost_usd_micros bigint default null,
  p_error_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner uuid := auth.uid();
  v_status text;
  v_reserved bigint;
  v_balance bigint;
begin
  if v_owner is null then
    raise exception 'AI_CREDITS_UNAUTHORIZED';
  end if;
  if p_actual_cost_usd_micros is not null and p_actual_cost_usd_micros < 0 then
    raise exception 'AI_CREDITS_INVALID_COST';
  end if;

  select status, reserved_microcredits into v_status, v_reserved
  from public.ai_usage
  where id = p_usage_id and owner_id = v_owner
  for update;
  if not found then
    raise exception 'AI_CREDITS_USAGE_NOT_FOUND';
  end if;

  select balance_microcredits into v_balance
  from public.credit_wallets
  where owner_id = v_owner
  for update;

  if v_status <> 'running' then
    return jsonb_build_object('balanceMicrocredits', v_balance, 'settled', false);
  end if;

  update public.credit_wallets
  set balance_microcredits = balance_microcredits + v_reserved
  where owner_id = v_owner
  returning balance_microcredits into v_balance;

  insert into public.credit_ledger (owner_id, usage_id, kind, amount_microcredits)
  values (v_owner, p_usage_id, 'release', v_reserved);

  update public.ai_usage
  set status = 'failed',
      actual_cost_usd_micros = p_actual_cost_usd_micros,
      charged_microcredits = 0,
      error_code = left(coalesce(p_error_code, ''), 200),
      finished_at = now()
  where id = p_usage_id;

  return jsonb_build_object('balanceMicrocredits', v_balance, 'settled', true);
end;
$$;

create or replace function public.grant_ai_credits(
  p_owner_id uuid,
  p_microcredits bigint,
  p_note text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin uuid := auth.uid();
  v_balance bigint;
begin
  if v_admin is null or not exists (
    select 1 from public.profiles where id = v_admin and role = 'admin'
  ) then
    raise exception 'AI_CREDITS_ADMIN_REQUIRED';
  end if;
  if p_owner_id is null or p_microcredits is null or p_microcredits <= 0 then
    raise exception 'AI_CREDITS_INVALID_GRANT';
  end if;
  if not exists (select 1 from public.profiles where id = p_owner_id) then
    raise exception 'AI_CREDITS_USER_NOT_FOUND';
  end if;

  insert into public.credit_wallets (owner_id)
  values (p_owner_id)
  on conflict (owner_id) do nothing;

  update public.credit_wallets
  set balance_microcredits = balance_microcredits + p_microcredits
  where owner_id = p_owner_id
  returning balance_microcredits into v_balance;

  insert into public.credit_ledger (owner_id, kind, amount_microcredits, note)
  values (p_owner_id, 'grant', p_microcredits, left(coalesce(p_note, ''), 200));

  return jsonb_build_object('balanceMicrocredits', v_balance);
end;
$$;

create or replace function public.release_stale_ai_usage(
  p_max_age_seconds integer default 86400
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner uuid := auth.uid();
  v_released bigint := 0;
  v_count integer := 0;
  v_usage public.ai_usage%rowtype;
begin
  if v_owner is null then
    raise exception 'AI_CREDITS_UNAUTHORIZED';
  end if;
  if p_max_age_seconds is null or p_max_age_seconds < 300 or p_max_age_seconds > 604800 then
    raise exception 'AI_CREDITS_INVALID_MAX_AGE';
  end if;

  for v_usage in
    select * from public.ai_usage
    where owner_id = v_owner
      and status = 'running'
      and created_at <= now() - make_interval(secs => p_max_age_seconds)
    for update skip locked
  loop
    update public.credit_wallets
    set balance_microcredits = balance_microcredits + v_usage.reserved_microcredits
    where owner_id = v_owner;

    insert into public.credit_ledger (owner_id, usage_id, kind, amount_microcredits, note)
    values (v_owner, v_usage.id, 'release', v_usage.reserved_microcredits, 'stale task');

    update public.ai_usage
    set status = 'failed',
        charged_microcredits = 0,
        error_code = 'STALE_TASK',
        finished_at = now()
    where id = v_usage.id;

    v_released := v_released + v_usage.reserved_microcredits;
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('releasedMicrocredits', v_released, 'releasedCount', v_count);
end;
$$;

revoke all on function public.reserve_ai_usage(uuid, uuid, text, text, text, bigint, bigint) from public, anon;
revoke all on function public.settle_ai_usage(uuid, bigint, bigint, text, boolean) from public, anon;
revoke all on function public.fail_ai_usage(uuid, bigint, text) from public, anon;
revoke all on function public.grant_ai_credits(uuid, bigint, text) from public, anon;
revoke all on function public.release_stale_ai_usage(integer) from public, anon;

grant execute on function public.reserve_ai_usage(uuid, uuid, text, text, text, bigint, bigint) to authenticated;
grant execute on function public.settle_ai_usage(uuid, bigint, bigint, text, boolean) to authenticated;
grant execute on function public.fail_ai_usage(uuid, bigint, text) to authenticated;
grant execute on function public.grant_ai_credits(uuid, bigint, text) to authenticated;
grant execute on function public.release_stale_ai_usage(integer) to authenticated;
