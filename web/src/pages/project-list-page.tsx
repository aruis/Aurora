import { DeleteOutlined, DownOutlined, EditOutlined, EyeOutlined, PlusOutlined, SearchOutlined, UpOutlined, DownloadOutlined } from '@ant-design/icons'
import type { Dayjs } from 'dayjs'

import { Button, Col, Form, Input, Modal, Popconfirm, Row, Select, Space, Table, Tooltip, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { CurrencyInputNumber } from '@/components/currency-input-number'
import { LocalizedDatePicker, LocalizedRangePicker } from '@/components/localized-date-picker'
import { PageHeader } from '@/components/page-header'
import { PageSection } from '@/components/page-section'
import { downloadCsv } from '@/lib/export'
import { applyFormErrors } from '@/lib/forms'
import { formatCurrency, formatDate } from '@/lib/format'
import { isApiError } from '@/lib/http'
import { buildTablePagination } from '@/lib/table'
import { getDictionaryOptions } from '@/modules/dictionaries/api'
import {
  createProject,
  deleteProject,
  getProjects,
  updateProject,
  type ProjectFilters,
  type ProjectFormValues,
  type ProjectSummary,
} from '@/modules/projects/api'

type SearchFormValues = Omit<ProjectFilters, 'signingDateStart' | 'signingDateEnd'> & {
  signingDateRange?: [Dayjs, Dayjs]
}

type ProjectEditorValues = {
  name: string
  customer: string
  contractNo: string
  signingDate: Dayjs
  contractAmount: number
  responsibleDepartment?: string
  undertakingUnit: string
  category: string
  contractPeriod?: string
  paymentMethod?: string
  remark?: string
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
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const undertakingUnitOptionsQuery = useQuery({
    queryKey: ['dictionaries.options', 'undertaking_unit'],
    queryFn: () => getDictionaryOptions('undertaking_unit'),
  })
  const categoryOptionsQuery = useQuery({
    queryKey: ['dictionaries.options', 'project_category'],
    queryFn: () => getDictionaryOptions('project_category'),
  })

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
  const undertakingUnitOptions = undertakingUnitOptionsQuery.data?.map(item => ({ label: item.label, value: item.code })) ?? []
  const categoryOptions = categoryOptionsQuery.data?.map(item => ({ label: item.label, value: item.code })) ?? []
  const contractTotal = projects.reduce((sum, item) => sum + Number(item.contractAmount), 0)
  const invoiceTotal = projects.reduce((sum, item) => sum + Number(item.invoicedAmount), 0)
  const paymentTotal = projects.reduce((sum, item) => sum + Number(item.receivedAmount), 0)
  const arrearsTotal = projects.reduce((sum, item) => sum + Number(item.arrearsAmount), 0)

  const columns: ColumnsType<ProjectSummary> = [
    {
      title: '项目名称',
      dataIndex: 'name',
      fixed: 'left',
      width: 180,
      render: (value, record) => <Link to={`/projects/${record.id}`}>{value}</Link>,
    },
    { title: '委托单位', dataIndex: 'customer', width: 160 },
    { title: '责任部门', dataIndex: 'responsibleDepartment', width: 140, render: renderOptionalText },
    { title: '承接单位', dataIndex: 'undertakingUnitLabel', width: 140 },
    { title: '类别', dataIndex: 'categoryLabel', width: 120 },
    { title: '合同号', dataIndex: 'contractNo', width: 150 },
    { title: '签订日期', dataIndex: 'signingDate', width: 120, render: formatDate },
    { title: '合同金额', dataIndex: 'contractAmount', width: 130, align: 'right', render: formatCurrency },
    { title: '累计开票', dataIndex: 'invoicedAmount', width: 130, align: 'right', render: formatCurrency },
    { title: '累计回款', dataIndex: 'receivedAmount', width: 130, align: 'right', render: formatCurrency },
    { title: '挂帐金额', dataIndex: 'accrualAmount', width: 130, align: 'right', render: formatCurrency },
    { title: '欠款金额', dataIndex: 'arrearsAmount', width: 130, align: 'right', render: formatCurrency },
    { title: '回款进度', dataIndex: 'paymentProgress', width: 120, align: 'right', render: formatPercent },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
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
                  responsibleDepartment: record.responsibleDepartment ?? undefined,
                  undertakingUnit: record.undertakingUnit,
                  category: record.category,
                  contractPeriod: record.contractPeriod ?? undefined,
                  paymentMethod: record.paymentMethod ?? undefined,
                  remark: record.remark ?? undefined,
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
              <Button type="text" danger aria-label={`删除 ${record.name}`} icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const exportRows = projects.map((project) => ({
    项目名称: project.name,
    委托单位: project.customer,
    责任部门: project.responsibleDepartment ?? '',
    承接单位: project.undertakingUnitLabel,
    类别: project.categoryLabel,
    合同号: project.contractNo,
    签订日期: formatDate(project.signingDate),
    合同工期: project.contractPeriod ?? '',
    付款方式: project.paymentMethod ?? '',
    合同金额: formatCurrency(project.contractAmount),
    累计开票: formatCurrency(project.invoicedAmount),
    累计回款: formatCurrency(project.receivedAmount),
    挂帐金额: formatCurrency(project.accrualAmount),
    欠款金额: formatCurrency(project.arrearsAmount),
    回款进度: formatPercent(project.paymentProgress),
    备注: project.remark ?? '',
  }))

  return (
    <div className="page-stack">
      {contextHolder}
      <PageHeader
        eyebrow="Projects"
        title={(
          <span className="page-title-with-meta">
            <span>项目管理</span>
            <span className="page-title-with-meta__count">共 {projects.length} 个</span>
          </span>
        )}
        description="集中维护合同执行台账，让项目基础信息、资金状态和关键备注保持在同一工作面板里。"
        extra={(
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
        )}
      />

      <div className="summary-strip">
        <SummaryChip label="合同总额" value={formatCurrency(contractTotal)} />
        <SummaryChip label="累计开票" value={formatCurrency(invoiceTotal)} />
        <SummaryChip label="累计回款" value={formatCurrency(paymentTotal)} />
        <SummaryChip label="欠款总额" value={formatCurrency(arrearsTotal)} />
      </div>

      <PageSection
        title="筛选条件"
        subtitle="先用常用条件快速缩小范围，需要时再展开更多筛选。"
        muted
        extra={(
          <div className="table-toolbar">
            <Button
              type="text"
              icon={advancedOpen ? <UpOutlined /> : <DownOutlined />}
              onClick={() => setAdvancedOpen((value) => !value)}
            >
              {advancedOpen ? '收起更多筛选' : '更多筛选'}
            </Button>
            <Button
              onClick={() => {
                searchForm.resetFields()
                setFilters({})
              }}
            >
              重置
            </Button>
            <Button type="primary" htmlType="submit" form="project-search-form" icon={<SearchOutlined />}>
              查询
            </Button>
          </div>
        )}
      >
        <Form<SearchFormValues>
          form={searchForm}
          name="project-search-form"
          layout="vertical"
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !(event.target instanceof HTMLTextAreaElement)) {
              event.preventDefault()
              searchForm.submit()
            }
          }}
          onFinish={(values) => {
            setFilters({
              name: values.name?.trim() || undefined,
              customer: values.customer?.trim() || undefined,
              responsibleDepartment: values.responsibleDepartment?.trim() || undefined,
              undertakingUnit: values.undertakingUnit || undefined,
              category: values.category || undefined,
              contractNo: values.contractNo?.trim() || undefined,
              paymentMethod: values.paymentMethod?.trim() || undefined,
              remark: values.remark?.trim() || undefined,
              signingDateStart: values.signingDateRange?.[0]?.format('YYYY-MM-DD'),
              signingDateEnd: values.signingDateRange?.[1]?.format('YYYY-MM-DD'),
            })
          }}
        >
          <Row gutter={[16, 4]}>
            <Col xs={24} md={12} xl={8}>
              <Form.Item label="项目名称" name="name">
                <Input placeholder="支持模糊搜索" allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={8}>
              <Form.Item label="委托单位" name="customer">
                <Input placeholder="输入委托单位" allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={8}>
              <Form.Item label="承接单位" name="undertakingUnit">
                <Select options={undertakingUnitOptions} allowClear placeholder="选择承接单位" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={8}>
              <Form.Item label="类别" name="category">
                <Select options={categoryOptions} allowClear placeholder="选择类别" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={8}>
              <Form.Item label="合同号" name="contractNo">
                <Input placeholder="输入合同号" allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={8}>
              <Form.Item label="签订日期" name="signingDateRange">
                <LocalizedRangePicker style={{ width: '100%' }} allowClear />
              </Form.Item>
            </Col>
          </Row>
          {advancedOpen ? (
            <Row gutter={[16, 4]}>
              <Col xs={24} md={12} xl={8}>
                <Form.Item label="责任部门" name="responsibleDepartment">
                  <Input placeholder="输入责任部门" allowClear />
                </Form.Item>
              </Col>
              <Col xs={24} md={12} xl={8}>
                <Form.Item label="付款方式" name="paymentMethod">
                  <Input placeholder="输入付款方式" allowClear />
                </Form.Item>
              </Col>
              <Col xs={24} md={12} xl={8}>
                <Form.Item label="备注关键词" name="remark">
                  <Input placeholder="支持按备注内容模糊搜索" allowClear />
                </Form.Item>
              </Col>
            </Row>
          ) : null}
        </Form>
      </PageSection>

      <PageSection
        title="项目列表"
        subtitle="重点展示更接近真实台账的字段，双击即可进入详情页继续处理。"
        extra={(
          <div className="table-section-extra">
            <Typography.Text type="secondary">当前显示 {projects.length} 条记录</Typography.Text>
            <Button
              icon={<DownloadOutlined />}
              onClick={() => {
                downloadCsv({
                  filename: `项目管理-${new Date().toISOString().slice(0, 10)}.csv`,
                  columns: Object.keys(exportRows[0] ?? { 项目名称: '' }).map((title) => ({
                    title,
                    render: (row: Record<string, string>) => row[title],
                  })),
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
            scroll={{ x: 1800 }}
            pagination={buildTablePagination()}
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
        width={860}
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
                responsibleDepartment: values.responsibleDepartment?.trim(),
                contractPeriod: values.contractPeriod?.trim(),
                paymentMethod: values.paymentMethod?.trim(),
                remark: values.remark?.trim(),
                customer: values.customer.trim(),
                contractNo: values.contractNo.trim(),
                name: values.name.trim(),
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
              <Form.Item label="委托单位" name="customer" rules={[{ required: true, message: '请输入委托单位' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="责任部门" name="responsibleDepartment">
                <Input placeholder="可选填" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="承接单位" name="undertakingUnit" rules={[{ required: true, message: '请选择承接单位' }]}>
                <Select options={undertakingUnitOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="类别" name="category" rules={[{ required: true, message: '请选择类别' }]}>
                <Select options={categoryOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="合同号" name="contractNo" rules={[{ required: true, message: '请输入合同号' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="签订日期" name="signingDate" rules={[{ required: true, message: '请选择签订日期' }]}>
                <LocalizedDatePicker style={{ width: '100%' }} placeholder="请选择签订日期" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="合同金额" name="contractAmount" rules={[{ required: true, message: '请输入合同金额' }]}>
                <CurrencyInputNumber />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="合同工期" name="contractPeriod">
                <Input placeholder="例如：12个月 / 90天" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="付款方式" name="paymentMethod">
                <Input placeholder="例如：验收后一次性付款" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label="备注" name="remark">
                <Input.TextArea rows={4} placeholder="补充录入关键信息" />
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

function formatPercent(value: number | string | null | undefined) {
  const resolved = Number(value ?? 0)
  return `${(resolved * 100).toFixed(1)}%`
}

function renderOptionalText(value?: string | null) {
  return value || '--'
}
