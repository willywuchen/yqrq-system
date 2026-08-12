import { useMemo } from 'react'
import { Card, Row, Col, Statistic, Tag, Table, Typography, Space } from 'antd'
import ReactECharts from 'echarts-for-react'
import {
  TeamOutlined,
  RiseOutlined,
  GlobalOutlined,
} from '@ant-design/icons'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import { useStore } from '../../store'
import { RewardCategoryLabels, StatusLabels, type RewardCategory } from '../../types'
import { BUDGET_TOTAL } from '../../mock/data'
import { formatMoney } from '../../utils'

const { Text } = Typography

export default function Statistics() {
  const { applications } = useStore()

  // 按奖励类别统计
  const categoryStats = useMemo(() => {
    const map: Record<string, { count: number; amount: number }> = {}
    Object.keys(RewardCategoryLabels).forEach((k) => (map[k] = { count: 0, amount: 0 }))
    applications.forEach((a) => {
      if (!map[a.category]) return
      map[a.category].count++
      map[a.category].amount += a.approvedAmount || a.calculatedAmount || 0
    })
    return Object.entries(map).map(([k, v]) => ({
      category: k as RewardCategory,
      label: RewardCategoryLabels[k as RewardCategory],
      ...v,
    }))
  }, [applications])

  // 按状态统计
  const statusStats = useMemo(() => {
    const map: Record<string, number> = {}
    applications.forEach((a) => {
      map[a.status] = (map[a.status] || 0) + 1
    })
    return Object.entries(map).map(([k, v]) => ({ status: k, label: StatusLabels[k as keyof typeof StatusLabels], count: v }))
  }, [applications])

  // 按旅行社统计
  const orgStats = useMemo(() => {
    const map: Record<string, { count: number; amount: number }> = {}
    applications.forEach((a) => {
      if (!map[a.applicantOrg]) map[a.applicantOrg] = { count: 0, amount: 0 }
      map[a.applicantOrg].count++
      map[a.applicantOrg].amount += a.approvedAmount || a.calculatedAmount || 0
    })
    return Object.entries(map)
      .map(([org, v]) => ({ org, ...v }))
      .sort((a, b) => b.amount - a.amount)
  }, [applications])

  // 总览
  const totals = useMemo(() => {
    const totalApps = applications.length
    const totalAmount = applications.reduce((s, a) => s + (a.approvedAmount || a.calculatedAmount || 0), 0)
    const paidAmount = applications
      .filter((a) => a.status === 'paid')
      .reduce((s, a) => s + (a.approvedAmount || 0), 0)
    const totalTourists = applications.reduce((s, a) => s + (a.teamSize || 0), 0)
    const inboundTourists = applications.reduce((s, a) => s + (a.inboundTourists || 0), 0)
    return { totalApps, totalAmount, paidAmount, totalTourists, inboundTourists }
  }, [applications])

  // 按月申报趋势（mock）
  const trendData = useMemo(() => {
    const months = ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12', '2027-01']
    return months.map((m) => ({
      month: m,
      count: applications.filter((a) => (a.submitTime || a.createTime).startsWith(m)).length,
      amount: applications
        .filter((a) => (a.submitTime || a.createTime).startsWith(m))
        .reduce((s, a) => s + (a.approvedAmount || a.calculatedAmount || 0), 0),
    }))
  }, [applications])

  // 图表配置 - 类别分布
  const categoryPieOption = {
    tooltip: { trigger: 'item', formatter: '{b}: {c}项 ({d}%)' },
    legend: { orient: 'vertical', left: 'left', textStyle: { fontSize: 12 } },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['60%', '50%'],
        data: categoryStats.filter((c) => c.count > 0).map((c) => ({ value: c.count, name: c.label })),
        emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' } },
        label: { formatter: '{b}\n{d}%', fontSize: 11 },
      },
    ],
  }

  // 类别金额柱图
  const categoryBarOption = {
    tooltip: { trigger: 'axis', formatter: (p: any) => `${p[0].name}<br/>金额：¥${(p[0].value / 10000).toFixed(2)}万` },
    grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
    xAxis: {
      type: 'category',
      data: categoryStats.map((c) => c.label),
      axisLabel: { interval: 0, rotate: 30, fontSize: 11 },
    },
    yAxis: { type: 'value', name: '金额(元)', axisLabel: { formatter: (v: number) => v / 10000 + '万' } },
    series: [
      {
        type: 'bar',
        data: categoryStats.map((c) => c.amount),
        itemStyle: { color: '#1677ff', borderRadius: [4, 4, 0, 0] },
        barWidth: '50%',
      },
    ],
  }

  // 申报趋势
  const trendOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['申报数量', '奖励金额'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: trendData.map((t) => t.month), boundaryGap: false },
    yAxis: [
      { type: 'value', name: '申报数量', position: 'left' },
      { type: 'value', name: '金额(元)', position: 'right', axisLabel: { formatter: (v: number) => v / 10000 + '万' } },
    ],
    series: [
      {
        name: '申报数量',
        type: 'line',
        data: trendData.map((t) => t.count),
        smooth: true,
        itemStyle: { color: '#1677ff' },
        areaStyle: { opacity: 0.3 },
      },
      {
        name: '奖励金额',
        type: 'line',
        yAxisIndex: 1,
        data: trendData.map((t) => t.amount),
        smooth: true,
        itemStyle: { color: '#52c41a' },
      },
    ],
  }

  // 状态分布
  const statusPieOption = {
    tooltip: { trigger: 'item', formatter: '{b}: {c}项 ({d}%)' },
    legend: { orient: 'horizontal', bottom: 0, textStyle: { fontSize: 11 } },
    series: [
      {
        type: 'pie',
        radius: '60%',
        center: ['50%', '45%'],
        data: statusStats.map((s) => ({ value: s.count, name: s.label })),
        label: { fontSize: 11 },
      },
    ],
  }

  return (
    <>
      <PageHeader
        title="数据统计"
        breadcrumb={[{ title: '首页', path: '/' }, { title: '数据统计' }]}
      />
      <PageContainer>
        {/* 顶部指标 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={4}>
            <Card>
              <Statistic
                title="申报总数"
                value={totals.totalApps}
                suffix="项"
                prefix={<TeamOutlined />}
                valueStyle={{ color: '#1677ff' }}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title="奖励总额"
                value={totals.totalAmount}
                prefix="¥"
                precision={2}
                valueStyle={{ color: '#fa541c' }}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title="已拨付金额"
                value={totals.paidAmount}
                prefix="¥"
                precision={2}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title="预算执行率"
                value={((totals.paidAmount / 10000 / BUDGET_TOTAL) * 100).toFixed(1)}
                suffix="%"
                prefix={<RiseOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title="游客总数"
                value={totals.totalTourists}
                suffix="人次"
                prefix={<GlobalOutlined />}
                valueStyle={{ color: '#13c2c2' }}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title="入境游客数"
                value={totals.inboundTourists}
                suffix="人次"
                valueStyle={{ color: '#eb2f96' }}
              />
            </Card>
          </Col>
        </Row>

        {/* 图表 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <Card title="各类别申报数量分布" size="small">
              <ReactECharts option={categoryPieOption} style={{ height: 320 }} />
            </Card>
          </Col>
          <Col span={12}>
            <Card title="各类别奖励金额对比" size="small">
              <ReactECharts option={categoryBarOption} style={{ height: 320 }} />
            </Card>
          </Col>
        </Row>

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={16}>
            <Card title="申报趋势（按月）" size="small">
              <ReactECharts option={trendOption} style={{ height: 320 }} />
            </Card>
          </Col>
          <Col span={8}>
            <Card title="申报状态分布" size="small">
              <ReactECharts option={statusPieOption} style={{ height: 320 }} />
            </Card>
          </Col>
        </Row>

        {/* 旅行社排名 */}
        <Card title="旅行社申报排名" size="small">
          <Table
            dataSource={orgStats}
            rowKey="org"
            size="small"
            pagination={false}
            columns={[
              {
                title: '排名',
                width: 60,
                render: (_: any, __: any, i: number) => {
                  const colors = ['#f5222d', '#fa8c16', '#fadb14']
                  return <Tag color={i < 3 ? colors[i] : 'default'}>{i + 1}</Tag>
                },
              },
              { title: '旅行社', dataIndex: 'org' },
              { title: '申报数量', dataIndex: 'count', width: 120, render: (v: number) => `${v} 项` },
              {
                title: '奖励金额',
                dataIndex: 'amount',
                width: 160,
                render: (v: number) => (
                  <Space>
                    <Text strong style={{ color: '#fa541c' }}>{formatMoney(v)}</Text>
                    <Tag>{(v / 10000).toFixed(2)}万</Tag>
                  </Space>
                ),
              },
              {
                title: '占比',
                width: 200,
                render: (_: any, r: any) => {
                  const pct = (r.amount / totals.totalAmount) * 100
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, background: '#f0f0f0', height: 8, borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, background: '#1677ff', height: '100%' }} />
                      </div>
                      <Text type="secondary" style={{ fontSize: 12 }}>{pct.toFixed(1)}%</Text>
                    </div>
                  )
                },
              },
            ]}
          />
        </Card>
      </PageContainer>
    </>
  )
}
