import dayjs from 'dayjs'

export function formatCurrency(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return '--'
  }

  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value))
}

export function formatCompactCurrency(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return {
      compact: '--',
      amount: '--',
      unit: '',
      full: '--',
    }
  }

  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return {
      compact: '--',
      amount: '--',
      unit: '',
      full: '--',
    }
  }

  const absoluteValue = Math.abs(numericValue)
  const full = formatCurrency(numericValue)

  if (absoluteValue >= 100000000) {
    const amount = new Intl.NumberFormat('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericValue / 100000000)

    return {
      compact: `${amount}亿`,
      amount,
      unit: '亿',
      full,
    }
  }

  if (absoluteValue >= 10000) {
    const amount = new Intl.NumberFormat('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericValue / 10000)

    return {
      compact: `${amount}万`,
      amount,
      unit: '万',
      full,
    }
  }

  const amount = new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericValue)

  return {
    compact: amount,
    amount,
    unit: '',
    full,
  }
}

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return '--'
  }

  return dayjs(value).format('YYYY-MM-DD')
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return '--'
  }

  return dayjs(value).format('YYYY-MM-DD HH:mm:ss')
}
