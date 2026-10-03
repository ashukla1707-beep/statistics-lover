import { requireSupabase } from '../../services/supabase/client'
import type { AssessmentQuestionType } from '../admin/questionBankService'

export interface AttemptOption{ id:string;text:string;position:number }
export interface AttemptAnswer{selected_option_ids:string[];answer_text:string|null;numeric_answer:number|null;saved_at:string|null}
export interface AttemptQuestion{id:string;position:number;type:AssessmentQuestionType;prompt:string;marks:number;negative_marks:number;options:AttemptOption[];answer:AttemptAnswer}
export interface AttemptSection{title:string;position:number;questions:AttemptQuestion[]}
export interface AssessmentAttemptPayload{attempt:{id:string;schedule_id:string;test_id:string;title:string;instructions:string|null;attempt_number:number;status:'in_progress'|'submitted'|'expired';started_at:string;expires_at:string};sections:AttemptSection[]}
export interface AttemptResultQuestion{id:string;section_title:string;section_position:number;question_position:number;type:AssessmentQuestionType;prompt:string;marks:number;negative_marks:number;was_answered:boolean;is_correct:boolean|null;awarded_score:number;selected_option_ids:string[];answer_text:string|null;numeric_answer:number|null;correct_option_ids:string[];correct_answer_text:string|null;correct_numeric_answer:number|null;numeric_tolerance:number;options:AttemptOption[]}
export interface AssessmentAttemptResult{released:boolean;attempt_id:string;status:string;score?:number;max_score?:number;correct_count?:number;incorrect_count?:number;unanswered_count?:number;submitted_at:string|null;questions?:AttemptResultQuestion[]}

export async function startAssessmentAttempt(scheduleId:string){
  const {data,error}=await requireSupabase().rpc('start_assessment_attempt',{target_schedule:scheduleId})
  if(error)throw error
  return data as string
}
export async function loadAssessmentAttempt(attemptId:string):Promise<AssessmentAttemptPayload>{
  const {data,error}=await requireSupabase().rpc('get_assessment_attempt_payload',{target_attempt:attemptId})
  if(error)throw error
  return data as AssessmentAttemptPayload
}
export async function saveAssessmentAnswer(input:{questionId:string;selectedOptionIds:string[];answerText:string|null;numericAnswer:number|null}){
  const {error}=await requireSupabase().rpc('save_assessment_attempt_answer',{target_attempt_question:input.questionId,target_selected_options:input.selectedOptionIds,target_answer_text:input.answerText,target_numeric_answer:input.numericAnswer})
  if(error)throw error
}
export async function submitAssessmentAttempt(attemptId:string){
  const {data,error}=await requireSupabase().rpc('submit_assessment_attempt',{target_attempt:attemptId})
  if(error)throw error
  return data as {attempt_id:string;status:string;score:number;max_score:number}
}
export async function loadAssessmentResult(attemptId:string):Promise<AssessmentAttemptResult>{
  const {data,error}=await requireSupabase().rpc('get_assessment_attempt_result',{target_attempt:attemptId})
  if(error)throw error
  return data as AssessmentAttemptResult
}
