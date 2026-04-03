import { DatePicker } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import type { DatePickerProps } from 'antd'

const DEFAULT_FORMAT = 'YYYY-MM-DD'

export function LocalizedDatePicker(props: DatePickerProps) {
  return (
    <DatePicker
      locale={zhCN.DatePicker}
      format={DEFAULT_FORMAT}
      inputReadOnly
      {...props}
    />
  )
}
