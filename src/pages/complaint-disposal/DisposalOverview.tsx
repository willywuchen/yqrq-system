// 省文旅厅 / 系统管理员 - 处置总览（分市州处置情况统计，支撑督办决策）
import { useMemo } from 'react'
import { Button, Card, Col, Row, Statistic, Table, Tag } from 'antd'
import { EyeOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import { useStore } from '../../store'
import { GUIZHOU_CITIES } from '../../types'
import {
  ElapsedLevelColors,
  elapsedLevel,
  elapsedMsOf,
  formatElapsed,
} from '../../types/complaint-disposal'
import { shortCityName, useTick } from './shared'

interface CityRow {
  city: string
  total: number
  pending: number
  disposed: number
  avgDisposeMs: number | null // 已处置平均耗时
  maxPendingMs: number | null // 待处置中最长计时（动态）
  pendingSupervised: number
  supervisionTotal: number
}

export default function DisposalOverview() {
  const navigate = useNavigate()
  const { disposalComplaints } = useStore()
  const now = useTick()

  const rows = useMemo<CityRow[]>(() => {
    return GUIZHOU_CITIES.map((city) => {
      const list = disposalComplaints.filter((c) => c.city === city)
      const pending = list.filter((c) => c.status === 'pending')
      const disposed = list.filter((c) => c.status === 'disposed')
      const disposeMs = disposed.map((c) => elapsedMsOf(c, now))
      const pendingMs = pending.map((c) => elapsedMsOf(c, now))
      return {
        city,
        total: list.length,
        pending: pending.length,
        disposed: disposed.length,
        avgDisposeMs: disposeMs.length
          ? disposeMs.reduce((s, v) => s + v, 0) / disposeMs.length
          : null,
        maxPendingMs: pendingMs.length ? Math.max(...pendingMs) : null,
        pendingSupervised: pending.filter((c) => c.supervisions.length > 0).length,
        supervisionTotal: list.reduce((s, c) => s + c.supervisions.length, 0),
      }
    })
  }, [disposalComplaints, now])

  const totals = useMemo(() => {
    const pending = disposalComplaints.filter((c) => c.status === 'pending')
    const disposed = disposalComplaints.filter((c) => c.status === 'disposed')
    const disposeMs = disposed.map((c) => elapsedMsOf(c, now))
    return {
      total: disposalComplaints.length,
      pending: pending.length,
      disposed: disposed.length,
      avgDisposeMs: disposeMs.length ? disposeMs.reduce((s, v) => s + v, 0) / disposeMs.length : null,
      supervisionTotal: disposalComplaints.reduce((s, c) => s + c.supervisions.length, 0),
    }
  }, [disposalComplaints, now])

  const chartOption = useMemo(
    () => ({
      tooltip: { trigger: 'axis' },
      legend: { data: ['待处置', '已处置'] },
      grid: { left: 40, right: 16, top: 40, bottom: 30 },
      xAxis: { type: 'category' as const, data: rows.map((r) => shortCityName(r.city)) },
      yAxis: { type: 'value' as const, minInterval: 1 },
      series: [
        {
          name: '待处置',
          type: 'bar' as const,
          data: rows.map((r) => r.pending),
          itemStyle: { color: '#ff4d4f' },
          barMaxWidth: 26,
        },
        {
          name: '已处置',
          type: 'bar' as const,
          data: rows.map((r) => r.disposed),
          itemStyle: { color: '#52c41a' },
          barMaxWidth: 26,
        },
      ],
    }),
    [rows],
  )

  const columns = [
    {
      title: '市州',
      dataIndex: 'city',
      width: 190,
      render: (city: string) => <b>{city}</b>,
    },
    { title: '投诉总量', dataIndex: 'total', width: 100, align: 'center' as const },
    {
      title: '待处置',
      dataIndex: 'pending',
      width: 100,
      align: 'center' as const,
      render: (v: number) => (v > 0 ? <span style={{ color: '#cf1322', fontWeight: 600 }}>{v}</span> : v),
    },
    { title: '已处置', dataIndex: 'disposed', width: 100, align: 'center' as const },
    {
      title: '平均处置耗时',
      key: 'avg',
      width: 130,
      align: 'center' as const,
      render: (_: unknown, r: CityRow) => (r.avgDisposeMs == null ? '—' : formatElapsed(r.avgDisposeMs)),
    },
    {
      title: '最长未处置计时',
      key: 'maxPending',
      width: 140,
      align: 'center' as const,
      render: (_: unknown, r: CityRow) => {
        if (r.maxPendingMs == null) return '—'
        const color = ElapsedLevelColors[elapsedLevel(r.maxPendingMs)]
        return (
          <span style={{ color, fontWeight: 600 }}>{formatElapsed(r.maxPendingMs)}</span>
        )
      },
    },
    {
      title: '待处置 · 被督办',
      dataIndex: 'pendingSupervised',
      width: 130,
      align: 'center' as const,
      render: (v: number) => (v > 0 ? <Tag color="red">{v}</Tag> : v),
    },
    { title: '累计督办次数', dataIndex: 'supervisionTotal', width: 120, align: 'center' as const },
    {
      title: '操作',
      key: 'action',
      width: 110,
      render: (_: unknown, r: CityRow) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/complaint-disposal?city=${encodeURIComponent(r.city)}`)}
        >
          查看投诉
        </Button>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="处置总览"
        breadcrumb={[{ title: '投诉处置管理' }, { title: '处置总览' }]}
        extra={<Button onClick={() => navigate('/complaint-disposal')}>全省投诉</Button>}
      />
      <PageContainer>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={12} md={8} xl={4}>
            <Card className="stat-card">
              <Statistic title="投诉总量" value={totals.total} />
            </Card>
          </Col>
          <Col xs={12} md={8} xl={5}>
            <Card className="stat-card">
              <Statistic title="待处置" value={totals.pending} valueStyle={{ color: '#cf1322' }} />
            </Card>
          </Col>
          <Col xs={12} md={8} xl={5}>
            <Card className="stat-card">
              <Statistic title="已处置" value={totals.disposed} valueStyle={{ color: '#3f8600' }} />
            </Card>
          </Col>
          <Col xs={12} md={8} xl={5}>
            <Card className="stat-card">
              <Statistic
                title="全省平均处置耗时"
                value={totals.avgDisposeMs == null ? '—' : formatElapsed(totals.avgDisposeMs)}
              />
            </Card>
          </Col>
          <Col xs={12} md={8} xl={5}>
            <Card className="stat-card">
              <Statistic title="累计督办次数" value={totals.supervisionTotal} />
            </Card>
          </Col>
        </Row>

        <Card title="各市州投诉处置情况" style={{ marginBottom: 16 }}>
          <ReactECharts option={chartOption} style={{ height: 300 }} notMerge />
        </Card>

        <Card title="分市州统计">
          <Table
            rowKey="city"
            size="middle"
            columns={columns}
            dataSource={rows}
            pagination={false}
          />
          <div style={{ color: '#8c8c8c', fontSize: 12, marginTop: 8 }}>
            说明：投诉无处置时限要求，「最长未处置计时」「平均处置耗时」仅作为省级督办的工作参考；计时自市州接收起算，处置完成即停止。
          </div>
        </Card>
      </PageContainer>
    </>
  )
}
