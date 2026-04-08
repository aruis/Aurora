import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Col, Form, Input, InputNumber, Modal, Popconfirm, Row, Select, Space, Switch, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

import { PageHeader } from '@/components/page-header'
import { PageSection } from '@/components/page-section'
import { PermissionGuard } from '@/components/permission-guard'
import { applyFormErrors } from '@/lib/forms'
import { isApiError } from '@/lib/http'
import { buildTablePagination } from '@/lib/table'
import {
  createDictionaryEntry,
  deleteDictionaryEntry,
  DICTIONARY_TYPE_OPTIONS,
  getDictionaryEntries,
  updateDictionaryEntry,
  type DictionaryEntry,
  type DictionaryEntryPayload,
  type DictionaryType,
} from '@/modules/dictionaries/api'

type DictionaryFormValues = DictionaryEntryPayload

export function DictionaryManagementPage() {
  const queryClient = useQueryClient()
  const [messageApi, contextHolder] = message.useMessage()
  const [editorForm] = Form.useForm<DictionaryFormValues>()
  const [editingEntry, setEditingEntry] = useState<DictionaryEntry | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [activeType, setActiveType] = useState<DictionaryType>('undertaking_unit')

  const entriesQuery = useQuery({
    queryKey: ['dictionaries.admin'],
    queryFn: () => getDictionaryEntries(),
  })

  const refreshEntries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['dictionaries.admin'] }),
      queryClient.invalidateQueries({ queryKey: ['dictionaries.options'] }),
    ])
  }

  const saveMutation = useMutation({
    mutationFn: async (values: DictionaryFormValues) => {
      if (editingEntry) {
        return updateDictionaryEntry(editingEntry.id, values)
      }
      return createDictionaryEntry(values)
    },
    onSuccess: async () => {
      messageApi.success(editingEntry ? '字典项已更新' : '字典项已创建')
      setEditorOpen(false)
      setEditingEntry(null)
      editorForm.resetFields()
      await refreshEntries()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteDictionaryEntry,
    onSuccess: async () => {
      messageApi.success('字典项已删除')
      await refreshEntries()
    },
  })

  const columns: ColumnsType<DictionaryEntry> = [
    { title: '编码', dataIndex: 'code', width: 180 },
    { title: '名称', dataIndex: 'label', width: 220 },
    { title: '排序', dataIndex: 'sortOrder', width: 100 },
    {
      title: '引用项目',
      dataIndex: 'referenceCount',
      width: 110,
      render: (value) => value > 0 ? <Tag color="gold">{value}</Tag> : <Tag>{value}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 100,
      render: (enabled) => <Tag color={enabled ? 'green' : 'default'}>{enabled ? '启用' : '停用'}</Tag>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (_, record) => (
        <Space size={4}>
          <Button
            type="link"
            onClick={() => {
              setEditingEntry(record)
              setEditorOpen(true)
              editorForm.setFieldsValue({
                type: record.type,
                code: record.code,
                label: record.label,
                sortOrder: record.sortOrder,
                enabled: record.enabled,
              })
            }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除该字典项？"
            description={record.referenceCount > 0 ? `当前已被 ${record.referenceCount} 个项目引用，后端会拒绝删除。` : '删除后将不再出现在业务选项中。'}
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

  const entries = entriesQuery.data ?? []
  const enabledCount = entries.filter(item => item.enabled).length
  const countsByType = useMemo<Record<DictionaryType, number>>(
    () => ({
      undertaking_unit: entries.filter(item => item.type === 'undertaking_unit').length,
      project_category: entries.filter(item => item.type === 'project_category').length,
    }),
    [entries],
  )
  const activeTypeMeta = DICTIONARY_TYPE_OPTIONS.find(item => item.value === activeType)
  const activeEntries = entries.filter(item => item.type === activeType)

  return (
    <PermissionGuard roles={['ADMIN']}>
      <div className="page-stack">
        {contextHolder}
        <PageHeader
          eyebrow="Admin"
          title="数据字典"
          description="统一维护业务选项，供项目录入、筛选和展示使用。"
          extra={(
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingEntry(null)
                setEditorOpen(true)
                editorForm.resetFields()
                editorForm.setFieldsValue({
                  type: activeType,
                  sortOrder: 10,
                  enabled: true,
                })
              }}
            >
              新增明细
            </Button>
          )}
        />

        <div className="summary-strip">
          <SummaryChip label="字典项总数" value={String(entries.length)} />
          <SummaryChip label="启用项" value={String(enabledCount)} />
          <SummaryChip label="承接单位" value={String(countsByType.undertaking_unit)} />
          <SummaryChip label="项目类别" value={String(countsByType.project_category)} />
        </div>

        <Row gutter={[20, 20]} align="stretch">
          <Col xs={24} xl={7}>
            <PageSection title="字典类目" subtitle="左侧选择类目，右侧维护明细。">
              <div className="dictionary-category-list">
                {DICTIONARY_TYPE_OPTIONS.map(item => {
                  const isActive = item.value === activeType
                  return (
                    <button
                      key={item.value}
                      type="button"
                      className={`dictionary-category-card${isActive ? ' dictionary-category-card--active' : ''}`}
                      onClick={() => setActiveType(item.value)}
                    >
                      <span className="dictionary-category-card__title">{item.label}</span>
                      <span className="dictionary-category-card__meta">共 {countsByType[item.value]} 项</span>
                    </button>
                  )
                })}
              </div>
            </PageSection>
          </Col>
          <Col xs={24} xl={17}>
            <PageSection
              title={activeTypeMeta ? `${activeTypeMeta.label}明细` : '字典明细'}
              subtitle="维护当前类目的可选项，用于项目录入和筛选。"
              extra={<Typography.Text type="secondary">当前 {activeEntries.length} 项</Typography.Text>}
            >
              <div className="table-frame">
                <Table
                  rowKey="id"
                  loading={entriesQuery.isLoading}
                  dataSource={activeEntries}
                  columns={columns}
                  scroll={{ x: 720 }}
                  pagination={buildTablePagination({ showSizeChanger: false, totalUnit: '项明细' })}
                />
              </div>
            </PageSection>
          </Col>
        </Row>

        <Modal
          title={editingEntry ? '编辑字典明细' : '新增字典明细'}
          open={editorOpen}
          onCancel={() => {
            setEditorOpen(false)
            setEditingEntry(null)
          }}
          onOk={() => editorForm.submit()}
          confirmLoading={saveMutation.isPending}
          destroyOnHidden
        >
          <Form<DictionaryFormValues>
            form={editorForm}
            layout="vertical"
            onFinish={async (values) => {
              try {
                await saveMutation.mutateAsync({
                  type: values.type,
                  code: values.code.trim().toUpperCase(),
                  label: values.label.trim(),
                  sortOrder: values.sortOrder,
                  enabled: values.enabled,
                })
              }
              catch (error) {
                if (!applyFormErrors(editorForm, error) && isApiError(error)) {
                  messageApi.error(error.message)
                }
              }
            }}
          >
            <Form.Item label="字典类型" name="type" rules={[{ required: true, message: '请选择字典类型' }]}>
              <Select options={DICTIONARY_TYPE_OPTIONS as unknown as { label: string, value: DictionaryType }[]} />
            </Form.Item>
            <Form.Item
              label="编码"
              name="code"
              extra="建议使用大写字母、数字和下划线，例如 FIFTH_TEAM。"
              rules={[
                { required: true, message: '请输入编码' },
                { pattern: /^[A-Z][A-Z0-9_]*$/, message: '编码仅支持大写字母、数字和下划线，且需以字母开头' },
              ]}
            >
              <Input placeholder="例如：FIFTH_TEAM" />
            </Form.Item>
            <Form.Item label="名称" name="label" rules={[{ required: true, message: '请输入名称' }]}>
              <Input placeholder="例如：五队" />
            </Form.Item>
            <Form.Item label="排序" name="sortOrder" rules={[{ required: true, message: '请输入排序' }]}>
              <InputNumber min={0} precision={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="启用" name="enabled" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Form>
        </Modal>
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
