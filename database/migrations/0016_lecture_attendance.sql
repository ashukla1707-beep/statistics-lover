-- Statistics Lover: lecture attendance

create type public.attendance_status as enum ('present','absent','late','excused');

create table public.lecture_attendance (
  id uuid primary key default gen_random_uuid(),
  lecture_id uuid not null references public.lectures(id) on delete cascade,
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  status public.attendance_status not null,
  note text,
  marked_by uuid references public.profiles(id) on delete set null default auth.uid(),
  marked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lecture_attendance_lecture_enrollment_key unique (lecture_id,enrollment_id),
  constraint lecture_attendance_note_length check (note is null or char_length(note) <= 500)
);

create index lecture_attendance_lecture_idx on public.lecture_attendance(lecture_id);
create index lecture_attendance_enrollment_idx on public.lecture_attendance(enrollment_id);
create index lecture_attendance_status_idx on public.lecture_attendance(status);

create trigger lecture_attendance_set_updated_at before update on public.lecture_attendance
for each row execute function public.set_updated_at();

create or replace function private.validate_lecture_attendance()
returns trigger language plpgsql security definer set search_path='' as $$
declare lecture_batch uuid; enrollment_batch uuid;
begin
  select s.batch_id into lecture_batch
  from public.lectures l join public.modules m on m.id=l.module_id join public.subjects s on s.id=m.subject_id
  where l.id=new.lecture_id;

  select e.batch_id into enrollment_batch from public.enrollments e where e.id=new.enrollment_id;

  if lecture_batch is null or enrollment_batch is null or lecture_batch<>enrollment_batch then
    raise exception 'Attendance enrollment must belong to the lecture batch';
  end if;

  new.marked_at=now();
  new.marked_by=auth.uid();
  return new;
end;
$$;

revoke all on function private.validate_lecture_attendance() from public;

create trigger lecture_attendance_validate
before insert or update of lecture_id,enrollment_id,status,note on public.lecture_attendance
for each row execute function private.validate_lecture_attendance();

alter table public.lecture_attendance enable row level security;
revoke all on table public.lecture_attendance from anon,authenticated;
grant select,insert,update,delete on table public.lecture_attendance to authenticated,service_role;
grant usage on type public.attendance_status to authenticated,service_role;

create policy lecture_attendance_read_student on public.lecture_attendance for select to authenticated using (
  (select private.is_active_user())
  and exists(select 1 from public.enrollments e where e.id=enrollment_id and e.student_id=(select auth.uid()))
);
create policy lecture_attendance_read_staff on public.lecture_attendance for select to authenticated using (
  (select private.is_active_user())
  and ((select private.has_any_role(array['admin','owner']::public.app_role[])) or private.has_teacher_lecture_access(lecture_id))
);
create policy lecture_attendance_insert_staff on public.lecture_attendance for insert to authenticated with check (
  (select private.is_active_user())
  and ((select private.has_any_role(array['admin','owner']::public.app_role[])) or private.has_teacher_lecture_access(lecture_id))
);
create policy lecture_attendance_update_staff on public.lecture_attendance for update to authenticated using (
  (select private.is_active_user())
  and ((select private.has_any_role(array['admin','owner']::public.app_role[])) or private.has_teacher_lecture_access(lecture_id))
) with check (
  (select private.is_active_user())
  and ((select private.has_any_role(array['admin','owner']::public.app_role[])) or private.has_teacher_lecture_access(lecture_id))
);
create policy lecture_attendance_delete_admin on public.lecture_attendance for delete to authenticated using (
  (select private.is_active_user()) and (select private.has_any_role(array['admin','owner']::public.app_role[]))
);

create or replace function private.get_attendance_roster(target_lecture uuid)
returns table (
  enrollment_id uuid, student_id uuid, full_name text, email text, attendance_id uuid,
  attendance_status public.attendance_status, note text, marked_at timestamptz
)
language sql stable security definer set search_path='' as $$
  with lecture_context as (
    select l.id,l.scheduled_at,s.batch_id
    from public.lectures l
    join public.modules m on m.id=l.module_id
    join public.subjects s on s.id=m.subject_id
    where l.id=target_lecture
      and (private.has_any_role(array['admin','owner']::public.app_role[]) or private.has_teacher_lecture_access(l.id))
  )
  select e.id,e.student_id,p.full_name,p.email,a.id,a.status,a.note,a.marked_at
  from lecture_context lc
  join public.enrollments e on e.batch_id=lc.batch_id
  join public.profiles p on p.id=e.student_id
  left join public.lecture_attendance a on a.lecture_id=lc.id and a.enrollment_id=e.id
  where e.status in ('active'::public.enrollment_status,'completed'::public.enrollment_status)
    and (e.access_starts_at is null or e.access_starts_at<=coalesce(lc.scheduled_at,now()))
    and (e.access_ends_at is null or e.access_ends_at>coalesce(lc.scheduled_at,now()))
  order by coalesce(p.full_name,p.email,'');
$$;

revoke all on function private.get_attendance_roster(uuid) from public;
grant execute on function private.get_attendance_roster(uuid) to authenticated;

create or replace function public.get_attendance_roster(target_lecture uuid)
returns table (
  enrollment_id uuid, student_id uuid, full_name text, email text, attendance_id uuid,
  attendance_status public.attendance_status, note text, marked_at timestamptz
)
language sql stable security invoker set search_path='' as $$
  select * from private.get_attendance_roster(target_lecture);
$$;

revoke all on function public.get_attendance_roster(uuid) from public;
grant execute on function public.get_attendance_roster(uuid) to authenticated;

create or replace function private.get_my_batch_attendance(target_batch uuid)
returns table (
  lecture_id uuid, lecture_title text, subject_title text, module_title text, scheduled_at timestamptz,
  attendance_status public.attendance_status, note text, marked_at timestamptz
)
language sql stable security definer set search_path='' as $$
  select l.id,l.title,s.title,m.title,l.scheduled_at,a.status,a.note,a.marked_at
  from public.enrollments e
  join public.lecture_attendance a on a.enrollment_id=e.id
  join public.lectures l on l.id=a.lecture_id
  join public.modules m on m.id=l.module_id
  join public.subjects s on s.id=m.subject_id
  where e.student_id=auth.uid()
    and e.batch_id=target_batch
    and e.status in ('active'::public.enrollment_status,'completed'::public.enrollment_status)
    and private.is_active_user()
  order by coalesce(l.scheduled_at,a.marked_at) desc;
$$;

revoke all on function private.get_my_batch_attendance(uuid) from public;
grant execute on function private.get_my_batch_attendance(uuid) to authenticated;

create or replace function public.get_my_batch_attendance(target_batch uuid)
returns table (
  lecture_id uuid, lecture_title text, subject_title text, module_title text, scheduled_at timestamptz,
  attendance_status public.attendance_status, note text, marked_at timestamptz
)
language sql stable security invoker set search_path='' as $$
  select * from private.get_my_batch_attendance(target_batch);
$$;

revoke all on function public.get_my_batch_attendance(uuid) from public;
grant execute on function public.get_my_batch_attendance(uuid) to authenticated;

comment on table public.lecture_attendance is 'One server-authoritative attendance record per lecture and enrolled student.';
comment on function public.get_attendance_roster(uuid) is 'Returns a lecture roster only to admins/owners or an assigned teacher.';
comment on function public.get_my_batch_attendance(uuid) is 'Returns the authenticated student attendance history for one enrolled batch.';
