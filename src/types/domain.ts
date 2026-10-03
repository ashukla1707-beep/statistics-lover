export const USER_ROLES = [
  'student',
  'teacher',
  'content_manager',
  'admin',
  'owner',
] as const

export type UserRole = (typeof USER_ROLES)[number]

export const ACCOUNT_STATUSES = ['active', 'suspended'] as const
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number]

export type LiveProvider = 'google_meet' | 'zoom' | 'custom'
export type VideoProvider = 'google_drive' | 'cloudflare_stream' | 'custom'

export interface CourseSummary {
  id: string
  title: string
  description: string
  access: 'free' | 'paid'
  status: 'draft' | 'published' | 'archived'
}
