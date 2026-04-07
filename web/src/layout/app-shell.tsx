import {
  BarChartOutlined,
  KeyOutlined,
  DashboardOutlined,
  FolderOpenOutlined,
  FileTextOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { Avatar, Breadcrumb, Button, Dropdown, Form, Input, Layout, Menu, Modal, Typography, message } from 'antd'
import { useMutation } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'

import { applyFormErrors } from '@/lib/forms'
import { isApiError } from '@/lib/http'
import { queryClient } from '@/lib/query-client'
import { changePassword, logout } from '@/modules/auth/api'
import { clearSession, useSessionStore } from '@/modules/auth/session-store'

const { Content, Header, Sider } = Layout

const breadcrumbNameMap: Record<string, string> = {
  dashboard: '仪表盘',
  'finance-stats': '数据统计',
  projects: '项目管理',
  changes: '项目变更记录',
  users: '用户管理',
  'operation-logs': '操作日志',
}

export function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const user = useSessionStore((state) => state.user)
  const pathSnippets = location.pathname.split('/').filter(Boolean)
  const [collapsed, setCollapsed] = useState(false)
  const menuItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: <Link to="/dashboard">仪表盘</Link> },
    { key: '/finance-stats', icon: <BarChartOutlined />, label: <Link to="/finance-stats">数据统计</Link> },
    { key: '/projects', icon: <FolderOpenOutlined />, label: <Link to="/projects">项目管理</Link> },
    ...(user?.roles.includes('ADMIN')
      ? [
          { key: '/users', icon: <TeamOutlined />, label: <Link to="/users">用户管理</Link> },
          { key: '/operation-logs', icon: <FileTextOutlined />, label: <Link to="/operation-logs">操作日志</Link> },
        ]
      : []),
  ]
  const [messageApi, contextHolder] = message.useMessage()
  const [passwordForm] = Form.useForm<{
    oldPassword: string
    newPassword: string
    confirmPassword: string
  }>()
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSettled: async () => {
      clearSession()
      queryClient.clear()
      navigate('/login', { replace: true })
    },
  })
  const changePasswordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      messageApi.success('密码修改成功，请重新登录')
      setPasswordModalOpen(false)
      passwordForm.resetFields()
      clearSession()
      queryClient.clear()
      navigate('/login', { replace: true })
    },
  })
  const roleText = user?.roles.join(' / ') ?? ''
  const breadcrumbItems = useMemo(() => {
    if (pathSnippets.length === 0) {
      return [{ title: '仪表盘' }]
    }

    return pathSnippets.map((segment, index) => {
      const isLast = index === pathSnippets.length - 1
      const href = `/${pathSnippets.slice(0, index + 1).join('/')}`
      const isProjectIdSegment = /^\d+$/.test(segment) && pathSnippets[index - 1] === 'projects'
      const label = isProjectIdSegment ? `项目 #${segment}` : (breadcrumbNameMap[segment] ?? segment)

      return {
        title: !isLast ? <Link to={href}>{label}</Link> : label,
      }
    })
  }, [pathSnippets])

  return (
    <Layout className="app-shell">
      {contextHolder}
      <Sider
        className="app-shell__sider"
        width={260}
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        breakpoint="lg"
        collapsedWidth={84}
        trigger={null}
      >
        <div className="app-shell__brand">
          <Typography.Text className="app-shell__brand-mark">
            AURORA
          </Typography.Text>
          <Typography.Title level={4} className="app-shell__brand-title">
            业务管理台
          </Typography.Title>
        </div>
        <Menu
          className="app-shell__menu"
          theme="dark"
          mode="inline"
          selectedKeys={[`/${pathSnippets[0] ?? 'dashboard'}`]}
          items={menuItems}
          style={{ borderInlineEnd: 'none' }}
        />
      </Sider>
      <Layout className="app-shell__main">
        <Header className="app-shell__header">
          <div className="app-shell__header-inner">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                minWidth: 0,
              }}
            >
              <Button
                type="text"
                aria-label={collapsed ? '展开导航' : '收起导航'}
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed((value) => !value)}
              />
              <Breadcrumb className="app-shell__breadcrumb" items={breadcrumbItems} />
            </div>
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'change-password',
                    icon: <KeyOutlined />,
                    label: '修改密码',
                    onClick: () => setPasswordModalOpen(true),
                  },
                  {
                    key: 'logout',
                    icon: <LogoutOutlined />,
                    label: '退出登录',
                    onClick: () => logoutMutation.mutate(),
                  },
                ],
              }}
              trigger={['click']}
            >
              <Button
                type="text"
                className="app-shell__user-trigger"
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    minWidth: 0,
                    maxWidth: 280,
                  }}
                >
                  <Avatar
                    size={34}
                    style={{
                      backgroundColor: '#1d3d70',
                      flex: '0 0 auto',
                      fontSize: 14,
                    }}
                  >
                    {user?.displayName?.slice(0, 1) ?? 'A'}
                  </Avatar>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      justifyContent: 'center',
                      minWidth: 0,
                      lineHeight: 1.2,
                    }}
                  >
                    <Typography.Text
                      strong
                      style={{
                        maxWidth: '100%',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {user?.displayName}
                    </Typography.Text>
                    <Typography.Text
                      type="secondary"
                      style={{
                        display: 'block',
                        maxWidth: '100%',
                        marginTop: 2,
                        fontSize: 11,
                        lineHeight: 1.2,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={roleText}
                    >
                      {roleText}
                    </Typography.Text>
                  </div>
                </div>
              </Button>
            </Dropdown>
          </div>
        </Header>
        <Content className="app-shell__content">
          <div className="app-shell__content-frame">
            <Outlet />
          </div>
        </Content>
      </Layout>
      <Modal
        title="修改密码"
        open={passwordModalOpen}
        onCancel={() => {
          setPasswordModalOpen(false)
          passwordForm.resetFields()
        }}
        onOk={() => passwordForm.submit()}
        confirmLoading={changePasswordMutation.isPending}
        destroyOnHidden
      >
        <Form<{
          oldPassword: string
          newPassword: string
          confirmPassword: string
        }>
          form={passwordForm}
          layout="vertical"
          onFinish={async (values) => {
            try {
              await changePasswordMutation.mutateAsync({
                oldPassword: values.oldPassword,
                newPassword: values.newPassword,
              })
            }
            catch (error) {
              if (!applyFormErrors(passwordForm, error) && isApiError(error)) {
                messageApi.error(error.message)
              }
            }
          }}
        >
          <Form.Item label="原密码" name="oldPassword" rules={[{ required: true, message: '请输入原密码' }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item
            label="新密码"
            name="newPassword"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '新密码至少 6 位' },
            ]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item
            label="确认新密码"
            name="confirmPassword"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请再次输入新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('两次输入的新密码不一致'))
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  )
}
