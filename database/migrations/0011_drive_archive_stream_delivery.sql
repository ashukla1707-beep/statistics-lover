-- Statistics Lover: separate archival recording source from student playback delivery.
-- Google Drive remains the staff-only archive. Student playback can switch to Cloudflare Stream
-- without losing the original Drive reference.

create table public.lecture_recording_archives (
  lecture_id uuid primary key references public.lectures(id) on delete cascade,
  provider public.delivery_provider not null default 'google_drive'::public.delivery_provider,
  provider_reference text not null,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lecture_recording_archives_provider_check check (
    provider in ('google_drive'::public.delivery_provider, 'external'::public.delivery_provider)
  ),
  constraint lecture_recording_archives_reference_length check (
    char_length(provider_reference) between 3 and 2048
  ),
  constraint lecture_recording_archives_reference_match check (
    (
      provider = 'google_drive'::public.delivery_provider
      and provider_reference ~* '^https://drive\.google\.com/'
    )
    or (
      provider = 'external'::public.delivery_provider
      and provider_reference ~* '^https://'
    )
  )
);

create trigger lecture_recording_archives_set_updated_at
before update on public.lecture_recording_archives
for each row execute function public.set_updated_at();

alter table public.lecture_recording_archives enable row level security;

revoke all on table public.lecture_recording_archives from anon, authenticated;
grant select, insert, update, delete on table public.lecture_recording_archives to authenticated;
grant select, insert, update, delete on table public.lecture_recording_archives to service_role;

create policy lecture_recording_archives_read_staff
on public.lecture_recording_archives
for select
to authenticated
using (
  (select private.is_active_user())
  and (select private.has_any_role(
    array['content_manager', 'admin', 'owner']::public.app_role[]
  ))
);

create policy lecture_recording_archives_insert_staff
on public.lecture_recording_archives
for insert
to authenticated
with check (
  (select private.is_active_user())
  and (select private.has_any_role(
    array['content_manager', 'admin', 'owner']::public.app_role[]
  ))
);

create policy lecture_recording_archives_update_staff
on public.lecture_recording_archives
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

create policy lecture_recording_archives_delete_admin
on public.lecture_recording_archives
for delete
to authenticated
using (
  (select private.is_active_user())
  and (select private.has_any_role(
    array['admin', 'owner']::public.app_role[]
  ))
);

-- Preserve every existing Drive recording as an archive source before student delivery is moved to Stream.
insert into public.lecture_recording_archives (
  lecture_id,
  provider,
  provider_reference,
  created_by,
  created_at,
  updated_at
)
select
  lecture_id,
  provider,
  provider_reference,
  created_by,
  created_at,
  updated_at
from public.lecture_delivery_sources
where action_kind = 'watch'::public.delivery_action_kind
  and provider = 'google_drive'::public.delivery_provider
on conflict (lecture_id) do nothing;

comment on table public.lecture_recording_archives is
  'Staff-only archival recording sources. The original Google Drive file can remain here while lecture_delivery_sources controls student playback delivery.';
comment on column public.lecture_recording_archives.provider_reference is
  'Archive/source reference only. This value is never returned by the student delivery RPC.';
