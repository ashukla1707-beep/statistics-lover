import { requireSupabase } from '../../services/supabase/client'

export type AcademicContentStatus = 'draft' | 'published' | 'archived'
export type LectureStatus = 'draft' | 'scheduled' | 'live' | 'processing' | 'recorded' | 'published' | 'archived'
export type LectureDeliveryMode = 'live' | 'recorded' | 'hybrid'

export interface ManagedSubject {
  id: string
  batchId: string
  slug: string
  code: string | null
  title: string
  description: string | null
  status: AcademicContentStatus
  position: number
}

export interface ManagedModule {
  id: string
  subjectId: string
  slug: string
  title: string
  description: string | null
  status: AcademicContentStatus
  position: number
}

export interface ManagedLecture {
  id: string
  moduleId: string
  slug: string
  title: string
  description: string | null
  status: LectureStatus
  deliveryMode: LectureDeliveryMode
  position: number
  scheduledAt: string | null
  durationMinutes: number | null
  releaseAt: string | null
  publishedAt: string | null
}

export interface SubjectInput {
  batchId: string
  slug: string
  code?: string
  title: string
  description?: string
  status: AcademicContentStatus
  position: number
}

export interface ModuleInput {
  subjectId: string
  slug: string
  title: string
  description?: string
  status: AcademicContentStatus
  position: number
}

export interface LectureInput {
  moduleId: string
  slug: string
  title: string
  description?: string
  status: LectureStatus
  deliveryMode: LectureDeliveryMode
  position: number
  scheduledAt?: string
  durationMinutes?: number | null
  releaseAt?: string
}

type SubjectRow = {
  id: string
  batch_id: string
  slug: string
  code: string | null
  title: string
  description: string | null
  status: AcademicContentStatus
  position: number
}

type ModuleRow = {
  id: string
  subject_id: string
  slug: string
  title: string
  description: string | null
  status: AcademicContentStatus
  position: number
}

type LectureRow = {
  id: string
  module_id: string
  slug: string
  title: string
  description: string | null
  status: LectureStatus
  delivery_mode: LectureDeliveryMode
  position: number
  scheduled_at: string | null
  duration_minutes: number | null
  release_at: string | null
  published_at: string | null
}

const subjectColumns = 'id,batch_id,slug,code,title,description,status,position'
const moduleColumns = 'id,subject_id,slug,title,description,status,position'
const lectureColumns = 'id,module_id,slug,title,description,status,delivery_mode,position,scheduled_at,duration_minutes,release_at,published_at'

function nullable(value?: string) {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

function mapSubject(row: SubjectRow): ManagedSubject {
  return {
    id: row.id,
    batchId: row.batch_id,
    slug: row.slug,
    code: row.code,
    title: row.title,
    description: row.description,
    status: row.status,
    position: row.position,
  }
}

function mapModule(row: ModuleRow): ManagedModule {
  return {
    id: row.id,
    subjectId: row.subject_id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    status: row.status,
    position: row.position,
  }
}

function mapLecture(row: LectureRow): ManagedLecture {
  return {
    id: row.id,
    moduleId: row.module_id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    status: row.status,
    deliveryMode: row.delivery_mode,
    position: row.position,
    scheduledAt: row.scheduled_at,
    durationMinutes: row.duration_minutes,
    releaseAt: row.release_at,
    publishedAt: row.published_at,
  }
}

export async function listManagedSubjects(batchId: string): Promise<ManagedSubject[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('subjects')
    .select(subjectColumns)
    .eq('batch_id', batchId)
    .order('position')
    .order('title')
  if (error) throw error
  return ((data ?? []) as SubjectRow[]).map(mapSubject)
}

export async function createManagedSubject(input: SubjectInput): Promise<ManagedSubject> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('subjects')
    .insert({
      batch_id: input.batchId,
      slug: input.slug.trim(),
      code: nullable(input.code),
      title: input.title.trim(),
      description: nullable(input.description),
      status: input.status,
      position: input.position,
    })
    .select(subjectColumns)
    .single()
  if (error) throw error
  return mapSubject(data as SubjectRow)
}

export async function updateManagedSubject(subjectId: string, input: SubjectInput): Promise<ManagedSubject> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('subjects')
    .update({
      batch_id: input.batchId,
      slug: input.slug.trim(),
      code: nullable(input.code),
      title: input.title.trim(),
      description: nullable(input.description),
      status: input.status,
      position: input.position,
    })
    .eq('id', subjectId)
    .select(subjectColumns)
    .single()
  if (error) throw error
  return mapSubject(data as SubjectRow)
}

export async function deleteManagedSubject(subjectId: string) {
  const { error } = await requireSupabase().from('subjects').delete().eq('id', subjectId)
  if (error) throw error
}

export async function listManagedModules(subjectId: string): Promise<ManagedModule[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('modules')
    .select(moduleColumns)
    .eq('subject_id', subjectId)
    .order('position')
    .order('title')
  if (error) throw error
  return ((data ?? []) as ModuleRow[]).map(mapModule)
}

export async function createManagedModule(input: ModuleInput): Promise<ManagedModule> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('modules')
    .insert({
      subject_id: input.subjectId,
      slug: input.slug.trim(),
      title: input.title.trim(),
      description: nullable(input.description),
      status: input.status,
      position: input.position,
    })
    .select(moduleColumns)
    .single()
  if (error) throw error
  return mapModule(data as ModuleRow)
}

export async function updateManagedModule(moduleId: string, input: ModuleInput): Promise<ManagedModule> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('modules')
    .update({
      subject_id: input.subjectId,
      slug: input.slug.trim(),
      title: input.title.trim(),
      description: nullable(input.description),
      status: input.status,
      position: input.position,
    })
    .eq('id', moduleId)
    .select(moduleColumns)
    .single()
  if (error) throw error
  return mapModule(data as ModuleRow)
}

export async function deleteManagedModule(moduleId: string) {
  const { error } = await requireSupabase().from('modules').delete().eq('id', moduleId)
  if (error) throw error
}

export async function listManagedLectures(moduleId: string): Promise<ManagedLecture[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('lectures')
    .select(lectureColumns)
    .eq('module_id', moduleId)
    .order('position')
    .order('title')
  if (error) throw error
  return ((data ?? []) as LectureRow[]).map(mapLecture)
}

export async function createManagedLecture(input: LectureInput): Promise<ManagedLecture> {
  const client = requireSupabase()
  const publishedAt = input.status === 'published' ? new Date().toISOString() : null
  const { data, error } = await client
    .from('lectures')
    .insert({
      module_id: input.moduleId,
      slug: input.slug.trim(),
      title: input.title.trim(),
      description: nullable(input.description),
      status: input.status,
      delivery_mode: input.deliveryMode,
      position: input.position,
      scheduled_at: nullable(input.scheduledAt),
      duration_minutes: input.durationMinutes ?? null,
      release_at: nullable(input.releaseAt),
      published_at: publishedAt,
    })
    .select(lectureColumns)
    .single()
  if (error) throw error
  return mapLecture(data as LectureRow)
}

export async function updateManagedLecture(
  lectureId: string,
  input: LectureInput,
  existingPublishedAt: string | null,
): Promise<ManagedLecture> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('lectures')
    .update({
      module_id: input.moduleId,
      slug: input.slug.trim(),
      title: input.title.trim(),
      description: nullable(input.description),
      status: input.status,
      delivery_mode: input.deliveryMode,
      position: input.position,
      scheduled_at: nullable(input.scheduledAt),
      duration_minutes: input.durationMinutes ?? null,
      release_at: nullable(input.releaseAt),
      published_at: input.status === 'published' ? existingPublishedAt ?? new Date().toISOString() : null,
    })
    .eq('id', lectureId)
    .select(lectureColumns)
    .single()
  if (error) throw error
  return mapLecture(data as LectureRow)
}

export async function deleteManagedLecture(lectureId: string) {
  const { error } = await requireSupabase().from('lectures').delete().eq('id', lectureId)
  if (error) throw error
}
