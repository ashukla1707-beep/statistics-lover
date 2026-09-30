-- Statistics Lover: allow enrolled students to resolve their parent course safely.

create or replace function private.has_course_access(target_course uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.is_active_user()
    and exists (
      select 1
      from public.enrollments e
      join public.batches b on b.id = e.batch_id
      where e.student_id = auth.uid()
        and b.course_id = target_course
        and e.status in (
          'active'::public.enrollment_status,
          'completed'::public.enrollment_status
        )
        and (e.access_starts_at is null or e.access_starts_at <= now())
        and (e.access_ends_at is null or e.access_ends_at > now())
    );
$$;

revoke all on function private.has_course_access(uuid) from public;
grant execute on function private.has_course_access(uuid) to authenticated;

drop policy if exists courses_read_authenticated on public.courses;

create policy courses_read_authenticated
on public.courses
for select
to authenticated
using (
  status = 'published'::public.course_status
  or (
    (select private.is_active_user())
    and (select private.has_any_role(
      array['content_manager', 'admin', 'owner']::public.app_role[]
    ))
  )
  or private.has_course_access(id)
);

comment on function private.has_course_access(uuid) is
  'Authorization helper allowing an active enrolled student to resolve the parent course for an accessible batch.';
