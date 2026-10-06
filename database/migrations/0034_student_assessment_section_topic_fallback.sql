-- Follow-up to 0033: for questions without chapter tags, use the original scheduled test section name.
-- Read-only; authentication, release policies and same-test ranking remain unchanged.

CREATE OR REPLACE FUNCTION private.get_my_assessment_insights(target_batch uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare payload jsonb;
begin
  if auth.uid() is null or not private.is_active_user() or not private.has_batch_access(target_batch) then
    raise exception 'Batch access required';
  end if;

  select jsonb_build_object(
    'topics', coalesce((
      select jsonb_agg(jsonb_build_object(
        'module_id', g.module_id,
        'module_title', g.module_title,
        'source', g.source,
        'subject_title', g.subject_title,
        'questions', g.questions,
        'answered', g.answered,
        'correct', g.correct,
        'accuracy_percentage', case when g.answered > 0 then round(g.correct::numeric / g.answered * 100, 2) else 0 end
      ) order by g.subject_title, g.module_title)
      from (
        select coalesce(m.id::text,'section:' || sub.id::text || ':' || lower(trim(aq.section_title))) as module_id,
          coalesce(m.title, aq.section_title) as module_title,
          case when m.id is not null then 'module' else 'test_section' end as source,
          sub.title as subject_title,
          count(*) as questions,
          count(*) filter (where aq.was_answered) as answered,
          count(*) filter (where aq.is_correct) as correct
        from public.assessment_attempt_questions aq
        join public.assessment_attempts a on a.id = aq.attempt_id
        join public.assessment_test_schedules s on s.id = a.schedule_id
        join public.assessment_tests t on t.id = s.test_id
        join public.enrollments e on e.id = a.enrollment_id
        join public.subjects sub on sub.id = aq.subject_id
        left join public.assessment_questions q on q.id = aq.source_question_id
        left join public.modules m on m.id = q.module_id and m.subject_id = aq.subject_id
        where e.student_id = auth.uid()
          and t.batch_id = target_batch
          and a.score is not null
          and private.assessment_result_is_released(a.id)
          and (m.id is not null or nullif(trim(aq.section_title),'') is not null)
        group by m.id, m.title, sub.id, sub.title, aq.section_title
      ) g
    ), '[]'::jsonb),
    'latest_test_rank', (
      with latest as (
        select s.id as schedule_id, t.title as test_title
        from public.assessment_attempts a
        join public.assessment_test_schedules s on s.id = a.schedule_id
        join public.assessment_tests t on t.id = s.test_id
        join public.enrollments e on e.id = a.enrollment_id
        where e.student_id = auth.uid()
          and t.batch_id = target_batch
          and a.score is not null
          and private.assessment_result_is_released(a.id)
        order by a.submitted_at desc nulls last, a.id desc
        limit 1
      ),
      participant_scores as (
        select e.student_id, max(round(a.score / nullif(a.max_score, 0) * 100, 2)) as best_percentage
        from public.assessment_attempts a
        join public.enrollments e on e.id = a.enrollment_id
        join latest l on l.schedule_id = a.schedule_id
        where a.score is not null
          and a.max_score > 0
          and private.assessment_result_is_released(a.id)
        group by e.student_id
      ),
      ranked as (
        select student_id, best_percentage,
          rank() over (order by best_percentage desc) as position,
          count(*) over () as participants
        from participant_scores
      )
      select jsonb_build_object(
        'test_title', l.test_title,
        'rank', r.position,
        'participants', r.participants,
        'best_percentage', r.best_percentage
      )
      from ranked r cross join latest l
      where r.student_id = auth.uid()
    )
  ) into payload;
  return payload;
end;
$function$
;
