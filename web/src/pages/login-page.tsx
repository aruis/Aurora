import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { Alert, Button, Form, Input, Space, Typography } from 'antd'
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
    <div className="login-shell">
      <div className="login-panel">
        <section className="login-hero">
          <div className="login-hero__content">
            <span className="login-hero__eyebrow">Aurora Workspace</span>
            <Typography.Title level={1} className="login-hero__title">
              业务协同
              <br />
              从这里开始
            </Typography.Title>
            <Typography.Text className="login-hero__desc">
              把项目、合同、开票和回款集中在一个清晰的工作面板里，让日常操作更快、状态判断更准。
            </Typography.Text>

            <div className="login-hero__list">
              <div className="login-hero__item">
                <Typography.Text strong style={{ color: '#fff' }}>项目台账集中维护</Typography.Text>
                <Typography.Text style={{ display: 'block', marginTop: 4, color: 'rgba(255,255,255,0.7)' }}>
                  快速查看合同信息与项目资金状态。
                </Typography.Text>
              </div>
              <div className="login-hero__item">
                <Typography.Text strong style={{ color: '#fff' }}>开票与回款闭环跟踪</Typography.Text>
                <Typography.Text style={{ display: 'block', marginTop: 4, color: 'rgba(255,255,255,0.7)' }}>
                  让执行进度和回收节奏都更容易被看见。
                </Typography.Text>
              </div>
            </div>
          </div>
        </section>

        <section className="login-form-wrap">
          <div className="login-form-card">
            <Space direction="vertical" size={28} style={{ width: '100%' }}>
              <Space direction="vertical" size={8}>
                <Typography.Text style={{ color: '#1d4b8f', letterSpacing: 1.6 }}>欢迎回来</Typography.Text>
                <Typography.Title level={2} style={{ margin: 0 }}>
                  登录业务管理台
                </Typography.Title>
                <Typography.Text type="secondary">
                  使用你的系统账号继续处理项目、开票和回款工作。
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
                  <Input prefix={<UserOutlined />} placeholder="请输入用户名" size="large" />
                </Form.Item>
                <Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入密码' }]}>
                  <Input.Password prefix={<LockOutlined />} placeholder="请输入密码" size="large" />
                </Form.Item>
                <Button type="primary" htmlType="submit" block size="large" loading={loginMutation.isPending}>
                  登录系统
                </Button>
              </Form>
            </Space>
          </div>
        </section>
      </div>
    </div>
  )
}
