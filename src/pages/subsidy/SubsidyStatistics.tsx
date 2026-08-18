import { useMemo } from 'react'
import {
  Card,
  Row,
  Col,
  Statistic,
  Tag,
  Table,
  Typography,
  Space,
  Empty,
} from 'antd'
import ReactECharts from 'echarts-for-react'
import {
  TeamOutlined,
  DollarOutlined,
  GlobalOutlined,
  AuditOutlined,
  RiseOutlined,
  UserOutlined,
} from '@ant-design/icons'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import { useStore } from '../../store'
import { formatMoney } from '../../utils'

const { Text } = Typography

// 年龄分段
const AGE_BUCKETS = [
  { label: '18岁以下', min: 0, max: 17 },
  { label: '18-30岁', min: 18, max: 30 },
  { label: '31-45岁', min: 31, max: 45 },
  { label: '46-60岁', min: 46, max: 60 },
  { label: '60岁以上', min: 61, max: 200 },
]

export default function SubsidyStatistics() {
  const { subsidyApplications } = useStore()

  // 终审员可见：仅已提交 + 已锁定
  const visibleApps = useMemo(
    () => subsidyApplications.filter((a) => a.status !== 'draft'),
    [subsidyApplications],
  )

  // 1. 总览
  const totals = useMemo(() => {
    const totalApps = visibleApps.length
    const totalAmount = visibleApps.reduce((s, a) => s + (a.totalAmount || 0), 0)
    const totalTeamSize = visibleApps.reduce((s, a) => s + (a.totalTeamSize || 0), 0)
    const totalInbound = visibleApps.reduce(
      (s, a) => s + (a.teamPresetSnapshot.inboundTourists || 0),
      0,
    )
    const orgCount = new Set(visibleApps.map((a) => a.createdByOrg)).size
    return { totalApps, totalAmount, totalTeamSize, totalInbound, orgCount }
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
                    title="游客总数"
                    value={totals.totalTeamSize}
                    suffix="人次"
                    prefix={<GlobalOutlined />}
                    valueStyle={{ color: '#13c2c2' }}
                  />
                </Card>
              </Col>
              <Col flex={1}>
                <Card>
                  <Statistic
                    title="入境游客数"
                    value={totals.totalInbound}
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
        )}
      </PageContainer>
    </>
  )
}
