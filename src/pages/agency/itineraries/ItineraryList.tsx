import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { App, Button, DatePicker, Input, Modal, Select, Space, Table, Tag, Typography } from 'antd'
import { DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import type { Dayjs } from 'dayjs'
import PageHeader, { PageContainer } from '../../../components/PageHeader'
import { useStore } from '../../../store'
import { CURRENT_AGENCY } from '../../../mock/agency'
import {
  ItineraryChannelLabels,
  ItineraryNatureLabels,
  ItineraryStatusLabels,
  TourRegionLabels,
  canEditItinerary,
  displayStatus,
  type EItinerary,
  type ItineraryChannel,
  type ItineraryNature,
  type ItineraryStatus,
  type TourRegion,
} from '../../../types/agency'
import { nowStr } from '../../../utils'

/**
 * 电子行程单 · 列表与管理（PRD §5.5）
 * 提交后省文旅可见；结团日（含）前可撤销提交继续编辑，结团后锁定只读
 */
export default function ItineraryList() {
  const navigate = useNavigate()
  const { modal, message } = App.useApp()
  const { agencyItineraries, deleteAgencyItinerary, submitAgencyItinerary, withdrawAgencyItinerary, appendAgencyLog } = useStore()
  const [noKeyword, setNoKeyword] = useState('')
  const [nameKeyword, setNameKeyword] = useState('')
  const [status, setStatus] = useState<ItineraryStatus | undefined>()
  const [tourRegion, setTourRegion] = useState<TourRegion | undefined>()
  const [nature, setNature] = useState<ItineraryNature | undefined>()
  const [channel, setChannel] = useState<ItineraryChannel | undefined>()
  // 出团/结团合并为一个时间区间：起=出团时间，止=结团时间
  const [tripRange, setTripRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)
  const [guideName, setGuideName] = useState('')
  const [guidePhone, setGuidePhone] = useState('')

  const rows = useMemo(
    () =>
      agencyItineraries
        .filter((it) => it.agencyId === CURRENT_AGENCY.id)
        .map((it) => ({ ...it, display: displayStatus(it) })),
    [agencyItineraries],
  )

  const filtered = useMemo(
    () =>
      rows.filter((it) => {
        if (noKeyword && !it.itineraryNo.toLowerCase().includes(noKeyword.toLowerCase())) return false
        if (nameKeyword && !it.name.includes(nameKeyword)) return false
        if (status && it.display !== status) return false
        if (tourRegion && it.tourRegion !== tourRegion) return false
        if (nature && it.nature !== nature) return false
        if (channel && it.channel !== channel) return false
        // 出团/结团时间按同一日期区间筛选
        if (tripRange?.[0] && it.departureTime.slice(0, 10) < tripRange[0].format('YYYY-MM-DD')) return false
        if (tripRange?.[1] && it.returnTime.slice(0, 10) > tripRange[1].format('YYYY-MM-DD')) return false
        if (guideName && !it.guides.some((g) => (g.guideNameSnapshot ?? '').includes(guideName))) return false
        if (guidePhone && !it.guides.some((g) => (g.guidePhoneSnapshot ?? '').includes(guidePhone))) return false
        return true
      }),
    [rows, noKeyword, nameKeyword, status, tourRegion, nature, channel, tripRange, guideName, guidePhone],
  )

  const handleReset = () => {
    setNoKeyword('')
    setNameKeyword('')
    setStatus(undefined)
    setTourRegion(undefined)
    setNature(undefined)
    setChannel(undefined)
    setTripRange(null)
    setGuideName('')
    setGuidePhone('')
  }

  const handleSubmit = (record: EItinerary) => {
    const errs: string[] = []
    if (!record.name) errs.push('行程名称未填写')
    if (!record.channel) errs.push('获客渠道未选择')
    if (!record.departurePlace || !record.closingPlace) errs.push('发团/结团地址未填写')
    if (record.prices.adult == null) errs.push('成人单价未填写')
    if (record.touristCount === 0) errs.push('游客名单为 0 人')
    if (errs.length) {
      Modal.error({
        title: '请完善以下内容后再提交',
        content: (
          <div>
            {errs.map((e) => (
              <div key={e}>· {e}</div>
            ))}
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              行程明细各项可空，不构成提交阻断
            </Typography.Text>
          </div>
        ),
      })
      return
    }
    modal.confirm({
      title: '提交行程单',
      content: `提交后省文旅角色即可见「${record.itineraryNo}」的行程信息，确认提交？`,
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
  }

  const handleWithdraw = (record: EItinerary) => {
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

  const handleDelete = (record: EItinerary) => {
    modal.confirm({
      title: '删除行程单',
      icon: <DeleteOutlined />,
      content: `删除后不可恢复，确认删除「${record.itineraryNo}」吗？`,
      okType: 'danger',
      okText: '删除',
      cancelText: '取消',
      onOk: () => {
        deleteAgencyItinerary(record.id)
        message.success('已删除行程单')
      },
    })
  }

  const columns = [
    { title: '序号', width: 60, render: (_: unknown, __: unknown, i: number) => i + 1 },
    {
      title: '行程单号',
      dataIndex: 'itineraryNo',
      width: 140,
      render: (v: string, r: EItinerary & { display: ItineraryStatus }) => (
        <a onClick={() => navigate(`/agency/itineraries/${r.id}`)}>{v}</a>
      ),
    },
    { title: '行程名称', dataIndex: 'name', width: 220, ellipsis: true },
    {
      title: '旅游地域',
      dataIndex: 'tourRegion',
      width: 90,
      render: (v: TourRegion) => TourRegionLabels[v] ?? '—',
    },
    {
      title: '行程性质',
      dataIndex: 'nature',
      width: 90,
      render: (v: ItineraryNature) => ItineraryNatureLabels[v] ?? '—',
    },
    {
      title: '关联线路产品',
      dataIndex: 'productNameSnapshot',
      width: 200,
      ellipsis: true,
      render: (v?: string) => v ?? <Tag>手动创建</Tag>,
    },
    { title: '出团日期', dataIndex: 'departureTime', width: 150 },
    { title: '结团日期', dataIndex: 'returnTime', width: 150 },
    { title: '天数', dataIndex: 'days', width: 60 },
    { title: '游客数', dataIndex: 'touristCount', width: 80, render: (v: number) => `${v} 人` },
    {
      title: '导游姓名',
      dataIndex: 'guides',
      width: 110,
      render: (_: unknown, r: EItinerary) => (r.guides.length ? r.guides.map((g) => g.guideNameSnapshot).join('、') : '—'),
    },
    {
      title: '导游电话',
      dataIndex: 'guides',
      width: 130,
      render: (_: unknown, r: EItinerary) => (r.guides.length ? r.guides.map((g) => g.guidePhoneSnapshot ?? '—').join('、') : '—'),
    },
    {
      title: '状态',
      dataIndex: 'display',
      width: 90,
      filters: [
        { text: '待提交', value: 'draft' },
        { text: '已提交', value: 'submitted' },
        { text: '已结束', value: 'finished' },
      ],
      onFilter: (value: boolean | React.Key, r: EItinerary & { display: ItineraryStatus }) =>
        r.display === value,
      render: (s: ItineraryStatus) => {
        const color = s === 'draft' ? 'gold' : s === 'submitted' ? 'blue' : 'default'
        return <Tag color={color}>{ItineraryStatusLabels[s]}</Tag>
      },
    },
    { title: '创建时间', dataIndex: 'createdAt', width: 160 },
    {
      title: '操作',
      width: 210,
      fixed: 'right' as const,
      render: (_: unknown, r: EItinerary & { display: ItineraryStatus }) => {
        const editable = canEditItinerary(r)
        return (
          <Space>
            <a onClick={() => navigate(`/agency/itineraries/${r.id}`)}>
              <EyeOutlined /> 查看
            </a>
            {r.display === 'draft' && (
              <>
                <a onClick={() => navigate(`/agency/itineraries/${r.id}/edit`)}>
                  <EditOutlined /> 编辑
                </a>
                <a onClick={() => handleSubmit(r)}>提交</a>
                <a style={{ color: '#ff4d4f' }} onClick={() => handleDelete(r)}>
                  删除
                </a>
              </>
            )}
            {r.display === 'submitted' && editable && (
              <a onClick={() => handleWithdraw(r)}>撤销提交</a>
            )}
            {r.display === 'submitted' && !editable && <Tag>结团后锁定</Tag>}
            {r.display === 'finished' && <Tag>只读</Tag>}
          </Space>
        )
      },
    },
  ]

  return (
    <>
      <PageHeader
        title="团行程单"
        breadcrumb={[{ title: '团行程管理' }, { title: '团行程单' }]}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/agency/itineraries/new')}>
            新增行程单
          </Button>
        }
      >
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="行程单号"
            style={{ width: 180 }}
            value={noKeyword}
            onChange={(e) => setNoKeyword(e.target.value)}
          />
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="行程名称"
            style={{ width: 180 }}
            value={nameKeyword}
            onChange={(e) => setNameKeyword(e.target.value)}
          />
          <Select
            allowClear
            placeholder="状态"
            style={{ width: 110 }}
            value={status}
            onChange={setStatus}
            options={(['draft', 'submitted', 'finished'] as ItineraryStatus[]).map((s) => ({
              value: s,
              label: ItineraryStatusLabels[s],
            }))}
          />
          <Select
            allowClear
            placeholder="旅游地域"
            style={{ width: 110 }}
            value={tourRegion}
            onChange={setTourRegion}
            options={(['province', 'domestic', 'abroad'] as TourRegion[]).map((r) => ({
              value: r,
              label: TourRegionLabels[r],
            }))}
          />
          <Select
            allowClear
            placeholder="行程性质"
            style={{ width: 110 }}
            value={nature}
            onChange={setNature}
            options={(['group', 'independent'] as ItineraryNature[]).map((n) => ({
              value: n,
              label: ItineraryNatureLabels[n],
            }))}
          />
          <DatePicker.RangePicker
            placeholder={['出团时间', '结团时间']}
            value={tripRange}
            onChange={(v) => setTripRange(v as [Dayjs | null, Dayjs | null] | null)}
          />
          <Select
            allowClear
            placeholder="获客渠道"
            style={{ width: 110 }}
            value={channel}
            onChange={setChannel}
            options={(['offline', 'douyin', 'xiaohongshu', 'ctrip', 'tongcheng', 'other'] as ItineraryChannel[]).map((c) => ({
              value: c,
              label: ItineraryChannelLabels[c],
            }))}
          />
          <Input
            allowClear
            placeholder="导游姓名"
            style={{ width: 120 }}
            value={guideName}
            onChange={(e) => setGuideName(e.target.value)}
          />
          <Input
            allowClear
            placeholder="导游电话"
            style={{ width: 130 }}
            value={guidePhone}
            onChange={(e) => setGuidePhone(e.target.value)}
          />
          <Button onClick={handleReset}>重置</Button>
        </Space>
      </PageHeader>
      <PageContainer>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={filtered}
          scroll={{ x: 1940 }}
          pagination={{ showTotal: (t) => `共 ${t} 条` }}
          locale={{
            emptyText: (
              <div>
                暂无行程单，点击
                <a onClick={() => navigate('/agency/itineraries/new')}>新增</a>
                创建第一个团队行程
              </div>
            ),
          }}
        />
      </PageContainer>
    </>
  )
}
