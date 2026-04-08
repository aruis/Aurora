import { DeleteOutlined, EditOutlined, HistoryOutlined, PlusOutlined } from '@ant-design/icons'
import type { Dayjs } from 'dayjs'

import {
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { CurrencyInputNumber } from '@/components/currency-input-number'
import { LocalizedDatePicker } from '@/components/localized-date-picker'
import { PageHeader } from '@/components/page-header'
import { PageSection } from '@/components/page-section'
import { applyFormErrors } from '@/lib/forms'
import { formatCurrency, formatDate } from '@/lib/format'
import { isApiError } from '@/lib/http'
import { getDictionaryOptions } from '@/modules/dictionaries/api'
import {
  createInvoice,
  createPayment,
  deleteInvoice,
  deletePayment,
  getInvoices,
  getPaymentInvoiceOptions,
  getPayments,
  getProject,
  updateProject,
  updateInvoice,
  updatePayment,
  type InvoicePayload,
  type InvoiceRecord,
  type PaymentInvoiceOption,
  type PaymentPayload,
  type PaymentRecord,
  type ProjectFormValues,
} from '@/modules/projects/api'

type InvoiceFormValues = {
  amount: number
  invoiceDate: Dayjs
  invoiceNo: string
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

type PaymentFormValues = {
  amount: number
  paymentDate: Dayjs
  invoiceId?: number
}

function compareDateValue(left: string, right: string) {
  return dayjs(left).valueOf() - dayjs(right).valueOf()
}

export function ProjectDetailPage() {
  const { projectId } = useParams()
  const resolvedProjectId = Number(projectId)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [messageApi, contextHolder] = message.useMessage()
  const [projectForm] = Form.useForm<ProjectEditorValues>()
  const [invoiceForm] = Form.useForm<InvoiceFormValues>()
  const [paymentForm] = Form.useForm<PaymentFormValues>()
  const [projectEditorOpen, setProjectEditorOpen] = useState(false)
  const [invoiceOpen, setInvoiceOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<InvoiceRecord | null>(null)
  const [editingPayment, setEditingPayment] = useState<PaymentRecord | null>(null)
  const undertakingUnitOptionsQuery = useQuery({
    queryKey: ['dictionaries.options', 'undertaking_unit'],
    queryFn: () => getDictionaryOptions('undertaking_unit'),
  })
  const categoryOptionsQuery = useQuery({
    queryKey: ['dictionaries.options', 'project_category'],
    queryFn: () => getDictionaryOptions('project_category'),
  })

  const projectQuery = useQuery({
    queryKey: ['projects.detail', resolvedProjectId],
    queryFn: () => getProject(resolvedProjectId),
    enabled: Number.isFinite(resolvedProjectId),
  })
  const invoicesQuery = useQuery({
    queryKey: ['projects.invoices', resolvedProjectId],
    queryFn: () => getInvoices(resolvedProjectId),
    enabled: Number.isFinite(resolvedProjectId),
  })
  const paymentsQuery = useQuery({
    queryKey: ['projects.payments', resolvedProjectId],
    queryFn: () => getPayments(resolvedProjectId),
    enabled: Number.isFinite(resolvedProjectId),
  })
  const paymentInvoiceOptionsQuery = useQuery({
    queryKey: ['projects.payment-invoice-options', resolvedProjectId, editingPayment?.id ?? 'new'],
    queryFn: () => getPaymentInvoiceOptions(resolvedProjectId, editingPayment?.id ?? undefined),
    enabled: Number.isFinite(resolvedProjectId) && paymentOpen,
  })

  const refreshProjectRelated = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['projects.detail', resolvedProjectId] }),
      queryClient.invalidateQueries({ queryKey: ['projects.list'] }),
      queryClient.invalidateQueries({ queryKey: ['projects.invoices', resolvedProjectId] }),
      queryClient.invalidateQueries({ queryKey: ['projects.payments', resolvedProjectId] }),
      queryClient.invalidateQueries({ queryKey: ['projects.payment-invoice-options', resolvedProjectId] }),
    ])
  }

  const invoiceMutation = useMutation({
    mutationFn: async (payload: InvoicePayload) =>
      editingInvoice
        ? updateInvoice(resolvedProjectId, editingInvoice.id, payload)
        : createInvoice(resolvedProjectId, payload),
    onSuccess: async () => {
      messageApi.success(editingInvoice ? '开票记录已更新' : '开票记录已创建')
      setInvoiceOpen(false)
      setEditingInvoice(null)
      invoiceForm.resetFields()
      await refreshProjectRelated()
    },
  })
  const projectMutation = useMutation({
    mutationFn: async (payload: ProjectFormValues) => updateProject(resolvedProjectId, payload),
    onSuccess: async () => {
      messageApi.success('项目已更新')
      setProjectEditorOpen(false)
      await refreshProjectRelated()
    },
  })
  const paymentMutation = useMutation({
    mutationFn: async (payload: PaymentPayload) =>
      editingPayment
        ? updatePayment(resolvedProjectId, editingPayment.id, payload)
        : createPayment(resolvedProjectId, payload),
    onSuccess: async () => {
      messageApi.success(editingPayment ? '回款记录已更新' : '回款记录已创建')
      setPaymentOpen(false)
      setEditingPayment(null)
      paymentForm.resetFields()
      await refreshProjectRelated()
    },
  })

  const invoiceColumns: ColumnsType<InvoiceRecord> = [
    {
      title: '开票日期',
      dataIndex: 'invoiceDate',
      render: formatDate,
      sorter: (a, b) => compareDateValue(a.invoiceDate, b.invoiceDate),
      defaultSortOrder: 'ascend',
    },
    { title: '发票号', dataIndex: 'invoiceNo' },
    { title: '开票金额', dataIndex: 'amount', align: 'right', render: formatCurrency },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space size={0}>
          <Button
            type="link"
            onClick={() => {
              setEditingInvoice(record)
              setInvoiceOpen(true)
              invoiceForm.setFieldsValue({
                amount: Number(record.amount),
                invoiceDate: dayjs(record.invoiceDate),
                invoiceNo: record.invoiceNo,
              })
            }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除开票记录？"
            onConfirm={async () => {
              try {
                await deleteInvoice(resolvedProjectId, record.id)
                await refreshProjectRelated()
                messageApi.success('开票记录已删除')
              }
              catch (error) {
                if (isApiError(error)) {
                  messageApi.error(error.message)
                }
              }
            }}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const paymentColumns: ColumnsType<PaymentRecord> = [
    {
      title: '回款日期',
      dataIndex: 'paymentDate',
      render: formatDate,
      sorter: (a, b) => compareDateValue(a.paymentDate, b.paymentDate),
      defaultSortOrder: 'ascend',
    },
    { title: '发票号', dataIndex: 'invoiceNo', render: renderOptionalText },
    { title: '回款金额', dataIndex: 'amount', align: 'right', render: formatCurrency },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space size={0}>
          <Button
            type="link"
            onClick={() => {
              setEditingPayment(record)
              setPaymentOpen(true)
              paymentForm.setFieldsValue({
                amount: Number(record.amount),
                paymentDate: dayjs(record.paymentDate),
                invoiceId: record.invoiceId ?? undefined,
              })
            }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除回款记录？"
            onConfirm={async () => {
              try {
                await deletePayment(resolvedProjectId, record.id)
                await refreshProjectRelated()
                messageApi.success('回款记录已删除')
              }
              catch (error) {
                if (isApiError(error)) {
                  messageApi.error(error.message)
                }
              }
            }}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  if (projectQuery.isError || !Number.isFinite(resolvedProjectId)) {
    return (
      <Card bordered={false}>
        <Empty description="项目不存在或无法访问">
          <Button onClick={() => navigate('/projects')}>返回项目列表</Button>
        </Empty>
      </Card>
    )
  }

  const project = projectQuery.data
  const projectInfo = project?.project
  const paymentInvoiceOptions = paymentInvoiceOptionsQuery.data ?? []
  const undertakingUnitOptions = undertakingUnitOptionsQuery.data?.map(item => ({ label: item.label, value: item.code })) ?? []
  const categoryOptions = categoryOptionsQuery.data?.map(item => ({ label: item.label, value: item.code })) ?? []

  return (
    <div className="page-stack">
      {contextHolder}
      <PageHeader
        eyebrow="Project Detail"
        title={projectInfo?.name ?? '项目详情'}
        description="围绕合同执行台账查看项目基础信息、挂帐欠款状态，以及开票回款记录。"
        extra={(
          <Space>
            <Button
              icon={<EditOutlined />}
              onClick={() => {
                if (!projectInfo) {
                  return
                }
                projectForm.setFieldsValue({
                  name: projectInfo.name,
                  customer: projectInfo.customer,
                  contractNo: projectInfo.contractNo,
                  signingDate: dayjs(projectInfo.signingDate),
                  contractAmount: Number(projectInfo.contractAmount),
                  responsibleDepartment: projectInfo.responsibleDepartment ?? undefined,
                  undertakingUnit: projectInfo.undertakingUnit,
                  category: projectInfo.category,
                  contractPeriod: projectInfo.contractPeriod ?? undefined,
                  paymentMethod: projectInfo.paymentMethod ?? undefined,
                  remark: projectInfo.remark ?? undefined,
                })
                setProjectEditorOpen(true)
              }}
            >
              编辑
            </Button>
            <Button icon={<HistoryOutlined />} onClick={() => navigate(`/projects/${resolvedProjectId}/changes`)}>
              变更历史
            </Button>
          </Space>
        )}
      />

      <PageSection title="项目概览" subtitle="先看资金状态，再核对台账核心字段。">
        <div className="detail-overview">
          <div className="detail-kpis">
            <KpiCard label="合同金额" value={formatKpiCurrency(projectInfo?.contractAmount)} variant="primary" />
            <KpiCard label="挂帐金额" value={formatKpiCurrency(projectInfo?.accrualAmount)} variant="warning" />
            <KpiCard label="欠款金额" value={formatKpiCurrency(projectInfo?.arrearsAmount)} variant="danger" />
            <KpiCard label="回款进度" value={formatPercent(projectInfo?.paymentProgress)} variant="success" />
          </div>
          <Descriptions
            column={{ xs: 1, sm: 2, xl: 3 }}
            items={[
              { key: 'customer', label: '委托单位', children: projectInfo?.customer },
              { key: 'responsibleDepartment', label: '责任部门', children: renderOptionalText(projectInfo?.responsibleDepartment) },
              { key: 'undertakingUnit', label: '承接单位', children: renderOptionalText(projectInfo?.undertakingUnitLabel) },
              { key: 'category', label: '类别', children: renderOptionalText(projectInfo?.categoryLabel) },
              { key: 'contractNo', label: '合同号', children: projectInfo?.contractNo },
              { key: 'signingDate', label: '签订日期', children: formatDate(projectInfo?.signingDate) },
              { key: 'contractPeriod', label: '合同工期', children: renderOptionalText(projectInfo?.contractPeriod) },
              { key: 'paymentMethod', label: '付款方式', children: renderOptionalText(projectInfo?.paymentMethod) },
              { key: 'invoiceAmount', label: '累计开票', children: formatCurrency(projectInfo?.invoicedAmount) },
              { key: 'paymentAmount', label: '累计回款', children: formatCurrency(projectInfo?.receivedAmount) },
              { key: 'remark', label: '备注', children: renderOptionalText(projectInfo?.remark) },
            ]}
          />
        </div>
      </PageSection>

      <Row gutter={[20, 20]}>
        <Col xs={24} xl={12}>
          <PageSection
            title="开票记录"
            subtitle="记录发票号、开票时间和金额，后续回款会按发票进行关联。"
            extra={(
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingInvoice(null)
                  setInvoiceOpen(true)
                  invoiceForm.resetFields()
                }}
              >
                新增开票
              </Button>
            )}
          >
            <div className="table-frame">
              <Table
                rowKey="id"
                loading={invoicesQuery.isLoading}
                dataSource={invoicesQuery.data ?? []}
                columns={invoiceColumns}
                pagination={false}
                locale={{ emptyText: '暂无开票记录' }}
                summary={(records) => (
                  records.length > 0
                    ? (
                        <Table.Summary.Row>
                          <Table.Summary.Cell index={0}>
                            <Typography.Text strong>合计</Typography.Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={1} />
                          <Table.Summary.Cell index={2} align="right">
                            <Typography.Text strong>
                              {formatCurrency(records.reduce((sum, item) => sum + Number(item.amount), 0))}
                            </Typography.Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={3} />
                        </Table.Summary.Row>
                      )
                    : null
                )}
              />
            </div>
          </PageSection>
        </Col>
        <Col xs={24} xl={12}>
          <PageSection
            title="回款记录"
            subtitle="按发票跟踪回款节奏，只展示本项目下可选的未结清发票。"
            extra={(
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingPayment(null)
                  setPaymentOpen(true)
                  paymentForm.resetFields()
                }}
              >
                新增回款
              </Button>
            )}
          >
            <div className="table-frame">
              <Table
                rowKey="id"
                loading={paymentsQuery.isLoading}
                dataSource={paymentsQuery.data ?? []}
                columns={paymentColumns}
                pagination={false}
                locale={{ emptyText: '暂无回款记录' }}
                summary={(records) => (
                  records.length > 0
                    ? (
                        <Table.Summary.Row>
                          <Table.Summary.Cell index={0}>
                            <Typography.Text strong>合计</Typography.Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={1} />
                          <Table.Summary.Cell index={2} align="right">
                            <Typography.Text strong>
                              {formatCurrency(records.reduce((sum, item) => sum + Number(item.amount), 0))}
                            </Typography.Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={3} />
                        </Table.Summary.Row>
                      )
                    : null
                )}
              />
            </div>
          </PageSection>
        </Col>
      </Row>

      <Modal
        title="编辑项目"
        open={projectEditorOpen}
        onCancel={() => setProjectEditorOpen(false)}
        onOk={() => projectForm.submit()}
        confirmLoading={projectMutation.isPending}
        width={860}
        destroyOnHidden
      >
        <Form<ProjectEditorValues>
          form={projectForm}
          layout="vertical"
          onFinish={async (values) => {
            try {
              await projectMutation.mutateAsync({
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
              if (!applyFormErrors(projectForm, error) && isApiError(error)) {
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

      <Modal
        title={editingInvoice ? '编辑开票' : '新增开票'}
        open={invoiceOpen}
        onCancel={() => {
          setInvoiceOpen(false)
          setEditingInvoice(null)
        }}
        onOk={() => invoiceForm.submit()}
        confirmLoading={invoiceMutation.isPending}
        destroyOnHidden
      >
        <Form<InvoiceFormValues>
          form={invoiceForm}
          layout="vertical"
          onFinish={async (values) => {
            try {
              await invoiceMutation.mutateAsync({
                amount: values.amount,
                invoiceDate: values.invoiceDate.format('YYYY-MM-DD'),
                invoiceNo: values.invoiceNo.trim(),
              })
            }
            catch (error) {
              if (!applyFormErrors(invoiceForm, error) && isApiError(error)) {
                messageApi.error(error.message)
              }
            }
          }}
        >
          <Form.Item label="发票号" name="invoiceNo" rules={[{ required: true, message: '请输入发票号' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="开票金额" name="amount" rules={[{ required: true, message: '请输入开票金额' }]}>
            <CurrencyInputNumber />
          </Form.Item>
          <Form.Item label="开票日期" name="invoiceDate" rules={[{ required: true, message: '请选择开票日期' }]}>
            <LocalizedDatePicker style={{ width: '100%' }} placeholder="请选择开票日期" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingPayment ? '编辑回款' : '新增回款'}
        open={paymentOpen}
        onCancel={() => {
          setPaymentOpen(false)
          setEditingPayment(null)
        }}
        onOk={() => paymentForm.submit()}
        confirmLoading={paymentMutation.isPending}
        destroyOnHidden
      >
        <Form<PaymentFormValues>
          form={paymentForm}
          layout="vertical"
          onFinish={async (values) => {
            try {
              await paymentMutation.mutateAsync({
                amount: values.amount,
                paymentDate: values.paymentDate.format('YYYY-MM-DD'),
                invoiceId: values.invoiceId,
              })
            }
            catch (error) {
              if (!applyFormErrors(paymentForm, error) && isApiError(error)) {
                messageApi.error(error.message)
              }
            }
          }}
        >
          <Form.Item label="发票号" name="invoiceId">
            <Select
              loading={paymentInvoiceOptionsQuery.isLoading}
              placeholder="可不选发票号"
              allowClear
              options={paymentInvoiceOptions.map((option) => ({
                value: option.invoiceId,
                label: option.invoiceNo,
                option,
              }))}
              optionRender={(option) => {
                const invoiceOption = option.data.option as PaymentInvoiceOption
                return (
                  <div className="invoice-option">
                    <div className="invoice-option__top">
                      <span className="invoice-option__no">{invoiceOption.invoiceNo}</span>
                      <span className="invoice-option__badge">
                        未结 {formatCurrency(invoiceOption.unsettledAmount)}
                      </span>
                    </div>
                    <div className="invoice-option__meta">
                      <span>{formatDate(invoiceOption.invoiceDate)}</span>
                      <span>开票 {formatCurrency(invoiceOption.invoiceAmount)}</span>
                    </div>
                  </div>
                )
              }}
            />
          </Form.Item>
          <Form.Item label="回款金额" name="amount" rules={[{ required: true, message: '请输入回款金额' }]}>
            <CurrencyInputNumber />
          </Form.Item>
          <Form.Item label="回款日期" name="paymentDate" rules={[{ required: true, message: '请选择回款日期' }]}>
            <LocalizedDatePicker style={{ width: '100%' }} placeholder="请选择回款日期" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

function KpiCard(props: { label: string; value: string; variant: 'primary' | 'warning' | 'success' | 'danger' }) {
  return (
    <div className={`detail-kpi detail-kpi--${props.variant}`}>
      <span className="detail-kpi__label">{props.label}</span>
      <Typography.Text strong className="detail-kpi__value">
        {props.value}
      </Typography.Text>
    </div>
  )
}

function formatPercent(value?: number | string) {
  const resolved = Number(value ?? 0)
  return `${(resolved * 100).toFixed(1)}%`
}

function formatKpiCurrency(value?: number | string) {
  return formatCurrency(value).replace('¥', '')
}

function renderOptionalText(value?: string | null) {
  return value || '--'
}
