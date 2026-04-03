import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Form, Input, Space, Typography } from 'antd'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { applyFormErrors } from '@/lib/forms'
import { isApiError } from '@/lib/http'
import { login } from '@/modules/auth/api'
import { useSessionStore } from '@/modules/auth/session-store'

type LoginFormValues = {
  username: string
  password: string
}

export function LoginPage() {
  const [form] = Form.useForm<LoginFormValues>()
  const navigate = useNavigate()
  const setUser = useSessionStore((state) => state.setUser)

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (user) => {
      setUser(user)
      navigate('/dashboard', { replace: true })
    },
  })

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
      }}
    >
      <Card
        bordered={false}
        style={{
          width: 440,
          boxShadow: '0 24px 60px rgba(18, 38, 63, 0.12)',
        }}
      >
        <Space direction="vertical" size={28} style={{ width: '100%' }}>
          <Space direction="vertical" size={8}>
            <Typography.Text style={{ color: '#1d3d70', letterSpacing: 1.6 }}>AURORA</Typography.Text>
            <Typography.Title level={2} style={{ margin: 0 }}>
              欢迎回来
            </Typography.Title>
            <Typography.Text type="secondary">
              使用你的系统账号登录业务管理台，继续处理项目、开票和回款工作。
            </Typography.Text>
          </Space>

          {loginMutation.isError && isApiError(loginMutation.error) ? (
            <Alert type="error" showIcon message={loginMutation.error.message} />
          ) : null}

          <Form<LoginFormValues>
            form={form}
            layout="vertical"
            autoComplete="off"
            initialValues={{ username: 'admin' }}
            onFinish={async (values) => {
              try {
                await loginMutation.mutateAsync(values)
              }
              catch (error) {
                applyFormErrors(form, error)
              }
            }}
          >
            <Form.Item label="用户名" name="username" rules={[{ required: true, message: '请输入用户名' }]}>
              <Input prefix={<UserOutlined />} placeholder="请输入用户名" />
            </Form.Item>
            <Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="请输入密码" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={loginMutation.isPending}>
              登录系统
            </Button>
          </Form>

          <Typography.Text type="secondary">
            默认管理员账号：<Typography.Text code>admin</Typography.Text>
          </Typography.Text>
        </Space>
      </Card>
    </div>
  )
}
