import type { PropsWithChildren, ReactNode } from 'react'

import { Card, Typography } from 'antd'

type PageSectionProps = PropsWithChildren<{
  title?: string
  subtitle?: string
  extra?: ReactNode
  muted?: boolean
}>

export function PageSection({ title, subtitle, extra, children, muted }: PageSectionProps) {
  return (
    <Card
      className={`page-section${muted ? ' page-section--muted' : ''}`}
      bordered={false}
      title={
        title
          ? (
              <div>
                <Typography.Text strong className="page-section__title">
                  {title}
                </Typography.Text>
                {subtitle ? (
                  <Typography.Text type="secondary" className="page-section__subtitle">
                    {subtitle}
                  </Typography.Text>
                ) : null}
              </div>
            )
          : null
      }
      extra={extra}
    >
      {children}
    </Card>
  )
}
