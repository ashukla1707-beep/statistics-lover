-- Statistics Lover: assessment performance analytics from immutable scored attempt snapshots

create or replace function private.get_assessment_test_analytics(target_test uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare payload jsonb;
begin
  if not (
    private.has_any_role(array['content_manager','admin','owner']::public.app_role[])
    or private.has_teacher_test_access(target_test)
  ) then raise exception 'Not authorized'; end if;

  select jsonb_build_object(
    'summary',jsonb_build_object(
      'attempt_count',count(a.id),
      'student_count',count(distinct a.enrollment_id),
      'average_percentage',coalesce(round(avg(case when a.max_score<>0 then (a.score/a.max_score)*100 end),2),0),
      'highest_percentage',coalesce(round(max(case when a.max_score<>0 then (a.score/a.max_score)*100 end),2),0),
      'lowest_percentage',coalesce(round(min(case when a.max_score<>0 then (a.score/a.max_score)*100 end),2),0),
      'average_score',coalesce(round(avg(a.score),2),0),
      'average_max_score',coalesce(round(avg(a.max_score),2),0)
    ),
    'questions',coalesce((
      select jsonb_agg(jsonb_build_object(
        'source_question_id',x.source_question_id,
        'prompt',x.prompt,
        'type',x.question_type,
        'attempts',x.attempts,
        'answered',x.answered,
        'correct',x.correct,
        'accuracy_percentage',case when x.answered>0 then round((x.correct::numeric/x.answered)*100,2) else 0 end,
        'average_awarded',x.average_awarded,
        'marks',x.marks
      ) order by case when x.answered>0 then (x.correct::numeric/x.answered) else 0 end,x.prompt)
      from (
        select aq.source_question_id,aq.prompt,aq.question_type,
          count(*) as attempts,
          count(*) filter(where aq.was_answered) as answered,
          count(*) filter(where aq.is_correct) as correct,
          round(avg(coalesce(aq.awarded_score,0)),2) as average_awarded,
          max(aq.marks) as marks
        from public.assessment_attempt_questions aq
        join public.assessment_attempts aa on aa.id=aq.attempt_id
        join public.assessment_test_schedules ss on ss.id=aa.schedule_id
        where ss.test_id=target_test
          and aa.status in ('submitted'::public.assessment_attempt_status,'expired'::public.assessment_attempt_status)
          and aa.score is not null
        group by aq.source_question_id,aq.prompt,aq.question_type
      ) x
    ),'[]'::jsonb),
    'recent_attempts',coalesce((
      select jsonb_agg(jsonb_build_object(
        'attempt_id',r.id,
        'student_id',r.student_id,
        'full_name',r.full_name,
        'email',r.email,
        'score',r.score,
        'max_score',r.max_score,
        'percentage',r.percentage,
        'submitted_at',r.submitted_at,
        'attempt_number',r.attempt_number
      ) order by r.submitted_at desc)
      from (
        select a.id,e.student_id,p.full_name,p.email,a.score,a.max_score,
          case when a.max_score<>0 then round((a.score/a.max_score)*100,2) else 0 end as percentage,
          a.submitted_at,a.attempt_number
        from public.assessment_attempts a
        join public.assessment_test_schedules s on s.id=a.schedule_id
        join public.enrollments e on e.id=a.enrollment_id
        join public.profiles p on p.id=e.student_id
        where s.test_id=target_test and a.score is not null
        order by a.submitted_at desc nulls last
        limit 50
      ) r
    ),'[]'::jsonb)
  ) into payload
  from public.assessment_attempts a
  join public.assessment_test_schedules s on s.id=a.schedule_id
  where s.test_id=target_test
    and a.status in ('submitted'::public.assessment_attempt_status,'expired'::public.assessment_attempt_status)
    and a.score is not null;

  return payload;
end;
$$;

revoke all on function private.get_assessment_test_analytics(uuid) from public;
grant execute on function private.get_assessment_test_analytics(uuid) to authenticated;

create or replace function public.get_assessment_test_analytics(target_test uuid)
returns jsonb
language sql
stable
security invoker
set search_path=''
as $$
  select private.get_assessment_test_analytics(target_test);
$$;

revoke all on function public.get_assessment_test_analytics(uuid) from public;
grant execute on function public.get_assessment_test_analytics(uuid) to authenticated;

create or replace function private.get_my_assessment_analytics(target_batch uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare payload jsonb;
begin
  if not private.has_batch_access(target_batch) or not private.is_active_user() then
    raise exception 'Batch access required';
  end if;

  select jsonb_build_object(
    'summary',jsonb_build_object(
      'attempt_count',count(a.id),
      'average_percentage',coalesce(round(avg(case when a.max_score<>0 then (a.score/a.max_score)*100 end),2),0),
      'best_percentage',coalesce(round(max(case when a.max_score<>0 then (a.score/a.max_score)*100 end),2),0),
      'total_correct',coalesce(sum(a.correct_count),0),
      'total_incorrect',coalesce(sum(a.incorrect_count),0),
      'total_unanswered',coalesce(sum(a.unanswered_count),0)
    ),
    'subjects',coalesce((
      select jsonb_agg(jsonb_build_object(
        'subject_id',x.subject_id,
        'subject_title',x.subject_title,
        'questions',x.questions,
        'answered',x.answered,
        'correct',x.correct,
        'accuracy_percentage',case when x.answered>0 then round((x.correct::numeric/x.answered)*100,2) else 0 end,
        'score',x.score,
        'max_score',x.max_score,
        'score_percentage',case when x.max_score<>0 then round((x.score/x.max_score)*100,2) else 0 end
      ) order by x.subject_title)
      from (
        select aq.subject_id,subj.title as subject_title,
          count(*) as questions,
          count(*) filter(where aq.was_answered) as answered,
          count(*) filter(where aq.is_correct) as correct,
          sum(coalesce(aq.awarded_score,0)) as score,
          sum(aq.marks) as max_score
        from public.assessment_attempt_questions aq
        join public.assessment_attempts aa on aa.id=aq.attempt_id
        join public.assessment_test_schedules ss on ss.id=aa.schedule_id
        join public.assessment_tests tt on tt.id=ss.test_id
        join public.enrollments ee on ee.id=aa.enrollment_id
        join public.subjects subj on subj.id=aq.subject_id
        where ee.student_id=auth.uid()
          and tt.batch_id=target_batch
          and aa.score is not null
          and private.assessment_result_is_released(aa.id)
        group by aq.subject_id,subj.title
      ) x
    ),'[]'::jsonb),
    'recent_attempts',coalesce((
      select jsonb_agg(jsonb_build_object(
        'attempt_id',r.id,
        'test_title',r.test_title,
        'score',r.score,
        'max_score',r.max_score,
        'percentage',r.percentage,
        'submitted_at',r.submitted_at,
        'attempt_number',r.attempt_number
      ) order by r.submitted_at desc)
      from (
        select a.id,t.title as test_title,a.score,a.max_score,
          case when a.max_score<>0 then round((a.score/a.max_score)*100,2) else 0 end as percentage,
          a.submitted_at,a.attempt_number
        from public.assessment_attempts a
        join public.assessment_test_schedules s on s.id=a.schedule_id
        join public.assessment_tests t on t.id=s.test_id
        join public.enrollments e on e.id=a.enrollment_id
        where e.student_id=auth.uid()
          and t.batch_id=target_batch
          and a.score is not null
          and private.assessment_result_is_released(a.id)
        order by a.submitted_at desc nulls last
        limit 20
      ) r
    ),'[]'::jsonb)
  ) into payload
  from public.assessment_attempts a
  join public.assessment_test_schedules s on s.id=a.schedule_id
  join public.assessment_tests t on t.id=s.test_id
  join public.enrollments e on e.id=a.enrollment_id
  where e.student_id=auth.uid()
    and t.batch_id=target_batch
    and a.score is not null
    and private.assessment_result_is_released(a.id);

  return payload;
end;
$$;

revoke all on function private.get_my_assessment_analytics(uuid) from public;
grant execute on function private.get_my_assessment_analytics(uuid) to authenticated;

create or replace function public.get_my_assessment_analytics(target_batch uuid)
returns jsonb
language sql
stable
security invoker
set search_path=''
as $$
  select private.get_my_assessment_analytics(target_batch);
$$;

revoke all on function public.get_my_assessment_analytics(uuid) from public;
grant execute on function public.get_my_assessment_analytics(uuid) to authenticated;

create or replace function private.save_assessment_attempt_answer(
  target_attempt_question uuid,
  target_selected_options uuid[],
  target_answer_text text,
  target_numeric_answer numeric
)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare attempt_row public.assessment_attempts; qtype public.assessment_question_type; invalid_count integer; unique_count integer;
begin
  select a.* into attempt_row
  from public.assessment_attempt_questions aq
  join public.assessment_attempts a on a.id=aq.attempt_id
  join public.enrollments e on e.id=a.enrollment_id
  where aq.id=target_attempt_question and e.student_id=auth.uid();

  select aq.question_type into qtype
  from public.assessment_attempt_questions aq
  where aq.id=target_attempt_question;

  if attempt_row.id is null then raise exception 'Attempt question not found'; end if;
  if attempt_row.status<>'in_progress'::public.assessment_attempt_status then raise exception 'Attempt is not editable'; end if;
  if now()>=attempt_row.expires_at then
    update public.assessment_attempts set status='expired'::public.assessment_attempt_status where id=attempt_row.id;
    raise exception 'Attempt time has expired';
  end if;

  select count(*) into invalid_count
  from unnest(coalesce(target_selected_options,array[]::uuid[])) option_id
  where not exists(
    select 1 from public.assessment_attempt_options ao
    where ao.id=option_id and ao.attempt_question_id=target_attempt_question
  );
  if invalid_count>0 then raise exception 'Invalid option selection'; end if;

  select count(distinct option_id) into unique_count
  from unnest(coalesce(target_selected_options,array[]::uuid[])) option_id;
  if unique_count<>coalesce(array_length(target_selected_options,1),0) then
    raise exception 'Duplicate option selections are not allowed';
  end if;

  if qtype='single_choice'::public.assessment_question_type and coalesce(array_length(target_selected_options,1),0)>1 then
    raise exception 'Single-choice question accepts one option';
  end if;

  insert into public.assessment_attempt_answers(attempt_question_id,selected_option_ids,answer_text,numeric_answer,saved_at)
  values(
    target_attempt_question,coalesce(target_selected_options,array[]::uuid[]),
    case when qtype='short_text'::public.assessment_question_type then nullif(trim(target_answer_text),'') else null end,
    case when qtype='numeric'::public.assessment_question_type then target_numeric_answer else null end,
    now()
  )
  on conflict(attempt_question_id) do update set
    selected_option_ids=excluded.selected_option_ids,
    answer_text=excluded.answer_text,
    numeric_answer=excluded.numeric_answer,
    saved_at=now();
end;
$$;

revoke all on function private.save_assessment_attempt_answer(uuid,uuid[],text,numeric) from public;
grant execute on function private.save_assessment_attempt_answer(uuid,uuid[],text,numeric) to authenticated;
