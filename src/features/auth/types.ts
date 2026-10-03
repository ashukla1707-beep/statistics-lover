import type { Session } from '@supabase/supabase-js'
import type { AccountStatus, UserRole } from '../../types/domain'

export type AuthStatus =
  | 'booting'
  | 'anonymous'
  | 'authenticated'
  | 'suspended'

export interface UserProfile {
  id: string
  fullName: string | null
  phone: string | null
  avatarUrl: string | null
  accountStatus: AccountStatus
}

export interface AuthIdentity {
  userId: string
  email: string | null
  profile: UserProfile | null
  roles: UserRole[]
}

export interface SignUpInput {
  email: string
  password: string
  fullName: string
  phone?: string
}

export interface SignUpResult {
  requiresEmailConfirmation: boolean
}

export interface AuthSnapshot {
  status: AuthStatus
  session: Session | null
  identity: AuthIdentity | null
  error: string | null
}
