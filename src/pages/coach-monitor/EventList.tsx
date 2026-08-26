import { useMemo, useState } from 'react'
import {
  Table,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Space,
  Tag,
  Segmented,
} from 'antd'
import { SearchOutlined, ReloadOutlined, EyeOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import { useStore } from '../../store'
import {
  EventStatusLabels,
  EventStatusColors,
  RiskLevelLabels,
  RiskLevelColors,
  ViolationCategoryLabels,
  RegionLevelLabels,
  type EventStatus,
  type ViolationCategory,
  type RiskLevel,
  type RegionLevel,
  type RiskEvent,
} from '../../types/coach-monitor'
import { filterEvents } from '../../utils/coach-monitor'

/**
 * 风险事件列表
 * - 按状态/类别/车辆/时段筛选
 * - 含省/市/县层级切换
 */
export default function EventList() {
  const navigate = useNavigate()
  const {
    coachRegionLevel,
    setCoachRegionLevel,
    riskEvents,
  } = useStore()
  const [form] = Form.useForm()

  const [eventIdKw, setEventIdKw] = useState('')
  const [plateKw, setPlateKw] = useState('')
  const [agencyKw, setAgencyKw] = useState('')
  const [statusFilter, setStatusFilter] = useState<EventStatus | undefined>()
  const [categoryFilter, setCategoryFilter] = useState<ViolationCategory | undefined>()
  const [riskFilter, setRiskFilter] = useState<RiskLevel | undefined>()
  const [dateRange, setDateRange] = useState<
    [dayjs.Dayjs | null, dayjs.Dayjs | null] | null
  >(null)

  const visibleEvents = useMemo(
    () => filterEvents(riskEvents, coachRegionLevel),
    [riskEvents, coachRegionLevel],
  )

  const filtered = useMemo(() => {
    return visibleEvents.filter((e) => {
      if (eventIdKw && !e.eventId.includes(eventIdKw)) return false
      if (plateKw && !e.plateNo.includes(plateKw)) return false
      if (agencyKw && !e.travelAgencyName.includes(agencyKw)) return false
      if (statusFilter && e.status !== statusFilter) return false
      if (categoryFilter && e.category !== categoryFilter) return false
      if (riskFilter && e.riskLevel !== riskFilter) return false
      if (dateRange && dateRange[0] && dateRange[1]) {
        const t = dayjs(e.occurredAt)
        if (t.isBefore(dateRange[0], 'day') || t.isAfter(dateRange[1], 'day')) return false
      }
      return true
    })
  }, [
    visibleEvents,
    eventIdKw,
    plateKw,
    agencyKw,
    statusFilter,
    categoryFilter,
    riskFilter,
    dateRange,
  ])

  const handleReset = () => {
    setEventIdKw('')
    setPlateKw('')
    setAgencyKw('')
    setStatusFilter(undefined)
    setCategoryFilter(undefined)
    setRiskFilter(undefined)
    setDateRange(null)
    form.resetFields()
  }

  const columns = [
    {
      title: '事件编号',
      dataIndex: 'eventId',
      width: 170,
      fixed: 'left' as const,
      render: (v: string) => <a onClick={() => navigate(`/coach-monitor/events/${v}`)}>{v}</a>,
    },
    { title: '发生时间', dataIndex: 'occurredAt', width: 160 },
    { title: '车牌', dataIndex: 'plateNo', width: 110 },
    {
      title: '旅行社',
      dataIndex: 'travelAgencyName',
      width: 200,
      ellipsis: true,
    },
    {
      title: '违规类别',
      dataIndex: 'category',
      width: 110,
      render: (c: ViolationCategory) => ViolationCategoryLabels[c],
    },
    {
      title: '风险等级',
      dataIndex: 'riskLevel',
      width: 90,
      render: (l: RiskLevel) => <Tag color={RiskLevelColors[l]}>{RiskLevelLabels[l]}</Tag>,
    },
    {
      title: '命中关键词',
      dataIndex: 'hitKeywords',
      width: 200,
      ellipsis: true,
      render: (ks: string[]) =>
        ks.length === 0 ? '-' : ks.map((k) => <Tag key={k} color="red" style={{ margin: '0 4px 2px 0' }}>{k}</Tag>),
    },
    { title: '所属区域', dataIndex: 'regionName', width: 180, ellipsis: true },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (s: EventStatus) => <Tag color={EventStatusColors[s]}>{EventStatusLabels[s]}</Tag>,
    },
    {
      title: '操作',
      width: 120,
      fixed: 'right' as const,
      render: (_: unknown, r: RiskEvent) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/coach-monitor/events/${r.eventId}`)}
        >
          详情
        </Button>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="风险事件"
        breadcrumb={[
          { title: '首页', path: '/' },
          { title: '旅游包车智慧监管', path: '/coach-monitor' },
          { title: '风险事件' },
        ]}
        extra={
          <Space>
            <span style={{ fontSize: 12, color: '#999' }}>监管层级：</span>
            <Segmented
              size="small"
              value={coachRegionLevel}
              onChange={(v) => setCoachRegionLevel(v as RegionLevel)}
              options={(['province', 'city', 'county'] as RegionLevel[]).map((l) => ({
                value: l,
                label: RegionLevelLabels[l],
              }))}
            />
          </Space>
        }
      />
      <PageContainer>
        <div style={{ background: '#fff', padding: '16px 24px' }}>
          <Form form={form} layout="inline">
            <Form.Item name="eventId">
              <Input
                placeholder="事件编号"
                value={eventIdKw}
                onChange={(e) => setEventIdKw(e.target.value)}
                style={{ width: 180 }}
                prefix={<SearchOutlined />}
                allowClear
              />
            </Form.Item>
            <Form.Item name="plate">
              <Input
                placeholder="车牌号"
                value={plateKw}
                onChange={(e) => setPlateKw(e.target.value)}
                style={{ width: 140 }}
                allowClear
              />
            </Form.Item>
            <Form.Item name="agency">
              <Input
                placeholder="旅行社"
                value={agencyKw}
                onChange={(e) => setAgencyKw(e.target.value)}
                style={{ width: 180 }}
                allowClear
              />
            </Form.Item>
            <Form.Item name="status">
              <Select
                placeholder="状态"
                value={statusFilter}
                onChange={setStatusFilter}
                allowClear
                style={{ width: 130 }}
                options={Object.entries(EventStatusLabels).map(([k, v]) => ({ value: k, label: v }))}
              />
            </Form.Item>
            <Form.Item name="category">
              <Select
                placeholder="违规类别"
                value={categoryFilter}
                onChange={setCategoryFilter}
                allowClear
                style={{ width: 140 }}
                options={Object.entries(ViolationCategoryLabels).map(([k, v]) => ({ value: k, label: v }))}
              />
            </Form.Item>
            <Form.Item name="riskLevel">
              <Select
                placeholder="风险等级"
                value={riskFilter}
                onChange={setRiskFilter}
                allowClear
                style={{ width: 120 }}
                options={Object.entries(RiskLevelLabels).map(([k, v]) => ({ value: k, label: v }))}
              />
            </Form.Item>
            <Form.Item name="dateRange">
              <DatePicker.RangePicker
                value={dateRange as any}
                onChange={(v) => setDateRange(v as any)}
                placeholder={['发生开始', '发生结束']}
              />
            </Form.Item>
            <Form.Item>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                重置
              </Button>
            </Form.Item>
          </Form>
        </div>
        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="eventId"
          scroll={{ x: 1700 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条记录`,
          }}
        />
      </PageContainer>
    </>
  )
}
