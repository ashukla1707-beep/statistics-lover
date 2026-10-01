-- Statistics Lover: automatic Cloudflare Stream upload pipeline.
-- Staff uploads are tracked separately from protected student delivery.

create table public.lecture_stream_assets (
  lecture_id uuid primary key references public.lectures(id) on delete cascade,
  video_id text not null unique,
  file_name text,
  upload_state text not null default 'uploading',
  ready_to_stream boolean not null default false,
  processing_pct numeric,
  error_message text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lecture_stream_assets_video_id_length check (char_length(video_id) between 8 and 128),
  constraint lecture_stream_assets_video_id_format check (video_id ~ '^[A-Za-z0-9_-]+$'),
  constraint lecture_stream_assets_state_check check (upload_state in ('uploading', 'processing', 'ready', 'error')),
  constraint lecture_stream_assets_pct_check check (processing_pct is null or (processing_pct >= 0 and processing_pct <= 100)),
  constraint lecture_stream_assets_error_length check (error_message is null or char_length(error_message) <= 1000)
);

create trigger lecture_stream_assets_set_updated_at
before update on public.lecture_stream_assets
for each row execute function public.set_updated_at();

alter table public.lecture_stream_assets enable row level security;

revoke all on table public.lecture_stream_assets from anon, authenticated;
grant select, insert, update, delete on table public.lecture_stream_assets to authenticated;
grant select, insert, update, delete on table public.lecture_stream_assets to service_role;

create policy lecture_stream_assets_read_staff
on public.lecture_stream_assets
for select
to authenticated
using (
  (select private.is_active_user())
  and (select private.has_any_role(
    array['content_manager', 'admin', 'owner']::public.app_role[]
  ))
);

create policy lecture_stream_assets_insert_staff
on public.lecture_stream_assets
for insert
to authenticated
with check (
  (select private.is_active_user())
  and (select private.has_any_role(
    array['content_manager', 'admin', 'owner']::public.app_role[]
  ))
);

create policy lecture_stream_assets_update_staff
on public.lecture_stream_assets
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

create policy lecture_stream_assets_delete_admin
on public.lecture_stream_assets
for delete
to authenticated
using (
  (select private.is_active_user())
  and (select private.has_any_role(
    array['admin', 'owner']::public.app_role[]
  ))
);

-- Stream delivery references may now be stored as an opaque Stream video ID.
-- Existing HTTPS player URLs remain valid for backward compatibility.
alter table public.lecture_delivery_sources
  drop constraint if exists lecture_delivery_sources_provider_reference_match;

alter table public.lecture_delivery_sources
add constraint lecture_delivery_sources_provider_reference_match
check (
  (
    provider = 'google_meet'::public.delivery_provider
    and action_kind = 'join'::public.delivery_action_kind
    and provider_reference ~* '^https://meet\\.google\\.com/'
  )
  or (
    provider = 'google_drive'::public.delivery_provider
    and action_kind = 'watch'::public.delivery_action_kind
    and provider_reference ~* '^https://drive\\.google\\.com/'
  )
  or (
    provider = 'cloudflare_stream'::public.delivery_provider
    and action_kind = 'watch'::public.delivery_action_kind
    and (
      provider_reference ~ '^stream://[A-Za-z0-9_-]+$'
      or provider_reference ~* '^https://([a-z0-9-]+\\.)*(videodelivery\\.net|cloudflarestream\\.com)/'
    )
  )
  or (
    provider = 'external'::public.delivery_provider
    and provider_reference ~* '^https://'
  )
);

comment on table public.lecture_stream_assets is
  'Staff-only Cloudflare Stream ingestion state. Ready assets are promoted automatically into lecture_delivery_sources.';
comment on column public.lecture_stream_assets.video_id is
  'Opaque Cloudflare Stream video identifier. Never exposed as a public playback URL without authorization.';
