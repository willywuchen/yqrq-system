import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  Upload,
} from 'antd'
import type { FormInstance } from 'antd'
import {
  DeleteOutlined,
  DownloadOutlined,
  PlusOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import dayjs, { type Dayjs } from 'dayjs'
import PageHeader, { PageContainer } from '../../../components/PageHeader'
import MerchantSelector from '../../../components/agency/MerchantSelector'
import GuideSelector from '../../../components/agency/GuideSelector'
import { useStore } from '../../../store'
import { CURRENT_AGENCY } from '../../../mock/agency'
import {
  ItineraryChannelLabels,
  ItineraryNatureLabels,
  TouristCategoryLabels,
  TouristIdTypeLabels,
  TourRegionLabels,
  VehicleNatureLabels,
  canEditItinerary,
  genGroupNo,
  genItineraryNo,
  parseIdCard,
  type DayPlan,
  type EItinerary,
  type GuideBooking,
  type ItineraryChannel,
  type ItineraryNature,
  type ItineraryVehicle,
  type Merchant,
  type Tourist,
  type TouristCategory,
  type TouristIdType,
  type TourRegion,
  type VehicleNature,
} from '../../../types/agency'
import { nowStr } from '../../../utils'

const GENDER_LABELS: Record<string, string> = { male: '男', female: '女' }

/**
 * 团行程单 · 新建/编辑
 * 页签：行程信息 / 行程明细 / 车辆与导游 / 游客名单
 * - 团号自动生成（模拟规则，正式开发按相应规则接入）
 * - 选择线路产品自动回填（不反写产品）；也可不选手动创建
 * - 行程明细：用餐合并早/午/晚，与住宿酒店、景区每项分行；每天可填日期（默认按出团日期推算）
 * - 游客性别/生日/年龄按身份证号自动识别；外籍游客可空、手动填写
 */
export default function ItineraryForm({ mode }: { mode: 'new' | 'edit' }) {
  const navigate = useNavigate()
  const { id } = useParams()
  const { message } = App.useApp()
  const { agencyProducts, agencyItineraries, saveAgencyItinerary, appendAgencyLog } = useStore()

  const editing = useMemo(
    () => (mode === 'edit' ? agencyItineraries.find((x) => x.id === id) : undefined),
    [mode, id, agencyItineraries],
  )

  // ---------- 行程信息 ----------
  const [productId, setProductId] = useState<string | undefined>()
  const [name, setName] = useState('')
  const [groupNo, setGroupNo] = useState('') // 团号：自动生成
  const [tourRegion, setTourRegion] = useState<TourRegion | undefined>()
  const [nature, setNature] = useState<ItineraryNature | undefined>()
  const [channel, setChannel] = useState<ItineraryChannel | undefined>()
  const [departure, setDeparture] = useState<Dayjs | null>(null)
  const [returnAt, setReturnAt] = useState<Dayjs | null>(null)
  const [departurePlace, setDeparturePlace] = useState('')
  const [closingPlace, setClosingPlace] = useState('')
  const [totalDays, setTotalDays] = useState<number | undefined>() // 总天数（手动输入；选产品时自动回填）
  const [totalNights, setTotalNights] = useState<number | undefined>() // 总晚数（手动输入）
  const [prices, setPrices] = useState<{ adult?: number; senior?: number; child?: number; infant?: number }>({})
  const [remark, setRemark] = useState('')
  const [attachments, setAttachments] = useState<string[]>([])
  const [invoices, setInvoices] = useState<string[]>([])

  // ---------- 行程明细 / 车辆与导游 / 游客 ----------
  const [dayPlans, setDayPlans] = useState<DayPlan[]>([{ dayNo: 1 }])
  const [vehicleNature, setVehicleNature] = useState<VehicleNature | undefined>()
  const [vehicles, setVehicles] = useState<ItineraryVehicle[]>([
    { id: `V${Date.now()}`, transportCompany: '', plateNo: '', driverName: '' },
  ])
  const [guides, setGuides] = useState<GuideBooking[]>([])
  const [tourists, setTourists] = useState<Tourist[]>([])

  // 添加名单弹窗
  const [touristOpen, setTouristOpen] = useState(false)
  const [touristForm] = Form.useForm()

  const publishedProducts = useMemo(
    () => agencyProducts.filter((p) => p.agencyId === CURRENT_AGENCY.id && p.status === 'published'),
    [agencyProducts],
  )

  // 编辑回填
  useEffect(() => {
    if (editing) {
      setProductId(editing.productId)
      setName(editing.name)
      setGroupNo(editing.groupNo ?? '')
      setTourRegion(editing.tourRegion)
      setNature(editing.nature)
      setChannel(editing.channel)
      setDeparture(dayjs(editing.departureTime))
      setReturnAt(dayjs(editing.returnTime))
      setDeparturePlace(editing.departurePlace)
      setClosingPlace(editing.closingPlace)
      setTotalDays(editing.days)
      setTotalNights(editing.nights)
      setPrices(editing.prices)
      setRemark(editing.remark ?? '')
      setDayPlans(editing.dayPlans?.length ? editing.dayPlans : [{ dayNo: 1 }])
      setVehicleNature(editing.vehicleNature)
      // 已有车辆直接展示；无车辆时预置一辆空车供直接填写
      setVehicles(editing.vehicles.length ? editing.vehicles : [{ id: `V${Date.now()}`, transportCompany: '', plateNo: '', driverName: '' }])
      setGuides(editing.guides)
      setTourists(editing.tourists)
    } else {
      // 新建：团号自动生成（模拟规则，正式开发时有相应规则）
      setGroupNo(genGroupNo(agencyItineraries.length))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing])

  // 生效天数：手动填写的总天数；未填时明细默认展示 1 天
  const effectDays = Math.max(1, Math.min(30, Number(totalDays) || 1))

  // 总天数联动明细页签；每天日期默认按出团日期自动推算
  useEffect(() => {
    setDayPlans((prev) => {
      const next: DayPlan[] = []
      for (let i = 1; i <= effectDays; i++) {
        const existed = prev.find((d) => d.dayNo === i)
        const autoDate = departure ? departure.startOf('day').add(i - 1, 'day') : null
        next.push({
          dayNo: i,
          // 出团日期变化时重算各天日期；无出团日期时保留已填值
          date: autoDate ? autoDate.format('YYYY-MM-DD') : (existed?.date ?? undefined),
          ...(existed ?? {}),
        })
      }
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectDays, departure])

  // 选择线路产品 → 自动回填（回填不反写产品）
  const handleSelectProduct = (pid: string) => {
    const p = publishedProducts.find((x) => x.id === pid)
    setProductId(pid)
    if (!p) return
    setName((prev) => prev || p.name)
    setNature(p.groupType)
    setTourRegion((prev) => prev ?? p.tourRegion)
    // 行程信息自动从产品线路拉取：总天数/总晚数/发团地址/结团地址
    setTotalDays(p.days)
    setTotalNights(Math.max(0, p.days - 1))
    setDeparturePlace((prev) => prev || p.departureAddress || '')
    setClosingPlace((prev) => prev || p.closingAddress || '')
    setDayPlans(
      p.dayPlans.map((d) => ({
        ...d,
        meal: d.meal,
        mealName: d.mealName,
        scenicSpots: [...(d.scenicSpots ?? [])],
        shoppingStores: [...(d.shoppingStores ?? [])],
      })),
    )
    setPrices({
      adult: p.prices?.adult,
      senior: p.prices?.senior,
      child: p.prices?.child,
      infant: p.prices?.infant,
    })
    message.info('已按线路产品回填行程信息，可在此基础上调整')
  }

  const handleClearProduct = () => {
    setProductId(undefined)
    message.info('已清除关联产品，行程单转为手动创建')
  }

  const updateDay = (dayNo: number, patch: Partial<DayPlan>) =>
    setDayPlans((prev) => prev.map((d) => (d.dayNo === dayNo ? { ...d, ...patch } : d)))

  // ---------- 游客名单 ----------
  const touristColumns = [
    { title: '姓名', dataIndex: 'name', width: 90 },
    { title: '证件类型', dataIndex: 'idType', width: 90, render: (t: TouristIdType) => TouristIdTypeLabels[t] },
    { title: '证件号码', dataIndex: 'idNo' },
    { title: '性别', dataIndex: 'gender', width: 70, render: (v?: string) => (v ? GENDER_LABELS[v] : '—') },
    { title: '生日', dataIndex: 'birthDate', width: 110, render: (v?: string) => v ?? '—' },
    { title: '年龄', dataIndex: 'age', width: 70, render: (v?: number) => (v != null ? v : '—') },
    { title: '手机号码', dataIndex: 'phone', render: (v?: string) => v || '—' },
    {
      title: '游客类别',
      dataIndex: 'category',
      width: 90,
      render: (c: TouristCategory) => <Tag>{TouristCategoryLabels[c]}</Tag>,
    },
    { title: '客源地', dataIndex: 'origin', width: 130 },
    {
      title: '操作',
      width: 70,
      render: (_: unknown, r: Tourist) => (
        <a style={{ color: '#ff4d4f' }} onClick={() => setTourists((prev) => prev.filter((t) => t.id !== r.id))}>
          删除
        </a>
      ),
    },
  ]

  const categoryCount = useMemo(() => {
    const c = { adult: 0, senior: 0, child: 0, infant: 0 }
    tourists.forEach((t) => (c[t.category] += 1))
    return c
  }, [tourists])

  const addTourist = async () => {
    try {
      const values = await touristForm.validateFields()
      if (tourists.some((t) => t.idType === values.idType && t.idNo === values.idNo)) {
        message.warning(`证件号 ${values.idNo} 已在名单中，请勿重复添加`)
        return
      }
      setTourists((prev) => [
        ...prev,
        {
          id: `T${Date.now()}${Math.floor(Math.random() * 100)}`,
          itineraryId: editing?.id ?? 'NEW',
          ...values,
          // 生日 DatePicker 值转为 YYYY-MM-DD 字符串存储
          birthDate: values.birthDate ? (values.birthDate as Dayjs).format('YYYY-MM-DD') : undefined,
        },
      ])
      touristForm.resetFields()
      setTouristOpen(false)
    } catch {
      // 校验失败
    }
  }

  // 模板下载 / 批量导入（CSV，演示环境替代 Excel）；身份证号自动识别性别/生日/年龄
  const downloadTemplate = () => {
    const csv = '\uFEFF姓名,证件类型,证件号,手机号,人群类别,客源地\n张三,身份证,522101199001011234,13800001111,成人,贵州省贵阳市'
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '游客名单导入模板.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const importTourists = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '').replace(/^\uFEFF/, '')
      const lines = text.split(/\r?\n/).filter((l) => l.trim())
      if (!lines.length) return
      const idTypeMap: Record<string, TouristIdType> = { 身份证: 'idCard', 护照: 'passport', 其他: 'other' }
      const catMap: Record<string, TouristCategory> = { 成人: 'adult', 老人: 'senior', 儿童: 'child', 婴儿: 'infant' }
      const errors: string[] = []
      const parsed: Tourist[] = []
      lines.slice(1).forEach((line, idx) => {
        const [n, idTypeLabel, idNo, phone, catLabel, origin] = line.split(',').map((s) => (s ?? '').trim())
        if (!n || !idNo) {
          errors.push(`第 ${idx + 2} 行：姓名或证件号缺失`)
          return
        }
        const idType = idTypeMap[idTypeLabel ?? ''] ?? 'idCard'
        if (idType === 'idCard' && !/^\d{17}[\dXx]$/.test(idNo)) {
          errors.push(`第 ${idx + 2} 行：身份证号格式不正确（${idNo}）`)
          return
        }
        const parsedId = parseIdCard(idNo)
        parsed.push({
          id: `T${Date.now()}${idx}`,
          itineraryId: editing?.id ?? 'NEW',
          name: n,
          idType,
          idNo,
          phone,
          category: catMap[catLabel ?? ''] ?? 'adult',
          origin: origin || '未填写',
          ...(parsedId ?? {}),
        })
      })
      // 证件类型+证件号去重（与已有名单合并去重）
      const existed = new Set(tourists.map((t) => `${t.idType}|${t.idNo}`))
      const added = parsed.filter((t) => {
        const key = `${t.idType}|${t.idNo}`
        if (existed.has(key)) {
          errors.push(`名单中已存在证件号 ${t.idNo}，已跳过`)
          return false
        }
        existed.add(key)
        return true
      })
      setTourists((prev) => [...prev, ...added])
      if (errors.length) {
        Modal.warning({ title: `导入完成：成功 ${added.length} 条，失败 ${errors.length} 条`, content: errors.slice(0, 8).map((e) => <div key={e}>{e}</div>) })
      } else {
        message.success(`成功导入 ${added.length} 条游客信息`)
      }
    }
    reader.readAsText(file, 'utf-8')
    return false
  }

  // ---------- 保存 / 提交 ----------
  const buildItinerary = (status: 'draft' | 'submitted'): EItinerary => ({
    id: editing?.id ?? `IT${Date.now()}`,
    itineraryNo: editing?.itineraryNo ?? genItineraryNo(agencyItineraries.length),
    groupNo: groupNo || undefined,
    name: name.trim(),
    tourRegion,
    productId,
    productNameSnapshot: productId ? publishedProducts.find((p) => p.id === productId)?.name : undefined,
    nature,
    channel: channel!,
    departureTime: departure ? departure.format('YYYY-MM-DD HH:mm') : '',
    returnTime: returnAt ? returnAt.format('YYYY-MM-DD HH:mm') : '',
    departurePlace: departurePlace.trim(),
    closingPlace: closingPlace.trim(),
    days: totalDays ?? 1,
    nights: totalNights,
    prices,
    attachments,
    invoices,
    remark: remark || undefined,
    dayPlans,
    vehicles,
    vehicleNature,
    guides,
    tourists,
    touristCount: tourists.length,
    status,
    agencyId: CURRENT_AGENCY.id,
    createdByAccount: editing?.createdByAccount ?? '李明',
    createdAt: editing?.createdAt ?? nowStr(),
    submittedAt: status === 'submitted' ? nowStr() : editing?.submittedAt,
  })

  const validateForSubmit = (): string[] => {
    const errs: string[] = []
    if (!name.trim()) errs.push('行程名称未填写')
    if (!channel) errs.push('获客渠道未选择')
    if (!departure || !returnAt) errs.push('出团/结团日期时间未填写')
    else if (returnAt.isBefore(departure)) errs.push('结团日期时间早于出团日期时间')
    if (!departurePlace.trim()) errs.push('发团地址未填写')
    if (!closingPlace.trim()) errs.push('结团地址未填写')
    if (totalDays == null) errs.push('总天数未填写')
    if (prices.adult == null) errs.push('成人单价未填写')
    if (tourists.length === 0) errs.push('游客名单为 0 人')
    return errs
  }

  const handleSave = (submit: boolean) => {
    if (submit) {
      const errs = validateForSubmit()
      if (errs.length) {
        Modal.error({
          title: '请完善以下内容后再提交',
          content: errs.map((e) => <div key={e}>· {e}</div>),
        })
        return
      }
    } else if (!name.trim()) {
      message.warning('请至少填写行程名称再保存')
      return
    }
    const it = buildItinerary(submit ? 'submitted' : 'draft')
    saveAgencyItinerary(it)
    appendAgencyLog({
      id: `L${Date.now()}`,
      agencyId: CURRENT_AGENCY.id,
      account: '李明',
      action: submit ? '提交行程单' : '保存行程单',
      target: it.itineraryNo,
      detail: submit ? '提交后省文旅可见' : undefined,
      createdAt: nowStr(),
    })
    if (submit) message.success('已提交，省文旅可见')
    else message.success('已保存为待提交')
    navigate('/agency/itineraries')
  }

  // 已提交/已结束的行程单不可直接编辑（须先撤销提交）
  useEffect(() => {
    if (editing && !canEditItinerary(editing)) {
      message.warning('该行程单已提交，请先在列表撤销提交后再编辑')
      navigate(`/agency/itineraries/${editing.id}`, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing])

  return (
    <>
      <PageHeader
        title={mode === 'edit' ? '编辑行程单' : '新建行程单'}
        breadcrumb={[
          { title: '团行程管理' },
          { title: '团行程单', path: '/agency/itineraries' },
          { title: mode === 'edit' ? '编辑' : '新增' },
        ]}
        extra={
          <Space>
            <Button onClick={() => navigate('/agency/itineraries')}>取消</Button>
            <Button onClick={() => handleSave(false)}>保存（待提交）</Button>
            <Button type="primary" onClick={() => handleSave(true)}>
              提交
            </Button>
          </Space>
        }
      />
      <PageContainer>
        <Tabs
          defaultActiveKey="info"
          items={[
            {
              key: 'info',
              label: '行程基本信息',
              children: (
                <Card size="small" title="行程基本信息">
                  <Descriptions column={1} size="small" style={{ maxWidth: 900 }}>
                    <Descriptions.Item label="产品/线路名称">
                      <Space>
                        <Select
                          showSearch
                          allowClear
                          style={{ width: 480 }}
                          placeholder="选择线路产品（可空，选中即回填；也可手动创建）"
                          value={productId}
                          onChange={(v) => (v ? handleSelectProduct(v) : handleClearProduct())}
                          onDropdownVisibleChange={(open) => {
                            if (open && publishedProducts.length === 0) {
                              message.info('暂无可选线路产品，可前往产品线路创建，或直接手动填写')
                            }
                          }}
                          optionFilterProp="searchText"
                          options={publishedProducts.map((p) => ({
                            value: p.id,
                            label: `${p.name}（${p.days}天·成人¥${p.prices?.adult ?? '—'}）`,
                            searchText: p.name,
                          }))}
                        />
                        {productId && <Tag color="blue">已回填，可调整（不反写产品）</Tag>}
                      </Space>
                    </Descriptions.Item>
                  </Descriptions>
                  <Descriptions bordered column={2} size="small" style={{ maxWidth: 900, marginTop: 8 }}>
                    <Descriptions.Item label="行程名称 *">
                      <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="如：贵州红色之旅5日游-第一期" />
                    </Descriptions.Item>
                    <Descriptions.Item label="团号">
                      <Space>
                        <Input value={groupNo} onChange={(e) => setGroupNo(e.target.value)} maxLength={30} placeholder="自动生成" style={{ width: 220 }} />
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          自动生成
                        </Typography.Text>
                      </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="旅游地域">
                      <Select
                        style={{ width: 160 }}
                        placeholder="请选择旅游地域"
                        allowClear
                        value={tourRegion}
                        onChange={(v) => setTourRegion(v)}
                        options={(['province', 'domestic', 'abroad'] as TourRegion[]).map((r) => ({
                          value: r,
                          label: TourRegionLabels[r],
                        }))}
                      />
                    </Descriptions.Item>
                    <Descriptions.Item label="行程性质">
                      <Radio.Group
                        value={nature}
                        onChange={(e) => setNature(e.target.value)}
                        optionType="button"
                        options={(['group', 'independent'] as ItineraryNature[]).map((n) => ({ value: n, label: ItineraryNatureLabels[n] }))}
                      />
                      <Typography.Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                        选产品时自动回填
                      </Typography.Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="获客渠道 *">
                      <Select
                        style={{ width: 200 }}
                        placeholder="必选"
                        value={channel}
                        onChange={setChannel}
                        options={Object.entries(ItineraryChannelLabels).map(([v, l]) => ({ value: v as ItineraryChannel, label: l }))}
                      />
                    </Descriptions.Item>
                    <Descriptions.Item label="出团日期时间 *">
                      <DatePicker
                        showTime={{ format: 'HH:mm' }}
                        format="YYYY-MM-DD HH:mm"
                        value={departure}
                        onChange={setDeparture}
                        style={{ width: 200 }}
                      />
                    </Descriptions.Item>
                    <Descriptions.Item label="结团日期时间 *">
                      <DatePicker
                        showTime={{ format: 'HH:mm' }}
                        format="YYYY-MM-DD HH:mm"
                        value={returnAt}
                        onChange={setReturnAt}
                        style={{ width: 200 }}
                        disabledDate={(d) => departure && d.isBefore(departure.startOf('day'))}
                      />
                    </Descriptions.Item>
                    <Descriptions.Item label="总天数">
                      <InputNumber
                        min={1}
                        max={30}
                        precision={0}
                        value={totalDays}
                        onChange={(v) => setTotalDays(v ?? undefined)}
                        style={{ width: 120 }}
                        addonAfter="天"
                        placeholder="手动输入"
                      />
                    </Descriptions.Item>
                    <Descriptions.Item label="总晚数">
                      <InputNumber
                        min={0}
                        max={29}
                        precision={0}
                        value={totalNights}
                        onChange={(v) => setTotalNights(v ?? undefined)}
                        style={{ width: 120 }}
                        addonAfter="晚"
                      />
                    </Descriptions.Item>
                    <Descriptions.Item label="发团地址 *">
                      <Input value={departurePlace} onChange={(e) => setDeparturePlace(e.target.value)} maxLength={100} placeholder="如：贵阳市花溪区XX酒店门口" />
                    </Descriptions.Item>
                    <Descriptions.Item label="结团地址 *">
                      <Input value={closingPlace} onChange={(e) => setClosingPlace(e.target.value)} maxLength={100} placeholder="如：遵义市红花岗区XX纪念馆" />
                    </Descriptions.Item>
                    <Descriptions.Item label="成人单价 *">
                      <InputNumber min={0} precision={2} prefix="¥" value={prices.adult} onChange={(v) => setPrices((p) => ({ ...p, adult: v ?? undefined }))} />
                    </Descriptions.Item>
                    <Descriptions.Item label="老人单价">
                      <InputNumber min={0} precision={2} prefix="¥" value={prices.senior} onChange={(v) => setPrices((p) => ({ ...p, senior: v ?? undefined }))} />
                    </Descriptions.Item>
                    <Descriptions.Item label="儿童单价">
                      <InputNumber min={0} precision={2} prefix="¥" value={prices.child} onChange={(v) => setPrices((p) => ({ ...p, child: v ?? undefined }))} />
                    </Descriptions.Item>
                    <Descriptions.Item label="婴儿单价">
                      <InputNumber min={0} precision={2} prefix="¥" value={prices.infant} onChange={(v) => setPrices((p) => ({ ...p, infant: v ?? undefined }))} />
                    </Descriptions.Item>
                    <Descriptions.Item label="附件凭证">
                      <Upload
                        multiple
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.zip,.rar,.txt"
                        beforeUpload={(file) => {
                          setAttachments((prev) => [...prev, file.name])
                          return false
                        }}
                        onRemove={(file) => setAttachments((prev) => prev.filter((f) => f !== file.name))}
                        fileList={attachments.map((f) => ({ uid: f, name: f }))}
                      >
                        <Button icon={<UploadOutlined />}>文件/图片上传</Button>
                      </Upload>
                    </Descriptions.Item>
                    <Descriptions.Item label="发票凭证">
                      <Upload
                        multiple
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.zip,.rar,.txt"
                        beforeUpload={(file) => {
                          setInvoices((prev) => [...prev, file.name])
                          return false
                        }}
                        onRemove={(file) => setInvoices((prev) => prev.filter((f) => f !== file.name))}
                        fileList={invoices.map((f) => ({ uid: f, name: f }))}
                      >
                        <Button icon={<UploadOutlined />}>文件/图片上传</Button>
                      </Upload>
                    </Descriptions.Item>
                    <Descriptions.Item label="备注" span={2}>
                      <Input.TextArea rows={2} value={remark} onChange={(e) => setRemark(e.target.value)} maxLength={200} />
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              ),
            },
            {
              key: 'days',
              label: '行程明细',
              children: (
                <>
                  <Alert
                    type="info"
                    showIcon
                    message={`共 ${effectDays} 天；每天日期默认按出团日期自动推算，可手动调整；用餐、住宿酒店、景区每项独立一行填写（可空）`}
                    style={{ marginBottom: 16 }}
                  />
                  {dayPlans.map((d) => (
                    <Card
                      key={d.dayNo}
                      type="inner"
                      title={`第 ${d.dayNo} 天${d.date ? `（${dayjs(d.date).format('M月D日')}）` : ''}`}
                      size="small"
                      style={{ marginBottom: 12 }}
                    >
                      <div style={{ maxWidth: 560 }}>
                        <div style={{ marginBottom: 12 }}>
                          <Typography.Text type="secondary">日期</Typography.Text>
                          <DatePicker
                            style={{ width: '100%' }}
                            value={d.date ? dayjs(d.date) : null}
                            onChange={(_, dateStr) => updateDay(d.dayNo, { date: (dateStr as string) || undefined })}
                            placeholder="如：9月1号"
                          />
                        </div>
                        <div style={{ marginBottom: 12 }}>
                          <Typography.Text type="secondary">用餐</Typography.Text>
                          <MerchantSelector
                            type="restaurant"
                            value={d.meal}
                            onChange={(v, m) => updateDay(d.dayNo, { meal: (v as string) ?? undefined, mealName: (m as Merchant | undefined)?.name })}
                          />
                        </div>
                        <div style={{ marginBottom: 12 }}>
                          <Typography.Text type="secondary">住宿酒店</Typography.Text>
                          <MerchantSelector
                            type="hotel"
                            value={d.hotel}
                            onChange={(v, m) => updateDay(d.dayNo, { hotel: (v as string) ?? undefined, hotelName: (m as Merchant | undefined)?.name })}
                          />
                        </div>
                        <div style={{ marginBottom: 12 }}>
                          <Typography.Text type="secondary">景区（可多选）</Typography.Text>
                          <MerchantSelector
                            type="scenic"
                            multiple
                            value={d.scenicSpots}
                            onChange={(v, list) =>
                              updateDay(d.dayNo, {
                                scenicSpots: (v as string[]) ?? [],
                                scenicSpotNames: ((list as Merchant[]) ?? []).map((x) => x.name),
                              })
                            }
                          />
                        </div>
                        <div style={{ marginBottom: 12 }}>
                          <Typography.Text type="secondary">购物店（可多选）</Typography.Text>
                          <MerchantSelector
                            type="shop"
                            multiple
                            value={d.shoppingStores}
                            onChange={(v, list) =>
                              updateDay(d.dayNo, {
                                shoppingStores: (v as string[]) ?? [],
                                shoppingStoreNames: ((list as Merchant[]) ?? []).map((x) => x.name),
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
                </>
              ),
            },
            {
              key: 'vehicle',
              label: '车辆与导游',
              children: (
                <>
                  <Card size="small" title="预定车辆" style={{ marginBottom: 16 }}>
                    <Space style={{ marginBottom: 12 }}>
                      <Typography.Text>用车性质：</Typography.Text>
                      <Radio.Group
                        value={vehicleNature}
                        onChange={(e) => setVehicleNature(e.target.value)}
                        optionType="button"
                        options={(['tourBus', 'selfDrive', 'smallCar'] as VehicleNature[]).map((v) => ({
                          value: v,
                          label: VehicleNatureLabels[v],
                        }))}
                      />
                    </Space>
                    {vehicles.map((v, idx) => (
                      <Card
                        key={v.id}
                        type="inner"
                        size="small"
                        title={`车辆 ${idx + 1}`}
                        style={{ marginBottom: 12 }}
                        extra={
                          <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => setVehicles((prev) => prev.filter((x) => x.id !== v.id))}>
                            删除
                          </Button>
                        }
                      >
                        {/* 每个字段带标题展示，便于识别内容含义 */}
                        <div style={{ maxWidth: 640 }}>
                          <div style={{ marginBottom: 10 }}>
                            <Typography.Text type="secondary">运输企业</Typography.Text>
                            <Input placeholder="如：贵州顺安旅游客运有限公司" value={v.transportCompany} onChange={(e) => setVehicles((prev) => prev.map((x) => (x.id === v.id ? { ...x, transportCompany: e.target.value } : x)))} />
                          </div>
                          <div style={{ marginBottom: 10 }}>
                            <Typography.Text type="secondary">车牌及编号</Typography.Text>
                            <Input placeholder="如：贵A D12345" value={v.plateNo} onChange={(e) => setVehicles((prev) => prev.map((x) => (x.id === v.id ? { ...x, plateNo: e.target.value } : x)))} />
                          </div>
                          <Space size="middle" style={{ display: 'flex' }} align="start">
                            <div style={{ width: 200 }}>
                              <Typography.Text type="secondary">驾驶员名称</Typography.Text>
                              <Input placeholder="如：刘师傅" value={v.driverName} onChange={(e) => setVehicles((prev) => prev.map((x) => (x.id === v.id ? { ...x, driverName: e.target.value } : x)))} />
                            </div>
                            <div style={{ width: 200 }}>
                              <Typography.Text type="secondary">驾驶员手机</Typography.Text>
                              <Input value={v.driverPhone} onChange={(e) => setVehicles((prev) => prev.map((x) => (x.id === v.id ? { ...x, driverPhone: e.target.value } : x)))} />
                            </div>
                          </Space>
                          <Space size="middle" style={{ display: 'flex', marginTop: 10 }} align="start">
                            <div style={{ width: 130 }}>
                              <Typography.Text type="secondary">座位数</Typography.Text>
                              <InputNumber min={1} style={{ width: '100%' }} value={v.seatCount} onChange={(val) => setVehicles((prev) => prev.map((x) => (x.id === v.id ? { ...x, seatCount: val ?? undefined } : x)))} />
                            </div>
                            <div style={{ width: 130 }}>
                              <Typography.Text type="secondary">车辆数</Typography.Text>
                              <InputNumber min={1} style={{ width: '100%' }} value={v.vehicleCount} onChange={(val) => setVehicles((prev) => prev.map((x) => (x.id === v.id ? { ...x, vehicleCount: val ?? undefined } : x)))} />
                            </div>
                            <div style={{ width: 300 }}>
                              <Typography.Text type="secondary">备注</Typography.Text>
                              <Input value={v.remark} onChange={(e) => setVehicles((prev) => prev.map((x) => (x.id === v.id ? { ...x, remark: e.target.value } : x)))} />
                            </div>
                          </Space>
                        </div>
                      </Card>
                    ))}
                    <Button
                      type="dashed"
                      block
                      icon={<PlusOutlined />}
                      onClick={() => setVehicles((prev) => [...prev, { id: `V${Date.now()}`, transportCompany: '', plateNo: '', driverName: '' }])}
                    >
                      添加车辆（允许多辆；车辆信息非提交必填项）
                    </Button>
                  </Card>
                  <Card size="small" title="导游信息（从导游库下拉选择，支持搜索）">
                    {guides.map((g, idx) => (
                      <Card
                        key={g.id}
                        type="inner"
                        size="small"
                        title={`导游 ${idx + 1}：${g.guideNameSnapshot}`}
                        style={{ marginBottom: 12 }}
                        extra={
                          <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => setGuides((prev) => prev.filter((x) => x.id !== g.id))}>
                            删除
                          </Button>
                        }
                      >
                        <Descriptions column={2} size="small">
                          <Descriptions.Item label="预定日期">
                            {g.startDate} ~ {g.endDate}
                          </Descriptions.Item>
                          <Descriptions.Item label="详细信息">
                            {g.guideGenderSnapshot ?? '—'} · {g.guidePhoneSnapshot ?? '—'} · 导游证号 {g.guideLicenseSnapshot ?? '—'}
                          </Descriptions.Item>
                        </Descriptions>
                      </Card>
                    ))}
                    <GuideBookingEditor onAdd={(booking) => setGuides((prev) => [...prev, booking])} />
                  </Card>
                </>
              ),
            },
            {
              key: 'tourists',
              label: `游客名单（${tourists.length} 人）`,
              children: (
                <>
                  <Space style={{ marginBottom: 12 }} wrap>
                    <Button icon={<DownloadOutlined />} onClick={downloadTemplate}>
                      下载模板
                    </Button>
                    <Upload accept=".csv" showUploadList={false} beforeUpload={importTourists}>
                      <Button icon={<UploadOutlined />}>批量导入</Button>
                    </Upload>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setTouristOpen(true)}>
                      添加名单
                    </Button>
                    <Typography.Text type="secondary">
                      总数：{tourists.length} 人（成人 {categoryCount.adult} / 老人 {categoryCount.senior} / 儿童 {categoryCount.child} / 婴儿 {categoryCount.infant}）；性别/生日/年龄按身份证号自动识别，外籍游客可手动填写
                    </Typography.Text>
                  </Space>
                  <Table rowKey="id" size="small" columns={touristColumns} dataSource={tourists} pagination={false} scroll={{ x: 900 }} />
                </>
              ),
            },
          ]}
        />
      </PageContainer>

      <TouristModal
        open={touristOpen}
        onCancel={() => setTouristOpen(false)}
        onOk={addTourist}
        form={touristForm}
      />
    </>
  )
}

/** 添加游客弹窗：身份证号自动识别性别/生日/年龄；外籍（护照等）可空、手动填写 */
function TouristModal({
  open,
  onCancel,
  onOk,
  form,
}: {
  open: boolean
  onCancel: () => void
  onOk: () => void
  form: FormInstance
}) {
  const idType = Form.useWatch('idType', form) ?? 'idCard'
  const isIdCard = idType === 'idCard'

  // 身份证号变化 → 自动识别性别/生日/年龄
  const handleIdNoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseIdCard(e.target.value)
    if (parsed) {
      form.setFieldsValue({
        gender: parsed.gender,
        birthDate: parsed.birthDate ? dayjs(parsed.birthDate) : undefined,
        age: parsed.age,
      })
    }
  }

  return (
    <Modal
      title="添加游客"
      open={open}
      onOk={onOk}
      onCancel={onCancel}
      okText="确定"
      cancelText="取消"
      width={560}
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Space size="middle" style={{ display: 'flex' }} align="start">
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]} style={{ width: 150 }}>
            <Input maxLength={20} />
          </Form.Item>
          <Form.Item name="idType" label="证件类型" initialValue="idCard" rules={[{ required: true }]} style={{ width: 130 }}>
            <Select options={Object.entries(TouristIdTypeLabels).map(([v, l]) => ({ value: v as TouristIdType, label: l }))} />
          </Form.Item>
          <Form.Item name="idNo" label="证件号" rules={[{ required: true, message: '请输入证件号' }]} style={{ width: 200 }}>
            <Input maxLength={20} onChange={handleIdNoChange} placeholder="身份证号自动识别" />
          </Form.Item>
        </Space>
        <Space size="middle" style={{ display: 'flex' }} align="start">
          <Form.Item name="gender" label={`性别${isIdCard ? '（自动识别）' : ''}`} style={{ width: 130 }}>
            <Select
              allowClear
              disabled={isIdCard}
              placeholder={isIdCard ? '输入证件号后自动识别' : '手动选择'}
              options={[
                { value: 'male', label: '男' },
                { value: 'female', label: '女' },
              ]}
            />
          </Form.Item>
          <Form.Item name="birthDate" label={`生日${isIdCard ? '（自动识别）' : ''}`} style={{ width: 180 }}>
            <DatePicker
              style={{ width: '100%' }}
              disabled={isIdCard}
              placeholder={isIdCard ? '自动识别' : '手动选择'}
            />
          </Form.Item>
          <Form.Item name="age" label={`年龄${isIdCard ? '（自动识别）' : ''}`} style={{ width: 120 }}>
            <InputNumber min={0} max={150} style={{ width: '100%' }} disabled={isIdCard} placeholder={isIdCard ? '自动识别' : '手动填写'} />
          </Form.Item>
        </Space>
        <Space size="middle" style={{ display: 'flex' }} align="start">
          <Form.Item name="phone" label="手机号码" rules={[{ pattern: /^1\d{10}$/, message: '手机号格式不正确' }]} style={{ width: 200 }}>
            <Input maxLength={11} />
          </Form.Item>
          <Form.Item name="category" label="人群类别" initialValue="adult" rules={[{ required: true }]} style={{ width: 150 }}>
            <Select options={Object.entries(TouristCategoryLabels).map(([v, l]) => ({ value: v as TouristCategory, label: l }))} />
          </Form.Item>
          <Form.Item name="origin" label="客源地" rules={[{ required: true, message: '请输入客源地' }]} style={{ width: 180 }}>
            <Input placeholder="如：贵州省贵阳市" maxLength={30} />
          </Form.Item>
        </Space>
      </Form>
    </Modal>
  )
}

// 导游预定编辑器：时间段 + 导游库下拉（搜索），确认后加入名单
function GuideBookingEditor({ onAdd }: { onAdd: (booking: GuideBooking) => void }) {
  const { message } = App.useApp()
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)
  const [guideId, setGuideId] = useState<string | undefined>()
  const [guide, setGuide] = useState<import('../../../types/agency').Guide | undefined>()

  const handleAdd = () => {
    if (!range?.[0] || !range?.[1] || !guideId || !guide) {
      message.warning('请选择预定日期时间段与导游')
      return
    }
    onAdd({
      id: `GB${Date.now()}`,
      guideId,
      guideNameSnapshot: guide.name,
      guideGenderSnapshot: guide.gender === 'female' ? '女' : '男',
      guidePhoneSnapshot: guide.phone,
      guideLicenseSnapshot: guide.licenseNo,
      startDate: range[0].format('YYYY-MM-DD'),
      endDate: range[1].format('YYYY-MM-DD'),
    })
    setRange(null)
    setGuideId(undefined)
    setGuide(undefined)
    message.success('已添加导游预定')
  }

  return (
    <Space wrap>
      <DatePicker.RangePicker value={range} onChange={(v) => setRange(v as [Dayjs | null, Dayjs | null] | null)} />
      <div style={{ width: 320 }}>
        <GuideSelector value={guideId} onChange={(v, g) => { setGuideId(v); setGuide(g) }} />
      </div>
      <Button type="dashed" icon={<PlusOutlined />} onClick={handleAdd}>
        添加导游
      </Button>
    </Space>
  )
}
