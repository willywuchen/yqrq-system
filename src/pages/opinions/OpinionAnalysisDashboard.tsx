import { useMemo, useState } from 'react'
import {
  Card,
  Row,
  Col,
  Statistic,
  Tag,
  Select,
  DatePicker,
  Space,
  Progress,
  Typography,
  Table,
  Empty,
} from 'antd'
import {
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import { useStore } from '../../store'
import {
  OpinionDataSourceLabels,
  OpinionRiskLevelLabels,
  OpinionRiskLevelColors,
  OpinionHandleStatusLabels,
  OpinionHandleStatusColors,
  TourismCategoryLabels,
  GUIZHOU_CITIES,
  type OpinionDataSource,
  type OpinionRiskLevel,
  type OpinionHandleStatus,
  type TourismCategory,
  type PublicOpinion,
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

const PIE_COLORS = [
  '#1677ff', '#52c41a', '#fa8c16', '#722ed1', '#13c2c2',
  '#eb2f96', '#faad14', '#2f54eb', '#a0d911', '#f5222d',
]

const RISK_COLORS: Record<OpinionRiskLevel, string> = {
  low: '#1677ff',
  medium: '#fa8c16',
  high: '#f5222d',
  critical: '#722ed1',
}

// ===== 图表组件（与 ComplaintDashboard 复用模式）=====

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

function PieChart({ data }: { data: { label: string; count: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  if (total === 0) return <Empty description="暂无数据" />

  const radius = 70
  const cx = 80
  const cy = 80
  let currentAngle = -Math.PI / 2

  const slices = data.map((d) => {
    const angle = (d.count / total) * Math.PI * 2
    const x1 = cx + radius * Math.cos(currentAngle)
    const y1 = cy + radius * Math.sin(currentAngle)
    const x2 = cx + radius * Math.cos(currentAngle + angle)
    const y2 = cy + radius * Math.sin(currentAngle + angle)
    const largeArc = angle > Math.PI ? 1 : 0
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`
    currentAngle += angle
    return { path, color: d.color, label: d.label, count: d.count, percent: (d.count / total) * 100 }
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
            <span style={{ color: '#666', marginLeft: 8 }}>{s.count}条 ({s.percent.toFixed(1)}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function DonutChart({ data }: { data: { label: string; count: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  if (total === 0) return <Empty description="暂无数据" />

  let acc = 0
  const segments = data.map((d) => {
    const start = (acc / total) * 100
    acc += d.count
    const end = (acc / total) * 100
    return { ...d, start, end }
  })

  const gradient = segments.map((s) => `${s.color} ${s.start}% ${s.end}%`).join(', ')

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
            <span style={{ color: '#666', marginLeft: 8 }}>{s.count}条</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function VerticalBarChart({ data }: { data: { label: string; count: number; color?: string }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count))
  if (data.length === 0 || data.every((d) => d.count === 0)) return <Empty description="暂无数据" />

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: 180, padding: '0 8px', gap: 4 }}>
      {data.map((d, i) => {
        const h = (d.count / max) * 140
        return (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>{d.count}</Text>
            <div
              style={{
                width: '60%',
                maxWidth: 40,
                height: Math.max(h, 2),
                background: d.color || 'linear-gradient(180deg, #1677ff, #69b1ff)',
                borderRadius: '4px 4px 0 0',
                transition: 'height 0.3s',
              }}
            />
            <div
              title={d.label}
              style={{
                fontSize: 11,
                color: '#666',
                marginTop: 6,
                textAlign: 'center',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                width: '100%',
              }}
            >
              {d.label}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// 折线图组件（舆情数趋势）
function LineChart({ data }: { data: { label: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count))
  const width = 600
  const height = 220
  const padding = { top: 20, right: 20, bottom: 30, left: 40 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const points = data.map((d, i) => {
    const x = padding.left + (i / Math.max(data.length - 1, 1)) * chartW
    const y = padding.top + chartH - (d.count / max) * chartH
    return { x, y, ...d }
  })

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  return (
    <div>
      <div style={{ marginBottom: 8, textAlign: 'center' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          <span style={{ width: 12, height: 2, background: '#f5222d', display: 'inline-block', marginRight: 4 }} />
          舆情数
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 220 }}>
        {/* 网格线 */}
        {[0, 0.25, 0.5, 0.75, 1].map((r) => {
          const y = padding.top + chartH * r
          return <line key={r} x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#f0f0f0" strokeWidth={1} />
        })}
        {/* 舆情折线 */}
        <path d={path} fill="none" stroke="#f5222d" strokeWidth={2} />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3} fill="#fff" stroke="#f5222d" strokeWidth={2} />
            <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize={10} fill="#f5222d" fontWeight={600}>
              {p.count}
            </text>
          </g>
        ))}
        {/* X轴 */}
        {data.map((d, i) => {
          const x = padding.left + (i / Math.max(data.length - 1, 1)) * chartW
          return (
            <text key={i} x={x} y={height - 8} textAnchor="middle" fontSize={11} fill="#999">
              {d.label}
            </text>
          )
        })}
        {/* Y轴 */}
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
    </div>
  )
}

// 词云组件（按频次绘制 Top 关键词，字体大小反映频次）
function WordCloud({ data }: { data: { word: string; count: number }[] }) {
  if (data.length === 0 || data.every((d) => d.count === 0)) return <Empty description="暂无数据" />
  const max = Math.max(...data.map((d) => d.count))
  const min = Math.min(...data.map((d) => d.count))
  const palette = ['#1677ff', '#f5222d', '#fa8c16', '#722ed1', '#13c2c2', '#eb2f96', '#52c41a']

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', alignItems: 'center', justifyContent: 'center', padding: 8, minHeight: 180 }}>
      {data.map((d, i) => {
        const ratio = max === min ? 0.6 : (d.count - min) / (max - min)
        const fontSize = 12 + ratio * 18
        const color = palette[i % palette.length]
        return (
          <span
            key={d.word}
            title={`${d.word}：${d.count} 次`}
            style={{
              fontSize,
              color,
              fontWeight: ratio > 0.5 ? 600 : 400,
              cursor: 'default',
              padding: '2px 4px',
            }}
          >
            {d.word}
          </span>
        )
      })}
    </div>
  )
}

// 停用词
const STOP_WORDS = new Set([
  '的', '了', '是', '我', '在', '有', '和', '就', '不', '人', '都', '一', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '那', '它', '他', '她',
])

export default function OpinionAnalysisDashboard() {
  const navigate = useNavigate()
  const { publicOpinions } = useStore()

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

  // 舆情过滤
  const filteredOpinions = useMemo(() => {
    return publicOpinions.filter((o) => {
      if (city !== '全部' && o.authorLocation !== city) return false
      if (range === 'all') return true
      if (range === 'custom') {
        if (!customRange) return true
        const [start, end] = customRange
        const t = dayjs(o.publishTime)
        return !t.isBefore(start.startOf('day')) && !t.isAfter(end.endOf('day'))
      }
      if (!rangeStart) return true
      return !dayjs(o.publishTime).isBefore(rangeStart)
    })
  }, [publicOpinions, city, range, rangeStart, customRange])

  // ===== KPI 卡片 =====
  const kpiMetrics = useMemo(() => {
    const totalOpinion = filteredOpinions.length
    const pendingOpinion = filteredOpinions.filter((o) =>
      ['pending', 'processing'].includes(o.handleStatus),
    ).length
    return {
      totalOpinion,
      pendingOpinion,
    }
  }, [filteredOpinions])

  // ===== 维度一：时间趋势（近 6 个月）=====
  const trendStats = useMemo(() => {
    const now = dayjs()
    const months: { label: string; key: string }[] = []
    for (let i = 5; i >= 0; i--) {
      const m = now.subtract(i, 'month')
      months.push({ label: m.format('YYYY-MM'), key: m.format('YYYY-MM') })
    }
    return months.map((m) => {
      const opinionCount = publicOpinions.filter((o) => {
        if (city !== '全部' && o.authorLocation !== city) return false
        return dayjs(o.publishTime).format('YYYY-MM') === m.key
      }).length
      return { label: m.label.substring(5), count: opinionCount }
    })
  }, [publicOpinions, city])

  // ===== 维度二：地域分布（9 市州柱状）=====
  const cityStats = useMemo(() => {
    const map = new Map<string, number>()
    GUIZHOU_CITIES.forEach((c) => map.set(c, 0))
    filteredOpinions.forEach((o) => {
      const cityName = o.authorLocation || '未知'
      map.set(cityName, (map.get(cityName) || 0) + 1)
    })
    return Array.from(map.entries())
      .map(([name, opinion]) => ({ name, opinion }))
      .filter((d) => d.opinion > 0)
      .sort((a, b) => b.opinion - a.opinion)
  }, [filteredOpinions])

  // ===== 维度三：关键词词云 =====
  const keywordStats = useMemo(() => {
    const map = new Map<string, number>()
    filteredOpinions.forEach((o) => {
      (o.keywords || []).forEach((k) => {
        if (!STOP_WORDS.has(k) && k.length > 1) {
          map.set(k, (map.get(k) || 0) + 1)
        }
      })
    })
    return Array.from(map.entries())
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 30)
  }, [filteredOpinions])

  // ===== 维度四：旅游类别分布 =====
  const categoryStats = useMemo(() => {
    const map = new Map<TourismCategory, number>()
    Object.keys(TourismCategoryLabels).forEach((k) => map.set(k as TourismCategory, 0))
    filteredOpinions.forEach((o) => {
      map.set(o.tourismCategory, (map.get(o.tourismCategory) || 0) + 1)
    })
    return Array.from(map.entries())
      .map(([k, v]) => ({
        category: k,
        label: TourismCategoryLabels[k],
        count: v,
      }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count)
  }, [filteredOpinions])
  const categoryMax = Math.max(1, ...categoryStats.map((c) => c.count))

  // ===== 维度五：数据来源分布 =====
  const dataSourceStats = useMemo(() => {
    const map = new Map<OpinionDataSource, number>()
    Object.keys(OpinionDataSourceLabels).forEach((k) => map.set(k as OpinionDataSource, 0))
    filteredOpinions.forEach((o) => map.set(o.dataSource, (map.get(o.dataSource) || 0) + 1))
    return Array.from(map.entries())
      .map(([k, v], i) => ({
        label: OpinionDataSourceLabels[k],
        count: v,
        color: PIE_COLORS[i % PIE_COLORS.length],
      }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count)
  }, [filteredOpinions])

  // ===== 维度六：风险等级分布 =====
  const riskStats = useMemo(() => {
    const map = new Map<OpinionRiskLevel, number>()
    Object.keys(OpinionRiskLevelLabels).forEach((k) => map.set(k as OpinionRiskLevel, 0))
    filteredOpinions.forEach((o) => map.set(o.riskLevel, (map.get(o.riskLevel) || 0) + 1))
    return Array.from(map.entries())
      .map(([k, v]) => ({
        riskLevel: k,
        label: OpinionRiskLevelLabels[k],
        count: v,
        color: RISK_COLORS[k],
      }))
  }, [filteredOpinions])

  // ===== 维度七：处置效能 =====
  const handleStats = useMemo(() => {
    const map = new Map<OpinionHandleStatus, number>()
    Object.keys(OpinionHandleStatusLabels).forEach((k) => map.set(k as OpinionHandleStatus, 0))
    filteredOpinions.forEach((o) => map.set(o.handleStatus, (map.get(o.handleStatus) || 0) + 1))
    const total = filteredOpinions.length
    const handledCount = map.get('handled') || 0
    const handleRate = total > 0 ? (handledCount / total) * 100 : 0
    return {
      distribution: Array.from(map.entries()).map(([k, v]) => ({
        handleStatus: k,
        label: OpinionHandleStatusLabels[k],
        count: v,
        color: OpinionHandleStatusColors[k] === 'success' ? '#52c41a' : OpinionHandleStatusColors[k] === 'processing' ? '#1677ff' : '#bfbfbf',
      })),
      handleRate,
      handledCount,
      total,
    }
  }, [filteredOpinions])

  // ===== 维度八：传播来源网站 =====
  const sourceWebsiteStats = useMemo(() => {
    const map = new Map<string, number>()
    filteredOpinions.forEach((o) => {
      const site = o.sourceWebsite || '未知'
      map.set(site, (map.get(site) || 0) + 1)
    })
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [filteredOpinions])

  // 高风险舆情清单（高/极高等级，按发布时间倒序）
  const highRiskOpinions = useMemo(() => {
    return filteredOpinions
      .filter((o) => ['high', 'critical'].includes(o.riskLevel))
      .sort((a, b) => dayjs(b.publishTime).valueOf() - dayjs(a.publishTime).valueOf())
      .slice(0, 10)
  }, [filteredOpinions])

  const highRiskColumns: ColumnsType<PublicOpinion> = [
    { title: '编号', dataIndex: 'id', width: 150, render: (id: string) => <a onClick={() => navigate(`/public-opinion/${id}`)}>{id}</a> },
    { title: '标题', dataIndex: 'title', ellipsis: true },
    {
      title: '风险',
      dataIndex: 'riskLevel',
      width: 90,
      render: (r: OpinionRiskLevel) => <Tag color={OpinionRiskLevelColors[r]}>{OpinionRiskLevelLabels[r]}</Tag>,
    },
    {
      title: '处置',
      dataIndex: 'handleStatus',
      width: 100,
      render: (s: OpinionHandleStatus) => <Tag color={OpinionHandleStatusColors[s]}>{OpinionHandleStatusLabels[s]}</Tag>,
    },
    { title: '发布时间', dataIndex: 'publishTime', width: 150 },
  ]

  return (
    <>
      <PageHeader
        title="舆情分析"
        breadcrumb={[
          { title: '首页', path: '/' },
          { title: '舆情管理分析' },
          { title: '舆情分析' },
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
              共筛选到 <Text strong>{filteredOpinions.length}</Text> 条舆情
            </Text>
          </Space>
        </Card>

        {/* KPI 卡片 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Card style={{ height: '100%' }}>
              <Statistic
                title="舆情总量"
                value={kpiMetrics.totalOpinion}
                suffix="条"
                prefix={<FileTextOutlined />}
                valueStyle={{ color: '#1677ff' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card style={{ height: '100%' }}>
              <Statistic
                title="待处置舆情"
                value={kpiMetrics.pendingOpinion}
                suffix="条"
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card style={{ height: '100%' }}>
              <Statistic
                title="舆情处置率"
                value={handleStats.handleRate}
                precision={1}
                suffix="%"
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#13c2c2' }}
              />
              <Progress percent={Number(handleStats.handleRate.toFixed(1))} size="small" status="success" showInfo={false} />
            </Card>
          </Col>
        </Row>

        {/* 维度一：时间趋势 */}
        <Card title="维度一 · 时间趋势分析（舆情数，近 6 个月）" size="small" style={{ marginBottom: 16 }}>
          <LineChart data={trendStats} />
        </Card>

        {/* 维度二 & 维度三：地域 + 词云 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <Card title="维度二 · 地域分布（9 市州）" size="small" style={{ height: '100%' }}>
              {cityStats.length === 0 ? (
                <Empty description="暂无数据" />
              ) : (
                cityStats.map((c) => (
                  <BarRow
                    key={c.name}
                    label={c.name.replace(/布依族苗族自治州|苗族侗族自治州|市/g, '')}
                    count={c.opinion}
                    max={Math.max(1, ...cityStats.map((x) => x.opinion))}
                  />
                ))
              )}
            </Card>
          </Col>
          <Col span={12}>
            <Card title="维度三 · 关键词词云（Top 30）" size="small" style={{ height: '100%' }}>
              <WordCloud data={keywordStats} />
            </Card>
          </Col>
        </Row>

        {/* 维度四 & 维度五：类别 + 数据来源 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <Card title="维度四 · 旅游类别分布" size="small" style={{ height: '100%' }}>
              {categoryStats.length === 0 ? (
                <Empty description="暂无数据" />
              ) : (
                categoryStats.map((m) => (
                  <BarRow
                    key={m.category}
                    label={m.label}
                    count={m.count}
                    max={categoryMax}
                    color="linear-gradient(90deg, #1677ff, #f5222d)"
                  />
                ))
              )}
            </Card>
          </Col>
          <Col span={12}>
            <Card title="维度五 · 舆情数据来源分布" size="small" style={{ height: '100%' }}>
              <PieChart data={dataSourceStats} />
            </Card>
          </Col>
        </Row>

        {/* 维度六 & 维度七：风险等级 + 处置效能 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <Card title="维度六 · 风险等级分布" size="small" style={{ height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <DonutChart data={riskStats} />
              </div>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="维度七 · 处置效能" size="small" style={{ height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                <DonutChart data={handleStats.distribution} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <Text type="secondary">舆情处置率：</Text>
                <Text strong style={{ color: '#13c2c2' }}>{handleStats.handleRate.toFixed(1)}%</Text>
                <Text type="secondary">（{handleStats.handledCount}/{handleStats.total}）</Text>
              </div>
            </Card>
          </Col>
        </Row>

        {/* 维度八：传播来源 */}
        <Card title="维度八 · 传播来源网站 Top 10" size="small" style={{ marginBottom: 16 }}>
          {sourceWebsiteStats.length === 0 ? (
            <Empty description="暂无数据" />
          ) : (
            <VerticalBarChart
              data={sourceWebsiteStats.map((s) => ({
                label: s.name,
                count: s.count,
                color: 'linear-gradient(180deg, #722ed1, #9254de)',
              }))}
            />
          )}
        </Card>

        {/* 高风险舆情清单 */}
        <Card title="高风险舆情清单（高/极高等级，按发布时间倒序，Top 10）" size="small">
          <Table<PublicOpinion>
            rowKey="id"
            columns={highRiskColumns}
            dataSource={highRiskOpinions}
            pagination={false}
            size="small"
            locale={{ emptyText: '暂无高风险舆情' }}
          />
        </Card>
      </PageContainer>
    </>
  )
}
