import { requireSupabase } from '../../services/supabase/client'

export type EnrollmentStatus = 'active' | 'completed' | 'cancelled' | 'expired'

export interface ManagedStudent {
  id: string
  email: string | null
  fullName: string | null
  phone: string | null
  accountStatus: 'active' | 'suspended'
}

export interface EnrollmentCourse {
  id: string
  title: string
  status: string
}

export interface EnrollmentBatch {
  id: string
  courseId: string
  title: string
  code: string | null
  status: string
  startsOn: string | null
  endsOn: string | null
}

export interface ManagedEnrollment {
  id: string
  studentId: string
  status: EnrollmentStatus
  enrolledAt: string
  accessStartsAt: string | null
  accessEndsAt: string | null
  source: string
  batch: {
    id: string
    title: string
    code: string | null
    course: {
      id: string
      title: string
    } | null
  } | null
}

type RoleRow = { user_id: string }
type ProfileRow = {
  id: string
  email: string | null
  full_name: string | null
  phone: string | null
  account_status: 'active' | 'suspended'
}
type CourseRow = { id: string; title: string; status: string }
type BatchRow = {
  id: string
  course_id: string
  title: string
  code: string | null
  status: string
  starts_on: string | null
  ends_on: string | null
}
type EnrollmentRow = {
  id: string
  student_id: string
  status: EnrollmentStatus
  enrolled_at: string
  access_starts_at: string | null
  access_ends_at: string | null
  source: string
  batch: {
    id: string
    title: string
    code: string | null
    course: { id: string; title: string } | null
  } | null
}

export async function listStudents(): Promise<ManagedStudent[]> {
  const client = requireSupabase()
  const { data: roleData, error: roleError } = await client
    .from('user_roles')
    .select('user_id')
    .eq('role', 'student')

  if (roleError) throw roleError
  const studentIds = ((roleData ?? []) as RoleRow[]).map((row) => row.user_id)
  if (studentIds.length === 0) return []

  const { data, error } = await client
    .from('profiles')
    .select('id,email,full_name,phone,account_status')
    .in('id', studentIds)
    .order('created_at', { ascending: false })

  if (error) throw error

  return ((data ?? []) as ProfileRow[]).map((row) => ({
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    phone: row.phone,
    accountStatus: row.account_status,
  }))
}

export async function listEnrollmentCourses(): Promise<EnrollmentCourse[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('courses')
    .select('id,title,status')
    .order('title')
  if (error) throw error
  return ((data ?? []) as CourseRow[]).map((row) => ({ id: row.id, title: row.title, status: row.status }))
}

export async function listEnrollmentBatches(): Promise<EnrollmentBatch[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('batches')
    .select('id,course_id,title,code,status,starts_on,ends_on')
    .order('created_at', { ascending: false })
  if (error) throw error
  return ((data ?? []) as BatchRow[]).map((row) => ({
    id: row.id,
    courseId: row.course_id,
    title: row.title,
    code: row.code,
    status: row.status,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
  }))
}

export async function listStudentEnrollments(studentId: string): Promise<ManagedEnrollment[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('enrollments')
    .select(`
      id,
      student_id,
      status,
      enrolled_at,
      access_starts_at,
      access_ends_at,
      source,
      batch:batches!enrollments_batch_id_fkey (
        id,
        title,
        code,
        course:courses!batches_course_id_fkey (id,title)
      )
    `)
    .eq('student_id', studentId)
    .order('enrolled_at', { ascending: false })

  if (error) throw error
  return ((data ?? []) as unknown as EnrollmentRow[]).map((row) => ({
    id: row.id,
    studentId: row.student_id,
    status: row.status,
    enrolledAt: row.enrolled_at,
    accessStartsAt: row.access_starts_at,
    accessEndsAt: row.access_ends_at,
    source: row.source,
    batch: row.batch,
  }))
}

export async function createStudentEnrollment(input: {
  studentId: string
  batchId: string
  grantedBy: string
  accessStartsAt?: string | null
  accessEndsAt?: string | null
}) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('enrollments')
    .insert({
      student_id: input.studentId,
      batch_id: input.batchId,
      status: 'active',
      access_starts_at: input.accessStartsAt || null,
      access_ends_at: input.accessEndsAt || null,
      granted_by: input.grantedBy,
      source: 'manual',
    })
    .select('id')
    .single()
  if (error) throw error
  return data as { id: string }
}

export async function updateStudentEnrollment(
  enrollmentId: string,
  input: { status: EnrollmentStatus; accessEndsAt?: string | null },
) {
  const client = requireSupabase()
  const { error } = await client
    .from('enrollments')
    .update({ status: input.status, access_ends_at: input.accessEndsAt || null })
    .eq('id', enrollmentId)
  if (error) throw error
}

export async function deleteStudentEnrollment(enrollmentId: string) {
  const client = requireSupabase()
  const { error } = await client.from('enrollments').delete().eq('id', enrollmentId)
  if (error) throw error
}
