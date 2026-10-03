-- Statistics Lover: assignments, private submissions, grading and secure file storage

create type public.assignment_submission_status as enum ('draft','submitted','graded','returned');

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.batches(id) on delete cascade,
  scope public.learning_resource_scope not null default 'lecture',
  subject_id uuid references public.subjects(id) on delete cascade,
  module_id uuid references public.modules(id) on delete cascade,
  lecture_id uuid references public.lectures(id) on delete cascade,
  title text not null,
  instructions text,
  status public.academic_content_status not null default 'draft',
  release_at timestamptz,
  due_at timestamptz,
  allow_late boolean not null default false,
  max_score numeric(8,2),
  position integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assignments_title_length check (char_length(title) between 2 and 180),
  constraint assignments_position_nonnegative check (position >= 0),
  constraint assignments_max_score_positive check (max_score is null or max_score > 0),
  constraint assignments_window_order check (release_at is null or due_at is null or release_at <= due_at),
  constraint assignments_scope_shape check (
    (scope='batch'::public.learning_resource_scope and subject_id is null and module_id is null and lecture_id is null)
    or (scope='subject'::public.learning_resource_scope and subject_id is not null and module_id is null and lecture_id is null)
    or (scope='module'::public.learning_resource_scope and subject_id is null and module_id is not null and lecture_id is null)
    or (scope='lecture'::public.learning_resource_scope and subject_id is null and module_id is null and lecture_id is not null)
  )
);

create table public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  status public.assignment_submission_status not null default 'draft',
  submission_text text,
  attachment_path text,
  submitted_at timestamptz,
  score numeric(8,2),
  feedback text,
  graded_by uuid references public.profiles(id) on delete set null,
  graded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assignment_submissions_assignment_enrollment_key unique(assignment_id,enrollment_id),
  constraint assignment_submissions_text_length check (submission_text is null or char_length(submission_text) <= 10000),
  constraint assignment_submissions_attachment_length check (attachment_path is null or char_length(attachment_path) <= 1024),
  constraint assignment_submissions_feedback_length check (feedback is null or char_length(feedback) <= 5000),
  constraint assignment_submissions_score_nonnegative check (score is null or score >= 0)
);

create index assignments_batch_release_idx on public.assignments(batch_id,status,release_at,due_at,position);
create index assignments_subject_idx on public.assignments(subject_id) where subject_id is not null;
create index assignments_module_idx on public.assignments(module_id) where module_id is not null;
create index assignments_lecture_idx on public.assignments(lecture_id) where lecture_id is not null;
create index assignments_created_by_idx on public.assignments(created_by);
create index assignment_submissions_assignment_idx on public.assignment_submissions(assignment_id,status);
create index assignment_submissions_enrollment_idx on public.assignment_submissions(enrollment_id);
create index assignment_submissions_graded_by_idx on public.assignment_submissions(graded_by);

create trigger assignments_set_updated_at before update on public.assignments
for each row execute function public.set_updated_at();
create trigger assignment_submissions_set_updated_at before update on public.assignment_submissions
for each row execute function public.set_updated_at();

create or replace function private.validate_assignment_scope()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.scope='batch'::public.learning_resource_scope then return new; end if;
  if new.scope='subject'::public.learning_resource_scope then
    if not exists(select 1 from public.subjects s where s.id=new.subject_id and s.batch_id=new.batch_id) then
      raise exception 'Assignment subject does not belong to the selected batch';
    end if;
    return new;
  end if;
  if new.scope='module'::public.learning_resource_scope then
    if not exists(
      select 1 from public.modules m join public.subjects s on s.id=m.subject_id
      where m.id=new.module_id and s.batch_id=new.batch_id
    ) then raise exception 'Assignment module does not belong to the selected batch'; end if;
    return new;
  end if;
  if new.scope='lecture'::public.learning_resource_scope then
    if not exists(
      select 1 from public.lectures l join public.modules m on m.id=l.module_id join public.subjects s on s.id=m.subject_id
      where l.id=new.lecture_id and s.batch_id=new.batch_id
    ) then raise exception 'Assignment lecture does not belong to the selected batch'; end if;
    return new;
  end if;
  raise exception 'Unsupported assignment scope';
end;
$$;

revoke all on function private.validate_assignment_scope() from public;

create trigger assignments_validate_scope
before insert or update of batch_id,scope,subject_id,module_id,lecture_id on public.assignments
for each row execute function private.validate_assignment_scope();

create or replace function private.has_teacher_assignment_access(target_assignment uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.assignments a
    where a.id=target_assignment and (
      (a.scope='batch'::public.learning_resource_scope and private.has_teacher_batch_access(a.batch_id))
      or (a.scope='subject'::public.learning_resource_scope and private.has_teacher_subject_access(a.subject_id))
      or (a.scope='module'::public.learning_resource_scope and private.has_teacher_module_access(a.module_id))
      or (a.scope='lecture'::public.learning_resource_scope and private.has_teacher_lecture_access(a.lecture_id))
    )
  );
$$;

revoke all on function private.has_teacher_assignment_access(uuid) from public;
grant execute on function private.has_teacher_assignment_access(uuid) to authenticated;

create or replace function private.can_submit_assignment(target_assignment uuid,target_user uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1
    from public.assignments a
    join public.enrollments e on e.batch_id=a.batch_id
    where a.id=target_assignment
      and e.student_id=target_user
      and e.status='active'::public.enrollment_status
      and a.status='published'::public.academic_content_status
      and (a.release_at is null or a.release_at<=now())
      and (a.due_at is null or a.allow_late or a.due_at>=now())
      and (e.access_starts_at is null or e.access_starts_at<=now())
      and (e.access_ends_at is null or e.access_ends_at>now())
      and private.is_active_user()
  );
$$;

revoke all on function private.can_submit_assignment(uuid,uuid) from public;
grant execute on function private.can_submit_assignment(uuid,uuid) to authenticated;

alter table public.assignments enable row level security;
alter table public.assignment_submissions enable row level security;
revoke all on table public.assignments from anon,authenticated;
revoke all on table public.assignment_submissions from anon,authenticated;
grant select,insert,update,delete on table public.assignments to authenticated,service_role;
grant select,update,delete on table public.assignment_submissions to authenticated,service_role;
grant insert on table public.assignment_submissions to service_role;
grant usage on type public.assignment_submission_status to authenticated,service_role;

create policy assignments_read_staff on public.assignments for select to authenticated using (
  (select private.is_active_user()) and (
    (select private.has_any_role(array['content_manager','admin','owner']::public.app_role[]))
    or private.has_teacher_assignment_access(id)
  )
);
create policy assignments_insert_staff on public.assignments for insert to authenticated with check (
  (select private.is_active_user()) and (
    (select private.has_any_role(array['content_manager','admin','owner']::public.app_role[]))
    or (scope='batch'::public.learning_resource_scope and private.has_teacher_batch_access(batch_id))
    or (scope='subject'::public.learning_resource_scope and private.has_teacher_subject_access(subject_id))
    or (scope='module'::public.learning_resource_scope and private.has_teacher_module_access(module_id))
    or (scope='lecture'::public.learning_resource_scope and private.has_teacher_lecture_access(lecture_id))
  )
);
create policy assignments_update_staff on public.assignments for update to authenticated using (
  (select private.is_active_user()) and (
    (select private.has_any_role(array['content_manager','admin','owner']::public.app_role[]))
    or private.has_teacher_assignment_access(id)
  )
) with check (
  (select private.is_active_user()) and (
    (select private.has_any_role(array['content_manager','admin','owner']::public.app_role[]))
    or (scope='batch'::public.learning_resource_scope and private.has_teacher_batch_access(batch_id))
    or (scope='subject'::public.learning_resource_scope and private.has_teacher_subject_access(subject_id))
    or (scope='module'::public.learning_resource_scope and private.has_teacher_module_access(module_id))
    or (scope='lecture'::public.learning_resource_scope and private.has_teacher_lecture_access(lecture_id))
  )
);
create policy assignments_delete_admin on public.assignments for delete to authenticated using (
  (select private.is_active_user()) and (select private.has_any_role(array['admin','owner']::public.app_role[]))
);

create policy assignment_submissions_read_staff on public.assignment_submissions for select to authenticated using (
  (select private.is_active_user()) and (
    (select private.has_any_role(array['content_manager','admin','owner']::public.app_role[]))
    or private.has_teacher_assignment_access(assignment_id)
  )
);
create policy assignment_submissions_read_student on public.assignment_submissions for select to authenticated using (
  (select private.is_active_user()) and exists(
    select 1 from public.enrollments e where e.id=enrollment_id and e.student_id=(select auth.uid())
  )
);
create policy assignment_submissions_update_staff on public.assignment_submissions for update to authenticated using (
  (select private.is_active_user()) and (
    (select private.has_any_role(array['content_manager','admin','owner']::public.app_role[]))
    or private.has_teacher_assignment_access(assignment_id)
  )
) with check (
  (select private.is_active_user()) and (
    (select private.has_any_role(array['content_manager','admin','owner']::public.app_role[]))
    or private.has_teacher_assignment_access(assignment_id)
  )
);
create policy assignment_submissions_delete_admin on public.assignment_submissions for delete to authenticated using (
  (select private.is_active_user()) and (select private.has_any_role(array['admin','owner']::public.app_role[]))
);

create or replace function private.validate_assignment_grade()
returns trigger language plpgsql security definer set search_path='' as $$
declare max_allowed numeric(8,2);
begin
  select a.max_score into max_allowed from public.assignments a where a.id=new.assignment_id;
  if new.score is not null and max_allowed is not null and new.score>max_allowed then
    raise exception 'Score cannot exceed assignment max score';
  end if;
  if new.status in ('graded'::public.assignment_submission_status,'returned'::public.assignment_submission_status) then
    new.graded_by=auth.uid();
    new.graded_at=coalesce(new.graded_at,now());
  end if;
  return new;
end;
$$;

revoke all on function private.validate_assignment_grade() from public;

create trigger assignment_submissions_validate_grade
before update of score,feedback,status on public.assignment_submissions
for each row execute function private.validate_assignment_grade();

create or replace function private.get_batch_assignments(target_batch uuid)
returns table (
  assignment_id uuid, assignment_scope public.learning_resource_scope, subject_id uuid, module_id uuid, lecture_id uuid,
  context_title text, title text, instructions text, release_at timestamptz, due_at timestamptz, allow_late boolean,
  max_score numeric, assignment_position integer, submission_id uuid, submission_status public.assignment_submission_status,
  submission_text text, attachment_path text, submitted_at timestamptz, score numeric, feedback text, graded_at timestamptz
)
language sql stable security definer set search_path='' as $$
  select
    a.id,a.scope,a.subject_id,a.module_id,a.lecture_id,
    case a.scope
      when 'subject'::public.learning_resource_scope then subj.title
      when 'module'::public.learning_resource_scope then mod.title
      when 'lecture'::public.learning_resource_scope then lec.title
      else 'Batch assignment'
    end,
    a.title,a.instructions,a.release_at,a.due_at,a.allow_late,a.max_score,a.position,
    sub.id,sub.status,sub.submission_text,sub.attachment_path,sub.submitted_at,sub.score,sub.feedback,sub.graded_at
  from public.assignments a
  join public.enrollments e on e.batch_id=a.batch_id and e.student_id=auth.uid()
  left join public.subjects subj on subj.id=a.subject_id
  left join public.modules mod on mod.id=a.module_id
  left join public.lectures lec on lec.id=a.lecture_id
  left join public.assignment_submissions sub on sub.assignment_id=a.id and sub.enrollment_id=e.id
  where a.batch_id=target_batch
    and e.status in ('active'::public.enrollment_status,'completed'::public.enrollment_status)
    and a.status='published'::public.academic_content_status
    and (a.release_at is null or a.release_at<=now())
    and private.is_active_user()
  order by a.position,a.due_at nulls last,a.created_at;
$$;

revoke all on function private.get_batch_assignments(uuid) from public;
grant execute on function private.get_batch_assignments(uuid) to authenticated;

create or replace function public.get_batch_assignments(target_batch uuid)
returns table (
  assignment_id uuid, assignment_scope public.learning_resource_scope, subject_id uuid, module_id uuid, lecture_id uuid,
  context_title text, title text, instructions text, release_at timestamptz, due_at timestamptz, allow_late boolean,
  max_score numeric, assignment_position integer, submission_id uuid, submission_status public.assignment_submission_status,
  submission_text text, attachment_path text, submitted_at timestamptz, score numeric, feedback text, graded_at timestamptz
)
language sql stable security invoker set search_path='' as $$
  select * from private.get_batch_assignments(target_batch);
$$;

revoke all on function public.get_batch_assignments(uuid) from public;
grant execute on function public.get_batch_assignments(uuid) to authenticated;

create or replace function private.save_my_assignment_submission(
  target_assignment uuid,response_text text,uploaded_path text,submit_now boolean
)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare target_enrollment uuid; existing public.assignment_submissions; result_id uuid;
begin
  if not private.can_submit_assignment(target_assignment,auth.uid()) then
    raise exception 'Assignment is not currently open for submission';
  end if;

  select e.id into target_enrollment
  from public.assignments a
  join public.enrollments e on e.batch_id=a.batch_id
  where a.id=target_assignment
    and e.student_id=auth.uid()
    and e.status='active'::public.enrollment_status
  order by e.created_at desc
  limit 1;

  if target_enrollment is null then raise exception 'Active enrollment required'; end if;

  if uploaded_path is not null and uploaded_path<>'' and uploaded_path not like auth.uid()::text || '/' || target_assignment::text || '/%' then
    raise exception 'Invalid submission attachment path';
  end if;

  select * into existing from public.assignment_submissions s
  where s.assignment_id=target_assignment and s.enrollment_id=target_enrollment;

  if existing.id is not null and existing.status in ('graded'::public.assignment_submission_status,'returned'::public.assignment_submission_status) then
    raise exception 'Graded submissions cannot be edited';
  end if;

  insert into public.assignment_submissions(assignment_id,enrollment_id,status,submission_text,attachment_path,submitted_at)
  values(
    target_assignment,target_enrollment,
    case when submit_now then 'submitted'::public.assignment_submission_status else 'draft'::public.assignment_submission_status end,
    nullif(trim(response_text),''),nullif(uploaded_path,''),
    case when submit_now then now() else null end
  )
  on conflict(assignment_id,enrollment_id) do update set
    status=excluded.status,
    submission_text=excluded.submission_text,
    attachment_path=coalesce(excluded.attachment_path,public.assignment_submissions.attachment_path),
    submitted_at=case when submit_now then now() else public.assignment_submissions.submitted_at end
  returning id into result_id;

  return result_id;
end;
$$;

revoke all on function private.save_my_assignment_submission(uuid,text,text,boolean) from public;
grant execute on function private.save_my_assignment_submission(uuid,text,text,boolean) to authenticated;

create or replace function public.save_my_assignment_submission(
  target_assignment uuid,response_text text default null,uploaded_path text default null,submit_now boolean default false
)
returns uuid
language sql volatile security invoker set search_path='' as $$
  select private.save_my_assignment_submission(target_assignment,response_text,uploaded_path,submit_now);
$$;

revoke all on function public.save_my_assignment_submission(uuid,text,text,boolean) from public;
grant execute on function public.save_my_assignment_submission(uuid,text,text,boolean) to authenticated;

create or replace function private.get_assignment_submissions(target_assignment uuid)
returns table (
  submission_id uuid,enrollment_id uuid,student_id uuid,full_name text,email text,
  submission_status public.assignment_submission_status,submission_text text,attachment_path text,
  submitted_at timestamptz,score numeric,feedback text,graded_at timestamptz
)
language sql stable security definer set search_path='' as $$
  select s.id,s.enrollment_id,e.student_id,p.full_name,p.email,s.status,s.submission_text,s.attachment_path,s.submitted_at,s.score,s.feedback,s.graded_at
  from public.assignment_submissions s
  join public.enrollments e on e.id=s.enrollment_id
  join public.profiles p on p.id=e.student_id
  where s.assignment_id=target_assignment
    and (
      private.has_any_role(array['content_manager','admin','owner']::public.app_role[])
      or private.has_teacher_assignment_access(target_assignment)
    )
  order by coalesce(s.submitted_at,s.created_at),coalesce(p.full_name,p.email,'');
$$;

revoke all on function private.get_assignment_submissions(uuid) from public;
grant execute on function private.get_assignment_submissions(uuid) to authenticated;

create or replace function public.get_assignment_submissions(target_assignment uuid)
returns table (
  submission_id uuid,enrollment_id uuid,student_id uuid,full_name text,email text,
  submission_status public.assignment_submission_status,submission_text text,attachment_path text,
  submitted_at timestamptz,score numeric,feedback text,graded_at timestamptz
)
language sql stable security invoker set search_path='' as $$
  select * from private.get_assignment_submissions(target_assignment);
$$;

revoke all on function public.get_assignment_submissions(uuid) from public;
grant execute on function public.get_assignment_submissions(uuid) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit)
values('assignment-submissions','assignment-submissions',false,26214400)
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit;

create or replace function private.storage_assignment_id(object_name text)
returns uuid
language plpgsql immutable set search_path='' as $$
declare parts text[];
begin
  parts=string_to_array(object_name,'/');
  if array_length(parts,1)<2 then return null; end if;
  begin return parts[2]::uuid;
  exception when others then return null;
  end;
end;
$$;

revoke all on function private.storage_assignment_id(text) from public;
grant execute on function private.storage_assignment_id(text) to authenticated;

create policy assignment_upload_own on storage.objects for insert to authenticated with check (
  bucket_id='assignment-submissions'
  and (storage.foldername(name))[1]=(select auth.uid())::text
  and private.can_submit_assignment(private.storage_assignment_id(name),(select auth.uid()))
);

create policy assignment_files_read_own_or_staff on storage.objects for select to authenticated using (
  bucket_id='assignment-submissions'
  and (
    (storage.foldername(name))[1]=(select auth.uid())::text
    or (select private.has_any_role(array['content_manager','admin','owner']::public.app_role[]))
    or private.has_teacher_assignment_access(private.storage_assignment_id(name))
  )
);

create policy assignment_files_update_own on storage.objects for update to authenticated
using (
  bucket_id='assignment-submissions'
  and (storage.foldername(name))[1]=(select auth.uid())::text
  and private.can_submit_assignment(private.storage_assignment_id(name),(select auth.uid()))
)
with check (
  bucket_id='assignment-submissions'
  and (storage.foldername(name))[1]=(select auth.uid())::text
  and private.can_submit_assignment(private.storage_assignment_id(name),(select auth.uid()))
);

create policy assignment_files_delete_own_or_admin on storage.objects for delete to authenticated using (
  bucket_id='assignment-submissions'
  and (
    ((storage.foldername(name))[1]=(select auth.uid())::text and private.can_submit_assignment(private.storage_assignment_id(name),(select auth.uid())))
    or (select private.has_any_role(array['admin','owner']::public.app_role[]))
  )
);

comment on table public.assignments is 'Published teaching assignments scoped to a batch, subject, module or lecture.';
comment on table public.assignment_submissions is 'One student submission per assignment/enrollment; student writes occur only through the protected RPC.';
