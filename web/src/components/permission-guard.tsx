import type { PropsWithChildren } from 'react'

import { Result } from 'antd'

import { useSessionStore } from '@/modules/auth/session-store'

type PermissionGuardProps = PropsWithChildren<{
  roles: string[]
}>

export function PermissionGuard({ roles, children }: PermissionGuardProps) {
  const user = useSessionStore((state) => state.user)
  const hasPermission = user?.roles.some((role) => roles.includes(role)) ?? false

  if (!hasPermission) {
    return <Result status="403" title="无权限访问" subTitle="当前账号没有该页面访问权限。" />
  }

  return <>{children}</>
}
