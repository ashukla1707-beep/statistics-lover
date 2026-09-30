-- Statistics Lover: academic catalog and enrollment foundation
-- Courses and batches are database-driven. Enrollments are server-authoritative access records.

create type public.course_status as enum ('draft', 'published', 'archived');
create type public.batch_status as enum ('draft', 'scheduled', 'active', 'completed', 'archived');
create type public.enrollment_status as enum ('active', 'completed', 'cancelled', 'expired');

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  code text unique,
  title text not null,
  short_description text,
  description text,
  status public.course_status not null default 'draft',
  thumbnail_url text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint courses_slug_format check (
    char_length(slug) between 2 and 120
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  constraint courses_code_length check (
    code is null or char_length(code) between 1 and 64
  ),
  constraint courses_title_length check (char_length(title) between 2 and 160),
  constraint courses_short_description_length check (
    short_description is null or char_length(short_description) <= 320
  )
);

create table public.batches (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete restrict,
  slug text not null,
  code text unique,
  title text not null,
  description text,
  status public.batch_status not null default 'draft',
  starts_on date,
  ends_on date,
  enrollment_opens_at timestamptz,
  enrollment_closes_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint batches_course_slug_key unique (course_id, slug),
  constraint batches_slug_format check (
    char_length(slug) between 2 and 120
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  constraint batches_code_length check (
    code is null or char_length(code) between 1 and 64
  ),
  constraint batches_title_length check (char_length(title) between 2 and 160),
  constraint batches_date_order check (
    starts_on is null or ends_on is null or starts_on <= ends_on
  ),
  constraint batches_enrollment_window_order check (
    enrollment_opens_at is null
    or enrollment_closes_at is null
    or enrollment_opens_at <= enrollment_closes_at
  )
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  batch_id uuid not null references public.batches(id) on delete restrict,
  status public.enrollment_status not null default 'active',
  enrolled_at timestamptz not null default now(),
  access_starts_at timestamptz,
  access_ends_at timestamptz,
  granted_by uuid references public.profiles(id) on delete set null default auth.uid(),
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint enrollments_student_batch_key unique (student_id, batch_id),
  constraint enrollments_access_window_order check (
    access_starts_at is null
    or access_ends_at is null
    or access_starts_at <= access_ends_at
  ),
  constraint enrollments_source_length check (char_length(source) between 1 and 64)
);

create index batches_course_id_idx on public.batches(course_id);
create index batches_status_idx on public.batches(status);
create index enrollments_batch_id_idx on public.enrollments(batch_id);
create index enrollments_granted_by_idx on public.enrollments(granted_by);
create index enrollments_student_status_idx on public.enrollments(student_id, status);

create trigger courses_set_updated_at
before update on public.courses
for each row execute function public.set_updated_at();

create trigger batches_set_updated_at
before update on public.batches
for each row execute function public.set_updated_at();

create trigger enrollments_set_updated_at
before update on public.enrollments
for each row execute function public.set_updated_at();

create or replace function private.has_batch_access(target_batch uuid)
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
      from public.enrollments e
      where e.student_id = auth.uid()
        and e.batch_id = target_batch
        and e.status in (
          'active'::public.enrollment_status,
          'completed'::public.enrollment_status
        )
        and (e.access_starts_at is null or e.access_starts_at <= now())
        and (e.access_ends_at is null or e.access_ends_at > now())
    );
$$;

revoke all on function private.has_batch_access(uuid) from public;
grant execute on function private.has_batch_access(uuid) to authenticated;

alter table public.courses enable row level security;
alter table public.batches enable row level security;
alter table public.enrollments enable row level security;

revoke all on table public.courses from anon, authenticated;
revoke all on table public.batches from anon, authenticated;
revoke all on table public.enrollments from anon, authenticated;

grant select on table public.courses to anon, authenticated;
grant select on table public.batches to anon, authenticated;
grant insert, update, delete on table public.courses to authenticated;
grant insert, update, delete on table public.batches to authenticated;
grant select, insert, delete on table public.enrollments to authenticated;
grant update (status, access_starts_at, access_ends_at, source) on table public.enrollments to authenticated;

grant select, insert, update, delete on table public.courses to service_role;
grant select, insert, update, delete on table public.batches to service_role;
grant select, insert, update, delete on table public.enrollments to service_role;

grant usage on type public.course_status to anon, authenticated, service_role;
grant usage on type public.batch_status to anon, authenticated, service_role;
grant usage on type public.enrollment_status to authenticated, service_role;

create policy courses_read_public
on public.courses
for select
to anon
using (status = 'published'::public.course_status);

create policy courses_read_authenticated
on public.courses
for select
to authenticated
using (
  status = 'published'::public.course_status
  or (
    (select private.is_active_user())
    and (select private.has_any_role(
      array['content_manager', 'admin', 'owner']::public.app_role[]
    ))
  )
);

create policy courses_insert_staff
on public.courses
for insert
to authenticated
with check (
  (select private.is_active_user())
  and (select private.has_any_role(
    array['content_manager', 'admin', 'owner']::public.app_role[]
  ))
);

create policy courses_update_staff
on public.courses
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

create policy courses_delete_admin
on public.courses
for delete
to authenticated
using (
  (select private.is_active_user())
  and (select private.has_any_role(
    array['admin', 'owner']::public.app_role[]
  ))
);

create policy batches_read_public
on public.batches
for select
to anon
using (status in (
  'scheduled'::public.batch_status,
  'active'::public.batch_status
));

create policy batches_read_authenticated
on public.batches
for select
to authenticated
using (
  status in (
    'scheduled'::public.batch_status,
    'active'::public.batch_status
  )
  or (
    (select private.is_active_user())
    and (select private.has_any_role(
      array['content_manager', 'admin', 'owner']::public.app_role[]
    ))
  )
  or private.has_batch_access(id)
);

create policy batches_insert_staff
on public.batches
for insert
to authenticated
with check (
  (select private.is_active_user())
  and (select private.has_any_role(
    array['content_manager', 'admin', 'owner']::public.app_role[]
  ))
);

create policy batches_update_staff
on public.batches
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

create policy batches_delete_admin
on public.batches
for delete
to authenticated
using (
  (select private.is_active_user())
  and (select private.has_any_role(
    array['admin', 'owner']::public.app_role[]
  ))
);

create policy enrollments_read
on public.enrollments
for select
to authenticated
using (
  (
    student_id = (select auth.uid())
    and (select private.is_active_user())
  )
  or (
    (select private.is_active_user())
    and (select private.has_any_role(
      array['admin', 'owner']::public.app_role[]
    ))
  )
);

create policy enrollments_insert_admin
on public.enrollments
for insert
to authenticated
with check (
  (select private.is_active_user())
  and (select private.has_any_role(
    array['admin', 'owner']::public.app_role[]
  ))
  and granted_by = (select auth.uid())
);

create policy enrollments_update_admin
on public.enrollments
for update
to authenticated
using (
  (select private.is_active_user())
  and (select private.has_any_role(
    array['admin', 'owner']::public.app_role[]
  ))
)
with check (
  (select private.is_active_user())
  and (select private.has_any_role(
    array['admin', 'owner']::public.app_role[]
  ))
);

create policy enrollments_delete_admin
on public.enrollments
for delete
to authenticated
using (
  (select private.is_active_user())
  and (select private.has_any_role(
    array['admin', 'owner']::public.app_role[]
  ))
);

comment on table public.courses is
  'Database-driven course catalog. Published rows are public; draft management is staff-only.';
comment on table public.batches is
  'Course delivery cohorts. Enrollment grants access to non-public batch states.';
comment on table public.enrollments is
  'Server-authoritative student-to-batch access records; students may only read their own rows.';
comment on function private.has_batch_access(uuid) is
  'Authorization helper for batch-scoped learning content. Requires an active account and valid enrollment window.';
