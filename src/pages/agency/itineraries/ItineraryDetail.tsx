import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { App, Button, Card, Descriptions, QRCode, Result, Space, Table, Tag, Typography } from 'antd'
import { DownloadOutlined, LeftOutlined } from '@ant-design/icons'
import PageHeader, { PageContainer } from '../../../components/PageHeader'
import { useStore } from '../../../store'
import { AGENCY_NAMES, CURRENT_AGENCY } from '../../../mock/agency'
import dayjs from 'dayjs'
import {
  ItineraryChannelLabels,
  ItineraryNatureLabels,
  ItineraryStatusColors,
  ItineraryStatusLabels,
  TouristCategoryLabels,
  TouristIdTypeLabels,
  TourRegionLabels,
  VehicleNatureLabels,
  canEditItinerary,
  displayStatus,
  maskIdNo,
  maskLicenseNo,
  maskPhone,
  type DayPlan,
  type EItinerary,
  type Tourist,
} from '../../../types/agency'
import { nowStr } from '../../../utils'

interface ItineraryDetailProps {
  /** 只读模式（文旅厅"团行程单查询"）：跨旅行社查看、仅查看不提供提交/撤销/删除 */
  readOnly?: boolean
  /** 是否展示旅行社名称（厅侧查询用） */
  showAgencyName?: boolean
}

/**
 * 团行程单详情页
 * 页头（单号+状态+操作）→ 行程信息区 → 按天明细卡 → 游客名单（脱敏+导出）→ 预定车辆 → 导游信息 → 返回
 * 旅行社角色：可提交/撤销/删除（待提交状态）；文旅厅角色：readOnly 只读查看
 */
export default function ItineraryDetail({ readOnly = false, showAgencyName = false }: ItineraryDetailProps) {
  const navigate = useNavigate()
  const { id } = useParams()
  const { modal, message } = App.useApp()
  const { agencyItineraries, submitAgencyItinerary, withdrawAgencyItinerary, deleteAgencyItinerary, appendAgencyLog } = useStore()

  const record = useMemo(
    () =>
      agencyItineraries.find(
        (x) => x.id === id && (readOnly || x.agencyId === CURRENT_AGENCY.id),
      ),
    [agencyItineraries, id, readOnly],
  )

  if (!record) {
    return (
      <Result
        status="404"
        title="行程单不存在"
        extra={
          <Button type="primary" onClick={() => navigate(readOnly ? '/tour/itineraries' : '/agency/itineraries')}>
            返回列表
          </Button>
        }
      />
    )
  }

  const status = displayStatus(record)
  const editable = canEditItinerary(record)
  const categoryCount = { adult: 0, senior: 0, child: 0, infant: 0 }
  record.tourists.forEach((t) => (categoryCount[t.category] += 1))

  const handleWithdraw = () => {
    modal.confirm({
      title: '撤销提交',
      content: '撤销后行程单回到待提交，省文旅将不再可见，确认撤销？',
      okType: 'danger',
      okText: '撤销提交',
      cancelText: '取消',
      onOk: () => {
        withdrawAgencyItinerary(record.id)
        appendAgencyLog({
          id: `L${Date.now()}`,
          agencyId: CURRENT_AGENCY.id,
          account: '李明',
          action: '撤销提交行程单',
          target: record.itineraryNo,
          createdAt: nowStr(),
        })
        message.success('已撤销提交，可继续编辑后重新提交')
      },
    })
  }

  const handleDelete = () => {
    modal.confirm({
      title: '删除行程单',
      content: `删除后不可恢复，确认删除「${record.itineraryNo}」吗？`,
      okType: 'danger',
      okText: '删除',
      cancelText: '取消',
      onOk: () => {
        deleteAgencyItinerary(record.id)
        message.success('已删除行程单')
        navigate('/agency/itineraries')
      },
    })
  }

  // 名单导出：CSV 含全量证件号（页面脱敏仅展示用），导出动作写操作记录（PRD §5.7/§8）
  const handleExport = () => {
    const header = '序号,姓名,证件类型,证件号码,性别,生日,年龄,手机号码,游客类别,客源地'
    const lines = record.tourists.map((t, i) =>
      [
        i + 1,
        t.name,
        TouristIdTypeLabels[t.idType],
        t.idNo,
        t.gender === 'male' ? '男' : t.gender === 'female' ? '女' : '',
        t.birthDate ?? '',
        t.age ?? '',
        t.phone ?? '',
        TouristCategoryLabels[t.category],
        t.origin,
      ].join(','),
    )
    const blob = new Blob([`\uFEFF${[header, ...lines].join('\n')}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `游客名单_${record.itineraryNo}.csv`
    a.click()
    URL.revokeObjectURL(url)
    appendAgencyLog({
      id: `L${Date.now()}`,
      agencyId: CURRENT_AGENCY.id,
      account: '李明',
      action: '导出游客名单',
      target: record.itineraryNo,
      detail: `导出 ${record.touristCount} 条`,
      createdAt: nowStr(),
    })
    message.success(`已导出 ${record.touristCount} 条游客信息`)
  }

  const dayCard = (d: DayPlan) => (
    <Card
      key={d.dayNo}
      type="inner"
      size="small"
      title={`第 ${d.dayNo} 天${d.date ? `（${dayjs(d.date).format('M月D日')}）` : ''}`}
      style={{ marginBottom: 10 }}
    >
      <Descriptions column={1} size="small">
        <Descriptions.Item label="日期">{d.date ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="用餐">{d.mealName ?? d.lunchName ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="住宿酒店">{d.hotelName ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="景区">
          {d.scenicSpotNames?.length ? (
            <Space wrap size={4}>
              {d.scenicSpotNames.map((s) => (
                <Tag key={s} color="green">
                  {s}
                </Tag>
              ))}
            </Space>
          ) : (
            '—'
          )}
        </Descriptions.Item>
        <Descriptions.Item label="购物店">
          {d.shoppingStoreNames?.length ? (
            <Space wrap size={4}>
              {d.shoppingStoreNames.map((s) => (
                <Tag key={s} color="purple">
                  {s}
                </Tag>
              ))}
            </Space>
          ) : (
            '—'
          )}
        </Descriptions.Item>
        <Descriptions.Item label="当日说明">{d.description ?? '—'}</Descriptions.Item>
      </Descriptions>
    </Card>
  )

  const touristColumns = [
    { title: '序号', width: 60, render: (_: unknown, __: unknown, i: number) => i + 1 },
    { title: '姓名', dataIndex: 'name', width: 90 },
    { title: '证件类型', dataIndex: 'idType', width: 90, render: (t: Tourist['idType']) => TouristIdTypeLabels[t] },
    { title: '证件号码', dataIndex: 'idNo', render: (v: string) => <span style={{ fontFamily: 'monospace' }}>{maskIdNo(v)}</span> },
    { title: '性别', dataIndex: 'gender', width: 70, render: (v?: string) => (v === 'male' ? '男' : v === 'female' ? '女' : '—') },
    { title: '生日', dataIndex: 'birthDate', width: 110, render: (v?: string) => v ?? '—' },
    { title: '年龄', dataIndex: 'age', width: 70, render: (v?: number) => (v != null ? v : '—') },
    { title: '手机号码', dataIndex: 'phone', width: 130, render: (v?: string) => (v ? maskPhone(v) : '—') },
    { title: '游客类别', dataIndex: 'category', width: 90, render: (c: Tourist['category']) => <Tag>{TouristCategoryLabels[c]}</Tag> },
    { title: '客源地', dataIndex: 'origin', width: 140 },
  ]

  return (
    <>
      <PageHeader
        title="行程单详情"
        breadcrumb={
          readOnly
            ? [{ title: '团行程单查询' }, { title: '行程单列表', path: '/tour/itineraries' }, { title: record.itineraryNo }]
            : [{ title: '团行程管理' }, { title: '团行程单', path: '/agency/itineraries' }, { title: record.itineraryNo }]
        }
        extra={
          <Space>
            <Button icon={<LeftOutlined />} onClick={() => navigate(readOnly ? '/tour/itineraries' : '/agency/itineraries')}>
              返回
            </Button>
            {readOnly ? null : status === 'draft' && (
              <>
                <Button onClick={() => navigate(`/agency/itineraries/${record.id}/edit`)}>编辑</Button>
                <Button
                  type="primary"
                  onClick={() => {
                    if (record.touristCount === 0) {
                      message.warning('游客名单为 0 人，请先编辑补充名单后再提交')
                      return
                    }
                    modal.confirm({
                      title: '提交行程单',
                      content: '提交后省文旅角色即可见此行程信息，确认提交？',
                      okText: '提交',
                      cancelText: '取消',
                      onOk: () => {
                        submitAgencyItinerary(record.id)
                        appendAgencyLog({
                          id: `L${Date.now()}`,
                          agencyId: CURRENT_AGENCY.id,
                          account: '李明',
                          action: '提交行程单',
                          target: record.itineraryNo,
                          detail: '提交后省文旅可见',
                          createdAt: nowStr(),
                        })
                        message.success('已提交，省文旅可见')
                      },
                    })
                  }}
                >
                  提交
                </Button>
                <Button danger onClick={handleDelete}>
                  删除
                </Button>
              </>
            )}
            {status === 'submitted' && editable && (
              <Button danger onClick={handleWithdraw}>
                撤销提交
              </Button>
            )}
          </Space>
        }
      >
        <Space size="middle">
          <Tag color={ItineraryStatusColors[status]} style={{ fontSize: 14, padding: '2px 12px' }}>
            {ItineraryStatusLabels[status]}
          </Tag>
          {status === 'submitted' && (
            <Typography.Text type="secondary">省文旅可见 · 结团日（{record.returnTime.slice(0, 10)}，含当天）前可撤销提交并编辑</Typography.Text>
          )}
          {status === 'finished' && <Typography.Text type="secondary">行程已结束，单据锁定只读</Typography.Text>}
        </Space>
      </PageHeader>
      <PageContainer>
        <Card
          size="small"
          title="行程信息"
          style={{ marginBottom: 16 }}
          extra={
            status === 'draft' ? undefined : (
            <Space>
              <Typography.Text type="secondary">一团一码（扫码查看团信息）</Typography.Text>
              <QRCode
                value={JSON.stringify({
                  itineraryNo: record.itineraryNo,
                  groupNo: record.groupNo ?? '',
                  name: record.name,
                  tourRegion: record.tourRegion ? TourRegionLabels[record.tourRegion] : '',
                  departureTime: record.departureTime,
                  returnTime: record.returnTime,
                  departurePlace: record.departurePlace,
                  closingPlace: record.closingPlace,
                  guides: record.guides.map((g) => g.guideNameSnapshot),
                  touristCount: record.touristCount,
                })}
                size={88}
              />
            </Space>
            )
          }
        >
          <Descriptions bordered column={3} size="small">
            <Descriptions.Item label="行程名称" span={2}>{record.name}</Descriptions.Item>
            <Descriptions.Item label="行程单号">{record.itineraryNo}</Descriptions.Item>
            {showAgencyName && (
              <Descriptions.Item label="旅行社名称">
                <Tag color="geekblue">{AGENCY_NAMES[record.agencyId] ?? record.agencyId}</Tag>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="团号">{record.groupNo ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="旅游地域">
              {record.tourRegion ? <Tag color="blue">{TourRegionLabels[record.tourRegion]}</Tag> : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="行程性质">
              {record.nature ? ItineraryNatureLabels[record.nature] : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="获客渠道">{ItineraryChannelLabels[record.channel]}</Descriptions.Item>
            <Descriptions.Item label="出团日期时间">{record.departureTime}</Descriptions.Item>
            <Descriptions.Item label="结团日期时间">{record.returnTime}</Descriptions.Item>
            <Descriptions.Item label="总天数">{record.days} 天</Descriptions.Item>
            <Descriptions.Item label="总晚数">{record.nights != null ? `${record.nights} 晚` : '—'}</Descriptions.Item>
            <Descriptions.Item label="发团地址" span={1}>{record.departurePlace}</Descriptions.Item>
            <Descriptions.Item label="结团地址" span={2}>{record.closingPlace}</Descriptions.Item>
            <Descriptions.Item label="关联线路产品" span={2}>
              {record.productNameSnapshot ?? <Tag>手动创建</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">{record.createdAt}</Descriptions.Item>
            <Descriptions.Item label="游客人数">
              {record.touristCount} 人（成人 {categoryCount.adult} / 老人 {categoryCount.senior} / 儿童 {categoryCount.child} / 婴儿 {categoryCount.infant}）
            </Descriptions.Item>
            <Descriptions.Item label="四类单价">
              成人 ¥{record.prices.adult ?? '—'}｜老人 ¥{record.prices.senior ?? '—'}｜儿童 ¥{record.prices.child ?? '—'}｜婴儿 ¥{record.prices.infant ?? 0}
            </Descriptions.Item>
            <Descriptions.Item label="备注">{record.remark ?? '—'}</Descriptions.Item>
          </Descriptions>
        </Card>

        <Card size="small" title={`行程明细（${record.dayPlans.length} 天）`} style={{ marginBottom: 16 }}>
          {record.dayPlans.map(dayCard)}
        </Card>

        <Card
          size="small"
          title={`游客名单（${record.touristCount} 人）`}
          style={{ marginBottom: 16 }}
          extra={
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              导出
            </Button>
          }
        >
          <Table rowKey="id" size="small" columns={touristColumns} dataSource={record.tourists} pagination={false} />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            证件号码、手机号在页面脱敏展示；导出文件包含全量信息并已记录操作日志
          </Typography.Text>
        </Card>

        <Card size="small" title="预定车辆" style={{ marginBottom: 16 }}>
          {record.vehicleNature && (
            <Descriptions size="small" column={1} style={{ marginBottom: 8 }}>
              <Descriptions.Item label="用车性质">
                <Tag color="blue">{VehicleNatureLabels[record.vehicleNature]}</Tag>
              </Descriptions.Item>
            </Descriptions>
          )}
          {record.vehicles.length ? (
            record.vehicles.map((v, i) => (
              <Card key={v.id} type="inner" size="small" title={`车辆 ${i + 1}`} style={{ marginBottom: 10 }}>
                <Descriptions column={4} size="small">
                  <Descriptions.Item label="运输企业">{v.transportCompany || '—'}</Descriptions.Item>
                  <Descriptions.Item label="车牌号/编号">{v.plateNo || '—'}</Descriptions.Item>
                  <Descriptions.Item label="驾驶员">{v.driverName || '—'}</Descriptions.Item>
                  <Descriptions.Item label="驾驶员手机">{maskPhone(v.driverPhone)}</Descriptions.Item>
                  <Descriptions.Item label="座位数">{v.seatCount ?? '—'}</Descriptions.Item>
                  <Descriptions.Item label="车辆数">{v.vehicleCount ?? '—'}</Descriptions.Item>
                  <Descriptions.Item label="备注" span={2}>{v.remark ?? '—'}</Descriptions.Item>
                </Descriptions>
              </Card>
            ))
          ) : (
            <Typography.Text type="secondary">未登记车辆信息</Typography.Text>
          )}
        </Card>

        <Card size="small" title="导游信息" style={{ marginBottom: 16 }}>
          {record.guides.length ? (
            record.guides.map((g) => (
              <Card key={g.id} type="inner" size="small" title={g.guideNameSnapshot} style={{ marginBottom: 10 }}>
                <Descriptions column={3} size="small">
                  <Descriptions.Item label="预定日期">
                    {g.startDate} ~ {g.endDate}
                  </Descriptions.Item>
                  <Descriptions.Item label="性别">{g.guideGenderSnapshot ?? '—'}</Descriptions.Item>
                  <Descriptions.Item label="电话">{maskPhone(g.guidePhoneSnapshot)}</Descriptions.Item>
                  <Descriptions.Item label="导游证号">{maskLicenseNo(g.guideLicenseSnapshot)}</Descriptions.Item>
                </Descriptions>
              </Card>
            ))
          ) : (
            <Typography.Text type="secondary">未预定导游</Typography.Text>
          )}
        </Card>

        <Space style={{ marginTop: 8 }}>
          <Button icon={<LeftOutlined />} onClick={() => navigate(readOnly ? '/tour/itineraries' : '/agency/itineraries')}>
            返回列表
          </Button>
        </Space>
      </PageContainer>
    </>
  )
}

// 供类型检查的 EItinerary 引用（避免未使用告警）
export type { EItinerary }
