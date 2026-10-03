import { requireSupabase } from '../../services/supabase/client'

export interface TestAnalyticsSummary{
  attemptCount:number
  studentCount:number
  averagePercentage:number
  highestPercentage:number
  lowestPercentage:number
  averageScore:number
  averageMaxScore:number
}
export interface TestQuestionAnalytics{
  questionId:string
  prompt:string
  type:string
  attempts:number
  answered:number
  correct:number
  accuracyPercentage:number
  averageAwarded:number
  marks:number
}
export interface TestAttemptAnalytics{
  attemptId:string
  studentId:string
  fullName:string|null
  email:string|null
  score:number
  maxScore:number
  percentage:number
  submittedAt:string|null
  attemptNumber:number
}
export interface TestAnalytics{
  summary:TestAnalyticsSummary
  questions:TestQuestionAnalytics[]
  recentAttempts:TestAttemptAnalytics[]
}

export interface StudentAnalyticsSummary{
  attemptCount:number
  averagePercentage:number
  bestPercentage:number
  totalCorrect:number
  totalIncorrect:number
  totalUnanswered:number
}
export interface StudentSubjectAnalytics{
  subjectId:string
  subjectTitle:string
  questions:number
  answered:number
  correct:number
  accuracyPercentage:number
  score:number
  maxScore:number
  scorePercentage:number
}
export interface StudentAttemptAnalytics{
  attemptId:string
  testTitle:string
  score:number
  maxScore:number
  percentage:number
  submittedAt:string|null
  attemptNumber:number
}
export interface StudentAssessmentAnalytics{
  summary:StudentAnalyticsSummary
  subjects:StudentSubjectAnalytics[]
  recentAttempts:StudentAttemptAnalytics[]
}

type RawTestAnalytics={
  summary?:{attempt_count?:number;student_count?:number;average_percentage?:number;highest_percentage?:number;lowest_percentage?:number;average_score?:number;average_max_score?:number}
  questions?:Array<{source_question_id:string;prompt:string;type:string;attempts:number;answered:number;correct:number;accuracy_percentage:number;average_awarded:number;marks:number}>
  recent_attempts?:Array<{attempt_id:string;student_id:string;full_name:string|null;email:string|null;score:number;max_score:number;percentage:number;submitted_at:string|null;attempt_number:number}>
}
type RawStudentAnalytics={
  summary?:{attempt_count?:number;average_percentage?:number;best_percentage?:number;total_correct?:number;total_incorrect?:number;total_unanswered?:number}
  subjects?:Array<{subject_id:string;subject_title:string;questions:number;answered:number;correct:number;accuracy_percentage:number;score:number;max_score:number;score_percentage:number}>
  recent_attempts?:Array<{attempt_id:string;test_title:string;score:number;max_score:number;percentage:number;submitted_at:string|null;attempt_number:number}>
}

const numeric=(value:number|undefined)=>Number(value??0)

export async function loadAssessmentTestAnalytics(testId:string):Promise<TestAnalytics>{
  const {data,error}=await requireSupabase().rpc('get_assessment_test_analytics',{target_test:testId})
  if(error)throw error
  const raw=(data??{}) as RawTestAnalytics
  return{
    summary:{
      attemptCount:numeric(raw.summary?.attempt_count),studentCount:numeric(raw.summary?.student_count),
      averagePercentage:numeric(raw.summary?.average_percentage),highestPercentage:numeric(raw.summary?.highest_percentage),
      lowestPercentage:numeric(raw.summary?.lowest_percentage),averageScore:numeric(raw.summary?.average_score),
      averageMaxScore:numeric(raw.summary?.average_max_score),
    },
    questions:(raw.questions??[]).map((q)=>({questionId:q.source_question_id,prompt:q.prompt,type:q.type,attempts:numeric(q.attempts),answered:numeric(q.answered),correct:numeric(q.correct),accuracyPercentage:numeric(q.accuracy_percentage),averageAwarded:numeric(q.average_awarded),marks:numeric(q.marks)})),
    recentAttempts:(raw.recent_attempts??[]).map((a)=>({attemptId:a.attempt_id,studentId:a.student_id,fullName:a.full_name,email:a.email,score:numeric(a.score),maxScore:numeric(a.max_score),percentage:numeric(a.percentage),submittedAt:a.submitted_at,attemptNumber:numeric(a.attempt_number)})),
  }
}

export async function loadMyAssessmentAnalytics(batchId:string):Promise<StudentAssessmentAnalytics>{
  const {data,error}=await requireSupabase().rpc('get_my_assessment_analytics',{target_batch:batchId})
  if(error)throw error
  const raw=(data??{}) as RawStudentAnalytics
  return{
    summary:{
      attemptCount:numeric(raw.summary?.attempt_count),averagePercentage:numeric(raw.summary?.average_percentage),
      bestPercentage:numeric(raw.summary?.best_percentage),totalCorrect:numeric(raw.summary?.total_correct),
      totalIncorrect:numeric(raw.summary?.total_incorrect),totalUnanswered:numeric(raw.summary?.total_unanswered),
    },
    subjects:(raw.subjects??[]).map((s)=>({subjectId:s.subject_id,subjectTitle:s.subject_title,questions:numeric(s.questions),answered:numeric(s.answered),correct:numeric(s.correct),accuracyPercentage:numeric(s.accuracy_percentage),score:numeric(s.score),maxScore:numeric(s.max_score),scorePercentage:numeric(s.score_percentage)})),
    recentAttempts:(raw.recent_attempts??[]).map((a)=>({attemptId:a.attempt_id,testTitle:a.test_title,score:numeric(a.score),maxScore:numeric(a.max_score),percentage:numeric(a.percentage),submittedAt:a.submitted_at,attemptNumber:numeric(a.attempt_number)})),
  }
}
