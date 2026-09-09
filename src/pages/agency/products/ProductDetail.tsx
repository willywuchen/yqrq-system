import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, Descriptions, Tag, Typography } from 'antd'
import PageHeader, { PageContainer } from '../../../components/PageHeader'
import { useStore } from '../../../store'
import {
  GroupTypeLabels,
  RouteProductStatusColors,
  RouteProductStatusLabels,
  TourRegionLabels,
  TransportTypeLabels,
  type RouteProduct,
} from '../../../types/agency'

const money = (v?: number) => (v != null ? `¥${v}` : '—')

/** 产品管理 · 产品线路 详情（已上架产品仅可查看；下架后可编辑并重新上架） */
export default function ProductDetail() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { agencyProducts } = useStore()

  const product = useMemo(() => agencyProducts.find((p) => p.id === id), [agencyProducts, id])

  if (!product) {
    return (
      <>
        <PageHeader title="线路产品详情" breadcrumb={[{ title: '产品管理' }, { title: '产品线路' }]} />
        <PageContainer>
          <div style={{ padding: 24, color: '#999' }}>未找到该线路产品，可能已被删除。</div>
        </PageContainer>
      </>
    )
  }

  const p: RouteProduct = product

  return (
    <>
      <PageHeader
        title="线路产品详情"
        breadcrumb={[
          { title: '产品管理' },
          { title: '产品线路', path: '/agency/products' },
          { title: p.name },
        ]}
        extra={
          <Button onClick={() => navigate('/agency/products')}>返回</Button>
        }
      />
      <PageContainer>
        <Card
          title="基本信息"
          size="small"
          style={{ marginBottom: 16 }}
          extra={<Tag color={RouteProductStatusColors[p.status]}>{RouteProductStatusLabels[p.status]}</Tag>}
        >
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="线路名称" span={2}>{p.name}</Descriptions.Item>
            <Descriptions.Item label="旅游地域">
              <Tag color="blue">{TourRegionLabels[p.tourRegion]}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="团类型">
              <Tag>{GroupTypeLabels[p.groupType]}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="行程天数">{p.days} 天</Descriptions.Item>
            <Descriptions.Item label="最低成团人数">{p.minGroupSize ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="交通往">{p.transportGo ? TransportTypeLabels[p.transportGo] : '—'}</Descriptions.Item>
            <Descriptions.Item label="交通返">{p.transportBack ? TransportTypeLabels[p.transportBack] : '—'}</Descriptions.Item>
            <Descriptions.Item label="发团地址">{p.departureAddress ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="结团地址">{p.closingAddress ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="发布时间">{p.publishedAt ?? '—'}</Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="单价" size="small" style={{ marginBottom: 16 }}>
          <Descriptions bordered column={4} size="small">
            <Descriptions.Item label="成人单价">{money(p.prices?.adult)}</Descriptions.Item>
            <Descriptions.Item label="老人单价">{money(p.prices?.senior)}</Descriptions.Item>
            <Descriptions.Item label="儿童单价">{money(p.prices?.child)}</Descriptions.Item>
            <Descriptions.Item label="婴儿单价">{money(p.prices?.infant)}</Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="行程安排（按天）" size="small">
          {p.dayPlans?.map((d) => (
            <Card
              key={d.dayNo}
              type="inner"
              title={`第 ${d.dayNo} 天`}
              size="small"
              style={{ marginBottom: 12 }}
            >
              <div style={{ maxWidth: 620 }}>
                <div style={{ marginBottom: 8 }}>
                  <Typography.Text type="secondary">用餐：</Typography.Text>
                  {d.mealName ?? <Typography.Text type="secondary">未安排</Typography.Text>}
                </div>
                <div style={{ marginBottom: 8 }}>
                  <Typography.Text type="secondary">住宿（酒店）：</Typography.Text>
                  {d.hotelName ?? <Typography.Text type="secondary">未安排</Typography.Text>}
                </div>
                <div style={{ marginBottom: d.description ? 8 : 0 }}>
                  <Typography.Text type="secondary">景区：</Typography.Text>
                  {d.scenicSpotNames?.length ? d.scenicSpotNames.join('、') : <Typography.Text type="secondary">未安排</Typography.Text>}
                </div>
                {d.description && (
                  <div>
                    <Typography.Text type="secondary">当日说明：</Typography.Text>
                    {d.description}
                  </div>
                )}
              </div>
            </Card>
          ))}
          {!p.dayPlans?.length && <Typography.Text type="secondary">暂无行程安排</Typography.Text>}
        </Card>
      </PageContainer>
    </>
  )
}
