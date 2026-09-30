import { requireSupabase } from '../../services/supabase/client'

export interface StudentLecture {
  id: string
  title: string
  description: string | null
  status: 'scheduled' | 'live' | 'published'
  deliveryMode: 'live' | 'recorded' | 'hybrid'
  position: number
  scheduledAt: string | null
  durationMinutes: number | null
  releaseAt: string | null
}

export interface StudentModule {
  id: string
  title: string
  description: string | null
  position: number
  lectures: StudentLecture[]
}

export interface StudentSubject {
  id: string
  title: string
  code: string | null
  description: string | null
  position: number
  modules: StudentModule[]
}

type SubjectRow = {
  id: string
  title: string
  code: string | null
  description: string | null
  position: number
}

type ModuleRow = {
  id: string
  subject_id: string
  title: string
  description: string | null
  position: number
}

type LectureRow = {
  id: string
  module_id: string
  title: string
  description: string | null
  status: StudentLecture['status']
  delivery_mode: StudentLecture['deliveryMode']
  position: number
  scheduled_at: string | null
  duration_minutes: number | null
  release_at: string | null
}

export async function loadBatchLearningContent(batchId: string): Promise<StudentSubject[]> {
  const client = requireSupabase()
  const { data: subjectData, error: subjectError } = await client
    .from('subjects')
    .select('id,title,code,description,position')
    .eq('batch_id', batchId)
    .eq('status', 'published')
    .order('position')
    .order('title')

  if (subjectError) throw subjectError
  const subjects = (subjectData ?? []) as SubjectRow[]
  if (subjects.length === 0) return []

  const subjectIds = subjects.map((subject) => subject.id)
  const { data: moduleData, error: moduleError } = await client
    .from('modules')
    .select('id,subject_id,title,description,position')
    .in('subject_id', subjectIds)
    .eq('status', 'published')
    .order('position')
    .order('title')

  if (moduleError) throw moduleError
  const modules = (moduleData ?? []) as ModuleRow[]
  const moduleIds = modules.map((module) => module.id)

  let lectures: LectureRow[] = []
  if (moduleIds.length > 0) {
    const { data: lectureData, error: lectureError } = await client
      .from('lectures')
      .select('id,module_id,title,description,status,delivery_mode,position,scheduled_at,duration_minutes,release_at')
      .in('module_id', moduleIds)
      .in('status', ['scheduled', 'live', 'published'])
      .order('position')
      .order('title')

    if (lectureError) throw lectureError
    lectures = (lectureData ?? []) as LectureRow[]
  }

  return subjects.map((subject) => ({
    id: subject.id,
    title: subject.title,
    code: subject.code,
    description: subject.description,
    position: subject.position,
    modules: modules
      .filter((module) => module.subject_id === subject.id)
      .map((module) => ({
        id: module.id,
        title: module.title,
        description: module.description,
        position: module.position,
        lectures: lectures
          .filter((lecture) => lecture.module_id === module.id)
          .map((lecture) => ({
            id: lecture.id,
            title: lecture.title,
            description: lecture.description,
            status: lecture.status,
            deliveryMode: lecture.delivery_mode,
            position: lecture.position,
            scheduledAt: lecture.scheduled_at,
            durationMinutes: lecture.duration_minutes,
            releaseAt: lecture.release_at,
          })),
      })),
  }))
}
