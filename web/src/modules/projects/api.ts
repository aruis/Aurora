import { http } from '@/lib/http'

export type ProjectSummary = {
  id: number
  name: string
  customer: string
  contractNo: string
  signingDate: string
  contractAmount: number
  responsibleDepartment?: string | null
  undertakingUnit: string
  category: string
  contractPeriod?: string | null
  paymentMethod?: string | null
  remark?: string | null
  invoicedAmount: number
  receivedAmount: number
  accrualAmount: number
  arrearsAmount: number
  paymentProgress: number
}

export type ProjectChangeRecord = {
  id: number
  summary: string
  detail: string
  operatorId: number
  operatorUsername: string
  operatorDisplayName: string
  createdAt: string
}

export type ProjectDetail = {
  project: ProjectSummary
  changes: ProjectChangeRecord[]
}

export type ProjectFormValues = {
  name: string
  customer: string
  contractNo: string
  signingDate: string
  contractAmount: number
  responsibleDepartment?: string
  undertakingUnit: string
  category: string
  contractPeriod?: string
  paymentMethod?: string
  remark?: string
}

export type ProjectFilters = {
  name?: string
  customer?: string
  contractNo?: string
  signingDateStart?: string
  signingDateEnd?: string
}

export type InvoiceRecord = {
  id: number
  projectId: number
  amount: number
  invoiceDate: string
  invoiceNo: string
}

export type PaymentRecord = {
  id: number
  projectId: number
  amount: number
  paymentDate: string
  invoiceId: number | null
  invoiceNo: string | null
}

export type InvoicePayload = {
  amount: number
  invoiceDate: string
  invoiceNo: string
}

export type PaymentPayload = {
  amount: number
  paymentDate: string
  invoiceId?: number | null
}

export type PaymentInvoiceOption = {
  invoiceId: number
  invoiceNo: string
  invoiceDate: string
  invoiceAmount: number
  paidAmount: number
  unsettledAmount: number
}

export async function getProjects(filters: ProjectFilters) {
  const { data } = await http.get<ProjectSummary[]>('/api/projects', { params: filters })
  return data
}

export async function getProject(projectId: number) {
  const { data } = await http.get<ProjectDetail>(`/api/projects/${projectId}`)
  return data
}

export async function createProject(payload: ProjectFormValues) {
  const { data } = await http.post<ProjectSummary>('/api/projects', payload)
  return data
}

export async function updateProject(projectId: number, payload: ProjectFormValues) {
  const { data } = await http.put<ProjectSummary>(`/api/projects/${projectId}`, payload)
  return data
}

export async function deleteProject(projectId: number) {
  await http.delete(`/api/projects/${projectId}`)
}

export async function getInvoices(projectId: number) {
  const { data } = await http.get<InvoiceRecord[]>(`/api/projects/${projectId}/invoices`)
  return data
}

export async function createInvoice(projectId: number, payload: InvoicePayload) {
  const { data } = await http.post<InvoiceRecord>(`/api/projects/${projectId}/invoices`, payload)
  return data
}

export async function updateInvoice(projectId: number, invoiceId: number, payload: InvoicePayload) {
  const { data } = await http.put<InvoiceRecord>(`/api/projects/${projectId}/invoices/${invoiceId}`, payload)
  return data
}

export async function deleteInvoice(projectId: number, invoiceId: number) {
  await http.delete(`/api/projects/${projectId}/invoices/${invoiceId}`)
}

export async function getPayments(projectId: number) {
  const { data } = await http.get<PaymentRecord[]>(`/api/projects/${projectId}/payments`)
  return data
}

export async function getPaymentInvoiceOptions(projectId: number, paymentId?: number) {
  const { data } = await http.get<PaymentInvoiceOption[]>(`/api/projects/${projectId}/payments/invoice-options`, {
    params: paymentId ? { paymentId } : undefined,
  })
  return data
}

export async function createPayment(projectId: number, payload: PaymentPayload) {
  const { data } = await http.post<PaymentRecord>(`/api/projects/${projectId}/payments`, payload)
  return data
}

export async function updatePayment(projectId: number, paymentId: number, payload: PaymentPayload) {
  const { data } = await http.put<PaymentRecord>(`/api/projects/${projectId}/payments/${paymentId}`, payload)
  return data
}

export async function deletePayment(projectId: number, paymentId: number) {
  await http.delete(`/api/projects/${projectId}/payments/${paymentId}`)
}
