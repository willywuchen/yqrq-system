// 市州/区县文旅局 - 投诉处置工作台
// 游客通过「贵州旅游服务质量码」或「一团一码」提交的投诉，按所诉区域自动分派至所属市州/区县文旅局；
// 无需受理、直接处置；无处置时限，但自接收起动态计时，处置完成即停止计时
// 市州文旅局可查看并处置本市州全部投诉（含区县级）；区县文旅局仅可查看并处置本区县投诉
import { useMemo, useState } from 'react'
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Input,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Tooltip,
} from 'antd'
import { EyeOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import { useStore } from '../../store'
import {
  DisposalCategoryLabels,
  DisposalComplaintSourceColors,
  DisposalComplaintSourceLabels,
  DisposalStatusColors,
  DisposalStatusLabels,
  GUIZHOU_DISTRICTS,
  cityOfOrg,
  cityShortText,
  districtOfOrg,
  respondentDisplay,
  type DisposalCategory,
  type DisposalComplaint,
  type DisposalComplaintSource,
} from '../../types/complaint-disposal'
import { nowStr } from '../../utils'
import { ElapsedTime, SupervisionTag, useTick } from './shared'

// 模拟游客提交的投诉池（演示用：游客填报页已独立存在，此处用于在工作台演示"提交即分派、从0开始计时"）
const SIMULATE_POOL: Array<Pick<
  DisposalComplaint,
  'source' | 'categories' | 'respondentName' | 'agencyName' | 'guideName' | 'groupNo' | 'content' | 'complainantName' | 'isAnonymous' | 'complainantPhone' | 'evidences'
>> = [
  {
    source: 'qr_service_code',
    categories: ['scenic_area'],
    respondentName: '某景区售票处',
    content: '现场售票与线上价格不一致，且不对老年游客执行半价优惠政策，要求核实处理。',
    complainantName: '魏女士',
    isAnonymous: false,
    complainantPhone: '13985020618',
    evidences: ['IMG_SIM_100301.jpg'],
  },
  {
    source: 'group_code',
    categories: ['travel_agency', 'tour_guide'],
    respondentName: '贵州阳光国际旅行社 · 导游韩雪',
    agencyName: '贵州阳光国际旅行社',
    guideName: '导游韩雪',
    groupNo: `G${dayjs().format('YYYYMMDD')}-S01`,
    content: '导游途中再次推销土特产，并暗示不购物影响后续服务态度，要求查处。',
    complainantName: '匿名游客',
    isAnonymous: true,
    complainantPhone: '15885010407',
    evidences: [],
  },
  {
    source: 'qr_service_code',
    categories: ['hotel_homestay', 'tourism_shopping'],
    respondentName: '某网红民宿周边特产超市',
    content: '民宿合作商店售卖霉变食品，食用后身体不适，要求查处并赔偿。',
    complainantName: '宁先生',
    isAnonymous: false,
    complainantPhone: '18798080536',
    evidences: ['IMG_SIM_100402.jpg', 'IMG_SIM_100415.jpg'],
  },
]

export default function CityDisposalWorkbench() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const { currentUser, disposalComplaints, addDisposalComplaint } = useStore()
  const now = useTick()

  // 范围解析：市州文旅局 → 本市州全部（含区县）；区县文旅局 → 仅本区县
  const myCity = cityOfOrg(currentUser.org)
  const myDistrict = districtOfOrg(currentUser.org)
  const isDistrictRole = currentUser.role === 'district_bureau'
  const scopeCity = myDistrict?.city ?? myCity
  const scopeDistrict = isDistrictRole ? myDistrict?.district : undefined

  // 筛选状态
  const [tab, setTab] = useState<'all' | 'pending' | 'disposed'>('all')
  const [keyword, setKeyword] = useState('')
  const [source, setSource] = useState<DisposalComplaintSource | undefined>()
  const [category, setCategory] = useState<DisposalCategory | undefined>()
  const [supervision, setSupervision] = useState<'all' | 'supervised' | 'unsupervised'>('all')
  const [district, setDistrict] = useState<string | undefined>(undefined)

  const cityComplaints = useMemo(
    () =>
      disposalComplaints.filter((c) => {
        if (c.city !== scopeCity) return false
        // 区县角色仅看本区县；市州角色看全市州（含区县）
        if (isDistrictRole && c.district !== scopeDistrict) return false
        return true
      }),
    [disposalComplaints, scopeCity, scopeDistrict, isDistrictRole],
  )

  const stats = useMemo(() => {
    const today = dayjs().format('YYYY-MM-DD')
    return {
      pending: cityComplaints.filter((c) => c.status === 'pending').length,
      pendingSupervised: cityComplaints.filter(
        (c) => c.status === 'pending' && c.supervisions.length > 0,
      ).length,
      todayReceived: cityComplaints.filter((c) => c.receivedAt.startsWith(today)).length,
      disposed: cityComplaints.filter((c) => c.status === 'disposed').length,
    }
  }, [cityComplaints])

  const filtered = useMemo(() => {
    return cityComplaints
      .filter((c) => {
        if (tab !== 'all' && c.status !== tab) return false
        if (source && c.source !== source) return false
        if (category && !c.categories.includes(category)) return false
        if (district && c.district !== district) return false
        if (supervision === 'supervised' && c.supervisions.length === 0) return false
        if (supervision === 'unsupervised' && c.supervisions.length > 0) return false
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
        // 待处置在前；待处置按接收时间先后（先来先办），已处置按处置时间倒序
        if (a.status !== b.status) return a.status === 'pending' ? -1 : 1
        if (a.status === 'pending') return a.receivedAt.localeCompare(b.receivedAt)
        return (b.disposal?.disposedAt ?? '').localeCompare(a.disposal?.disposedAt ?? '')
      })
  }, [cityComplaints, tab, source, category, district, supervision, keyword])

  // 模拟游客提交：随机取一条模板投诉，以当前时间接收并分派至本市州/本区县
  // 区县（非必填）：市州视角随机附带区县（约七成），区县视角固定为本区县
  const handleSimulate = () => {
    if (!scopeCity) return
    const tpl = SIMULATE_POOL[Math.floor(Math.random() * SIMULATE_POOL.length)]
    const seq = Math.floor(Math.random() * 900 + 100)
    const cityDistricts = GUIZHOU_DISTRICTS[scopeCity] ?? []
    const simulatedDistrict = scopeDistrict
      ?? (cityDistricts.length > 0 && Math.random() < 0.7
        ? cityDistricts[Math.floor(Math.random() * cityDistricts.length)]
        : undefined)
    addDisposalComplaint({
      ...tpl,
      id: `TS${dayjs().format('YYYYMMDD')}${seq}`,
      city: scopeCity,
      ...(simulatedDistrict ? { district: simulatedDistrict } : {}),
      receivedAt: nowStr(),
      status: 'pending',
      supervisions: [],
    })
    message.success(
      tpl.source === 'group_code'
        ? '已模拟一条「一团一码」投诉（自动带入投诉对象旅行社/导游），已按所诉区域分派并开始计时'
        : '已模拟一条「服务质量码」投诉，已按所诉区域分派并开始计时',
    )
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
      width: 170,
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
      width: 220,
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
      width: 110,
      render: (name: string, c: DisposalComplaint) =>
        c.isAnonymous ? <Tag>匿名</Tag> : name,
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
      title: '已计时',
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
      width: 130,
      fixed: 'right' as const,
      render: (_: unknown, c: DisposalComplaint) => (
        <Space size={0}>
          {c.status === 'pending' && (
            <Button type="link" size="small" onClick={() => navigate(`/complaint-disposal/${c.id}`)}>
              处置
            </Button>
          )}
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/complaint-disposal/${c.id}`)}
          >
            详情
          </Button>
        </Space>
      ),
    },
  ]

  if (!scopeCity) {
    return (
      <>
        <PageHeader title="投诉处置工作台" breadcrumb={[{ title: '投诉处置管理' }, { title: '处置工作台' }]} />
        <PageContainer>
          <Card>
            <Alert
              type="warning"
              showIcon
              message="当前账号未关联市州/区县"
              description="投诉处置工作台仅面向市州文旅局或区县文旅局账号开放，且需要账号单位关联贵州省内市州/区县。请切换右上角对应角色体验。"
            />
          </Card>
        </PageContainer>
      </>
    )
  }

  // 区县选项：市州视角下展示本市州所有区县；区县视角数据已限定本区县，不展示该筛选
  const districtOptions = isDistrictRole
    ? []
    : (GUIZHOU_DISTRICTS[scopeCity] ?? []).map((d) => ({ value: d, label: d }))

  return (
    <>
      <PageHeader
        title="投诉处置工作台"
        breadcrumb={[{ title: '投诉处置管理' }, { title: '处置工作台' }]}
        extra={
          <Button icon={<ThunderboltOutlined />} onClick={handleSimulate}>
            模拟游客提交
          </Button>
        }
      />
      <PageContainer>
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={`当前账号：${currentUser.org}（${isDistrictRole ? `${scopeCity} · ${scopeDistrict}` : scopeCity}）`}
          description={
            isDistrictRole
              ? '游客通过「贵州旅游服务质量码」或「一团一码」提交投诉后，系统按所诉区域自动分派至本区县文旅局，无需受理、直接处置。投诉无处置时限要求，但自接收起持续动态计时，完成处置后计时停止；省文旅厅督办件请优先处置（列表中以浅红底色标示）。'
              : '游客通过「贵州旅游服务质量码」或「一团一码」提交投诉后，系统按所诉区域自动分派至本市州文旅局（含区县），无需受理、直接处置。投诉无处置时限要求，但自接收起持续动态计时，完成处置后计时停止；省文旅厅督办件请优先处置（列表中以浅红底色标示）。'
          }
        />

        <Row gutter={16} style={{ marginBottom: 16 }}>
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
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card className="stat-card">
              <Statistic title="今日接收" value={stats.todayReceived} />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card className="stat-card">
              <Statistic title="已处置" value={stats.disposed} valueStyle={{ color: '#3f8600' }} />
            </Card>
          </Col>
        </Row>

        <Card>
          <Tabs
            activeKey={tab}
            onChange={(k) => setTab(k as typeof tab)}
            items={[
              { key: 'all', label: `全部（${cityComplaints.length}）` },
              { key: 'pending', label: `待处置（${stats.pending}）` },
              { key: 'disposed', label: `已处置（${stats.disposed}）` },
            ]}
            tabBarExtraContent={
              <Space wrap>
                <Input.Search
                  placeholder="编号 / 投诉对象 / 内容 / 称呼"
                  allowClear
                  style={{ width: 230 }}
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
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
                {!isDistrictRole && districtOptions.length > 0 && (
                  <Select
                    placeholder="所属区县"
                    allowClear
                    style={{ width: 140 }}
                    value={district}
                    onChange={setDistrict}
                    options={districtOptions}
                  />
                )}
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
              </Space>
            }
          />
          <Table
            rowKey="id"
            size="middle"
            columns={columns}
            dataSource={filtered}
            scroll={{ x: 1370 }}
            pagination={{ showTotal: (t) => `共 ${t} 条`, showSizeChanger: false }}
            rowClassName={(c) =>
              c.status === 'pending' && c.supervisions.length > 0 ? 'complaint-supervised-row' : ''
            }
          />
        </Card>
      </PageContainer>
    </>
  )
}
