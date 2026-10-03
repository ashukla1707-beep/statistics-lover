-- Statistics Lover: assignment-scoped teacher access

create table public.teacher_assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  batch_id uuid not null references public.batches(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete cascade,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  assigned_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teacher_assignments_window_order check (starts_at is null or ends_at is null or starts_at <= ends_at)
);

create unique index teacher_assignments_batch_unique on public.teacher_assignments(teacher_id,batch_id) where subject_id is null;
create unique index teacher_assignments_subject_unique on public.teacher_assignments(teacher_id,subject_id) where subject_id is not null;
create index teacher_assignments_teacher_active_idx on public.teacher_assignments(teacher_id,is_active);
create index teacher_assignments_batch_idx on public.teacher_assignments(batch_id);
create index teacher_assignments_subject_idx on public.teacher_assignments(subject_id);

create trigger teacher_assignments_set_updated_at before update on public.teacher_assignments
for each row execute function public.set_updated_at();

create or replace function private.validate_teacher_assignment()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.subject_id is not null and not exists (
    select 1 from public.subjects s where s.id=new.subject_id and s.batch_id=new.batch_id
  ) then raise exception 'Assigned subject does not belong to the selected batch'; end if;

  if not exists (
    select 1 from public.user_roles ur
    where ur.user_id=new.teacher_id and ur.role='teacher'::public.app_role
  ) then raise exception 'Assigned user must have the teacher role'; end if;

  return new;
end;
$$;

revoke all on function private.validate_teacher_assignment() from public;

create trigger teacher_assignments_validate
before insert or update of teacher_id,batch_id,subject_id on public.teacher_assignments
for each row execute function private.validate_teacher_assignment();

alter table public.teacher_assignments enable row level security;
revoke all on table public.teacher_assignments from anon,authenticated;
grant select,insert,update,delete on table public.teacher_assignments to authenticated,service_role;

create policy teacher_assignments_read on public.teacher_assignments for select to authenticated using (
  (teacher_id=(select auth.uid()) and (select private.is_active_user()) and (select private.has_role('teacher'::public.app_role)))
  or ((select private.is_active_user()) and (select private.has_any_role(array['admin','owner']::public.app_role[])))
);
create policy teacher_assignments_insert_admin on public.teacher_assignments for insert to authenticated with check (
  (select private.is_active_user())
  and (select private.has_any_role(array['admin','owner']::public.app_role[]))
  and exists(select 1 from public.user_roles ur where ur.user_id=teacher_id and ur.role='teacher'::public.app_role)
);
create policy teacher_assignments_update_admin on public.teacher_assignments for update to authenticated using (
  (select private.is_active_user()) and (select private.has_any_role(array['admin','owner']::public.app_role[]))
) with check (
  (select private.is_active_user()) and (select private.has_any_role(array['admin','owner']::public.app_role[]))
);
create policy teacher_assignments_delete_admin on public.teacher_assignments for delete to authenticated using (
  (select private.is_active_user()) and (select private.has_any_role(array['admin','owner']::public.app_role[]))
);

create or replace function private.teacher_assignment_current(active boolean,starts timestamptz,ends timestamptz)
returns boolean language sql stable set search_path='' as $$
  select active and (starts is null or starts<=now()) and (ends is null or ends>now());
$$;
revoke all on function private.teacher_assignment_current(boolean,timestamptz,timestamptz) from public;
grant execute on function private.teacher_assignment_current(boolean,timestamptz,timestamptz) to authenticated;

create or replace function private.has_teacher_batch_access(target_batch uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select private.is_active_user() and private.has_role('teacher'::public.app_role) and exists(
    select 1 from public.teacher_assignments ta
    where ta.teacher_id=auth.uid() and ta.batch_id=target_batch
      and private.teacher_assignment_current(ta.is_active,ta.starts_at,ta.ends_at)
  );
$$;

create or replace function private.has_teacher_course_access(target_course uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select private.is_active_user() and private.has_role('teacher'::public.app_role) and exists(
    select 1 from public.teacher_assignments ta join public.batches b on b.id=ta.batch_id
    where ta.teacher_id=auth.uid() and b.course_id=target_course
      and private.teacher_assignment_current(ta.is_active,ta.starts_at,ta.ends_at)
  );
$$;

create or replace function private.has_teacher_subject_access(target_subject uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select private.is_active_user() and private.has_role('teacher'::public.app_role) and exists(
    select 1 from public.subjects s join public.teacher_assignments ta on ta.batch_id=s.batch_id
    where s.id=target_subject and ta.teacher_id=auth.uid()
      and (ta.subject_id is null or ta.subject_id=s.id)
      and private.teacher_assignment_current(ta.is_active,ta.starts_at,ta.ends_at)
  );
$$;

create or replace function private.has_teacher_module_access(target_module uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.modules m where m.id=target_module and private.has_teacher_subject_access(m.subject_id));
$$;

create or replace function private.has_teacher_lecture_access(target_lecture uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.lectures l where l.id=target_lecture and private.has_teacher_module_access(l.module_id));
$$;

create or replace function private.has_teacher_learning_resource_access(target_resource uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.learning_resources r where r.id=target_resource and (
      (r.scope='batch'::public.learning_resource_scope and private.has_teacher_batch_access(r.batch_id))
      or (r.scope='subject'::public.learning_resource_scope and private.has_teacher_subject_access(r.subject_id))
      or (r.scope='module'::public.learning_resource_scope and private.has_teacher_module_access(r.module_id))
      or (r.scope='lecture'::public.learning_resource_scope and private.has_teacher_lecture_access(r.lecture_id))
    )
  );
$$;

revoke all on function private.has_teacher_batch_access(uuid) from public;
revoke all on function private.has_teacher_course_access(uuid) from public;
revoke all on function private.has_teacher_subject_access(uuid) from public;
revoke all on function private.has_teacher_module_access(uuid) from public;
revoke all on function private.has_teacher_lecture_access(uuid) from public;
revoke all on function private.has_teacher_learning_resource_access(uuid) from public;
grant execute on function private.has_teacher_batch_access(uuid) to authenticated;
grant execute on function private.has_teacher_course_access(uuid) to authenticated;
grant execute on function private.has_teacher_subject_access(uuid) to authenticated;
grant execute on function private.has_teacher_module_access(uuid) to authenticated;
grant execute on function private.has_teacher_lecture_access(uuid) to authenticated;
grant execute on function private.has_teacher_learning_resource_access(uuid) to authenticated;

create policy courses_read_teacher on public.courses for select to authenticated using (private.has_teacher_course_access(id));
create policy batches_read_teacher on public.batches for select to authenticated using (private.has_teacher_batch_access(id));
create policy subjects_read_teacher on public.subjects for select to authenticated using (private.has_teacher_subject_access(id));
create policy modules_read_teacher on public.modules for select to authenticated using (private.has_teacher_module_access(id));
create policy lectures_read_teacher on public.lectures for select to authenticated using (private.has_teacher_lecture_access(id));
create policy lectures_insert_teacher on public.lectures for insert to authenticated with check (private.has_teacher_module_access(module_id));
create policy lectures_update_teacher on public.lectures for update to authenticated using (private.has_teacher_lecture_access(id)) with check (private.has_teacher_module_access(module_id));

create policy lecture_delivery_sources_read_teacher on public.lecture_delivery_sources for select to authenticated using (private.has_teacher_lecture_access(lecture_id));
create policy lecture_delivery_sources_insert_teacher on public.lecture_delivery_sources for insert to authenticated with check (private.has_teacher_lecture_access(lecture_id));
create policy lecture_delivery_sources_update_teacher on public.lecture_delivery_sources for update to authenticated using (private.has_teacher_lecture_access(lecture_id)) with check (private.has_teacher_lecture_access(lecture_id));

create policy learning_resources_read_teacher on public.learning_resources for select to authenticated using (
  (scope='batch'::public.learning_resource_scope and private.has_teacher_batch_access(batch_id))
  or (scope='subject'::public.learning_resource_scope and private.has_teacher_subject_access(subject_id))
  or (scope='module'::public.learning_resource_scope and private.has_teacher_module_access(module_id))
  or (scope='lecture'::public.learning_resource_scope and private.has_teacher_lecture_access(lecture_id))
);
create policy learning_resources_insert_teacher on public.learning_resources for insert to authenticated with check (
  (scope='batch'::public.learning_resource_scope and private.has_teacher_batch_access(batch_id))
  or (scope='subject'::public.learning_resource_scope and private.has_teacher_subject_access(subject_id))
  or (scope='module'::public.learning_resource_scope and private.has_teacher_module_access(module_id))
  or (scope='lecture'::public.learning_resource_scope and private.has_teacher_lecture_access(lecture_id))
);
create policy learning_resources_update_teacher on public.learning_resources for update to authenticated using (
  (scope='batch'::public.learning_resource_scope and private.has_teacher_batch_access(batch_id))
  or (scope='subject'::public.learning_resource_scope and private.has_teacher_subject_access(subject_id))
  or (scope='module'::public.learning_resource_scope and private.has_teacher_module_access(module_id))
  or (scope='lecture'::public.learning_resource_scope and private.has_teacher_lecture_access(lecture_id))
) with check (
  (scope='batch'::public.learning_resource_scope and private.has_teacher_batch_access(batch_id))
  or (scope='subject'::public.learning_resource_scope and private.has_teacher_subject_access(subject_id))
  or (scope='module'::public.learning_resource_scope and private.has_teacher_module_access(module_id))
  or (scope='lecture'::public.learning_resource_scope and private.has_teacher_lecture_access(lecture_id))
);

create policy learning_resource_sources_read_teacher on public.learning_resource_sources for select to authenticated using (private.has_teacher_learning_resource_access(resource_id));
create policy learning_resource_sources_insert_teacher on public.learning_resource_sources for insert to authenticated with check (private.has_teacher_learning_resource_access(resource_id));
create policy learning_resource_sources_update_teacher on public.learning_resource_sources for update to authenticated using (private.has_teacher_learning_resource_access(resource_id)) with check (private.has_teacher_learning_resource_access(resource_id));

comment on table public.teacher_assignments is 'Server-authoritative teacher access to a whole batch or a single subject.';
