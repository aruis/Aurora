import {
  DashboardOutlined,
  FolderOpenOutlined,
  LogoutOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { Avatar, Breadcrumb, Button, Dropdown, Layout, Menu, Space, Typography } from 'antd'
import { useMutation } from '@tanstack/react-query'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'

import { queryClient } from '@/lib/query-client'
import { logout } from '@/modules/auth/api'
import { clearSession, useSessionStore } from '@/modules/auth/session-store'

const { Content, Header, Sider } = Layout

const breadcrumbNameMap: Record<string, string> = {
  dashboard: '仪表盘',
  projects: '项目管理',
  users: '用户管理',
}

export function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const user = useSessionStore((state) => state.user)
  const pathSnippets = location.pathname.split('/').filter(Boolean)
  const menuItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: <Link to="/dashboard">仪表盘</Link> },
    { key: '/projects', icon: <FolderOpenOutlined />, label: <Link to="/projects">项目管理</Link> },
    ...(user?.roles.includes('ADMIN')
      ? [{ key: '/users', icon: <TeamOutlined />, label: <Link to="/users">用户管理</Link> }]
      : []),
  ]

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSettled: async () => {
      clearSession()
      queryClient.clear()
      navigate('/login', { replace: true })
    },
  })

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={244} breakpoint="lg" collapsedWidth={84} style={{ padding: '18px 16px' }}>
        <div style={{ color: '#fff', padding: '12px 14px 24px' }}>
          <Typography.Text style={{ color: 'rgba(255,255,255,0.72)', letterSpacing: 2 }}>
            AURORA
          </Typography.Text>
          <Typography.Title level={4} style={{ color: '#fff', margin: '8px 0 0' }}>
            业务管理台
          </Typography.Title>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[`/${pathSnippets[0] ?? 'dashboard'}`]}
          items={menuItems}
          style={{ borderInlineEnd: 'none' }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 28px',
            borderBottom: '1px solid rgba(216, 224, 236, 0.9)',
            backdropFilter: 'blur(14px)',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Breadcrumb
              items={pathSnippets.map((segment, index) => ({
                title:
                  index === pathSnippets.length - 1 && /^\d+$/.test(segment)
                    ? `项目 #${segment}`
                    : breadcrumbNameMap[segment] ?? segment,
              }))}
            />
            <Dropdown
              menu={{
                items: [
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
              <Button type="text" style={{ height: 'auto', paddingInline: 0 }}>
                <Space size={12}>
                  <Avatar style={{ backgroundColor: '#1d3d70' }}>{user?.displayName?.slice(0, 1) ?? 'A'}</Avatar>
                  <Space direction="vertical" size={0} style={{ alignItems: 'flex-start', lineHeight: 1.35 }}>
                    <Typography.Text strong>{user?.displayName}</Typography.Text>
                    <Typography.Text type="secondary">{user?.roles.join(' / ')}</Typography.Text>
                  </Space>
                </Space>
              </Button>
            </Dropdown>
          </div>
        </Header>
        <Content style={{ padding: 28 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
