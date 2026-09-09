import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { App, Button, Card, Form, Input, InputNumber, Radio, Select, Space, Typography } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import PageHeader, { PageContainer } from '../../../components/PageHeader'
import MerchantSelector from '../../../components/agency/MerchantSelector'
import { useStore } from '../../../store'
import { CURRENT_AGENCY } from '../../../mock/agency'
import {
  GroupTypeLabels,
  TourRegionLabels,
  TransportTypeLabels,
  type DayPlan,
  type GroupType,
  type Merchant,
  type RouteProduct,
  type TourRegion,
  type TransportType,
} from '../../../types/agency'
import { nowStr } from '../../../utils'

/**
 * 产品管理 · 产品线路 新建/编辑
 * 两段式：基本信息（旅游地域/成团人数/地址/交通/单价）→ 按天行程安排（用餐/住宿/景区分行填写）
 * 发布校验：至少一天有内容；已上架产品仅可查看，下架后编辑并重新上架
 */
export default function ProductForm({ mode }: { mode: 'new' | 'edit' }) {
  const navigate = useNavigate()
  const { id } = useParams()
  const { message } = App.useApp()
  const { agencyProducts, addAgencyProduct, updateAgencyProduct, appendAgencyLog } = useStore()
  const [form] = Form.useForm()

  const editing = useMemo(
    () => (mode === 'edit' ? agencyProducts.find((p) => p.id === id) : undefined),
    [mode, id, agencyProducts],
  )
  // 按天行程安排为非受控本地状态（字段多、结构嵌套，避免 Form.Item 深层绑定）
  const [days, setDays] = useState<DayPlan[]>([{ dayNo: 1 }])

  // 已上架（发布中）的产品不可编辑，仅可查看
  useEffect(() => {
    if (editing && editing.status === 'published') {
      message.warning('已上架产品仅可查看，请先下架后再编辑')
      navigate(`/agency/products/${editing.id}`, { replace: true })
    }
  }, [editing, message, navigate])

  useEffect(() => {
    if (editing) {
      form.setFieldsValue({
        name: editing.name,
        tourRegion: editing.tourRegion,
        groupType: editing.groupType,
        days: editing.days,
        minGroupSize: editing.minGroupSize,
        departureAddress: editing.departureAddress,
        closingAddress: editing.closingAddress,
        transportGo: editing.transportGo,
        transportBack: editing.transportBack,
        prices: editing.prices,
      })
      setDays(editing.dayPlans?.length ? editing.dayPlans : [{ dayNo: 1 }])
    } else {
      form.setFieldsValue({ days: 1, groupType: 'group', tourRegion: 'province' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing])

  const dayCount = Form.useWatch('days', form) ?? 1

  // 天数变化时同步明细天数组
  useEffect(() => {
    setDays((prev) => {
      const n = Math.max(1, Math.min(30, Number(dayCount) || 1))
      const next: DayPlan[] = []
      for (let i = 1; i <= n; i++) {
        next.push(prev.find((d) => d.dayNo === i) ?? { dayNo: i })
      }
      return next
    })
  }, [dayCount])

  const updateDay = (dayNo: number, patch: Partial<DayPlan>) => {
    setDays((prev) => prev.map((d) => (d.dayNo === dayNo ? { ...d, ...patch } : d)))
  }

  const handleSave = async (publish: boolean) => {
    try {
      const values = await form.validateFields()
      if (publish) {
        const hasContent = days.some(
          (d) => d.meal || d.hotel || d.scenicSpots?.length || d.shoppingStores?.length,
        )
        if (!hasContent) {
          message.warning('发布前请至少在一天中登记用餐、住宿或景区安排')
          return
        }
      }
      const payload = {
        ...values,
        dayPlans: days,
        status: publish ? ('published' as const) : ('draft' as const),
      }
      if (editing) {
        // 下架产品编辑后重新上架；草稿保存保持草稿
        const status = publish ? ('published' as const) : editing.status
        updateAgencyProduct(editing.id, { ...payload, status })
        appendAgencyLog({
          id: `L${Date.now()}`,
          agencyId: CURRENT_AGENCY.id,
          account: '李明',
          action: publish ? '编辑并上架线路产品' : '保存线路产品草稿',
          target: values.name,
          createdAt: nowStr(),
        })
        message.success(publish ? '已保存并重新上架，行程单填报时可选' : '产品已保存')
      } else {
        const product: RouteProduct = {
          id: `P${Date.now()}`,
          ...payload,
          status: publish ? 'published' : 'draft',
          agencyId: CURRENT_AGENCY.id,
          createdAt: nowStr(),
          publishedAt: publish ? nowStr() : undefined,
        }
        addAgencyProduct(product)
        appendAgencyLog({
          id: `L${Date.now()}`,
          agencyId: CURRENT_AGENCY.id,
          account: '李明',
          action: publish ? '发布线路产品' : '保存线路产品草稿',
          target: product.name,
          createdAt: nowStr(),
        })
        message.success(publish ? '产品已发布（无需审核），行程单填报时可选' : '已保存草稿')
      }
      navigate('/agency/products')
    } catch {
      // 校验失败
    }
  }

  const publishing = editing?.status === 'offShelf'

  return (
    <>
      <PageHeader
        title={mode === 'edit' ? '编辑线路产品' : '新增线路产品'}
        breadcrumb={[
          { title: '产品管理' },
          { title: '产品线路', path: '/agency/products' },
          { title: mode === 'edit' ? '编辑' : '新增' },
        ]}
        extra={
          <Space>
            <Button onClick={() => navigate('/agency/products')}>返回</Button>
            <Button onClick={() => handleSave(false)}>保存草稿</Button>
            <Button type="primary" onClick={() => handleSave(true)}>
              {publishing ? '保存并重新上架' : '发布'}
            </Button>
          </Space>
        }
      />
      <PageContainer>
        <Form form={form} layout="vertical" component={false}>
          <Card title="基本信息" size="small" style={{ marginBottom: 16 }}>
            <div style={{ maxWidth: 980 }}>
            <Space size="middle" style={{ display: 'flex' }} align="start">
              <Form.Item
                name="name"
                label="线路名称"
                rules={[{ required: true, message: '请输入线路名称' }]}
                style={{ width: 420 }}
              >
                <Input maxLength={60} placeholder="如：铁血男儿——贵州抗战人文励志征程 5 日游" />
              </Form.Item>
              <Form.Item name="groupType" label="团类型" rules={[{ required: true, message: '请选择团类型' }]} style={{ width: 120 }}>
                <Select
                  options={(['group', 'independent'] as GroupType[]).map((g) => ({
                    value: g,
                    label: GroupTypeLabels[g],
                  }))}
                />
              </Form.Item>
              <Form.Item name="tourRegion" label="旅游地域" rules={[{ required: true, message: '请选择旅游地域' }]} style={{ width: 180 }}>
                <Radio.Group
                  options={(['province', 'domestic', 'abroad'] as TourRegion[]).map((r) => ({
                    value: r,
                    label: TourRegionLabels[r],
                  }))}
                />
              </Form.Item>
            </Space>
            <Space size="middle" style={{ display: 'flex' }} align="start">
              <Form.Item
                name="days"
                label="行程天数"
                rules={[{ required: true, message: '请填写行程天数' }]}
                style={{ width: 140 }}
              >
                <InputNumber min={1} max={30} precision={0} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="minGroupSize" label="最低成团人数" style={{ width: 140 }}>
                <InputNumber min={1} max={999} precision={0} style={{ width: '100%' }} placeholder="手动输入" />
              </Form.Item>
              <Form.Item name="transportGo" label="交通往" style={{ width: 140 }}>
                <Select
                  allowClear
                  placeholder="请选择"
                  options={(['train', 'highSpeed', 'bus', 'plane', 'ship'] as TransportType[]).map((t) => ({
                    value: t,
                    label: TransportTypeLabels[t],
                  }))}
                />
              </Form.Item>
              <Form.Item name="transportBack" label="交通返" style={{ width: 140 }}>
                <Select
                  allowClear
                  placeholder="请选择"
                  options={(['train', 'highSpeed', 'bus', 'plane', 'ship'] as TransportType[]).map((t) => ({
                    value: t,
                    label: TransportTypeLabels[t],
                  }))}
                />
              </Form.Item>
            </Space>
            <Space size="middle" style={{ display: 'flex' }} align="start">
              <Form.Item name="departureAddress" label="发团地址" style={{ width: 300 }}>
                <Input maxLength={60} placeholder="手动输入发团地址" />
              </Form.Item>
              <Form.Item name="closingAddress" label="结团地址" style={{ width: 300 }}>
                <Input maxLength={60} placeholder="手动输入结团地址" />
              </Form.Item>
            </Space>
            </div>
          </Card>

          <Card title="单价" size="small" style={{ marginBottom: 16 }}>
            <Space size="middle" style={{ display: 'flex' }} align="start">
              <Form.Item name={['prices', 'adult']} label="成人单价" style={{ width: 180 }}>
                <InputNumber min={0} precision={2} style={{ width: '100%' }} prefix="¥" placeholder="请输入" />
              </Form.Item>
              <Form.Item name={['prices', 'senior']} label="老人单价" style={{ width: 180 }}>
                <InputNumber min={0} precision={2} style={{ width: '100%' }} prefix="¥" placeholder="请输入" />
              </Form.Item>
              <Form.Item name={['prices', 'child']} label="儿童单价" style={{ width: 180 }}>
                <InputNumber min={0} precision={2} style={{ width: '100%' }} prefix="¥" placeholder="请输入" />
              </Form.Item>
              <Form.Item name={['prices', 'infant']} label="婴儿单价" style={{ width: 180 }}>
                <InputNumber min={0} precision={2} style={{ width: '100%' }} prefix="¥" placeholder="请输入" />
              </Form.Item>
            </Space>
          </Card>
        </Form>

        <Card title="行程安排（按天）" size="small" style={{ marginBottom: 16 }}>
          {days.map((d) => (
            <Card
              key={d.dayNo}
              type="inner"
              title={`第 ${d.dayNo} 天`}
              size="small"
              style={{ marginBottom: 12 }}
              extra={
                days.length > 1 ? (
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      setDays((prev) => prev.filter((x) => x.dayNo !== d.dayNo))
                      form.setFieldValue('days', days.length - 1)
                    }}
                  >
                    删除当天
                  </Button>
                ) : undefined
              }
            >
              <div style={{ maxWidth: 620 }}>
                <div style={{ marginBottom: 12 }}>
                  <Typography.Text type="secondary">用餐</Typography.Text>
                  <MerchantSelector
                    type="restaurant"
                    showOtherAgencyTag={false}
                    value={d.meal}
                    onChange={(v, m) => updateDay(d.dayNo, { meal: (v as string) ?? undefined, mealName: (m as Merchant)?.name })}
                  />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <Typography.Text type="secondary">住宿（酒店）</Typography.Text>
                  <MerchantSelector
                    type="hotel"
                    showOtherAgencyTag={false}
                    value={d.hotel}
                    onChange={(v, m) => updateDay(d.dayNo, { hotel: (v as string) ?? undefined, hotelName: (m as Merchant)?.name })}
                  />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <Typography.Text type="secondary">景区（可多选）</Typography.Text>
                  <MerchantSelector
                    type="scenic"
                    multiple
                    showOtherAgencyTag={false}
                    value={d.scenicSpots}
                    onChange={(v, list) =>
                      updateDay(d.dayNo, {
                        scenicSpots: (v as string[]) ?? [],
                        scenicSpotNames: (list as Merchant[])?.map((x) => x.name) ?? [],
                      })
                    }
                  />
                </div>
                <div>
                  <Typography.Text type="secondary">当日说明（如"自由活动"）</Typography.Text>
                  <Input
                    value={d.description}
                    onChange={(e) => updateDay(d.dayNo, { description: e.target.value })}
                    maxLength={100}
                  />
                </div>
              </div>
            </Card>
          ))}
          <Button
            type="dashed"
            block
            icon={<PlusOutlined />}
            onClick={() => {
              const nextNo = Math.max(...days.map((d) => d.dayNo)) + 1
              setDays((prev) => [...prev, { dayNo: nextNo }])
              form.setFieldValue('days', nextNo)
            }}
          >
            添加一天
          </Button>
        </Card>
      </PageContainer>
    </>
  )
}
