import { LockOutlined, PlusOutlined } from '@ant-design/icons'

import {
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { PageHeader } from '@/components/page-header'
import { PageSection } from '@/components/page-section'
import { PermissionGuard } from '@/components/permission-guard'
import { applyFormErrors } from '@/lib/forms'
import { isApiError } from '@/lib/http'
import {
  ROLE_OPTIONS,
  createUser,
  disableUser,
  enableUser,
  getUsers,
  resetPassword,
  updateUser,
  type RoleCode,
  type User,
} from '@/modules/users/api'

type UserFormValues = {
  username?: string
  password?: string
  displayName: string
  enabled: boolean
  roles: RoleCode[]
}

type PasswordFormValues = {
  newPassword: string
}

export function UserManagementPage() {
  const queryClient = useQueryClient()
  const [messageApi, contextHolder] = message.useMessage()
  const [editorForm] = Form.useForm<UserFormValues>()
  const [passwordForm] = Form.useForm<PasswordFormValues>()
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)

  const usersQuery = useQuery({
    queryKey: ['users.list'],
    queryFn: getUsers,
  })

  const refreshUsers = async () => {
    await queryClient.invalidateQueries({ queryKey: ['users.list'] })
  }

  const saveMutation = useMutation({
    mutationFn: async (values: UserFormValues) => {
      if (editingUser) {
        return updateUser(editingUser.id, {
          displayName: values.displayName,
          enabled: values.enabled,
          roles: values.roles,
        })
      }

      return createUser({
        username: values.username ?? '',
        password: values.password ?? '',
        displayName: values.displayName,
        enabled: values.enabled,
        roles: values.roles,
      })
    },
    onSuccess: async () => {
      messageApi.success(editingUser ? '用户已更新' : '用户已创建')
      setEditorOpen(false)
      setEditingUser(null)
      editorForm.resetFields()
      await refreshUsers()
    },
  })

  const resetPasswordMutation = useMutation({
    mutationFn: async (values: PasswordFormValues) => {
      if (!editingUser) {
        return
      }
      await resetPassword(editingUser.id, values)
    },
    onSuccess: async () => {
      messageApi.success('密码已重置')
      setPasswordOpen(false)
      passwordForm.resetFields()
    },
  })

  const toggleUserStatus = async (user: User) => {
    try {
      if (user.enabled) {
        await disableUser(user.id)
        messageApi.success('用户已停用')
      }
      else {
        await enableUser(user.id)
        messageApi.success('用户已启用')
      }
      await refreshUsers()
    }
    catch (error) {
      if (isApiError(error)) {
        messageApi.error(error.message)
      }
    }
  }

  const columns: ColumnsType<User> = [
    { title: '用户名', dataIndex: 'username' },
    { title: '展示名称', dataIndex: 'displayName' },
    {
      title: '状态',
      dataIndex: 'enabled',
      render: (enabled) => <Tag color={enabled ? 'success' : 'default'}>{enabled ? '启用' : '停用'}</Tag>,
    },
    {
      title: '角色',
      dataIndex: 'roles',
      render: (roles: RoleCode[]) => (
        <Space wrap>
          {roles.map((role) => (
            <Tag key={role} color="blue">
              {ROLE_OPTIONS.find((item) => item.value === role)?.label ?? role}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 260,
      render: (_, record) => (
        <Space size={0}>
          <Button
            type="link"
            onClick={() => {
              setEditingUser(record)
              setEditorOpen(true)
              editorForm.setFieldsValue({
                displayName: record.displayName,
                enabled: record.enabled,
                roles: record.roles,
              })
            }}
          >
            编辑
          </Button>
          <Popconfirm
            title={`确认${record.enabled ? '停用' : '启用'}该用户？`}
            onConfirm={() => toggleUserStatus(record)}
          >
            <Button type="link">{record.enabled ? '停用' : '启用'}</Button>
          </Popconfirm>
          <Button
            type="link"
            icon={<LockOutlined />}
            onClick={() => {
              setEditingUser(record)
              setPasswordOpen(true)
              passwordForm.resetFields()
            }}
          >
            重置密码
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <PermissionGuard roles={['ADMIN']}>
      <Space direction="vertical" size={24} style={{ width: '100%' }}>
        {contextHolder}
        <PageHeader
          title="用户管理"
          description="维护系统账号、角色与启停状态，当前模块仅管理员可见。"
          extra={
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingUser(null)
                setEditorOpen(true)
                editorForm.resetFields()
                editorForm.setFieldsValue({ enabled: true, roles: ['PROJECT_MANAGER'] })
              }}
            >
              新建用户
            </Button>
          }
        />

        <PageSection title="账号列表">
          <Table rowKey="id" loading={usersQuery.isLoading} dataSource={usersQuery.data ?? []} columns={columns} />
        </PageSection>

        <Modal
          title={editingUser ? '编辑用户' : '新建用户'}
          open={editorOpen}
          onCancel={() => {
            setEditorOpen(false)
            setEditingUser(null)
          }}
          onOk={() => editorForm.submit()}
          confirmLoading={saveMutation.isPending}
          destroyOnHidden
        >
          <Form<UserFormValues>
            form={editorForm}
            layout="vertical"
            initialValues={{ enabled: true, roles: [] }}
            onFinish={async (values) => {
              try {
                await saveMutation.mutateAsync(values)
              }
              catch (error) {
                if (!applyFormErrors(editorForm, error) && isApiError(error)) {
                  messageApi.error(error.message)
                }
              }
            }}
          >
            {!editingUser ? (
              <>
                <Form.Item label="用户名" name="username" rules={[{ required: true, message: '请输入用户名' }]}>
                  <Input />
                </Form.Item>
                <Form.Item label="初始密码" name="password" rules={[{ required: true, message: '请输入初始密码' }]}>
                  <Input.Password />
                </Form.Item>
              </>
            ) : null}
            <Form.Item label="展示名称" name="displayName" rules={[{ required: true, message: '请输入展示名称' }]}>
              <Input />
            </Form.Item>
            <Form.Item label="角色" name="roles" rules={[{ required: true, message: '请至少选择一个角色' }]}>
              <Select mode="multiple" options={ROLE_OPTIONS} />
            </Form.Item>
            <Form.Item label="启用状态" name="enabled" valuePropName="checked">
              <Switch checkedChildren="启用" unCheckedChildren="停用" />
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title={`重置密码${editingUser ? ` · ${editingUser.username}` : ''}`}
          open={passwordOpen}
          onCancel={() => setPasswordOpen(false)}
          onOk={() => passwordForm.submit()}
          confirmLoading={resetPasswordMutation.isPending}
          destroyOnHidden
        >
          <Form<PasswordFormValues>
            form={passwordForm}
            layout="vertical"
            onFinish={async (values) => {
              try {
                await resetPasswordMutation.mutateAsync(values)
              }
              catch (error) {
                if (!applyFormErrors(passwordForm, error) && isApiError(error)) {
                  messageApi.error(error.message)
                }
              }
            }}
          >
            <Form.Item label="新密码" name="newPassword" rules={[{ required: true, message: '请输入新密码' }]}>
              <Input.Password />
            </Form.Item>
          </Form>
        </Modal>
      </Space>
    </PermissionGuard>
  )
}
