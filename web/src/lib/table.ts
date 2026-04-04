import type { TableProps } from 'antd'

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

type PaginationConfig = NonNullable<TableProps<object>['pagination']>

export function buildTablePagination(options?: {
  pageSize?: number
  showSizeChanger?: boolean
  pageSizeOptions?: number[]
  totalUnit?: string
}): PaginationConfig {
  const {
    pageSize = 10,
    showSizeChanger = true,
    pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
    totalUnit = '条',
  } = options ?? {}

  return {
    pageSize,
    showSizeChanger,
    pageSizeOptions,
    showTotal: (total) => `共 ${total} ${totalUnit}`,
  }
}
