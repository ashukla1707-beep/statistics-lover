-- Statistics Lover: assessment scheduling, audience assignment and safe student schedule discovery

create type public.assessment_schedule_audience as enum ('batch','selected');
create type public.assessment_result_policy as enum ('immediate','after_close','scheduled','manual');

create table public.assessment_test_schedules (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.assessment_tests(id) on delete cascade,
  title text,
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  audience public.assessment_schedule_audience not null default 'batch',
  result_policy public.assessment_result_policy not null default 'immediate',
  results_release_at timestamptz,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessment_test_schedules_title_length check (title is null or char_length(title) <= 180),
  constraint assessment_test_schedules_window_order check (opens_at < closes_at),
  constraint assessment_test_schedules_result_time check (
    result_policy <> 'scheduled'::public.assessment_result_policy
    or (results_release_at is not null and results_release_at >= opens_at)
  )
);

create table public.assessment_test_schedule_enrollments (
  schedule_id uuid not null references public.assessment_test_schedules(id) on delete cascade,
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  assigned_by uuid references public.profiles(id) on delete set null default auth.uid(),
  primary key(schedule_id,enrollment_id)
);

create index assessment_test_schedules_test_idx on public.assessment_test_schedules(test_id,opens_at,closes_at);
create index assessment_test_schedules_active_idx on public.assessment_test_schedules(is_active,opens_at,closes_at);
create index assessment_test_schedules_created_by_idx on public.assessment_test_schedules(created_by);
create index assessment_test_schedule_enrollments_enrollment_idx on public.assessment_test_schedule_enrollments(enrollment_id);
create index assessment_test_schedule_enrollments_assigned_by_idx on public.assessment_test_schedule_enrollments(assigned_by);

create trigger assessment_test_schedules_set_updated_at before update on public.assessment_test_schedules
for each row execute function public.set_updated_at();

create or replace function private.has_teacher_schedule_access(target_schedule uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.assessment_test_schedules s where s.id=target_schedule and private.has_teacher_test_access(s.test_id));
$$;
revoke all on function private.has_teacher_schedule_access(uuid) from public;
grant execute on function private.has_teacher_schedule_access(uuid) to authenticated;

create or replace function private.validate_schedule_enrollment()
returns trigger language plpgsql security definer set search_path='' as $$
declare test_batch uuid; enrollment_batch uuid;
begin
  select t.batch_id into test_batch from public.assessment_test_schedules s join public.assessment_tests t on t.id=s.test_id where s.id=new.schedule_id;
  select e.batch_id into enrollment_batch from public.enrollments e where e.id=new.enrollment_id;
  if test_batch is null or enrollment_batch is null or test_batch<>enrollment_batch then
    raise exception 'Selected student enrollment must belong to the test batch';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_schedule_enrollment() from public;

create trigger assessment_test_schedule_enrollments_validate
before insert or update of schedule_id,enrollment_id on public.assessment_test_schedule_enrollments
for each row execute function private.validate_schedule_enrollment();

alter table public.assessment_test_schedules enable row level security;
alter table public.assessment_test_schedule_enrollments enable row level security;
revoke all on table public.assessment_test_schedules from anon,authenticated;
revoke all on table public.assessment_test_schedule_enrollments from anon,authenticated;
grant select,insert,update,delete on table public.assessment_test_schedules to authenticated,service_role;
grant select,insert,update,delete on table public.assessment_test_schedule_enrollments to authenticated,service_role;
grant usage on type public.assessment_schedule_audience to authenticated,service_role;
grant usage on type public.assessment_result_policy to authenticated,service_role;

create policy assessment_test_schedules_read_staff on public.assessment_test_schedules for select to authenticated using (
  (select private.is_active_user()) and ((select private.has_any_role(array['content_manager','admin','owner']::public.app_role[])) or private.has_teacher_test_access(test_id))
);
create policy assessment_test_schedules_insert_staff on public.assessment_test_schedules for insert to authenticated with check (
  (select private.is_active_user()) and ((select private.has_any_role(array['content_manager','admin','owner']::public.app_role[])) or private.has_teacher_test_access(test_id))
);
create policy assessment_test_schedules_update_staff on public.assessment_test_schedules for update to authenticated using (
  (select private.is_active_user()) and ((select private.has_any_role(array['content_manager','admin','owner']::public.app_role[])) or private.has_teacher_test_access(test_id))
) with check (
  (select private.is_active_user()) and ((select private.has_any_role(array['content_manager','admin','owner']::public.app_role[])) or private.has_teacher_test_access(test_id))
);
create policy assessment_test_schedules_delete_staff on public.assessment_test_schedules for delete to authenticated using (
  (select private.is_active_user()) and ((select private.has_any_role(array['content_manager','admin','owner']::public.app_role[])) or private.has_teacher_test_access(test_id))
);

create policy assessment_schedule_enrollments_read_staff on public.assessment_test_schedule_enrollments for select to authenticated using (
  (select private.is_active_user()) and ((select private.has_any_role(array['content_manager','admin','owner']::public.app_role[])) or private.has_teacher_schedule_access(schedule_id))
);
create policy assessment_schedule_enrollments_write_staff on public.assessment_test_schedule_enrollments for all to authenticated using (
  (select private.is_active_user()) and ((select private.has_any_role(array['content_manager','admin','owner']::public.app_role[])) or private.has_teacher_schedule_access(schedule_id))
) with check (
  (select private.is_active_user()) and ((select private.has_any_role(array['content_manager','admin','owner']::public.app_role[])) or private.has_teacher_schedule_access(schedule_id))
);

create or replace function private.get_assessment_test_roster(target_test uuid)
returns table(enrollment_id uuid,student_id uuid,full_name text,email text)
language sql stable security definer set search_path='' as $$
  select e.id,e.student_id,p.full_name,p.email
  from public.assessment_tests t join public.enrollments e on e.batch_id=t.batch_id join public.profiles p on p.id=e.student_id
  where t.id=target_test and e.status='active'::public.enrollment_status
    and (e.access_starts_at is null or e.access_starts_at<=now()) and (e.access_ends_at is null or e.access_ends_at>now())
    and (private.has_any_role(array['content_manager','admin','owner']::public.app_role[]) or private.has_teacher_test_access(t.id))
  order by coalesce(p.full_name,p.email,'');
$$;
revoke all on function private.get_assessment_test_roster(uuid) from public;
grant execute on function private.get_assessment_test_roster(uuid) to authenticated;

create or replace function public.get_assessment_test_roster(target_test uuid)
returns table(enrollment_id uuid,student_id uuid,full_name text,email text)
language sql stable security invoker set search_path='' as $$
  select * from private.get_assessment_test_roster(target_test);
$$;
revoke all on function public.get_assessment_test_roster(uuid) from public;
grant execute on function public.get_assessment_test_roster(uuid) to authenticated;

create or replace function private.save_assessment_test_schedule(
  target_schedule uuid,target_test uuid,target_title text,target_opens_at timestamptz,target_closes_at timestamptz,
  target_audience public.assessment_schedule_audience,target_result_policy public.assessment_result_policy,
  target_results_release_at timestamptz,target_is_active boolean,target_enrollment_ids uuid[]
)
returns uuid language plpgsql security definer set search_path='' as $$
declare result_id uuid; enrollment_id uuid;
begin
  if not private.is_active_user() then raise exception 'Inactive account'; end if;
  if not (private.has_any_role(array['content_manager','admin','owner']::public.app_role[]) or private.has_teacher_test_access(target_test))
  then raise exception 'Not authorized for this test'; end if;
  if not exists(select 1 from public.assessment_tests t where t.id=target_test and t.status='published'::public.academic_content_status)
  then raise exception 'Only published tests can be scheduled'; end if;
  if target_opens_at>=target_closes_at then raise exception 'Close time must be after open time'; end if;

  if target_schedule is null then
    insert into public.assessment_test_schedules(test_id,title,opens_at,closes_at,audience,result_policy,results_release_at,is_active)
    values(target_test,nullif(trim(target_title),''),target_opens_at,target_closes_at,target_audience,target_result_policy,target_results_release_at,target_is_active)
    returning id into result_id;
  else
    if not exists(select 1 from public.assessment_test_schedules s where s.id=target_schedule and (
      private.has_any_role(array['content_manager','admin','owner']::public.app_role[]) or private.has_teacher_schedule_access(s.id)
    )) then raise exception 'Schedule not found or not authorized'; end if;
    update public.assessment_test_schedules set test_id=target_test,title=nullif(trim(target_title),''),opens_at=target_opens_at,
      closes_at=target_closes_at,audience=target_audience,result_policy=target_result_policy,
      results_release_at=target_results_release_at,is_active=target_is_active where id=target_schedule;
    result_id=target_schedule;
  end if;

  delete from public.assessment_test_schedule_enrollments where schedule_id=result_id;
  if target_audience='selected'::public.assessment_schedule_audience then
    if coalesce(array_length(target_enrollment_ids,1),0)=0 then raise exception 'Select at least one student'; end if;
    foreach enrollment_id in array target_enrollment_ids loop
      insert into public.assessment_test_schedule_enrollments(schedule_id,enrollment_id) values(result_id,enrollment_id);
    end loop;
  end if;
  return result_id;
end;
$$;
revoke all on function private.save_assessment_test_schedule(uuid,uuid,text,timestamptz,timestamptz,public.assessment_schedule_audience,public.assessment_result_policy,timestamptz,boolean,uuid[]) from public;
grant execute on function private.save_assessment_test_schedule(uuid,uuid,text,timestamptz,timestamptz,public.assessment_schedule_audience,public.assessment_result_policy,timestamptz,boolean,uuid[]) to authenticated;

create or replace function public.save_assessment_test_schedule(
  target_schedule uuid default null,target_test uuid default null,target_title text default null,target_opens_at timestamptz default null,
  target_closes_at timestamptz default null,target_audience public.assessment_schedule_audience default 'batch',
  target_result_policy public.assessment_result_policy default 'immediate',target_results_release_at timestamptz default null,
  target_is_active boolean default true,target_enrollment_ids uuid[] default array[]::uuid[]
)
returns uuid language sql volatile security invoker set search_path='' as $$
  select private.save_assessment_test_schedule(target_schedule,target_test,target_title,target_opens_at,target_closes_at,target_audience,
    target_result_policy,target_results_release_at,target_is_active,target_enrollment_ids);
$$;
revoke all on function public.save_assessment_test_schedule(uuid,uuid,text,timestamptz,timestamptz,public.assessment_schedule_audience,public.assessment_result_policy,timestamptz,boolean,uuid[]) from public;
grant execute on function public.save_assessment_test_schedule(uuid,uuid,text,timestamptz,timestamptz,public.assessment_schedule_audience,public.assessment_result_policy,timestamptz,boolean,uuid[]) to authenticated;

create or replace function private.get_my_assessment_schedules(target_batch uuid)
returns table(schedule_id uuid,test_id uuid,test_title text,test_description text,test_instructions text,duration_minutes integer,max_attempts integer,
  opens_at timestamptz,closes_at timestamptz,result_policy public.assessment_result_policy,results_release_at timestamptz)
language sql stable security definer set search_path='' as $$
  select s.id,t.id,t.title,t.description,t.instructions,t.duration_minutes,t.max_attempts,s.opens_at,s.closes_at,s.result_policy,s.results_release_at
  from public.enrollments e join public.assessment_tests t on t.batch_id=e.batch_id join public.assessment_test_schedules s on s.test_id=t.id
  where e.student_id=auth.uid() and e.batch_id=target_batch and e.status='active'::public.enrollment_status
    and (e.access_starts_at is null or e.access_starts_at<=now()) and (e.access_ends_at is null or e.access_ends_at>now())
    and t.status='published'::public.academic_content_status and s.is_active and s.closes_at>now()
    and (s.audience='batch'::public.assessment_schedule_audience or exists(
      select 1 from public.assessment_test_schedule_enrollments se where se.schedule_id=s.id and se.enrollment_id=e.id
    ))
    and private.is_active_user()
  order by s.opens_at,t.title;
$$;
revoke all on function private.get_my_assessment_schedules(uuid) from public;
grant execute on function private.get_my_assessment_schedules(uuid) to authenticated;

create or replace function public.get_my_assessment_schedules(target_batch uuid)
returns table(schedule_id uuid,test_id uuid,test_title text,test_description text,test_instructions text,duration_minutes integer,max_attempts integer,
  opens_at timestamptz,closes_at timestamptz,result_policy public.assessment_result_policy,results_release_at timestamptz)
language sql stable security invoker set search_path='' as $$
  select * from private.get_my_assessment_schedules(target_batch);
$$;
revoke all on function public.get_my_assessment_schedules(uuid) from public;
grant execute on function public.get_my_assessment_schedules(uuid) to authenticated;
