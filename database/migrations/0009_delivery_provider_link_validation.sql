-- Statistics Lover: enforce provider/action/link compatibility for lecture delivery.
-- Existing rows are not scanned so accidental legacy test data can be corrected in-place,
-- while every new insert/update is validated immediately.

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
