-- Statistics Lover: authentication and role foundation
-- Apply through the normal Supabase migration workflow. Do not edit production manually.

create type public.app_role as enum (
  'student',
  'teacher',
  'content_manager',
  'admin',
  'owner'
);

create type public.account_status as enum ('active', 'suspended');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  avatar_url text,
  account_status public.account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_full_name_length check (
    full_name is null or char_length(full_name) <= 120
  ),
  constraint profiles_phone_length check (
    phone is null or char_length(phone) <= 24
  )
);

create table public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  assigned_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create index user_roles_role_idx on public.user_roles(role);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'phone'), '')
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role, assigned_by)
  values (new.id, 'student'::public.app_role, null)
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

create trigger auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create or replace function public.handle_auth_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set email = new.email
  where id = new.id;

  return new;
end;
$$;

create trigger auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_auth_user_email_change();

create or replace function public.has_role(
  required_role public.app_role,
  subject uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = subject
      and role = required_role
  );
$$;

create or replace function public.has_any_role(
  required_roles public.app_role[],
  subject uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = subject
      and role = any(required_roles)
  );
$$;

create or replace function public.is_active_user(subject uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = subject
      and account_status = 'active'::public.account_status
  );
$$;

revoke all on function public.set_updated_at() from public;
revoke all on function public.handle_new_auth_user() from public;
revoke all on function public.handle_auth_user_email_change() from public;
revoke all on function public.has_role(public.app_role, uuid) from public;
revoke all on function public.has_any_role(public.app_role[], uuid) from public;
revoke all on function public.is_active_user(uuid) from public;

grant execute on function public.has_role(public.app_role, uuid) to authenticated;
grant execute on function public.has_any_role(public.app_role[], uuid) to authenticated;
grant execute on function public.is_active_user(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (full_name, phone, avatar_url) on table public.profiles to authenticated;

create policy profiles_read_self
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy profiles_read_admin
on public.profiles
for select
to authenticated
using (
  public.is_active_user()
  and public.has_any_role(
    array['admin', 'owner']::public.app_role[]
  )
);

create policy profiles_update_self
on public.profiles
for update
to authenticated
using (id = auth.uid() and public.is_active_user())
with check (id = auth.uid());

revoke all on table public.user_roles from anon, authenticated;
grant select, insert, delete on table public.user_roles to authenticated;

create policy user_roles_read_self
on public.user_roles
for select
to authenticated
using (user_id = auth.uid());

create policy user_roles_read_admin
on public.user_roles
for select
to authenticated
using (
  public.is_active_user()
  and public.has_any_role(
    array['admin', 'owner']::public.app_role[]
  )
);

create policy user_roles_insert_owner
on public.user_roles
for insert
to authenticated
with check (
  public.is_active_user()
  and public.has_role('owner'::public.app_role)
  and (assigned_by = auth.uid() or assigned_by is null)
);

create policy user_roles_insert_admin
on public.user_roles
for insert
to authenticated
with check (
  public.is_active_user()
  and public.has_role('admin'::public.app_role)
  and role = any(
    array['student', 'teacher', 'content_manager']::public.app_role[]
  )
  and assigned_by = auth.uid()
);

create policy user_roles_delete_owner
on public.user_roles
for delete
to authenticated
using (public.is_active_user() and public.has_role('owner'::public.app_role));

create policy user_roles_delete_admin
on public.user_roles
for delete
to authenticated
using (
  public.is_active_user()
  and public.has_role('admin'::public.app_role)
  and role = any(
    array['student', 'teacher', 'content_manager']::public.app_role[]
  )
);

comment on table public.profiles is
  'Application profile linked one-to-one with Supabase auth.users.';
comment on table public.user_roles is
  'Server-authoritative role assignments. Frontend role checks are UX only.';
