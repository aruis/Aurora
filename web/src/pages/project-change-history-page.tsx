import { ArrowLeftOutlined } from '@ant-design/icons'
import { Button, Card, Empty, List, Typography } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'

import { PageHeader } from '@/components/page-header'
import { PageSection } from '@/components/page-section'
import { formatDateTime } from '@/lib/format'
import { getProject } from '@/modules/projects/api'

export function ProjectChangeHistoryPage() {
  const { projectId } = useParams()
  const resolvedProjectId = Number(projectId)
  const navigate = useNavigate()

  const projectQuery = useQuery({
    queryKey: ['projects.detail', resolvedProjectId],
    queryFn: () => getProject(resolvedProjectId),
    enabled: Number.isFinite(resolvedProjectId),
  })

  if (projectQuery.isError || !Number.isFinite(resolvedProjectId)) {
    return (
      <Card bordered={false}>
        <Empty description="项目不存在或无法访问">
          <Button onClick={() => navigate('/projects')}>返回项目列表</Button>
        </Empty>
      </Card>
    )
  }

  const project = projectQuery.data?.project
  const changes = projectQuery.data?.changes ?? []

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Project Change History"
        title={`${project?.name ?? '项目'} · 变更记录`}
        description="这里沉淀项目字段变更的业务流水，记录生成后不可编辑或删除。"
        extra={(
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/projects/${resolvedProjectId}`)}>
            返回项目详情
          </Button>
        )}
      />

      <PageSection title="变更流水" subtitle="按时间倒序展示，便于回溯项目演进过程。">
        <List
          className="project-change-list"
          dataSource={changes}
          locale={{ emptyText: '当前项目暂无变更记录' }}
          renderItem={(item) => (
            <List.Item className="project-change-list__item">
              <article className="project-change-card">
                <div className="project-change-card__header">
                  <div className="project-change-card__title-wrap">
                    <Typography.Text strong className="project-change-card__title">
                      {item.summary}
                    </Typography.Text>
                    <div className="project-change-card__meta">
                      <Typography.Text type="secondary">
                        {item.operatorDisplayName}（{item.operatorUsername}）
                      </Typography.Text>
                    </div>
                  </div>
                  <Typography.Text type="secondary" className="project-change-card__time">
                    {formatDateTime(item.createdAt)}
                  </Typography.Text>
                </div>

                <div className="project-change-grid">
                  {parseChangeRows(item.detail).map((row) => (
                    <div key={`${item.id}-${row.field}`} className="project-change-grid__item">
                      <div className="project-change-grid__field">{row.field}</div>
                      <div className="project-change-grid__values">
                        <Typography.Text className="project-change-grid__before">{row.before}</Typography.Text>
                        <span className="project-change-grid__arrow">→</span>
                        <Typography.Text className="project-change-grid__after">{row.after}</Typography.Text>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </List.Item>
          )}
        />
      </PageSection>
    </div>
  )
}

function parseChangeRows(detail: string) {
  return detail
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [fieldPart, valuePart = ''] = line.split('：')
      const [before = '--', after = '--'] = valuePart.split(' -> ')

      return {
        field: fieldPart || '字段',
        before,
        after,
      }
    })
}
