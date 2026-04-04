import type { ComponentProps } from 'react'

import { DatePicker } from 'antd'
import type { DatePickerProps } from 'antd'

import { antdZhCN } from '@/lib/antd-locale'

const DEFAULT_FORMAT = 'YYYY-MM-DD'
const DEFAULT_RANGE_PLACEHOLDER: [string, string] = ['开始日期', '结束日期']
const DEFAULT_SHORT_MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

const baseDatePickerLocale = antdZhCN.DatePicker ?? {
  lang: {
    placeholder: '请选择日期',
    yearPlaceholder: '请选择年份',
    quarterPlaceholder: '请选择季度',
    monthPlaceholder: '请选择月份',
    weekPlaceholder: '请选择周',
    rangePlaceholder: DEFAULT_RANGE_PLACEHOLDER,
    locale: 'zh_CN',
    shortMonths: DEFAULT_SHORT_MONTHS,
  },
  timePickerLocale: {
    placeholder: '请选择时间',
    rangePlaceholder: ['开始时间', '结束时间'] as [string, string],
  },
}

type PickerLocale = NonNullable<DatePickerProps['locale']>

const localizedPickerLocale = {
  ...baseDatePickerLocale,
  lang: {
    ...(baseDatePickerLocale.lang ?? {}),
    rangePlaceholder: DEFAULT_RANGE_PLACEHOLDER,
    shortMonths: DEFAULT_SHORT_MONTHS,
  },
} as PickerLocale

type LocalizedRangePickerProps = ComponentProps<typeof DatePicker.RangePicker>

export function LocalizedDatePicker(props: DatePickerProps) {
  return (
    <DatePicker
      locale={localizedPickerLocale}
      format={DEFAULT_FORMAT}
      inputReadOnly
      {...props}
    />
  )
}

export function LocalizedRangePicker(props: LocalizedRangePickerProps) {
  return (
    <DatePicker.RangePicker
      locale={localizedPickerLocale}
      placeholder={DEFAULT_RANGE_PLACEHOLDER}
      format={DEFAULT_FORMAT}
      inputReadOnly
      {...props}
    />
  )
}
