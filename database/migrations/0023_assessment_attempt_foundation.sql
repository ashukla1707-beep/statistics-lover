-- Statistics Lover: secure resumable assessment attempts with immutable question/option snapshots

create type public.assessment_attempt_status as enum ('in_progress','submitted','expired');

create table public.assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.assessment_test_schedules(id) on delete restrict,
  enrollment_id uuid not null references public.enrollments(id) on delete restrict,
  attempt_number integer not null,
  status public.assessment_attempt_status not null default 'in_progress',
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  submitted_at timestamptz,
  score numeric(10,2),
  max_score numeric(10,2),
  correct_count integer,
  incorrect_count integer,
  unanswered_count integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessment_attempts_number_positive check (attempt_number > 0),
  constraint assessment_attempts_expiry_after_start check (expires_at > started_at),
  constraint assessment_attempts_counts_nonnegative check (
    (correct_count is null or correct_count >= 0)
    and (incorrect_count is null or incorrect_count >= 0)
    and (unanswered_count is null or unanswered_count >= 0)
  ),
  constraint assessment_attempts_schedule_enrollment_number_key unique(schedule_id,enrollment_id,attempt_number)
);

create table public.assessment_attempt_questions (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.assessment_attempts(id) on delete cascade,
  source_question_id uuid not null,
  subject_id uuid not null,
  section_title text not null,
  section_position integer not null,
  question_position integer not null,
  question_type public.assessment_question_type not null,
  prompt text not null,
  marks numeric(8,2) not null,
  negative_marks numeric(8,2) not null default 0,
  answer_text_key text,
  numeric_answer_key numeric,
  numeric_tolerance numeric not null default 0,
  created_at timestamptz not null default now(),
  constraint assessment_attempt_questions_section_position_nonnegative check (section_position >= 0),
  constraint assessment_attempt_questions_question_position_nonnegative check (question_position >= 0),
  constraint assessment_attempt_questions_marks_positive check (marks > 0),
  constraint assessment_attempt_questions_negative_nonnegative check (negative_marks >= 0),
  constraint assessment_attempt_questions_negative_cap check (negative_marks <= marks),
  constraint assessment_attempt_questions_tolerance_nonnegative check (numeric_tolerance >= 0),
  constraint assessment_attempt_questions_position_key unique(attempt_id,section_position,question_position)
);

create table public.assessment_attempt_options (
  id uuid primary key default gen_random_uuid(),
  attempt_question_id uuid not null references public.assessment_attempt_questions(id) on delete cascade,
  option_text text not null,
  position integer not null,
  is_correct boolean not null,
  created_at timestamptz not null default now(),
  constraint assessment_attempt_options_position_nonnegative check (position >= 0),
  constraint assessment_attempt_options_question_position_key unique(attempt_question_id,position)
);

create table public.assessment_attempt_answers (
  attempt_question_id uuid primary key references public.assessment_attempt_questions(id) on delete cascade,
  selected_option_ids uuid[] not null default array[]::uuid[],
  answer_text text,
  numeric_answer numeric,
  saved_at timestamptz not null default now(),
  constraint assessment_attempt_answers_text_length check (answer_text is null or char_length(answer_text) <= 5000)
);

create index assessment_attempts_enrollment_schedule_idx on public.assessment_attempts(enrollment_id,schedule_id,status);
create index assessment_attempts_schedule_idx on public.assessment_attempts(schedule_id,status,submitted_at);
create index assessment_attempt_questions_attempt_idx on public.assessment_attempt_questions(attempt_id,section_position,question_position);
create index assessment_attempt_options_question_idx on public.assessment_attempt_options(attempt_question_id,position);

create trigger assessment_attempts_set_updated_at before update on public.assessment_attempts
for each row execute function public.set_updated_at();

alter table public.assessment_attempts enable row level security;
alter table public.assessment_attempt_questions enable row level security;
alter table public.assessment_attempt_options enable row level security;
alter table public.assessment_attempt_answers enable row level security;

revoke all on table public.assessment_attempts from anon,authenticated;
revoke all on table public.assessment_attempt_questions from anon,authenticated;
revoke all on table public.assessment_attempt_options from anon,authenticated;
revoke all on table public.assessment_attempt_answers from anon,authenticated;
grant select on table public.assessment_attempts to authenticated,service_role;
grant select on table public.assessment_attempt_questions to authenticated,service_role;
grant select on table public.assessment_attempt_options to authenticated,service_role;
grant select on table public.assessment_attempt_answers to authenticated,service_role;
grant insert,update,delete on table public.assessment_attempts to service_role;
grant insert,update,delete on table public.assessment_attempt_questions to service_role;
grant insert,update,delete on table public.assessment_attempt_options to service_role;
grant insert,update,delete on table public.assessment_attempt_answers to service_role;
grant usage on type public.assessment_attempt_status to authenticated,service_role;

create or replace function private.has_staff_attempt_access(target_attempt uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.assessment_attempts a join public.assessment_test_schedules s on s.id=a.schedule_id
    where a.id=target_attempt and (
      private.has_any_role(array['content_manager','admin','owner']::public.app_role[]) or private.has_teacher_test_access(s.test_id)
    )
  );
$$;
revoke all on function private.has_staff_attempt_access(uuid) from public;
grant execute on function private.has_staff_attempt_access(uuid) to authenticated;

create policy assessment_attempts_read_staff on public.assessment_attempts for select to authenticated
using ((select private.is_active_user()) and private.has_staff_attempt_access(id));
create policy assessment_attempt_questions_read_staff on public.assessment_attempt_questions for select to authenticated
using ((select private.is_active_user()) and private.has_staff_attempt_access(attempt_id));
create policy assessment_attempt_options_read_staff on public.assessment_attempt_options for select to authenticated using (
  (select private.is_active_user()) and exists(
    select 1 from public.assessment_attempt_questions aq where aq.id=attempt_question_id and private.has_staff_attempt_access(aq.attempt_id)
  )
);
create policy assessment_attempt_answers_read_staff on public.assessment_attempt_answers for select to authenticated using (
  (select private.is_active_user()) and exists(
    select 1 from public.assessment_attempt_questions aq where aq.id=attempt_question_id and private.has_staff_attempt_access(aq.attempt_id)
  )
);

create or replace function private.get_student_schedule_enrollment(target_schedule uuid,target_user uuid)
returns uuid language sql stable security definer set search_path='' as $$
  select e.id
  from public.assessment_test_schedules s
  join public.assessment_tests t on t.id=s.test_id
  join public.enrollments e on e.batch_id=t.batch_id
  where s.id=target_schedule and e.student_id=target_user and e.status='active'::public.enrollment_status
    and (e.access_starts_at is null or e.access_starts_at<=now()) and (e.access_ends_at is null or e.access_ends_at>now())
    and s.is_active and (
      s.audience='batch'::public.assessment_schedule_audience
      or exists(select 1 from public.assessment_test_schedule_enrollments se where se.schedule_id=s.id and se.enrollment_id=e.id)
    )
  order by e.created_at desc limit 1;
$$;
revoke all on function private.get_student_schedule_enrollment(uuid,uuid) from public;
grant execute on function private.get_student_schedule_enrollment(uuid,uuid) to authenticated;

create or replace function private.start_assessment_attempt(target_schedule uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare
  v_enrollment_id uuid; schedule_row public.assessment_test_schedules; test_row public.assessment_tests;
  existing_id uuid; attempt_count integer; result_id uuid; expiry timestamptz;
  section_row public.assessment_test_sections; placement_row public.assessment_test_questions;
  question_row public.assessment_questions; key_row public.assessment_question_keys; option_row public.assessment_question_options;
  snapshot_question_id uuid; section_pos integer:=0; question_pos integer:=0; option_pos integer:=0;
begin
  if not private.is_active_user() then raise exception 'Inactive account'; end if;
  select * into schedule_row from public.assessment_test_schedules where id=target_schedule;
  if schedule_row.id is null or not schedule_row.is_active then raise exception 'Test schedule unavailable'; end if;
  if now()<schedule_row.opens_at then raise exception 'This test has not opened yet'; end if;
  if now()>=schedule_row.closes_at then raise exception 'This test is closed'; end if;

  select * into test_row from public.assessment_tests where id=schedule_row.test_id;
  if test_row.id is null or test_row.status<>'published'::public.academic_content_status then raise exception 'Test unavailable'; end if;

  v_enrollment_id:=private.get_student_schedule_enrollment(target_schedule,auth.uid());
  if v_enrollment_id is null then raise exception 'This test is not assigned to your enrollment'; end if;

  update public.assessment_attempts set status='expired'::public.assessment_attempt_status
  where schedule_id=target_schedule and enrollment_id=v_enrollment_id and status='in_progress'::public.assessment_attempt_status and expires_at<=now();

  select id into existing_id from public.assessment_attempts
  where schedule_id=target_schedule and enrollment_id=v_enrollment_id and status='in_progress'::public.assessment_attempt_status and expires_at>now()
  order by attempt_number desc limit 1;
  if existing_id is not null then return existing_id; end if;

  select count(*) into attempt_count from public.assessment_attempts where schedule_id=target_schedule and enrollment_id=v_enrollment_id;
  if attempt_count>=test_row.max_attempts then raise exception 'Maximum attempts reached'; end if;

  expiry:=schedule_row.closes_at;
  if test_row.duration_minutes is not null then expiry:=least(expiry,now()+make_interval(mins=>test_row.duration_minutes)); end if;

  insert into public.assessment_attempts(schedule_id,enrollment_id,attempt_number,expires_at)
  values(target_schedule,v_enrollment_id,attempt_count+1,expiry) returning id into result_id;

  for section_row in select * from public.assessment_test_sections where test_id=test_row.id order by position loop
    question_pos:=0;
    for placement_row in
      select tq.* from public.assessment_test_questions tq where tq.section_id=section_row.id
      order by case when test_row.shuffle_questions then random() else tq.position::double precision end
    loop
      select * into question_row from public.assessment_questions where id=placement_row.question_id;
      select * into key_row from public.assessment_question_keys where question_id=placement_row.question_id;
      insert into public.assessment_attempt_questions(
        attempt_id,source_question_id,subject_id,section_title,section_position,question_position,question_type,prompt,
        marks,negative_marks,answer_text_key,numeric_answer_key,numeric_tolerance
      ) values(
        result_id,question_row.id,question_row.subject_id,section_row.title,section_pos,question_pos,question_row.question_type,
        question_row.prompt,placement_row.marks,placement_row.negative_marks,key_row.answer_text,key_row.numeric_answer,
        coalesce(key_row.numeric_tolerance,0)
      ) returning id into snapshot_question_id;

      option_pos:=0;
      for option_row in
        select * from public.assessment_question_options where question_id=question_row.id
        order by case when test_row.shuffle_options then random() else position::double precision end
      loop
        insert into public.assessment_attempt_options(attempt_question_id,option_text,position,is_correct)
        values(snapshot_question_id,option_row.option_text,option_pos,option_row.is_correct);
        option_pos:=option_pos+1;
      end loop;
      question_pos:=question_pos+1;
    end loop;
    section_pos:=section_pos+1;
  end loop;

  if not exists(select 1 from public.assessment_attempt_questions where attempt_id=result_id) then raise exception 'Test has no questions'; end if;
  return result_id;
end;
$$;
revoke all on function private.start_assessment_attempt(uuid) from public;
grant execute on function private.start_assessment_attempt(uuid) to authenticated;

create or replace function public.start_assessment_attempt(target_schedule uuid)
returns uuid language sql volatile security invoker set search_path='' as $$
  select private.start_assessment_attempt(target_schedule);
$$;
revoke all on function public.start_assessment_attempt(uuid) from public;
grant execute on function public.start_assessment_attempt(uuid) to authenticated;

create or replace function private.owns_assessment_attempt(target_attempt uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.assessment_attempts a join public.enrollments e on e.id=a.enrollment_id where a.id=target_attempt and e.student_id=auth.uid());
$$;
revoke all on function private.owns_assessment_attempt(uuid) from public;
grant execute on function private.owns_assessment_attempt(uuid) to authenticated;

create or replace function private.get_assessment_attempt_payload(target_attempt uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare payload jsonb;
begin
  if not private.owns_assessment_attempt(target_attempt) or not private.is_active_user() then raise exception 'Attempt not found'; end if;
  update public.assessment_attempts set status='expired'::public.assessment_attempt_status
  where id=target_attempt and status='in_progress'::public.assessment_attempt_status and expires_at<=now();

  select jsonb_build_object(
    'attempt',jsonb_build_object('id',a.id,'schedule_id',a.schedule_id,'test_id',t.id,'title',t.title,'instructions',t.instructions,
      'attempt_number',a.attempt_number,'status',a.status,'started_at',a.started_at,'expires_at',a.expires_at),
    'sections',coalesce((
      select jsonb_agg(jsonb_build_object('title',section_data.section_title,'position',section_data.section_position,'questions',section_data.questions)
        order by section_data.section_position)
      from (
        select aq.section_title,aq.section_position,
          jsonb_agg(jsonb_build_object(
            'id',aq.id,'position',aq.question_position,'type',aq.question_type,'prompt',aq.prompt,'marks',aq.marks,'negative_marks',aq.negative_marks,
            'options',coalesce((select jsonb_agg(jsonb_build_object('id',ao.id,'text',ao.option_text,'position',ao.position) order by ao.position)
              from public.assessment_attempt_options ao where ao.attempt_question_id=aq.id),'[]'::jsonb),
            'answer',jsonb_build_object('selected_option_ids',coalesce(ans.selected_option_ids,array[]::uuid[]),
              'answer_text',ans.answer_text,'numeric_answer',ans.numeric_answer,'saved_at',ans.saved_at)
          ) order by aq.question_position) as questions
        from public.assessment_attempt_questions aq
        left join public.assessment_attempt_answers ans on ans.attempt_question_id=aq.id
        where aq.attempt_id=a.id group by aq.section_title,aq.section_position
      ) section_data
    ),'[]'::jsonb)
  ) into payload
  from public.assessment_attempts a join public.assessment_test_schedules s on s.id=a.schedule_id join public.assessment_tests t on t.id=s.test_id
  where a.id=target_attempt;
  return payload;
end;
$$;
revoke all on function private.get_assessment_attempt_payload(uuid) from public;
grant execute on function private.get_assessment_attempt_payload(uuid) to authenticated;

create or replace function public.get_assessment_attempt_payload(target_attempt uuid)
returns jsonb language sql volatile security invoker set search_path='' as $$
  select private.get_assessment_attempt_payload(target_attempt);
$$;
revoke all on function public.get_assessment_attempt_payload(uuid) from public;
grant execute on function public.get_assessment_attempt_payload(uuid) to authenticated;

create or replace function private.save_assessment_attempt_answer(
  target_attempt_question uuid,target_selected_options uuid[],target_answer_text text,target_numeric_answer numeric
)
returns void language plpgsql security definer set search_path='' as $$
declare attempt_row public.assessment_attempts; qtype public.assessment_question_type; invalid_count integer;
begin
  select a.* into attempt_row
  from public.assessment_attempt_questions aq join public.assessment_attempts a on a.id=aq.attempt_id
  join public.enrollments e on e.id=a.enrollment_id
  where aq.id=target_attempt_question and e.student_id=auth.uid();
  select aq.question_type into qtype from public.assessment_attempt_questions aq where aq.id=target_attempt_question;

  if attempt_row.id is null then raise exception 'Attempt question not found'; end if;
  if attempt_row.status<>'in_progress'::public.assessment_attempt_status then raise exception 'Attempt is not editable'; end if;
  if now()>=attempt_row.expires_at then
    update public.assessment_attempts set status='expired'::public.assessment_attempt_status where id=attempt_row.id;
    raise exception 'Attempt time has expired';
  end if;

  select count(*) into invalid_count
  from unnest(coalesce(target_selected_options,array[]::uuid[])) option_id
  where not exists(select 1 from public.assessment_attempt_options ao where ao.id=option_id and ao.attempt_question_id=target_attempt_question);
  if invalid_count>0 then raise exception 'Invalid option selection'; end if;
  if qtype='single_choice'::public.assessment_question_type and coalesce(array_length(target_selected_options,1),0)>1 then
    raise exception 'Single-choice question accepts one option';
  end if;

  insert into public.assessment_attempt_answers(attempt_question_id,selected_option_ids,answer_text,numeric_answer,saved_at)
  values(target_attempt_question,coalesce(target_selected_options,array[]::uuid[]),
    case when qtype='short_text'::public.assessment_question_type then nullif(trim(target_answer_text),'') else null end,
    case when qtype='numeric'::public.assessment_question_type then target_numeric_answer else null end,now())
  on conflict(attempt_question_id) do update set selected_option_ids=excluded.selected_option_ids,answer_text=excluded.answer_text,
    numeric_answer=excluded.numeric_answer,saved_at=now();
end;
$$;
revoke all on function private.save_assessment_attempt_answer(uuid,uuid[],text,numeric) from public;
grant execute on function private.save_assessment_attempt_answer(uuid,uuid[],text,numeric) to authenticated;

create or replace function public.save_assessment_attempt_answer(
  target_attempt_question uuid,target_selected_options uuid[] default array[]::uuid[],target_answer_text text default null,target_numeric_answer numeric default null
)
returns void language sql volatile security invoker set search_path='' as $$
  select private.save_assessment_attempt_answer(target_attempt_question,target_selected_options,target_answer_text,target_numeric_answer);
$$;
revoke all on function public.save_assessment_attempt_answer(uuid,uuid[],text,numeric) from public;
grant execute on function public.save_assessment_attempt_answer(uuid,uuid[],text,numeric) to authenticated;
