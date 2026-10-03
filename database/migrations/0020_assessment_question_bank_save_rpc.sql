-- Statistics Lover: atomic question/options/answer-key save RPC

create or replace function private.save_assessment_question(
  target_question uuid,target_subject uuid,target_module uuid,target_lecture uuid,
  target_type public.assessment_question_type,target_difficulty public.assessment_difficulty,
  target_source public.assessment_question_source,target_source_label text,target_source_year integer,
  target_prompt text,target_explanation text,target_marks numeric,target_negative_marks numeric,
  target_status public.academic_content_status,target_options jsonb,target_answer_text text,
  target_numeric_answer numeric,target_numeric_tolerance numeric
)
returns uuid language plpgsql security definer set search_path='' as $$
declare result_id uuid; item jsonb; option_position integer:=0;
begin
  if not private.is_active_user() then raise exception 'Inactive account'; end if;
  if not (
    private.has_any_role(array['content_manager','admin','owner']::public.app_role[])
    or private.has_teacher_subject_access(target_subject)
  ) then raise exception 'Not authorized for this subject'; end if;

  if target_question is null then
    insert into public.assessment_questions(
      subject_id,module_id,lecture_id,question_type,difficulty,source_type,source_label,source_year,
      prompt,explanation,default_marks,default_negative_marks,status
    ) values(
      target_subject,target_module,target_lecture,target_type,target_difficulty,target_source,
      nullif(trim(target_source_label),''),target_source_year,trim(target_prompt),nullif(trim(target_explanation),''),
      target_marks,target_negative_marks,target_status
    ) returning id into result_id;
  else
    if not exists(
      select 1 from public.assessment_questions q where q.id=target_question
      and (private.has_any_role(array['content_manager','admin','owner']::public.app_role[]) or private.has_teacher_question_access(q.id))
    ) then raise exception 'Question not found or not authorized'; end if;

    update public.assessment_questions set
      subject_id=target_subject,module_id=target_module,lecture_id=target_lecture,question_type=target_type,
      difficulty=target_difficulty,source_type=target_source,source_label=nullif(trim(target_source_label),''),
      source_year=target_source_year,prompt=trim(target_prompt),explanation=nullif(trim(target_explanation),''),
      default_marks=target_marks,default_negative_marks=target_negative_marks,status=target_status
    where id=target_question;
    result_id=target_question;
  end if;

  delete from public.assessment_question_options where question_id=result_id;
  delete from public.assessment_question_keys where question_id=result_id;

  if target_type in ('single_choice'::public.assessment_question_type,'multiple_choice'::public.assessment_question_type) then
    if jsonb_typeof(coalesce(target_options,'[]'::jsonb))<>'array' then raise exception 'Question options must be an array'; end if;
    for item in select * from jsonb_array_elements(coalesce(target_options,'[]'::jsonb))
    loop
      insert into public.assessment_question_options(question_id,option_text,position,is_correct)
      values(result_id,trim(coalesce(item->>'text','')),coalesce((item->>'position')::integer,option_position),coalesce((item->>'is_correct')::boolean,false));
      option_position:=option_position+1;
    end loop;
  elsif target_type='numeric'::public.assessment_question_type then
    insert into public.assessment_question_keys(question_id,numeric_answer,numeric_tolerance)
    values(result_id,target_numeric_answer,coalesce(target_numeric_tolerance,0));
  elsif target_type='short_text'::public.assessment_question_type then
    insert into public.assessment_question_keys(question_id,answer_text)
    values(result_id,nullif(trim(target_answer_text),''));
  end if;

  perform private.validate_assessment_question_answer_shape(result_id);
  return result_id;
end;
$$;

revoke all on function private.save_assessment_question(
  uuid,uuid,uuid,uuid,public.assessment_question_type,public.assessment_difficulty,
  public.assessment_question_source,text,integer,text,text,numeric,numeric,
  public.academic_content_status,jsonb,text,numeric,numeric
) from public;
grant execute on function private.save_assessment_question(
  uuid,uuid,uuid,uuid,public.assessment_question_type,public.assessment_difficulty,
  public.assessment_question_source,text,integer,text,text,numeric,numeric,
  public.academic_content_status,jsonb,text,numeric,numeric
) to authenticated;

create or replace function public.save_assessment_question(
  target_question uuid default null,target_subject uuid default null,target_module uuid default null,target_lecture uuid default null,
  target_type public.assessment_question_type default 'single_choice',target_difficulty public.assessment_difficulty default 'medium',
  target_source public.assessment_question_source default 'original',target_source_label text default null,target_source_year integer default null,
  target_prompt text default null,target_explanation text default null,target_marks numeric default 1,target_negative_marks numeric default 0,
  target_status public.academic_content_status default 'draft',target_options jsonb default '[]'::jsonb,target_answer_text text default null,
  target_numeric_answer numeric default null,target_numeric_tolerance numeric default 0
)
returns uuid language sql volatile security invoker set search_path='' as $$
  select private.save_assessment_question(
    target_question,target_subject,target_module,target_lecture,target_type,target_difficulty,target_source,
    target_source_label,target_source_year,target_prompt,target_explanation,target_marks,target_negative_marks,
    target_status,target_options,target_answer_text,target_numeric_answer,target_numeric_tolerance
  );
$$;

revoke all on function public.save_assessment_question(
  uuid,uuid,uuid,uuid,public.assessment_question_type,public.assessment_difficulty,
  public.assessment_question_source,text,integer,text,text,numeric,numeric,
  public.academic_content_status,jsonb,text,numeric,numeric
) from public;
grant execute on function public.save_assessment_question(
  uuid,uuid,uuid,uuid,public.assessment_question_type,public.assessment_difficulty,
  public.assessment_question_source,text,integer,text,text,numeric,numeric,
  public.academic_content_status,jsonb,text,numeric,numeric
) to authenticated;
