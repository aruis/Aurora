import axios from 'axios'
import type { AxiosError } from 'axios'

import { clearSession } from '@/modules/auth/session-store'

export type ApiFieldErrors = Record<string, string>

export type ApiErrorPayload = {
  message: string
  errors?: ApiFieldErrors
}

export class ApiError extends Error {
  status: number
  errors: ApiFieldErrors

  constructor(status: number, payload?: ApiErrorPayload) {
    super(payload?.message ?? '系统异常，请稍后再试')
    this.name = 'ApiError'
    this.status = status
    this.errors = payload?.errors ?? {}
  }
}

export const http = axios.create({
  baseURL: '/',
  withCredentials: true,
})

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorPayload>) => {
    const apiError = new ApiError(error.response?.status ?? 500, error.response?.data)

    if (apiError.status === 401) {
      clearSession()
      if (window.location.pathname !== '/login') {
        window.location.assign('/login')
      }
    }

    return Promise.reject(apiError)
  },
)

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}
