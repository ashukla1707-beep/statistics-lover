-- Statistics Lover: harden settings RPCs behind invoker rights and RLS

grant update on table public.app_settings to authenticated;

create policy app_settings_update_admin
on public.app_settings for update to authenticated
using (
  (select private.is_active_user())
  and (select private.has_any_role(array['admin','owner']::public.app_role[]))
)
with check (
  (select private.is_active_user())
  and (select private.has_any_role(array['admin','owner']::public.app_role[]))
);

alter function public.save_app_setting(text,jsonb) security invoker;
alter function public.get_app_setting(text) security invoker;

revoke execute on function public.get_app_setting(text) from anon;
grant execute on function public.get_app_setting(text) to authenticated;
