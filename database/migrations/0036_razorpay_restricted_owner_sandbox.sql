-- Stage 7D: completely hidden, owner-only Razorpay test offer.
-- This is an isolated Test Mode fixture. Never publish/activate the course, batch or offer.
create table if not exists public.commerce_sandbox_orders(
  order_id uuid primary key references public.commerce_orders(id) on delete cascade,
  owner_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
alter table public.commerce_sandbox_orders enable row level security;
revoke all on public.commerce_sandbox_orders from public,anon,authenticated;
grant select on public.commerce_sandbox_orders to service_role;

with c as (
  insert into public.courses(slug,title,short_description,status)
  values('statistics-lover-razorpay-sandbox',
         '[SANDBOX] Razorpay Payment Verification',
         'Private test-only course. Do not publish.',
         'draft'::public.course_status)
  on conflict (slug) do nothing returning id
), course_row as (
  select id from c
  union all
  select id from public.courses where slug='statistics-lover-razorpay-sandbox'
  limit 1
), b as (
  insert into public.batches(course_id,slug,title,status)
  select id,'statistics-lover-razorpay-sandbox-batch',
         '[SANDBOX] Razorpay ₹1 Payment Test','draft'::public.batch_status
  from course_row
  on conflict(course_id,slug) do nothing returning id
), batch_row as (
  select id from b
  union all
  select id from public.batches where slug='statistics-lover-razorpay-sandbox-batch'
  limit 1
)
insert into public.batch_offers(batch_id,currency,list_price_minor,sale_price_minor,status)
select id,'INR',100,null,'inactive'::public.commerce_offer_status from batch_row
on conflict(batch_id) do nothing;

create or replace function public.create_razorpay_sandbox_order()
returns uuid language plpgsql security definer set search_path='' as $$
declare
  owner_user uuid:=auth.uid();
  test_batch uuid;
  test_offer uuid;
  existing uuid;
  new_order uuid;
begin
  if owner_user is null or not private.is_active_user()
     or not private.has_role('owner'::public.app_role) then
    raise exception 'Only an active owner can initiate a sandbox checkout';
  end if;
  select b.id,bo.id into test_batch,test_offer
  from public.courses c
  join public.batches b on b.course_id=c.id
  join public.batch_offers bo on bo.batch_id=b.id
  where c.slug='statistics-lover-razorpay-sandbox'
    and c.status='draft'::public.course_status
    and b.slug='statistics-lover-razorpay-sandbox-batch'
    and b.status='draft'::public.batch_status
    and bo.status='inactive'::public.commerce_offer_status
    and bo.currency='INR'
    and bo.list_price_minor=100
    and bo.sale_price_minor is null
  limit 1;
  if test_batch is null then
    raise exception 'Private sandbox offer is unavailable or incorrectly configured';
  end if;
  select o.id into existing
  from public.commerce_sandbox_orders s
  join public.commerce_orders o on o.id=s.order_id
  where s.owner_id=owner_user and o.student_id=owner_user
    and o.batch_id=test_batch and o.provider='razorpay'::public.commerce_payment_provider
    and o.status='pending'::public.commerce_order_status and o.expires_at>now()
  order by o.created_at desc limit 1;
  if existing is not null then return existing; end if;
  insert into public.commerce_orders(
    student_id,batch_id,offer_id,currency,subtotal_minor,discount_minor,total_minor,provider
  ) values(
    owner_user,test_batch,test_offer,'INR',100,0,100,'razorpay'::public.commerce_payment_provider
  ) returning id into new_order;
  insert into public.commerce_sandbox_orders(order_id,owner_id) values(new_order,owner_user);
  return new_order;
end; $$;
revoke all on function public.create_razorpay_sandbox_order() from public,anon;
grant execute on function public.create_razorpay_sandbox_order() to authenticated;
