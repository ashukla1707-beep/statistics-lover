-- Statistics Lover Stage 3: rollback-only teacher workflow acceptance.
-- Exercises subject-scoped teacher authoring and confirms scope isolation.
-- All fixture and temporary role changes are rolled back.

begin;

select set_config('stage3.teacher',
  (
    select p.id::text
    from public.profiles p
    where p.account_status='active'::public.account_status
      and exists(select 1 from public.user_roles ur where ur.user_id=p.id and ur.role='student'::public.app_role)
      and not exists(select 1 from public.user_roles ur where ur.user_id=p.id and ur.role<>'student'::public.app_role)
    order by p.created_at
    limit 1
  ),true);

select set_config('stage3.batch',(select id::text from public.batches where status='active'::public.batch_status order by created_at limit 1),true);
select set_config('stage3.subject',(select id::text from public.subjects
  where batch_id=current_setting('stage3.batch')::uuid and status='published'::public.academic_content_status
  order by position,created_at limit 1),true);
select set_config('stage3.module',(select id::text from public.modules
  where subject_id=current_setting('stage3.subject')::uuid and status='published'::public.academic_content_status
  order by position,created_at limit 1),true);
select set_config('stage3.roster_enrollment',(select id::text from public.enrollments
  where batch_id=current_setting('stage3.batch')::uuid
    and status='active'::public.enrollment_status
    and student_id<>current_setting('stage3.teacher')::uuid
  order by created_at limit 1),true);

do $$ begin
  if nullif(current_setting('stage3.teacher',true),'') is null
    or nullif(current_setting('stage3.module',true),'') is null
    or nullif(current_setting('stage3.roster_enrollment',true),'') is null then
    raise exception 'stage3 prerequisite missing';
  end if;
end $$;

delete from public.enrollments where student_id=current_setting('stage3.teacher')::uuid;

insert into public.user_roles(user_id,role,assigned_by)
values(current_setting('stage3.teacher')::uuid,'teacher'::public.app_role,null)
on conflict do nothing;

insert into public.teacher_assignments(teacher_id,batch_id,subject_id,assigned_by,is_active)
values(current_setting('stage3.teacher')::uuid,current_setting('stage3.batch')::uuid,current_setting('stage3.subject')::uuid,null,true);

with s as (
  insert into public.subjects(batch_id,slug,title,status,position)
  values(current_setting('stage3.batch')::uuid,'stage3-unassigned-'||substr(gen_random_uuid()::text,1,8),
    'Stage 3 Unassigned Subject','published',9901) returning id
), m as (
  insert into public.modules(subject_id,slug,title,status,position)
  select id,'stage3-unassigned-module','Stage 3 Unassigned Module','published',9901 from s returning id,subject_id
)
select set_config('stage3.other_subject',(select subject_id::text from m),true),
       set_config('stage3.other_module',(select id::text from m),true);

with a as (
  insert into public.lectures(module_id,slug,title,status,delivery_mode,scheduled_at,release_at)
  values(current_setting('stage3.module')::uuid,'stage3-assigned-'||substr(gen_random_uuid()::text,1,8),
    'Stage 3 Assigned Lecture','scheduled','live',now(),now()-interval '1 minute') returning id
), u as (
  insert into public.lectures(module_id,slug,title,status,delivery_mode,scheduled_at,release_at)
  values(current_setting('stage3.other_module')::uuid,'stage3-unassigned-'||substr(gen_random_uuid()::text,1,8),
    'Stage 3 Unassigned Lecture','scheduled','live',now(),now()-interval '1 minute') returning id
)
select set_config('stage3.assigned_lecture',(select id::text from a),true),
       set_config('stage3.other_lecture',(select id::text from u),true);

with a as (
  insert into public.assignments(batch_id,scope,subject_id,title,status,release_at,due_at,max_score)
  values(current_setting('stage3.batch')::uuid,'subject',current_setting('stage3.subject')::uuid,
    'Stage 3 Assigned Assignment','published',now()-interval '1 minute',now()+interval '1 day',10) returning id
), u as (
  insert into public.assignments(batch_id,scope,subject_id,title,status,release_at,due_at,max_score)
  values(current_setting('stage3.batch')::uuid,'subject',current_setting('stage3.other_subject')::uuid,
    'Stage 3 Unassigned Assignment','published',now()-interval '1 minute',now()+interval '1 day',10) returning id
)
select set_config('stage3.assigned_assignment',(select id::text from a),true),
       set_config('stage3.other_assignment',(select id::text from u),true);

insert into public.assignment_submissions(assignment_id,enrollment_id,status,submission_text,submitted_at)
values
(current_setting('stage3.assigned_assignment')::uuid,current_setting('stage3.roster_enrollment')::uuid,'submitted','Assigned response',now()),
(current_setting('stage3.other_assignment')::uuid,current_setting('stage3.roster_enrollment')::uuid,'submitted','Unassigned response',now());

insert into public.assessment_tests(batch_id,scope,subject_id,title,status,max_attempts)
values(current_setting('stage3.batch')::uuid,'subject',current_setting('stage3.other_subject')::uuid,
  'Stage 3 Unassigned Test','draft',1);
select set_config('stage3.other_test',(select id::text from public.assessment_tests
  where title='Stage 3 Unassigned Test' order by created_at desc limit 1),true);

select set_config('request.jwt.claims',
  json_build_object('sub',current_setting('stage3.teacher'),'role','authenticated')::text,true);
set local role authenticated;

do $$
declare
  assigned_subject uuid:=current_setting('stage3.subject')::uuid;
  other_subject uuid:=current_setting('stage3.other_subject')::uuid;
  assigned_module uuid:=current_setting('stage3.module')::uuid;
  other_module uuid:=current_setting('stage3.other_module')::uuid;
  assigned_lecture uuid:=current_setting('stage3.assigned_lecture')::uuid;
  other_lecture uuid:=current_setting('stage3.other_lecture')::uuid;
  assigned_assignment uuid:=current_setting('stage3.assigned_assignment')::uuid;
  other_assignment uuid:=current_setting('stage3.other_assignment')::uuid;
  roster_enrollment uuid:=current_setting('stage3.roster_enrollment')::uuid;
  v_new_lecture uuid; v_resource uuid; v_assignment uuid; v_question uuid;
  v_test uuid; v_schedule uuid; v_submission uuid; blocked boolean;
begin
  if not private.has_teacher_batch_access(current_setting('stage3.batch')::uuid) then raise exception 'teacher: batch read scope denied'; end if;
  if private.has_teacher_batch_manage_access(current_setting('stage3.batch')::uuid) then raise exception 'teacher: subject assignment gained whole-batch manage scope'; end if;
  if not private.has_teacher_subject_access(assigned_subject) then raise exception 'teacher: assigned subject denied'; end if;
  if private.has_teacher_subject_access(other_subject) then raise exception 'teacher: unassigned subject granted'; end if;
  if not private.has_teacher_module_access(assigned_module) then raise exception 'teacher: assigned module denied'; end if;
  if private.has_teacher_module_access(other_module) then raise exception 'teacher: unassigned module granted'; end if;

  if not exists(select 1 from public.subjects where id=assigned_subject) then raise exception 'teacher: assigned subject not readable'; end if;
  if exists(select 1 from public.subjects where id=other_subject) then raise exception 'teacher: unassigned subject visible'; end if;
  if (select count(*) from public.profiles)<>1 then raise exception 'teacher: profile visibility exceeded own identity'; end if;
  if exists(select 1 from public.audit_logs) then raise exception 'teacher: audit logs visible'; end if;
  if exists(select 1 from public.app_settings) then raise exception 'teacher: app settings visible'; end if;

  insert into public.lectures(module_id,slug,title,status,delivery_mode,scheduled_at)
  values(assigned_module,'stage3-teacher-'||substr(gen_random_uuid()::text,1,8),'Stage 3 Teacher-created Lecture','draft','live',now())
  returning id into v_new_lecture;

  blocked:=false;
  begin
    insert into public.lectures(module_id,slug,title,status,delivery_mode)
    values(other_module,'stage3-blocked-'||substr(gen_random_uuid()::text,1,8),'Blocked lecture','draft','live');
  exception when others then blocked:=true; end;
  if not blocked then raise exception 'teacher: created lecture in unassigned module'; end if;

  insert into public.lecture_delivery_sources(lecture_id,action_kind,provider,provider_reference,label)
  values(v_new_lecture,'join','external','https://example.com/teacher-live','Join');

  blocked:=false;
  begin
    insert into public.lecture_delivery_sources(lecture_id,action_kind,provider,provider_reference,label)
    values(other_lecture,'join','external','https://example.com/blocked-live','Blocked');
  exception when others then blocked:=true; end;
  if not blocked then raise exception 'teacher: created delivery source for unassigned lecture'; end if;

  insert into public.learning_resources(batch_id,scope,subject_id,kind,title,status)
  values(current_setting('stage3.batch')::uuid,'subject',assigned_subject,'notes','Stage 3 Teacher Notes','draft')
  returning id into v_resource;
  insert into public.learning_resource_sources(resource_id,provider,provider_reference,action_label)
  values(v_resource,'external','https://example.com/teacher-notes.pdf','Open');

  blocked:=false;
  begin
    insert into public.learning_resources(batch_id,scope,kind,title,status)
    values(current_setting('stage3.batch')::uuid,'batch','notes','Blocked Batch Notes','draft');
  exception when others then blocked:=true; end;
  if not blocked then raise exception 'teacher: created whole-batch resource'; end if;

  blocked:=false;
  begin
    insert into public.learning_resources(batch_id,scope,subject_id,kind,title,status)
    values(current_setting('stage3.batch')::uuid,'subject',other_subject,'notes','Blocked Subject Notes','draft');
  exception when others then blocked:=true; end;
  if not blocked then raise exception 'teacher: created unassigned-subject resource'; end if;

  insert into public.assignments(batch_id,scope,subject_id,title,status,max_score)
  values(current_setting('stage3.batch')::uuid,'subject',assigned_subject,'Stage 3 Teacher Assignment','draft',10)
  returning id into v_assignment;

  blocked:=false;
  begin
    insert into public.assignments(batch_id,scope,title,status,max_score)
    values(current_setting('stage3.batch')::uuid,'batch','Blocked Batch Assignment','draft',10);
  exception when others then blocked:=true; end;
  if not blocked then raise exception 'teacher: created whole-batch assignment'; end if;

  if not exists(select 1 from public.get_attendance_roster(assigned_lecture) where enrollment_id=roster_enrollment) then raise exception 'teacher: assigned attendance roster unavailable'; end if;
  if exists(select 1 from public.get_attendance_roster(other_lecture)) then raise exception 'teacher: unassigned attendance roster visible'; end if;

  insert into public.lecture_attendance(lecture_id,enrollment_id,status,note)
  values(assigned_lecture,roster_enrollment,'present','Stage 3 attendance');

  blocked:=false;
  begin
    insert into public.lecture_attendance(lecture_id,enrollment_id,status,note)
    values(other_lecture,roster_enrollment,'present','Blocked');
  exception when others then blocked:=true; end;
  if not blocked then raise exception 'teacher: marked unassigned attendance'; end if;

  if not exists(select 1 from public.get_assignment_submissions(assigned_assignment)) then raise exception 'teacher: assigned submissions unavailable'; end if;
  if exists(select 1 from public.get_assignment_submissions(other_assignment)) then raise exception 'teacher: unassigned submissions visible'; end if;

  select submission_id into v_submission from public.get_assignment_submissions(assigned_assignment) limit 1;
  update public.assignment_submissions set status='graded',score=8,feedback='Stage 3 reviewed' where id=v_submission;
  if not exists(select 1 from public.assignment_submissions where id=v_submission and status='graded' and graded_by=auth.uid()) then raise exception 'teacher: grading failed'; end if;

  v_question:=public.save_assessment_question(
    null,assigned_subject,assigned_module,null,'single_choice','easy','original',null,null,
    'Stage 3 teacher question',null,1,0,'published',
    '[{"text":"A","position":0,"is_correct":true},{"text":"B","position":1,"is_correct":false}]'::jsonb,
    null,null,0
  );

  blocked:=false;
  begin
    perform public.save_assessment_question(null,other_subject,other_module,null,'short_text','easy','original',null,null,
      'Blocked question',null,1,0,'published','[]'::jsonb,'answer',null,0);
  exception when others then blocked:=true; end;
  if not blocked then raise exception 'teacher: created unassigned-subject question'; end if;

  v_test:=public.save_assessment_test(
    null,current_setting('stage3.batch')::uuid,'subject',assigned_subject,
    'Stage 3 Teacher Test',null,null,'published',30,1,false,false,
    jsonb_build_array(jsonb_build_object(
      'subject_id',assigned_subject::text,'title','Stage 3 Section','position',0,
      'questions',jsonb_build_array(jsonb_build_object('question_id',v_question::text,'position',0,'marks',1,'negative_marks',0))
    ))
  );

  blocked:=false;
  begin
    perform public.save_assessment_test(null,current_setting('stage3.batch')::uuid,'batch',null,
      'Blocked Batch Test',null,null,'draft',30,1,false,false,'[]'::jsonb);
  exception when others then blocked:=true; end;
  if not blocked then raise exception 'teacher: created whole-batch test'; end if;

  v_schedule:=public.save_assessment_test_schedule(
    null,v_test,'Stage 3 Schedule',now()+interval '1 hour',now()+interval '2 hour',
    'batch','immediate',null,true,array[]::uuid[]
  );
  if not exists(select 1 from public.get_assessment_test_roster(v_test)) then raise exception 'teacher: assessment roster unavailable'; end if;
  perform public.get_assessment_test_analytics(v_test);

  blocked:=false;
  begin perform public.get_assessment_test_analytics(current_setting('stage3.other_test')::uuid);
  exception when others then blocked:=true; end;
  if not blocked then raise exception 'teacher: unassigned analytics available'; end if;

  insert into public.announcements(scope,batch_id,subject_id,title,body,status)
  values('subject',current_setting('stage3.batch')::uuid,assigned_subject,'Stage 3 Teacher Notice','Assigned subject','draft');

  blocked:=false;
  begin
    insert into public.announcements(scope,batch_id,title,body,status)
    values('batch',current_setting('stage3.batch')::uuid,'Blocked Batch Notice','Blocked','draft');
  exception when others then blocked:=true; end;
  if not blocked then raise exception 'teacher: created whole-batch announcement'; end if;
end $$;

reset role;
rollback;
select 'PASS: Stage 3 teacher scoped workflow rollback acceptance' as result;
