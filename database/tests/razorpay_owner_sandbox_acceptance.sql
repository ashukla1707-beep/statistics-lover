-- Rollback-only owner/private-offer security acceptance.
begin;
select set_config('test.owner',(select user_id::text from public.user_roles where role='owner' limit 1),true);
select set_config('test.student',(select user_id::text from public.user_roles where role='student' and user_id<>current_setting('test.owner')::uuid limit 1),true);
select set_config('request.jwt.claims',json_build_object('role','authenticated','sub',current_setting('test.owner'))::text,true);
set local role authenticated;
do $$
declare v_order uuid;
begin
  v_order:=public.create_razorpay_sandbox_order();
  if not exists(select 1 from public.commerce_orders o
     where o.id=v_order and o.student_id=auth.uid()
       and o.total_minor=100 and o.currency='INR'
       and o.provider='razorpay' and o.status='pending') then
    raise exception 'Owner sandbox order violates ₹1 conditions';
  end if;
  if public.create_razorpay_sandbox_order()<>v_order then
    raise exception 'Pending sandbox order not reused';
  end if;
  perform set_config('test.order',v_order::text,true);
end $$;
reset role;
select set_config('request.jwt.claims',json_build_object('role','authenticated','sub',current_setting('test.student'))::text,true);
set local role authenticated;
do $$
declare blocked bool:=false;
begin
  begin
    perform public.create_razorpay_sandbox_order();
  exception when others then blocked:=true; end;
  if not blocked then raise exception 'Normal student created sandbox order'; end if;
end $$;
reset role;
do $$
begin
  if not exists(select 1 from public.commerce_sandbox_orders
     where order_id=current_setting('test.order')::uuid) then
    raise exception 'Server-owned sandbox marker missing';
  end if;
  if exists(select 1 from public.get_public_batch_offers()
    where batch_title='[SANDBOX] Razorpay ₹1 Payment Test') then
    raise exception 'Sandbox offer leaked into public store';
  end if;
  if has_function_privilege('anon','public.create_razorpay_sandbox_order()','EXECUTE') then
    raise exception 'Anonymous caller has sandbox order permission';
  end if;
end $$;
rollback;
select 'PASS: owner-only hidden ₹1 sandbox order; all test data rolled back' as result;
