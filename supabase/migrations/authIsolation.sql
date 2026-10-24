create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url text not null default '',
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  last_opened_at timestamptz not null default now(),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projectsOwnerIdIndex on public.projects(owner_id, archived_at, last_opened_at desc);

create table if not exists public.user_settings (
  owner_id uuid primary key references public.profiles(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.setUpdatedAt()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists setProfilesUpdatedAt on public.profiles;
create trigger setProfilesUpdatedAt
before update on public.profiles
for each row execute function public.setUpdatedAt();

drop trigger if exists setProjectsUpdatedAt on public.projects;
create trigger setProjectsUpdatedAt
before update on public.projects
for each row execute function public.setUpdatedAt();

drop trigger if exists setUserSettingsUpdatedAt on public.user_settings;
create trigger setUserSettingsUpdatedAt
before update on public.user_settings
for each row execute function public.setUpdatedAt();

create or replace function public.createProfileForUser()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists createProfileAfterSignup on auth.users;
create trigger createProfileAfterSignup
after insert on auth.users
for each row execute function public.createProfileForUser();

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.user_settings enable row level security;

drop policy if exists profilesSelectOwn on public.profiles;
create policy profilesSelectOwn on public.profiles
for select to authenticated
using (id = auth.uid());

drop policy if exists profilesInsertOwn on public.profiles;
create policy profilesInsertOwn on public.profiles
for insert to authenticated
with check (id = auth.uid());

drop policy if exists profilesUpdateOwn on public.profiles;
create policy profilesUpdateOwn on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists projectsSelectOwn on public.projects;
create policy projectsSelectOwn on public.projects
for select to authenticated
using (owner_id = auth.uid());

drop policy if exists projectsInsertOwn on public.projects;
create policy projectsInsertOwn on public.projects
for insert to authenticated
with check (owner_id = auth.uid());

drop policy if exists projectsUpdateOwn on public.projects;
create policy projectsUpdateOwn on public.projects
for update to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists projectsDeleteOwn on public.projects;
create policy projectsDeleteOwn on public.projects
for delete to authenticated
using (owner_id = auth.uid());

drop policy if exists userSettingsSelectOwn on public.user_settings;
create policy userSettingsSelectOwn on public.user_settings
for select to authenticated
using (owner_id = auth.uid());

drop policy if exists userSettingsInsertOwn on public.user_settings;
create policy userSettingsInsertOwn on public.user_settings
for insert to authenticated
with check (owner_id = auth.uid());

drop policy if exists userSettingsUpdateOwn on public.user_settings;
create policy userSettingsUpdateOwn on public.user_settings
for update to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant insert (id, display_name, avatar_url) on public.profiles to authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;

revoke all on public.projects from anon, authenticated;
grant select, insert, update, delete on public.projects to authenticated;

revoke all on public.user_settings from anon, authenticated;
grant select, insert, update on public.user_settings to authenticated;
