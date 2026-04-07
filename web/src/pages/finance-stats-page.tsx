import { BarChartOutlined, DollarOutlined, DownloadOutlined, WalletOutlined } from '@ant-design/icons'
import type { Dayjs } from 'dayjs'

import { Alert, Button, Empty, Segmented, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { LocalizedRangePicker } from '@/components/localized-date-picker'
import { PageHeader } from '@/components/page-header'
import { PageSection } from '@/components/page-section'
import { downloadCsv } from '@/lib/export'
import { formatCompactCurrency, formatCurrency } from '@/lib/format'
import { buildTablePagination } from '@/lib/table'
import { getFinanceStats, type FinanceStatsProjectRow } from '@/modules/finance/api'

type PresetKey = 'week' | 'month' | 'quarter' | 'year' | 'custom'

type DateRangeValue = [Dayjs, Dayjs]

const presetOptions: { label: string; value: PresetKey }[] = [
  { label: '本周', value: 'week' },
  { label: '本月', value: 'month' },
  { label: '本季度', value: 'quarter' },
  { label: '本年', value: 'year' },
  { label: '自定义', value: 'custom' },
]

export function FinanceStatsPage() {
  const [preset, setPreset] = useState<PresetKey>('month')
  const [customRange, setCustomRange] = useState<DateRangeValue | null>(null)

  const activeRange = useMemo(() => {
    if (preset === 'custom') {
      return customRange
    }
    return getPresetRange(preset)
  }, [customRange, preset])

  const queryEnabled = Boolean(activeRange)
  const startDate = activeRange?.[0].format('YYYY-MM-DD') ?? ''
  const endDate = activeRange?.[1].format('YYYY-MM-DD') ?? ''

  const financeStatsQuery = useQuery({
    queryKey: ['finance-stats', startDate, endDate],
    queryFn: () => getFinanceStats({ startDate, endDate }),
    enabled: queryEnabled,
  })

  const summary = financeStatsQuery.data?.summary
  const projects = financeStatsQuery.data?.projects ?? []
  const paymentRate = summary && Number(summary.invoiceTotal) > 0
    ? Number(summary.paymentTotal) / Number(summary.invoiceTotal)
    : null

  const columns: ColumnsType<FinanceStatsProjectRow> = [
    {
      title: '项目名称',
      dataIndex: 'projectName',
      render: (_, record) => <Link to={`/projects/${record.projectId}`}>{record.projectName}</Link>,
    },
    { title: '委托单位', dataIndex: 'customer' },
    { title: '合同号', dataIndex: 'contractNo' },
    { title: '区间内开票', dataIndex: 'invoiceAmount', align: 'right', render: formatCurrency },
    { title: '区间内回款', dataIndex: 'paymentAmount', align: 'right', render: formatCurrency },
  ]
  const exportRows = projects.map((project) => ({
    项目名称: project.projectName,
    委托单位: project.customer,
    合同号: project.contractNo,
    区间内开票: formatCurrency(project.invoiceAmount),
    区间内回款: formatCurrency(project.paymentAmount),
  }))

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Finance"
        title="开票回款统计"
        description="按时间区间汇总查看开票、回款及命中项目，适合快速核对资金发生情况。"
      />

      <PageSection title="统计区间" subtitle="支持快捷周期和自定义日期范围，切换后自动刷新。">
        <div className="finance-filter-bar">
          <Segmented<PresetKey>
            options={presetOptions}
            value={preset}
            onChange={(value) => {
              setPreset(value)
              if (value !== 'custom') {
                setCustomRange(null)
              }
            }}
          />
          <LocalizedRangePicker
            value={preset === 'custom' ? customRange : activeRange}
            onChange={(value) => {
              setPreset('custom')
              if (!value || value[0] === null || value[1] === null) {
                setCustomRange(null)
                return
              }
              setCustomRange([value[0], value[1]])
            }}
            allowClear
          />
          {activeRange ? (
            <Tag color="blue">
              {startDate} 至 {endDate}
            </Tag>
          ) : null}
        </div>
        {preset === 'custom' && !customRange ? (
          <Alert showIcon type="info" message="请选择开始和结束日期后查看统计结果。" />
        ) : null}
      </PageSection>

      <div className="summary-strip">
        <FinanceSummaryChip
          icon={<WalletOutlined />}
          label="开票合计"
          value={summary ? formatCompactCurrency(summary.invoiceTotal).compact : '--'}
          detail={summary ? formatCurrency(summary.invoiceTotal) : '等待统计结果'}
        />
        <FinanceSummaryChip
          icon={<DollarOutlined />}
          label="回款合计"
          value={summary ? formatCompactCurrency(summary.paymentTotal).compact : '--'}
          detail={summary ? formatCurrency(summary.paymentTotal) : '等待统计结果'}
        />
        <FinanceSummaryChip
          icon={<BarChartOutlined />}
          label="涉及项目数"
          value={summary ? String(summary.projectCount) : '--'}
          detail="区间内存在开票或回款的项目数"
        />
        <FinanceSummaryChip
          icon={<BarChartOutlined />}
          label="回款/开票比率"
          value={paymentRate === null ? '--' : `${(paymentRate * 100).toFixed(1)}%`}
          detail={paymentRate === null ? '开票为 0 时不计算比率' : '按区间内回款合计 / 开票合计计算'}
        />
      </div>

      <PageSection
        title="项目明细"
        subtitle="仅展示当前区间内命中过开票或回款记录的项目。"
        extra={(
          <div className="table-section-extra">
            <Typography.Text type="secondary">
              共 {projects.length} 个项目
            </Typography.Text>
            <Button
              icon={<DownloadOutlined />}
              onClick={() => {
                downloadCsv({
                  filename: `数据统计-${startDate}-${endDate}.csv`,
                  columns: [
                    { title: '项目名称', render: (row) => row.项目名称 },
                    { title: '委托单位', render: (row) => row.委托单位 },
                    { title: '合同号', render: (row) => row.合同号 },
                    { title: '区间内开票', render: (row) => row.区间内开票 },
                    { title: '区间内回款', render: (row) => row.区间内回款 },
                  ],
                  rows: exportRows,
                })
              }}
              disabled={exportRows.length === 0 || !activeRange}
            >
              导出 CSV
            </Button>
          </div>
        )}
      >
        {financeStatsQuery.isError ? (
          <Alert type="error" showIcon message="统计数据加载失败，请稍后重试。" />
        ) : projects.length === 0 && !financeStatsQuery.isLoading ? (
          <Empty description="当前区间内暂无开票或回款记录" />
        ) : (
          <div className="table-frame">
            <Table
              rowKey="projectId"
              loading={financeStatsQuery.isLoading}
              dataSource={projects}
              columns={columns}
              scroll={{ x: 960 }}
              pagination={buildTablePagination()}
              summary={(rows) => (
                rows.length > 0
                  ? (
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0}>
                          <Typography.Text strong>合计</Typography.Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={1} />
                        <Table.Summary.Cell index={2} />
                        <Table.Summary.Cell index={3} align="right">
                          <Typography.Text strong>
                            {formatCurrency(rows.reduce((sum, row) => sum + Number(row.invoiceAmount), 0))}
                          </Typography.Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={4} align="right">
                          <Typography.Text strong>
                            {formatCurrency(rows.reduce((sum, row) => sum + Number(row.paymentAmount), 0))}
                          </Typography.Text>
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                    )
                  : null
              )}
            />
          </div>
        )}
      </PageSection>
    </div>
  )
}

function FinanceSummaryChip(props: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return (
    <div className="summary-chip finance-summary-chip">
      <div className="finance-summary-chip__top">
        <span className="metric-card__icon finance-summary-chip__icon">{props.icon}</span>
        <span className="summary-chip__label">{props.label}</span>
      </div>
      <Typography.Text strong className="summary-chip__value finance-summary-chip__value">
        {props.value}
      </Typography.Text>
      <Typography.Text type="secondary" className="finance-summary-chip__detail">
        {props.detail}
      </Typography.Text>
    </div>
  )
}

function getPresetRange(preset: Exclude<PresetKey, 'custom'>): DateRangeValue {
  const today = dayjs()

  switch (preset) {
    case 'week': {
      const day = today.day()
      const diffToMonday = day === 0 ? 6 : day - 1
      return [today.subtract(diffToMonday, 'day').startOf('day'), today.add(6 - diffToMonday, 'day').endOf('day')]
    }
    case 'month':
      return [today.startOf('month'), today.endOf('month')]
    case 'quarter': {
      const quarterStartMonth = Math.floor(today.month() / 3) * 3
      const quarterStart = today.month(quarterStartMonth).startOf('month')
      return [quarterStart.startOf('day'), quarterStart.add(2, 'month').endOf('month').endOf('day')]
    }
    case 'year':
      return [today.startOf('year'), today.endOf('year')]
  }
}
