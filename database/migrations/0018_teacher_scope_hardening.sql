-- Statistics Lover: separate teacher read scope from whole-batch management scope.

create or replace function private.has_teacher_batch_manage_access(target_batch uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select
    private.is_active_user()
    and private.has_role('teacher'::public.app_role)
    and exists (
      select 1 from public.teacher_assignments ta
      where ta.teacher_id=auth.uid()
        and ta.batch_id=target_batch
        and ta.subject_id is null
        and private.teacher_assignment_current(ta.is_active,ta.starts_at,ta.ends_at)
    );
$$;

revoke all on function private.has_teacher_batch_manage_access(uuid) from public;
grant execute on function private.has_teacher_batch_manage_access(uuid) to authenticated;

create or replace function private.has_teacher_learning_resource_manage_access(target_resource uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select exists (
    select 1 from public.learning_resources r
    where r.id=target_resource
      and (
        (r.scope='batch'::public.learning_resource_scope and private.has_teacher_batch_manage_access(r.batch_id))
        or (r.scope='subject'::public.learning_resource_scope and private.has_teacher_subject_access(r.subject_id))
        or (r.scope='module'::public.learning_resource_scope and private.has_teacher_module_access(r.module_id))
        or (r.scope='lecture'::public.learning_resource_scope and private.has_teacher_lecture_access(r.lecture_id))
      )
  );
$$;

revoke all on function private.has_teacher_learning_resource_manage_access(uuid) from public;
grant execute on function private.has_teacher_learning_resource_manage_access(uuid) to authenticated;

drop policy if exists learning_resources_insert_teacher on public.learning_resources;
create policy learning_resources_insert_teacher
on public.learning_resources for insert to authenticated
with check (
  (scope='batch'::public.learning_resource_scope and private.has_teacher_batch_manage_access(batch_id))
  or (scope='subject'::public.learning_resource_scope and private.has_teacher_subject_access(subject_id))
  or (scope='module'::public.learning_resource_scope and private.has_teacher_module_access(module_id))
  or (scope='lecture'::public.learning_resource_scope and private.has_teacher_lecture_access(lecture_id))
);

drop policy if exists learning_resources_update_teacher on public.learning_resources;
create policy learning_resources_update_teacher
on public.learning_resources for update to authenticated
using (private.has_teacher_learning_resource_manage_access(id))
with check (
  (scope='batch'::public.learning_resource_scope and private.has_teacher_batch_manage_access(batch_id))
  or (scope='subject'::public.learning_resource_scope and private.has_teacher_subject_access(subject_id))
  or (scope='module'::public.learning_resource_scope and private.has_teacher_module_access(module_id))
  or (scope='lecture'::public.learning_resource_scope and private.has_teacher_lecture_access(lecture_id))
);

drop policy if exists learning_resource_sources_insert_teacher on public.learning_resource_sources;
create policy learning_resource_sources_insert_teacher
on public.learning_resource_sources for insert to authenticated
with check (private.has_teacher_learning_resource_manage_access(resource_id));

drop policy if exists learning_resource_sources_update_teacher on public.learning_resource_sources;
create policy learning_resource_sources_update_teacher
on public.learning_resource_sources for update to authenticated
using (private.has_teacher_learning_resource_manage_access(resource_id))
with check (private.has_teacher_learning_resource_manage_access(resource_id));

create or replace function private.has_teacher_assignment_access(target_assignment uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select exists(
    select 1 from public.assignments a
    where a.id=target_assignment and (
      (a.scope='batch'::public.learning_resource_scope and private.has_teacher_batch_manage_access(a.batch_id))
      or (a.scope='subject'::public.learning_resource_scope and private.has_teacher_subject_access(a.subject_id))
      or (a.scope='module'::public.learning_resource_scope and private.has_teacher_module_access(a.module_id))
      or (a.scope='lecture'::public.learning_resource_scope and private.has_teacher_lecture_access(a.lecture_id))
    )
  );
$$;

drop policy if exists assignments_insert_staff on public.assignments;
create policy assignments_insert_staff
on public.assignments for insert to authenticated
with check (
  (select private.is_active_user()) and (
    (select private.has_any_role(array['content_manager','admin','owner']::public.app_role[]))
    or (scope='batch'::public.learning_resource_scope and private.has_teacher_batch_manage_access(batch_id))
    or (scope='subject'::public.learning_resource_scope and private.has_teacher_subject_access(subject_id))
    or (scope='module'::public.learning_resource_scope and private.has_teacher_module_access(module_id))
    or (scope='lecture'::public.learning_resource_scope and private.has_teacher_lecture_access(lecture_id))
  )
);

drop policy if exists assignments_update_staff on public.assignments;
create policy assignments_update_staff
on public.assignments for update to authenticated
using (
  (select private.is_active_user()) and (
    (select private.has_any_role(array['content_manager','admin','owner']::public.app_role[]))
    or private.has_teacher_assignment_access(id)
  )
)
with check (
  (select private.is_active_user()) and (
    (select private.has_any_role(array['content_manager','admin','owner']::public.app_role[]))
    or (scope='batch'::public.learning_resource_scope and private.has_teacher_batch_manage_access(batch_id))
    or (scope='subject'::public.learning_resource_scope and private.has_teacher_subject_access(subject_id))
    or (scope='module'::public.learning_resource_scope and private.has_teacher_module_access(module_id))
    or (scope='lecture'::public.learning_resource_scope and private.has_teacher_lecture_access(lecture_id))
  )
);
