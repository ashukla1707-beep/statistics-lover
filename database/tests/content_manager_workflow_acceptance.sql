-- Statistics Lover Stage 4: rollback-only Content Manager acceptance.
-- All changes are rolled back.

begin;

select set_config('stage4.user',
  (
    select p.id::text from public.profiles p
    where p.account_status='active'
      and exists(select 1 from public.user_roles ur where ur.user_id=p.id and ur.role='student')
      and not exists(select 1 from public.user_roles ur where ur.user_id=p.id and ur.role<>'student')
    order by p.created_at limit 1
  ),true);

delete from public.enrollments where student_id=current_setting('stage4.user')::uuid;
insert into public.user_roles(user_id,role,assigned_by)
values(current_setting('stage4.user')::uuid,'content_manager',null)
on conflict do nothing;

select set_config('request.jwt.claims',
  json_build_object('sub',current_setting('stage4.user'),'role','authenticated')::text,true);
set local role authenticated;

do $$
declare
  v_course uuid; v_batch uuid; v_subject uuid; v_module uuid; v_lecture uuid;
  v_resource uuid; v_assignment uuid; v_question uuid; v_test uuid; v_schedule uuid;
  v_announcement uuid; v_delivery uuid; before_count int; blocked boolean;
begin
  insert into public.courses(slug,title,status)
  values('stage4-'||substr(gen_random_uuid()::text,1,8),'Stage 4 Course','draft')
  returning id into v_course;
  update public.courses set status='published',published_at=now() where id=v_course;

  insert into public.batches(course_id,slug,title,status)
  values(v_course,'stage4-batch','Stage 4 Batch','draft') returning id into v_batch;
  update public.batches set status='active' where id=v_batch;

  insert into public.subjects(batch_id,slug,title,status,position)
  values(v_batch,'stage4-subject','Stage 4 Subject','draft',1) returning id into v_subject;
  update public.subjects set status='published' where id=v_subject;

  insert into public.modules(subject_id,slug,title,status,position)
  values(v_subject,'stage4-module','Stage 4 Module','draft',1) returning id into v_module;
  update public.modules set status='published' where id=v_module;

  insert into public.lectures(module_id,slug,title,status,delivery_mode,position)
  values(v_module,'stage4-lecture','Stage 4 Lecture','draft','hybrid',1)
  returning id into v_lecture;
  update public.lectures set status='published',release_at=now(),published_at=now() where id=v_lecture;

  insert into public.lecture_delivery_sources(lecture_id,action_kind,provider,provider_reference,label)
  values(v_lecture,'join','external','https://example.com/stage4-live','Join')
  returning id into v_delivery;

  insert into public.learning_resources(batch_id,scope,subject_id,kind,title,status,position)
  values(v_batch,'subject',v_subject,'notes','Stage 4 Notes','draft',1)
  returning id into v_resource;
  insert into public.learning_resource_sources(resource_id,provider,provider_reference,action_label)
  values(v_resource,'external','https://example.com/stage4-notes.pdf','Open notes');
  update public.learning_resources set status='published',release_at=now() where id=v_resource;

  insert into public.assignments(batch_id,scope,subject_id,title,status,max_score)
  values(v_batch,'subject',v_subject,'Stage 4 Assignment','draft',10)
  returning id into v_assignment;
  update public.assignments set status='published',release_at=now(),due_at=now()+interval '1 day'
  where id=v_assignment;

  v_question:=public.save_assessment_question(
    null,v_subject,v_module,v_lecture,
    'single_choice','easy','original',null,null,
    'Stage 4 question',null,1,0,'published',
    '[{"text":"A","position":0,"is_correct":true},{"text":"B","position":1,"is_correct":false}]'::jsonb,
    null,null,0
  );

  v_test:=public.save_assessment_test(
    null,v_batch,'subject',v_subject,'Stage 4 Test',null,null,'published',30,1,false,false,
    jsonb_build_array(
      jsonb_build_object(
        'subject_id',v_subject::text,'title','Stage 4 Section','position',0,
        'questions',jsonb_build_array(
          jsonb_build_object('question_id',v_question::text,'position',0,'marks',1,'negative_marks',0)
        )
      )
    )
  );

  v_schedule:=public.save_assessment_test_schedule(
    null,v_test,'Stage 4 Schedule',now()+interval '1 hour',now()+interval '2 hours',
    'batch','manual',null,true,array[]::uuid[]
  );
  update public.assessment_test_schedules set manual_results_released=true where id=v_schedule;

  insert into public.announcements(scope,batch_id,title,body,status,publish_at)
  values('batch',v_batch,'Stage 4 Announcement','Stage 4 body','draft',null)
  returning id into v_announcement;
  update public.announcements set status='published',publish_at=now() where id=v_announcement;

  if (select count(*) from public.profiles)<>1 then raise exception 'content_manager: profile boundary failed'; end if;
  if exists(select 1 from public.audit_logs) then raise exception 'content_manager: audit visible'; end if;
  if exists(select 1 from public.app_settings) then raise exception 'content_manager: settings visible'; end if;
  if exists(select 1 from public.enrollments) then raise exception 'content_manager: enrollments visible'; end if;
  if exists(select 1 from public.commerce_orders) then raise exception 'content_manager: commerce visible'; end if;

  blocked:=false;
  begin
    insert into public.enrollments(student_id,batch_id,status,source,granted_by)
    values(auth.uid(),v_batch,'active','admin',auth.uid());
  exception when others then blocked:=true; end;
  if not blocked then raise exception 'content_manager: enrollment creation allowed'; end if;

  blocked:=false;
  begin
    insert into public.user_roles(user_id,role,assigned_by)
    values(auth.uid(),'admin',auth.uid());
  exception when others then blocked:=true; end;
  if not blocked then raise exception 'content_manager: role escalation allowed'; end if;

  select count(*) into before_count from public.courses where id=v_course;
  delete from public.courses where id=v_course;
  if before_count<>1 or not exists(select 1 from public.courses where id=v_course) then
    raise exception 'content_manager: core deletion boundary failed';
  end if;

  delete from public.assessment_test_schedules where id=v_schedule;
  if exists(select 1 from public.assessment_test_schedules where id=v_schedule) then
    raise exception 'content_manager: schedule deletion failed';
  end if;
end $$;

reset role;
rollback;

select 'PASS: Stage 4 content-manager lifecycle rollback acceptance' as result;
