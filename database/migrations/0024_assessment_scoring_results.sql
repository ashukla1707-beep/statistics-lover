-- Statistics Lover: automatic scoring, result release policy and safe student review

alter table public.assessment_test_schedules
add column manual_results_released boolean not null default false;

alter table public.assessment_attempt_questions
add column was_answered boolean,
add column is_correct boolean,
add column awarded_score numeric(10,2);

create or replace function private.score_assessment_attempt(target_attempt uuid)
returns void language plpgsql security definer set search_path='' as $$
declare
  attempt_row public.assessment_attempts; q public.assessment_attempt_questions; ans public.assessment_attempt_answers;
  answered boolean; correct boolean; awarded numeric(10,2); total numeric(10,2):=0; maximum numeric(10,2):=0;
  correct_n integer:=0; incorrect_n integer:=0; unanswered_n integer:=0;
  selected_count integer; correct_count integer; overlap_count integer;
begin
  select * into attempt_row from public.assessment_attempts where id=target_attempt;
  if attempt_row.id is null then raise exception 'Attempt not found'; end if;

  for q in select * from public.assessment_attempt_questions where attempt_id=target_attempt order by section_position,question_position loop
    select * into ans from public.assessment_attempt_answers where attempt_question_id=q.id;
    answered:=false; correct:=false; awarded:=0; maximum:=maximum+q.marks;

    if q.question_type in ('single_choice'::public.assessment_question_type,'multiple_choice'::public.assessment_question_type) then
      selected_count:=coalesce(array_length(ans.selected_option_ids,1),0); answered:=selected_count>0;
      if answered then
        select count(*) into correct_count from public.assessment_attempt_options where attempt_question_id=q.id and is_correct;
        select count(*) into overlap_count from unnest(ans.selected_option_ids) selected_id
        join public.assessment_attempt_options ao on ao.id=selected_id where ao.attempt_question_id=q.id and ao.is_correct;
        correct:=(selected_count=correct_count and overlap_count=correct_count);
      end if;
    elsif q.question_type='numeric'::public.assessment_question_type then
      answered:=ans.numeric_answer is not null;
      correct:=answered and q.numeric_answer_key is not null and abs(ans.numeric_answer-q.numeric_answer_key)<=q.numeric_tolerance;
    elsif q.question_type='short_text'::public.assessment_question_type then
      answered:=nullif(trim(ans.answer_text),'') is not null;
      correct:=answered and q.answer_text_key is not null and lower(trim(ans.answer_text))=lower(trim(q.answer_text_key));
    end if;

    if not answered then unanswered_n:=unanswered_n+1; awarded:=0;
    elsif correct then correct_n:=correct_n+1; awarded:=q.marks;
    else incorrect_n:=incorrect_n+1; awarded:=-q.negative_marks; end if;

    total:=total+awarded;
    update public.assessment_attempt_questions
    set was_answered=answered,is_correct=case when answered then correct else null end,awarded_score=awarded where id=q.id;
  end loop;

  update public.assessment_attempts
  set score=total,max_score=maximum,correct_count=correct_n,incorrect_count=incorrect_n,unanswered_count=unanswered_n,
      submitted_at=coalesce(submitted_at,now()),
      status=case when now()>=expires_at then 'expired'::public.assessment_attempt_status else 'submitted'::public.assessment_attempt_status end
  where id=target_attempt;
end;
$$;
revoke all on function private.score_assessment_attempt(uuid) from public;

create or replace function private.submit_assessment_attempt(target_attempt uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.assessment_attempts;
begin
  if not private.owns_assessment_attempt(target_attempt) or not private.is_active_user() then raise exception 'Attempt not found'; end if;
  select * into a from public.assessment_attempts where id=target_attempt;
  if a.status in ('submitted'::public.assessment_attempt_status,'expired'::public.assessment_attempt_status) and a.score is not null then
    return jsonb_build_object('attempt_id',a.id,'status',a.status,'score',a.score,'max_score',a.max_score);
  end if;
  perform private.score_assessment_attempt(target_attempt);
  select * into a from public.assessment_attempts where id=target_attempt;
  return jsonb_build_object('attempt_id',a.id,'status',a.status,'score',a.score,'max_score',a.max_score);
end;
$$;
revoke all on function private.submit_assessment_attempt(uuid) from public;
grant execute on function private.submit_assessment_attempt(uuid) to authenticated;

create or replace function public.submit_assessment_attempt(target_attempt uuid)
returns jsonb language sql volatile security invoker set search_path='' as $$
  select private.submit_assessment_attempt(target_attempt);
$$;
revoke all on function public.submit_assessment_attempt(uuid) from public;
grant execute on function public.submit_assessment_attempt(uuid) to authenticated;

create or replace function private.assessment_result_is_released(target_attempt uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select case s.result_policy
    when 'immediate'::public.assessment_result_policy then true
    when 'after_close'::public.assessment_result_policy then now()>=s.closes_at
    when 'scheduled'::public.assessment_result_policy then s.results_release_at is not null and now()>=s.results_release_at
    when 'manual'::public.assessment_result_policy then s.manual_results_released
    else false end
  from public.assessment_attempts a join public.assessment_test_schedules s on s.id=a.schedule_id
  where a.id=target_attempt;
$$;
revoke all on function private.assessment_result_is_released(uuid) from public;
grant execute on function private.assessment_result_is_released(uuid) to authenticated;

create or replace function private.get_assessment_attempt_result(target_attempt uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result_payload jsonb; a public.assessment_attempts;
begin
  if not private.owns_assessment_attempt(target_attempt) or not private.is_active_user() then raise exception 'Attempt not found'; end if;

  select * into a from public.assessment_attempts where id=target_attempt;
  if a.status='in_progress'::public.assessment_attempt_status then
    if now()>=a.expires_at then perform private.score_assessment_attempt(target_attempt); select * into a from public.assessment_attempts where id=target_attempt;
    else raise exception 'Attempt has not been submitted'; end if;
  elsif a.score is null then
    perform private.score_assessment_attempt(target_attempt); select * into a from public.assessment_attempts where id=target_attempt;
  end if;

  if not private.assessment_result_is_released(target_attempt) then
    return jsonb_build_object('released',false,'attempt_id',a.id,'status',a.status,'submitted_at',a.submitted_at);
  end if;

  select jsonb_build_object(
    'released',true,'attempt_id',a.id,'status',a.status,'score',a.score,'max_score',a.max_score,
    'correct_count',a.correct_count,'incorrect_count',a.incorrect_count,'unanswered_count',a.unanswered_count,'submitted_at',a.submitted_at,
    'questions',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',q.id,'section_title',q.section_title,'section_position',q.section_position,'question_position',q.question_position,
        'type',q.question_type,'prompt',q.prompt,'marks',q.marks,'negative_marks',q.negative_marks,
        'was_answered',q.was_answered,'is_correct',q.is_correct,'awarded_score',q.awarded_score,
        'selected_option_ids',coalesce(ans.selected_option_ids,array[]::uuid[]),'answer_text',ans.answer_text,'numeric_answer',ans.numeric_answer,
        'correct_option_ids',coalesce((select array_agg(o.id order by o.position) from public.assessment_attempt_options o where o.attempt_question_id=q.id and o.is_correct),array[]::uuid[]),
        'correct_answer_text',q.answer_text_key,'correct_numeric_answer',q.numeric_answer_key,'numeric_tolerance',q.numeric_tolerance,
        'options',coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'text',o.option_text,'position',o.position) order by o.position)
          from public.assessment_attempt_options o where o.attempt_question_id=q.id),'[]'::jsonb)
      ) order by q.section_position,q.question_position)
      from public.assessment_attempt_questions q left join public.assessment_attempt_answers ans on ans.attempt_question_id=q.id
      where q.attempt_id=a.id
    ),'[]'::jsonb)
  ) into result_payload;
  return result_payload;
end;
$$;
revoke all on function private.get_assessment_attempt_result(uuid) from public;
grant execute on function private.get_assessment_attempt_result(uuid) to authenticated;

create or replace function public.get_assessment_attempt_result(target_attempt uuid)
returns jsonb language sql volatile security invoker set search_path='' as $$
  select private.get_assessment_attempt_result(target_attempt);
$$;
revoke all on function public.get_assessment_attempt_result(uuid) from public;
grant execute on function public.get_assessment_attempt_result(uuid) to authenticated;

create or replace function public.set_manual_assessment_results_released(target_schedule uuid,target_released boolean)
returns void language plpgsql security invoker set search_path='' as $$
begin
  if not (private.has_any_role(array['content_manager','admin','owner']::public.app_role[]) or private.has_teacher_schedule_access(target_schedule))
  then raise exception 'Not authorized'; end if;
  update public.assessment_test_schedules set manual_results_released=target_released where id=target_schedule;
end;
$$;
revoke all on function public.set_manual_assessment_results_released(uuid,boolean) from public;
grant execute on function public.set_manual_assessment_results_released(uuid,boolean) to authenticated;
