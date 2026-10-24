alter table public.ai_usage
add column if not exists provider_job_id text,
add column if not exists output_directory text not null default 'assets/generated',
add column if not exists output_files jsonb,
add column if not exists lease_until timestamptz,
add column if not exists recovery_attempts integer not null default 0,
add column if not exists updated_at timestamptz not null default now();

create index if not exists aiUsageRecoverableVideoIndex
on public.ai_usage(created_at)
where status = 'running' and media_type = 'video' and provider_job_id is not null;

drop trigger if exists setAiUsageUpdatedAt on public.ai_usage;
create trigger setAiUsageUpdatedAt
before update on public.ai_usage
for each row execute function public.setUpdatedAt();

create or replace function public.attach_ai_video_job(
  p_usage_id uuid,
  p_job_id text,
  p_output_directory text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner uuid := auth.uid();
begin
  if v_owner is null then
    raise exception 'AI_CREDITS_UNAUTHORIZED';
  end if;
  if p_job_id is null or char_length(p_job_id) not between 1 and 256 then
    raise exception 'AI_TASK_INVALID_JOB_ID';
  end if;
  if p_output_directory is null or char_length(p_output_directory) not between 1 and 2048 then
    raise exception 'AI_TASK_INVALID_OUTPUT_DIRECTORY';
  end if;

  update public.ai_usage
  set provider_job_id = p_job_id,
      output_directory = p_output_directory,
      updated_at = now()
  where id = p_usage_id
    and owner_id = v_owner
    and media_type = 'video'
    and status = 'running';
  if not found then
    raise exception 'AI_TASK_NOT_FOUND';
  end if;

  return jsonb_build_object('usageId', p_usage_id);
end;
$$;

create or replace function public.claim_ai_video_jobs(
  p_before timestamptz,
  p_limit integer default 20,
  p_lease_seconds integer default 1800
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_result jsonb;
begin
  if auth.role() <> 'service_role' then
    raise exception 'AI_TASK_SERVICE_REQUIRED';
  end if;
  if p_before is null or p_limit is null or p_limit < 1 or p_limit > 100
    or p_lease_seconds is null or p_lease_seconds < 60 or p_lease_seconds > 7200 then
    raise exception 'AI_TASK_INVALID_CLAIM';
  end if;

  with candidates as (
    select id
    from public.ai_usage
    where media_type = 'video'
      and status = 'running'
      and provider_job_id is not null
      and created_at < p_before
      and recovery_attempts < 5
      and (lease_until is null or lease_until <= now())
    order by created_at
    limit p_limit
    for update skip locked
  ),
  claimed as (
    update public.ai_usage u
    set lease_until = now() + make_interval(secs => p_lease_seconds),
        recovery_attempts = u.recovery_attempts + 1,
        updated_at = now()
    from candidates
    where u.id = candidates.id
    returning u.id, u.owner_id, u.project_id, u.provider_id,
      u.model_id, u.provider_job_id, u.output_directory,
      u.estimated_cost_usd_micros, u.recovery_attempts
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', claimed.id,
    'ownerId', claimed.owner_id,
    'projectId', claimed.project_id,
    'providerId', claimed.provider_id,
    'modelId', claimed.model_id,
    'providerJobId', claimed.provider_job_id,
    'outputDirectory', claimed.output_directory,
    'estimatedCostUsdMicros', claimed.estimated_cost_usd_micros,
    'recoveryAttempts', claimed.recovery_attempts
  )), '[]'::jsonb)
  into v_result
  from claimed;

  return v_result;
end;
$$;

create or replace function public.settle_ai_video_job_service(
  p_owner_id uuid,
  p_usage_id uuid,
  p_actual_cost_usd_micros bigint,
  p_charged_microcredits bigint,
  p_output_files jsonb,
  p_provider_generation_id text default null,
  p_is_byok boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status text;
  v_reserved bigint;
  v_delta bigint;
  v_balance bigint;
begin
  if auth.role() <> 'service_role' then
    raise exception 'AI_TASK_SERVICE_REQUIRED';
  end if;
  if p_actual_cost_usd_micros is null or p_actual_cost_usd_micros < 0
    or p_charged_microcredits is null or p_charged_microcredits < 0
    or p_output_files is null or jsonb_typeof(p_output_files) <> 'array' then
    raise exception 'AI_TASK_INVALID_SETTLEMENT';
  end if;

  select status, reserved_microcredits into v_status, v_reserved
  from public.ai_usage
  where id = p_usage_id and owner_id = p_owner_id
  for update;
  if not found then
    raise exception 'AI_TASK_NOT_FOUND';
  end if;

  select balance_microcredits into v_balance
  from public.credit_wallets
  where owner_id = p_owner_id
  for update;

  if v_status <> 'running' then
    return jsonb_build_object('settled', false, 'balanceMicrocredits', v_balance);
  end if;

  v_delta := p_charged_microcredits - v_reserved;

  update public.credit_wallets
  set balance_microcredits = balance_microcredits - v_delta
  where owner_id = p_owner_id
  returning balance_microcredits into v_balance;

  if v_delta <> 0 then
    insert into public.credit_ledger (owner_id, usage_id, kind, amount_microcredits, note)
    values (p_owner_id, p_usage_id, 'settle', -v_delta, 'recovered video');
  end if;

  update public.ai_usage
  set status = 'succeeded',
      actual_cost_usd_micros = p_actual_cost_usd_micros,
      charged_microcredits = p_charged_microcredits,
      provider_generation_id = p_provider_generation_id,
      is_byok = p_is_byok,
      output_files = p_output_files,
      error_code = null,
      lease_until = null,
      finished_at = now()
  where id = p_usage_id;

  return jsonb_build_object('settled', true, 'balanceMicrocredits', v_balance);
end;
$$;

create or replace function public.fail_ai_video_job_service(
  p_owner_id uuid,
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
  v_status text;
  v_reserved bigint;
  v_balance bigint;
begin
  if auth.role() <> 'service_role' then
    raise exception 'AI_TASK_SERVICE_REQUIRED';
  end if;

  select status, reserved_microcredits into v_status, v_reserved
  from public.ai_usage
  where id = p_usage_id and owner_id = p_owner_id
  for update;
  if not found then
    raise exception 'AI_TASK_NOT_FOUND';
  end if;

  select balance_microcredits into v_balance
  from public.credit_wallets
  where owner_id = p_owner_id
  for update;

  if v_status <> 'running' then
    return jsonb_build_object('released', false, 'balanceMicrocredits', v_balance);
  end if;

  update public.credit_wallets
  set balance_microcredits = balance_microcredits + v_reserved
  where owner_id = p_owner_id
  returning balance_microcredits into v_balance;

  insert into public.credit_ledger (owner_id, usage_id, kind, amount_microcredits, note)
  values (p_owner_id, p_usage_id, 'release', v_reserved, 'recovered video failed');

  update public.ai_usage
  set status = 'failed',
      actual_cost_usd_micros = p_actual_cost_usd_micros,
      charged_microcredits = 0,
      error_code = left(coalesce(p_error_code, ''), 200),
      lease_until = null,
      finished_at = now()
  where id = p_usage_id;

  return jsonb_build_object('released', true, 'balanceMicrocredits', v_balance);
end;
$$;

revoke all on function public.attach_ai_video_job(uuid, text, text) from public, anon;
revoke all on function public.claim_ai_video_jobs(timestamptz, integer, integer) from public, anon, authenticated;
revoke all on function public.settle_ai_video_job_service(uuid, uuid, bigint, bigint, jsonb, text, boolean) from public, anon, authenticated;
revoke all on function public.fail_ai_video_job_service(uuid, uuid, bigint, text) from public, anon, authenticated;

grant execute on function public.attach_ai_video_job(uuid, text, text) to authenticated;
grant execute on function public.claim_ai_video_jobs(timestamptz, integer, integer) to service_role;
grant execute on function public.settle_ai_video_job_service(uuid, uuid, bigint, bigint, jsonb, text, boolean) to service_role;
grant execute on function public.fail_ai_video_job_service(uuid, uuid, bigint, text) to service_role;
