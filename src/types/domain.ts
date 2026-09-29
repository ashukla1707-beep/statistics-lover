export type UserRole =
  | 'student'
  | 'teacher'
  | 'content_manager'
  | 'admin'
  | 'owner'

export type LiveProvider = 'google_meet' | 'zoom' | 'custom'
export type VideoProvider = 'google_drive' | 'cloudflare_stream' | 'custom'

export interface CourseSummary {
  id: string
  title: string
  description: string
  access: 'free' | 'paid'
  status: 'draft' | 'published' | 'archived'
}
