import { describe, expect, it } from 'vitest'

import { formatCurrency, formatDate } from '@/lib/format'

describe('format utilities', () => {
  it('formats currency into CNY output', () => {
    expect(formatCurrency(12345.6)).toContain('12,345.60')
  })

  it('formats date string consistently', () => {
    expect(formatDate('2026-04-03')).toBe('2026-04-03')
  })
})
