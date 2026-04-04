import { ArrowRightOutlined, DollarOutlined, FundOutlined, WalletOutlined } from '@ant-design/icons'
import type { ReactNode } from 'react'

import { Button, Col, Empty, Row, Segmented, Tag, Tooltip, Typography } from 'antd'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { PageHeader } from '@/components/page-header'
import { PageSection } from '@/components/page-section'
import { formatCompactCurrency, formatCurrency } from '@/lib/format'
import { useSessionStore } from '@/modules/auth/session-store'
import { getFinanceStats, type FinanceStatsProjectRow } from '@/modules/finance/api'
import { getProjects } from '@/modules/projects/api'
import type { ProjectSummary } from '@/modules/projects/api'

type HighlightSourceKey = 'year-new' | 'recent-invoice' | 'recent-payment'

type HighlightItem = {
  projectId: number
  name: string
  subtitle: string
  stats: Array<{ label: string, value: string }>
}

const highlightSourceOptions: Array<{ label: string, value: HighlightSourceKey }> = [
  { label: '本年新增', value: 'year-new' },
  { label: '30天内开票', value: 'recent-invoice' },
  { label: '30天内回款', value: 'recent-payment' },
]

export function DashboardPage() {
  const user = useSessionStore((state) => state.user)
  const [highlightSource, setHighlightSource] = useState<HighlightSourceKey>('year-new')
  const today = dayjs()
  const yearStart = today.startOf('year').format('YYYY-MM-DD')
  const recentStart = today.subtract(29, 'day').format('YYYY-MM-DD')
  const todayLabel = today.format('YYYY-MM-DD')
  const projectsQuery = useQuery({
    queryKey: ['projects.list', {}],
    queryFn: () => getProjects({}),
  })
  const yearNewProjectsQuery = useQuery({
    queryKey: ['projects.list', { signingDateStart: yearStart }],
    queryFn: () => getProjects({ signingDateStart: yearStart }),
  })
  const recentFinanceStatsQuery = useQuery({
    queryKey: ['finance-stats', recentStart, todayLabel],
    queryFn: () => getFinanceStats({ startDate: recentStart, endDate: todayLabel }),
  })

  const projects = projectsQuery.data ?? []
  const totalContractAmount = projects.reduce((sum, item) => sum + Number(item.contractAmount), 0)
  const totalInvoiceAmount = projects.reduce((sum, item) => sum + Number(item.invoicedAmount), 0)
  const totalPaymentAmount = projects.reduce((sum, item) => sum + Number(item.receivedAmount), 0)
  const invoiceRate = totalContractAmount > 0 ? totalInvoiceAmount / totalContractAmount : 0
  const paymentRate = totalInvoiceAmount > 0 ? totalPaymentAmount / totalInvoiceAmount : 0
  const highlightData = useMemo<Record<HighlightSourceKey, {
    items: HighlightItem[]
    count: number
    subtitle: string
    emptyText: string
  }>>(() => {
    const yearNewProjects = yearNewProjectsQuery.data ?? []
    const recentFinanceProjects = recentFinanceStatsQuery.data?.projects ?? []

    return {
      'year-new': {
        items: [...yearNewProjects]
        .sort((left, right) => dayjs(right.signingDate).valueOf() - dayjs(left.signingDate).valueOf())
        .slice(0, 5)
        .map(mapYearNewProject),
        count: yearNewProjects.length,
        subtitle: '按签约日期倒序展示本年新增项目，优先关注新签项目推进情况。',
        emptyText: '本年暂无新增项目。',
      },
      'recent-invoice': {
        items: [...recentFinanceProjects]
        .filter((project) => Number(project.invoiceAmount) > 0)
        .sort((left, right) => Number(right.invoiceAmount) - Number(left.invoiceAmount))
        .slice(0, 5)
        .map((project) => mapRecentFinanceProject(project, 'invoice')),
        count: recentFinanceProjects.filter((project) => Number(project.invoiceAmount) > 0).length,
        subtitle: '聚焦近 30 天内有开票动作的项目，按区间开票金额倒序展示。',
        emptyText: '近 30 天内暂无开票项目。',
      },
      'recent-payment': {
        items: [...recentFinanceProjects]
        .filter((project) => Number(project.paymentAmount) > 0)
        .sort((left, right) => Number(right.paymentAmount) - Number(left.paymentAmount))
        .slice(0, 5)
        .map((project) => mapRecentFinanceProject(project, 'payment')),
        count: recentFinanceProjects.filter((project) => Number(project.paymentAmount) > 0).length,
        subtitle: '聚焦近 30 天内有回款动作的项目，按区间回款金额倒序展示。',
        emptyText: '近 30 天内暂无回款项目。',
      },
    }
  }, [recentFinanceStatsQuery.data?.projects, yearNewProjectsQuery.data])
  const activeHighlights = highlightData[highlightSource]
  const highlightLoading = highlightSource === 'year-new'
    ? yearNewProjectsQuery.isLoading
    : recentFinanceStatsQuery.isLoading

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
              <MetricCard title="合同总额" value={totalContractAmount} icon={<DollarOutlined />} hint="所有项目合同累计金额" money />
              <MetricCard title="累计开票" value={totalInvoiceAmount} icon={<WalletOutlined />} hint={`开票进度 ${(invoiceRate * 100).toFixed(1)}%`} money />
              <MetricCard title="累计回款" value={totalPaymentAmount} icon={<DollarOutlined />} hint={`回款转化 ${(paymentRate * 100).toFixed(1)}%`} money />
            </div>
          </div>
        </div>
      </section>

      <Row gutter={[20, 20]}>
        <Col xs={24} xl={16}>
          <PageSection
            title={(
              <div className="dashboard-highlight-heading">
                <span>项目动态</span>
                <Tag color="blue" className="dashboard-highlight-count">共 {activeHighlights.count} 个项目</Tag>
              </div>
            )}
            subtitle={activeHighlights.subtitle}
            extra={(
              <div className="dashboard-highlight-toolbar">
                <Segmented<HighlightSourceKey>
                  options={highlightSourceOptions}
                  value={highlightSource}
                  onChange={setHighlightSource}
                />
              </div>
            )}
          >
            {activeHighlights.items.length > 0 ? (
              <div className="highlight-list">
                {activeHighlights.items.map((project) => (
                  <div key={project.projectId} className="highlight-row">
                    <div className="highlight-row__meta">
                      <Typography.Text strong className="highlight-row__label">
                        {project.name}
                      </Typography.Text>
                      <Typography.Text className="highlight-row__sub">
                        {project.subtitle}
                      </Typography.Text>
                    </div>
                    {project.stats.map((stat) => (
                      <HighlightStat key={stat.label} label={stat.label} value={stat.value} />
                    ))}
                    <Button type="link" icon={<ArrowRightOutlined />}>
                      <Link to={`/projects/${project.projectId}`}>查看详情</Link>
                    </Button>
                  </div>
                ))}
              </div>
            ) : highlightLoading ? (
              <div className="table-frame" style={{ padding: 24 }}>
                <Typography.Text type="secondary">正在加载项目摘要...</Typography.Text>
              </div>
            ) : (
              <Empty description={activeHighlights.emptyText} />
            )}
          </PageSection>
        </Col>
        <Col xs={24} xl={8}>
          <div className="dashboard-side-stack">
            <PageSection title="快捷入口" subtitle="把高频操作留在手边。">
              <div className="action-list">
                <QuickLink title="进入项目台账" description="集中查看项目进度、合同金额和资金汇总。" to="/projects" />
                {user?.roles.includes('ADMIN') ? (
                  <QuickLink title="管理系统用户" description="维护账号、角色和启停状态。" to="/users" />
                ) : null}
              </div>
            </PageSection>
          </div>
        </Col>
      </Row>
    </div>
  )
}

function MetricCard(props: { title: string; value: string | number; icon: ReactNode; hint: string; money?: boolean }) {
  const compactValue = props.money ? formatCompactCurrency(props.value) : null
  const displayValue = compactValue?.amount ?? String(props.value)
  const fontSize = displayValue.length > 12 ? 24 : displayValue.length > 8 ? 28 : 32

  return (
    <div className="metric-card">
      <span className="metric-card__label">{props.title}</span>
      <div className="metric-card__row">
        <span className="metric-card__icon">{props.icon}</span>
        <div className="metric-card__content">
          {compactValue ? (
            <Tooltip title={`完整金额 ${compactValue.full}`}>
              <span className="metric-card__money" aria-label={compactValue.full}>
                <span className="metric-card__currency">¥</span>
                <Typography.Text className="metric-card__value" style={{ fontSize }}>
                  {compactValue.amount}
                </Typography.Text>
                {compactValue.unit ? <span className="metric-card__unit">{compactValue.unit}</span> : null}
              </span>
            </Tooltip>
          ) : (
            <Typography.Text className="metric-card__value" style={{ fontSize }}>
              {displayValue}
            </Typography.Text>
          )}
        </div>
      </div>
      <Typography.Text className="metric-card__hint">{props.hint}</Typography.Text>
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

function mapYearNewProject(project: ProjectSummary): HighlightItem {
  return {
    projectId: project.id,
    name: project.name,
    subtitle: `${project.customer} · ${project.contractNo} · 签约于 ${project.signingDate}`,
    stats: [
      { label: '合同额', value: formatCurrency(project.contractAmount) },
      { label: '累计开票', value: formatCurrency(project.invoicedAmount) },
      { label: '累计回款', value: formatCurrency(project.receivedAmount) },
    ],
  }
}

function mapRecentFinanceProject(project: FinanceStatsProjectRow, source: 'invoice' | 'payment'): HighlightItem {
  return {
    projectId: project.projectId,
    name: project.projectName,
    subtitle: `${project.customer} · ${project.contractNo}`,
    stats: source === 'invoice'
      ? [
          { label: '30天内开票', value: formatCurrency(project.invoiceAmount) },
          { label: '30天内回款', value: formatCurrency(project.paymentAmount) },
          { label: '资金净额', value: formatCurrency(Number(project.paymentAmount) - Number(project.invoiceAmount)) },
        ]
      : [
          { label: '30天内回款', value: formatCurrency(project.paymentAmount) },
          { label: '30天内开票', value: formatCurrency(project.invoiceAmount) },
          { label: '资金净额', value: formatCurrency(Number(project.paymentAmount) - Number(project.invoiceAmount)) },
        ],
  }
}
