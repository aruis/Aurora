import { http } from '@/lib/http'
import type { CurrentUser } from '@/modules/auth/session-store'

export type LoginPayload = {
  username: string
  password: string
}

type LoginResponse = {
  user: CurrentUser
}

export async function login(payload: LoginPayload) {
  const { data } = await http.post<LoginResponse>('/api/auth/login', payload)
  return data.user
}

export async function logout() {
  await http.post('/api/auth/logout')
}

export async function getCurrentUser() {
  const { data } = await http.get<CurrentUser>('/api/auth/me')
  return data
}

export type ChangePasswordPayload = {
  oldPassword: string
  newPassword: string
}

export async function changePassword(payload: ChangePasswordPayload) {
  await http.post('/api/auth/change-password', payload)
}
