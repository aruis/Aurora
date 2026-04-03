import type { PropsWithChildren } from 'react'

import { useEffect } from 'react'

import { Spin } from 'antd'
import { useQuery } from '@tanstack/react-query'

import { getCurrentUser } from '@/modules/auth/api'
import { useSessionStore } from '@/modules/auth/session-store'

export function AuthBootstrap({ children }: PropsWithChildren) {
  const setInitialized = useSessionStore((state) => state.setInitialized)
  const setUser = useSessionStore((state) => state.setUser)
  const initialized = useSessionStore((state) => state.initialized)

  const meQuery = useQuery({
    queryKey: ['auth.me'],
    queryFn: getCurrentUser,
    retry: false,
  })

  useEffect(() => {
    if (meQuery.isSuccess) {
      setUser(meQuery.data)
      setInitialized(true)
    }
    else if (meQuery.isError) {
      setUser(null)
      setInitialized(true)
    }
  }, [meQuery.data, meQuery.isError, meQuery.isSuccess, setInitialized, setUser])

  if (!initialized && meQuery.isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <Spin size="large" />
      </div>
    )
  }

  return <>{children}</>
}
