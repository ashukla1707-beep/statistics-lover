-- Statistics Lover Stage 1: rollback-only auth/role acceptance checks.
-- IMPORTANT: run as a database administrator against a database that has:
--   * at least one owner account
--   * at least two profiles
--   * at least one batch
-- The script intentionally mutates role/status/test rows inside a transaction
-- and always rolls the transaction back.

begin;

create temporary table stage1_test_subject(user_id uuid primary key) on commit drop;
insert into stage1_test_subject(user_id)
select user_id from public.user_roles where role='owner'::public.app_role limit 1;

do $$
begin
  if not exists(select 1 from stage1_test_subject) then
    raise exception 'stage1 prerequisite: owner account is required';
  end if;
  if (select count(*) from public.profiles) < 2 then
    raise exception 'stage1 prerequisite: at least two profiles are required';
  end if;
  if not exists(select 1 from public.batches) then
    raise exception 'stage1 prerequisite: at least one batch is required';
  end if;
end $$;

-- STUDENT
delete from public.user_roles
where user_id=(select user_id from stage1_test_subject)
  and role <> 'student'::public.app_role;
insert into public.user_roles(user_id,role,assigned_by)
select user_id,'student'::public.app_role,null from stage1_test_subject
on conflict do nothing;

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub',(select user_id from stage1_test_subject),
    'role','authenticated'
  )::text,
  true
);
set local role authenticated;

do $$
begin
  if (select count(*) from public.profiles) <> 1 then
    raise exception 'student: profile isolation failed';
  end if;
  if exists(select 1 from public.audit_logs) then
    raise exception 'student: audit logs unexpectedly visible';
  end if;
  if exists(select 1 from public.app_settings) then
    raise exception 'student: app settings unexpectedly visible';
  end if;
end $$;

reset role;

-- TEACHER
insert into public.user_roles(user_id,role,assigned_by)
select user_id,'teacher'::public.app_role,null from stage1_test_subject
on conflict do nothing;

insert into public.teacher_assignments(teacher_id,batch_id,subject_id,assigned_by,is_active)
select
  (select user_id from stage1_test_subject),
  b.id,
  null,
  null,
  true
from public.batches b
limit 1;

set local role authenticated;
do $$
declare
  target_batch uuid;
begin
  select batch_id into target_batch
  from public.teacher_assignments
  where teacher_id=auth.uid() and subject_id is null and is_active
  limit 1;

  if target_batch is null or not private.has_teacher_batch_manage_access(target_batch) then
    raise exception 'teacher: assigned batch manage access failed';
  end if;
  if exists(select 1 from public.audit_logs) then
    raise exception 'teacher: audit logs unexpectedly visible';
  end if;
  if exists(select 1 from public.app_settings) then
    raise exception 'teacher: app settings unexpectedly visible';
  end if;
end $$;
reset role;

-- CONTENT MANAGER
delete from public.user_roles
where user_id=(select user_id from stage1_test_subject)
  and role not in ('student'::public.app_role,'content_manager'::public.app_role);
insert into public.user_roles(user_id,role,assigned_by)
select user_id,'content_manager'::public.app_role,null from stage1_test_subject
on conflict do nothing;

insert into public.courses(slug,title,status)
values ('stage1-auth-acceptance-draft','Stage 1 Auth Acceptance Draft','draft'::public.course_status)
on conflict (slug) do update set title=excluded.title;

set local role authenticated;
do $$
begin
  if not exists(
    select 1 from public.courses where slug='stage1-auth-acceptance-draft'
  ) then
    raise exception 'content_manager: managed draft content not visible';
  end if;
  if exists(select 1 from public.audit_logs) then
    raise exception 'content_manager: audit logs unexpectedly visible';
  end if;
  if exists(select 1 from public.app_settings) then
    raise exception 'content_manager: app settings unexpectedly visible';
  end if;
end $$;
reset role;

-- ADMIN
delete from public.user_roles
where user_id=(select user_id from stage1_test_subject)
  and role not in ('student'::public.app_role,'admin'::public.app_role);
insert into public.user_roles(user_id,role,assigned_by)
select user_id,'admin'::public.app_role,user_id from stage1_test_subject
on conflict do nothing;

set local role authenticated;
do $$
declare
  target_user uuid;
  blocked boolean := false;
begin
  if (select count(*) from public.profiles) < 2 then
    raise exception 'admin: platform profile visibility failed';
  end if;

  select id into target_user from public.profiles
  where id<>auth.uid() order by created_at limit 1;

  insert into public.user_roles(user_id,role,assigned_by)
  values(target_user,'teacher'::public.app_role,auth.uid())
  on conflict do nothing;

  begin
    insert into public.user_roles(user_id,role,assigned_by)
    values(target_user,'admin'::public.app_role,auth.uid());
  exception when others then
    blocked := true;
  end;

  if not blocked then
    raise exception 'admin: privileged role escalation was not blocked';
  end if;
end $$;
reset role;

-- OWNER
delete from public.user_roles
where user_id=(select user_id from stage1_test_subject)
  and role not in ('student'::public.app_role,'owner'::public.app_role);
insert into public.user_roles(user_id,role,assigned_by)
select user_id,'owner'::public.app_role,null from stage1_test_subject
on conflict do nothing;

set local role authenticated;
do $$
declare target_user uuid;
begin
  if not private.has_role('owner'::public.app_role) then
    raise exception 'owner: owner helper denied own role';
  end if;

  select id into target_user from public.profiles
  where id<>auth.uid() order by created_at limit 1;

  insert into public.user_roles(user_id,role,assigned_by)
  values(target_user,'admin'::public.app_role,auth.uid())
  on conflict do nothing;
end $$;
reset role;

-- SUSPENDED
update public.profiles
set account_status='suspended'::public.account_status
where id=(select user_id from stage1_test_subject);

set local role authenticated;
do $$
begin
  if private.is_active_user() then
    raise exception 'suspended: active-user helper unexpectedly true';
  end if;
  if not exists(select 1 from public.profiles where id=auth.uid()) then
    raise exception 'suspended: own profile must remain visible';
  end if;
  if exists(select 1 from public.enrollments) then
    raise exception 'suspended: enrollments unexpectedly visible';
  end if;
  if exists(select 1 from public.in_app_notifications) then
    raise exception 'suspended: notifications unexpectedly visible';
  end if;
  if exists(select 1 from public.audit_logs) then
    raise exception 'suspended: audit logs unexpectedly visible';
  end if;
  if exists(select 1 from public.app_settings) then
    raise exception 'suspended: app settings unexpectedly visible';
  end if;
end $$;
reset role;

rollback;

select 'PASS: Stage 1 auth/role acceptance (all changes rolled back)' as result;
