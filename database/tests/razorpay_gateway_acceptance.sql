-- Statistics Lover Stage 7: rollback-only Razorpay internal payment-domain acceptance.
-- This does not call the Razorpay network and uses no merchant credentials.
-- It verifies the Statistics Lover side of order binding/finalization/idempotency.

begin;

select set_config(
  'stage7.student',
  (
    select p.id::text
    from public.profiles p
    where p.account_status='active'::public.account_status
      and exists(select 1 from public.user_roles ur where ur.user_id=p.id and ur.role='student'::public.app_role)
      and not exists(select 1 from public.user_roles ur where ur.user_id=p.id and ur.role<>'student'::public.app_role)
    order by p.created_at limit 1
  ),true);

with c as (
  insert into public.courses(slug,title,status,published_at)
  values('stage7-'||substr(gen_random_uuid()::text,1,8),'Stage 7 Razorpay Course','published',now())
  returning id
), b as (
  insert into public.batches(course_id,slug,title,status)
  select id,'stage7-razorpay-batch','Stage 7 Razorpay Batch','active' from c
  returning id
), o as (
  insert into public.batch_offers(batch_id,currency,list_price_minor,sale_price_minor,status)
  select id,'INR',19900,14900,'active' from b
  returning id,batch_id
)
select set_config('stage7.batch',(select batch_id::text from o),true);

select set_config(
  'request.jwt.claims',
  json_build_object('sub',current_setting('stage7.student'),'role','authenticated')::text,
  true
);
set local role authenticated;

select set_config(
  'stage7.order',
  public.create_commerce_order(
    current_setting('stage7.batch')::uuid,
    null,
    'razorpay'::public.commerce_payment_provider
  )::text,
  true
);

do $$
begin
  if not exists(
    select 1 from public.commerce_orders o
    where o.id=current_setting('stage7.order')::uuid
      and o.student_id=auth.uid()
      and o.provider='razorpay'
      and o.status='pending'
      and o.total_minor=14900
      and o.currency='INR'
  ) then raise exception 'stage7: order creation failed'; end if;
end $$;

reset role;
select set_config('request.jwt.claims',json_build_object('role','service_role')::text,true);
set local role service_role;

select public.bind_commerce_provider_order(
  current_setting('stage7.order')::uuid,
  'razorpay'::public.commerce_payment_provider,
  'order_stage7_acceptance'
);

do $$
declare
  v_result uuid;
  v_repeat uuid;
  blocked boolean:=false;
begin
  begin
    perform public.record_verified_commerce_payment(
      current_setting('stage7.order')::uuid,
      'razorpay',
      'payment:stage7_wrong:captured',
      'pay_stage7_wrong',
      14899,'INR',
      '{"source":"stage7_acceptance","captured":true}'::jsonb
    );
  exception when others then blocked:=true; end;

  if not blocked then raise exception 'stage7: wrong amount accepted'; end if;
  if exists(
    select 1 from public.enrollments e
    where e.student_id=current_setting('stage7.student')::uuid
      and e.batch_id=current_setting('stage7.batch')::uuid
      and e.status='active'
  ) then raise exception 'stage7: premature enrollment'; end if;

  v_result:=public.record_verified_commerce_payment(
    current_setting('stage7.order')::uuid,
    'razorpay',
    'payment:stage7_valid:captured',
    'pay_stage7_valid',
    14900,'INR',
    '{"source":"stage7_acceptance","captured":true}'::jsonb
  );

  if v_result<>current_setting('stage7.order')::uuid then
    raise exception 'stage7: finalizer returned unexpected order id';
  end if;

  if not exists(
    select 1 from public.commerce_orders o
    where o.id=current_setting('stage7.order')::uuid
      and o.status='paid'
      and o.provider_payment_reference='pay_stage7_valid'
  ) then raise exception 'stage7: order not finalized'; end if;

  if not exists(
    select 1 from public.commerce_receipts r
    where r.order_id=current_setting('stage7.order')::uuid
  ) then raise exception 'stage7: receipt missing'; end if;

  if not exists(
    select 1 from public.enrollments e
    where e.student_id=current_setting('stage7.student')::uuid
      and e.batch_id=current_setting('stage7.batch')::uuid
      and e.status='active'
  ) then raise exception 'stage7: enrollment missing'; end if;

  v_repeat:=public.record_verified_commerce_payment(
    current_setting('stage7.order')::uuid,
    'razorpay',
    'payment:stage7_valid:captured',
    'pay_stage7_valid',
    14900,'INR',
    '{"source":"stage7_acceptance_replay","captured":true}'::jsonb
  );

  if v_repeat<>v_result then raise exception 'stage7: replay not idempotent'; end if;
  if (select count(*) from public.commerce_payments p
      where p.order_id=current_setting('stage7.order')::uuid
        and p.provider_event_id='payment:stage7_valid:captured')<>1
  then raise exception 'stage7: payment duplicated'; end if;
  if (select count(*) from public.commerce_receipts r
      where r.order_id=current_setting('stage7.order')::uuid)<>1
  then raise exception 'stage7: receipt duplicated'; end if;
end $$;

reset role;
rollback;

select 'PASS: Stage 7 Razorpay internal payment-domain rollback acceptance' as result;
