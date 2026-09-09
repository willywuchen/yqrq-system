import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { App, Button, Input, Select, Space, Table, Tag } from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import PageHeader, { PageContainer } from '../../../components/PageHeader'
import { useStore } from '../../../store'
import { CURRENT_AGENCY } from '../../../mock/agency'
import { nowStr } from '../../../utils'
import {
  GroupTypeLabels,
  RouteProductStatusColors,
  RouteProductStatusLabels,
  type RouteProduct,
  type RouteProductStatus,
} from '../../../types/agency'

/**
 * 产品管理 · 产品线路
 * 登记完成即生效，无需平台审核；已上架（发布）的产品仅可查看，下架后方可编辑
 */

// 单价列展示：成人单价/老人单价/儿童价/婴儿价（已填写的均展示，含 0 元）
function priceText(prices?: RouteProduct['prices']) {
  if (!prices) return '—'
  const items = [
    prices.adult != null ? `成人单价：¥${prices.adult}` : null,
    prices.senior != null ? `老人单价：¥${prices.senior}` : null,
    prices.child != null ? `儿童价：¥${prices.child}` : null,
    prices.infant != null ? `婴儿价：¥${prices.infant}` : null,
  ].filter(Boolean)
  return items.length ? items.join('；') : '—'
}

export default function ProductList() {
  const navigate = useNavigate()
  const { modal, message } = App.useApp()
  const { agencyProducts, agencyItineraries, updateAgencyProduct, deleteAgencyProduct, appendAgencyLog } = useStore()
  const [nameKeyword, setNameKeyword] = useState('')
  const [status, setStatus] = useState<RouteProductStatus | undefined>()

  const filtered = useMemo(
    () =>
      agencyProducts
        .filter((p) => p.agencyId === CURRENT_AGENCY.id)
        .filter((p) => {
          if (nameKeyword && !p.name.includes(nameKeyword)) return false
          if (status && p.status !== status) return false
          return true
        }),
    [agencyProducts, nameKeyword, status],
  )

  // 被行程单引用过的产品仅可下架不可删除
  const isReferenced = (p: RouteProduct) =>
    agencyItineraries.some((it) => it.productId === p.id)

  const handleDelete = (record: RouteProduct) => {
    if (record.status === 'published') {
      message.warning('已发布的产品请先下架再删除')
      return
    }
    if (isReferenced(record)) {
      message.warning('该产品已被行程单引用，仅可下架，不可删除')
      return
    }
    modal.confirm({
      title: '删除线路产品',
      icon: <DeleteOutlined />,
      content: `确认删除「${record.name}」吗？删除后不可恢复。`,
      okType: 'danger',
      okText: '删除',
      cancelText: '取消',
      onOk: () => {
        deleteAgencyProduct(record.id)
        message.success('已删除线路产品')
      },
    })
  }

  const handleOffShelf = (record: RouteProduct) => {
    modal.confirm({
      title: '下架线路产品',
      content: '下架后新建行程单的选择器中不再出现该产品，已引用的历史行程单不受影响；下架后可编辑并重新上架。确认下架？',
      okText: '下架',
      cancelText: '取消',
      onOk: () => {
        updateAgencyProduct(record.id, { status: 'offShelf' })
        appendAgencyLog({
          id: `L${Date.now()}`,
          agencyId: CURRENT_AGENCY.id,
          account: '李明',
          action: '下架线路产品',
          target: record.name,
          createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        })
        message.success('已下架，下架后可编辑')
      },
    })
  }

  // 草稿可直接发布；发布后团行程单选择器可选到该产品
  const handlePublish = (record: RouteProduct) => {
    modal.confirm({
      title: '发布线路产品',
      content: `发布后「${record.name}」即可在团行程单中选择，确认发布？`,
      okText: '发布',
      cancelText: '取消',
      onOk: () => {
        updateAgencyProduct(record.id, { status: 'published', publishedAt: nowStr() })
        appendAgencyLog({
          id: `L${Date.now()}`,
          agencyId: CURRENT_AGENCY.id,
          account: '李明',
          action: '发布线路产品',
          target: record.name,
          createdAt: nowStr(),
        })
        message.success('已发布，团行程单中可选到该产品')
      },
    })
  }

  const columns = [
    { title: '序号', width: 60, render: (_: unknown, __: unknown, i: number) => i + 1 },
    { title: '线路名称', dataIndex: 'name', ellipsis: true },
    {
      title: '团类型',
      dataIndex: 'groupType',
      width: 80,
      render: (g: RouteProduct['groupType']) => <Tag>{GroupTypeLabels[g]}</Tag>,
    },
    { title: '天数', dataIndex: 'days', width: 60 },
    {
      title: '单价',
      dataIndex: 'prices',
      width: 320,
      render: (_: unknown, r: RouteProduct) => <span style={{ whiteSpace: 'pre-wrap' }}>{priceText(r.prices)}</span>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (s: RouteProductStatus) => (
        <Tag color={RouteProductStatusColors[s]}>{RouteProductStatusLabels[s]}</Tag>
      ),
    },
    { title: '发布时间', dataIndex: 'publishedAt', width: 150, render: (v?: string) => v ?? '—' },
    {
      title: '操作',
      width: 260,
      fixed: 'right' as const,
      render: (_: unknown, r: RouteProduct) => (
        <Space style={{ whiteSpace: 'nowrap' }}>
          {/* 已上架仅可查看；下架后才可编辑，编辑后可重新上架 */}
          <a onClick={() => navigate(`/agency/products/${r.id}`)}>查看</a>
          {r.status === 'published' && <a onClick={() => handleOffShelf(r)}>下架</a>}
          {r.status !== 'published' && (
            <a onClick={() => navigate(`/agency/products/${r.id}/edit`)}>
              <EditOutlined /> 编辑
            </a>
          )}
          {r.status === 'draft' && <a onClick={() => handlePublish(r)}>发布</a>}
          {(r.status === 'draft' || r.status === 'offShelf') && (
            <a style={{ color: '#ff4d4f' }} onClick={() => handleDelete(r)}>
              删除
            </a>
          )}
        </Space>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="产品线路"
        breadcrumb={[{ title: '产品管理' }, { title: '产品线路' }]}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/agency/products/new')}>
            新增产品
          </Button>
        }
      >
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="线路名称"
            style={{ width: 200 }}
            value={nameKeyword}
            onChange={(e) => setNameKeyword(e.target.value)}
          />
          <Select
            allowClear
            placeholder="状态"
            style={{ width: 110 }}
            value={status}
            onChange={setStatus}
            options={(['draft', 'published', 'offShelf'] as RouteProductStatus[]).map((s) => ({
              value: s,
              label: RouteProductStatusLabels[s],
            }))}
          />
        </Space>
      </PageHeader>
      <PageContainer>
        <Table rowKey="id" columns={columns} dataSource={filtered} scroll={{ x: 1200 }} pagination={{ showTotal: (t) => `共 ${t} 条` }} />
      </PageContainer>
    </>
  )
}
