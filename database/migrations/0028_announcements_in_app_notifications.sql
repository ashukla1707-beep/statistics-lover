-- Statistics Lover: scoped announcements and private in-app notification inbox

create type public.announcement_scope as enum ('global','batch','subject');
create type public.announcement_status as enum ('draft','published','archived');

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  scope public.announcement_scope not null default 'global',
  batch_id uuid references public.batches(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete cascade,
  title text not null,
  body text not null,
  status public.announcement_status not null default 'draft',
  publish_at timestamptz,
  expires_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint announcements_title_length check (char_length(title) between 2 and 180),
  constraint announcements_body_length check (char_length(body) between 2 and 10000),
  constraint announcements_window_order check (publish_at is null or expires_at is null or publish_at < expires_at),
  constraint announcements_scope_shape check (
    (scope='global'::public.announcement_scope and batch_id is null and subject_id is null)
    or (scope='batch'::public.announcement_scope and batch_id is not null and subject_id is null)
    or (scope='subject'::public.announcement_scope and batch_id is not null and subject_id is not null)
  )
);

create table public.in_app_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'announcement',
  source_type text,
  source_id uuid,
  title text not null,
  body text not null,
  action_url text,
  available_at timestamptz not null default now(),
  expires_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint in_app_notifications_kind_length check (char_length(kind) between 2 and 60),
  constraint in_app_notifications_title_length check (char_length(title) between 2 and 180),
  constraint in_app_notifications_body_length check (char_length(body) between 2 and 10000),
  constraint in_app_notifications_action_length check (action_url is null or char_length(action_url)<=500),
  constraint in_app_notifications_window_order check (expires_at is null or available_at<expires_at),
  constraint in_app_notifications_source_user_key unique(user_id,source_type,source_id)
);

create index announcements_status_publish_idx on public.announcements(status,publish_at,expires_at);
create index announcements_batch_idx on public.announcements(batch_id) where batch_id is not null;
create index announcements_subject_idx on public.announcements(subject_id) where subject_id is not null;
create index announcements_created_by_idx on public.announcements(created_by);
create index in_app_notifications_user_available_idx on public.in_app_notifications(user_id,available_at desc);
create index in_app_notifications_user_unread_idx on public.in_app_notifications(user_id,read_at) where read_at is null;

create trigger announcements_set_updated_at before update on public.announcements for each row execute function public.set_updated_at();

create or replace function private.validate_announcement_scope()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.scope='subject'::public.announcement_scope and not exists(
    select 1 from public.subjects s where s.id=new.subject_id and s.batch_id=new.batch_id
  ) then raise exception 'Announcement subject does not belong to the selected batch'; end if;
  if new.status='published'::public.announcement_status and new.publish_at is null then new.publish_at:=now(); end if;
  return new;
end;
$$;
revoke all on function private.validate_announcement_scope() from public;
create trigger announcements_validate_scope before insert or update of scope,batch_id,subject_id,status,publish_at on public.announcements
for each row execute function private.validate_announcement_scope();

create or replace function private.has_teacher_announcement_access(target_scope public.announcement_scope,target_batch uuid,target_subject uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select case
    when target_scope='batch'::public.announcement_scope then private.has_teacher_batch_manage_access(target_batch)
    when target_scope='subject'::public.announcement_scope then private.has_teacher_subject_access(target_subject)
    else false
  end;
$$;
revoke all on function private.has_teacher_announcement_access(public.announcement_scope,uuid,uuid) from public;
grant execute on function private.has_teacher_announcement_access(public.announcement_scope,uuid,uuid) to authenticated;

alter table public.announcements enable row level security;
alter table public.in_app_notifications enable row level security;
revoke all on table public.announcements from anon,authenticated;
revoke all on table public.in_app_notifications from anon,authenticated;
grant select,insert,update,delete on table public.announcements to authenticated,service_role;
grant select,update on table public.in_app_notifications to authenticated,service_role;
grant insert,delete on table public.in_app_notifications to service_role;
grant usage on type public.announcement_scope to authenticated,service_role;
grant usage on type public.announcement_status to authenticated,service_role;

create policy announcements_read_staff on public.announcements for select to authenticated using (
  (select private.is_active_user()) and ((select private.has_any_role(array['content_manager','admin','owner']::public.app_role[])) or private.has_teacher_announcement_access(scope,batch_id,subject_id))
);
create policy announcements_insert_staff on public.announcements for insert to authenticated with check (
  (select private.is_active_user()) and ((select private.has_any_role(array['content_manager','admin','owner']::public.app_role[])) or private.has_teacher_announcement_access(scope,batch_id,subject_id))
);
create policy announcements_update_staff on public.announcements for update to authenticated using (
  (select private.is_active_user()) and ((select private.has_any_role(array['content_manager','admin','owner']::public.app_role[])) or private.has_teacher_announcement_access(scope,batch_id,subject_id))
) with check (
  (select private.is_active_user()) and ((select private.has_any_role(array['content_manager','admin','owner']::public.app_role[])) or private.has_teacher_announcement_access(scope,batch_id,subject_id))
);
create policy announcements_delete_admin on public.announcements for delete to authenticated using (
  (select private.is_active_user()) and (select private.has_any_role(array['admin','owner']::public.app_role[]))
);

create policy notifications_read_owner on public.in_app_notifications for select to authenticated using (
  user_id=(select auth.uid()) and (select private.is_active_user()) and available_at<=now() and (expires_at is null or expires_at>now())
);
create policy notifications_update_owner on public.in_app_notifications for update to authenticated
using (user_id=(select auth.uid()) and (select private.is_active_user()))
with check (user_id=(select auth.uid()) and (select private.is_active_user()));

create or replace function private.dispatch_announcement_notifications(target_announcement uuid)
returns integer language plpgsql security definer set search_path='' as $$
declare a public.announcements;recipient record;inserted_count integer:=0;
begin
  select * into a from public.announcements where id=target_announcement;
  if a.id is null or a.status<>'published'::public.announcement_status then return 0; end if;
  for recipient in
    select distinct p.id from public.profiles p
    join public.user_roles ur on ur.user_id=p.id and ur.role='student'::public.app_role
    where p.status='active'::public.account_status and (
      a.scope='global'::public.announcement_scope or exists(
        select 1 from public.enrollments e where e.student_id=p.id and e.batch_id=a.batch_id
          and e.status='active'::public.enrollment_status
          and (e.access_starts_at is null or e.access_starts_at<=coalesce(a.publish_at,now()))
          and (e.access_ends_at is null or e.access_ends_at>coalesce(a.publish_at,now()))
      )
    )
  loop
    insert into public.in_app_notifications(user_id,kind,source_type,source_id,title,body,action_url,available_at,expires_at)
    values(recipient.id,'announcement','announcement',a.id,a.title,a.body,
      case when a.batch_id is not null then '/learn/'||a.batch_id::text else '/dashboard' end,
      coalesce(a.publish_at,now()),a.expires_at)
    on conflict(user_id,source_type,source_id) do update set title=excluded.title,body=excluded.body,action_url=excluded.action_url,
      available_at=excluded.available_at,expires_at=excluded.expires_at;
    inserted_count:=inserted_count+1;
  end loop;
  return inserted_count;
end;
$$;
revoke all on function private.dispatch_announcement_notifications(uuid) from public;

create or replace function public.save_announcement(
  target_id uuid default null,target_scope public.announcement_scope default 'global',target_batch uuid default null,target_subject uuid default null,
  target_title text default null,target_body text default null,target_status public.announcement_status default 'draft',
  target_publish_at timestamptz default null,target_expires_at timestamptz default null
)
returns uuid language plpgsql security invoker set search_path='' as $$
declare result_id uuid;
begin
  if not (private.is_active_user() and (
    private.has_any_role(array['content_manager','admin','owner']::public.app_role[])
    or private.has_teacher_announcement_access(target_scope,target_batch,target_subject)
  )) then raise exception 'Not authorized for this announcement scope'; end if;

  if target_id is null then
    insert into public.announcements(scope,batch_id,subject_id,title,body,status,publish_at,expires_at)
    values(target_scope,target_batch,target_subject,trim(target_title),trim(target_body),target_status,target_publish_at,target_expires_at)
    returning id into result_id;
  else
    update public.announcements set scope=target_scope,batch_id=target_batch,subject_id=target_subject,title=trim(target_title),body=trim(target_body),
      status=target_status,publish_at=target_publish_at,expires_at=target_expires_at where id=target_id;
    if not found then raise exception 'Announcement not found or not authorized'; end if;
    result_id:=target_id;
  end if;
  if target_status='published'::public.announcement_status then perform private.dispatch_announcement_notifications(result_id); end if;
  return result_id;
end;
$$;
revoke all on function public.save_announcement(uuid,public.announcement_scope,uuid,uuid,text,text,public.announcement_status,timestamptz,timestamptz) from public;
grant execute on function public.save_announcement(uuid,public.announcement_scope,uuid,uuid,text,text,public.announcement_status,timestamptz,timestamptz) to authenticated;

create or replace function public.get_my_notification_summary()
returns table(unread_count bigint,total_count bigint)
language sql stable security invoker set search_path='' as $$
  select count(*) filter(where read_at is null),count(*) from public.in_app_notifications
  where user_id=auth.uid() and available_at<=now() and (expires_at is null or expires_at>now());
$$;
revoke all on function public.get_my_notification_summary() from public;
grant execute on function public.get_my_notification_summary() to authenticated;

create or replace function public.mark_notification_read(target_notification uuid)
returns void language sql volatile security invoker set search_path='' as $$
  update public.in_app_notifications set read_at=coalesce(read_at,now()) where id=target_notification and user_id=auth.uid();
$$;
revoke all on function public.mark_notification_read(uuid) from public;
grant execute on function public.mark_notification_read(uuid) to authenticated;

create or replace function public.mark_all_notifications_read()
returns void language sql volatile security invoker set search_path='' as $$
  update public.in_app_notifications set read_at=coalesce(read_at,now())
  where user_id=auth.uid() and read_at is null and available_at<=now();
$$;
revoke all on function public.mark_all_notifications_read() from public;
grant execute on function public.mark_all_notifications_read() to authenticated;
