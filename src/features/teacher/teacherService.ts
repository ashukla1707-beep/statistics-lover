import { requireSupabase } from '../../services/supabase/client'

export interface MyTeacherAssignment {
  id:string
  batchId:string
  subjectId:string|null
  courseTitle:string
  batchTitle:string
  subjectTitle:string|null
  startsAt:string|null
  endsAt:string|null
}

type AssignmentRow={id:string;batch_id:string;subject_id:string|null;starts_at:string|null;ends_at:string|null;is_active:boolean}
type BatchRow={id:string;course_id:string;title:string}
type CourseRow={id:string;title:string}
type SubjectRow={id:string;title:string}

export async function loadMyTeacherAssignments(userId:string):Promise<MyTeacherAssignment[]> {
  const client=requireSupabase()
  const {data,error}=await client.from('teacher_assignments').select('id,batch_id,subject_id,starts_at,ends_at,is_active').eq('teacher_id',userId).eq('is_active',true).order('created_at')
  if(error) throw error
  const rows=(data??[]) as AssignmentRow[]
  if(!rows.length) return []
  const batchIds=[...new Set(rows.map((r)=>r.batch_id))]
  const {data:batchData,error:batchError}=await client.from('batches').select('id,course_id,title').in('id',batchIds)
  if(batchError) throw batchError
  const batches=(batchData??[]) as BatchRow[]
  const courseIds=[...new Set(batches.map((b)=>b.course_id))]
  const {data:courseData,error:courseError}=courseIds.length?await client.from('courses').select('id,title').in('id',courseIds):{data:[],error:null}
  if(courseError) throw courseError
  const subjectIds=[...new Set(rows.map((r)=>r.subject_id).filter((id):id is string=>Boolean(id)))]
  const {data:subjectData,error:subjectError}=subjectIds.length?await client.from('subjects').select('id,title').in('id',subjectIds):{data:[],error:null}
  if(subjectError) throw subjectError
  const batchMap=new Map(batches.map((b)=>[b.id,b]))
  const courseMap=new Map(((courseData??[]) as CourseRow[]).map((c)=>[c.id,c.title]))
  const subjectMap=new Map(((subjectData??[]) as SubjectRow[]).map((s)=>[s.id,s.title]))
  return rows.map((r)=>{const b=batchMap.get(r.batch_id);return{id:r.id,batchId:r.batch_id,subjectId:r.subject_id,courseTitle:b?courseMap.get(b.course_id)??'Course':'Course',batchTitle:b?.title??'Batch',subjectTitle:r.subject_id?subjectMap.get(r.subject_id)??'Subject':null,startsAt:r.starts_at,endsAt:r.ends_at}})
}
