import type { PropsWithChildren, ReactNode } from 'react'

import { Space, Typography } from 'antd'

type PageHeaderProps = PropsWithChildren<{
  title: string
  description?: string
  extra?: ReactNode
}>

export function PageHeader({ title, description, extra, children }: PageHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 24,
        marginBottom: 24,
      }}
    >
      <Space direction="vertical" size={6}>
        <Typography.Title level={2} style={{ margin: 0, fontSize: 28 }}>
          {title}
        </Typography.Title>
        {description ? (
          <Typography.Text type="secondary" style={{ maxWidth: 720 }}>
            {description}
          </Typography.Text>
        ) : null}
        {children}
      </Space>
      {extra}
    </div>
  )
}
