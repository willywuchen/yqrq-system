import { useMemo, useState } from 'react'
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import ReactECharts from 'echarts-for-react'
import {
  TeamOutlined,
  DollarOutlined,
  GlobalOutlined,
  AuditOutlined,
  RiseOutlined,
  UserOutlined,
  SearchOutlined,
  ReloadOutlined,
  DownloadOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import { useStore } from '../../store'
import { formatMoney, maskIdNumber, maskPhone } from '../../utils'
import { type SubsidyApplication, type TouristItem } from '../../types'

const { Text } = Typography

// 年龄分段
const AGE_BUCKETS = [
  { label: '18岁以下', min: 0, max: 17 },
  { label: '18-30岁', min: 18, max: 30 },
  { label: '31-45岁', min: 31, max: 45 },
  { label: '46-60岁', min: 46, max: 60 },
  { label: '60岁以上', min: 61, max: 200 },
]

// 证件类型标签映射
const IdTypeLabels: Record<TouristItem['idType'], string> = {
  id_card: '身份证',
  passport: '护照',
  hk_macao_pass: '港澳通行证',
  tw_pass: '台湾通行证',
  temp_entry_permit: '临时入境许可证',
}

// 性别标签映射
const GenderLabels: Record<NonNullable<TouristItem['gender']>, string> = {
  male: '男',
  female: '女',
  unknown: '未知',
}

// 扁平化游客行：游客自身字段 + 所属团组上下文
interface TouristRow extends TouristItem {
  applicationId: string
  createdByOrg: string
  teamName: string
  dispatchNo: string
  travelStart: string
}

// 游客信息查询：查询条件态
interface TouristQuery {
  name: string
  gender?: TouristItem['gender']
  idType?: TouristItem['idType']
  idNumber: string
  birthDateRange?: [string, string]
  ageMin?: number
  ageMax?: number
  nationalities: string[]
  sourcePlaces: string[]
  phone: string
  contractStatus?: string
  contractNo: string
  createdByOrgs: string[]
  teamName: string
  dispatchNo: string
  travelStartRange?: [string, string]
}

const emptyQuery: TouristQuery = {
  name: '',
  idNumber: '',
  nationalities: [],
  sourcePlaces: [],
  phone: '',
  contractNo: '',
  createdByOrgs: [],
  teamName: '',
  dispatchNo: '',
}

// 游客信息查询面板（Tab2 内容）
function TouristQueryPanel({ apps }: { apps: SubsidyApplication[] }) {
  const navigate = useNavigate()
  const { message } = App.useApp()

  // 扁平化游客列表（含所属团组上下文）
  const allRows = useMemo<TouristRow[]>(() => {
    const rows: TouristRow[] = []
    apps.forEach((a) => {
      a.teamPresetSnapshot.tourists.forEach((t) => {
        rows.push({
          ...t,
          applicationId: a.id,
          createdByOrg: a.createdByOrg,
          teamName: a.teamPresetSnapshot.teamName,
          dispatchNo: a.teamPresetSnapshot.dispatchNo,
          travelStart: a.teamPresetSnapshot.travelStart,
        })
      })
    })
    return rows
  }, [apps])

  // 下拉选项（从已有数据派生）
  const nationalityOptions = useMemo(
    () => Array.from(new Set(allRows.map((r) => r.nationality).filter(Boolean))).sort(),
    [allRows],
  )
  const sourcePlaceOptions = useMemo(
    () => Array.from(new Set(allRows.map((r) => r.sourcePlace || r.nationality).filter(Boolean))).sort(),
    [allRows],
  )
  const orgOptions = useMemo(
    () => Array.from(new Set(allRows.map((r) => r.createdByOrg).filter(Boolean))).sort(),
    [allRows],
  )

  // 查询条件态：query 为输入态，appliedQuery 为已点击查询后生效的态
  const [query, setQuery] = useState<TouristQuery>(emptyQuery)
  const [appliedQuery, setAppliedQuery] = useState<TouristQuery>(emptyQuery)

  const update = <K extends keyof TouristQuery>(key: K, value: TouristQuery[K]) => {
    setQuery((prev) => ({ ...prev, [key]: value }))
  }

  const doSearch = () => setAppliedQuery(query)
  const doReset = () => {
    setQuery(emptyQuery)
    setAppliedQuery(emptyQuery)
  }

  const filtered = useMemo(() => {
    const q = appliedQuery
    const includes = (val: string | undefined, kw: string) =>
      kw ? (val || '').toLowerCase().includes(kw.toLowerCase()) : true
    return allRows.filter((r) => {
      if (!includes(r.name, q.name)) return false
      if (q.gender && r.gender !== q.gender) return false
      if (q.idType && r.idType !== q.idType) return false
      if (!includes(r.idNumber, q.idNumber)) return false
      if (q.birthDateRange) {
        const [s, e] = q.birthDateRange
        if (s && (!r.birthDate || r.birthDate < s)) return false
        if (e && (!r.birthDate || r.birthDate > e)) return false
      }
      if (q.ageMin !== undefined && (r.age === undefined || r.age < q.ageMin)) return false
      if (q.ageMax !== undefined && (r.age === undefined || r.age > q.ageMax)) return false
      if (q.nationalities.length > 0 && !q.nationalities.includes(r.nationality || '')) return false
      if (q.sourcePlaces.length > 0 && !q.sourcePlaces.includes(r.sourcePlace || r.nationality || '')) return false
      if (!includes(r.phone, q.phone)) return false
      if (q.contractStatus && r.contractStatus !== q.contractStatus) return false
      if (!includes(r.contractNo, q.contractNo)) return false
      if (q.createdByOrgs.length > 0 && !q.createdByOrgs.includes(r.createdByOrg)) return false
      if (!includes(r.teamName, q.teamName)) return false
      if (!includes(r.dispatchNo, q.dispatchNo)) return false
      if (q.travelStartRange) {
        const [s, e] = q.travelStartRange
        if (s && (!r.travelStart || r.travelStart < s)) return false
        if (e && (!r.travelStart || r.travelStart > e)) return false
      }
      return true
    })
  }, [allRows, appliedQuery])

  const handleExport = () => {
    if (filtered.length === 0) {
      message.warning('无可导出的数据')
      return
    }
    const headers = [
      '姓名', '性别', '证件类型', '证件号码', '出生日期', '年龄', '国籍/地区', '客源地',
      '手机号', '合同状态', '合同编号', '所属旅行社', '团组名称', '团组编号', '出团日期',
    ]
    const rows = filtered.map((r) => [
      r.name,
      r.gender ? GenderLabels[r.gender] : '',
      IdTypeLabels[r.idType],
      maskIdNumber(r.idNumber),
      r.birthDate || '',
      r.age ?? '',
      r.nationality || '',
      r.sourcePlace || r.nationality || '',
      maskPhone(r.phone),
      r.contractStatus || '',
      r.contractNo || '',
      r.createdByOrg,
      r.teamName,
      r.dispatchNo,
      r.travelStart,
    ])
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `游客信息明细_${dayjs().format('YYYYMMDD_HHmmss')}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    message.success(`已导出 ${filtered.length} 条游客记录`)
  }

  const columns = useMemo(() => [
    { title: '姓名', dataIndex: 'name', width: 100, fixed: 'left' as const },
    {
      title: '性别',
      dataIndex: 'gender',
      width: 70,
      render: (v?: TouristItem['gender']) => (v ? GenderLabels[v] : '-'),
    },
    {
      title: '证件类型',
      dataIndex: 'idType',
      width: 130,
      render: (v: TouristItem['idType']) => IdTypeLabels[v],
    },
    { title: '证件号码', dataIndex: 'idNumber', width: 150, render: (v: string) => maskIdNumber(v) || '-' },
    { title: '出生日期', dataIndex: 'birthDate', width: 110, render: (v?: string) => v || '-' },
    { title: '年龄', dataIndex: 'age', width: 60, render: (v?: number) => (v ?? '-') },
    { title: '国籍/地区', dataIndex: 'nationality', width: 100, render: (v?: string) => v || '-' },
    {
      title: '客源地',
      key: 'sourcePlace',
      width: 100,
      render: (_: unknown, r: TouristRow) => r.sourcePlace || r.nationality || '-',
    },
    { title: '手机号', dataIndex: 'phone', width: 120, render: (v?: string) => (v ? maskPhone(v) : '-') },
    {
      title: '合同状态',
      dataIndex: 'contractStatus',
      width: 90,
      render: (v?: string) => (v ? <Tag color="blue" style={{ margin: 0 }}>{v}</Tag> : '-'),
    },
    { title: '合同编号', dataIndex: 'contractNo', width: 150, render: (v?: string) => v || '-' },
    { title: '所属旅行社', dataIndex: 'createdByOrg', width: 180 },
    { title: '团组名称', dataIndex: 'teamName', width: 160 },
    { title: '团组编号', dataIndex: 'dispatchNo', width: 130 },
    { title: '出团日期', dataIndex: 'travelStart', width: 110 },
    {
      title: '操作',
      key: 'op',
      width: 90,
      fixed: 'right' as const,
      render: (_: unknown, r: TouristRow) => (
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/subsidy/${r.applicationId}`)}>
          查看
        </Button>
      ),
    },
  ], [navigate])

  return (
    <div>
      {/* 查询条件 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Form layout="vertical">
          <Row gutter={16}>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item label="姓名">
                <Input value={query.name} placeholder="模糊匹配" allowClear onChange={(e) => update('name', e.target.value)} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item label="性别">
                <Select
                  value={query.gender}
                  placeholder="选择性别"
                  allowClear
                  onChange={(v) => update('gender', v)}
                  options={[{ label: '男', value: 'male' }, { label: '女', value: 'female' }, { label: '未知', value: 'unknown' }]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item label="证件类型">
                <Select
                  value={query.idType}
                  placeholder="选择证件类型"
                  allowClear
                  onChange={(v) => update('idType', v)}
                  options={Object.entries(IdTypeLabels).map(([value, label]) => ({ value, label }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item label="证件号码">
                <Input value={query.idNumber} placeholder="模糊匹配" allowClear onChange={(e) => update('idNumber', e.target.value)} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item label="出生日期">
                <DatePicker.RangePicker
                  style={{ width: '100%' }}
                  value={query.birthDateRange ? [query.birthDateRange[0] ? dayjs(query.birthDateRange[0]) : null, query.birthDateRange[1] ? dayjs(query.birthDateRange[1]) : null] : null}
                  onChange={(_, ds) => update('birthDateRange', ds[0] || ds[1] ? ([ds[0], ds[1]] as [string, string]) : undefined)}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item label="年龄范围">
                <Space>
                  <InputNumber min={0} max={150} placeholder="最小" style={{ width: 90 }} value={query.ageMin} onChange={(v) => update('ageMin', v ?? undefined)} />
                  <span>~</span>
                  <InputNumber min={0} max={150} placeholder="最大" style={{ width: 90 }} value={query.ageMax} onChange={(v) => update('ageMax', v ?? undefined)} />
                </Space>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item label="国籍/地区">
                <Select mode="multiple" placeholder="可多选" allowClear maxTagCount="responsive" value={query.nationalities} onChange={(v) => update('nationalities', v)} options={nationalityOptions.map((v) => ({ value: v, label: v }))} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item label="客源地">
                <Select mode="multiple" placeholder="可多选" allowClear maxTagCount="responsive" value={query.sourcePlaces} onChange={(v) => update('sourcePlaces', v)} options={sourcePlaceOptions.map((v) => ({ value: v, label: v }))} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item label="手机号">
                <Input value={query.phone} placeholder="模糊匹配" allowClear onChange={(e) => update('phone', e.target.value)} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item label="合同状态">
                <Select
                  value={query.contractStatus}
                  placeholder="选择合同状态"
                  allowClear
                  onChange={(v) => update('contractStatus', v || undefined)}
                  options={[{ label: '已签订', value: '已签订' }, { label: '未签订', value: '未签订' }, { label: '履约中', value: '履约中' }, { label: '已解除', value: '已解除' }]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item label="合同编号">
                <Input value={query.contractNo} placeholder="模糊匹配" allowClear onChange={(e) => update('contractNo', e.target.value)} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item label="所属旅行社">
                <Select mode="multiple" placeholder="可多选" allowClear maxTagCount="responsive" value={query.createdByOrgs} onChange={(v) => update('createdByOrgs', v)} options={orgOptions.map((v) => ({ value: v, label: v }))} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item label="团组名称">
                <Input value={query.teamName} placeholder="模糊匹配" allowClear onChange={(e) => update('teamName', e.target.value)} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item label="团组编号">
                <Input value={query.dispatchNo} placeholder="模糊匹配" allowClear onChange={(e) => update('dispatchNo', e.target.value)} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item label="出团日期">
                <DatePicker.RangePicker
                  style={{ width: '100%' }}
                  value={query.travelStartRange ? [query.travelStartRange[0] ? dayjs(query.travelStartRange[0]) : null, query.travelStartRange[1] ? dayjs(query.travelStartRange[1]) : null] : null}
                  onChange={(_, ds) => update('travelStartRange', ds[0] || ds[1] ? ([ds[0], ds[1]] as [string, string]) : undefined)}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row justify="end">
            <Space>
              <Button icon={<ReloadOutlined />} onClick={doReset}>重置</Button>
              <Button icon={<DownloadOutlined />} onClick={handleExport}>导出</Button>
              <Button type="primary" icon={<SearchOutlined />} onClick={doSearch}>查询</Button>
            </Space>
          </Row>
        </Form>
      </Card>

      {/* 结果列表 */}
      <Card
        size="small"
        title={
          <Space>
            <UserOutlined style={{ color: '#1677ff' }} />
            <span>游客明细列表</span>
            <Tag color="blue">共 {filtered.length} 人</Tag>
          </Space>
        }
      >
        <Table
          rowKey={(r) => `${r.applicationId}-${r.key}`}
          dataSource={filtered}
          columns={columns}
          size="small"
          scroll={{ x: 1900 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (t) => `共 ${t} 人`,
          }}
          locale={{ emptyText: '暂无游客数据' }}
        />
      </Card>
    </div>
  )
}

export default function SubsidyStatistics() {
  const { subsidyApplications } = useStore()

  // 终审员可见：仅已提交 + 已锁定
  const visibleApps = useMemo(
    () => subsidyApplications.filter((a) => a.status !== 'draft'),
    [subsidyApplications],
  )

  // 1. 总览
  // 入境游客统计口径：
  // 总人次 = 各申报游客名单记录数累计（同一游客多次随团入黔重复计数）
  // 总数 = 按证件号去重后的游客人数（同一游客只计一次），因此总数 ≤ 总人次
  const totals = useMemo(() => {
    const totalApps = visibleApps.length
    const totalAmount = visibleApps.reduce((s, a) => s + (a.totalAmount || 0), 0)
    const seenIds = new Set<string>()
    let inboundPersonTimes = 0
    visibleApps.forEach((a) => {
      const tourists = a.teamPresetSnapshot.tourists || []
      inboundPersonTimes += tourists.length
      tourists.forEach((t) => {
        const key = t.idNumber || (t.name ? `${t.name}|${t.nationality || ''}` : '')
        if (key) seenIds.add(key)
      })
    })
    const orgCount = new Set(visibleApps.map((a) => a.createdByOrg)).size
    return { totalApps, totalAmount, inboundPersons: seenIds.size, inboundPersonTimes, orgCount }
  }, [visibleApps])

  // 2. 按旅行社统计
  const orgStats = useMemo(() => {
    const map: Record<string, { count: number; amount: number; tourists: number }> = {}
    visibleApps.forEach((a) => {
      if (!map[a.createdByOrg]) map[a.createdByOrg] = { count: 0, amount: 0, tourists: 0 }
      map[a.createdByOrg].count++
      map[a.createdByOrg].amount += a.totalAmount || 0
      map[a.createdByOrg].tourists += a.totalTeamSize || 0
    })
    return Object.entries(map)
      .map(([org, v]) => ({ org, ...v }))
      .sort((a, b) => b.amount - a.amount)
  }, [visibleApps])

  // 3. 按奖励类型统计（B/C/E 三大类）
  const rewardTypeStats = useMemo(() => {
    const trAmt = visibleApps.reduce(
      (s, a) => s + a.teamReceptionRows.reduce((s2, r) => s2 + (Number(r.amount) || 0), 0),
      0,
    )
    const spAmt = visibleApps.reduce(
      (s, a) => s + a.specialTourismRows.reduce((s2, r) => s2 + (Number(r.amount) || 0), 0),
      0,
    )
    const cpAmt = visibleApps.reduce(
      (s, a) => s + a.culturePromotionRows.reduce((s2, r) => s2 + (Number(r.amount) || 0), 0),
      0,
    )
    return [
      { type: 'team_reception', label: '入境旅游团队接待奖励', amount: trAmt, count: visibleApps.filter((a) => a.teamReceptionRows.some((r) => r.amount > 0)).length },
      { type: 'special_tourism', label: '专项旅游奖励', amount: spAmt, count: visibleApps.filter((a) => a.specialTourismRows.some((r) => r.amount > 0)).length },
      { type: 'culture_promotion', label: '旅游宣传奖励', amount: cpAmt, count: visibleApps.filter((a) => a.culturePromotionRows.some((r) => r.amount > 0)).length },
    ]
  }, [visibleApps])

  // 4. 游客来源分析
  // 4.1 按国籍/地区统计
  const nationalityStats = useMemo(() => {
    const map: Record<string, number> = {}
    visibleApps.forEach((a) => {
      a.teamPresetSnapshot.tourists.forEach((t) => {
        const k = t.nationality || '未知'
        map[k] = (map[k] || 0) + 1
      })
    })
    return Object.entries(map)
      .map(([k, v]) => ({ name: k, count: v }))
      .sort((a, b) => b.count - a.count)
  }, [visibleApps])

  // 4.2 按客源地（城市）统计
  const sourcePlaceStats = useMemo(() => {
    const map: Record<string, number> = {}
    visibleApps.forEach((a) => {
      a.teamPresetSnapshot.tourists.forEach((t) => {
        const k = t.sourcePlace || t.nationality || '未知'
        map[k] = (map[k] || 0) + 1
      })
    })
    return Object.entries(map)
      .map(([k, v]) => ({ name: k, count: v }))
      .sort((a, b) => b.count - a.count)
  }, [visibleApps])

  // 4.3 按年龄段统计
  const ageStats = useMemo(() => {
    const buckets = AGE_BUCKETS.map((b) => ({ ...b, count: 0, male: 0, female: 0, unknown: 0 }))
    visibleApps.forEach((a) => {
      a.teamPresetSnapshot.tourists.forEach((t) => {
        if (typeof t.age !== 'number') return
        const bucket = buckets.find((b) => t.age! >= b.min && t.age! <= b.max)
        if (bucket) {
          bucket.count++
          if (t.gender === 'male') bucket.male++
          else if (t.gender === 'female') bucket.female++
          else bucket.unknown++
        }
      })
    })
    return buckets
  }, [visibleApps])

  // 4.4 按性别统计
  const genderStats = useMemo(() => {
    const map: Record<string, number> = { male: 0, female: 0, unknown: 0 }
    visibleApps.forEach((a) => {
      a.teamPresetSnapshot.tourists.forEach((t) => {
        const k = t.gender || 'unknown'
        map[k] = (map[k] || 0) + 1
      })
    })
    return [
      { name: '男性', value: map.male },
      { name: '女性', value: map.female },
      { name: '未知', value: map.unknown },
    ].filter((s) => s.value > 0)
  }, [visibleApps])

  // 5. 按月申报趋势
  const trendData = useMemo(() => {
    const months = ['2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12', '2027-01']
    return months.map((m) => ({
      month: m,
      count: visibleApps.filter((a) => (a.submitTime || a.createTime).startsWith(m)).length,
      amount: visibleApps
        .filter((a) => (a.submitTime || a.createTime).startsWith(m))
        .reduce((s, a) => s + (a.totalAmount || 0), 0),
      tourists: visibleApps
        .filter((a) => (a.submitTime || a.createTime).startsWith(m))
        .reduce((s, a) => s + (a.totalTeamSize || 0), 0),
    }))
  }, [visibleApps])

  // ============ ECharts 配置 ============
  // 奖励类型金额柱图
  const rewardTypeBarOption = {
    tooltip: {
      trigger: 'axis',
      formatter: (p: any) => `${p[0].name}<br/>金额：¥${(p[0].value / 10000).toFixed(2)}万`,
    },
    grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
    xAxis: {
      type: 'category',
      data: rewardTypeStats.map((c) => c.label),
      axisLabel: { interval: 0, rotate: 15, fontSize: 11 },
    },
    yAxis: { type: 'value', name: '金额(元)', axisLabel: { formatter: (v: number) => v / 10000 + '万' } },
    series: [
      {
        type: 'bar',
        data: rewardTypeStats.map((c) => c.amount),
        itemStyle: { color: '#1677ff', borderRadius: [4, 4, 0, 0] },
        barWidth: '50%',
      },
    ],
  }

  // 申报趋势
  const trendOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['申报数量', '奖励金额', '游客人次'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: trendData.map((t) => t.month), boundaryGap: false },
    yAxis: [
      { type: 'value', name: '数量', position: 'left' },
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
      {
        name: '游客人次',
        type: 'line',
        data: trendData.map((t) => t.tourists),
        smooth: true,
        itemStyle: { color: '#fa8c16' },
      },
    ],
  }

  // 国籍/地区分布
  const nationalityPieOption = {
    tooltip: { trigger: 'item', formatter: '{b}: {c}人 ({d}%)' },
    legend: { orient: 'vertical', left: 'left', textStyle: { fontSize: 11 } },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['60%', '50%'],
        data: nationalityStats.map((s) => ({ value: s.count, name: s.name })),
        emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' } },
        label: { formatter: '{b}\n{d}%', fontSize: 11 },
      },
    ],
  }

  // 客源地（城市）TOP10 柱图
  const sourcePlaceBarOption = {
    tooltip: { trigger: 'axis', formatter: (p: any) => `${p[0].name}<br/>游客：${p[0].value}人` },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'value', name: '游客数' },
    yAxis: {
      type: 'category',
      data: sourcePlaceStats.slice(0, 10).map((s) => s.name).reverse(),
      axisLabel: { fontSize: 11 },
    },
    series: [
      {
        type: 'bar',
        data: sourcePlaceStats.slice(0, 10).map((s) => s.count).reverse(),
        itemStyle: { color: '#13c2c2', borderRadius: [0, 4, 4, 0] },
        barWidth: '60%',
        label: { show: true, position: 'right', formatter: '{c}人', fontSize: 11 },
      },
    ],
  }

  // 年龄段分布
  const ageBarOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['男', '女', '未知'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: ageStats.map((a) => a.label) },
    yAxis: { type: 'value', name: '人数' },
    series: [
      {
        name: '男',
        type: 'bar',
        stack: 'total',
        data: ageStats.map((a) => a.male),
        itemStyle: { color: '#1677ff' },
      },
      {
        name: '女',
        type: 'bar',
        stack: 'total',
        data: ageStats.map((a) => a.female),
        itemStyle: { color: '#eb2f96' },
      },
      {
        name: '未知',
        type: 'bar',
        stack: 'total',
        data: ageStats.map((a) => a.unknown),
        itemStyle: { color: '#bfbfbf' },
      },
    ],
  }

  // 性别分布饼图
  const genderPieOption = {
    tooltip: { trigger: 'item', formatter: '{b}: {c}人 ({d}%)' },
    legend: { orient: 'horizontal', bottom: 0, textStyle: { fontSize: 11 } },
    color: ['#1677ff', '#eb2f96', '#bfbfbf'],
    series: [
      {
        type: 'pie',
        radius: '60%',
        center: ['50%', '45%'],
        data: genderStats,
        label: { formatter: '{b}\n{c}人 ({d}%)', fontSize: 11 },
      },
    ],
  }

  return (
    <>
      <PageHeader
        title="补贴管理数据统计"
        breadcrumb={[{ title: '首页', path: '/' }, { title: '引客入黔补贴管理', path: '/subsidy' }, { title: '数据统计' }]}
      />
      <PageContainer>
        {visibleApps.length === 0 ? (
          <Card>
            <Empty description="暂无可统计的已提交申报记录" />
          </Card>
        ) : (
          <Tabs
            defaultActiveKey="overview"
            items={[
              {
                key: 'overview',
                label: '统计概览',
                children: (
          <>
            {/* 顶部指标 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col flex={1}>
                <Card>
                  <Statistic
                    title="申报总数"
                    value={totals.totalApps}
                    suffix="项"
                    prefix={<AuditOutlined />}
                    valueStyle={{ color: '#1677ff' }}
                  />
                </Card>
              </Col>
              <Col flex={1}>
                <Card>
                  <Statistic
                    title="申请奖励合计"
                    value={totals.totalAmount}
                    prefix="¥"
                    precision={2}
                    valueStyle={{ color: '#fa541c' }}
                  />
                </Card>
              </Col>
              <Col flex={1}>
                <Card>
                  <Statistic
                    title="申报旅行社"
                    value={totals.orgCount}
                    suffix="家"
                    prefix={<TeamOutlined />}
                    valueStyle={{ color: '#722ed1' }}
                  />
                </Card>
              </Col>
              <Col flex={1}>
                <Card>
                  <Statistic
                    title={(
                      <Tooltip title="按证件号去重统计的实际入境游客人数（同一游客多次入黔只计一次）">
                        <span>入境游客总数</span>
                      </Tooltip>
                    )}
                    value={totals.inboundPersons}
                    suffix="人"
                    prefix={<GlobalOutlined />}
                    valueStyle={{ color: '#13c2c2' }}
                  />
                </Card>
              </Col>
              <Col flex={1}>
                <Card>
                  <Statistic
                    title={(
                      <Tooltip title="各申报团组游客名单的累计入境人次（同一游客多次随团入黔重复计数）">
                        <span>入境游客总人次</span>
                      </Tooltip>
                    )}
                    value={totals.inboundPersonTimes}
                    suffix="人次"
                    prefix={<RiseOutlined />}
                    valueStyle={{ color: '#eb2f96' }}
                  />
                </Card>
              </Col>
            </Row>

            {/* 奖励类型 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={24}>
                <Card title="各类奖励金额对比" size="small">
                  <ReactECharts option={rewardTypeBarOption} style={{ height: 280 }} />
                </Card>
              </Col>
            </Row>

            {/* 申报趋势 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={24}>
                <Card title="申报趋势（按月）" size="small">
                  <ReactECharts option={trendOption} style={{ height: 320 }} />
                </Card>
              </Col>
            </Row>

            {/* 游客来源分析：国籍 + 客源地 */}
            <Card
              title={
                <Space>
                  <GlobalOutlined style={{ color: '#1677ff' }} />
                  <span>游客来源分析</span>
                  <Tag color="blue">按国籍/地区 + 客源地</Tag>
                </Space>
              }
              size="small"
              style={{ marginBottom: 16 }}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Card type="inner" title="按国籍/地区分布" size="small">
                    <ReactECharts option={nationalityPieOption} style={{ height: 320 }} />
                  </Card>
                </Col>
                <Col span={12}>
                  <Card type="inner" title="按客源地（城市）TOP10" size="small">
                    <ReactECharts option={sourcePlaceBarOption} style={{ height: 320 }} />
                  </Card>
                </Col>
              </Row>
            </Card>

            {/* 游客画像：年龄 + 性别 */}
            <Card
              title={
                <Space>
                  <UserOutlined style={{ color: '#eb2f96' }} />
                  <span>游客画像分析</span>
                  <Tag color="magenta">按年龄段 + 性别</Tag>
                </Space>
              }
              size="small"
              style={{ marginBottom: 16 }}
            >
              <Row gutter={16}>
                <Col span={16}>
                  <Card type="inner" title="年龄段分布（按性别堆叠）" size="small">
                    <ReactECharts option={ageBarOption} style={{ height: 320 }} />
                  </Card>
                </Col>
                <Col span={8}>
                  <Card type="inner" title="性别分布" size="small">
                    <ReactECharts option={genderPieOption} style={{ height: 320 }} />
                  </Card>
                </Col>
              </Row>

              {/* 年龄段明细表 */}
              <Card type="inner" title="年龄段明细" size="small" style={{ marginTop: 16 }}>
                <Table
                  rowKey="label"
                  dataSource={ageStats}
                  pagination={false}
                  size="small"
                  columns={[
                    { title: '年龄段', dataIndex: 'label', width: 140 },
                    { title: '总数', dataIndex: 'count', width: 100, render: (v: number) => `${v}人` },
                    { title: '男', dataIndex: 'male', width: 100, render: (v: number) => `${v}人` },
                    { title: '女', dataIndex: 'female', width: 100, render: (v: number) => `${v}人` },
                    { title: '未知', dataIndex: 'unknown', width: 100, render: (v: number) => `${v}人` },
                    {
                      title: '占比',
                      key: 'pct',
                      render: (_: any, r: any) => {
                        const total = ageStats.reduce((s, x) => s + x.count, 0)
                        const pct = total > 0 ? (r.count / total) * 100 : 0
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
            </Card>

            {/* 旅行社排名 */}
            <Card
              title={
                <Space>
                  <DollarOutlined style={{ color: '#fa541c' }} />
                  <span>旅行社申报排名</span>
                </Space>
              }
              size="small"
              style={{ marginBottom: 16 }}
            >
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
                  { title: '游客人次', dataIndex: 'tourists', width: 120, render: (v: number) => `${v} 人次` },
                  {
                    title: '申请奖励金额',
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
                      const pct = totals.totalAmount > 0 ? (r.amount / totals.totalAmount) * 100 : 0
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

          </>
                ),
              },
              {
                key: 'tourist',
                label: (
                  <Space>
                    <UserOutlined style={{ color: '#1677ff' }} />
                    <span>游客信息查询</span>
                  </Space>
                ),
                children: <TouristQueryPanel apps={visibleApps} />,
              },
            ]}
          />
        )}
      </PageContainer>
    </>
  )
}
