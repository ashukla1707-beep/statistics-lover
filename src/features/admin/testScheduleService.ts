import { requireSupabase } from '../../services/supabase/client'

export type AssessmentScheduleAudience='batch'|'selected'
export type AssessmentResultPolicy='immediate'|'after_close'|'scheduled'|'manual'

export interface ManagedTestSchedule{
  id:string
  testId:string
  title:string|null
  opensAt:string
  closesAt:string
  audience:AssessmentScheduleAudience
  resultPolicy:AssessmentResultPolicy
  resultsReleaseAt:string|null
  isActive:boolean
  manualResultsReleased:boolean
  enrollmentIds:string[]
}
export interface TestRosterStudent{
  enrollmentId:string
  studentId:string
  fullName:string|null
  email:string|null
}
export interface StudentTestSchedule{
  scheduleId:string
  testId:string
  title:string
  description:string|null
  instructions:string|null
  durationMinutes:number|null
  maxAttempts:number
  opensAt:string
  closesAt:string
  resultPolicy:AssessmentResultPolicy
  resultsReleaseAt:string|null
}
type ScheduleRow={id:string;test_id:string;title:string|null;opens_at:string;closes_at:string;audience:AssessmentScheduleAudience;result_policy:AssessmentResultPolicy;results_release_at:string|null;is_active:boolean;manual_results_released:boolean}
type RosterRow={enrollment_id:string;student_id:string;full_name:string|null;email:string|null}
type StudentRow={schedule_id:string;test_id:string;test_title:string;test_description:string|null;test_instructions:string|null;duration_minutes:number|null;max_attempts:number;opens_at:string;closes_at:string;result_policy:AssessmentResultPolicy;results_release_at:string|null}

export async function listManagedTestSchedules(testId:string):Promise<ManagedTestSchedule[]>{
  const client=requireSupabase()
  const {data,error}=await client.from('assessment_test_schedules').select('id,test_id,title,opens_at,closes_at,audience,result_policy,results_release_at,is_active,manual_results_released').eq('test_id',testId).order('opens_at',{ascending:false})
  if(error)throw error
  const rows=(data??[]) as ScheduleRow[]
  if(!rows.length)return[]
  const ids=rows.map((r)=>r.id)
  const {data:assignmentData,error:assignmentError}=await client.from('assessment_test_schedule_enrollments').select('schedule_id,enrollment_id').in('schedule_id',ids)
  if(assignmentError)throw assignmentError
  const map=new Map<string,string[]>()
  for(const item of (assignmentData??[]) as Array<{schedule_id:string;enrollment_id:string}>){
    map.set(item.schedule_id,[...(map.get(item.schedule_id)??[]),item.enrollment_id])
  }
  return rows.map((r)=>({id:r.id,testId:r.test_id,title:r.title,opensAt:r.opens_at,closesAt:r.closes_at,audience:r.audience,resultPolicy:r.result_policy,resultsReleaseAt:r.results_release_at,isActive:r.is_active,manualResultsReleased:r.manual_results_released,enrollmentIds:map.get(r.id)??[]}))
}

export async function loadAssessmentTestRoster(testId:string):Promise<TestRosterStudent[]>{
  const {data,error}=await requireSupabase().rpc('get_assessment_test_roster',{target_test:testId})
  if(error)throw error
  return ((data??[]) as RosterRow[]).map((r)=>({enrollmentId:r.enrollment_id,studentId:r.student_id,fullName:r.full_name,email:r.email}))
}

export async function saveManagedTestSchedule(input:{
  id:string|null;testId:string;title:string;opensAt:string;closesAt:string;audience:AssessmentScheduleAudience
  resultPolicy:AssessmentResultPolicy;resultsReleaseAt:string|null;isActive:boolean;enrollmentIds:string[]
}){
  const {data,error}=await requireSupabase().rpc('save_assessment_test_schedule',{
    target_schedule:input.id,target_test:input.testId,target_title:input.title.trim()||null,
    target_opens_at:input.opensAt,target_closes_at:input.closesAt,target_audience:input.audience,
    target_result_policy:input.resultPolicy,target_results_release_at:input.resultsReleaseAt,
    target_is_active:input.isActive,target_enrollment_ids:input.enrollmentIds,
  })
  if(error)throw error
  return data as string
}
export async function deleteManagedTestSchedule(id:string){
  const {error}=await requireSupabase().from('assessment_test_schedules').delete().eq('id',id)
  if(error)throw error
}
export async function loadMyAssessmentSchedules(batchId:string):Promise<StudentTestSchedule[]>{
  const {data,error}=await requireSupabase().rpc('get_my_assessment_schedules',{target_batch:batchId})
  if(error)throw error
  return ((data??[]) as StudentRow[]).map((r)=>({scheduleId:r.schedule_id,testId:r.test_id,title:r.test_title,description:r.test_description,instructions:r.test_instructions,durationMinutes:r.duration_minutes,maxAttempts:r.max_attempts,opensAt:r.opens_at,closesAt:r.closes_at,resultPolicy:r.result_policy,resultsReleaseAt:r.results_release_at}))
}

export async function setManualAssessmentResultsReleased(scheduleId:string,released:boolean){
  const {error}=await requireSupabase().rpc('set_manual_assessment_results_released',{target_schedule:scheduleId,target_released:released})
  if(error)throw error
}
