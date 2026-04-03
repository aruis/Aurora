import { DeleteOutlined, EyeOutlined, PlusOutlined } from '@ant-design/icons'
import type { Dayjs } from 'dayjs'

import { Button, Col, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Row, Space, Table, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { PageHeader } from '@/components/page-header'
import { PageSection } from '@/components/page-section'
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
      width: 190,
      render: (_, record) => (
        <Space size={0}>
          <Button type="link" icon={<EyeOutlined />}>
            <Link to={`/projects/${record.id}`}>详情</Link>
          </Button>
          <Button
            type="link"
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
          >
            编辑
          </Button>
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
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      {contextHolder}
      <PageHeader
        title="项目管理"
        description="集中维护项目基础信息、合同台账以及项目级别的开票与回款汇总。"
        extra={
          <Button
            type="primary"
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

      <PageSection title="筛选条件">
        <Form<SearchFormValues> form={searchForm} layout="vertical" onFinish={(values) => setFilters(values)}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="项目名称" name="name">
                <Input placeholder="支持模糊搜索" allowClear />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="客户名称" name="customer">
                <Input placeholder="输入客户名称" allowClear />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="合同号" name="contractNo">
                <Input placeholder="输入合同号" allowClear />
              </Form.Item>
            </Col>
          </Row>
          <Space>
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
          </Space>
        </Form>
      </PageSection>

      <PageSection title="项目列表">
        <Table rowKey="id" loading={projectsQuery.isLoading} dataSource={projectsQuery.data ?? []} columns={columns} />
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
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="项目名称" name="name" rules={[{ required: true, message: '请输入项目名称' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="客户名称" name="customer" rules={[{ required: true, message: '请输入客户名称' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="合同号" name="contractNo" rules={[{ required: true, message: '请输入合同号' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="签约日期" name="signingDate" rules={[{ required: true, message: '请选择签约日期' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="合同金额" name="contractAmount" rules={[{ required: true, message: '请输入合同金额' }]}>
                <InputNumber style={{ width: '100%' }} min={0.01} precision={2} addonBefore="¥" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Space>
  )
}
