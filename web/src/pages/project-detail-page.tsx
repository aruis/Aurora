import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import type { Dayjs } from 'dayjs'

import {
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Form,
  Modal,
  Popconfirm,
  Row,
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
import {
  createInvoice,
  createPayment,
  deleteInvoice,
  deletePayment,
  getInvoices,
  getPayments,
  getProject,
  updateInvoice,
  updatePayment,
  type InvoicePayload,
  type InvoiceRecord,
  type PaymentPayload,
  type PaymentRecord,
} from '@/modules/projects/api'

type InvoiceFormValues = {
  amount: number
  invoiceDate: Dayjs
}

type PaymentFormValues = {
  amount: number
  paymentDate: Dayjs
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
  const [invoiceForm] = Form.useForm<InvoiceFormValues>()
  const [paymentForm] = Form.useForm<PaymentFormValues>()
  const [invoiceOpen, setInvoiceOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<InvoiceRecord | null>(null)
  const [editingPayment, setEditingPayment] = useState<PaymentRecord | null>(null)

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

  const refreshProjectRelated = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['projects.detail', resolvedProjectId] }),
      queryClient.invalidateQueries({ queryKey: ['projects.list'] }),
      queryClient.invalidateQueries({ queryKey: ['projects.invoices', resolvedProjectId] }),
      queryClient.invalidateQueries({ queryKey: ['projects.payments', resolvedProjectId] }),
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

  return (
    <div className="page-stack">
      {contextHolder}
      <PageHeader
        eyebrow="Project Detail"
        title={project?.name ?? '项目详情'}
        description="查看项目核心信息，以及项目下的开票和回款明细。"
      />

      <PageSection title="项目概览" subtitle="先看资金状态，再核对项目基础信息。">
        <div className="detail-overview">
          <div className="detail-kpis">
            <KpiCard label="合同金额" value={formatCurrency(project?.contractAmount)} variant="primary" />
            <KpiCard label="累计开票" value={formatCurrency(project?.invoicedAmount)} variant="warning" />
            <KpiCard label="累计回款" value={formatCurrency(project?.receivedAmount)} variant="success" />
          </div>
          <Descriptions
            column={{ xs: 1, sm: 2, xl: 3 }}
            items={[
              { key: 'customer', label: '客户', children: project?.customer },
              { key: 'contractNo', label: '合同号', children: project?.contractNo },
              { key: 'signingDate', label: '签约日期', children: formatDate(project?.signingDate) },
              { key: 'invoiceAmount', label: '开票完成度', children: getRateText(project?.invoicedAmount, project?.contractAmount) },
              { key: 'paymentAmount', label: '回款转化率', children: getRateText(project?.receivedAmount, project?.invoicedAmount) },
            ]}
          />
        </div>
      </PageSection>

      <Row gutter={[20, 20]}>
        <Col xs={24} xl={12}>
          <PageSection
            title="开票记录"
            subtitle="记录项目已开票金额与日期，便于核对合同执行进度。"
            extra={
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
            }
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
                          <Table.Summary.Cell index={1} align="right">
                            <Typography.Text strong>
                              {formatCurrency(records.reduce((sum, item) => sum + Number(item.amount), 0))}
                            </Typography.Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={2} />
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
            subtitle="追踪到账节奏，及时识别待回款项目。"
            extra={
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
            }
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
                          <Table.Summary.Cell index={1} align="right">
                            <Typography.Text strong>
                              {formatCurrency(records.reduce((sum, item) => sum + Number(item.amount), 0))}
                            </Typography.Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={2} />
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
              })
            }
            catch (error) {
              if (!applyFormErrors(invoiceForm, error) && isApiError(error)) {
                messageApi.error(error.message)
              }
            }
          }}
        >
          <Form.Item label="开票金额" name="amount" rules={[{ required: true, message: '请输入开票金额' }]}>
            <CurrencyInputNumber />
          </Form.Item>
          <Form.Item label="开票日期" name="invoiceDate" rules={[{ required: true, message: '请选择开票日期' }]}>
            <LocalizedDatePicker
              style={{ width: '100%' }}
              placeholder="请选择开票日期"
            />
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
              })
            }
            catch (error) {
              if (!applyFormErrors(paymentForm, error) && isApiError(error)) {
                messageApi.error(error.message)
              }
            }
          }}
        >
          <Form.Item label="回款金额" name="amount" rules={[{ required: true, message: '请输入回款金额' }]}>
            <CurrencyInputNumber />
          </Form.Item>
          <Form.Item label="回款日期" name="paymentDate" rules={[{ required: true, message: '请选择回款日期' }]}>
            <LocalizedDatePicker
              style={{ width: '100%' }}
              placeholder="请选择回款日期"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

function KpiCard(props: { label: string; value: string; variant: 'primary' | 'warning' | 'success' }) {
  return (
    <div className={`detail-kpi detail-kpi--${props.variant}`}>
      <span className="detail-kpi__label">{props.label}</span>
      <Typography.Text strong className="detail-kpi__value">
        {props.value}
      </Typography.Text>
    </div>
  )
}

function getRateText(numerator?: number | string, denominator?: number | string) {
  const resolvedNumerator = Number(numerator ?? 0)
  const resolvedDenominator = Number(denominator ?? 0)

  if (resolvedDenominator <= 0) {
    return '0.0%'
  }

  return `${((resolvedNumerator / resolvedDenominator) * 100).toFixed(1)}%`
}
