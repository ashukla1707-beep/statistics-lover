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

export interface StudentLearningResource {
  id: string
  scope: 'batch' | 'subject' | 'module' | 'lecture'
  subjectId: string | null
  moduleId: string | null
  lectureId: string | null
  kind: 'study_material' | 'notes' | 'pyq' | 'reference'
  title: string
  description: string | null
  provider: 'google_drive' | 'external'
  actionUrl: string
  actionLabel: string
  fileName: string | null
  mimeType: string | null
  sizeBytes: number | null
  position: number
}

export interface LectureDeliveryAction {
  lectureId: string
  actionKind: 'join' | 'watch'
  provider: 'google_meet' | 'google_drive' | 'cloudflare_stream' | 'external'
  actionUrl: string
  label: string
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

type LearningResourceRow = {
  resource_id: string
  resource_scope: StudentLearningResource['scope']
  subject_id: string | null
  module_id: string | null
  lecture_id: string | null
  resource_kind: StudentLearningResource['kind']
  title: string
  description: string | null
  provider: StudentLearningResource['provider']
  action_url: string
  action_label: string
  file_name: string | null
  mime_type: string | null
  size_bytes: number | null
  resource_position: number
}

type DeliveryActionRow = {
  lecture_id: string
  action_kind: LectureDeliveryAction['actionKind']
  provider: LectureDeliveryAction['provider']
  action_url: string
  label: string
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

export async function loadBatchDeliveryActions(batchId: string): Promise<LectureDeliveryAction[]> {
  const { data, error } = await requireSupabase().rpc('get_batch_delivery_actions', {
    target_batch: batchId,
  })

  if (error) throw error

  return ((data ?? []) as DeliveryActionRow[]).map((row) => ({
    lectureId: row.lecture_id,
    actionKind: row.action_kind,
    provider: row.provider,
    actionUrl: row.action_url,
    label: row.label,
  }))
}


export async function loadBatchLearningResources(batchId: string): Promise<StudentLearningResource[]> {
  const { data, error } = await requireSupabase().rpc('get_batch_learning_resources', {
    target_batch: batchId,
  })

  if (error) throw error

  return ((data ?? []) as LearningResourceRow[]).map((row) => ({
    id: row.resource_id,
    scope: row.resource_scope,
    subjectId: row.subject_id,
    moduleId: row.module_id,
    lectureId: row.lecture_id,
    kind: row.resource_kind,
    title: row.title,
    description: row.description,
    provider: row.provider,
    actionUrl: row.action_url,
    actionLabel: row.action_label,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    position: row.resource_position,
  }))
}
