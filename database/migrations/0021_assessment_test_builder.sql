-- Statistics Lover: assessment tests, sections, and reusable question placement

create type public.assessment_test_scope as enum ('batch','subject');

create table public.assessment_tests (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.batches(id) on delete cascade,
  scope public.assessment_test_scope not null default 'subject',
  subject_id uuid references public.subjects(id) on delete cascade,
  title text not null,
  description text,
  instructions text,
  status public.academic_content_status not null default 'draft',
  duration_minutes integer,
  max_attempts integer not null default 1,
  shuffle_questions boolean not null default false,
  shuffle_options boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessment_tests_title_length check (char_length(title) between 2 and 180),
  constraint assessment_tests_description_length check (description is null or char_length(description) <= 3000),
  constraint assessment_tests_instructions_length check (instructions is null or char_length(instructions) <= 10000),
  constraint assessment_tests_duration_positive check (duration_minutes is null or duration_minutes > 0),
  constraint assessment_tests_attempts_positive check (max_attempts > 0 and max_attempts <= 100),
  constraint assessment_tests_scope_shape check (
    (scope='batch'::public.assessment_test_scope and subject_id is null)
    or (scope='subject'::public.assessment_test_scope and subject_id is not null)
  )
);

create table public.assessment_test_sections (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.assessment_tests(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  title text not null,
  instructions text,
  position integer not null default 0,
  duration_minutes integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessment_test_sections_title_length check (char_length(title) between 1 and 180),
  constraint assessment_test_sections_instructions_length check (instructions is null or char_length(instructions) <= 5000),
  constraint assessment_test_sections_position_nonnegative check (position >= 0),
  constraint assessment_test_sections_duration_positive check (duration_minutes is null or duration_minutes > 0),
  constraint assessment_test_sections_test_position_key unique(test_id,position)
);

create table public.assessment_test_questions (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.assessment_test_sections(id) on delete cascade,
  question_id uuid not null references public.assessment_questions(id) on delete restrict,
  position integer not null default 0,
  marks numeric(8,2) not null,
  negative_marks numeric(8,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessment_test_questions_position_nonnegative check (position >= 0),
  constraint assessment_test_questions_marks_positive check (marks > 0),
  constraint assessment_test_questions_negative_nonnegative check (negative_marks >= 0),
  constraint assessment_test_questions_negative_cap check (negative_marks <= marks),
  constraint assessment_test_questions_section_question_key unique(section_id,question_id),
  constraint assessment_test_questions_section_position_key unique(section_id,position)
);

create index assessment_tests_batch_status_idx on public.assessment_tests(batch_id,status,created_at desc);
create index assessment_tests_subject_idx on public.assessment_tests(subject_id) where subject_id is not null;
create index assessment_tests_created_by_idx on public.assessment_tests(created_by);
create index assessment_test_sections_test_idx on public.assessment_test_sections(test_id,position);
create index assessment_test_sections_subject_idx on public.assessment_test_sections(subject_id);
create index assessment_test_questions_section_idx on public.assessment_test_questions(section_id,position);
create index assessment_test_questions_question_idx on public.assessment_test_questions(question_id);

create trigger assessment_tests_set_updated_at before update on public.assessment_tests for each row execute function public.set_updated_at();
create trigger assessment_test_sections_set_updated_at before update on public.assessment_test_sections for each row execute function public.set_updated_at();
create trigger assessment_test_questions_set_updated_at before update on public.assessment_test_questions for each row execute function public.set_updated_at();

create or replace function private.validate_assessment_test_scope()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.scope='subject'::public.assessment_test_scope and not exists (
    select 1 from public.subjects s where s.id=new.subject_id and s.batch_id=new.batch_id
  ) then raise exception 'Test subject does not belong to the selected batch'; end if;
  return new;
end;
$$;
revoke all on function private.validate_assessment_test_scope() from public;

create trigger assessment_tests_validate_scope
before insert or update of batch_id,scope,subject_id on public.assessment_tests
for each row execute function private.validate_assessment_test_scope();

create or replace function private.has_teacher_test_access(target_test uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists (
    select 1 from public.assessment_tests t
    where t.id=target_test and (
      (t.scope='batch'::public.assessment_test_scope and private.has_teacher_batch_manage_access(t.batch_id))
      or (t.scope='subject'::public.assessment_test_scope and private.has_teacher_subject_access(t.subject_id))
    )
  );
$$;
revoke all on function private.has_teacher_test_access(uuid) from public;
grant execute on function private.has_teacher_test_access(uuid) to authenticated;

create or replace function private.validate_assessment_test_section()
returns trigger language plpgsql security definer set search_path='' as $$
declare test_row public.assessment_tests;
begin
  select * into test_row from public.assessment_tests where id=new.test_id;
  if test_row.id is null then raise exception 'Test not found'; end if;
  if not exists(select 1 from public.subjects s where s.id=new.subject_id and s.batch_id=test_row.batch_id) then
    raise exception 'Section subject does not belong to the test batch';
  end if;
  if test_row.scope='subject'::public.assessment_test_scope and new.subject_id<>test_row.subject_id then
    raise exception 'Subject-scoped test sections must use the test subject';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_assessment_test_section() from public;

create trigger assessment_test_sections_validate
before insert or update of test_id,subject_id on public.assessment_test_sections
for each row execute function private.validate_assessment_test_section();

create or replace function private.validate_assessment_test_question()
returns trigger language plpgsql security definer set search_path='' as $$
declare section_subject uuid; question_subject uuid; question_status public.academic_content_status;
begin
  select subject_id into section_subject from public.assessment_test_sections where id=new.section_id;
  select subject_id,status into question_subject,question_status from public.assessment_questions where id=new.question_id;
  if section_subject is null or question_subject is null or section_subject<>question_subject then
    raise exception 'Question subject must match the section subject';
  end if;
  if question_status='archived'::public.academic_content_status then
    raise exception 'Archived questions cannot be added to a test';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_assessment_test_question() from public;

create trigger assessment_test_questions_validate
before insert or update of section_id,question_id on public.assessment_test_questions
for each row execute function private.validate_assessment_test_question();

alter table public.assessment_tests enable row level security;
alter table public.assessment_test_sections enable row level security;
alter table public.assessment_test_questions enable row level security;

revoke all on table public.assessment_tests from anon,authenticated;
revoke all on table public.assessment_test_sections from anon,authenticated;
revoke all on table public.assessment_test_questions from anon,authenticated;
grant select,insert,update,delete on table public.assessment_tests to authenticated,service_role;
grant select,insert,update,delete on table public.assessment_test_sections to authenticated,service_role;
grant select,insert,update,delete on table public.assessment_test_questions to authenticated,service_role;
grant usage on type public.assessment_test_scope to authenticated,service_role;

create policy assessment_tests_read_staff on public.assessment_tests for select to authenticated using (
  (select private.is_active_user()) and ((select private.has_any_role(array['content_manager','admin','owner']::public.app_role[])) or private.has_teacher_test_access(id))
);
create policy assessment_tests_insert_staff on public.assessment_tests for insert to authenticated with check (
  (select private.is_active_user()) and (
    (select private.has_any_role(array['content_manager','admin','owner']::public.app_role[]))
    or (scope='batch'::public.assessment_test_scope and private.has_teacher_batch_manage_access(batch_id))
    or (scope='subject'::public.assessment_test_scope and private.has_teacher_subject_access(subject_id))
  )
);
create policy assessment_tests_update_staff on public.assessment_tests for update to authenticated using (
  (select private.is_active_user()) and ((select private.has_any_role(array['content_manager','admin','owner']::public.app_role[])) or private.has_teacher_test_access(id))
) with check (
  (select private.is_active_user()) and (
    (select private.has_any_role(array['content_manager','admin','owner']::public.app_role[]))
    or (scope='batch'::public.assessment_test_scope and private.has_teacher_batch_manage_access(batch_id))
    or (scope='subject'::public.assessment_test_scope and private.has_teacher_subject_access(subject_id))
  )
);
create policy assessment_tests_delete_admin on public.assessment_tests for delete to authenticated using (
  (select private.is_active_user()) and (select private.has_any_role(array['admin','owner']::public.app_role[]))
);

create policy assessment_test_sections_read_staff on public.assessment_test_sections for select to authenticated using (
  (select private.is_active_user()) and ((select private.has_any_role(array['content_manager','admin','owner']::public.app_role[])) or private.has_teacher_test_access(test_id))
);
create policy assessment_test_sections_write_staff on public.assessment_test_sections for all to authenticated using (
  (select private.is_active_user()) and ((select private.has_any_role(array['content_manager','admin','owner']::public.app_role[])) or private.has_teacher_test_access(test_id))
) with check (
  (select private.is_active_user()) and ((select private.has_any_role(array['content_manager','admin','owner']::public.app_role[])) or private.has_teacher_test_access(test_id))
);

create policy assessment_test_questions_read_staff on public.assessment_test_questions for select to authenticated using (
  (select private.is_active_user()) and exists (
    select 1 from public.assessment_test_sections s where s.id=section_id and (
      private.has_any_role(array['content_manager','admin','owner']::public.app_role[]) or private.has_teacher_test_access(s.test_id)
    )
  )
);
create policy assessment_test_questions_write_staff on public.assessment_test_questions for all to authenticated using (
  (select private.is_active_user()) and exists (
    select 1 from public.assessment_test_sections s where s.id=section_id and (
      private.has_any_role(array['content_manager','admin','owner']::public.app_role[]) or private.has_teacher_test_access(s.test_id)
    )
  )
) with check (
  (select private.is_active_user()) and exists (
    select 1 from public.assessment_test_sections s where s.id=section_id and (
      private.has_any_role(array['content_manager','admin','owner']::public.app_role[]) or private.has_teacher_test_access(s.test_id)
    )
  )
);

create or replace function private.save_assessment_test(
  target_test uuid,target_batch uuid,target_scope public.assessment_test_scope,target_subject uuid,target_title text,
  target_description text,target_instructions text,target_status public.academic_content_status,target_duration_minutes integer,
  target_max_attempts integer,target_shuffle_questions boolean,target_shuffle_options boolean,target_sections jsonb
)
returns uuid language plpgsql security definer set search_path='' as $$
declare result_id uuid; section_item jsonb; question_item jsonb; section_id uuid; section_count integer:=0; question_count integer:=0;
begin
  if not private.is_active_user() then raise exception 'Inactive account'; end if;
  if not (
    private.has_any_role(array['content_manager','admin','owner']::public.app_role[])
    or (target_scope='batch'::public.assessment_test_scope and private.has_teacher_batch_manage_access(target_batch))
    or (target_scope='subject'::public.assessment_test_scope and private.has_teacher_subject_access(target_subject))
  ) then raise exception 'Not authorized for this test scope'; end if;

  if target_test is null then
    insert into public.assessment_tests(batch_id,scope,subject_id,title,description,instructions,status,duration_minutes,max_attempts,shuffle_questions,shuffle_options)
    values(target_batch,target_scope,case when target_scope='subject'::public.assessment_test_scope then target_subject else null end,
      trim(target_title),nullif(trim(target_description),''),nullif(trim(target_instructions),''),target_status,target_duration_minutes,
      target_max_attempts,target_shuffle_questions,target_shuffle_options)
    returning id into result_id;
  else
    if not exists(select 1 from public.assessment_tests t where t.id=target_test and (
      private.has_any_role(array['content_manager','admin','owner']::public.app_role[]) or private.has_teacher_test_access(t.id)
    )) then raise exception 'Test not found or not authorized'; end if;
    update public.assessment_tests set batch_id=target_batch,scope=target_scope,
      subject_id=case when target_scope='subject'::public.assessment_test_scope then target_subject else null end,
      title=trim(target_title),description=nullif(trim(target_description),''),instructions=nullif(trim(target_instructions),''),
      status=target_status,duration_minutes=target_duration_minutes,max_attempts=target_max_attempts,
      shuffle_questions=target_shuffle_questions,shuffle_options=target_shuffle_options
    where id=target_test;
    result_id=target_test;
  end if;

  delete from public.assessment_test_sections where test_id=result_id;
  if jsonb_typeof(coalesce(target_sections,'[]'::jsonb))<>'array' then raise exception 'Sections must be an array'; end if;

  for section_item in select * from jsonb_array_elements(coalesce(target_sections,'[]'::jsonb))
  loop
    insert into public.assessment_test_sections(test_id,subject_id,title,instructions,position,duration_minutes)
    values(result_id,(section_item->>'subject_id')::uuid,trim(coalesce(section_item->>'title','Section')),
      nullif(trim(coalesce(section_item->>'instructions','')),''),coalesce((section_item->>'position')::integer,section_count),
      nullif(section_item->>'duration_minutes','')::integer)
    returning id into section_id;
    section_count:=section_count+1;

    for question_item in select * from jsonb_array_elements(coalesce(section_item->'questions','[]'::jsonb))
    loop
      insert into public.assessment_test_questions(section_id,question_id,position,marks,negative_marks)
      values(section_id,(question_item->>'question_id')::uuid,coalesce((question_item->>'position')::integer,question_count),
        (question_item->>'marks')::numeric,coalesce((question_item->>'negative_marks')::numeric,0));
      question_count:=question_count+1;
    end loop;
  end loop;

  if target_status='published'::public.academic_content_status then
    if section_count<1 then raise exception 'Published tests require at least one section'; end if;
    if not exists(select 1 from public.assessment_test_sections s join public.assessment_test_questions tq on tq.section_id=s.id where s.test_id=result_id)
    then raise exception 'Published tests require at least one question'; end if;
  end if;
  return result_id;
end;
$$;

revoke all on function private.save_assessment_test(uuid,uuid,public.assessment_test_scope,uuid,text,text,text,public.academic_content_status,integer,integer,boolean,boolean,jsonb) from public;
grant execute on function private.save_assessment_test(uuid,uuid,public.assessment_test_scope,uuid,text,text,text,public.academic_content_status,integer,integer,boolean,boolean,jsonb) to authenticated;

create or replace function public.save_assessment_test(
  target_test uuid default null,target_batch uuid default null,target_scope public.assessment_test_scope default 'subject',
  target_subject uuid default null,target_title text default null,target_description text default null,target_instructions text default null,
  target_status public.academic_content_status default 'draft',target_duration_minutes integer default null,target_max_attempts integer default 1,
  target_shuffle_questions boolean default false,target_shuffle_options boolean default false,target_sections jsonb default '[]'::jsonb
)
returns uuid language sql volatile security invoker set search_path='' as $$
  select private.save_assessment_test(target_test,target_batch,target_scope,target_subject,target_title,target_description,target_instructions,
    target_status,target_duration_minutes,target_max_attempts,target_shuffle_questions,target_shuffle_options,target_sections);
$$;

revoke all on function public.save_assessment_test(uuid,uuid,public.assessment_test_scope,uuid,text,text,text,public.academic_content_status,integer,integer,boolean,boolean,jsonb) from public;
grant execute on function public.save_assessment_test(uuid,uuid,public.assessment_test_scope,uuid,text,text,text,public.academic_content_status,integer,integer,boolean,boolean,jsonb) to authenticated;
