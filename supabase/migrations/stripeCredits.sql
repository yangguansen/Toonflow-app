create table if not exists public.credit_purchases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  stripe_checkout_session_id text not null unique,
  stripe_payment_intent_id text,
  package_id text not null,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null check (currency = 'usd'),
  credits_microcredits bigint not null check (credits_microcredits > 0),
  paid_at timestamptz not null default now()
);

create index if not exists creditPurchasesOwnerPaidIndex
on public.credit_purchases(owner_id, paid_at desc);

alter table public.credit_ledger
  add column if not exists purchase_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'creditLedgerPurchaseIdFkey'
      and conrelid = 'public.credit_ledger'::regclass
  ) then
    alter table public.credit_ledger
      add constraint creditLedgerPurchaseIdFkey
      foreign key (purchase_id) references public.credit_purchases(id) on delete set null;
  end if;
end;
$$;

alter table public.credit_ledger
  drop constraint if exists credit_ledger_kind_check;

alter table public.credit_ledger
  drop constraint if exists creditLedgerKindCheck;

alter table public.credit_ledger
  add constraint creditLedgerKindCheck
  check (kind in ('grant', 'signup', 'purchase', 'reserve', 'settle', 'release'));

alter table public.credit_purchases enable row level security;

drop policy if exists creditPurchasesSelectOwn on public.credit_purchases;
create policy creditPurchasesSelectOwn on public.credit_purchases
for select to authenticated
using (owner_id = auth.uid());

revoke all on public.credit_purchases from anon, authenticated;
grant select on public.credit_purchases to authenticated;

create or replace function public.grant_credit_purchase_service(
  p_owner_id uuid,
  p_stripe_checkout_session_id text,
  p_stripe_payment_intent_id text,
  p_package_id text,
  p_amount_cents integer,
  p_currency text,
  p_credits_microcredits bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_purchase_id uuid;
  v_balance bigint;
begin
  if auth.role() <> 'service_role' then
    raise exception 'AI_CREDITS_SERVICE_REQUIRED';
  end if;

  if p_owner_id is null
    or p_stripe_checkout_session_id is null
    or p_package_id is null
    or p_amount_cents is null
    or p_amount_cents <= 0
    or p_currency is null
    or p_currency <> 'usd'
    or p_credits_microcredits is null
    or p_credits_microcredits <= 0 then
    raise exception 'AI_CREDITS_INVALID_PURCHASE';
  end if;

  if not exists (select 1 from public.profiles where id = p_owner_id) then
    raise exception 'AI_CREDITS_USER_NOT_FOUND';
  end if;

  insert into public.credit_purchases (
    owner_id,
    stripe_checkout_session_id,
    stripe_payment_intent_id,
    package_id,
    amount_cents,
    currency,
    credits_microcredits
  ) values (
    p_owner_id,
    p_stripe_checkout_session_id,
    p_stripe_payment_intent_id,
    p_package_id,
    p_amount_cents,
    p_currency,
    p_credits_microcredits
  )
  on conflict (stripe_checkout_session_id) do nothing
  returning id into v_purchase_id;

  if v_purchase_id is null then
    select balance_microcredits into v_balance
    from public.credit_wallets
    where owner_id = p_owner_id;

    return jsonb_build_object(
      'credited', false,
      'balanceMicrocredits', coalesce(v_balance, 0)
    );
  end if;

  insert into public.credit_wallets (owner_id)
  values (p_owner_id)
  on conflict (owner_id) do nothing;

  update public.credit_wallets
  set balance_microcredits = balance_microcredits + p_credits_microcredits
  where owner_id = p_owner_id
  returning balance_microcredits into v_balance;

  insert into public.credit_ledger (
    owner_id,
    kind,
    amount_microcredits,
    note,
    purchase_id
  ) values (
    p_owner_id,
    'purchase',
    p_credits_microcredits,
    left('Stripe ' || p_stripe_checkout_session_id, 200),
    v_purchase_id
  );

  return jsonb_build_object(
    'credited', true,
    'balanceMicrocredits', v_balance
  );
end;
$$;

revoke all on function public.grant_credit_purchase_service(
  uuid,
  text,
  text,
  text,
  integer,
  text,
  bigint
) from public, anon, authenticated;

grant execute on function public.grant_credit_purchase_service(
  uuid,
  text,
  text,
  text,
  integer,
  text,
  bigint
) to service_role;
