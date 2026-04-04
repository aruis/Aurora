import { InputNumber } from 'antd'
import type { ComponentProps } from 'react'

type CurrencyInputNumberProps = ComponentProps<typeof InputNumber<number>>

export function CurrencyInputNumber(props: CurrencyInputNumberProps) {
  return (
    <InputNumber<number>
      style={{ width: '100%' }}
      min={0.01}
      precision={2}
      addonBefore="¥"
      {...props}
    />
  )
}
