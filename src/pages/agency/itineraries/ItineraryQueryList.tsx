import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, DatePicker, Input, Select, Space, Table, Tag } from 'antd'
import type { Dayjs } from 'dayjs'
import { EyeOutlined, SearchOutlined } from '@ant-design/icons'
import PageHeader, { PageContainer } from '../../../components/PageHeader'
import { useStore } from '../../../store'
import { AGENCY_NAMES } from '../../../mock/agency'
import {
  ItineraryChannelLabels,
  ItineraryNatureLabels,
  ItineraryStatusLabels,
  TourRegionLabels,
  displayStatus,
  type EItinerary,
  type ItineraryChannel,
  type ItineraryNature,
  type ItineraryStatus,
  type TourRegion,
} from '../../../types/agency'

/**
 * 团行程单查询（文旅厅角色 · 只读）
 * 展示所有旅行社已提交的团行程单；搜索条件、列表、详情与旅行社角色一致，
 * 并在此基础上新增【旅行社名称】搜索与展示；行程单提交后即出现在本列表
 */
export default function ItineraryQueryList() {
  const navigate = useNavigate()
  const { agencyItineraries } = useStore()
  const [noKeyword, setNoKeyword] = useState('')
  const [nameKeyword, setNameKeyword] = useState('')
  const [agencyKeyword, setAgencyKeyword] = useState('')
  const [status, setStatus] = useState<ItineraryStatus | undefined>()
  const [tourRegion, setTourRegion] = useState<TourRegion | undefined>()
  const [nature, setNature] = useState<ItineraryNature | undefined>()
  const [channel, setChannel] = useState<ItineraryChannel | undefined>()
  const [departureRange, setDepartureRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)
  const [returnRange, setReturnRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)
  const [guideName, setGuideName] = useState('')
  const [guidePhone, setGuidePhone] = useState('')

  // 所有旅行社已提交的行程单（撤销提交回到待提交后不再展示）
  const rows = useMemo(
    () =>
      agencyItineraries
        .filter((it) => displayStatus(it) !== 'draft')
        .map((it) => ({ ...it, display: displayStatus(it) })),
    [agencyItineraries],
  )

  const filtered = useMemo(
    () =>
      rows.filter((it) => {
        if (noKeyword && !it.itineraryNo.toLowerCase().includes(noKeyword.toLowerCase())) return false
        if (nameKeyword && !it.name.includes(nameKeyword)) return false
        if (agencyKeyword && !(AGENCY_NAMES[it.agencyId] ?? '').includes(agencyKeyword)) return false
        if (status && it.display !== status) return false
        if (tourRegion && it.tourRegion !== tourRegion) return false
        if (nature && it.nature !== nature) return false
        if (channel && it.channel !== channel) return false
        if (departureRange?.[0] && it.departureTime.slice(0, 10) < departureRange[0].format('YYYY-MM-DD')) return false
        if (departureRange?.[1] && it.departureTime.slice(0, 10) > departureRange[1].format('YYYY-MM-DD')) return false
        if (returnRange?.[0] && it.returnTime.slice(0, 10) < returnRange[0].format('YYYY-MM-DD')) return false
        if (returnRange?.[1] && it.returnTime.slice(0, 10) > returnRange[1].format('YYYY-MM-DD')) return false
        if (guideName && !it.guides.some((g) => (g.guideNameSnapshot ?? '').includes(guideName))) return false
        if (guidePhone && !it.guides.some((g) => (g.guidePhoneSnapshot ?? '').includes(guidePhone))) return false
        return true
      }),
    [rows, noKeyword, nameKeyword, agencyKeyword, status, tourRegion, nature, channel, departureRange, returnRange, guideName, guidePhone],
  )

  const handleReset = () => {
    setNoKeyword('')
    setNameKeyword('')
    setAgencyKeyword('')
    setStatus(undefined)
    setTourRegion(undefined)
    setNature(undefined)
    setChannel(undefined)
    setDepartureRange(null)
    setReturnRange(null)
    setGuideName('')
    setGuidePhone('')
  }

  const columns = [
    { title: '序号', width: 60, render: (_: unknown, __: unknown, i: number) => i + 1 },
    {
      title: '行程单号',
      dataIndex: 'itineraryNo',
      width: 140,
      render: (v: string, r: EItinerary & { display: ItineraryStatus }) => (
        <a onClick={() => navigate(`/tour/itineraries/${r.id}`)}>{v}</a>
      ),
    },
    { title: '行程名称', dataIndex: 'name', ellipsis: true },
    {
      title: '旅行社名称',
      dataIndex: 'agencyId',
      width: 180,
      render: (v: string) => <Tag color="geekblue">{AGENCY_NAMES[v] ?? v}</Tag>,
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
      render: (s: ItineraryStatus) => {
        const color = s === 'draft' ? 'gold' : s === 'submitted' ? 'blue' : 'default'
        return <Tag color={color}>{ItineraryStatusLabels[s]}</Tag>
      },
    },
    { title: '创建时间', dataIndex: 'createdAt', width: 160 },
    {
      title: '操作',
      width: 90,
      fixed: 'right' as const,
      render: (_: unknown, r: EItinerary) => (
        <a onClick={() => navigate(`/tour/itineraries/${r.id}`)}>
          <EyeOutlined /> 查看
        </a>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="团行程单查询"
        breadcrumb={[{ title: '团行程单查询' }, { title: '行程单列表' }]}
      >
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="行程单号"
            style={{ width: 160 }}
            value={noKeyword}
            onChange={(e) => setNoKeyword(e.target.value)}
          />
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="行程名称"
            style={{ width: 160 }}
            value={nameKeyword}
            onChange={(e) => setNameKeyword(e.target.value)}
          />
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="旅行社名称"
            style={{ width: 170 }}
            value={agencyKeyword}
            onChange={(e) => setAgencyKeyword(e.target.value)}
          />
          <Select
            allowClear
            placeholder="状态"
            style={{ width: 100 }}
            value={status}
            onChange={setStatus}
            options={(['submitted', 'finished'] as ItineraryStatus[]).map((s) => ({
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
            placeholder={['出团时间起', '出团时间止']}
            value={departureRange}
            onChange={(v) => setDepartureRange(v as [Dayjs | null, Dayjs | null] | null)}
          />
          <DatePicker.RangePicker
            placeholder={['结团时间起', '结团时间止']}
            value={returnRange}
            onChange={(v) => setReturnRange(v as [Dayjs | null, Dayjs | null] | null)}
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
          scroll={{ x: 1800 }}
          pagination={{ showTotal: (t) => `共 ${t} 条` }}
          locale={{ emptyText: '暂无已提交的团行程单；旅行社提交后将展示在此列表' }}
        />
      </PageContainer>
    </>
  )
}
