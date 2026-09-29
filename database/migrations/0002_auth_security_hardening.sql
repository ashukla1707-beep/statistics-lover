-- Statistics Lover: auth/RLS security hardening
-- Keep SECURITY DEFINER helpers outside exposed API schemas and prevent direct RPC access.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.has_role(required_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = required_role
  );
$$;

create or replace function private.has_any_role(required_roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = any(required_roles)
  );
$$;

create or replace function private.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and account_status = 'active'::public.account_status
  );
$$;

revoke all on function private.has_role(public.app_role) from public;
revoke all on function private.has_any_role(public.app_role[]) from public;
revoke all on function private.is_active_user() from public;

grant execute on function private.has_role(public.app_role) to authenticated;
grant execute on function private.has_any_role(public.app_role[]) to authenticated;
grant execute on function private.is_active_user() to authenticated;

-- Recreate policies so they depend on non-exposed helpers.
drop policy if exists profiles_read_admin on public.profiles;
drop policy if exists profiles_update_self on public.profiles;
drop policy if exists user_roles_read_admin on public.user_roles;
drop policy if exists user_roles_insert_owner on public.user_roles;
drop policy if exists user_roles_insert_admin on public.user_roles;
drop policy if exists user_roles_delete_owner on public.user_roles;
drop policy if exists user_roles_delete_admin on public.user_roles;

create policy profiles_read_admin
on public.profiles
for select
to authenticated
using (
  private.is_active_user()
  and private.has_any_role(array['admin', 'owner']::public.app_role[])
);

create policy profiles_update_self
on public.profiles
for update
to authenticated
using (id = auth.uid() and private.is_active_user())
with check (id = auth.uid());

create policy user_roles_read_admin
on public.user_roles
for select
to authenticated
using (
  private.is_active_user()
  and private.has_any_role(array['admin', 'owner']::public.app_role[])
);

create policy user_roles_insert_owner
on public.user_roles
for insert
to authenticated
with check (
  private.is_active_user()
  and private.has_role('owner'::public.app_role)
  and (assigned_by = auth.uid() or assigned_by is null)
);

create policy user_roles_insert_admin
on public.user_roles
for insert
to authenticated
with check (
  private.is_active_user()
  and private.has_role('admin'::public.app_role)
  and role = any(array['student', 'teacher', 'content_manager']::public.app_role[])
  and assigned_by = auth.uid()
);

create policy user_roles_delete_owner
on public.user_roles
for delete
to authenticated
using (
  private.is_active_user()
  and private.has_role('owner'::public.app_role)
);

create policy user_roles_delete_admin
on public.user_roles
for delete
to authenticated
using (
  private.is_active_user()
  and private.has_role('admin'::public.app_role)
  and role = any(array['student', 'teacher', 'content_manager']::public.app_role[])
);

-- Remove the now-unused exposed helper RPCs.
revoke all on function public.has_role(public.app_role, uuid) from public, anon, authenticated;
revoke all on function public.has_any_role(public.app_role[], uuid) from public, anon, authenticated;
revoke all on function public.is_active_user(uuid) from public, anon, authenticated;

drop function public.has_role(public.app_role, uuid);
drop function public.has_any_role(public.app_role[], uuid);
drop function public.is_active_user(uuid);

-- Supabase Automatic RLS creates this SECURITY DEFINER helper in public.
-- Event-trigger execution does not require anon/authenticated RPC access.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
