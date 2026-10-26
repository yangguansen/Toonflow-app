drop function if exists public.settle_ai_usage(uuid, bigint, bigint, text, boolean);

create or replace function public.settle_ai_usage(
  p_usage_id uuid,
  p_actual_cost_usd_micros bigint,
  p_charged_microcredits bigint,
  p_provider_generation_id text default null,
  p_is_byok boolean default null,
  p_output_files jsonb default null
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
    or p_charged_microcredits is null or p_charged_microcredits < 0
    or (p_output_files is not null and (
      jsonb_typeof(p_output_files) <> 'array'
      or jsonb_array_length(p_output_files) = 0
    )) then
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
      output_files = coalesce(p_output_files, output_files),
      error_code = null,
      finished_at = now()
  where id = p_usage_id;

  return jsonb_build_object('balanceMicrocredits', v_balance, 'settled', true);
end;
$$;

revoke all on function public.settle_ai_usage(uuid, bigint, bigint, text, boolean, jsonb) from public, anon;
grant execute on function public.settle_ai_usage(uuid, bigint, bigint, text, boolean, jsonb) to authenticated;
