-- Statistics Lover: teacher INSERT ... RETURNING RLS compatibility.
-- Keep the same teacher scope boundaries while avoiding self-referential SELECT
-- policies that reject a newly inserted row when PostgREST returns it.

drop policy if exists lectures_read_teacher on public.lectures;
create policy lectures_read_teacher
on public.lectures
for select
to authenticated
using (
  private.has_teacher_module_access(module_id)
);

drop policy if exists assignments_read_staff on public.assignments;
create policy assignments_read_staff
on public.assignments
for select
to authenticated
using (
  (select private.is_active_user())
  and (
    (select private.has_any_role(
      array['content_manager','admin','owner']::public.app_role[]
    ))
    or (
      scope='batch'::public.learning_resource_scope
      and private.has_teacher_batch_manage_access(batch_id)
    )
    or (
      scope='subject'::public.learning_resource_scope
      and private.has_teacher_subject_access(subject_id)
    )
    or (
      scope='module'::public.learning_resource_scope
      and private.has_teacher_module_access(module_id)
    )
    or (
      scope='lecture'::public.learning_resource_scope
      and private.has_teacher_lecture_access(lecture_id)
    )
  )
);
