import { ArrowRightOutlined, DollarOutlined, FundOutlined, WalletOutlined } from '@ant-design/icons'
import type { ReactNode } from 'react'

import { Button, Col, Empty, Row, Space, Tag, Typography } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

import { PageHeader } from '@/components/page-header'
import { PageSection } from '@/components/page-section'
import { formatCurrency } from '@/lib/format'
import { useSessionStore } from '@/modules/auth/session-store'
import { getProjects } from '@/modules/projects/api'

export function DashboardPage() {
  const user = useSessionStore((state) => state.user)
  const projectsQuery = useQuery({
    queryKey: ['projects.list', {}],
    queryFn: () => getProjects({}),
  })

  const projects = projectsQuery.data ?? []
  const totalContractAmount = projects.reduce((sum, item) => sum + Number(item.contractAmount), 0)
  const totalInvoiceAmount = projects.reduce((sum, item) => sum + Number(item.invoicedAmount), 0)
  const totalPaymentAmount = projects.reduce((sum, item) => sum + Number(item.receivedAmount), 0)
  const invoiceRate = totalContractAmount > 0 ? totalInvoiceAmount / totalContractAmount : 0
  const paymentRate = totalInvoiceAmount > 0 ? totalPaymentAmount / totalInvoiceAmount : 0

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Workspace"
        title="仪表盘"
        description="把项目、合同、开票和回款放在同一视图里，先看到重点，再进入明细处理。"
      />

      <section className="hero-panel">
        <div className="hero-panel__layout">
          <div>
            <span className="hero-panel__eyebrow">今日工作台</span>
            <Typography.Title level={1} className="hero-panel__title">
              你好，{user?.displayName ?? '同事'}
            </Typography.Title>
            <Typography.Text className="hero-panel__description">
              当前工作区围绕业务台账展开。你可以先用摘要判断项目资金状态，再从重点项目和快捷入口进入下一步动作。
            </Typography.Text>
            <div className="hero-panel__actions">
              <Button type="primary" size="large">
                <Link to="/projects">查看项目台账</Link>
              </Button>
              {user?.roles.includes('ADMIN') ? (
                <Button size="large">
                  <Link to="/users">进入用户管理</Link>
                </Button>
              ) : null}
            </div>
          </div>
          <div className="hero-panel__aside">
            <div className="metric-grid">
              <MetricCard title="项目总数" value={String(projects.length)} icon={<FundOutlined />} hint="当前纳入台账的项目数量" />
              <MetricCard title="合同总额" value={formatCurrency(totalContractAmount)} icon={<DollarOutlined />} hint="所有项目合同累计金额" />
              <MetricCard title="累计开票" value={formatCurrency(totalInvoiceAmount)} icon={<WalletOutlined />} hint={`开票进度 ${(invoiceRate * 100).toFixed(1)}%`} />
              <MetricCard title="累计回款" value={formatCurrency(totalPaymentAmount)} icon={<DollarOutlined />} hint={`回款转化 ${(paymentRate * 100).toFixed(1)}%`} />
            </div>
          </div>
        </div>
      </section>

      <Row gutter={[20, 20]}>
        <Col xs={24} xl={16}>
          <PageSection
            title="重点项目"
            subtitle="优先查看最新项目和资金推进情况，减少反复跳转。"
            extra={projects.length > 0 ? <Tag color="blue">共 {projects.length} 个项目</Tag> : null}
          >
            {projects.length > 0 ? (
              <div className="highlight-list">
                {projects.slice(0, 5).map((project) => (
                  <div key={project.id} className="highlight-row">
                    <div className="highlight-row__meta">
                      <Typography.Text strong className="highlight-row__label">
                        {project.name}
                      </Typography.Text>
                      <Typography.Text className="highlight-row__sub">
                        {project.customer} · {project.contractNo}
                      </Typography.Text>
                    </div>
                    <HighlightStat label="合同额" value={formatCurrency(project.contractAmount)} />
                    <HighlightStat label="已开票" value={formatCurrency(project.invoicedAmount)} />
                    <HighlightStat label="已回款" value={formatCurrency(project.receivedAmount)} />
                    <Button type="link" icon={<ArrowRightOutlined />}>
                      <Link to={`/projects/${project.id}`}>查看详情</Link>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <Empty description="暂无项目数据，创建项目后会在这里显示摘要。" />
            )}
          </PageSection>
        </Col>
        <Col xs={24} xl={8}>
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            <PageSection title="工作提示" subtitle="先从关键比率判断风险，再进入具体操作。">
              <div className="action-list">
                <ActionCard
                  title="合同执行"
                  description={`已开票占合同额 ${(invoiceRate * 100).toFixed(1)}%，适合优先检查低开票项目。`}
                />
                <ActionCard
                  title="资金回收"
                  description={`已回款占开票额 ${(paymentRate * 100).toFixed(1)}%，便于快速识别待回款项目。`}
                />
              </div>
            </PageSection>

            <PageSection title="快捷入口" subtitle="把高频操作留在手边。">
              <div className="action-list">
                <QuickLink title="进入项目台账" description="集中查看项目进度、合同金额和资金汇总。" to="/projects" />
                {user?.roles.includes('ADMIN') ? (
                  <QuickLink title="管理系统用户" description="维护账号、角色和启停状态。" to="/users" />
                ) : null}
              </div>
            </PageSection>
          </Space>
        </Col>
      </Row>
    </div>
  )
}

function MetricCard(props: { title: string; value: string; icon: ReactNode; hint: string }) {
  const fontSize = props.value.length > 12 ? 22 : props.value.length > 8 ? 26 : 30

  return (
    <div className="metric-card">
      <span className="metric-card__label">{props.title}</span>
      <div className="metric-card__row">
        <span className="metric-card__icon">{props.icon}</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <Typography.Text className="metric-card__value" style={{ fontSize }}>
            {props.value}
          </Typography.Text>
          <Typography.Text className="metric-card__hint">{props.hint}</Typography.Text>
        </div>
      </div>
    </div>
  )
}

function HighlightStat(props: { label: string; value: string }) {
  return (
    <div className="highlight-row__stat">
      <span className="highlight-row__stat-label">{props.label}</span>
      <Typography.Text strong className="highlight-row__stat-value">
        {props.value}
      </Typography.Text>
    </div>
  )
}

function ActionCard(props: { title: string; description: string }) {
  return (
    <div className="action-card">
      <div>
        <Typography.Text strong>{props.title}</Typography.Text>
        <Typography.Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
          {props.description}
        </Typography.Text>
      </div>
    </div>
  )
}

function QuickLink(props: { title: string; description: string; to: string }) {
  return (
    <Link to={props.to}>
      <div className="action-card">
        <div>
          <Typography.Text strong>{props.title}</Typography.Text>
          <Typography.Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
            {props.description}
          </Typography.Text>
        </div>
        <ArrowRightOutlined style={{ color: '#1d4b8f', fontSize: 18 }} />
      </div>
    </Link>
  )
}
