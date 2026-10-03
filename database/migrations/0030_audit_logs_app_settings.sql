-- Statistics Lover: immutable operational audit log and controlled admin settings

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  constraint audit_logs_action_length check (char_length(action) between 2 and 80),
  constraint audit_logs_entity_type_length check (char_length(entity_type) between 2 and 120),
  constraint audit_logs_entity_id_length check (entity_id is null or char_length(entity_id)<=200)
);

create table public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  description text,
  is_public boolean not null default false,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint app_settings_key_format check (key ~ '^[a-z][a-z0-9_]{2,80}$'),
  constraint app_settings_description_length check (description is null or char_length(description)<=500)
);

create index audit_logs_occurred_idx on public.audit_logs(occurred_at desc);
create index audit_logs_actor_idx on public.audit_logs(actor_id,occurred_at desc);
create index audit_logs_entity_idx on public.audit_logs(entity_type,entity_id,occurred_at desc);
create index app_settings_updated_by_idx on public.app_settings(updated_by);

alter table public.audit_logs enable row level security;
alter table public.app_settings enable row level security;
revoke all on table public.audit_logs from anon,authenticated;
revoke all on table public.app_settings from anon,authenticated;
grant select on table public.audit_logs to authenticated,service_role;
grant select on table public.app_settings to authenticated,service_role;
grant insert on table public.audit_logs to service_role;
grant insert,update,delete on table public.app_settings to service_role;

create policy audit_logs_read_admin on public.audit_logs for select to authenticated
using ((select private.is_active_user()) and (select private.has_any_role(array['admin','owner']::public.app_role[])));
create policy app_settings_read_admin on public.app_settings for select to authenticated
using ((select private.is_active_user()) and (select private.has_any_role(array['admin','owner']::public.app_role[])));

create or replace function private.write_audit_log(target_action text,target_entity_type text,target_entity_id text,target_metadata jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path='' as $$
begin
  insert into public.audit_logs(actor_id,actor_role,action,entity_type,entity_id,metadata)
  values(auth.uid(),coalesce(auth.role(),'database'),lower(trim(target_action)),target_entity_type,nullif(target_entity_id,''),coalesce(target_metadata,'{}'::jsonb));
end;
$$;
revoke all on function private.write_audit_log(text,text,text,jsonb) from public;

create or replace function private.audit_row_change()
returns trigger language plpgsql security definer set search_path='' as $$
declare old_data jsonb:='{}'::jsonb;new_data jsonb:='{}'::jsonb;entity text;changed jsonb:='[]'::jsonb;
begin
  if tg_op<>'INSERT' then old_data:=to_jsonb(old); end if;
  if tg_op<>'DELETE' then new_data:=to_jsonb(new); end if;
  entity:=coalesce(new_data->>'id',old_data->>'id',new_data->>'key',old_data->>'key');
  if tg_op='UPDATE' then
    select coalesce(jsonb_agg(k order by k),'[]'::jsonb) into changed
    from (select key as k from jsonb_object_keys(new_data) as key where key not in ('updated_at') and (old_data->key) is distinct from (new_data->key)) diff;
  end if;
  perform private.write_audit_log(lower(tg_op),tg_table_name,entity,case when tg_op='UPDATE' then jsonb_build_object('changed_columns',changed) else '{}'::jsonb end);
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function private.audit_row_change() from public;

create trigger audit_courses after insert or update or delete on public.courses for each row execute function private.audit_row_change();
create trigger audit_batches after insert or update or delete on public.batches for each row execute function private.audit_row_change();
create trigger audit_profiles after update on public.profiles for each row execute function private.audit_row_change();
create trigger audit_enrollments after insert or update or delete on public.enrollments for each row execute function private.audit_row_change();
create trigger audit_teacher_assignments after insert or update or delete on public.teacher_assignments for each row execute function private.audit_row_change();
create trigger audit_assignments after insert or update or delete on public.assignments for each row execute function private.audit_row_change();
create trigger audit_assessment_tests after insert or update or delete on public.assessment_tests for each row execute function private.audit_row_change();
create trigger audit_assessment_test_schedules after insert or update or delete on public.assessment_test_schedules for each row execute function private.audit_row_change();
create trigger audit_batch_offers after insert or update or delete on public.batch_offers for each row execute function private.audit_row_change();
create trigger audit_commerce_coupons after insert or update or delete on public.commerce_coupons for each row execute function private.audit_row_change();
create trigger audit_commerce_orders after insert or update or delete on public.commerce_orders for each row execute function private.audit_row_change();
create trigger audit_commerce_payments after insert or update or delete on public.commerce_payments for each row execute function private.audit_row_change();
create trigger audit_announcements after insert or update or delete on public.announcements for each row execute function private.audit_row_change();
create trigger audit_app_settings after insert or update or delete on public.app_settings for each row execute function private.audit_row_change();

insert into public.app_settings(key,value,description,is_public) values
  ('default_timezone','"Asia/Kolkata"'::jsonb,'Default timezone used when displaying operational schedules.',false),
  ('support_email','""'::jsonb,'Support email shown by operational tooling when configured.',false),
  ('support_phone','""'::jsonb,'Support phone/WhatsApp contact when configured.',false),
  ('student_portal_notice','""'::jsonb,'Optional short notice for the student portal.',false),
  ('commerce_payment_instructions','""'::jsonb,'Optional payment instructions for manual/offline verification.',false)
on conflict(key) do nothing;

create or replace function public.save_app_setting(target_key text,target_value jsonb)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not private.is_active_user() or not private.has_any_role(array['admin','owner']::public.app_role[]) then raise exception 'Admin or owner required'; end if;
  if not exists(select 1 from public.app_settings where key=target_key) then raise exception 'Unknown setting key'; end if;
  update public.app_settings set value=target_value,updated_by=auth.uid(),updated_at=now() where key=target_key;
end;
$$;
revoke all on function public.save_app_setting(text,jsonb) from public;
grant execute on function public.save_app_setting(text,jsonb) to authenticated;

create or replace function public.get_app_setting(target_key text)
returns jsonb language sql stable security definer set search_path='' as $$
  select s.value from public.app_settings s where s.key=target_key and (
    s.is_public or (private.is_active_user() and private.has_any_role(array['admin','owner']::public.app_role[]))
  );
$$;
revoke all on function public.get_app_setting(text) from public;
grant execute on function public.get_app_setting(text) to anon,authenticated;
