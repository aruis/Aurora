import { SearchOutlined } from '@ant-design/icons'
import { Button, Col, Form, Input, Row, Select, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { PageHeader } from '@/components/page-header'
import { PageSection } from '@/components/page-section'
import { PermissionGuard } from '@/components/permission-guard'
import { formatDateTime } from '@/lib/format'
import { buildTablePagination } from '@/lib/table'
import { getOperationLogs, type OperationLog } from '@/modules/operation-logs/api'

type FilterValues = {
  operatorUsername?: string
  moduleName?: string
  actionName?: string
}

const MODULE_OPTIONS = [
  { label: '认证', value: '认证' },
  { label: '用户管理', value: '用户管理' },
  { label: '项目管理', value: '项目管理' },
  { label: '数据字典', value: '数据字典' },
  { label: '开票管理', value: '开票管理' },
  { label: '回款管理', value: '回款管理' },
]

export function OperationLogPage() {
  const [form] = Form.useForm<FilterValues>()
  const [filters, setFilters] = useState<FilterValues>({})

  const operationLogsQuery = useQuery({
    queryKey: ['operation-logs.list', filters],
    queryFn: () => getOperationLogs(compactFilters(filters)),
  })

  const data = operationLogsQuery.data
  const logs = data?.items ?? []
  const successCount = logs.filter(item => item.success).length

  const columns: ColumnsType<OperationLog> = [
    {
      title: '操作时间',
      dataIndex: 'operatedAt',
      width: 176,
      render: (value) => formatDateTime(value),
    },
    {
      title: '操作人',
      width: 160,
      render: (_, record) => (
        <div>
          <Typography.Text strong>{record.operatorDisplayName ?? '--'}</Typography.Text>
          <div>
            <Typography.Text type="secondary">{record.operatorUsername ?? '--'}</Typography.Text>
          </div>
        </div>
      ),
    },
    {
      title: '模块 / 动作',
      width: 180,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Tag color="blue">{record.moduleName}</Tag>
          <Typography.Text>{record.actionName}</Typography.Text>
        </Space>
      ),
    },
    {
      title: '对象',
      width: 220,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Typography.Text>{record.targetType ?? '--'}</Typography.Text>
          <Typography.Text type="secondary">
            {record.targetName ?? record.targetId ?? '--'}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: '详情',
      dataIndex: 'detail',
      render: (value) => value ?? '--',
    },
    {
      title: '请求',
      width: 220,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Typography.Text>{record.requestMethod ?? '--'}</Typography.Text>
          <Typography.Text type="secondary">{record.requestPath ?? '--'}</Typography.Text>
        </Space>
      ),
    },
    {
      title: '结果',
      dataIndex: 'success',
      width: 96,
      render: (success) => <Tag color={success ? 'green' : 'red'}>{success ? '成功' : '失败'}</Tag>,
    },
    {
      title: '来源 IP',
      dataIndex: 'ipAddress',
      width: 140,
      render: (value) => value ?? '--',
    },
  ]

  return (
    <PermissionGuard roles={['ADMIN']}>
      <div className="page-stack">
        <PageHeader
          eyebrow="Admin"
          title="操作日志"
          description={`记录最近 ${data?.retentionDays ?? 30} 天的关键操作，仅管理员可查看。`}
        />

        <div className="summary-strip">
          <SummaryChip label="日志总数" value={String(logs.length)} />
          <SummaryChip label="成功操作" value={String(successCount)} />
          <SummaryChip label="失败操作" value={String(logs.length - successCount)} />
          <SummaryChip label="保留天数" value={String(data?.retentionDays ?? 30)} />
        </div>

        <PageSection
          title="筛选条件"
          subtitle="支持按操作人、模块和动作快速定位。"
          extra={(
            <div className="table-toolbar">
              <Button
                onClick={() => {
                  form.resetFields()
                  setFilters({})
                }}
              >
                重置
              </Button>
              <Button type="primary" htmlType="submit" form="operation-log-search-form" icon={<SearchOutlined />}>
                查询
              </Button>
            </div>
          )}
        >
          <Form<FilterValues>
            form={form}
            name="operation-log-search-form"
            layout="vertical"
            initialValues={{}}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !(event.target instanceof HTMLTextAreaElement)) {
                event.preventDefault()
                form.submit()
              }
            }}
            onFinish={(values) => {
              setFilters({
                operatorUsername: values.operatorUsername?.trim() || undefined,
                moduleName: values.moduleName || undefined,
                actionName: values.actionName?.trim() || undefined,
              })
            }}
          >
            <Row gutter={[16, 4]}>
              <Col xs={24} md={12} xl={8}>
                <Form.Item name="operatorUsername" label="操作人">
                  <Input allowClear placeholder="例如：admin" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12} xl={8}>
                <Form.Item name="moduleName" label="模块">
                  <Select allowClear placeholder="全部模块" options={MODULE_OPTIONS} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12} xl={8}>
                <Form.Item name="actionName" label="动作">
                  <Input allowClear placeholder="例如：登录" />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </PageSection>

        <PageSection title="日志列表" subtitle="按时间倒序展示，便于回溯最近操作。">
          <div className="table-frame">
            <Table
              rowKey="id"
              loading={operationLogsQuery.isLoading}
              dataSource={logs}
              columns={columns}
              scroll={{ x: 1500 }}
              pagination={buildTablePagination({ showSizeChanger: true, totalUnit: '条日志' })}
            />
          </div>
        </PageSection>
      </div>
    </PermissionGuard>
  )
}

function SummaryChip(props: { label: string, value: string }) {
  return (
    <div className="summary-chip">
      <span className="summary-chip__label">{props.label}</span>
      <Typography.Text strong className="summary-chip__value">
        {props.value}
      </Typography.Text>
    </div>
  )
}

function compactFilters(filters: FilterValues) {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined && value !== ''))
}
