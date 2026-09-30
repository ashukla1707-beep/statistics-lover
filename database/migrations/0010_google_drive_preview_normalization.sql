-- Statistics Lover: normalize Google Drive recording links to the cleaner preview player.
-- Admins may paste a normal Drive share URL; persisted student-facing actions use /preview.

create or replace function private.normalize_google_drive_preview_url(raw_reference text)
returns text
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  normalized_reference text := btrim(raw_reference);
  file_id text;
begin
  if normalized_reference is null then
    return null;
  end if;

  file_id := substring(
    normalized_reference
    from '^https://drive\.google\.com/file/d/([^/?#]+)'
  );

  if file_id is null then
    file_id := substring(
      normalized_reference
      from '[?&]id=([^&#]+)'
    );
  end if;

  if file_id is null then
    return normalized_reference;
  end if;

  return 'https://drive.google.com/file/d/' || file_id || '/preview';
end;
$$;

create or replace function private.normalize_lecture_delivery_source_reference()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.provider_reference := btrim(new.provider_reference);

  if new.provider = 'google_drive'::public.delivery_provider then
    new.provider_reference := private.normalize_google_drive_preview_url(new.provider_reference);
  end if;

  return new;
end;
$$;

drop trigger if exists lecture_delivery_sources_normalize_reference
on public.lecture_delivery_sources;

create trigger lecture_delivery_sources_normalize_reference
before insert or update of provider, provider_reference
on public.lecture_delivery_sources
for each row execute function private.normalize_lecture_delivery_source_reference();

update public.lecture_delivery_sources
set provider_reference = private.normalize_google_drive_preview_url(provider_reference)
where provider = 'google_drive'::public.delivery_provider
  and provider_reference is distinct from private.normalize_google_drive_preview_url(provider_reference);

revoke all on function private.normalize_google_drive_preview_url(text)
from public, anon, authenticated;
revoke all on function private.normalize_lecture_delivery_source_reference()
from public, anon, authenticated;

comment on function private.normalize_google_drive_preview_url(text) is
  'Converts supported Google Drive file share URLs to /preview player URLs.';
comment on trigger lecture_delivery_sources_normalize_reference
on public.lecture_delivery_sources is
  'Normalizes provider references before persistence; Google Drive recordings are stored as /preview URLs.';
