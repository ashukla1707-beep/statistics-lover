import { requireSupabase } from '../../services/supabase/client'

export interface StudentCourseEnrollment {
  enrollmentId: string
  enrollmentStatus: 'active' | 'completed'
  enrolledAt: string
  accessEndsAt: string | null
  batch: {
    id: string
    title: string
    slug: string
    status: string
    startsOn: string | null
    endsOn: string | null
  }
  course: {
    id: string
    title: string
    slug: string
    thumbnailUrl: string | null
  }
}

type EnrollmentQueryRow = {
  id: string
  status: 'active' | 'completed'
  enrolled_at: string
  access_ends_at: string | null
  batch: {
    id: string
    title: string
    slug: string
    status: string
    starts_on: string | null
    ends_on: string | null
    course: {
      id: string
      title: string
      slug: string
      thumbnail_url: string | null
    } | null
  } | null
}

export async function loadStudentCourseEnrollments(
  studentId: string,
): Promise<StudentCourseEnrollment[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('enrollments')
    .select(`
      id,
      status,
      enrolled_at,
      access_ends_at,
      batch:batches!enrollments_batch_id_fkey (
        id,
        title,
        slug,
        status,
        starts_on,
        ends_on,
        course:courses!batches_course_id_fkey (
          id,
          title,
          slug,
          thumbnail_url
        )
      )
    `)
    .eq('student_id', studentId)
    .in('status', ['active', 'completed'])
    .order('enrolled_at', { ascending: false })

  if (error) throw error

  const rows = (data ?? []) as unknown as EnrollmentQueryRow[]

  return rows.flatMap((row) => {
    if (!row.batch?.course) return []

    return [
      {
        enrollmentId: row.id,
        enrollmentStatus: row.status,
        enrolledAt: row.enrolled_at,
        accessEndsAt: row.access_ends_at,
        batch: {
          id: row.batch.id,
          title: row.batch.title,
          slug: row.batch.slug,
          status: row.batch.status,
          startsOn: row.batch.starts_on,
          endsOn: row.batch.ends_on,
        },
        course: {
          id: row.batch.course.id,
          title: row.batch.course.title,
          slug: row.batch.course.slug,
          thumbnailUrl: row.batch.course.thumbnail_url,
        },
      },
    ]
  })
}
