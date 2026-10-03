-- Statistics Lover: protected lecture delivery sources
-- Raw provider references are staff-managed and are never directly readable by students.
-- Enrolled students receive only authorized delivery actions through a guarded RPC.

create type public.delivery_action_kind as enum ('join', 'watch');
create type public.delivery_provider as enum ('google_meet', 'google_drive', 'cloudflare_stream', 'external');

create table public.lecture_delivery_sources (
  id uuid primary key default gen_random_uuid(),
  lecture_id uuid not null references public.lectures(id) on delete cascade,
  action_kind public.delivery_action_kind not null,
  provider public.delivery_provider not null,
  provider_reference text not null,
  label text,
  available_from timestamptz,
  available_until timestamptz,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lecture_delivery_sources_lecture_action_key unique (lecture_id, action_kind),
  constraint lecture_delivery_sources_reference_length check (char_length(provider_reference) between 3 and 2048),
  constraint lecture_delivery_sources_label_length check (label is null or char_length(label) between 1 and 120),
  constraint lecture_delivery_sources_window_order check (
    available_from is null
    or available_until is null
    or available_from <= available_until
  )
);

create index lecture_delivery_sources_lecture_idx on public.lecture_delivery_sources(lecture_id);
create index lecture_delivery_sources_availability_idx on public.lecture_delivery_sources(available_from, available_until);

create trigger lecture_delivery_sources_set_updated_at
before update on public.lecture_delivery_sources
for each row execute function public.set_updated_at();

alter table public.lecture_delivery_sources enable row level security;

revoke all on table public.lecture_delivery_sources from anon, authenticated;
grant select, insert, update, delete on table public.lecture_delivery_sources to authenticated;
grant select, insert, update, delete on table public.lecture_delivery_sources to service_role;
grant usage on type public.delivery_action_kind to authenticated, service_role;
grant usage on type public.delivery_provider to authenticated, service_role;

create policy lecture_delivery_sources_read_staff
on public.lecture_delivery_sources
for select
to authenticated
using (
  (select private.is_active_user())
  and (select private.has_any_role(
    array['content_manager', 'admin', 'owner']::public.app_role[]
  ))
);

create policy lecture_delivery_sources_insert_staff
on public.lecture_delivery_sources
for insert
to authenticated
with check (
  (select private.is_active_user())
  and (select private.has_any_role(
    array['content_manager', 'admin', 'owner']::public.app_role[]
  ))
);

create policy lecture_delivery_sources_update_staff
on public.lecture_delivery_sources
for update
to authenticated
using (
  (select private.is_active_user())
  and (select private.has_any_role(
    array['content_manager', 'admin', 'owner']::public.app_role[]
  ))
)
with check (
  (select private.is_active_user())
  and (select private.has_any_role(
    array['content_manager', 'admin', 'owner']::public.app_role[]
  ))
);

create policy lecture_delivery_sources_delete_admin
on public.lecture_delivery_sources
for delete
to authenticated
using (
  (select private.is_active_user())
  and (select private.has_any_role(
    array['admin', 'owner']::public.app_role[]
  ))
);

create or replace function public.get_batch_delivery_actions(target_batch uuid)
returns table (
  lecture_id uuid,
  action_kind public.delivery_action_kind,
  provider public.delivery_provider,
  action_url text,
  label text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    l.id,
    ds.action_kind,
    ds.provider,
    ds.provider_reference,
    coalesce(
      ds.label,
      case ds.action_kind
        when 'join'::public.delivery_action_kind then 'Join live class'
        when 'watch'::public.delivery_action_kind then 'Watch recording'
      end
    )
  from public.lecture_delivery_sources ds
  join public.lectures l on l.id = ds.lecture_id
  join public.modules m on m.id = l.module_id
  join public.subjects s on s.id = m.subject_id
  where s.batch_id = target_batch
    and private.has_batch_access(target_batch)
    and s.status = 'published'::public.academic_content_status
    and m.status = 'published'::public.academic_content_status
    and l.status in (
      'scheduled'::public.lecture_status,
      'live'::public.lecture_status,
      'published'::public.lecture_status
    )
    and (l.release_at is null or l.release_at <= now())
    and (ds.available_from is null or ds.available_from <= now())
    and (ds.available_until is null or ds.available_until > now())
    and (
      (ds.action_kind = 'join'::public.delivery_action_kind
        and l.delivery_mode in ('live'::public.lecture_delivery_mode, 'hybrid'::public.lecture_delivery_mode))
      or
      (ds.action_kind = 'watch'::public.delivery_action_kind
        and l.delivery_mode in ('recorded'::public.lecture_delivery_mode, 'hybrid'::public.lecture_delivery_mode)
        and l.status = 'published'::public.lecture_status)
    );
$$;

revoke all on function public.get_batch_delivery_actions(uuid) from public;
grant execute on function public.get_batch_delivery_actions(uuid) to authenticated;

comment on table public.lecture_delivery_sources is
  'Staff-only provider references for lecture delivery. Students resolve authorized actions through get_batch_delivery_actions().';
comment on column public.lecture_delivery_sources.provider_reference is
  'Protected provider reference. For the initial Google adapters this may be an HTTPS Meet or Drive URL; future adapters may store opaque provider IDs.';
comment on function public.get_batch_delivery_actions(uuid) is
  'Returns only currently authorized lecture delivery actions for the enrolled authenticated student.';
