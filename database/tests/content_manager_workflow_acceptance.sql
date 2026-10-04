-- Statistics Lover Stage 4: rollback-only Content Manager acceptance.
-- Creates a complete temporary academic/content tree and verifies both allowed
-- content lifecycle operations and denied administrative boundaries.

begin;

select set_config('stage4.cm',
  (
    select p.id::text
    from public.profiles p
    where p.account_status='active'::public.account_status
      and exists(select 1 from public.user_roles ur where ur.user_id=p.id and ur.role='student'::public.app_role)
      and not exists(select 1 from public.user_roles ur where ur.user_id=p.id and ur.role<>'student'::public.app_role)
    order by p.created_at
    limit 1
  ),true);

select set_config('stage4.attendance_lecture',
  (
    select l.id::text
    from public.lectures l
    join public.modules m on m.id=l.module_id
    join public.subjects s on s.id=m.subject_id
    where exists(
      select 1 from public.enrollments e
      where e.batch_id=s.batch_id and e.status='active'::public.enrollment_status
    )
    order by l.created_at limit 1
  ),true);

select set_config('stage4.attendance_enrollment',
  (
    select e.id::text
    from public.enrollments e
    join public.subjects s on s.batch_id=e.batch_id
    join public.modules m on m.subject_id=s.id
    join public.lectures l on l.module_id=m.id
    where l.id=current_setting('stage4.attendance_lecture')::uuid
      and e.status='active'::public.enrollment_status
    order by e.created_at limit 1
  ),true);

delete from public.enrollments where student_id=current_setting('stage4.cm')::uuid;
insert into public.user_roles(user_id,role,assigned_by)
values(current_setting('stage4.cm')::uuid,'content_manager'::public.app_role,null)
on conflict do nothing;

select set_config('request.jwt.claims',
  json_build_object('sub',current_setting('stage4.cm'),'role','authenticated')::text,true);
set local role authenticated;

do $$
declare
  v_course uuid; v_batch uuid; v_subject uuid; v_module uuid; v_lecture uuid;
  v_delivery uuid; v_resource uuid; v_assignment uuid; v_question uuid;
  v_test uuid; v_schedule uuid; target_student uuid; target_teacher uuid;
  affected integer; blocked boolean;
begin
  if not private.has_role('content_manager'::public.app_role) then raise exception 'content_manager: role denied'; end if;
  if private.has_any_role(array['admin','owner']::public.app_role[]) then raise exception 'content_manager: privileged helper true'; end if;
  if (select count(*) from public.profiles)<>1 then raise exception 'content_manager: profile scope too broad'; end if;
  if exists(select 1 from public.audit_logs) then raise exception 'content_manager: audit visible'; end if;
  if exists(select 1 from public.app_settings) then raise exception 'content_manager: settings visible'; end if;

  insert into public.courses(slug,title,status)
  values('stage4-course-'||substr(gen_random_uuid()::text,1,8),'Stage 4 Course','draft')
  returning id into v_course;
  update public.courses set status='published',published_at=now() where id=v_course;

  insert into public.batches(course_id,slug,title,status)
  values(v_course,'stage4-batch-'||substr(gen_random_uuid()::text,1,8),'Stage 4 Batch','draft')
  returning id into v_batch;
  update public.batches set status='active' where id=v_batch;

  insert into public.subjects(batch_id,slug,title,status,position)
  values(v_batch,'stage4-subject','Stage 4 Subject','draft',1)
  returning id into v_subject;
  update public.subjects set status='published' where id=v_subject;

  insert into public.modules(subject_id,slug,title,status,position)
  values(v_subject,'stage4-module','Stage 4 Module','draft',1)
  returning id into v_module;
  update public.modules set status='published' where id=v_module;

  insert into public.lectures(module_id,slug,title,status,delivery_mode,scheduled_at)
  values(v_module,'stage4-lecture','Stage 4 Lecture','draft','hybrid',now()+interval '1 day')
  returning id into v_lecture;
  update public.lectures set status='published',release_at=now(),published_at=now() where id=v_lecture;

  insert into public.lecture_delivery_sources(lecture_id,action_kind,provider,provider_reference,label)
  values(v_lecture,'watch','external','https://example.com/stage4-recording','Watch')
  returning id into v_delivery;

  insert into public.learning_resources(batch_id,scope,subject_id,kind,title,status,release_at)
  values(v_batch,'subject',v_subject,'notes','Stage 4 Notes','draft',now())
  returning id into v_resource;
  update public.learning_resources set status='published' where id=v_resource;
  insert into public.learning_resource_sources(resource_id,provider,provider_reference,action_label,file_name,mime_type)
  values(v_resource,'external','https://example.com/stage4-notes.pdf','Open','stage4.pdf','application/pdf');

  insert into public.assignments(batch_id,scope,subject_id,title,status,release_at,due_at,max_score)
  values(v_batch,'subject',v_subject,'Stage 4 Assignment','draft',now(),now()+interval '7 day',10)
  returning id into v_assignment;
  update public.assignments set status='published' where id=v_assignment;

  v_question:=public.save_assessment_question(
    null,v_subject,v_module,v_lecture,'single_choice','medium','original',null,null,
    'Stage 4 question',null,1,0,'published',
    '[{"text":"Correct","position":0,"is_correct":true},{"text":"Wrong","position":1,"is_correct":false}]'::jsonb,
    null,null,0);

  v_test:=public.save_assessment_test(
    null,v_batch,'subject',v_subject,'Stage 4 Test',null,null,'published',30,1,false,false,
    jsonb_build_array(jsonb_build_object(
      'subject_id',v_subject::text,'title','Stage 4 Section','position',0,
      'questions',jsonb_build_array(jsonb_build_object('question_id',v_question::text,'position',0,'marks',1,'negative_marks',0))
    )));

  v_schedule:=public.save_assessment_test_schedule(
    null,v_test,'Stage 4 Schedule',now()+interval '1 hour',now()+interval '2 hour',
    'batch','immediate',null,true,array[]::uuid[]);
  perform public.get_assessment_test_analytics(v_test);

  insert into public.announcements(scope,batch_id,subject_id,title,body,status,publish_at)
  values('subject',v_batch,v_subject,'Stage 4 Announcement','Content manager announcement','published',now());

  update public.courses set status='archived' where id=v_course;
  delete from public.courses where id=v_course;
  get diagnostics affected = row_count;
  if affected<>0 or not exists(select 1 from public.courses where id=v_course) then
    raise exception 'content_manager: hard delete allowed';
  end if;

  select p.id into target_student from public.profiles p where p.id<>auth.uid() order by p.created_at limit 1;

  blocked:=false;
  begin insert into public.enrollments(student_id,batch_id,status,source) values(target_student,v_batch,'active','stage4');
  exception when others then blocked:=true; end;
  if not blocked then raise exception 'content_manager: enrollment mutation allowed'; end if;

  select ur.user_id into target_teacher from public.user_roles ur
  where ur.role='teacher'::public.app_role and ur.user_id<>auth.uid() limit 1;
  if target_teacher is not null then
    blocked:=false;
    begin insert into public.teacher_assignments(teacher_id,batch_id,subject_id,is_active)
      values(target_teacher,v_batch,v_subject,true);
    exception when others then blocked:=true; end;
    if not blocked then raise exception 'content_manager: teacher assignment allowed'; end if;
  end if;

  blocked:=false;
  begin insert into public.batch_offers(batch_id,currency,list_price_minor,status) values(v_batch,'INR',10000,'active');
  exception when others then blocked:=true; end;
  if not blocked then raise exception 'content_manager: commerce mutation allowed'; end if;

  blocked:=false;
  begin insert into public.user_roles(user_id,role,assigned_by) values(target_student,'teacher'::public.app_role,auth.uid());
  exception when others then blocked:=true; end;
  if not blocked then raise exception 'content_manager: role mutation allowed'; end if;

  if nullif(current_setting('stage4.attendance_lecture',true),'') is not null
     and nullif(current_setting('stage4.attendance_enrollment',true),'') is not null then
    blocked:=false;
    begin insert into public.lecture_attendance(lecture_id,enrollment_id,status)
      values(current_setting('stage4.attendance_lecture')::uuid,current_setting('stage4.attendance_enrollment')::uuid,'present');
    exception when others then blocked:=true; end;
    if not blocked then raise exception 'content_manager: attendance mutation allowed'; end if;
  end if;
end $$;

reset role;
rollback;
select 'PASS: Stage 4 content manager lifecycle rollback acceptance' as result;
