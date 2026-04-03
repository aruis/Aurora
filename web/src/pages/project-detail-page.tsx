import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import type { Dayjs } from 'dayjs'

import {
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Empty,
  Form,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Space,
  Table,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

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
    { title: '开票日期', dataIndex: 'invoiceDate', render: formatDate },
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
    { title: '回款日期', dataIndex: 'paymentDate', render: formatDate },
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
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      {contextHolder}
      <PageHeader
        title={project?.name ?? '项目详情'}
        description="查看项目核心信息，以及项目下的开票和回款明细。"
      />

      <PageSection title="项目概览">
        <Descriptions column={4} items={[
          { key: 'customer', label: '客户', children: project?.customer },
          { key: 'contractNo', label: '合同号', children: project?.contractNo },
          { key: 'signingDate', label: '签约日期', children: formatDate(project?.signingDate) },
          { key: 'contractAmount', label: '合同金额', children: formatCurrency(project?.contractAmount) },
          { key: 'invoiceAmount', label: '累计开票', children: formatCurrency(project?.invoicedAmount) },
          { key: 'paymentAmount', label: '累计回款', children: formatCurrency(project?.receivedAmount) },
        ]} />
      </PageSection>

      <Row gutter={[20, 20]}>
        <Col xs={24} xl={12}>
          <PageSection
            title="开票记录"
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
            <Table
              rowKey="id"
              loading={invoicesQuery.isLoading}
              dataSource={invoicesQuery.data ?? []}
              columns={invoiceColumns}
              pagination={false}
            />
          </PageSection>
        </Col>
        <Col xs={24} xl={12}>
          <PageSection
            title="回款记录"
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
            <Table
              rowKey="id"
              loading={paymentsQuery.isLoading}
              dataSource={paymentsQuery.data ?? []}
              columns={paymentColumns}
              pagination={false}
            />
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
            <InputNumber style={{ width: '100%' }} min={0.01} precision={2} addonBefore="¥" />
          </Form.Item>
          <Form.Item label="开票日期" name="invoiceDate" rules={[{ required: true, message: '请选择开票日期' }]}>
            <DatePicker style={{ width: '100%' }} />
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
            <InputNumber style={{ width: '100%' }} min={0.01} precision={2} addonBefore="¥" />
          </Form.Item>
          <Form.Item label="回款日期" name="paymentDate" rules={[{ required: true, message: '请选择回款日期' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  )
}
