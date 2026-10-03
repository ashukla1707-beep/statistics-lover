-- Statistics Lover: harden Commerce RPC exposure and remove new policy/index advisor findings

alter function public.get_public_batch_offers() security invoker;

revoke execute on function public.record_verified_commerce_payment(
  uuid,public.commerce_payment_provider,text,text,bigint,text,jsonb
) from authenticated;
grant execute on function public.record_verified_commerce_payment(
  uuid,public.commerce_payment_provider,text,text,bigint,text,jsonb
) to service_role;

grant execute on function private.finalize_commerce_order(
  uuid,public.commerce_payment_provider,text,text,bigint,text,jsonb
) to authenticated,service_role;

alter function public.mark_commerce_order_paid(uuid,text) security invoker;

create index if not exists commerce_orders_offer_idx on public.commerce_orders(offer_id);

drop policy if exists batch_offers_write_admin on public.batch_offers;
create policy batch_offers_insert_admin on public.batch_offers for insert to authenticated
with check ((select private.is_active_user()) and (select private.has_any_role(array['admin','owner']::public.app_role[])));
create policy batch_offers_update_admin on public.batch_offers for update to authenticated
using ((select private.is_active_user()) and (select private.has_any_role(array['admin','owner']::public.app_role[])))
with check ((select private.is_active_user()) and (select private.has_any_role(array['admin','owner']::public.app_role[])));
create policy batch_offers_delete_admin on public.batch_offers for delete to authenticated
using ((select private.is_active_user()) and (select private.has_any_role(array['admin','owner']::public.app_role[])));

drop policy if exists commerce_coupons_write_admin on public.commerce_coupons;
create policy commerce_coupons_insert_admin on public.commerce_coupons for insert to authenticated
with check ((select private.is_active_user()) and (select private.has_any_role(array['admin','owner']::public.app_role[])));
create policy commerce_coupons_update_admin on public.commerce_coupons for update to authenticated
using ((select private.is_active_user()) and (select private.has_any_role(array['admin','owner']::public.app_role[])))
with check ((select private.is_active_user()) and (select private.has_any_role(array['admin','owner']::public.app_role[])));
create policy commerce_coupons_delete_admin on public.commerce_coupons for delete to authenticated
using ((select private.is_active_user()) and (select private.has_any_role(array['admin','owner']::public.app_role[])));
