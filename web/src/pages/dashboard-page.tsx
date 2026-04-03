import { ArrowRightOutlined, DollarOutlined, FundOutlined, WalletOutlined } from '@ant-design/icons'
import { Button, Card, Col, List, Row, Space, Statistic, Tag, Typography } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

import { PageHeader } from '@/components/page-header'
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

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <PageHeader
        title="仪表盘"
        description="概览当前业务数据与常用入口，保持项目、资金和协作状态一目了然。"
      />

      <Card bordered={false}>
        <Row gutter={[20, 20]}>
          <Col xs={24} md={12}>
            <Space direction="vertical" size={8}>
              <Tag color="blue" bordered={false}>
                今日工作台
              </Tag>
              <Typography.Title level={3} style={{ margin: 0 }}>
                你好，{user?.displayName}
              </Typography.Title>
              <Typography.Text type="secondary">
                当前系统围绕项目台账、开票和回款展开，首页提供轻量摘要与快捷入口，避免把精力浪费在无效跳转上。
              </Typography.Text>
            </Space>
          </Col>
          <Col xs={24} md={12}>
            <Row gutter={[16, 16]}>
              {[
                { title: '项目总数', value: projects.length, prefix: <FundOutlined /> },
                { title: '合同总额', value: formatCurrency(totalContractAmount), prefix: <DollarOutlined /> },
                { title: '累计开票', value: formatCurrency(totalInvoiceAmount), prefix: <WalletOutlined /> },
                { title: '累计回款', value: formatCurrency(totalPaymentAmount), prefix: <DollarOutlined /> },
              ].map((stat) => (
                <Col span={12} key={stat.title}>
                  <Card size="small" bordered={false} style={{ background: '#f4f7fb' }}>
                    <Statistic title={stat.title} value={stat.value} prefix={stat.prefix} />
                  </Card>
                </Col>
              ))}
            </Row>
          </Col>
        </Row>
      </Card>

      <Row gutter={[20, 20]}>
        <Col xs={24} xl={15}>
          <Card bordered={false} title="重点项目">
            <List
              dataSource={projects.slice(0, 5)}
              locale={{ emptyText: '暂无项目数据' }}
              renderItem={(project) => (
                <List.Item
                  actions={[
                    <Button key="view" type="link">
                      <Link to={`/projects/${project.id}`}>查看详情</Link>
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={project.name}
                    description={`${project.customer} · ${project.contractNo}`}
                  />
                  <Space size={24}>
                    <Statistic title="合同额" value={formatCurrency(project.contractAmount)} valueStyle={{ fontSize: 16 }} />
                    <Statistic title="已开票" value={formatCurrency(project.invoicedAmount)} valueStyle={{ fontSize: 16 }} />
                    <Statistic title="已回款" value={formatCurrency(project.receivedAmount)} valueStyle={{ fontSize: 16 }} />
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} xl={9}>
          <Card bordered={false} title="快捷入口">
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <LinkCard title="进入项目台账" description="快速查看项目进度、合同金额和资金汇总。" to="/projects" />
              {user?.roles.includes('ADMIN') ? (
                <LinkCard title="管理系统用户" description="维护账号、角色和账号状态。" to="/users" />
              ) : null}
            </Space>
          </Card>
        </Col>
      </Row>
    </Space>
  )
}

function LinkCard(props: { title: string; description: string; to: string }) {
  return (
    <Link to={props.to}>
      <Card
        size="small"
        style={{ background: '#f7f9fd' }}
        styles={{ body: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }}
      >
        <Space direction="vertical" size={4}>
          <Typography.Text strong>{props.title}</Typography.Text>
          <Typography.Text type="secondary">{props.description}</Typography.Text>
        </Space>
        <ArrowRightOutlined style={{ color: '#1d3d70' }} />
      </Card>
    </Link>
  )
}
