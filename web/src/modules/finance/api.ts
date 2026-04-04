import { http } from '@/lib/http'

export type FinanceStatsQuery = {
  startDate: string
  endDate: string
}

export type FinanceStatsSummary = {
  invoiceTotal: number
  paymentTotal: number
  projectCount: number
}

export type FinanceStatsProjectRow = {
  projectId: number
  projectName: string
  customer: string
  contractNo: string
  invoiceAmount: number
  paymentAmount: number
}

export type FinanceStatsResponse = {
  summary: FinanceStatsSummary
  projects: FinanceStatsProjectRow[]
}

export async function getFinanceStats(params: FinanceStatsQuery) {
  const { data } = await http.get<FinanceStatsResponse>('/api/finance-stats', { params })
  return data
}
