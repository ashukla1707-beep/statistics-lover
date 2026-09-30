import type { Session, User } from '@supabase/supabase-js'
import { requireSupabase } from '../../services/supabase/client'
import {
  ACCOUNT_STATUSES,
  USER_ROLES,
  type AccountStatus,
  type UserRole,
} from '../../types/domain'
import type { AuthIdentity, SignUpInput, UserProfile } from './types'

type ProfileRow = {
  id: string
  full_name: string | null
  phone: string | null
  avatar_url: string | null
  account_status: string
}

type RoleRow = {
  role: string
}

function isUserRole(value: string): value is UserRole {
  return USER_ROLES.some((role) => role === value)
}

function isAccountStatus(value: string): value is AccountStatus {
  return ACCOUNT_STATUSES.some((status) => status === value)
}

function mapProfile(row: ProfileRow | null): UserProfile | null {
  if (!row) return null

  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    avatarUrl: row.avatar_url,
    accountStatus: isAccountStatus(row.account_status)
      ? row.account_status
      : 'suspended',
  }
}

export async function loadAuthIdentity(user: User): Promise<AuthIdentity> {
  const client = requireSupabase()

  const [profileResult, rolesResult] = await Promise.all([
    client
      .from('profiles')
      .select('id, full_name, phone, avatar_url, account_status')
      .eq('id', user.id)
      .maybeSingle(),
    client.from('user_roles').select('role').eq('user_id', user.id),
  ])

  if (profileResult.error) throw profileResult.error
  if (rolesResult.error) throw rolesResult.error

  const profileRow = profileResult.data as ProfileRow | null
  const roleRows = (rolesResult.data ?? []) as RoleRow[]
  const roles = roleRows
    .map(({ role }) => role)
    .filter(isUserRole)
  const profile = mapProfile(profileRow)

  if (!profile) {
    throw new Error('Authenticated user is missing an application profile.')
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    profile,
    roles,
  }
}

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<Session | null> {
  const client = requireSupabase()
  const { data, error } = await client.auth.signInWithPassword({ email, password })

  if (error) throw error
  return data.session
}

export async function signUpWithPassword(
  input: SignUpInput,
): Promise<Session | null> {
  const client = requireSupabase()
  const emailRedirectTo = new URL('/login', window.location.origin).toString()
  const { data, error } = await client.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo,
      data: {
        full_name: input.fullName,
        phone: input.phone ?? null,
      },
    },
  })

  if (error) throw error
  return data.session
}

export async function signOutCurrentUser(): Promise<void> {
  const client = requireSupabase()
  const { error } = await client.auth.signOut()
  if (error) throw error
}
