// 省文旅厅 / 系统管理员 - 全省投诉列表（查看全部数据，督办各市州待处置投诉）
import { useMemo, useState } from 'react'
import {
  Button,
  Card,
  Col,
  DatePicker,
  Input,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
} from 'antd'
import { EyeOutlined, WarningOutlined } from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import dayjs, { type Dayjs } from 'dayjs'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import { useStore } from '../../store'
import { GUIZHOU_CITIES } from '../../types'
import {
  DisposalCategoryLabels,
  DisposalComplaintSourceColors,
  DisposalComplaintSourceLabels,
  DisposalStatusColors,
  DisposalStatusLabels,
  GUIZHOU_DISTRICTS,
  cityShortText,
  respondentDisplay,
  type DisposalCategory,
  type DisposalComplaint,
  type DisposalComplaintSource,
  type DisposalStatus,
} from '../../types/complaint-disposal'
import { ElapsedTime, SuperviseModal, SupervisionTag, useTick } from './shared'

const { RangePicker } = DatePicker

export default function ProvinceComplaintList() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { disposalComplaints } = useStore()
  const now = useTick()

  // 筛选状态（市州支持从处置总览带参进入；区县随市州级联）
  const [city, setCity] = useState<string | undefined>(searchParams.get('city') ?? undefined)
  const [district, setDistrict] = useState<string | undefined>()
  const [keyword, setKeyword] = useState('')
  const [source, setSource] = useState<DisposalComplaintSource | undefined>()
  const [category, setCategory] = useState<DisposalCategory | undefined>()
  const [status, setStatus] = useState<DisposalStatus | undefined>()
  const [supervision, setSupervision] = useState<'all' | 'supervised' | 'unsupervised'>('all')
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)

  // 督办弹窗
  const [superviseTarget, setSuperviseTarget] = useState<DisposalComplaint | null>(null)

  const stats = useMemo(() => {
    const pending = disposalComplaints.filter((c) => c.status === 'pending')
    return {
      total: disposalComplaints.length,
      pending: pending.length,
      pendingSupervised: pending.filter((c) => c.supervisions.length > 0).length,
      disposed: disposalComplaints.length - pending.length,
    }
  }, [disposalComplaints])

  const filtered = useMemo(() => {
    return disposalComplaints
      .filter((c) => {
        if (city && c.city !== city) return false
        if (district && c.district !== district) return false
        if (source && c.source !== source) return false
        if (category && !c.categories.includes(category)) return false
        if (status && c.status !== status) return false
        if (supervision === 'supervised' && c.supervisions.length === 0) return false
        if (supervision === 'unsupervised' && c.supervisions.length > 0) return false
        if (dateRange && dateRange[0] && dateRange[1]) {
          const t = dayjs(c.receivedAt)
          if (t.isBefore(dateRange[0].startOf('day')) || t.isAfter(dateRange[1].endOf('day'))) return false
        }
        if (keyword) {
          const kw = keyword.toLowerCase()
          const hit =
            c.id.toLowerCase().includes(kw) ||
            c.respondentName.toLowerCase().includes(kw) ||
            (c.agencyName ?? '').toLowerCase().includes(kw) ||
            (c.guideName ?? '').toLowerCase().includes(kw) ||
            c.content.toLowerCase().includes(kw) ||
            c.complainantName.toLowerCase().includes(kw)
          if (!hit) return false
        }
        return true
      })
      .sort((a, b) => {
        // 待处置在前（先接收的优先，便于督办跟踪），已处置按处置时间倒序
        if (a.status !== b.status) return a.status === 'pending' ? -1 : 1
        if (a.status === 'pending') return a.receivedAt.localeCompare(b.receivedAt)
        return (b.disposal?.disposedAt ?? '').localeCompare(a.disposal?.disposedAt ?? '')
      })
  }, [disposalComplaints, city, district, source, category, status, supervision, keyword, dateRange])

  // 区县筛选选项：已选市州时级联展示该市州区县，未选时展示全省区县
  const districtOptions = useMemo(() => {
    const list = city ? GUIZHOU_DISTRICTS[city] ?? [] : Object.values(GUIZHOU_DISTRICTS).flat()
    return list.map((d) => ({ value: d, label: d }))
  }, [city])

  // 切换市州时，若已选区县不属于新市州则清空
  const handleCityChange = (v?: string) => {
    setCity(v)
    setDistrict((prev) => (prev && v && !(GUIZHOU_DISTRICTS[v] ?? []).includes(prev) ? undefined : prev))
  }

  const columns = [
    {
      title: '投诉编号',
      dataIndex: 'id',
      width: 150,
      render: (id: string) => (
        <Button type="link" size="small" style={{ padding: 0 }} onClick={() => navigate(`/complaint-disposal/${id}`)}>
          {id}
        </Button>
      ),
    },
    {
      title: '所属市州',
      dataIndex: 'city',
      width: 115,
      render: (cityName: string) => cityShortText(cityName),
    },
    {
      title: '所属区县',
      dataIndex: 'district',
      width: 120,
      render: (d?: string) => (d ? <span>{d}</span> : <span style={{ color: '#bfbfbf' }}>—</span>),
    },
    {
      title: '来源',
      dataIndex: 'source',
      width: 90,
      render: (s: DisposalComplaint['source']) => (
        <Tag color={DisposalComplaintSourceColors[s]}>{DisposalComplaintSourceLabels[s]}</Tag>
      ),
    },
    {
      title: '投诉类型',
      dataIndex: 'categories',
      width: 160,
      render: (cats: DisposalCategory[]) => (
        <Space size={4} wrap>
          {cats.map((cat) => (
            <Tag key={cat}>{DisposalCategoryLabels[cat]}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '投诉对象',
      dataIndex: 'respondentName',
      width: 210,
      ellipsis: true,
      render: (_: string, c: DisposalComplaint) => (
        <Tooltip title={c.groupNo ? `团号：${c.groupNo}（一团一码自动带入）` : respondentDisplay(c)}>
          <span>{respondentDisplay(c)}</span>
        </Tooltip>
      ),
    },
    {
      title: '投诉人',
      dataIndex: 'complainantName',
      width: 100,
      render: (name: string, c: DisposalComplaint) => (c.isAnonymous ? <Tag>匿名</Tag> : name),
    },
    { title: '接收时间', dataIndex: 'receivedAt', width: 165 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (s: DisposalComplaint['status']) => (
        <Tag color={DisposalStatusColors[s]}>{DisposalStatusLabels[s]}</Tag>
      ),
    },
    {
      title: '耗时',
      key: 'elapsed',
      width: 130,
      render: (_: unknown, c: DisposalComplaint) => <ElapsedTime complaint={c} now={now} />,
    },
    {
      title: '督办',
      key: 'supervision',
      width: 100,
      render: (_: unknown, c: DisposalComplaint) => <SupervisionTag complaint={c} />,
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      fixed: 'right' as const,
      render: (_: unknown, c: DisposalComplaint) => (
        <Space size={0}>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/complaint-disposal/${c.id}`)}
          >
            详情
          </Button>
          {c.status === 'pending' ? (
            <Button type="link" size="small" danger onClick={() => setSuperviseTarget(c)}>
              督办
            </Button>
          ) : (
            <Tooltip title="已处置的投诉无需督办">
              <Button type="link" size="small" disabled>
                督办
              </Button>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="全省投诉"
        breadcrumb={[{ title: '投诉处置管理' }, { title: '全省投诉' }]}
        extra={
          <Button onClick={() => navigate('/complaint-disposal/overview')}>处置总览</Button>
        }
      />
      <PageContainer>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={12} md={6}>
            <Card className="stat-card">
              <Statistic title="投诉总量" value={stats.total} />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card className="stat-card">
              <Statistic title="待处置" value={stats.pending} valueStyle={{ color: '#cf1322' }} />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card className="stat-card">
              <Statistic
                title="待处置 · 被督办"
                value={stats.pendingSupervised}
                valueStyle={{ color: stats.pendingSupervised > 0 ? '#ff4d4f' : undefined }}
                prefix={stats.pendingSupervised > 0 ? <WarningOutlined /> : undefined}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card className="stat-card">
              <Statistic title="已处置" value={stats.disposed} valueStyle={{ color: '#3f8600' }} />
            </Card>
          </Col>
        </Row>

        <Card style={{ marginBottom: 16 }}>
          <Space wrap size="middle">
            <Select
              placeholder="所属市州"
              allowClear
              style={{ width: 160 }}
              value={city}
              onChange={handleCityChange}
              options={GUIZHOU_CITIES.map((c) => ({ value: c, label: c }))}
            />
            <Select
              placeholder="所属区县"
              allowClear
              style={{ width: 150 }}
              showSearch
              optionFilterProp="label"
              value={district}
              onChange={setDistrict}
              options={districtOptions}
            />
            <Select
              placeholder="来源"
              allowClear
              style={{ width: 110 }}
              value={source}
              onChange={setSource}
              options={Object.entries(DisposalComplaintSourceLabels).map(([v, l]) => ({ value: v, label: l }))}
            />
            <Select
              placeholder="投诉类型"
              allowClear
              style={{ width: 130 }}
              value={category}
              onChange={setCategory}
              options={Object.entries(DisposalCategoryLabels).map(([v, l]) => ({ value: v, label: l }))}
            />
            <Select
              placeholder="状态"
              allowClear
              style={{ width: 100 }}
              value={status}
              onChange={setStatus}
              options={Object.entries(DisposalStatusLabels).map(([v, l]) => ({ value: v, label: l }))}
            />
            <Select
              placeholder="督办状态"
              allowClear
              style={{ width: 110 }}
              value={supervision === 'all' ? undefined : supervision}
              onChange={(v) => setSupervision(v ?? 'all')}
              options={[
                { value: 'supervised', label: '被督办' },
                { value: 'unsupervised', label: '未督办' },
              ]}
            />
            <RangePicker
              value={dateRange}
              onChange={(v) => setDateRange(v as [Dayjs | null, Dayjs | null] | null)}
              placeholder={['接收开始', '接收结束']}
            />
            <Input.Search
              placeholder="编号 / 投诉对象 / 内容 / 称呼"
              allowClear
              style={{ width: 230 }}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </Space>
        </Card>

        <Card>
          <Table
            rowKey="id"
            size="middle"
            columns={columns}
            dataSource={filtered}
            scroll={{ x: 1520 }}
            pagination={{ showTotal: (t) => `共 ${t} 条`, showSizeChanger: false }}
            rowClassName={(c) =>
              c.status === 'pending' && c.supervisions.length > 0 ? 'complaint-supervised-row' : ''
            }
          />
        </Card>
      </PageContainer>

      <SuperviseModal
        open={!!superviseTarget}
        complaint={superviseTarget}
        onClose={() => setSuperviseTarget(null)}
      />
    </>
  )
}
