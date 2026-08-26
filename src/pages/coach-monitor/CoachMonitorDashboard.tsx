import { useMemo } from 'react'
import { Card, Row, Col, Statistic, Tag, Table, Space, Button, Segmented } from 'antd'
import { CarOutlined, WarningOutlined, ClockCircleOutlined, InboxOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import { useStore } from '../../store'
import {
  RegionLevelLabels,
  EventStatusLabels,
  EventStatusColors,
  RiskLevelLabels,
  RiskLevelColors,
  ViolationCategoryLabels,
  type RegionLevel,
  type RiskEvent,
} from '../../types/coach-monitor'
import { filterVehicles, filterEvents, onlineVehicleCount, todayEventCount } from '../../utils/coach-monitor'

/**
 * 监管看板 - 进入模块默认页
 * 布局结构（自上而下）：
 * 1. 顶部 4 个统计卡片：在线车辆 / 今日预警 / 待核查 / 已归档
 * 2. 今日风险预警 Top10 表格 + 近 30 天风险事件趋势
 * 3. 违规 TOP 旅行社 + 按区域分布
 * 4. 事件状态分布 + 违规类别分布 + 风险等级分布（三列均分）
 * 含：省/市/县三级权限切换器（演示用）
 */
export default function CoachMonitorDashboard() {
  const navigate = useNavigate()
  const {
    coachRegionLevel,
    setCoachRegionLevel,
    vehicles,
    riskEvents,
  } = useStore()

  const visibleVehicles = useMemo(
    () => filterVehicles(vehicles, coachRegionLevel),
    [vehicles, coachRegionLevel],
  )
  const visibleEvents = useMemo(
    () => filterEvents(riskEvents, coachRegionLevel),
    [riskEvents, coachRegionLevel],
  )

  // 统计卡片
  const onlineCount = onlineVehicleCount(visibleVehicles)
  const todayCount = todayEventCount(visibleEvents)
  const pendingCount = visibleEvents.filter((e) => e.status === 'pending').length
  const archivedCount = visibleEvents.filter((e) => e.status === 'archived').length

  // 今日预警 Top10（按时间倒序）
  const topEvents = useMemo(
    () =>
      [...visibleEvents]
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
        .slice(0, 10),
    [visibleEvents],
  )

  // 近 30 天事件趋势
  const trendOption = useMemo(() => {
    const days = 30
    const buckets: { date: string; count: number }[] = []
    const today = new Date()
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      buckets.push({ date: key, count: 0 })
    }
    visibleEvents.forEach((e) => {
      const day = e.occurredAt.slice(0, 10)
      const b = buckets.find((x) => x.date === day)
      if (b) b.count++
    })
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 40, right: 20, top: 30, bottom: 30 },
      xAxis: {
        type: 'category',
        data: buckets.map((b) => b.date.slice(5)),
        axisLabel: { fontSize: 10 },
      },
      yAxis: { type: 'value', minInterval: 1 },
      series: [
        {
          name: '风险事件',
          type: 'line',
          smooth: true,
          areaStyle: { opacity: 0.2 },
          data: buckets.map((b) => b.count),
          itemStyle: { color: '#1677ff' },
        },
      ],
    }
  }, [visibleEvents])

  // 违规 TOP 旅行社
  const agencyOption = useMemo(() => {
    const confirmed = visibleEvents.filter((e) => e.status === 'confirmed' || e.status === 'archived')
    const grouped: Record<string, number> = {}
    confirmed.forEach((e) => {
      grouped[e.travelAgencyName] = (grouped[e.travelAgencyName] || 0) + 1
    })
    const sorted = Object.entries(grouped)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 100, right: 20, top: 20, bottom: 30 },
      xAxis: { type: 'value', minInterval: 1 },
      yAxis: {
        type: 'category',
        data: sorted.map((x) => x[0]),
        axisLabel: { fontSize: 11 },
      },
      series: [
        {
          type: 'bar',
          data: sorted.map((x) => x[1]),
          itemStyle: { color: '#fa541c' },
        },
      ],
    }
  }, [visibleEvents])

  // 事件状态分布（环形图）
  const statusOption = useMemo(() => {
    const entries = Object.entries(EventStatusLabels) as [RiskEvent['status'], string][]
    const data = entries
      .map(([k, label]) => ({
        name: label,
        value: visibleEvents.filter((e) => e.status === k).length,
      }))
      .filter((d) => d.value > 0)
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { bottom: 0, type: 'scroll' as const },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          label: { formatter: '{b}\n{c}', fontSize: 11 },
          data,
          color: ['#faad14', '#f5222d', '#bfbfbf', '#1677ff', '#52c41a'],
        },
      ],
    }
  }, [visibleEvents])

  // 违规类别分布（柱状图）
  const categoryOption = useMemo(() => {
    const entries = Object.entries(ViolationCategoryLabels) as [RiskEvent['category'], string][]
    const data = entries.map(([k, label]) => ({
      name: label,
      value: visibleEvents.filter((e) => e.category === k).length,
    }))
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 40, right: 20, top: 20, bottom: 50 },
      xAxis: {
        type: 'category',
        data: data.map((d) => d.name),
        axisLabel: { fontSize: 11, interval: 0, rotate: 20 },
      },
      yAxis: { type: 'value', minInterval: 1 },
      series: [
        {
          type: 'bar',
          data: data.map((d) => d.value),
          itemStyle: { color: '#fa541c' },
          barMaxWidth: 40,
        },
      ],
    }
  }, [visibleEvents])

  // 风险等级分布（饼图）
  const riskOption = useMemo(() => {
    const entries = Object.entries(RiskLevelLabels) as [RiskEvent['riskLevel'], string][]
    const data = entries.map(([k, label], i) => ({
      name: label,
      value: visibleEvents.filter((e) => e.riskLevel === k).length,
      itemStyle: { color: (['#f5222d', '#faad14', '#1677ff'] as const)[i] },
    }))
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { bottom: 0, type: 'scroll' as const },
      series: [
        {
          type: 'pie',
          radius: '60%',
          label: { formatter: '{b}\n{c}', fontSize: 11 },
          data,
        },
      ],
    }
  }, [visibleEvents])

  // 按区域分布（横向柱状图）
  const regionOption = useMemo(() => {
    const grouped: Record<string, number> = {}
    visibleEvents.forEach((e) => {
      grouped[e.regionName] = (grouped[e.regionName] || 0) + 1
    })
    const sorted = Object.entries(grouped).sort((a, b) => b[1] - a[1])
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 120, right: 20, top: 20, bottom: 30 },
      xAxis: { type: 'value', minInterval: 1 },
      yAxis: {
        type: 'category',
        data: sorted.map((x) => x[0]),
        axisLabel: { fontSize: 11 },
      },
      series: [
        {
          type: 'bar',
          data: sorted.map((x) => x[1]),
          itemStyle: { color: '#1677ff' },
          barMaxWidth: 20,
        },
      ],
    }
  }, [visibleEvents])

  const eventColumns = [
    {
      title: '事件编号',
      dataIndex: 'eventId',
      width: 160,
      render: (id: string) => (
        <a onClick={() => navigate(`/coach-monitor/events/${id}`)}>{id}</a>
      ),
    },
    {
      title: '发生时间',
      dataIndex: 'occurredAt',
      width: 160,
      render: (v: string) => v || '-',
    },
    { title: '车牌', dataIndex: 'plateNo', width: 110 },
    {
      title: '旅行社',
      dataIndex: 'travelAgencyName',
      ellipsis: true,
      width: 200,
    },
    {
      title: '违规类别',
      dataIndex: 'category',
      width: 110,
      render: (c: RiskEvent['category']) => ViolationCategoryLabels[c],
    },
    {
      title: '风险等级',
      dataIndex: 'riskLevel',
      width: 90,
      render: (l: RiskEvent['riskLevel']) => (
        <Tag color={RiskLevelColors[l]}>{RiskLevelLabels[l]}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (s: RiskEvent['status']) => (
        <Tag color={EventStatusColors[s]}>{EventStatusLabels[s]}</Tag>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="旅游包车智慧监管 · 监管看板"
        breadcrumb={[{ title: '首页', path: '/' }, { title: '旅游包车智慧监管' }, { title: '看板' }]}
        extra={
          <Space>
            <span style={{ fontSize: 12, color: '#999' }}>当前监管层级：</span>
            <Segmented
              size="small"
              value={coachRegionLevel}
              onChange={(v) => setCoachRegionLevel(v as RegionLevel)}
              options={(['province', 'city', 'county'] as RegionLevel[]).map((l) => ({
                value: l,
                label: RegionLevelLabels[l],
              }))}
            />
            <Button onClick={() => navigate('/coach-monitor/vehicles')}>车辆档案</Button>
            <Button onClick={() => navigate('/coach-monitor/events')}>全部事件</Button>
          </Space>
        }
      />
      <PageContainer>
        <div style={{ padding: 16 }}>
          {/* 第一行：顶部 4 个统计卡片 */}
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="在线车辆"
                  value={onlineCount}
                  prefix={<CarOutlined style={{ color: '#1677ff' }} />}
                  suffix={`/ ${visibleVehicles.length}`}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="今日预警"
                  value={todayCount}
                  prefix={<WarningOutlined style={{ color: '#fa541c' }} />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="待核查"
                  value={pendingCount}
                  prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="已归档"
                  value={archivedCount}
                  prefix={<InboxOutlined style={{ color: '#52c41a' }} />}
                />
              </Card>
            </Col>
          </Row>

          {/* 第二行：今日预警 Top10 + 事件趋势 */}
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} lg={12}>
              <Card title="今日风险预警（Top 10）" size="small" style={{ height: '100%' }}>
                <Table
                  size="small"
                  rowKey="eventId"
                  columns={eventColumns}
                  dataSource={topEvents}
                  pagination={false}
                  scroll={{ x: 1000 }}
                  locale={{ emptyText: '今日暂无风险预警' }}
                />
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="风险事件趋势（近 30 天）" size="small" style={{ height: '100%' }}>
                <ReactECharts option={trendOption} style={{ height: 260 }} />
              </Card>
            </Col>
          </Row>

          {/* 第三行：违规 TOP 旅行社 + 按区域分布 */}
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} lg={12}>
              <Card title="违规 TOP 旅行社" size="small" style={{ height: '100%' }}>
                <ReactECharts option={agencyOption} style={{ height: 260 }} />
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="按区域分布" size="small" style={{ height: '100%' }}>
                <ReactECharts option={regionOption} style={{ height: 260 }} />
              </Card>
            </Col>
          </Row>

          {/* 第四行：事件状态分布 + 违规类别分布 + 风险等级分布（三列均分） */}
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} md={8}>
              <Card title="事件状态分布" size="small" style={{ height: '100%' }}>
                <ReactECharts option={statusOption} style={{ height: 260 }} />
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card title="违规类别分布" size="small" style={{ height: '100%' }}>
                <ReactECharts option={categoryOption} style={{ height: 260 }} />
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card title="风险等级分布" size="small" style={{ height: '100%' }}>
                <ReactECharts option={riskOption} style={{ height: 260 }} />
              </Card>
            </Col>
          </Row>
        </div>
      </PageContainer>
    </>
  )
}
