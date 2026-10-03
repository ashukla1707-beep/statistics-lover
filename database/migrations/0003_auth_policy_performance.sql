-- Statistics Lover: auth/RLS policy performance cleanup
-- Consolidate permissive policies, cache auth.uid() per statement, and index assigned_by.

create index if not exists user_roles_assigned_by_idx
  on public.user_roles(assigned_by);

-- Profiles: one SELECT policy instead of separate self/admin policies.
drop policy if exists profiles_read_self on public.profiles;
drop policy if exists profiles_read_admin on public.profiles;
drop policy if exists profiles_update_self on public.profiles;

create policy profiles_read
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or (
    private.is_active_user()
    and private.has_any_role(array['admin', 'owner']::public.app_role[])
  )
);

create policy profiles_update_self
on public.profiles
for update
to authenticated
using (
  id = (select auth.uid())
  and private.is_active_user()
)
with check (id = (select auth.uid()));

-- Roles: one policy per action while preserving owner/admin differences.
drop policy if exists user_roles_read_self on public.user_roles;
drop policy if exists user_roles_read_admin on public.user_roles;
drop policy if exists user_roles_insert_owner on public.user_roles;
drop policy if exists user_roles_insert_admin on public.user_roles;
drop policy if exists user_roles_delete_owner on public.user_roles;
drop policy if exists user_roles_delete_admin on public.user_roles;

create policy user_roles_read
on public.user_roles
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (
    private.is_active_user()
    and private.has_any_role(array['admin', 'owner']::public.app_role[])
  )
);

create policy user_roles_insert
on public.user_roles
for insert
to authenticated
with check (
  private.is_active_user()
  and (
    (
      private.has_role('owner'::public.app_role)
      and (
        assigned_by = (select auth.uid())
        or assigned_by is null
      )
    )
    or (
      private.has_role('admin'::public.app_role)
      and role = any(
        array['student', 'teacher', 'content_manager']::public.app_role[]
      )
      and assigned_by = (select auth.uid())
    )
  )
);

create policy user_roles_delete
on public.user_roles
for delete
to authenticated
using (
  private.is_active_user()
  and (
    private.has_role('owner'::public.app_role)
    or (
      private.has_role('admin'::public.app_role)
      and role = any(
        array['student', 'teacher', 'content_manager']::public.app_role[]
      )
    )
  )
);
