import type { PropsWithChildren } from 'react'

import { Navigate, useLocation } from 'react-router-dom'

import { useSessionStore } from '@/modules/auth/session-store'

export function ProtectedRoute({ children }: PropsWithChildren) {
  const { initialized, user } = useSessionStore()
  const location = useLocation()

  if (!initialized) {
    return null
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}
