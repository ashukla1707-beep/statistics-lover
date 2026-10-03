import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../../services/supabase/client'
import type { UserRole } from '../../types/domain'
import {
  loadAuthIdentity,
  signInWithPassword,
  signOutCurrentUser,
  signUpWithPassword,
} from './authService'
import type { AuthSnapshot, SignUpInput, SignUpResult } from './types'

export interface AuthContextValue extends AuthSnapshot {
  isConfigured: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (input: SignUpInput) => Promise<SignUpResult>
  signOut: () => Promise<void>
  refreshIdentity: () => Promise<void>
  hasRole: (role: UserRole) => boolean
  hasAnyRole: (roles: readonly UserRole[]) => boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)

const initialSnapshot: AuthSnapshot = {
  status: isSupabaseConfigured ? 'booting' : 'anonymous',
  session: null,
  identity: null,
  error: null,
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [snapshot, setSnapshot] = useState<AuthSnapshot>(initialSnapshot)
  const loadSequence = useRef(0)

  const hydrateSession = useCallback(async (session: Session | null) => {
    const sequence = ++loadSequence.current

    if (!session) {
      setSnapshot({
        status: 'anonymous',
        session: null,
        identity: null,
        error: null,
      })
      return
    }

    setSnapshot((current) => ({
      ...current,
      status: 'booting',
      session,
      error: null,
    }))

    try {
      const identity = await loadAuthIdentity(session.user)
      if (sequence !== loadSequence.current) return

      setSnapshot({
        status:
          identity.profile?.accountStatus === 'suspended'
            ? 'suspended'
            : 'authenticated',
        session,
        identity,
        error: null,
      })
    } catch (error) {
      if (sequence !== loadSequence.current) return

      setSnapshot({
        status: 'anonymous',
        session: null,
        identity: null,
        error: error instanceof Error ? error.message : 'Unable to load account.',
      })
    }
  }, [])

  useEffect(() => {
    if (!supabase) return

    let active = true

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return

      if (error) {
        setSnapshot({
          status: 'anonymous',
          session: null,
          identity: null,
          error: error.message,
        })
        return
      }

      void hydrateSession(data.session)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      void hydrateSession(session)
    })

    return () => {
      active = false
      loadSequence.current += 1
      data.subscription.unsubscribe()
    }
  }, [hydrateSession])

  const signIn = useCallback(
    async (email: string, password: string) => {
      setSnapshot((current) => ({ ...current, error: null }))
      const session = await signInWithPassword(email.trim(), password)
      await hydrateSession(session)
    },
    [hydrateSession],
  )

  const signUp = useCallback(
    async (input: SignUpInput): Promise<SignUpResult> => {
      setSnapshot((current) => ({ ...current, error: null }))
      const session = await signUpWithPassword({
        ...input,
        email: input.email.trim(),
        fullName: input.fullName.trim(),
        phone: input.phone?.trim() || undefined,
      })
      await hydrateSession(session)

      return {
        requiresEmailConfirmation: !session,
      }
    },
    [hydrateSession],
  )

  const signOut = useCallback(async () => {
    await signOutCurrentUser()
    await hydrateSession(null)
  }, [hydrateSession])

  const refreshIdentity = useCallback(async () => {
    if (!snapshot.session) return
    await hydrateSession(snapshot.session)
  }, [hydrateSession, snapshot.session])

  const hasRole = useCallback(
    (role: UserRole) => snapshot.identity?.roles.includes(role) ?? false,
    [snapshot.identity],
  )

  const hasAnyRole = useCallback(
    (roles: readonly UserRole[]) => roles.some(hasRole),
    [hasRole],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      ...snapshot,
      isConfigured: isSupabaseConfigured,
      signIn,
      signUp,
      signOut,
      refreshIdentity,
      hasRole,
      hasAnyRole,
    }),
    [snapshot, signIn, signUp, signOut, refreshIdentity, hasRole, hasAnyRole],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
