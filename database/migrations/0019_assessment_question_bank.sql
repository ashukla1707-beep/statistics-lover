-- Statistics Lover: assessment question bank and protected answer keys

create type public.assessment_question_type as enum ('single_choice','multiple_choice','numeric','short_text');
create type public.assessment_difficulty as enum ('easy','medium','hard');
create type public.assessment_question_source as enum ('original','pyq');

create table public.assessment_questions (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  module_id uuid references public.modules(id) on delete set null,
  lecture_id uuid references public.lectures(id) on delete set null,
  question_type public.assessment_question_type not null,
  difficulty public.assessment_difficulty not null default 'medium',
  source_type public.assessment_question_source not null default 'original',
  source_label text,
  source_year integer,
  prompt text not null,
  explanation text,
  default_marks numeric(8,2) not null default 1,
  default_negative_marks numeric(8,2) not null default 0,
  status public.academic_content_status not null default 'draft',
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessment_questions_prompt_length check (char_length(prompt) between 2 and 10000),
  constraint assessment_questions_explanation_length check (explanation is null or char_length(explanation) <= 12000),
  constraint assessment_questions_source_label_length check (source_label is null or char_length(source_label) <= 180),
  constraint assessment_questions_source_year_valid check (source_year is null or source_year between 1900 and 2200),
  constraint assessment_questions_marks_positive check (default_marks > 0),
  constraint assessment_questions_negative_nonnegative check (default_negative_marks >= 0),
  constraint assessment_questions_negative_cap check (default_negative_marks <= default_marks)
);

create table public.assessment_question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.assessment_questions(id) on delete cascade,
  option_text text not null,
  position integer not null default 0,
  is_correct boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessment_question_options_text_length check (char_length(option_text) between 1 and 5000),
  constraint assessment_question_options_position_nonnegative check (position >= 0),
  constraint assessment_question_options_question_position_key unique(question_id,position)
);

create table public.assessment_question_keys (
  question_id uuid primary key references public.assessment_questions(id) on delete cascade,
  answer_text text,
  numeric_answer numeric,
  numeric_tolerance numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessment_question_keys_answer_length check (answer_text is null or char_length(answer_text) <= 5000),
  constraint assessment_question_keys_tolerance_nonnegative check (numeric_tolerance >= 0)
);

create index assessment_questions_subject_status_idx on public.assessment_questions(subject_id,status,difficulty,question_type);
create index assessment_questions_module_idx on public.assessment_questions(module_id) where module_id is not null;
create index assessment_questions_lecture_idx on public.assessment_questions(lecture_id) where lecture_id is not null;
create index assessment_questions_source_idx on public.assessment_questions(source_type,source_year) where source_type='pyq'::public.assessment_question_source;
create index assessment_questions_created_by_idx on public.assessment_questions(created_by);
create index assessment_question_options_question_idx on public.assessment_question_options(question_id);

create trigger assessment_questions_set_updated_at before update on public.assessment_questions for each row execute function public.set_updated_at();
create trigger assessment_question_options_set_updated_at before update on public.assessment_question_options for each row execute function public.set_updated_at();
create trigger assessment_question_keys_set_updated_at before update on public.assessment_question_keys for each row execute function public.set_updated_at();

create or replace function private.validate_assessment_question_scope()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.module_id is not null and not exists (
    select 1 from public.modules m where m.id=new.module_id and m.subject_id=new.subject_id
  ) then raise exception 'Question module does not belong to the selected subject'; end if;

  if new.lecture_id is not null and not exists (
    select 1 from public.lectures l join public.modules m on m.id=l.module_id
    where l.id=new.lecture_id and m.subject_id=new.subject_id and (new.module_id is null or m.id=new.module_id)
  ) then raise exception 'Question lecture does not belong to the selected subject/module'; end if;

  if new.source_type='original'::public.assessment_question_source then new.source_year=null; end if;
  return new;
end;
$$;

revoke all on function private.validate_assessment_question_scope() from public;

create trigger assessment_questions_validate_scope
before insert or update of subject_id,module_id,lecture_id,source_type,source_year on public.assessment_questions
for each row execute function private.validate_assessment_question_scope();

create or replace function private.has_teacher_question_access(target_question uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists (
    select 1 from public.assessment_questions q
    where q.id=target_question and private.has_teacher_subject_access(q.subject_id)
  );
$$;

revoke all on function private.has_teacher_question_access(uuid) from public;
grant execute on function private.has_teacher_question_access(uuid) to authenticated;

alter table public.assessment_questions enable row level security;
alter table public.assessment_question_options enable row level security;
alter table public.assessment_question_keys enable row level security;

revoke all on table public.assessment_questions from anon,authenticated;
revoke all on table public.assessment_question_options from anon,authenticated;
revoke all on table public.assessment_question_keys from anon,authenticated;
grant select,insert,update,delete on table public.assessment_questions to authenticated,service_role;
grant select,insert,update,delete on table public.assessment_question_options to authenticated,service_role;
grant select,insert,update,delete on table public.assessment_question_keys to authenticated,service_role;
grant usage on type public.assessment_question_type to authenticated,service_role;
grant usage on type public.assessment_difficulty to authenticated,service_role;
grant usage on type public.assessment_question_source to authenticated,service_role;

create policy assessment_questions_read_staff on public.assessment_questions for select to authenticated using (
  (select private.is_active_user()) and ((select private.has_any_role(array['content_manager','admin','owner']::public.app_role[])) or private.has_teacher_subject_access(subject_id))
);
create policy assessment_questions_insert_staff on public.assessment_questions for insert to authenticated with check (
  (select private.is_active_user()) and ((select private.has_any_role(array['content_manager','admin','owner']::public.app_role[])) or private.has_teacher_subject_access(subject_id))
);
create policy assessment_questions_update_staff on public.assessment_questions for update to authenticated using (
  (select private.is_active_user()) and ((select private.has_any_role(array['content_manager','admin','owner']::public.app_role[])) or private.has_teacher_subject_access(subject_id))
) with check (
  (select private.is_active_user()) and ((select private.has_any_role(array['content_manager','admin','owner']::public.app_role[])) or private.has_teacher_subject_access(subject_id))
);
create policy assessment_questions_delete_admin on public.assessment_questions for delete to authenticated using (
  (select private.is_active_user()) and (select private.has_any_role(array['admin','owner']::public.app_role[]))
);

create policy assessment_question_options_read_staff on public.assessment_question_options for select to authenticated using (
  (select private.is_active_user()) and ((select private.has_any_role(array['content_manager','admin','owner']::public.app_role[])) or private.has_teacher_question_access(question_id))
);
create policy assessment_question_options_insert_staff on public.assessment_question_options for insert to authenticated with check (
  (select private.is_active_user()) and ((select private.has_any_role(array['content_manager','admin','owner']::public.app_role[])) or private.has_teacher_question_access(question_id))
);
create policy assessment_question_options_update_staff on public.assessment_question_options for update to authenticated using (
  (select private.is_active_user()) and ((select private.has_any_role(array['content_manager','admin','owner']::public.app_role[])) or private.has_teacher_question_access(question_id))
) with check (
  (select private.is_active_user()) and ((select private.has_any_role(array['content_manager','admin','owner']::public.app_role[])) or private.has_teacher_question_access(question_id))
);
create policy assessment_question_options_delete_staff on public.assessment_question_options for delete to authenticated using (
  (select private.is_active_user()) and ((select private.has_any_role(array['content_manager','admin','owner']::public.app_role[])) or private.has_teacher_question_access(question_id))
);

create policy assessment_question_keys_read_staff on public.assessment_question_keys for select to authenticated using (
  (select private.is_active_user()) and ((select private.has_any_role(array['content_manager','admin','owner']::public.app_role[])) or private.has_teacher_question_access(question_id))
);
create policy assessment_question_keys_insert_staff on public.assessment_question_keys for insert to authenticated with check (
  (select private.is_active_user()) and ((select private.has_any_role(array['content_manager','admin','owner']::public.app_role[])) or private.has_teacher_question_access(question_id))
);
create policy assessment_question_keys_update_staff on public.assessment_question_keys for update to authenticated using (
  (select private.is_active_user()) and ((select private.has_any_role(array['content_manager','admin','owner']::public.app_role[])) or private.has_teacher_question_access(question_id))
) with check (
  (select private.is_active_user()) and ((select private.has_any_role(array['content_manager','admin','owner']::public.app_role[])) or private.has_teacher_question_access(question_id))
);
create policy assessment_question_keys_delete_staff on public.assessment_question_keys for delete to authenticated using (
  (select private.is_active_user()) and ((select private.has_any_role(array['content_manager','admin','owner']::public.app_role[])) or private.has_teacher_question_access(question_id))
);

create or replace function private.validate_assessment_question_answer_shape(target_question uuid)
returns void language plpgsql security definer set search_path='' as $$
declare qtype public.assessment_question_type; option_count integer; correct_count integer; key_row public.assessment_question_keys;
begin
  select question_type into qtype from public.assessment_questions where id=target_question;
  if qtype is null then raise exception 'Question not found'; end if;
  select count(*),count(*) filter(where is_correct) into option_count,correct_count
  from public.assessment_question_options where question_id=target_question;
  select * into key_row from public.assessment_question_keys where question_id=target_question;

  if qtype='single_choice'::public.assessment_question_type and (option_count<2 or correct_count<>1) then
    raise exception 'Single-choice questions require at least two options and exactly one correct option';
  elsif qtype='multiple_choice'::public.assessment_question_type and (option_count<2 or correct_count<1) then
    raise exception 'Multiple-choice questions require at least two options and at least one correct option';
  elsif qtype='numeric'::public.assessment_question_type and (key_row.question_id is null or key_row.numeric_answer is null) then
    raise exception 'Numeric questions require a numeric answer key';
  elsif qtype='short_text'::public.assessment_question_type and (key_row.question_id is null or nullif(trim(key_row.answer_text),'') is null) then
    raise exception 'Short-text questions require a text answer key';
  end if;
end;
$$;

revoke all on function private.validate_assessment_question_answer_shape(uuid) from public;
grant execute on function private.validate_assessment_question_answer_shape(uuid) to authenticated;

create or replace function public.validate_assessment_question_answer_shape(target_question uuid)
returns void language plpgsql security invoker set search_path='' as $$
begin
  if not (private.has_any_role(array['content_manager','admin','owner']::public.app_role[]) or private.has_teacher_question_access(target_question))
  then raise exception 'Not authorized'; end if;
  perform private.validate_assessment_question_answer_shape(target_question);
end;
$$;

revoke all on function public.validate_assessment_question_answer_shape(uuid) from public;
grant execute on function public.validate_assessment_question_answer_shape(uuid) to authenticated;
