-- Statistics Lover Stage 2: rollback-only student workflow acceptance.
-- Requires at least one active, non-privileged student enrollment whose batch
-- has a published subject and module. All fixture changes are rolled back.

begin;

select set_config('stage2.student',(select e.student_id::text from public.enrollments e
  where e.status='active'::public.enrollment_status
    and not exists(select 1 from public.user_roles ur where ur.user_id=e.student_id and ur.role<>'student'::public.app_role)
  order by e.created_at limit 1),true);
select set_config('stage2.batch',(select e.batch_id::text from public.enrollments e
  where e.student_id=current_setting('stage2.student')::uuid and e.status='active'::public.enrollment_status
  order by e.created_at limit 1),true);
select set_config('stage2.enrollment',(select e.id::text from public.enrollments e
  where e.student_id=current_setting('stage2.student')::uuid and e.batch_id=current_setting('stage2.batch')::uuid limit 1),true);
select set_config('stage2.subject',(select s.id::text from public.subjects s
  where s.batch_id=current_setting('stage2.batch')::uuid and s.status='published' order by s.position,s.created_at limit 1),true);
select set_config('stage2.module',(select m.id::text from public.modules m
  where m.subject_id=current_setting('stage2.subject')::uuid and m.status='published' order by m.position,m.created_at limit 1),true);

do $$ begin
  if nullif(current_setting('stage2.student',true),'') is null
     or nullif(current_setting('stage2.module',true),'') is null then
    raise exception 'stage2 prerequisite missing';
  end if;
end $$;

with c as (
  insert into public.courses(slug,title,status,published_at)
  values('stage2-'||substr(gen_random_uuid()::text,1,8),'Stage 2 Other Course','published',now()) returning id
), b as (
  insert into public.batches(course_id,slug,title,status)
  select id,'stage2-other-batch','Stage 2 Other Batch','active' from c returning id
), s as (
  insert into public.subjects(batch_id,slug,title,status)
  select id,'stage2-other-subject','Stage 2 Other Subject','published' from b returning id,batch_id
), m as (
  insert into public.modules(subject_id,slug,title,status)
  select id,'stage2-other-module','Stage 2 Other Module','published' from s returning id,subject_id
)
select set_config('stage2.other_batch',(select batch_id::text from s),true),
       set_config('stage2.other_subject',(select subject_id::text from m),true);

with r as (
  insert into public.lectures(module_id,slug,title,status,delivery_mode,release_at,published_at)
  values(current_setting('stage2.module')::uuid,'stage2-released-'||substr(gen_random_uuid()::text,1,8),
    'Stage 2 Released Lecture','published','live',now()-interval '1 minute',now()) returning id
), f as (
  insert into public.lectures(module_id,slug,title,status,delivery_mode,release_at,published_at)
  values(current_setting('stage2.module')::uuid,'stage2-future-'||substr(gen_random_uuid()::text,1,8),
    'Stage 2 Future Lecture','published','live',now()+interval '1 day',now()) returning id
)
select set_config('stage2.released_lecture',(select id::text from r),true),
       set_config('stage2.future_lecture',(select id::text from f),true);

insert into public.lecture_delivery_sources(lecture_id,action_kind,provider,provider_reference,label)
values
(current_setting('stage2.released_lecture')::uuid,'join','external','https://example.com/stage2-live','Join Stage 2 class'),
(current_setting('stage2.future_lecture')::uuid,'join','external','https://example.com/stage2-future','Join future Stage 2 class');

with r as (
  insert into public.learning_resources(batch_id,scope,kind,title,status,release_at,position)
  values(current_setting('stage2.batch')::uuid,'batch','notes','Stage 2 Released Notes','published',now()-interval '1 minute',9101) returning id
), f as (
  insert into public.learning_resources(batch_id,scope,kind,title,status,release_at,position)
  values(current_setting('stage2.batch')::uuid,'batch','notes','Stage 2 Future Notes','published',now()+interval '1 day',9102) returning id
), d as (
  insert into public.learning_resources(batch_id,scope,kind,title,status,release_at,position)
  values(current_setting('stage2.batch')::uuid,'batch','notes','Stage 2 Draft Notes','draft',now()-interval '1 minute',9103) returning id
)
select set_config('stage2.released_resource',(select id::text from r),true),
       set_config('stage2.future_resource',(select id::text from f),true),
       set_config('stage2.draft_resource',(select id::text from d),true);

insert into public.learning_resource_sources(resource_id,provider,provider_reference,action_label,file_name,mime_type,size_bytes)
values
(current_setting('stage2.released_resource')::uuid,'external','https://example.com/stage2-notes.pdf','Open notes','stage2-notes.pdf','application/pdf',1234),
(current_setting('stage2.future_resource')::uuid,'external','https://example.com/stage2-future.pdf','Open notes','future.pdf','application/pdf',1234),
(current_setting('stage2.draft_resource')::uuid,'external','https://example.com/stage2-draft.pdf','Open notes','draft.pdf','application/pdf',1234);

with r as (
  insert into public.assignments(batch_id,scope,title,instructions,status,release_at,due_at,allow_late,max_score,position)
  values(current_setting('stage2.batch')::uuid,'batch','Stage 2 Released Assignment','Acceptance','published',now()-interval '1 minute',now()+interval '1 day',false,10,9101) returning id
), f as (
  insert into public.assignments(batch_id,scope,title,instructions,status,release_at,due_at,allow_late,max_score,position)
  values(current_setting('stage2.batch')::uuid,'batch','Stage 2 Future Assignment','Acceptance','published',now()+interval '1 day',now()+interval '2 day',false,10,9102) returning id
), d as (
  insert into public.assignments(batch_id,scope,title,instructions,status,release_at,due_at,allow_late,max_score,position)
  values(current_setting('stage2.batch')::uuid,'batch','Stage 2 Draft Assignment','Acceptance','draft',now()-interval '1 minute',now()+interval '1 day',false,10,9103) returning id
)
select set_config('stage2.released_assignment',(select id::text from r),true),
       set_config('stage2.future_assignment',(select id::text from f),true),
       set_config('stage2.draft_assignment',(select id::text from d),true);

with q as (
  insert into public.assessment_questions(subject_id,module_id,question_type,difficulty,source_type,prompt,default_marks,default_negative_marks,status)
  values(current_setting('stage2.subject')::uuid,current_setting('stage2.module')::uuid,'single_choice','easy','original',
    'Stage 2: choose one option',1,0,'published') returning id
)
select set_config('stage2.question',(select id::text from q),true);
insert into public.assessment_question_options(question_id,option_text,position,is_correct)
values(current_setting('stage2.question')::uuid,'Option A',0,true),
      (current_setting('stage2.question')::uuid,'Option B',1,false);
insert into public.assessment_question_keys(question_id) values(current_setting('stage2.question')::uuid);

with t as (
  insert into public.assessment_tests(batch_id,scope,subject_id,title,status,duration_minutes,max_attempts)
  values(current_setting('stage2.batch')::uuid,'subject',current_setting('stage2.subject')::uuid,'Stage 2 Student Test','published',30,1)
  returning id
)
select set_config('stage2.test',(select id::text from t),true);
with s as (
  insert into public.assessment_test_sections(test_id,subject_id,title,position)
  values(current_setting('stage2.test')::uuid,current_setting('stage2.subject')::uuid,'Stage 2 Section',0) returning id
)
select set_config('stage2.section',(select id::text from s),true);
insert into public.assessment_test_questions(section_id,question_id,position,marks,negative_marks)
values(current_setting('stage2.section')::uuid,current_setting('stage2.question')::uuid,0,1,0);
with s as (
  insert into public.assessment_test_schedules(test_id,title,opens_at,closes_at,audience,result_policy,is_active,manual_results_released)
  values(current_setting('stage2.test')::uuid,'Stage 2 Open Schedule',now()-interval '1 minute',now()+interval '1 day','batch','manual',true,false)
  returning id
)
select set_config('stage2.schedule',(select id::text from s),true);

insert into public.in_app_notifications(user_id,kind,title,body,available_at)
values(current_setting('stage2.student')::uuid,'stage2','Stage 2 Own Notification','Visible',now()-interval '1 minute'),
      (current_setting('stage2.student')::uuid,'stage2','Stage 2 Future Notification','Future',now()+interval '1 day');
select set_config('stage2.own_notification',(select id::text from public.in_app_notifications
  where user_id=current_setting('stage2.student')::uuid and title='Stage 2 Own Notification' order by created_at desc limit 1),true);
insert into public.in_app_notifications(user_id,kind,title,body,available_at)
select p.id,'stage2','Stage 2 Other Notification','Hidden',now()-interval '1 minute'
from public.profiles p where p.id<>current_setting('stage2.student')::uuid order by p.created_at limit 1;

insert into public.batch_offers(batch_id,currency,list_price_minor,sale_price_minor,status)
values(current_setting('stage2.other_batch')::uuid,'INR',10000,7500,'active');

select set_config('request.jwt.claims',
  json_build_object('sub',current_setting('stage2.student'),'role','authenticated')::text,true);
set local role authenticated;

do $$
declare
  b uuid:=current_setting('stage2.batch')::uuid;
  other_b uuid:=current_setting('stage2.other_batch')::uuid;
  released_l uuid:=current_setting('stage2.released_lecture')::uuid;
  future_l uuid:=current_setting('stage2.future_lecture')::uuid;
  released_a uuid:=current_setting('stage2.released_assignment')::uuid;
  future_a uuid:=current_setting('stage2.future_assignment')::uuid;
  attempt_id uuid; qid uuid; oid uuid; payload jsonb; submission_id uuid; order_id uuid;
begin
  if not private.has_batch_access(b) then raise exception 'student: enrolled batch denied'; end if;
  if private.has_batch_access(other_b) then raise exception 'student: unauthorized batch granted'; end if;
  if not exists(select 1 from public.subjects where id=current_setting('stage2.subject')::uuid) then raise exception 'student: subject hidden'; end if;
  if exists(select 1 from public.subjects where id=current_setting('stage2.other_subject')::uuid) then raise exception 'student: unauthorized subject visible'; end if;
  if not exists(select 1 from public.lectures where id=released_l) then raise exception 'student: released lecture hidden'; end if;
  if exists(select 1 from public.lectures where id=future_l) then raise exception 'student: future lecture visible'; end if;
  if exists(select 1 from public.lecture_delivery_sources) then raise exception 'student: raw delivery source visible'; end if;
  if exists(select 1 from public.learning_resource_sources) then raise exception 'student: raw resource source visible'; end if;

  if (select count(*) from public.get_batch_delivery_actions(b) where lecture_id=released_l)<>1 then raise exception 'student: released action missing'; end if;
  if exists(select 1 from public.get_batch_delivery_actions(b) where lecture_id=future_l) then raise exception 'student: future action visible'; end if;
  if exists(select 1 from public.get_batch_delivery_actions(other_b)) then raise exception 'student: unauthorized action visible'; end if;

  if (select count(*) from public.get_batch_learning_resources(b) where resource_id=current_setting('stage2.released_resource')::uuid)<>1 then raise exception 'student: released resource missing'; end if;
  if exists(select 1 from public.get_batch_learning_resources(b)
    where resource_id in(current_setting('stage2.future_resource')::uuid,current_setting('stage2.draft_resource')::uuid))
    then raise exception 'student: unreleased resource visible'; end if;
  if exists(select 1 from public.get_batch_learning_resources(other_b)) then raise exception 'student: unauthorized resource visible'; end if;

  if (select count(*) from public.get_batch_assignments(b) where assignment_id=released_a)<>1 then raise exception 'student: released assignment missing'; end if;
  if exists(select 1 from public.get_batch_assignments(b)
    where assignment_id in(current_setting('stage2.future_assignment')::uuid,current_setting('stage2.draft_assignment')::uuid))
    then raise exception 'student: unreleased assignment visible'; end if;

  submission_id:=public.save_my_assignment_submission(released_a,'Stage 2 response',null,true);
  if submission_id is null then raise exception 'student: submission failed'; end if;
  begin
    perform public.save_my_assignment_submission(future_a,'Should fail',null,true);
    raise exception 'student: future assignment accepted';
  exception when others then
    if sqlerrm='student: future assignment accepted' then raise; end if;
  end;

  if not exists(select 1 from public.get_my_assessment_schedules(b)
    where schedule_id=current_setting('stage2.schedule')::uuid) then raise exception 'student: schedule missing'; end if;
  if exists(select 1 from public.assessment_questions) then raise exception 'student: raw question bank visible'; end if;
  if exists(select 1 from public.assessment_question_keys) then raise exception 'student: answer keys visible'; end if;

  attempt_id:=public.start_assessment_attempt(current_setting('stage2.schedule')::uuid);
  payload:=public.get_assessment_attempt_payload(attempt_id);
  if payload::text like '%is_correct%' or payload::text like '%answer_text_key%' or payload::text like '%numeric_answer_key%'
    then raise exception 'student: answer key leaked in active payload'; end if;

  qid:=(payload->'sections'->0->'questions'->0->>'id')::uuid;
  oid:=(payload->'sections'->0->'questions'->0->'options'->0->>'id')::uuid;
  perform public.save_assessment_attempt_answer(qid,array[oid],null,null);
  perform public.submit_assessment_attempt(attempt_id);
  payload:=public.get_assessment_attempt_result(attempt_id);
  if coalesce((payload->>'released')::boolean,false) then raise exception 'student: manual result released early'; end if;

  if (select count(*) from public.in_app_notifications)<>1 then raise exception 'student: notification isolation failed'; end if;
  perform public.mark_notification_read(current_setting('stage2.own_notification')::uuid);
  perform public.save_my_notification_preferences(false,true);
  if not exists(select 1 from public.notification_preferences where user_id=auth.uid() and not email_enabled and whatsapp_enabled)
    then raise exception 'student: preference save failed'; end if;

  order_id:=public.create_commerce_order(other_b,null,'manual');
  if not exists(select 1 from public.commerce_orders where id=order_id and student_id=auth.uid()) then raise exception 'student: own order hidden'; end if;
  if exists(select 1 from public.commerce_orders where student_id<>auth.uid()) then raise exception 'student: other order visible'; end if;

  perform set_config('stage2.attempt',attempt_id::text,true);
end $$;

reset role;
update public.assessment_test_schedules set manual_results_released=true where id=current_setting('stage2.schedule')::uuid;

set local role authenticated;
do $$
declare payload jsonb;
begin
  payload:=public.get_assessment_attempt_result(current_setting('stage2.attempt')::uuid);
  if not coalesce((payload->>'released')::boolean,false) then raise exception 'student: released result hidden'; end if;
  if payload->>'score' is null or (payload->>'max_score')::numeric<>1 then raise exception 'student: score missing'; end if;
  if (public.get_my_assessment_analytics(current_setting('stage2.batch')::uuid)->'summary'->>'attempt_count')::int<1
    then raise exception 'student: analytics missing'; end if;
end $$;

reset role;
rollback;
select 'PASS: Stage 2 student end-to-end rollback acceptance' as result;
