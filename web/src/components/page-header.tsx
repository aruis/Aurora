import type { PropsWithChildren, ReactNode } from 'react'

import { Space, Typography } from 'antd'

type PageHeaderProps = PropsWithChildren<{
  title: ReactNode
  description?: string
  extra?: ReactNode
  eyebrow?: string
}>

export function PageHeader({ title, description, extra, children, eyebrow }: PageHeaderProps) {
  return (
    <div className="page-header">
      <Space direction="vertical" size={6} className="page-header__content">
        {eyebrow ? <span className="page-header__eyebrow">{eyebrow}</span> : null}
        <Typography.Title level={2} className="page-header__title">
          {title}
        </Typography.Title>
        {description ? (
          <Typography.Text type="secondary" className="page-header__description">
            {description}
          </Typography.Text>
        ) : null}
        {children}
      </Space>
      {extra ? <div className="page-header__extra">{extra}</div> : null}
    </div>
  )
}
