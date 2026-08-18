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
  WarningOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
  FrownOutlined,
  FireOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import { useStore } from '../../store'
import {
  OpinionDataSourceLabels,
  OpinionDataSourceColors,
  OpinionSentimentLabels,
  OpinionSentimentColors,
  OpinionRiskLevelLabels,
  OpinionRiskLevelColors,
  OpinionHandleStatusLabels,
  OpinionHandleStatusColors,
  TourismCategoryLabels,
  ComplaintMethodLabels,
  ComplaintStatusLabels,
  GUIZHOU_CITIES,
  type OpinionDataSource,
  type OpinionSentiment,
  type OpinionRiskLevel,
  type OpinionHandleStatus,
  type TourismCategory,
  type ComplaintMethod,
  type ComplaintStatus,
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

const SENTIMENT_COLORS: Record<OpinionSentiment, string> = {
  positive: '#52c41a',
  negative: '#f5222d',
  neutral: '#bfbfbf',
}

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

// 双折线图组件（舆情数 vs 投诉数）
function DualLineChart({ data }: { data: { label: string; opinion: number; complaint: number }[] }) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.opinion, d.complaint)))
  const width = 600
  const height = 220
  const padding = { top: 20, right: 20, bottom: 30, left: 40 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const pointsOpinion = data.map((d, i) => {
    const x = padding.left + (i / Math.max(data.length - 1, 1)) * chartW
    const y = padding.top + chartH - (d.opinion / max) * chartH
    return { x, y, ...d }
  })
  const pointsComplaint = data.map((d, i) => {
    const x = padding.left + (i / Math.max(data.length - 1, 1)) * chartW
    const y = padding.top + chartH - (d.complaint / max) * chartH
    return { x, y, ...d }
  })

  const pathOpinion = pointsOpinion.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const pathComplaint = pointsComplaint.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  return (
    <div>
      <div style={{ marginBottom: 8, textAlign: 'center' }}>
        <Space>
          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
            <span style={{ width: 12, height: 2, background: '#f5222d', display: 'inline-block', marginRight: 4 }} />
            舆情数
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
            <span style={{ width: 12, height: 2, background: '#1677ff', display: 'inline-block', marginRight: 4 }} />
            投诉数
          </span>
        </Space>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 220 }}>
        {/* 网格线 */}
        {[0, 0.25, 0.5, 0.75, 1].map((r) => {
          const y = padding.top + chartH * r
          return <line key={r} x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#f0f0f0" strokeWidth={1} />
        })}
        {/* 投诉折线 */}
        <path d={pathComplaint} fill="none" stroke="#1677ff" strokeWidth={2} />
        {pointsComplaint.map((p, i) => (
          <circle key={`c${i}`} cx={p.x} cy={p.y} r={3} fill="#fff" stroke="#1677ff" strokeWidth={2} />
        ))}
        {/* 舆情折线 */}
        <path d={pathOpinion} fill="none" stroke="#f5222d" strokeWidth={2} />
        {pointsOpinion.map((p, i) => (
          <g key={`o${i}`}>
            <circle cx={p.x} cy={p.y} r={3} fill="#fff" stroke="#f5222d" strokeWidth={2} />
            <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize={10} fill="#f5222d" fontWeight={600}>
              {p.opinion}
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
  const { publicOpinions, complaints } = useStore()

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

  // 投诉过滤（用于双源融合分析）
  const filteredComplaints = useMemo(() => {
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

  // ===== KPI 卡片 =====
  const kpiMetrics = useMemo(() => {
    const totalOpinion = filteredOpinions.length
    const negativeOpinion = filteredOpinions.filter((o) => o.sentiment === 'negative').length
    const highRisk = filteredOpinions.filter((o) =>
      ['high', 'critical'].includes(o.riskLevel),
    ).length
    const pendingOpinion = filteredOpinions.filter((o) =>
      ['pending', 'processing'].includes(o.handleStatus),
    ).length
    const totalComplaint = filteredComplaints.length
    const closedComplaint = filteredComplaints.filter((c) => c.status === 'closed').length
    const closedRate = totalComplaint > 0 ? (closedComplaint / totalComplaint) * 100 : 0
    const negativeRate = totalOpinion > 0 ? (negativeOpinion / totalOpinion) * 100 : 0
    const hotspotTopics = new Set<string>()
    filteredOpinions.forEach((o) => (o.keywords || []).forEach((k) => hotspotTopics.add(k)))
    return {
      totalOpinion,
      negativeOpinion,
      highRisk,
      pendingOpinion,
      totalComplaint,
      closedRate,
      negativeRate,
      hotspotCount: hotspotTopics.size,
    }
  }, [filteredOpinions, filteredComplaints])

  // ===== 维度一：时间趋势（近 6 个月双折线对比）=====
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
      const complaintCount = complaints.filter((c) => {
        if (city !== '全部' && c.city !== city) return false
        return dayjs(c.complaintTime).format('YYYY-MM') === m.key
      }).length
      return { label: m.label.substring(5), opinion: opinionCount, complaint: complaintCount }
    })
  }, [publicOpinions, complaints, city])

  // ===== 维度二：地域分布（9 市州柱状）=====
  const cityStats = useMemo(() => {
    const map = new Map<string, { opinion: number; complaint: number }>()
    GUIZHOU_CITIES.forEach((c) => map.set(c, { opinion: 0, complaint: 0 }))
    filteredOpinions.forEach((o) => {
      const cityName = o.authorLocation || '未知'
      if (!map.has(cityName)) map.set(cityName, { opinion: 0, complaint: 0 })
      map.get(cityName)!.opinion++
    })
    filteredComplaints.forEach((c) => {
      const cityName = c.city || '未知'
      if (!map.has(cityName)) map.set(cityName, { opinion: 0, complaint: 0 })
      map.get(cityName)!.complaint++
    })
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, opinion: v.opinion, complaint: v.complaint, total: v.opinion + v.complaint }))
      .filter((d) => d.total > 0)
      .sort((a, b) => b.total - a.total)
  }, [filteredOpinions, filteredComplaints])

  // ===== 维度三：情感分布 =====
  const sentimentStats = useMemo(() => {
    const map = new Map<OpinionSentiment, number>()
    Object.keys(OpinionSentimentLabels).forEach((k) => map.set(k as OpinionSentiment, 0))
    filteredOpinions.forEach((o) => map.set(o.sentiment, (map.get(o.sentiment) || 0) + 1))
    return Array.from(map.entries())
      .map(([k, v]) => ({
        sentiment: k,
        label: OpinionSentimentLabels[k],
        count: v,
        color: SENTIMENT_COLORS[k],
      }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count)
  }, [filteredOpinions])

  // ===== 维度四：关键词词云 =====
  const keywordStats = useMemo(() => {
    const map = new Map<string, number>()
    filteredOpinions.forEach((o) => {
      (o.keywords || []).forEach((k) => {
        if (!STOP_WORDS.has(k) && k.length > 1) {
          map.set(k, (map.get(k) || 0) + 1)
        }
      })
    })
    // 投诉标题分词（简易：按字符切片）
    filteredComplaints.forEach((c) => {
      const title = c.title || ''
      // 简易匹配：检查标题中是否包含预设关键词
      const presetKeywords = ['强制消费', '强制购物', '宰客', '价格虚高', '退款', '维权', '排队', '拥堵', '限流', '卫生', '厕所', '安全', '事故', '食物中毒', '服务态度', '导游', '景区', '酒店', '民宿', '旅行社', '交通', '出租车', '停车', '门票']
      presetKeywords.forEach((k) => {
        if (title.includes(k)) {
          map.set(k, (map.get(k) || 0) + 1)
        }
      })
    })
    return Array.from(map.entries())
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 30)
  }, [filteredOpinions, filteredComplaints])

  // ===== 维度五：旅游类别分布（堆叠柱状）=====
  const categoryStats = useMemo(() => {
    const map = new Map<TourismCategory, { opinion: number; complaint: number; negative: number }>()
    Object.keys(TourismCategoryLabels).forEach((k) =>
      map.set(k as TourismCategory, { opinion: 0, complaint: 0, negative: 0 }),
    )
    filteredOpinions.forEach((o) => {
      const cur = map.get(o.tourismCategory) || { opinion: 0, complaint: 0, negative: 0 }
      cur.opinion++
      if (o.sentiment === 'negative') cur.negative++
      map.set(o.tourismCategory, cur)
    })
    filteredComplaints.forEach((c) => {
      const cur = map.get(c.tourismCategory) || { opinion: 0, complaint: 0, negative: 0 }
      cur.complaint++
      map.set(c.tourismCategory, cur)
    })
    return Array.from(map.entries())
      .map(([k, v]) => ({
        category: k,
        label: TourismCategoryLabels[k],
        opinion: v.opinion,
        complaint: v.complaint,
        negative: v.negative,
        total: v.opinion + v.complaint,
      }))
      .filter((item) => item.total > 0)
      .sort((a, b) => b.total - a.total)
  }, [filteredOpinions, filteredComplaints])
  const categoryMax = Math.max(1, ...categoryStats.map((c) => c.total))

  // ===== 维度六：来源渠道分布（双饼图）=====
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

  const complaintMethodStats = useMemo(() => {
    const map = new Map<ComplaintMethod, number>()
    Object.keys(ComplaintMethodLabels).forEach((k) => map.set(k as ComplaintMethod, 0))
    filteredComplaints.forEach((c) => map.set(c.complaintMethod, (map.get(c.complaintMethod) || 0) + 1))
    return Array.from(map.entries())
      .map(([k, v], i) => ({
        label: ComplaintMethodLabels[k],
        count: v,
        color: PIE_COLORS[i % PIE_COLORS.length],
      }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count)
  }, [filteredComplaints])

  // ===== 维度七：风险等级分析 =====
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

  const riskAvgScore = useMemo(() => {
    const scores = filteredOpinions.map((o) => o.riskScore ?? 0).filter((s) => s > 0)
    if (scores.length === 0) return 0
    return Math.round(scores.reduce((s, n) => s + n, 0) / scores.length)
  }, [filteredOpinions])

  // ===== 维度八：处置效能 =====
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

  // 投诉办结率
  const complaintClosedRate = useMemo(() => {
    const total = filteredComplaints.length
    const closed = filteredComplaints.filter((c) => c.status === 'closed').length
    return total > 0 ? (closed / total) * 100 : 0
  }, [filteredComplaints])

  // ===== 维度九：传播来源网站 =====
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

  // 高风险舆情清单
  const highRiskOpinions = useMemo(() => {
    return filteredOpinions
      .filter((o) => ['high', 'critical'].includes(o.riskLevel))
      .sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0))
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
    { title: '指数', dataIndex: 'riskScore', width: 70 },
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
              共筛选到 <Text strong>{filteredOpinions.length}</Text> 条舆情、
              <Text strong> {filteredComplaints.length}</Text> 条投诉
            </Text>
          </Space>
        </Card>

        {/* KPI 卡片 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
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
          <Col span={6}>
            <Card style={{ height: '100%' }}>
              <Statistic
                title="负面舆情"
                value={kpiMetrics.negativeOpinion}
                suffix="条"
                prefix={<FrownOutlined />}
                valueStyle={{ color: '#f5222d' }}
              />
              <div style={{ marginTop: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>负面占比 {kpiMetrics.negativeRate.toFixed(1)}%</Text>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card style={{ height: '100%' }}>
              <Statistic
                title="高风险舆情"
                value={kpiMetrics.highRisk}
                suffix="条"
                prefix={<ThunderboltOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col span={6}>
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
        </Row>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card style={{ height: '100%' }}>
              <Statistic
                title="12345 投诉量"
                value={kpiMetrics.totalComplaint}
                suffix="件"
                prefix={<WarningOutlined />}
                valueStyle={{ color: '#fa541c' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card style={{ height: '100%' }}>
              <Statistic
                title="投诉办结率"
                value={kpiMetrics.closedRate}
                precision={1}
                suffix="%"
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
              <Progress percent={Number(kpiMetrics.closedRate.toFixed(1))} size="small" status="success" showInfo={false} />
            </Card>
          </Col>
          <Col span={6}>
            <Card style={{ height: '100%' }}>
              <Statistic
                title="舆情处置率"
                value={handleStats.handleRate}
                precision={1}
                suffix="%"
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#13c2c2' }}
              />
              <Progress percent={Number(handleStats.handleRate.toFixed(1))} size="small" showInfo={false} />
            </Card>
          </Col>
          <Col span={6}>
            <Card style={{ height: '100%' }}>
              <Statistic
                title="热点主题数"
                value={kpiMetrics.hotspotCount}
                suffix="个"
                prefix={<FireOutlined />}
                valueStyle={{ color: '#eb2f96' }}
              />
            </Card>
          </Col>
        </Row>

        {/* 维度一：时间趋势 */}
        <Card title="维度一 · 时间趋势分析（舆情 vs 投诉，近 6 个月）" size="small" style={{ marginBottom: 16 }}>
          <DualLineChart data={trendStats} />
        </Card>

        {/* 维度二 & 维度三：地域 + 情感 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <Card title="维度二 · 地域分布（9 市州，舆情+投诉）" size="small" style={{ height: '100%' }}>
              {cityStats.length === 0 ? (
                <Empty description="暂无数据" />
              ) : (
                cityStats.map((c) => (
                  <BarRow
                    key={c.name}
                    label={c.name.replace(/布依族苗族自治州|苗族侗族自治州|市/g, '')}
                    count={c.total}
                    max={Math.max(1, ...cityStats.map((x) => x.total))}
                  />
                ))
              )}
            </Card>
          </Col>
          <Col span={12}>
            <Card title="维度三 · 情感倾向分布" size="small" style={{ height: '100%' }}>
              <DonutChart data={sentimentStats} />
            </Card>
          </Col>
        </Row>

        {/* 维度四 & 维度五：词云 + 类别堆叠 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <Card title="维度四 · 关键词词云（Top 30）" size="small" style={{ height: '100%' }}>
              <WordCloud data={keywordStats} />
            </Card>
          </Col>
          <Col span={12}>
            <Card title="维度五 · 旅游类别分布（舆情+投诉）" size="small">
              {categoryStats.length === 0 ? (
                <Empty description="暂无数据" />
              ) : (
                categoryStats.map((m) => (
                  <BarRow
                    key={m.category}
                    label={m.label}
                    count={m.total}
                    max={categoryMax}
                    color="linear-gradient(90deg, #1677ff, #f5222d)"
                  />
                ))
              )}
            </Card>
          </Col>
        </Row>

        {/* 维度六：来源渠道（双饼图）*/}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <Card title="维度六 · 舆情数据来源分布" size="small" style={{ height: '100%' }}>
              <PieChart data={dataSourceStats} />
            </Card>
          </Col>
          <Col span={12}>
            <Card title="维度六 · 投诉来源渠道分布" size="small" style={{ height: '100%' }}>
              <PieChart data={complaintMethodStats} />
            </Card>
          </Col>
        </Row>

        {/* 维度七 & 维度八：风险等级 + 处置效能 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <Card title="维度七 · 风险等级分布" size="small" style={{ height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <DonutChart data={riskStats} />
              </div>
              <div style={{ marginTop: 12, textAlign: 'center' }}>
                <Text type="secondary">平均风险指数：</Text>
                <Text strong style={{ color: riskAvgScore >= 76 ? '#722ed1' : riskAvgScore >= 51 ? '#f5222d' : riskAvgScore >= 26 ? '#fa8c16' : '#1677ff' }}>
                  {riskAvgScore}
                </Text>
              </div>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="维度八 · 处置效能" size="small" style={{ height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                <DonutChart data={handleStats.distribution} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <Space direction="vertical">
                  <div>
                    <Text type="secondary">舆情处置率：</Text>
                    <Text strong style={{ color: '#13c2c2' }}>{handleStats.handleRate.toFixed(1)}%</Text>
                    <Text type="secondary">（{handleStats.handledCount}/{handleStats.total}）</Text>
                  </div>
                  <div>
                    <Text type="secondary">投诉办结率：</Text>
                    <Text strong style={{ color: '#52c41a' }}>{complaintClosedRate.toFixed(1)}%</Text>
                  </div>
                </Space>
              </div>
            </Card>
          </Col>
        </Row>

        {/* 维度九：传播来源 */}
        <Card title="维度九 · 传播来源网站 Top 10" size="small" style={{ marginBottom: 16 }}>
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
        <Card title="高风险舆情清单（按风险指数倒序，Top 10）" size="small">
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
