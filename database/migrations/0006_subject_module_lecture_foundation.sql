-- Statistics Lover: subject, module and lecture hierarchy
-- Course -> Batch -> Subject -> Module -> Lecture.
-- Provider references remain outside this schema so external-service URLs are not exposed directly to students.

create type public.academic_content_status as enum ('draft', 'published', 'archived');
create type public.lecture_status as enum (
  'draft',
  'scheduled',
  'live',
  'processing',
  'recorded',
  'published',
  'archived'
);
create type public.lecture_delivery_mode as enum ('live', 'recorded', 'hybrid');

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.batches(id) on delete restrict,
  slug text not null,
  code text,
  title text not null,
  description text,
  status public.academic_content_status not null default 'draft',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subjects_batch_slug_key unique (batch_id, slug),
  constraint subjects_slug_format check (
    char_length(slug) between 2 and 120
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  constraint subjects_code_length check (code is null or char_length(code) between 1 and 64),
  constraint subjects_title_length check (char_length(title) between 2 and 160),
  constraint subjects_position_nonnegative check (position >= 0)
);

create table public.modules (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete restrict,
  slug text not null,
  title text not null,
  description text,
  status public.academic_content_status not null default 'draft',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint modules_subject_slug_key unique (subject_id, slug),
  constraint modules_slug_format check (
    char_length(slug) between 2 and 120
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  constraint modules_title_length check (char_length(title) between 2 and 160),
  constraint modules_position_nonnegative check (position >= 0)
);

create table public.lectures (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete restrict,
  teacher_id uuid references public.profiles(id) on delete set null,
  slug text not null,
  title text not null,
  description text,
  status public.lecture_status not null default 'draft',
  delivery_mode public.lecture_delivery_mode not null default 'live',
  position integer not null default 0,
  scheduled_at timestamptz,
  duration_minutes integer,
  release_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lectures_module_slug_key unique (module_id, slug),
  constraint lectures_slug_format check (
    char_length(slug) between 2 and 120
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  constraint lectures_title_length check (char_length(title) between 2 and 180),
  constraint lectures_position_nonnegative check (position >= 0),
  constraint lectures_duration_range check (
    duration_minutes is null or duration_minutes between 1 and 1440
  )
);

create index subjects_batch_id_idx on public.subjects(batch_id);
create index subjects_status_position_idx on public.subjects(status, position);
create index modules_subject_id_idx on public.modules(subject_id);
create index modules_status_position_idx on public.modules(status, position);
create index lectures_module_id_idx on public.lectures(module_id);
create index lectures_teacher_id_idx on public.lectures(teacher_id);
create index lectures_status_release_idx on public.lectures(status, release_at);

create trigger subjects_set_updated_at
before update on public.subjects
for each row execute function public.set_updated_at();

create trigger modules_set_updated_at
before update on public.modules
for each row execute function public.set_updated_at();

create trigger lectures_set_updated_at
before update on public.lectures
for each row execute function public.set_updated_at();

create or replace function private.has_subject_access(target_subject uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.is_active_user()
    and exists (
      select 1
      from public.subjects s
      join public.enrollments e on e.batch_id = s.batch_id
      where s.id = target_subject
        and s.status = 'published'::public.academic_content_status
        and e.student_id = auth.uid()
        and e.status in (
          'active'::public.enrollment_status,
          'completed'::public.enrollment_status
        )
        and (e.access_starts_at is null or e.access_starts_at <= now())
        and (e.access_ends_at is null or e.access_ends_at > now())
    );
$$;

create or replace function private.has_module_access(target_module uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.is_active_user()
    and exists (
      select 1
      from public.modules m
      join public.subjects s on s.id = m.subject_id
      join public.enrollments e on e.batch_id = s.batch_id
      where m.id = target_module
        and m.status = 'published'::public.academic_content_status
        and s.status = 'published'::public.academic_content_status
        and e.student_id = auth.uid()
        and e.status in (
          'active'::public.enrollment_status,
          'completed'::public.enrollment_status
        )
        and (e.access_starts_at is null or e.access_starts_at <= now())
        and (e.access_ends_at is null or e.access_ends_at > now())
    );
$$;

revoke all on function private.has_subject_access(uuid) from public;
revoke all on function private.has_module_access(uuid) from public;
grant execute on function private.has_subject_access(uuid) to authenticated;
grant execute on function private.has_module_access(uuid) to authenticated;

alter table public.subjects enable row level security;
alter table public.modules enable row level security;
alter table public.lectures enable row level security;

revoke all on table public.subjects from anon, authenticated;
revoke all on table public.modules from anon, authenticated;
revoke all on table public.lectures from anon, authenticated;

grant select, insert, update, delete on table public.subjects to authenticated;
grant select, insert, update, delete on table public.modules to authenticated;
grant select, insert, update, delete on table public.lectures to authenticated;

grant select, insert, update, delete on table public.subjects to service_role;
grant select, insert, update, delete on table public.modules to service_role;
grant select, insert, update, delete on table public.lectures to service_role;

grant usage on type public.academic_content_status to authenticated, service_role;
grant usage on type public.lecture_status to authenticated, service_role;
grant usage on type public.lecture_delivery_mode to authenticated, service_role;

create policy subjects_read
on public.subjects
for select
to authenticated
using (
  (
    (select private.is_active_user())
    and (select private.has_any_role(
      array['content_manager', 'admin', 'owner']::public.app_role[]
    ))
  )
  or private.has_subject_access(id)
);

create policy subjects_insert_staff
on public.subjects
for insert
to authenticated
with check (
  (select private.is_active_user())
  and (select private.has_any_role(
    array['content_manager', 'admin', 'owner']::public.app_role[]
  ))
);

create policy subjects_update_staff
on public.subjects
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

create policy subjects_delete_admin
on public.subjects
for delete
to authenticated
using (
  (select private.is_active_user())
  and (select private.has_any_role(
    array['admin', 'owner']::public.app_role[]
  ))
);

create policy modules_read
on public.modules
for select
to authenticated
using (
  (
    (select private.is_active_user())
    and (select private.has_any_role(
      array['content_manager', 'admin', 'owner']::public.app_role[]
    ))
  )
  or (
    status = 'published'::public.academic_content_status
    and private.has_subject_access(subject_id)
  )
);

create policy modules_insert_staff
on public.modules
for insert
to authenticated
with check (
  (select private.is_active_user())
  and (select private.has_any_role(
    array['content_manager', 'admin', 'owner']::public.app_role[]
  ))
);

create policy modules_update_staff
on public.modules
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

create policy modules_delete_admin
on public.modules
for delete
to authenticated
using (
  (select private.is_active_user())
  and (select private.has_any_role(
    array['admin', 'owner']::public.app_role[]
  ))
);

create policy lectures_read
on public.lectures
for select
to authenticated
using (
  (
    (select private.is_active_user())
    and (select private.has_any_role(
      array['content_manager', 'admin', 'owner']::public.app_role[]
    ))
  )
  or (
    status in (
      'scheduled'::public.lecture_status,
      'live'::public.lecture_status,
      'published'::public.lecture_status
    )
    and (release_at is null or release_at <= now())
    and private.has_module_access(module_id)
  )
);

create policy lectures_insert_staff
on public.lectures
for insert
to authenticated
with check (
  (select private.is_active_user())
  and (select private.has_any_role(
    array['content_manager', 'admin', 'owner']::public.app_role[]
  ))
);

create policy lectures_update_staff
on public.lectures
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

create policy lectures_delete_admin
on public.lectures
for delete
to authenticated
using (
  (select private.is_active_user())
  and (select private.has_any_role(
    array['admin', 'owner']::public.app_role[]
  ))
);

comment on table public.subjects is 'Batch-specific academic subjects.';
comment on table public.modules is 'Ordered modules or units within a subject.';
comment on table public.lectures is 'Lecture records following the draft -> scheduled -> live -> processing -> recorded -> published -> archived lifecycle.';
comment on column public.lectures.release_at is 'Optional scheduled release gate for enrolled students.';
comment on type public.lecture_delivery_mode is 'Provider-independent lecture delivery mode. Provider references are intentionally stored elsewhere.';
