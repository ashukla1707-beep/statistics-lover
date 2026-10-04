-- Statistics Lover Stage 5: rollback-only Owner operational acceptance.
-- Admin escalation boundaries are covered by Stage 1 auth_role_acceptance.sql.

begin;

select set_config('stage5.owner',(select user_id::text from public.user_roles where role='owner' order by created_at limit 1),true);
select set_config('stage5.target',(
  select p.id::text from public.profiles p
  where p.id<>current_setting('stage5.owner')::uuid and p.account_status='active'
  order by p.created_at limit 1
),true);
select set_config('stage5.setting_key',(select key from public.app_settings order by key limit 1),true);
select set_config('stage5.setting_value',(select value::text from public.app_settings where key=current_setting('stage5.setting_key')),true);

with c as (
  insert into public.courses(slug,title,status)
  values('stage5-'||substr(gen_random_uuid()::text,1,8),'Stage 5 Course','published') returning id
), b as (
  insert into public.batches(course_id,slug,title,status)
  select id,'stage5-batch','Stage 5 Batch','active' from c returning id,course_id
)
select set_config('stage5.course',(select course_id::text from b),true),
       set_config('stage5.batch',(select id::text from b),true);

insert into public.batch_offers(batch_id,currency,list_price_minor,sale_price_minor,status)
values(current_setting('stage5.batch')::uuid,'INR',50000,40000,'active');

select set_config('request.jwt.claims',
  json_build_object('sub',current_setting('stage5.target'),'role','authenticated')::text,true);
set local role authenticated;
select set_config('stage5.order',
  public.create_commerce_order(current_setting('stage5.batch')::uuid,null,'manual')::text,true);
reset role;

select set_config('request.jwt.claims',
  json_build_object('sub',current_setting('stage5.owner'),'role','authenticated')::text,true);
set local role authenticated;

do $$
declare
  v_owner uuid:=current_setting('stage5.owner')::uuid;
  v_target uuid:=current_setting('stage5.target')::uuid;
  v_batch uuid:=current_setting('stage5.batch')::uuid;
  v_order uuid:=current_setting('stage5.order')::uuid;
  v_enrollment uuid; v_assignment uuid; v_receipt uuid; v_delete_course uuid;
begin
  if (select count(*) from public.profiles)<2 then raise exception 'owner: profile visibility failed'; end if;
  if not exists(select 1 from public.audit_logs) then raise exception 'owner: audit visibility failed'; end if;
  if not exists(select 1 from public.app_settings) then raise exception 'owner: settings visibility failed'; end if;

  insert into public.enrollments(student_id,batch_id,status,source,granted_by)
  values(v_target,v_batch,'active','manual',v_owner)
  returning id into v_enrollment;
  update public.enrollments set status='completed' where id=v_enrollment;
  delete from public.enrollments where id=v_enrollment;
  if exists(select 1 from public.enrollments where id=v_enrollment) then
    raise exception 'owner: enrollment CRUD failed';
  end if;

  insert into public.user_roles(user_id,role,assigned_by)
  values(v_target,'teacher',v_owner)
  on conflict do nothing;

  insert into public.teacher_assignments(teacher_id,batch_id,subject_id,assigned_by,is_active)
  values(v_target,v_batch,null,v_owner,true)
  returning id into v_assignment;
  update public.teacher_assignments set is_active=false where id=v_assignment;
  delete from public.teacher_assignments where id=v_assignment;
  if exists(select 1 from public.teacher_assignments where id=v_assignment) then
    raise exception 'owner: teacher assignment CRUD failed';
  end if;

  if not exists(select 1 from public.commerce_orders where id=v_order) then
    raise exception 'owner: order visibility failed';
  end if;

  v_receipt:=public.mark_commerce_order_paid(v_order,'STAGE5-MANUAL');
  if v_receipt is null then raise exception 'owner: payment finalize failed'; end if;
  if not exists(select 1 from public.commerce_orders where id=v_order and status='paid') then
    raise exception 'owner: paid status missing';
  end if;
  if not exists(select 1 from public.commerce_receipts cr where cr.order_id=v_order) then
    raise exception 'owner: receipt missing';
  end if;
  if not exists(select 1 from public.enrollments e
    where e.student_id=v_target and e.batch_id=v_batch and e.status='active') then
    raise exception 'owner: paid order did not provision access';
  end if;

  perform public.save_app_setting(
    current_setting('stage5.setting_key'),
    current_setting('stage5.setting_value')::jsonb
  );

  insert into public.courses(slug,title,status)
  values('stage5-delete-'||substr(gen_random_uuid()::text,1,8),'Stage 5 Delete Probe','draft')
  returning id into v_delete_course;
  delete from public.courses where id=v_delete_course;
  if exists(select 1 from public.courses where id=v_delete_course) then
    raise exception 'owner: destructive core delete failed';
  end if;
end $$;

reset role;
rollback;

select 'PASS: Stage 5 owner operational workflow rollback acceptance' as result;
