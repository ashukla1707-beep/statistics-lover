-- Statistics Lover: protected learning resources
-- Adds batch/subject/module/lecture scoped study material without exposing provider references directly.

create type public.learning_resource_kind as enum ('study_material','notes','pyq','reference');
create type public.learning_resource_scope as enum ('batch','subject','module','lecture');
create type public.learning_resource_provider as enum ('google_drive','external');

create table public.learning_resources (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.batches(id) on delete cascade,
  scope public.learning_resource_scope not null default 'lecture',
  subject_id uuid references public.subjects(id) on delete cascade,
  module_id uuid references public.modules(id) on delete cascade,
  lecture_id uuid references public.lectures(id) on delete cascade,
  kind public.learning_resource_kind not null default 'study_material',
  title text not null,
  description text,
  status public.academic_content_status not null default 'draft',
  release_at timestamptz,
  position integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_resources_title_length check (char_length(title) between 2 and 180),
  constraint learning_resources_position_nonnegative check (position >= 0),
  constraint learning_resources_scope_shape check (
    (scope = 'batch'::public.learning_resource_scope and subject_id is null and module_id is null and lecture_id is null)
    or (scope = 'subject'::public.learning_resource_scope and subject_id is not null and module_id is null and lecture_id is null)
    or (scope = 'module'::public.learning_resource_scope and subject_id is null and module_id is not null and lecture_id is null)
    or (scope = 'lecture'::public.learning_resource_scope and subject_id is null and module_id is null and lecture_id is not null)
  )
);

create table public.learning_resource_sources (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null unique references public.learning_resources(id) on delete cascade,
  provider public.learning_resource_provider not null,
  provider_reference text not null,
  action_label text,
  file_name text,
  mime_type text,
  size_bytes bigint,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_resource_sources_reference_length check (char_length(provider_reference) between 3 and 2048),
  constraint learning_resource_sources_action_label_length check (action_label is null or char_length(action_label) between 1 and 120),
  constraint learning_resource_sources_file_name_length check (file_name is null or char_length(file_name) between 1 and 255),
  constraint learning_resource_sources_mime_type_length check (mime_type is null or char_length(mime_type) between 1 and 160),
  constraint learning_resource_sources_size_nonnegative check (size_bytes is null or size_bytes >= 0),
  constraint learning_resource_sources_provider_reference_match check (
    (provider = 'google_drive'::public.learning_resource_provider and provider_reference ~* '^https://drive\.google\.com/')
    or (provider = 'external'::public.learning_resource_provider and provider_reference ~* '^https://')
  )
);

create index learning_resources_batch_release_idx on public.learning_resources(batch_id,status,release_at,position);
create index learning_resources_subject_idx on public.learning_resources(subject_id) where subject_id is not null;
create index learning_resources_module_idx on public.learning_resources(module_id) where module_id is not null;
create index learning_resources_lecture_idx on public.learning_resources(lecture_id) where lecture_id is not null;
create index learning_resource_sources_resource_idx on public.learning_resource_sources(resource_id);

create trigger learning_resources_set_updated_at before update on public.learning_resources
for each row execute function public.set_updated_at();

create trigger learning_resource_sources_set_updated_at before update on public.learning_resource_sources
for each row execute function public.set_updated_at();

create or replace function private.validate_learning_resource_scope()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.scope = 'batch'::public.learning_resource_scope then return new; end if;

  if new.scope = 'subject'::public.learning_resource_scope then
    if not exists (select 1 from public.subjects s where s.id = new.subject_id and s.batch_id = new.batch_id) then
      raise exception 'Resource subject does not belong to the selected batch';
    end if;
    return new;
  end if;

  if new.scope = 'module'::public.learning_resource_scope then
    if not exists (
      select 1 from public.modules m join public.subjects s on s.id=m.subject_id
      where m.id=new.module_id and s.batch_id=new.batch_id
    ) then raise exception 'Resource module does not belong to the selected batch'; end if;
    return new;
  end if;

  if new.scope = 'lecture'::public.learning_resource_scope then
    if not exists (
      select 1 from public.lectures l
      join public.modules m on m.id=l.module_id
      join public.subjects s on s.id=m.subject_id
      where l.id=new.lecture_id and s.batch_id=new.batch_id
    ) then raise exception 'Resource lecture does not belong to the selected batch'; end if;
    return new;
  end if;

  raise exception 'Unsupported learning resource scope';
end;
$$;

revoke all on function private.validate_learning_resource_scope() from public;

create trigger learning_resources_validate_scope
before insert or update of batch_id,scope,subject_id,module_id,lecture_id on public.learning_resources
for each row execute function private.validate_learning_resource_scope();

alter table public.learning_resources enable row level security;
alter table public.learning_resource_sources enable row level security;

revoke all on table public.learning_resources from anon,authenticated;
revoke all on table public.learning_resource_sources from anon,authenticated;

grant select,insert,update,delete on table public.learning_resources to authenticated,service_role;
grant select,insert,update,delete on table public.learning_resource_sources to authenticated,service_role;
grant usage on type public.learning_resource_kind to authenticated,service_role;
grant usage on type public.learning_resource_scope to authenticated,service_role;
grant usage on type public.learning_resource_provider to authenticated,service_role;

create policy learning_resources_read_staff on public.learning_resources for select to authenticated using (
  (select private.is_active_user()) and
  (select private.has_any_role(array['content_manager','admin','owner']::public.app_role[]))
);
create policy learning_resources_insert_staff on public.learning_resources for insert to authenticated with check (
  (select private.is_active_user()) and
  (select private.has_any_role(array['content_manager','admin','owner']::public.app_role[]))
);
create policy learning_resources_update_staff on public.learning_resources for update to authenticated using (
  (select private.is_active_user()) and
  (select private.has_any_role(array['content_manager','admin','owner']::public.app_role[]))
) with check (
  (select private.is_active_user()) and
  (select private.has_any_role(array['content_manager','admin','owner']::public.app_role[]))
);
create policy learning_resources_delete_admin on public.learning_resources for delete to authenticated using (
  (select private.is_active_user()) and
  (select private.has_any_role(array['admin','owner']::public.app_role[]))
);

create policy learning_resource_sources_read_staff on public.learning_resource_sources for select to authenticated using (
  (select private.is_active_user()) and
  (select private.has_any_role(array['content_manager','admin','owner']::public.app_role[]))
);
create policy learning_resource_sources_insert_staff on public.learning_resource_sources for insert to authenticated with check (
  (select private.is_active_user()) and
  (select private.has_any_role(array['content_manager','admin','owner']::public.app_role[]))
);
create policy learning_resource_sources_update_staff on public.learning_resource_sources for update to authenticated using (
  (select private.is_active_user()) and
  (select private.has_any_role(array['content_manager','admin','owner']::public.app_role[]))
) with check (
  (select private.is_active_user()) and
  (select private.has_any_role(array['content_manager','admin','owner']::public.app_role[]))
);
create policy learning_resource_sources_delete_admin on public.learning_resource_sources for delete to authenticated using (
  (select private.is_active_user()) and
  (select private.has_any_role(array['admin','owner']::public.app_role[]))
);

create or replace function private.get_batch_learning_resources(target_batch uuid)
returns table (
  resource_id uuid,
  resource_scope public.learning_resource_scope,
  subject_id uuid,
  module_id uuid,
  lecture_id uuid,
  resource_kind public.learning_resource_kind,
  title text,
  description text,
  provider public.learning_resource_provider,
  action_url text,
  action_label text,
  file_name text,
  mime_type text,
  size_bytes bigint,
  resource_position integer
)
language sql stable security definer set search_path = '' as $$
  select r.id,r.scope,r.subject_id,r.module_id,r.lecture_id,r.kind,r.title,r.description,
    s.provider,s.provider_reference,
    coalesce(s.action_label,
      case r.kind
        when 'study_material'::public.learning_resource_kind then 'Open material'
        when 'notes'::public.learning_resource_kind then 'Open notes'
        when 'pyq'::public.learning_resource_kind then 'Open PYQ'
        when 'reference'::public.learning_resource_kind then 'Open resource'
      end
    ),
    s.file_name,s.mime_type,s.size_bytes,r.position
  from public.learning_resources r
  join public.learning_resource_sources s on s.resource_id=r.id
  where r.batch_id=target_batch
    and private.has_batch_access(target_batch)
    and r.status='published'::public.academic_content_status
    and (r.release_at is null or r.release_at<=now())
  order by r.position,r.created_at;
$$;

revoke all on function private.get_batch_learning_resources(uuid) from public;
grant execute on function private.get_batch_learning_resources(uuid) to authenticated;

create or replace function public.get_batch_learning_resources(target_batch uuid)
returns table (
  resource_id uuid,
  resource_scope public.learning_resource_scope,
  subject_id uuid,
  module_id uuid,
  lecture_id uuid,
  resource_kind public.learning_resource_kind,
  title text,
  description text,
  provider public.learning_resource_provider,
  action_url text,
  action_label text,
  file_name text,
  mime_type text,
  size_bytes bigint,
  resource_position integer
)
language sql stable security invoker set search_path = '' as $$
  select * from private.get_batch_learning_resources(target_batch);
$$;

revoke all on function public.get_batch_learning_resources(uuid) from public;
grant execute on function public.get_batch_learning_resources(uuid) to authenticated;

comment on table public.learning_resources is 'Protected metadata for batch/subject/module/lecture learning resources.';
comment on table public.learning_resource_sources is 'Staff-only provider references for learning resources.';
comment on function public.get_batch_learning_resources(uuid) is 'Returns released learning resources only when the authenticated student has valid batch access.';
