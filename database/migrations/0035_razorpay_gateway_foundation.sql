-- Statistics Lover: Razorpay gateway foundation.
-- Keeps gateway secrets outside Postgres and exposes only a safe public readiness flag.

create unique index if not exists commerce_orders_provider_order_reference_uniq
  on public.commerce_orders(provider,provider_order_reference)
  where provider_order_reference is not null;

insert into public.app_settings(key,value,description)
values(
  'commerce_razorpay_enabled',
  'false'::jsonb,
  'Enables Razorpay checkout after gateway secrets and webhook are configured and tested.'
)
on conflict (key) do nothing;

create or replace function public.get_public_commerce_config()
returns table(razorpay_enabled boolean)
language sql
security definer
set search_path=''
as $$
  select coalesce(
    (
      select case
        when jsonb_typeof(s.value)='boolean' then (s.value #>> '{}')::boolean
        else false
      end
      from public.app_settings s
      where s.key='commerce_razorpay_enabled'
    ),
    false
  );
$$;

revoke all on function public.get_public_commerce_config() from public;
grant execute on function public.get_public_commerce_config() to anon,authenticated;

create or replace function public.bind_commerce_provider_order(
  target_order uuid,
  payment_provider public.commerce_payment_provider,
  provider_order_reference text
)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare
  o public.commerce_orders;
  ref text:=nullif(trim(provider_order_reference),'');
begin
  if coalesce(auth.role(),'')<>'service_role'
    and not private.has_any_role(array['admin','owner']::public.app_role[]) then
    raise exception 'Payment provider orders may only be bound by the payment service or an admin';
  end if;

  if ref is null then raise exception 'Provider order reference is required'; end if;

  select * into o
  from public.commerce_orders
  where id=target_order
  for update;

  if o.id is null then raise exception 'Order not found'; end if;
  if o.status<>'pending'::public.commerce_order_status then
    raise exception 'Only pending orders may be bound to a payment provider order';
  end if;
  if o.provider<>payment_provider then
    raise exception 'Payment provider does not match the order';
  end if;
  if o.provider_order_reference is not null and o.provider_order_reference<>ref then
    raise exception 'Order is already bound to a different provider order';
  end if;

  update public.commerce_orders
  set provider_order_reference=ref,updated_at=now()
  where id=o.id;
end;
$$;

revoke all on function public.bind_commerce_provider_order(
  uuid,public.commerce_payment_provider,text
) from public,anon,authenticated;
grant execute on function public.bind_commerce_provider_order(
  uuid,public.commerce_payment_provider,text
) to service_role;
