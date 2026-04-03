import type { FormInstance } from 'antd'

import { isApiError } from '@/lib/http'

export function applyFormErrors(form: FormInstance, error: unknown) {
  if (!isApiError(error) || !Object.keys(error.errors).length) {
    return false
  }

  form.setFields(
    Object.entries(error.errors).map(([name, errors]) => ({
      name,
      errors: [errors],
    })),
  )
  return true
}
