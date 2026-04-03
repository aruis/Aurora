import type { PropsWithChildren, ReactNode } from 'react'

import { Card, Typography } from 'antd'

type PageSectionProps = PropsWithChildren<{
  title?: string
  extra?: ReactNode
}>

export function PageSection({ title, extra, children }: PageSectionProps) {
  return (
    <Card
      bordered={false}
      title={title ? <Typography.Text strong>{title}</Typography.Text> : null}
      extra={extra}
      styles={{ body: { padding: 24 } }}
    >
      {children}
    </Card>
  )
}
