import type { ReactNode } from 'react'
import type { UserRole } from '../../types/domain'
import { useAuth } from './useAuth'

interface RequireAuthProps {
  children: ReactNode
  roles?: readonly UserRole[]
  loadingFallback?: ReactNode
  anonymousFallback?: ReactNode
  unauthorizedFallback?: ReactNode
  suspendedFallback?: ReactNode
}

export function RequireAuth({
  children,
  roles,
  loadingFallback = null,
  anonymousFallback = null,
  unauthorizedFallback = null,
  suspendedFallback = null,
}: RequireAuthProps) {
  const { status, hasAnyRole } = useAuth()

  if (status === 'booting') return loadingFallback
  if (status === 'anonymous') return anonymousFallback
  if (status === 'suspended') return suspendedFallback

  if (roles?.length && !hasAnyRole(roles)) {
    return unauthorizedFallback
  }

  return children
}
