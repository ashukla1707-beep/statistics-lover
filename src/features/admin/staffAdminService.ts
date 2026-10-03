import { requireSupabase } from '../../services/supabase/client'
import type { AccountStatus, UserRole } from '../../types/domain'

export type StaffAssignableRole = 'teacher' | 'content_manager'

export interface StaffUser {
  id: string
  email: string | null
  fullName: string | null
  accountStatus: AccountStatus
  roles: UserRole[]
}

export interface TeacherAssignment {
  id: string
  teacherId: string
  batchId: string
  subjectId: string | null
  isActive: boolean
  startsAt: string | null
  endsAt: string | null
  courseId: string
  courseTitle: string
  batchTitle: string
  subjectTitle: string | null
}

type ProfileRow={id:string;email:string|null;full_name:string|null;account_status:AccountStatus}
type RoleRow={user_id:string;role:UserRole}
type AssignmentRow={id:string;teacher_id:string;batch_id:string;subject_id:string|null;is_active:boolean;starts_at:string|null;ends_at:string|null}
type BatchRow={id:string;course_id:string;title:string}
type CourseRow={id:string;title:string}
type SubjectRow={id:string;title:string}

export async function listStaffUsers():Promise<StaffUser[]> {
  const client=requireSupabase()
  const {data:profiles,error:profileError}=await client.from('profiles').select('id,email,full_name,account_status').order('created_at',{ascending:false}).limit(250)
  if(profileError) throw profileError
  const rows=(profiles??[]) as ProfileRow[]
  if(!rows.length) return []
  const {data:roles,error:roleError}=await client.from('user_roles').select('user_id,role').in('user_id',rows.map((r)=>r.id))
  if(roleError) throw roleError
  const roleMap=new Map<string,UserRole[]>()
  for(const row of (roles??[]) as RoleRow[]) roleMap.set(row.user_id,[...(roleMap.get(row.user_id)??[]),row.role])
  return rows.map((row)=>({id:row.id,email:row.email,fullName:row.full_name,accountStatus:row.account_status,roles:roleMap.get(row.id)??[]}))
}

export async function grantStaffRole(userId:string,role:StaffAssignableRole){
  const {error}=await requireSupabase().from('user_roles').insert({user_id:userId,role})
  if(error && error.code!=='23505') throw error
}

export async function revokeStaffRole(userId:string,role:StaffAssignableRole){
  const {error}=await requireSupabase().from('user_roles').delete().eq('user_id',userId).eq('role',role)
  if(error) throw error
}

export async function listTeacherAssignments(teacherId:string):Promise<TeacherAssignment[]> {
  const client=requireSupabase()
  const {data,error}=await client.from('teacher_assignments').select('id,teacher_id,batch_id,subject_id,is_active,starts_at,ends_at').eq('teacher_id',teacherId).order('created_at')
  if(error) throw error
  const assignments=(data??[]) as AssignmentRow[]
  if(!assignments.length) return []

  const batchIds=[...new Set(assignments.map((a)=>a.batch_id))]
  const {data:batchData,error:batchError}=await client.from('batches').select('id,course_id,title').in('id',batchIds)
  if(batchError) throw batchError
  const batches=(batchData??[]) as BatchRow[]
  const courseIds=[...new Set(batches.map((b)=>b.course_id))]
  const {data:courseData,error:courseError}=courseIds.length?await client.from('courses').select('id,title').in('id',courseIds):{data:[],error:null}
  if(courseError) throw courseError

  const subjectIds=[...new Set(assignments.map((a)=>a.subject_id).filter((id):id is string=>Boolean(id)))]
  const {data:subjectData,error:subjectError}=subjectIds.length?await client.from('subjects').select('id,title').in('id',subjectIds):{data:[],error:null}
  if(subjectError) throw subjectError

  const batchMap=new Map(batches.map((b)=>[b.id,b]))
  const courseMap=new Map(((courseData??[]) as CourseRow[]).map((c)=>[c.id,c.title]))
  const subjectMap=new Map(((subjectData??[]) as SubjectRow[]).map((s)=>[s.id,s.title]))

  return assignments.map((a)=>{
    const batch=batchMap.get(a.batch_id)
    return {
      id:a.id,teacherId:a.teacher_id,batchId:a.batch_id,subjectId:a.subject_id,isActive:a.is_active,startsAt:a.starts_at,endsAt:a.ends_at,
      courseId:batch?.course_id??'',batchTitle:batch?.title??'Assigned batch',courseTitle:batch?courseMap.get(batch.course_id)??'Course':'Course',
      subjectTitle:a.subject_id?subjectMap.get(a.subject_id)??'Assigned subject':null,
    }
  })
}

export async function saveTeacherAssignment(input:{id:string|null;teacherId:string;batchId:string;subjectId:string|null;isActive:boolean;startsAt:string|null;endsAt:string|null}){
  const client=requireSupabase()
  const row={teacher_id:input.teacherId,batch_id:input.batchId,subject_id:input.subjectId,is_active:input.isActive,starts_at:input.startsAt,ends_at:input.endsAt}
  if(input.id){
    const {error}=await client.from('teacher_assignments').update(row).eq('id',input.id)
    if(error) throw error
    return input.id
  }
  const {data,error}=await client.from('teacher_assignments').insert(row).select('id').single()
  if(error) throw error
  return (data as {id:string}).id
}

export async function deleteTeacherAssignment(id:string){
  const {error}=await requireSupabase().from('teacher_assignments').delete().eq('id',id)
  if(error) throw error
}
