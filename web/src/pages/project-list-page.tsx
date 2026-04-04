import { DeleteOutlined, DownloadOutlined, EditOutlined, EyeOutlined, PlusOutlined } from '@ant-design/icons'
import type { Dayjs } from 'dayjs'

import { Button, Col, Form, Input, InputNumber, Modal, Popconfirm, Row, Space, Table, Tooltip, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { LocalizedDatePicker } from '@/components/localized-date-picker'
import { PageHeader } from '@/components/page-header'
import { PageSection } from '@/components/page-section'
import { downloadCsv } from '@/lib/export'
import { applyFormErrors } from '@/lib/forms'
import { formatCurrency, formatDate } from '@/lib/format'
import { isApiError } from '@/lib/http'
import {
  createProject,
  deleteProject,
  getProjects,
  updateProject,
  type ProjectFilters,
  type ProjectFormValues,
  type ProjectSummary,
} from '@/modules/projects/api'

type SearchFormValues = ProjectFilters
type ProjectEditorValues = {
  name: string
  customer: string
  contractNo: string
  signingDate: Dayjs
  contractAmount: number
}

export function ProjectListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchForm] = Form.useForm<SearchFormValues>()
  const [editorForm] = Form.useForm<ProjectEditorValues>()
  const [messageApi, contextHolder] = message.useMessage()
  const [filters, setFilters] = useState<ProjectFilters>({})
  const [editingProject, setEditingProject] = useState<ProjectSummary | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)

  const projectsQuery = useQuery({
    queryKey: ['projects.list', filters],
    queryFn: () => getProjects(filters),
  })

  const saveMutation = useMutation({
    mutationFn: async (payload: ProjectFormValues) =>
      editingProject ? updateProject(editingProject.id, payload) : createProject(payload),
    onSuccess: async () => {
      messageApi.success(editingProject ? '项目已更新' : '项目已创建')
      setEditorOpen(false)
      setEditingProject(null)
      editorForm.resetFields()
      await queryClient.invalidateQueries({ queryKey: ['projects.list'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: async () => {
      messageApi.success('项目已删除')
      await queryClient.invalidateQueries({ queryKey: ['projects.list'] })
    },
  })

  const projects = projectsQuery.data ?? []
  const contractTotal = projects.reduce((sum, item) => sum + Number(item.contractAmount), 0)
  const invoiceTotal = projects.reduce((sum, item) => sum + Number(item.invoicedAmount), 0)
  const paymentTotal = projects.reduce((sum, item) => sum + Number(item.receivedAmount), 0)

  const columns: ColumnsType<ProjectSummary> = [
    {
      title: '项目名称',
      dataIndex: 'name',
      render: (value, record) => <Link to={`/projects/${record.id}`}>{value}</Link>,
    },
    { title: '客户', dataIndex: 'customer' },
    { title: '合同号', dataIndex: 'contractNo' },
    { title: '签约日期', dataIndex: 'signingDate', render: formatDate },
    { title: '合同金额', dataIndex: 'contractAmount', align: 'right', render: formatCurrency },
    { title: '累计开票', dataIndex: 'invoicedAmount', align: 'right', render: formatCurrency },
    { title: '累计回款', dataIndex: 'receivedAmount', align: 'right', render: formatCurrency },
    {
      title: '操作',
      key: 'actions',
      width: 156,
      render: (_, record) => (
        <Space size={6}>
          <Tooltip title="查看详情">
            <Button
              type="text"
              aria-label={`查看 ${record.name} 详情`}
              icon={<EyeOutlined />}
              onClick={() => navigate(`/projects/${record.id}`)}
            />
          </Tooltip>
          <Tooltip title="编辑项目">
            <Button
              type="text"
              aria-label={`编辑 ${record.name}`}
              icon={<EditOutlined />}
              onClick={() => {
                setEditingProject(record)
                setEditorOpen(true)
                editorForm.setFieldsValue({
                  name: record.name,
                  customer: record.customer,
                  contractNo: record.contractNo,
                  signingDate: dayjs(record.signingDate),
                  contractAmount: Number(record.contractAmount),
                })
              }}
            />
          </Tooltip>
          <Popconfirm
            title="确认删除该项目？"
            description="如该项目已有关联开票或回款，后端会拒绝删除。"
            onConfirm={async () => {
              try {
                await deleteMutation.mutateAsync(record.id)
              }
              catch (error) {
                if (isApiError(error)) {
                  messageApi.error(error.message)
                }
              }
            }}
          >
            <Tooltip title="删除项目">
              <Button
                type="text"
                danger
                aria-label={`删除 ${record.name}`}
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const exportRows = projects.map((project) => ({
    项目名称: project.name,
    客户: project.customer,
    合同号: project.contractNo,
    签约日期: formatDate(project.signingDate),
    合同金额: formatCurrency(project.contractAmount),
    累计开票: formatCurrency(project.invoicedAmount),
    累计回款: formatCurrency(project.receivedAmount),
  }))

  return (
    <div className="page-stack">
      {contextHolder}
      <PageHeader
        eyebrow="Projects"
        title="项目管理"
        description="集中维护项目基础信息、合同台账以及项目级别的开票与回款汇总。"
        extra={
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingProject(null)
              setEditorOpen(true)
              editorForm.resetFields()
            }}
          >
            新建项目
          </Button>
        }
      />

      <div className="summary-strip">
        <SummaryChip label="项目数量" value={String(projects.length)} />
        <SummaryChip label="合同总额" value={formatCurrency(contractTotal)} />
        <SummaryChip label="累计开票" value={formatCurrency(invoiceTotal)} />
        <SummaryChip label="累计回款" value={formatCurrency(paymentTotal)} />
      </div>

      <PageSection title="筛选条件" subtitle="按项目名称、客户和合同号快速定位目标记录。" muted>
        <Form<SearchFormValues> form={searchForm} layout="vertical" onFinish={(values) => setFilters(values)}>
          <Row gutter={[16, 4]}>
            <Col xs={24} md={12} xl={8}>
              <Form.Item label="项目名称" name="name">
                <Input placeholder="支持模糊搜索" allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={8}>
              <Form.Item label="客户名称" name="customer">
                <Input placeholder="输入客户名称" allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={8}>
              <Form.Item label="合同号" name="contractNo">
                <Input placeholder="输入合同号" allowClear />
              </Form.Item>
            </Col>
          </Row>
          <div className="table-toolbar">
            <Button type="primary" htmlType="submit">
              查询
            </Button>
            <Button
              onClick={() => {
                searchForm.resetFields()
                setFilters({})
              }}
            >
              重置
            </Button>
          </div>
        </Form>
      </PageSection>

      <PageSection
        title="项目列表"
        subtitle="支持直接进入详情、编辑或删除，优先保留高频操作。"
        extra={(
          <div className="table-section-extra">
            <Typography.Text type="secondary">
              当前显示 {projects.length} 条记录
            </Typography.Text>
            <Button
              icon={<DownloadOutlined />}
              onClick={() => {
                downloadCsv({
                  filename: `项目管理-${new Date().toISOString().slice(0, 10)}.csv`,
                  columns: [
                    { title: '项目名称', render: (row) => row.项目名称 },
                    { title: '客户', render: (row) => row.客户 },
                    { title: '合同号', render: (row) => row.合同号 },
                    { title: '签约日期', render: (row) => row.签约日期 },
                    { title: '合同金额', render: (row) => row.合同金额 },
                    { title: '累计开票', render: (row) => row.累计开票 },
                    { title: '累计回款', render: (row) => row.累计回款 },
                  ],
                  rows: exportRows,
                })
              }}
              disabled={exportRows.length === 0}
            >
              导出 CSV
            </Button>
          </div>
        )}
      >
        <div className="table-frame">
          <Table
            rowKey="id"
            loading={projectsQuery.isLoading}
            dataSource={projects}
            columns={columns}
            onRow={(record) => ({
              onDoubleClick: () => navigate(`/projects/${record.id}`),
            })}
            scroll={{ x: 980 }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              pageSizeOptions: [10, 20, 50, 100],
              showTotal: (total) => `共 ${total} 条`,
            }}
          />
        </div>
      </PageSection>

      <Modal
        title={editingProject ? '编辑项目' : '新建项目'}
        open={editorOpen}
        onCancel={() => {
          setEditorOpen(false)
          setEditingProject(null)
        }}
        onOk={() => editorForm.submit()}
        confirmLoading={saveMutation.isPending}
        width={680}
        destroyOnHidden
      >
        <Form<ProjectEditorValues>
          form={editorForm}
          layout="vertical"
          onFinish={async (values) => {
            try {
              await saveMutation.mutateAsync({
                ...values,
                signingDate: values.signingDate.format('YYYY-MM-DD'),
              })
            }
            catch (error) {
              if (!applyFormErrors(editorForm, error) && isApiError(error)) {
                messageApi.error(error.message)
              }
            }
          }}
        >
          <Row gutter={[16, 4]}>
            <Col xs={24} md={12}>
              <Form.Item label="项目名称" name="name" rules={[{ required: true, message: '请输入项目名称' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="客户名称" name="customer" rules={[{ required: true, message: '请输入客户名称' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="合同号" name="contractNo" rules={[{ required: true, message: '请输入合同号' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="签约日期" name="signingDate" rules={[{ required: true, message: '请选择签约日期' }]}>
                <LocalizedDatePicker
                  style={{ width: '100%' }}
                  placeholder="请选择签约日期"
                />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label="合同金额" name="contractAmount" rules={[{ required: true, message: '请输入合同金额' }]}>
                <InputNumber style={{ width: '100%' }} min={0.01} precision={2} addonBefore="¥" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}

function SummaryChip(props: { label: string; value: string }) {
  const fontSize = props.value.length > 12 ? 22 : props.value.length > 8 ? 26 : 28

  return (
    <div className="summary-chip">
      <span className="summary-chip__label">{props.label}</span>
      <Typography.Text strong className="summary-chip__value" style={{ fontSize }}>
        {props.value}
      </Typography.Text>
    </div>
  )
}
