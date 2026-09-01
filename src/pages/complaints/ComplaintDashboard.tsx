import { useMemo, useState } from 'react'
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Select,
  DatePicker,
  Space,
  Progress,
  Typography,
} from 'antd'
import {
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import { useStore } from '../../store'
import {
  ComplaintMethodLabels,
  TourismCategoryLabels,
  ComplaintStatusLabels,
  type ComplaintStatus,
  type ComplaintMethod,
  type TourismCategory,
  GUIZHOU_CITIES,
} from '../../types'
import type { ColumnsType } from 'antd/es/table'

const { Text } = Typography
const { RangePicker } = DatePicker

type TimeRange = '7d' | '30d' | 'quarter' | 'year' | 'all' | 'custom'

const TIME_RANGE_OPTIONS = [
  { value: '7d', label: '近 7 天' },
  { value: '30d', label: '近 30 天' },
  { value: 'quarter', label: '本季度' },
  { value: 'year', label: '本年度' },
  { value: 'all', label: '全部' },
  { value: 'custom', label: '自定义' },
]

// 投诉方式饼图配色
const PIE_COLORS = [
  '#1677ff', '#52c41a', '#fa8c16', '#722ed1', '#13c2c2',
  '#eb2f96', '#faad14', '#2f54eb', '#a0d911', '#f5222d',
]

const STATUS_BAR_COLORS: Record<ComplaintStatus, string> = {
  pending: '#bfbfbf',
  processing: '#1677ff',
  reviewing: '#fa8c16',
  replied: '#13c2c2',
  closed: '#52c41a',
  not_accepted: '#ff4d4f',
  transferred: '#722ed1',
}

// CSS 横向条行
function BarRow({ label, count, max, color }: { label: string; count: number; max: number; color?: string }) {
  const percent = max > 0 ? (count / max) * 100 : 0
  const bg = color || 'linear-gradient(90deg, #1677ff, #69b1ff)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
      <div
        title={label}
        style={{ width: 120, flexShrink: 0, fontSize: 13, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
      >
        {label}
      </div>
      <div style={{ flex: 1, background: '#f0f0f0', borderRadius: 4, height: 16, margin: '0 8px' }}>
        <div style={{ width: `${percent}%`, height: '100%', background: bg, borderRadius: 4, transition: 'width 0.3s' }} />
      </div>
      <div style={{ width: 40, flexShrink: 0, fontSize: 13, textAlign: 'right', color: '#666' }}>{count}</div>
    </div>
  )
}

// 饼图组件（SVG）
function PieChart({ data }: { data: { label: string; count: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  if (total === 0) return <Text type="secondary">暂无数据</Text>

  const radius = 70
  const cx = 80
  const cy = 80
  let currentAngle = -Math.PI / 2 // 从顶部开始

  const slices = data.map((d) => {
    const angle = (d.count / total) * Math.PI * 2
    const x1 = cx + radius * Math.cos(currentAngle)
    const y1 = cy + radius * Math.sin(currentAngle)
    const x2 = cx + radius * Math.cos(currentAngle + angle)
    const y2 = cy + radius * Math.sin(currentAngle + angle)
    const largeArc = angle > Math.PI ? 1 : 0
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`
    const midAngle = currentAngle + angle / 2
    const labelX = cx + (radius + 15) * Math.cos(midAngle)
    const labelY = cy + (radius + 15) * Math.sin(midAngle)
    currentAngle += angle
    return { path, color: d.color, label: d.label, count: d.count, percent: (d.count / total) * 100, labelX, labelY }
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <svg width={160} height={160} style={{ flexShrink: 0 }}>
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} stroke="#fff" strokeWidth={1.5} />
        ))}
      </svg>
      <div style={{ flex: 1 }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: 6, fontSize: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color, marginRight: 6, flexShrink: 0 }} />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
            <span style={{ color: '#666', marginLeft: 8 }}>{s.count}件 ({s.percent.toFixed(1)}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// 环形图组件（CSS conic-gradient）
function DonutChart({ data }: { data: { label: string; count: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  if (total === 0) return <Text type="secondary">暂无数据</Text>

  let acc = 0
  const segments = data.map((d) => {
    const start = (acc / total) * 100
    acc += d.count
    const end = (acc / total) * 100
    return { ...d, start, end }
  })

  const gradient = segments
    .map((s) => `${s.color} ${s.start}% ${s.end}%`)
    .join(', ')

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div
        style={{
          width: 130,
          height: 130,
          borderRadius: '50%',
          background: `conic-gradient(${gradient})`,
          position: 'relative',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: '#fff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text strong style={{ fontSize: 22 }}>{total}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>总计</Text>
        </div>
      </div>
      <div style={{ flex: 1 }}>
        {segments.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: 6, fontSize: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color, marginRight: 6, flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{s.label}</span>
            <span style={{ color: '#666', marginLeft: 8 }}>{s.count}件</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// 竖向柱状图组件（高度自适应：绘图区按占比撑满，含基准线与虚线网格，底部标签与柱体对齐）
function VerticalBarChart({ data, minHeight = 220 }: { data: { label: string; count: number; color?: string }[]; minHeight?: number }) {
  const max = Math.max(1, ...data.map((d) => d.count))
  if (data.length === 0 || data.every((d) => d.count === 0)) return <Text type="secondary">暂无数据</Text>

  return (
    <div style={{ flex: 1, minHeight, display: 'flex', flexDirection: 'column' }}>
      {/* 绘图区：柱体高度按数值占比撑满可用高度 */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'flex-end', gap: 8, padding: '0 4px' }}>
        {[0, 50, 100].map((p) => (
          <div
            key={p}
            style={{ position: 'absolute', left: 0, right: 0, bottom: `${p}%`, borderBottom: p === 0 ? '1px solid #e8e8e8' : '1px dashed #f0f0f0' }}
          />
        ))}
        {data.map((d, i) => {
          const pct = Math.max((d.count / max) * 100, 12)
          return (
            <div
              key={i}
              title={`${d.label}：${d.count}件`}
              style={{
                flex: 1,
                minWidth: 0,
                height: `${pct}%`,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                alignItems: 'center',
                position: 'relative',
                zIndex: 1,
              }}
            >
              <Text style={{ fontSize: 12, color: '#666', marginBottom: 2 }}>{d.count}</Text>
              <div
                style={{
                  width: '62%',
                  maxWidth: 40,
                  flex: 1,
                  background: d.color || 'linear-gradient(180deg, #1677ff, #69b1ff)',
                  borderRadius: '4px 4px 0 0',
                  transition: 'height 0.3s',
                }}
              />
            </div>
          )
        })}
      </div>
      {/* 底部标签行：与柱体同分布对齐 */}
      <div style={{ display: 'flex', gap: 8, padding: '6px 4px 0' }}>
        {data.map((d, i) => (
          <div
            key={i}
            title={d.label}
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: 11,
              color: '#666',
              textAlign: 'center',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {d.label}
          </div>
        ))}
      </div>
    </div>
  )
}

// 折线图组件（SVG）
function LineChart({ data }: { data: { label: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count))
  const width = 600
  const height = 200
  const padding = { top: 20, right: 20, bottom: 30, left: 40 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const points = data.map((d, i) => {
    const x = padding.left + (i / Math.max(data.length - 1, 1)) * chartW
    const y = padding.top + chartH - (d.count / max) * chartH
    return { x, y, ...d }
  })

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaD = `${pathD} L ${points[points.length - 1]?.x || 0} ${padding.top + chartH} L ${points[0]?.x || 0} ${padding.top + chartH} Z`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 200 }}>
      {/* 网格线 */}
      {[0, 0.25, 0.5, 0.75, 1].map((r) => {
        const y = padding.top + chartH * r
        return (
          <line key={r} x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#f0f0f0" strokeWidth={1} />
        )
      })}
      {/* 面积 */}
      <path d={areaD} fill="rgba(22, 119, 255, 0.1)" />
      {/* 折线 */}
      <path d={pathD} fill="none" stroke="#1677ff" strokeWidth={2} />
      {/* 数据点 */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={4} fill="#fff" stroke="#1677ff" strokeWidth={2} />
          <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize={11} fill="#333" fontWeight={600}>
            {p.count}
          </text>
        </g>
      ))}
      {/* X轴标签 */}
      {points.map((p, i) => (
        <text key={i} x={p.x} y={height - 8} textAnchor="middle" fontSize={11} fill="#999">
          {p.label}
        </text>
      ))}
      {/* Y轴标签 */}
      {[0, 0.5, 1].map((r) => {
        const y = padding.top + chartH * r
        const val = Math.round(max * (1 - r))
        return (
          <text key={r} x={padding.left - 8} y={y + 4} textAnchor="end" fontSize={11} fill="#999">
            {val}
          </text>
        )
      })}
    </svg>
  )
}

export default function ComplaintDashboard() {
  const complaints = useStore((s) => s.complaints)

  const [range, setRange] = useState<TimeRange>('all')
  const [customRange, setCustomRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [city, setCity] = useState<string>('全部')

  const rangeStart = useMemo<Dayjs | null>(() => {
    const now = dayjs()
    switch (range) {
      case '7d': return now.subtract(7, 'day')
      case '30d': return now.subtract(30, 'day')
      case 'quarter': {
        const qStartMonth = Math.floor(now.month() / 3) * 3
        return now.month(qStartMonth).startOf('month')
      }
      case 'year': return now.startOf('year')
      default: return null
    }
  }, [range])

  const filtered = useMemo(() => {
    return complaints.filter((c) => {
      if (city !== '全部' && c.city !== city) return false
      if (range === 'all') return true
      if (range === 'custom') {
        if (!customRange) return true
        const [start, end] = customRange
        const t = dayjs(c.complaintTime)
        return !t.isBefore(start.startOf('day')) && !t.isAfter(end.endOf('day'))
      }
      if (!rangeStart) return true
      return !dayjs(c.complaintTime).isBefore(rangeStart)
    })
  }, [complaints, city, range, rangeStart, customRange])

  // ===== 核心指标（3个，去掉平均办理时长）=====
  const coreMetrics = useMemo(() => {
    const total = filtered.length
    const pending = filtered.filter((c) => ['pending', 'processing', 'reviewing'].includes(c.status)).length
    const closedCount = filtered.filter((c) => c.status === 'closed').length
    const closedRate = total > 0 ? (closedCount / total) * 100 : 0
    return { total, pending, closedCount, closedRate }
  }, [filtered])

  // ===== 投诉方式分布（饼图）=====
  const methodStats = useMemo(() => {
    const map = new Map<ComplaintMethod, number>()
    Object.keys(ComplaintMethodLabels).forEach((k) => map.set(k as ComplaintMethod, 0))
    filtered.forEach((c) => map.set(c.complaintMethod, (map.get(c.complaintMethod) || 0) + 1))
    return Array.from(map.entries())
      .map(([k, v], i) => ({ method: k, label: ComplaintMethodLabels[k], count: v, color: PIE_COLORS[i % PIE_COLORS.length] }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count)
  }, [filtered])

  // ===== 投诉类别分布（横向柱状图）=====
  const categoryStats = useMemo(() => {
    const map = new Map<TourismCategory, number>()
    Object.keys(TourismCategoryLabels).forEach((k) => map.set(k as TourismCategory, 0))
    filtered.forEach((c) => map.set(c.tourismCategory, (map.get(c.tourismCategory) || 0) + 1))
    return Array.from(map.entries())
      .map(([k, v]) => ({ category: k, label: TourismCategoryLabels[k], count: v }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count)
  }, [filtered])

  // ===== 区域分布（竖向柱状图）=====
  const cityStats = useMemo(() => {
    const map = new Map<string, number>()
    filtered.forEach((c) => {
      const cityName = c.city || '未知'
      map.set(cityName, (map.get(cityName) || 0) + 1)
    })
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [filtered])

  // ===== 处理状态分布（环形图）=====
  const statusStats = useMemo(() => {
    const map = new Map<ComplaintStatus, number>()
    Object.keys(ComplaintStatusLabels).forEach((k) => map.set(k as ComplaintStatus, 0))
    filtered.forEach((c) => map.set(c.status, (map.get(c.status) || 0) + 1))
    return Array.from(map.entries())
      .map(([k, v]) => ({
        status: k,
        label: ComplaintStatusLabels[k],
        count: v,
        color: STATUS_BAR_COLORS[k],
      }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count)
  }, [filtered])

  // ===== 投诉数量趋势（近6个月，按月统计）=====
  const trendStats = useMemo(() => {
    const now = dayjs()
    const months: { label: string; key: string }[] = []
    for (let i = 5; i >= 0; i--) {
      const m = now.subtract(i, 'month')
      months.push({ label: m.format('YYYY-MM'), key: m.format('YYYY-MM') })
    }
    return months.map((m) => {
      const count = complaints.filter((c) => {
        if (city !== '全部' && c.city !== city) return false
        return dayjs(c.complaintTime).format('YYYY-MM') === m.key
      }).length
      return { label: m.label.substring(5), count }
    })
  }, [complaints, city])

  // ===== 高发被投诉人 Top 10（去掉办结率）=====
  interface RespondentStat {
    key: string
    name: string
    count: number
    categories: TourismCategory[]
    lastComplaintTime: string
  }

  const respondentStats = useMemo<RespondentStat[]>(() => {
    const map = new Map<string, { name: string; count: number; categories: Set<TourismCategory>; lastComplaintTime: string }>()
    filtered.forEach((c) => {
      const name = c.respondent?.name || '未知'
      if (!map.has(name)) {
        map.set(name, { name, count: 0, categories: new Set(), lastComplaintTime: '' })
      }
      const s = map.get(name)!
      s.count++
      if (c.tourismCategory) s.categories.add(c.tourismCategory)
      if (!s.lastComplaintTime || c.complaintTime > s.lastComplaintTime) s.lastComplaintTime = c.complaintTime
    })
    return Array.from(map.values())
      .map((s) => ({
        key: s.name,
        name: s.name,
        count: s.count,
        categories: Array.from(s.categories),
        lastComplaintTime: s.lastComplaintTime,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [filtered])

  const respondentColumns: ColumnsType<RespondentStat> = [
    { title: '排名', width: 70, render: (_, __, index) => index + 1 },
    { title: '被投诉人', dataIndex: 'name', width: 200 },
    { title: '投诉次数', dataIndex: 'count', width: 100, sorter: (a, b) => a.count - b.count },
    {
      title: '涉及类别',
      dataIndex: 'categories',
      render: (cats: TourismCategory[]) => (
        <Space wrap size={[4, 4]}>
          {cats.map((c) => (
            <Tag key={c} color="blue">{TourismCategoryLabels[c]}</Tag>
          ))}
        </Space>
      ),
    },
    { title: '最近投诉时间', dataIndex: 'lastComplaintTime', width: 170 },
  ]

  const categoryMax = Math.max(1, ...categoryStats.map((m) => m.count))

  return (
    <>
      <PageHeader
        title="数据看板"
        breadcrumb={[
          { title: '首页', path: '/' },
          { title: '投诉台账', path: '/complaints' },
          { title: '数据看板' },
        ]}
      />
      <PageContainer>
        {/* 筛选条 */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space wrap size="large">
            <Space>
              <Text type="secondary">时间范围：</Text>
              <Select<TimeRange> value={range} onChange={setRange} options={TIME_RANGE_OPTIONS} style={{ width: 120 }} />
              {range === 'custom' && (
                <RangePicker
                  value={customRange ?? undefined}
                  onChange={(vals) => setCustomRange(vals as [Dayjs, Dayjs] | null)}
                  placeholder={['开始日期', '结束日期']}
                />
              )}
            </Space>
            <Space>
              <Text type="secondary">区域：</Text>
              <Select
                value={city}
                onChange={setCity}
                style={{ width: 200 }}
                options={[{ value: '全部', label: '全部' }, ...GUIZHOU_CITIES.map((c) => ({ value: c, label: c }))]}
              />
            </Space>
            <Text type="secondary">
              共筛选到 <Text strong>{filtered.length}</Text> 条投诉
            </Text>
          </Space>
        </Card>

        {/* Section 1 - 核心指标（3个卡片，等高）*/}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Card style={{ height: '100%' }}>
              <Statistic
                title="投诉总量"
                value={coreMetrics.total}
                suffix="件"
                prefix={<FileTextOutlined />}
                valueStyle={{ color: '#1677ff' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card style={{ height: '100%' }}>
              <Statistic
                title="待办投诉数"
                value={coreMetrics.pending}
                suffix="件"
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card style={{ height: '100%' }}>
              <Statistic
                title="已办结数"
                value={coreMetrics.closedCount}
                suffix="件"
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  办结率 {coreMetrics.closedRate.toFixed(1)}%
                </Text>
                <Progress percent={Number(coreMetrics.closedRate.toFixed(1))} size="small" status="success" showInfo={false} />
              </div>
            </Card>
          </Col>
        </Row>

        {/* Section 2 - 投诉数量趋势（近6个月折线图）*/}
        <Card title="投诉数量趋势（近6个月）" size="small" style={{ marginBottom: 16 }}>
          <LineChart data={trendStats} />
        </Card>

        {/* Section 3 - 分布分析（4种不同可视化）*/}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <Card title="投诉方式分布" size="small" style={{ height: '100%' }}>
              <PieChart data={methodStats} />
            </Card>
          </Col>
          <Col span={12}>
            <Card title="处理状态分布" size="small" style={{ height: '100%' }}>
              <DonutChart data={statusStats} />
            </Card>
          </Col>
        </Row>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={12} style={{ display: 'flex' }}>
            <Card
              title="区域分布"
              size="small"
              style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}
              styles={{ body: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' } }}
            >
              <VerticalBarChart data={cityStats.map((c) => ({ label: c.name.replace(/布依族苗族自治州|苗族侗族自治州|市/g, ''), count: c.count }))} />
            </Card>
          </Col>
          <Col span={12} style={{ display: 'flex' }}>
            <Card title="投诉类别分布" size="small" style={{ width: '100%', height: '100%' }}>
              {categoryStats.length === 0 ? (
                <Text type="secondary">暂无数据</Text>
              ) : (
                categoryStats.map((m) => (
                  <BarRow key={m.category} label={m.label} count={m.count} max={categoryMax} />
                ))
              )}
            </Card>
          </Col>
        </Row>

        {/* Section 4 - 高发被投诉人 Top 10（去掉办结率）*/}
        <Card title="高发被投诉人 Top 10" size="small">
          <Table<RespondentStat>
            rowKey="key"
            columns={respondentColumns}
            dataSource={respondentStats}
            pagination={false}
            size="small"
            locale={{ emptyText: '暂无数据' }}
          />
        </Card>
      </PageContainer>
    </>
  )
}
