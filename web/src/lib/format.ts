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

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return '--'
  }

  return dayjs(value).format('YYYY-MM-DD')
}
