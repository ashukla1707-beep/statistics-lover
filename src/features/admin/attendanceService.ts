import { requireSupabase } from '../../services/supabase/client'

export type AttendanceStatus='present'|'absent'|'late'|'excused'

export interface AttendanceRosterRow{
  enrollmentId:string
  studentId:string
  fullName:string|null
  email:string|null
  attendanceId:string|null
  status:AttendanceStatus|null
  note:string
  markedAt:string|null
}

export interface StudentAttendanceRecord{
  lectureId:string
  lectureTitle:string
  subjectTitle:string
  moduleTitle:string
  scheduledAt:string|null
  status:AttendanceStatus
  note:string|null
  markedAt:string
}

type RosterRow={
  enrollment_id:string;student_id:string;full_name:string|null;email:string|null;attendance_id:string|null
  attendance_status:AttendanceStatus|null;note:string|null;marked_at:string|null
}
type StudentRow={
  lecture_id:string;lecture_title:string;subject_title:string;module_title:string;scheduled_at:string|null
  attendance_status:AttendanceStatus;note:string|null;marked_at:string
}

export async function loadAttendanceRoster(lectureId:string):Promise<AttendanceRosterRow[]>{
  const {data,error}=await requireSupabase().rpc('get_attendance_roster',{target_lecture:lectureId})
  if(error) throw error
  return ((data??[]) as RosterRow[]).map((row)=>({
    enrollmentId:row.enrollment_id,studentId:row.student_id,fullName:row.full_name,email:row.email,
    attendanceId:row.attendance_id,status:row.attendance_status,note:row.note??'',markedAt:row.marked_at,
  }))
}

export async function saveLectureAttendance(
  lectureId:string,
  rows:Array<{enrollmentId:string;status:AttendanceStatus;note:string}>,
){
  if(!rows.length) return
  const {error}=await requireSupabase().from('lecture_attendance').upsert(
    rows.map((row)=>({
      lecture_id:lectureId,enrollment_id:row.enrollmentId,status:row.status,note:row.note.trim()||null,
    })),
    {onConflict:'lecture_id,enrollment_id'},
  )
  if(error) throw error
}

export async function loadMyBatchAttendance(batchId:string):Promise<StudentAttendanceRecord[]>{
  const {data,error}=await requireSupabase().rpc('get_my_batch_attendance',{target_batch:batchId})
  if(error) throw error
  return ((data??[]) as StudentRow[]).map((row)=>({
    lectureId:row.lecture_id,lectureTitle:row.lecture_title,subjectTitle:row.subject_title,moduleTitle:row.module_title,
    scheduledAt:row.scheduled_at,status:row.attendance_status,note:row.note,markedAt:row.marked_at,
  }))
}
