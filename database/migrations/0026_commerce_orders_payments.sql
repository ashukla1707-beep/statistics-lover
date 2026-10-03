-- Statistics Lover: commerce orders, verified payments, receipts, coupons and payment-triggered enrollment

create type public.commerce_offer_status as enum ('active','inactive');
create type public.commerce_discount_type as enum ('percent','fixed');
create type public.commerce_order_status as enum ('pending','paid','cancelled','failed','refunded');
create type public.commerce_payment_provider as enum ('manual','razorpay','stripe','external');
create type public.commerce_payment_status as enum ('verified','failed','refunded');

create sequence public.commerce_order_number_seq;
create sequence public.commerce_receipt_number_seq;

create table public.batch_offers (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null unique references public.batches(id) on delete cascade,
  currency text not null default 'INR',
  list_price_minor bigint not null,
  sale_price_minor bigint,
  access_days integer,
  status public.commerce_offer_status not null default 'inactive',
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint batch_offers_currency check (currency ~ '^[A-Z]{3}$'),
  constraint batch_offers_list_price check (list_price_minor > 0),
  constraint batch_offers_sale_price check (sale_price_minor is null or (sale_price_minor >= 0 and sale_price_minor <= list_price_minor)),
  constraint batch_offers_access_days check (access_days is null or access_days > 0)
);

create table public.commerce_coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  discount_type public.commerce_discount_type not null,
  discount_value numeric(12,2) not null,
  max_discount_minor bigint,
  min_order_minor bigint not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  max_redemptions integer,
  per_user_limit integer not null default 1,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commerce_coupons_code_format check (code=upper(code) and code ~ '^[A-Z0-9_-]{2,40}$'),
  constraint commerce_coupons_description_length check (description is null or char_length(description)<=500),
  constraint commerce_coupons_discount_positive check (discount_value > 0),
  constraint commerce_coupons_percent_cap check (discount_type<>'percent'::public.commerce_discount_type or discount_value<=100),
  constraint commerce_coupons_max_discount_nonnegative check (max_discount_minor is null or max_discount_minor>=0),
  constraint commerce_coupons_min_order_nonnegative check (min_order_minor>=0),
  constraint commerce_coupons_window_order check (starts_at is null or ends_at is null or starts_at<=ends_at),
  constraint commerce_coupons_max_redemptions_positive check (max_redemptions is null or max_redemptions>0),
  constraint commerce_coupons_user_limit_positive check (per_user_limit>0)
);

create table public.commerce_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('SL-'||to_char(now(),'YYYYMM')||'-'||lpad(nextval('public.commerce_order_number_seq')::text,7,'0')),
  student_id uuid not null references public.profiles(id) on delete restrict,
  batch_id uuid not null references public.batches(id) on delete restrict,
  offer_id uuid not null references public.batch_offers(id) on delete restrict,
  currency text not null,
  subtotal_minor bigint not null,
  discount_minor bigint not null default 0,
  total_minor bigint not null,
  coupon_id uuid references public.commerce_coupons(id) on delete set null,
  coupon_code text,
  status public.commerce_order_status not null default 'pending',
  provider public.commerce_payment_provider not null default 'manual',
  provider_order_reference text,
  provider_payment_reference text,
  expires_at timestamptz not null default (now()+interval '30 minutes'),
  paid_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commerce_orders_currency check (currency ~ '^[A-Z]{3}$'),
  constraint commerce_orders_subtotal_nonnegative check (subtotal_minor>=0),
  constraint commerce_orders_discount_nonnegative check (discount_minor>=0),
  constraint commerce_orders_total_nonnegative check (total_minor>=0),
  constraint commerce_orders_math check (subtotal_minor-discount_minor=total_minor),
  constraint commerce_orders_discount_cap check (discount_minor<=subtotal_minor)
);

create table public.commerce_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.commerce_orders(id) on delete restrict,
  provider public.commerce_payment_provider not null,
  provider_event_id text not null,
  provider_payment_reference text,
  amount_minor bigint not null,
  currency text not null,
  status public.commerce_payment_status not null,
  payload jsonb,
  processed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint commerce_payments_event_key unique(provider,provider_event_id),
  constraint commerce_payments_amount_nonnegative check (amount_minor>=0),
  constraint commerce_payments_currency check (currency ~ '^[A-Z]{3}$')
);

create table public.commerce_receipts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.commerce_orders(id) on delete restrict,
  receipt_number text not null unique default ('SLR-'||to_char(now(),'YYYYMM')||'-'||lpad(nextval('public.commerce_receipt_number_seq')::text,7,'0')),
  student_id uuid not null references public.profiles(id) on delete restrict,
  student_name text,
  student_email text,
  course_title text not null,
  batch_title text not null,
  currency text not null,
  subtotal_minor bigint not null,
  discount_minor bigint not null,
  total_minor bigint not null,
  issued_at timestamptz not null default now()
);

create index batch_offers_status_idx on public.batch_offers(status,batch_id);
create index batch_offers_created_by_idx on public.batch_offers(created_by);
create index commerce_coupons_active_window_idx on public.commerce_coupons(is_active,starts_at,ends_at);
create index commerce_coupons_created_by_idx on public.commerce_coupons(created_by);
create index commerce_orders_student_idx on public.commerce_orders(student_id,created_at desc);
create index commerce_orders_batch_idx on public.commerce_orders(batch_id,status);
create index commerce_orders_coupon_idx on public.commerce_orders(coupon_id) where coupon_id is not null;
create index commerce_payments_order_idx on public.commerce_payments(order_id,created_at desc);
create index commerce_receipts_student_idx on public.commerce_receipts(student_id,issued_at desc);

create trigger batch_offers_set_updated_at before update on public.batch_offers for each row execute function public.set_updated_at();
create trigger commerce_coupons_set_updated_at before update on public.commerce_coupons for each row execute function public.set_updated_at();
create trigger commerce_orders_set_updated_at before update on public.commerce_orders for each row execute function public.set_updated_at();

alter table public.batch_offers enable row level security;
alter table public.commerce_coupons enable row level security;
alter table public.commerce_orders enable row level security;
alter table public.commerce_payments enable row level security;
alter table public.commerce_receipts enable row level security;

revoke all on table public.batch_offers from anon,authenticated;
revoke all on table public.commerce_coupons from anon,authenticated;
revoke all on table public.commerce_orders from anon,authenticated;
revoke all on table public.commerce_payments from anon,authenticated;
revoke all on table public.commerce_receipts from anon,authenticated;

grant select on table public.batch_offers to anon,authenticated;
grant select,insert,update,delete on table public.batch_offers to authenticated,service_role;
grant select,insert,update,delete on table public.commerce_coupons to authenticated,service_role;
grant select on table public.commerce_orders to authenticated;
grant select,insert,update,delete on table public.commerce_orders to service_role;
grant select on table public.commerce_payments to authenticated;
grant select,insert,update,delete on table public.commerce_payments to service_role;
grant select on table public.commerce_receipts to authenticated;
grant select,insert,update,delete on table public.commerce_receipts to service_role;

grant usage on type public.commerce_offer_status to anon,authenticated,service_role;
grant usage on type public.commerce_discount_type to authenticated,service_role;
grant usage on type public.commerce_order_status to authenticated,service_role;
grant usage on type public.commerce_payment_provider to authenticated,service_role;
grant usage on type public.commerce_payment_status to authenticated,service_role;

create policy batch_offers_read_public on public.batch_offers for select to anon using (
  status='active'::public.commerce_offer_status and exists(
    select 1 from public.batches b join public.courses c on c.id=b.course_id
    where b.id=batch_id and b.status in ('scheduled'::public.batch_status,'active'::public.batch_status)
      and c.status='published'::public.course_status
      and (b.enrollment_opens_at is null or b.enrollment_opens_at<=now())
      and (b.enrollment_closes_at is null or b.enrollment_closes_at>now())
  )
);
create policy batch_offers_read_authenticated on public.batch_offers for select to authenticated using (
  (status='active'::public.commerce_offer_status and exists(
    select 1 from public.batches b join public.courses c on c.id=b.course_id
    where b.id=batch_id and b.status in ('scheduled'::public.batch_status,'active'::public.batch_status)
      and c.status='published'::public.course_status
      and (b.enrollment_opens_at is null or b.enrollment_opens_at<=now())
      and (b.enrollment_closes_at is null or b.enrollment_closes_at>now())
  )) or ((select private.is_active_user()) and (select private.has_any_role(array['admin','owner']::public.app_role[])))
);
create policy batch_offers_write_admin on public.batch_offers for all to authenticated
using ((select private.is_active_user()) and (select private.has_any_role(array['admin','owner']::public.app_role[])))
with check ((select private.is_active_user()) and (select private.has_any_role(array['admin','owner']::public.app_role[])));

create policy commerce_coupons_read_admin on public.commerce_coupons for select to authenticated
using ((select private.is_active_user()) and (select private.has_any_role(array['admin','owner']::public.app_role[])));
create policy commerce_coupons_write_admin on public.commerce_coupons for all to authenticated
using ((select private.is_active_user()) and (select private.has_any_role(array['admin','owner']::public.app_role[])))
with check ((select private.is_active_user()) and (select private.has_any_role(array['admin','owner']::public.app_role[])));

create policy commerce_orders_read_owner on public.commerce_orders for select to authenticated using (
  (student_id=(select auth.uid()) and (select private.is_active_user()))
  or ((select private.is_active_user()) and (select private.has_any_role(array['admin','owner']::public.app_role[])))
);
create policy commerce_payments_read on public.commerce_payments for select to authenticated using (
  (select private.is_active_user()) and exists(
    select 1 from public.commerce_orders o where o.id=order_id
      and (o.student_id=(select auth.uid()) or (select private.has_any_role(array['admin','owner']::public.app_role[])))
  )
);
create policy commerce_receipts_read on public.commerce_receipts for select to authenticated using (
  (student_id=(select auth.uid()) and (select private.is_active_user()))
  or ((select private.is_active_user()) and (select private.has_any_role(array['admin','owner']::public.app_role[])))
);

create or replace function private.commerce_coupon_discount(target_coupon public.commerce_coupons,target_subtotal bigint)
returns bigint language plpgsql stable set search_path='' as $$
declare result bigint;
begin
  if target_coupon.discount_type='percent'::public.commerce_discount_type then result:=floor(target_subtotal*(target_coupon.discount_value/100.0));
  else result:=floor(target_coupon.discount_value); end if;
  if target_coupon.max_discount_minor is not null then result:=least(result,target_coupon.max_discount_minor); end if;
  return greatest(0,least(result,target_subtotal));
end;
$$;
revoke all on function private.commerce_coupon_discount(public.commerce_coupons,bigint) from public;

create or replace function private.create_commerce_order(target_batch uuid,coupon_code_input text,target_provider public.commerce_payment_provider)
returns uuid language plpgsql security definer set search_path='' as $$
declare offer_row public.batch_offers;coupon_row public.commerce_coupons;subtotal bigint;discount bigint:=0;result_id uuid;existing_enrollment uuid;reserved_count integer;user_reserved_count integer;
begin
  if not private.is_active_user() then raise exception 'Active account required'; end if;
  select bo.* into offer_row from public.batch_offers bo join public.batches b on b.id=bo.batch_id join public.courses c on c.id=b.course_id
  where bo.batch_id=target_batch and bo.status='active'::public.commerce_offer_status
    and b.status in ('scheduled'::public.batch_status,'active'::public.batch_status) and c.status='published'::public.course_status
    and (b.enrollment_opens_at is null or b.enrollment_opens_at<=now()) and (b.enrollment_closes_at is null or b.enrollment_closes_at>now());
  if offer_row.id is null then raise exception 'This batch is not currently available for purchase'; end if;
  select e.id into existing_enrollment from public.enrollments e where e.student_id=auth.uid() and e.batch_id=target_batch
    and e.status in ('active'::public.enrollment_status,'completed'::public.enrollment_status) limit 1;
  if existing_enrollment is not null then raise exception 'You already have access to this batch'; end if;
  subtotal:=coalesce(offer_row.sale_price_minor,offer_row.list_price_minor);

  if nullif(trim(coupon_code_input),'') is not null then
    select * into coupon_row from public.commerce_coupons c where c.code=upper(trim(coupon_code_input)) and c.is_active
      and (c.starts_at is null or c.starts_at<=now()) and (c.ends_at is null or c.ends_at>now()) and subtotal>=c.min_order_minor;
    if coupon_row.id is null then raise exception 'Coupon is invalid or not currently applicable'; end if;
    select count(*) into reserved_count from public.commerce_orders o where o.coupon_id=coupon_row.id
      and (o.status='paid'::public.commerce_order_status or (o.status='pending'::public.commerce_order_status and o.expires_at>now()));
    if coupon_row.max_redemptions is not null and reserved_count>=coupon_row.max_redemptions then raise exception 'Coupon redemption limit reached'; end if;
    select count(*) into user_reserved_count from public.commerce_orders o where o.coupon_id=coupon_row.id and o.student_id=auth.uid()
      and (o.status='paid'::public.commerce_order_status or (o.status='pending'::public.commerce_order_status and o.expires_at>now()));
    if user_reserved_count>=coupon_row.per_user_limit then raise exception 'Coupon usage limit reached for this account'; end if;
    discount:=private.commerce_coupon_discount(coupon_row,subtotal);
  end if;

  insert into public.commerce_orders(student_id,batch_id,offer_id,currency,subtotal_minor,discount_minor,total_minor,coupon_id,coupon_code,provider)
  values(auth.uid(),target_batch,offer_row.id,offer_row.currency,subtotal,discount,subtotal-discount,coupon_row.id,coupon_row.code,target_provider)
  returning id into result_id;
  return result_id;
end;
$$;
revoke all on function private.create_commerce_order(uuid,text,public.commerce_payment_provider) from public;
grant execute on function private.create_commerce_order(uuid,text,public.commerce_payment_provider) to authenticated;

create or replace function public.create_commerce_order(target_batch uuid,coupon_code text default null,payment_provider public.commerce_payment_provider default 'manual')
returns uuid language sql volatile security invoker set search_path='' as $$
  select private.create_commerce_order(target_batch,coupon_code,payment_provider);
$$;
revoke all on function public.create_commerce_order(uuid,text,public.commerce_payment_provider) from public;
grant execute on function public.create_commerce_order(uuid,text,public.commerce_payment_provider) to authenticated;

create or replace function private.finalize_commerce_order(
  target_order uuid,target_provider public.commerce_payment_provider,target_event_id text,target_payment_reference text,
  target_amount bigint,target_currency text,target_payload jsonb
)
returns uuid language plpgsql security definer set search_path='' as $$
declare order_row public.commerce_orders;offer_row public.batch_offers;profile_row public.profiles;course_title_value text;batch_title_value text;access_end timestamptz;
begin
  select * into order_row from public.commerce_orders where id=target_order for update;
  if order_row.id is null then raise exception 'Order not found'; end if;
  if order_row.status='paid'::public.commerce_order_status then return order_row.id; end if;
  if order_row.status not in ('pending'::public.commerce_order_status,'failed'::public.commerce_order_status) then raise exception 'Order cannot be paid in its current state'; end if;
  if target_amount<>order_row.total_minor or upper(target_currency)<>order_row.currency then raise exception 'Verified payment amount/currency does not match the order'; end if;

  insert into public.commerce_payments(order_id,provider,provider_event_id,provider_payment_reference,amount_minor,currency,status,payload)
  values(order_row.id,target_provider,target_event_id,nullif(trim(target_payment_reference),''),target_amount,upper(target_currency),'verified'::public.commerce_payment_status,target_payload)
  on conflict(provider,provider_event_id) do nothing;

  update public.commerce_orders set status='paid'::public.commerce_order_status,provider=target_provider,
    provider_payment_reference=nullif(trim(target_payment_reference),''),paid_at=coalesce(paid_at,now()) where id=order_row.id;

  select * into offer_row from public.batch_offers where id=order_row.offer_id;
  if offer_row.access_days is not null then access_end:=now()+make_interval(days=>offer_row.access_days);
  else select case when b.ends_on is null then null else (b.ends_on::timestamp+interval '1 day') end into access_end from public.batches b where b.id=order_row.batch_id; end if;

  insert into public.enrollments(student_id,batch_id,status,enrolled_at,access_starts_at,access_ends_at,granted_by,source)
  values(order_row.student_id,order_row.batch_id,'active'::public.enrollment_status,now(),now(),access_end,auth.uid(),'payment:'||target_provider::text)
  on conflict(student_id,batch_id) do update set status='active'::public.enrollment_status,access_starts_at=now(),access_ends_at=excluded.access_ends_at,source=excluded.source,updated_at=now();

  select p.* into profile_row from public.profiles p where p.id=order_row.student_id;
  select c.title,b.title into course_title_value,batch_title_value from public.batches b join public.courses c on c.id=b.course_id where b.id=order_row.batch_id;
  insert into public.commerce_receipts(order_id,student_id,student_name,student_email,course_title,batch_title,currency,subtotal_minor,discount_minor,total_minor)
  values(order_row.id,order_row.student_id,profile_row.full_name,profile_row.email,course_title_value,batch_title_value,order_row.currency,order_row.subtotal_minor,order_row.discount_minor,order_row.total_minor)
  on conflict(order_id) do nothing;
  return order_row.id;
end;
$$;
revoke all on function private.finalize_commerce_order(uuid,public.commerce_payment_provider,text,text,bigint,text,jsonb) from public;
grant execute on function private.finalize_commerce_order(uuid,public.commerce_payment_provider,text,text,bigint,text,jsonb) to service_role;

create or replace function public.record_verified_commerce_payment(
  target_order uuid,payment_provider public.commerce_payment_provider,provider_event_id text,provider_payment_reference text,
  amount_minor bigint,currency text,payload jsonb default '{}'::jsonb
)
returns uuid language plpgsql security definer set search_path='' as $$
begin
  if coalesce(auth.role(),'')<>'service_role' and not private.has_any_role(array['admin','owner']::public.app_role[]) then raise exception 'Verified payments may only be recorded by the payment service or an admin'; end if;
  return private.finalize_commerce_order(target_order,payment_provider,provider_event_id,provider_payment_reference,amount_minor,currency,payload);
end;
$$;
revoke all on function public.record_verified_commerce_payment(uuid,public.commerce_payment_provider,text,text,bigint,text,jsonb) from public;
grant execute on function public.record_verified_commerce_payment(uuid,public.commerce_payment_provider,text,text,bigint,text,jsonb) to authenticated,service_role;

create or replace function public.mark_commerce_order_paid(target_order uuid,payment_reference text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare o public.commerce_orders;
begin
  if not private.is_active_user() or not private.has_any_role(array['admin','owner']::public.app_role[]) then raise exception 'Admin or owner required'; end if;
  select * into o from public.commerce_orders where id=target_order;
  if o.id is null then raise exception 'Order not found'; end if;
  return private.finalize_commerce_order(o.id,'manual'::public.commerce_payment_provider,'manual:'||o.id::text||':'||extract(epoch from clock_timestamp())::bigint::text,payment_reference,o.total_minor,o.currency,jsonb_build_object('verified_by',auth.uid(),'method','manual'));
end;
$$;
revoke all on function public.mark_commerce_order_paid(uuid,text) from public;
grant execute on function public.mark_commerce_order_paid(uuid,text) to authenticated;

create or replace function public.get_public_batch_offers()
returns table(offer_id uuid,batch_id uuid,batch_title text,batch_code text,course_id uuid,course_title text,course_slug text,currency text,list_price_minor bigint,sale_price_minor bigint,access_days integer)
language sql stable security definer set search_path='' as $$
  select bo.id,b.id,b.title,b.code,c.id,c.title,c.slug,bo.currency,bo.list_price_minor,bo.sale_price_minor,bo.access_days
  from public.batch_offers bo join public.batches b on b.id=bo.batch_id join public.courses c on c.id=b.course_id
  where bo.status='active'::public.commerce_offer_status and b.status in ('scheduled'::public.batch_status,'active'::public.batch_status)
    and c.status='published'::public.course_status and (b.enrollment_opens_at is null or b.enrollment_opens_at<=now())
    and (b.enrollment_closes_at is null or b.enrollment_closes_at>now())
  order by c.title,b.starts_on nulls last,b.title;
$$;
revoke all on function public.get_public_batch_offers() from public;
grant execute on function public.get_public_batch_offers() to anon,authenticated;
