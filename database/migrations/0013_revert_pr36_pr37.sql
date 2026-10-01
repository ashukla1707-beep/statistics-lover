-- Revert PR #36 and PR #37 while preserving applied migration history.
-- Restores the protected delivery schema to the pre-PR36 state.

-- PR #37 introduced Stream ingestion state. No Stream assets or Cloudflare delivery rows
-- existed when this rollback was prepared, so removing the table does not remove lecture content.
drop table if exists public.lecture_stream_assets;

-- PR #36 introduced a separate Drive archive table. The original Google Drive delivery
-- source remains in lecture_delivery_sources, so removing this duplicate archive metadata
-- does not remove the recording itself or its existing student playback reference.
drop table if exists public.lecture_recording_archives;

-- Restore the provider/action/reference compatibility constraint from migration 0009.
alter table public.lecture_delivery_sources
  drop constraint if exists lecture_delivery_sources_provider_reference_match;

alter table public.lecture_delivery_sources
add constraint lecture_delivery_sources_provider_reference_match
check (
  (
    provider = 'google_meet'::public.delivery_provider
    and action_kind = 'join'::public.delivery_action_kind
    and provider_reference ~* '^https://meet\.google\.com/'
  )
  or (
    provider = 'google_drive'::public.delivery_provider
    and action_kind = 'watch'::public.delivery_action_kind
    and provider_reference ~* '^https://drive\.google\.com/'
  )
  or (
    provider = 'cloudflare_stream'::public.delivery_provider
    and action_kind = 'watch'::public.delivery_action_kind
    and provider_reference ~* '^https://([a-z0-9-]+\.)*(videodelivery\.net|cloudflarestream\.com)/'
  )
  or (
    provider = 'external'::public.delivery_provider
    and provider_reference ~* '^https://'
  )
) not valid;

comment on constraint lecture_delivery_sources_provider_reference_match
on public.lecture_delivery_sources is
  'Enforces action/provider compatibility and provider-specific HTTPS hosts. NOT VALID preserves legacy rows but applies to every new insert/update.';
