import { requireSupabase } from '../../services/supabase/client'
import type { LearningResourceScope } from './resourceAdminService'

export type AssignmentStatus='draft'|'published'|'archived'
export type SubmissionStatus='draft'|'submitted'|'graded'|'returned'

export interface ManagedAssignment{
  id:string
  batchId:string
  scope:LearningResourceScope
  subjectId:string|null
  moduleId:string|null
  lectureId:string|null
  title:string
  instructions:string|null
  status:AssignmentStatus
  releaseAt:string|null
  dueAt:string|null
  allowLate:boolean
  maxScore:number|null
  position:number
}

export interface AssignmentSubmission{
  id:string
  enrollmentId:string
  studentId:string
  fullName:string|null
  email:string|null
  status:SubmissionStatus
  submissionText:string|null
  attachmentPath:string|null
  submittedAt:string|null
  score:number|null
  feedback:string|null
  gradedAt:string|null
}

export interface StudentAssignment{
  id:string
  scope:LearningResourceScope
  subjectId:string|null
  moduleId:string|null
  lectureId:string|null
  contextTitle:string
  title:string
  instructions:string|null
  releaseAt:string|null
  dueAt:string|null
  allowLate:boolean
  maxScore:number|null
  position:number
  submissionId:string|null
  submissionStatus:SubmissionStatus|null
  submissionText:string
  attachmentPath:string|null
  submittedAt:string|null
  score:number|null
  feedback:string|null
  gradedAt:string|null
}

type AssignmentRow={
  id:string;batch_id:string;scope:LearningResourceScope;subject_id:string|null;module_id:string|null;lecture_id:string|null
  title:string;instructions:string|null;status:AssignmentStatus;release_at:string|null;due_at:string|null
  allow_late:boolean;max_score:number|null;position:number
}
type SubmissionRow={
  submission_id:string;enrollment_id:string;student_id:string;full_name:string|null;email:string|null
  submission_status:SubmissionStatus;submission_text:string|null;attachment_path:string|null;submitted_at:string|null
  score:number|null;feedback:string|null;graded_at:string|null
}
type StudentAssignmentRow={
  assignment_id:string;assignment_scope:LearningResourceScope;subject_id:string|null;module_id:string|null;lecture_id:string|null
  context_title:string;title:string;instructions:string|null;release_at:string|null;due_at:string|null;allow_late:boolean
  max_score:number|null;assignment_position:number;submission_id:string|null;submission_status:SubmissionStatus|null
  submission_text:string|null;attachment_path:string|null;submitted_at:string|null;score:number|null;feedback:string|null;graded_at:string|null
}

const columns='id,batch_id,scope,subject_id,module_id,lecture_id,title,instructions,status,release_at,due_at,allow_late,max_score,position'

export async function listManagedAssignments(batchId:string):Promise<ManagedAssignment[]>{
  const {data,error}=await requireSupabase().from('assignments').select(columns).eq('batch_id',batchId).order('position').order('created_at')
  if(error) throw error
  return ((data??[]) as AssignmentRow[]).map((row)=>({
    id:row.id,batchId:row.batch_id,scope:row.scope,subjectId:row.subject_id,moduleId:row.module_id,lectureId:row.lecture_id,
    title:row.title,instructions:row.instructions,status:row.status,releaseAt:row.release_at,dueAt:row.due_at,
    allowLate:row.allow_late,maxScore:row.max_score,position:row.position,
  }))
}

export async function saveManagedAssignment(input:{
  id:string|null;batchId:string;scope:LearningResourceScope;subjectId:string|null;moduleId:string|null;lectureId:string|null
  title:string;instructions:string;status:AssignmentStatus;releaseAt:string|null;dueAt:string|null;allowLate:boolean
  maxScore:number|null;position:number
}){
  const row={
    batch_id:input.batchId,scope:input.scope,
    subject_id:input.scope==='subject'?input.subjectId:null,
    module_id:input.scope==='module'?input.moduleId:null,
    lecture_id:input.scope==='lecture'?input.lectureId:null,
    title:input.title.trim(),instructions:input.instructions.trim()||null,status:input.status,
    release_at:input.releaseAt,due_at:input.dueAt,allow_late:input.allowLate,max_score:input.maxScore,position:input.position,
  }
  const client=requireSupabase()
  if(input.id){
    const {error}=await client.from('assignments').update(row).eq('id',input.id)
    if(error) throw error
    return input.id
  }
  const {data,error}=await client.from('assignments').insert(row).select('id').single()
  if(error) throw error
  return (data as {id:string}).id
}

export async function deleteManagedAssignment(id:string){
  const {error}=await requireSupabase().from('assignments').delete().eq('id',id)
  if(error) throw error
}

export async function listAssignmentSubmissions(assignmentId:string):Promise<AssignmentSubmission[]>{
  const {data,error}=await requireSupabase().rpc('get_assignment_submissions',{target_assignment:assignmentId})
  if(error) throw error
  return ((data??[]) as SubmissionRow[]).map((row)=>({
    id:row.submission_id,enrollmentId:row.enrollment_id,studentId:row.student_id,fullName:row.full_name,email:row.email,
    status:row.submission_status,submissionText:row.submission_text,attachmentPath:row.attachment_path,submittedAt:row.submitted_at,
    score:row.score,feedback:row.feedback,gradedAt:row.graded_at,
  }))
}

export async function gradeAssignmentSubmission(input:{submissionId:string;status:'graded'|'returned';score:number|null;feedback:string}){
  const {error}=await requireSupabase().from('assignment_submissions').update({
    status:input.status,score:input.score,feedback:input.feedback.trim()||null,
  }).eq('id',input.submissionId)
  if(error) throw error
}

export async function createSubmissionSignedUrl(path:string){
  const {data,error}=await requireSupabase().storage.from('assignment-submissions').createSignedUrl(path,60*15)
  if(error) throw error
  return data.signedUrl
}

export async function loadStudentAssignments(batchId:string):Promise<StudentAssignment[]>{
  const {data,error}=await requireSupabase().rpc('get_batch_assignments',{target_batch:batchId})
  if(error) throw error
  return ((data??[]) as StudentAssignmentRow[]).map((row)=>({
    id:row.assignment_id,scope:row.assignment_scope,subjectId:row.subject_id,moduleId:row.module_id,lectureId:row.lecture_id,
    contextTitle:row.context_title,title:row.title,instructions:row.instructions,releaseAt:row.release_at,dueAt:row.due_at,
    allowLate:row.allow_late,maxScore:row.max_score,position:row.assignment_position,submissionId:row.submission_id,
    submissionStatus:row.submission_status,submissionText:row.submission_text??'',attachmentPath:row.attachment_path,
    submittedAt:row.submitted_at,score:row.score,feedback:row.feedback,gradedAt:row.graded_at,
  }))
}

function safeFileName(name:string){
  return name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/-+/g,'-').slice(-120)||'submission'
}

export async function saveStudentAssignmentSubmission(input:{
  assignmentId:string;userId:string;text:string;file:File|null;submitNow:boolean
}){
  const client=requireSupabase()
  let uploadedPath:string|null=null
  if(input.file){
    if(input.file.size>25*1024*1024) throw new Error('Attachment must be 25 MB or smaller.')
    const path=`${input.userId}/${input.assignmentId}/${crypto.randomUUID()}-${safeFileName(input.file.name)}`
    const {error:uploadError}=await client.storage.from('assignment-submissions').upload(path,input.file,{upsert:false})
    if(uploadError) throw uploadError
    uploadedPath=path
  }

  const {error}=await client.rpc('save_my_assignment_submission',{
    target_assignment:input.assignmentId,
    response_text:input.text.trim()||null,
    uploaded_path:uploadedPath,
    submit_now:input.submitNow,
  })
  if(error) throw error
}
