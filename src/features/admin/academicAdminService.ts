import { requireSupabase } from '../../services/supabase/client'

export type CourseStatus = 'draft' | 'published' | 'archived'
export type BatchStatus = 'draft' | 'scheduled' | 'active' | 'completed' | 'archived'

export interface ManagedCourse {
  id: string
  slug: string
  code: string | null
  title: string
  shortDescription: string | null
  description: string | null
  status: CourseStatus
  publishedAt: string | null
  updatedAt: string
}

export interface ManagedBatch {
  id: string
  courseId: string
  slug: string
  code: string | null
  title: string
  description: string | null
  status: BatchStatus
  startsOn: string | null
  endsOn: string | null
  updatedAt: string
}

export interface CourseInput {
  slug: string
  code?: string
  title: string
  shortDescription?: string
  description?: string
  status: CourseStatus
}

export interface BatchInput {
  courseId: string
  slug: string
  code?: string
  title: string
  description?: string
  status: BatchStatus
  startsOn?: string
  endsOn?: string
}

type CourseRow = {
  id: string
  slug: string
  code: string | null
  title: string
  short_description: string | null
  description: string | null
  status: CourseStatus
  published_at: string | null
  updated_at: string
}

type BatchRow = {
  id: string
  course_id: string
  slug: string
  code: string | null
  title: string
  description: string | null
  status: BatchStatus
  starts_on: string | null
  ends_on: string | null
  updated_at: string
}

const courseColumns = 'id, slug, code, title, short_description, description, status, published_at, updated_at'
const batchColumns = 'id, course_id, slug, code, title, description, status, starts_on, ends_on, updated_at'

function mapCourse(row: CourseRow): ManagedCourse {
  return {
    id: row.id,
    slug: row.slug,
    code: row.code,
    title: row.title,
    shortDescription: row.short_description,
    description: row.description,
    status: row.status,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
  }
}

function mapBatch(row: BatchRow): ManagedBatch {
  return {
    id: row.id,
    courseId: row.course_id,
    slug: row.slug,
    code: row.code,
    title: row.title,
    description: row.description,
    status: row.status,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    updatedAt: row.updated_at,
  }
}

function nullable(value?: string) {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

export async function listManagedCourses(): Promise<ManagedCourse[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('courses')
    .select(courseColumns)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return ((data ?? []) as CourseRow[]).map(mapCourse)
}

export async function createManagedCourse(input: CourseInput): Promise<ManagedCourse> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('courses')
    .insert({
      slug: input.slug.trim(),
      code: nullable(input.code),
      title: input.title.trim(),
      short_description: nullable(input.shortDescription),
      description: nullable(input.description),
      status: input.status,
      published_at: input.status === 'published' ? new Date().toISOString() : null,
    })
    .select(courseColumns)
    .single()

  if (error) throw error
  return mapCourse(data as CourseRow)
}

export async function updateManagedCourse(
  courseId: string,
  input: CourseInput,
  existingPublishedAt: string | null,
): Promise<ManagedCourse> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('courses')
    .update({
      slug: input.slug.trim(),
      code: nullable(input.code),
      title: input.title.trim(),
      short_description: nullable(input.shortDescription),
      description: nullable(input.description),
      status: input.status,
      published_at: input.status === 'published'
        ? existingPublishedAt ?? new Date().toISOString()
        : null,
    })
    .eq('id', courseId)
    .select(courseColumns)
    .single()

  if (error) throw error
  return mapCourse(data as CourseRow)
}

export async function deleteManagedCourse(courseId: string): Promise<void> {
  const client = requireSupabase()
  const { error } = await client.from('courses').delete().eq('id', courseId)
  if (error) throw error
}

export async function listManagedBatches(courseId: string): Promise<ManagedBatch[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('batches')
    .select(batchColumns)
    .eq('course_id', courseId)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return ((data ?? []) as BatchRow[]).map(mapBatch)
}

export async function createManagedBatch(input: BatchInput): Promise<ManagedBatch> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('batches')
    .insert({
      course_id: input.courseId,
      slug: input.slug.trim(),
      code: nullable(input.code),
      title: input.title.trim(),
      description: nullable(input.description),
      status: input.status,
      starts_on: nullable(input.startsOn),
      ends_on: nullable(input.endsOn),
    })
    .select(batchColumns)
    .single()

  if (error) throw error
  return mapBatch(data as BatchRow)
}

export async function updateManagedBatch(batchId: string, input: BatchInput): Promise<ManagedBatch> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('batches')
    .update({
      course_id: input.courseId,
      slug: input.slug.trim(),
      code: nullable(input.code),
      title: input.title.trim(),
      description: nullable(input.description),
      status: input.status,
      starts_on: nullable(input.startsOn),
      ends_on: nullable(input.endsOn),
    })
    .eq('id', batchId)
    .select(batchColumns)
    .single()

  if (error) throw error
  return mapBatch(data as BatchRow)
}

export async function deleteManagedBatch(batchId: string): Promise<void> {
  const client = requireSupabase()
  const { error } = await client.from('batches').delete().eq('id', batchId)
  if (error) throw error
}
