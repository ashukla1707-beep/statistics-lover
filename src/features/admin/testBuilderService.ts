import { requireSupabase } from '../../services/supabase/client'
import type { ManagedQuestion } from './questionBankService'

export type AssessmentTestScope='batch'|'subject'
export type AssessmentTestStatus='draft'|'published'|'archived'

export interface ManagedTestQuestion{
  id:string
  questionId:string
  position:number
  marks:number
  negativeMarks:number
  prompt:string
  type:ManagedQuestion['type']
}
export interface ManagedTestSection{
  id:string
  subjectId:string
  title:string
  instructions:string|null
  position:number
  durationMinutes:number|null
  questions:ManagedTestQuestion[]
}
export interface ManagedTest{
  id:string
  batchId:string
  scope:AssessmentTestScope
  subjectId:string|null
  title:string
  description:string|null
  instructions:string|null
  status:AssessmentTestStatus
  durationMinutes:number|null
  maxAttempts:number
  shuffleQuestions:boolean
  shuffleOptions:boolean
  sections:ManagedTestSection[]
}

type TestRow={id:string;batch_id:string;scope:AssessmentTestScope;subject_id:string|null;title:string;description:string|null;instructions:string|null;status:AssessmentTestStatus;duration_minutes:number|null;max_attempts:number;shuffle_questions:boolean;shuffle_options:boolean}
type SectionRow={id:string;test_id:string;subject_id:string;title:string;instructions:string|null;position:number;duration_minutes:number|null}
type TQRow={id:string;section_id:string;question_id:string;position:number;marks:number;negative_marks:number}
type QRow={id:string;prompt:string;question_type:ManagedQuestion['type']}

export async function listManagedTests(batchId:string):Promise<ManagedTest[]>{
  const client=requireSupabase()
  const {data,error}=await client.from('assessment_tests').select('id,batch_id,scope,subject_id,title,description,instructions,status,duration_minutes,max_attempts,shuffle_questions,shuffle_options').eq('batch_id',batchId).order('created_at',{ascending:false})
  if(error)throw error
  const tests=(data??[]) as TestRow[]
  if(!tests.length)return[]
  const testIds=tests.map((t)=>t.id)
  const {data:sectionData,error:sectionError}=await client.from('assessment_test_sections').select('id,test_id,subject_id,title,instructions,position,duration_minutes').in('test_id',testIds).order('position')
  if(sectionError)throw sectionError
  const sections=(sectionData??[]) as SectionRow[]
  const sectionIds=sections.map((s)=>s.id)
  const {data:tqData,error:tqError}=sectionIds.length?await client.from('assessment_test_questions').select('id,section_id,question_id,position,marks,negative_marks').in('section_id',sectionIds).order('position'):{data:[],error:null}
  if(tqError)throw tqError
  const placements=(tqData??[]) as TQRow[]
  const questionIds=[...new Set(placements.map((p)=>p.question_id))]
  const {data:qData,error:qError}=questionIds.length?await client.from('assessment_questions').select('id,prompt,question_type').in('id',questionIds):{data:[],error:null}
  if(qError)throw qError
  const qMap=new Map(((qData??[]) as QRow[]).map((q)=>[q.id,q]))
  const placementMap=new Map<string,ManagedTestQuestion[]>()
  for(const p of placements){
    const q=qMap.get(p.question_id)
    placementMap.set(p.section_id,[...(placementMap.get(p.section_id)??[]),{id:p.id,questionId:p.question_id,position:p.position,marks:p.marks,negativeMarks:p.negative_marks,prompt:q?.prompt??'Question',type:q?.question_type??'single_choice'}])
  }
  const sectionMap=new Map<string,ManagedTestSection[]>()
  for(const s of sections){
    sectionMap.set(s.test_id,[...(sectionMap.get(s.test_id)??[]),{id:s.id,subjectId:s.subject_id,title:s.title,instructions:s.instructions,position:s.position,durationMinutes:s.duration_minutes,questions:placementMap.get(s.id)??[]}])
  }
  return tests.map((t)=>({id:t.id,batchId:t.batch_id,scope:t.scope,subjectId:t.subject_id,title:t.title,description:t.description,instructions:t.instructions,status:t.status,durationMinutes:t.duration_minutes,maxAttempts:t.max_attempts,shuffleQuestions:t.shuffle_questions,shuffleOptions:t.shuffle_options,sections:sectionMap.get(t.id)??[]}))
}

export async function saveManagedTest(input:{
  id:string|null;batchId:string;scope:AssessmentTestScope;subjectId:string|null;title:string;description:string;instructions:string
  status:AssessmentTestStatus;durationMinutes:number|null;maxAttempts:number;shuffleQuestions:boolean;shuffleOptions:boolean
  sections:Array<{subjectId:string;title:string;instructions:string;position:number;durationMinutes:number|null;questions:Array<{questionId:string;position:number;marks:number;negativeMarks:number}>}>
}){
  const {data,error}=await requireSupabase().rpc('save_assessment_test',{
    target_test:input.id,target_batch:input.batchId,target_scope:input.scope,target_subject:input.scope==='subject'?input.subjectId:null,
    target_title:input.title,target_description:input.description.trim()||null,target_instructions:input.instructions.trim()||null,
    target_status:input.status,target_duration_minutes:input.durationMinutes,target_max_attempts:input.maxAttempts,
    target_shuffle_questions:input.shuffleQuestions,target_shuffle_options:input.shuffleOptions,
    target_sections:input.sections.map((s)=>({subject_id:s.subjectId,title:s.title,instructions:s.instructions,position:s.position,duration_minutes:s.durationMinutes,questions:s.questions.map((q)=>({question_id:q.questionId,position:q.position,marks:q.marks,negative_marks:q.negativeMarks}))})),
  })
  if(error)throw error
  return data as string
}

export async function deleteManagedTest(id:string){
  const {error}=await requireSupabase().from('assessment_tests').delete().eq('id',id)
  if(error)throw error
}
