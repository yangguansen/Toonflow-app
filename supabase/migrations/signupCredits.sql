-- credit_ledger 增加注册赠送类型
alter table public.credit_ledger
  drop constraint if exists credit_ledger_kind_check;

alter table public.credit_ledger
  add constraint creditLedgerKindCheck
  check (kind in ('grant', 'signup', 'reserve', 'settle', 'release'));

-- 每个用户至多一条 signup 流水
create unique index if not exists creditSignupOwnerIndex
on public.credit_ledger (owner_id)
where kind = 'signup';

create or replace function public.grantSignupCredits()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  bonusMicrocredits constant bigint := 500 * 1000000;
begin
  insert into public.credit_ledger (owner_id, kind, amount_microcredits, note)
  values (new.id, 'signup', bonusMicrocredits, '新用户注册赠送')
  on conflict do nothing;

  if found then
    insert into public.credit_wallets (owner_id, balance_microcredits)
    values (new.id, bonusMicrocredits)
    on conflict (owner_id) do update
    set balance_microcredits =
      public.credit_wallets.balance_microcredits + excluded.balance_microcredits;
  end if;

  return new;
end;
$$;

revoke all on function public.grantSignupCredits() from public, anon, authenticated;

drop trigger if exists grantSignupCreditsAfterProfile on public.profiles;

create trigger grantSignupCreditsAfterProfile
after insert on public.profiles
for each row
execute function public.grantSignupCredits();