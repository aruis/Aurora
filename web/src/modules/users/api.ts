import { http } from '@/lib/http'

export type RoleCode = 'ADMIN' | 'PROJECT_MANAGER' | 'FINANCE'

export type User = {
  id: number
  username: string
  displayName: string
  enabled: boolean
  roles: RoleCode[]
}

export type UserCreatePayload = {
  username: string
  password: string
  displayName: string
  enabled: boolean
  roles: RoleCode[]
}

export type UserUpdatePayload = {
  displayName: string
  enabled: boolean
  roles: RoleCode[]
}

export type ResetPasswordPayload = {
  newPassword: string
}

export const ROLE_OPTIONS: { label: string; value: RoleCode }[] = [
  { label: '管理员', value: 'ADMIN' },
  { label: '项目管理', value: 'PROJECT_MANAGER' },
  { label: '财务', value: 'FINANCE' },
]

export async function getUsers() {
  const { data } = await http.get<User[]>('/api/users')
  return data
}

export async function createUser(payload: UserCreatePayload) {
  const { data } = await http.post<User>('/api/users', payload)
  return data
}

export async function updateUser(userId: number, payload: UserUpdatePayload) {
  const { data } = await http.put<User>(`/api/users/${userId}`, payload)
  return data
}

export async function enableUser(userId: number) {
  const { data } = await http.post<User>(`/api/users/${userId}/enable`)
  return data
}

export async function disableUser(userId: number) {
  const { data } = await http.post<User>(`/api/users/${userId}/disable`)
  return data
}

export async function resetPassword(userId: number, payload: ResetPasswordPayload) {
  await http.post(`/api/users/${userId}/reset-password`, payload)
}
