import type { PropsWithChildren } from 'react'

import { Navigate } from 'react-router-dom'

import { useSessionStore } from '@/modules/auth/session-store'

export function PublicOnlyRoute({ children }: PropsWithChildren) {
  const { initialized, user } = useSessionStore()

  if (!initialized) {
    return null
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
