import { http } from '@/lib/http'

export type OperationLog = {
  id: number
  moduleName: string
  actionName: string
  targetType: string | null
  targetId: string | null
  targetName: string | null
  detail: string | null
  operatorId: number | null
  operatorUsername: string | null
  operatorDisplayName: string | null
  operatorRoles: string | null
  ipAddress: string | null
  requestMethod: string | null
  requestPath: string | null
  success: boolean
  operatedAt: string
}

export type OperationLogListResponse = {
  retentionDays: number
  items: OperationLog[]
}

export type OperationLogFilters = {
  operatorUsername?: string
  moduleName?: string
  actionName?: string
}

export async function getOperationLogs(filters: OperationLogFilters) {
  const { data } = await http.get<OperationLogListResponse>('/api/operation-logs', {
    params: filters,
  })
  return data
}
