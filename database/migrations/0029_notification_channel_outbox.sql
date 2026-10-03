-- Statistics Lover: notification channel preferences and provider-neutral email/WhatsApp outbox

create type public.notification_channel as enum ('email','whatsapp');
create type public.notification_delivery_status as enum ('pending','processing','sent','failed','skipped');

alter table public.announcements
add column email_requested boolean not null default false,
add column whatsapp_requested boolean not null default false;

create table public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  email_enabled boolean not null default true,
  whatsapp_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  channel public.notification_channel not null,
  destination text not null,
  title text not null,
  body text not null,
  status public.notification_delivery_status not null default 'pending',
  attempts integer not null default 0,
  last_error text,
  provider_message_id text,
  available_at timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_outbox_destination_length check (char_length(destination) between 3 and 320),
  constraint notification_outbox_title_length check (char_length(title) between 2 and 180),
  constraint notification_outbox_body_length check (char_length(body) between 2 and 10000),
  constraint notification_outbox_attempts_nonnegative check (attempts>=0),
  constraint notification_outbox_announcement_user_channel_key unique(announcement_id,user_id,channel)
);

create index notification_outbox_status_available_idx on public.notification_outbox(status,available_at,created_at);
create index notification_outbox_user_idx on public.notification_outbox(user_id,created_at desc);
create index notification_outbox_announcement_idx on public.notification_outbox(announcement_id,channel,status);

create trigger notification_preferences_set_updated_at before update on public.notification_preferences for each row execute function public.set_updated_at();
create trigger notification_outbox_set_updated_at before update on public.notification_outbox for each row execute function public.set_updated_at();

alter table public.notification_preferences enable row level security;
alter table public.notification_outbox enable row level security;
revoke all on table public.notification_preferences from anon,authenticated;
revoke all on table public.notification_outbox from anon,authenticated;
grant select,insert,update on table public.notification_preferences to authenticated,service_role;
grant select on table public.notification_outbox to authenticated;
grant select,insert,update,delete on table public.notification_outbox to service_role;
grant usage on type public.notification_channel to authenticated,service_role;
grant usage on type public.notification_delivery_status to authenticated,service_role;

create policy notification_preferences_read_owner on public.notification_preferences for select to authenticated
using (user_id=(select auth.uid()) and (select private.is_active_user()));
create policy notification_preferences_insert_owner on public.notification_preferences for insert to authenticated
with check (user_id=(select auth.uid()) and (select private.is_active_user()));
create policy notification_preferences_update_owner on public.notification_preferences for update to authenticated
using (user_id=(select auth.uid()) and (select private.is_active_user()))
with check (user_id=(select auth.uid()) and (select private.is_active_user()));
create policy notification_outbox_read_admin on public.notification_outbox for select to authenticated
using ((select private.is_active_user()) and (select private.has_any_role(array['admin','owner']::public.app_role[])));

create or replace function private.dispatch_announcement_external(target_announcement uuid)
returns integer language plpgsql security definer set search_path='' as $$
declare a public.announcements;recipient record;inserted_count integer:=0;
begin
  select * into a from public.announcements where id=target_announcement;
  if a.id is null or a.status<>'published'::public.announcement_status then return 0; end if;
  if not a.email_requested and not a.whatsapp_requested then return 0; end if;
  for recipient in
    select distinct p.id,p.email,p.phone,coalesce(pref.email_enabled,true) as email_enabled,coalesce(pref.whatsapp_enabled,false) as whatsapp_enabled
    from public.profiles p
    join public.user_roles ur on ur.user_id=p.id and ur.role='student'::public.app_role
    left join public.notification_preferences pref on pref.user_id=p.id
    where p.account_status='active'::public.account_status and (
      a.scope='global'::public.announcement_scope or exists(
        select 1 from public.enrollments e where e.student_id=p.id and e.batch_id=a.batch_id
          and e.status='active'::public.enrollment_status
          and (e.access_starts_at is null or e.access_starts_at<=coalesce(a.publish_at,now()))
          and (e.access_ends_at is null or e.access_ends_at>coalesce(a.publish_at,now()))
      )
    )
  loop
    if a.email_requested and recipient.email_enabled and nullif(trim(recipient.email),'') is not null then
      insert into public.notification_outbox(user_id,announcement_id,channel,destination,title,body,available_at)
      values(recipient.id,a.id,'email'::public.notification_channel,recipient.email,a.title,a.body,coalesce(a.publish_at,now()))
      on conflict(announcement_id,user_id,channel) do update set destination=excluded.destination,title=excluded.title,body=excluded.body,
        available_at=excluded.available_at,status=case when public.notification_outbox.status='sent'::public.notification_delivery_status then public.notification_outbox.status else 'pending'::public.notification_delivery_status end;
      inserted_count:=inserted_count+1;
    end if;
    if a.whatsapp_requested and recipient.whatsapp_enabled and nullif(trim(recipient.phone),'') is not null then
      insert into public.notification_outbox(user_id,announcement_id,channel,destination,title,body,available_at)
      values(recipient.id,a.id,'whatsapp'::public.notification_channel,recipient.phone,a.title,a.body,coalesce(a.publish_at,now()))
      on conflict(announcement_id,user_id,channel) do update set destination=excluded.destination,title=excluded.title,body=excluded.body,
        available_at=excluded.available_at,status=case when public.notification_outbox.status='sent'::public.notification_delivery_status then public.notification_outbox.status else 'pending'::public.notification_delivery_status end;
      inserted_count:=inserted_count+1;
    end if;
  end loop;
  return inserted_count;
end;
$$;
revoke all on function private.dispatch_announcement_external(uuid) from public;

create or replace function public.set_announcement_delivery_channels(target_announcement uuid,target_email boolean default false,target_whatsapp boolean default false)
returns integer language plpgsql security invoker set search_path='' as $$
declare a public.announcements;
begin
  select * into a from public.announcements where id=target_announcement;
  if a.id is null then raise exception 'Announcement not found'; end if;
  if not (private.is_active_user() and (
    private.has_any_role(array['content_manager','admin','owner']::public.app_role[])
    or private.has_teacher_announcement_access(a.scope,a.batch_id,a.subject_id)
  )) then raise exception 'Not authorized'; end if;
  update public.announcements set email_requested=target_email,whatsapp_requested=target_whatsapp where id=target_announcement;
  if a.status='published'::public.announcement_status then return private.dispatch_announcement_external(target_announcement); end if;
  return 0;
end;
$$;
revoke all on function public.set_announcement_delivery_channels(uuid,boolean,boolean) from public;
grant execute on function public.set_announcement_delivery_channels(uuid,boolean,boolean) to authenticated;

create or replace function public.get_my_notification_preferences()
returns table(email_enabled boolean,whatsapp_enabled boolean)
language sql stable security invoker set search_path='' as $$
  select coalesce(p.email_enabled,true),coalesce(p.whatsapp_enabled,false)
  from (select auth.uid() as user_id) u left join public.notification_preferences p on p.user_id=u.user_id;
$$;
revoke all on function public.get_my_notification_preferences() from public;
grant execute on function public.get_my_notification_preferences() to authenticated;

create or replace function public.save_my_notification_preferences(target_email_enabled boolean,target_whatsapp_enabled boolean)
returns void language sql volatile security invoker set search_path='' as $$
  insert into public.notification_preferences(user_id,email_enabled,whatsapp_enabled)
  values(auth.uid(),target_email_enabled,target_whatsapp_enabled)
  on conflict(user_id) do update set email_enabled=excluded.email_enabled,whatsapp_enabled=excluded.whatsapp_enabled;
$$;
revoke all on function public.save_my_notification_preferences(boolean,boolean) from public;
grant execute on function public.save_my_notification_preferences(boolean,boolean) to authenticated;

create or replace function public.claim_notification_outbox(batch_size integer default 50)
returns table(id uuid,user_id uuid,announcement_id uuid,channel public.notification_channel,destination text,title text,body text,attempts integer)
language plpgsql security invoker set search_path='' as $$
begin
  if coalesce(auth.role(),'')<>'service_role' then raise exception 'Service role required'; end if;
  return query with claimed as (
    select o.id from public.notification_outbox o
    where o.status in ('pending'::public.notification_delivery_status,'failed'::public.notification_delivery_status)
      and o.available_at<=now() and o.attempts<5
    order by o.available_at,o.created_at for update skip locked limit greatest(1,least(batch_size,200))
  ), updated as (
    update public.notification_outbox o set status='processing'::public.notification_delivery_status,attempts=o.attempts+1,last_error=null
    from claimed c where o.id=c.id returning o.*
  )
  select u.id,u.user_id,u.announcement_id,u.channel,u.destination,u.title,u.body,u.attempts from updated u;
end;
$$;
revoke all on function public.claim_notification_outbox(integer) from public;
grant execute on function public.claim_notification_outbox(integer) to service_role;

create or replace function public.complete_notification_outbox(target_id uuid,target_success boolean,target_provider_message_id text default null,target_error text default null)
returns void language plpgsql security invoker set search_path='' as $$
begin
  if coalesce(auth.role(),'')<>'service_role' then raise exception 'Service role required'; end if;
  update public.notification_outbox set
    status=case when target_success then 'sent'::public.notification_delivery_status else 'failed'::public.notification_delivery_status end,
    provider_message_id=case when target_success then target_provider_message_id else provider_message_id end,
    last_error=case when target_success then null else left(coalesce(target_error,'Delivery failed'),1000) end,
    sent_at=case when target_success then now() else sent_at end
  where id=target_id;
end;
$$;
revoke all on function public.complete_notification_outbox(uuid,boolean,text,text) from public;
grant execute on function public.complete_notification_outbox(uuid,boolean,text,text) to service_role;
