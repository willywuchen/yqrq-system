import { useEffect, useMemo, useState } from 'react'
import {
  Form,
  Input,
  InputNumber,
  DatePicker,
  Button,
  Card,
  Row,
  Col,
  Upload,
  message,
  Alert,
  Table,
  Select,
  Space,
  Tag,
  Divider,
  Typography,
  Tabs,
  Empty,
  Tooltip,
  Collapse,
} from 'antd'
import {
  SaveOutlined,
  SendOutlined,
  PlusOutlined,
  DeleteOutlined,
  UploadOutlined,
  ArrowLeftOutlined,
  InfoCircleOutlined,
  LinkOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import { useStore } from '../../store'
import {
  CategoryToMajor,
  POLICY_CONSTANTS,
  RewardMajorLabels,
  RequiresPreCheck,
  type AccommodationInfo,
  type Application,
  type Attachment,
  type AttachmentGroup,
  type GuideDriverInfo,
  type PreCheckInfo,
  type RewardCategory,
  type ScenicInfo,
  type TouristItem,
} from '../../types'
import {
  RewardRules,
  calcRewardAmount,
  getAllMaterials,
  SpecialExtraMaterials as SpecialExtraMaterialsList,
  CultureMaterials as CultureMaterialsList,
  type MaterialItem,
} from '../../mock/data'
import { formatMoney, genId, nowStr } from '../../utils'
import { validateApplication } from '../../utils/validators'

const { TextArea } = Input
const { Text } = Typography

interface Props {
  mode: 'new' | 'edit'
}

export default function ApplicationForm({ mode }: Props) {
  const navigate = useNavigate()
  const params = useParams()
  const { category } = useParams<{ category: RewardCategory }>()
  const { applications, addApplication, updateApplication, currentUser, enterpriseProfile } = useStore()
  const [form] = Form.useForm()
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [tourists, setTourists] = useState<TouristItem[]>([])
  const [scenics, setScenics] = useState<ScenicInfo[]>([])
  const [accommodations, setAccommodations] = useState<AccommodationInfo[]>([])
  const [guideDrivers, setGuideDrivers] = useState<GuideDriverInfo[]>([])
  const [preCheck, setPreCheck] = useState<PreCheckInfo>({})
  const [submitting, setSubmitting] = useState(false)
  const [validationMsgs, setValidationMsgs] = useState<{ errors: string[]; warnings: string[] }>({
    errors: [],
    warnings: [],
  })

  const editingId = mode === 'edit' ? params.id : undefined
  const editingApp = editingId ? applications.find((a) => a.id === editingId) : undefined

  const activeCategory = (category || editingApp?.category) as RewardCategory
  const rule = activeCategory ? RewardRules[activeCategory] : undefined
  const isCultureCategory = activeCategory?.startsWith('culture_')
  const isTeamOrSpecial = activeCategory === 'team_reception' || activeCategory?.startsWith('special_')

  useEffect(() => {
    if (editingApp) {
      // 仅设置表单字段，避免传入非表单属性（如 attachments、auditLogs 等）干扰表单
      form.setFieldsValue({
        applicantOrg: editingApp.applicantOrg,
        contactPerson: editingApp.contactPerson,
        contactPhone: editingApp.contactPhone,
        teamName: editingApp.teamName,
        teamSize: editingApp.teamSize,
        inboundTourists: editingApp.inboundTourists,
        domesticTourists: editingApp.domesticTourists,
        stayDays: editingApp.stayDays,
        travelStart: editingApp.travelStart ? dayjs(editingApp.travelStart) : undefined,
        travelEnd: editingApp.travelEnd ? dayjs(editingApp.travelEnd) : undefined,
        travelDesc: editingApp.travelDesc,
        dispatchNo: editingApp.dispatchNo,
        targetAgreementNo: editingApp.targetAgreementNo,
        flightNo: editingApp.flightNo,
        aviationType: editingApp.aviationType,
        trainNo: editingApp.trainNo,
        meetingName: editingApp.meetingName,
        meetingLocation: editingApp.meetingLocation,
        meetingParticipants: editingApp.meetingParticipants,
        activityTimes: editingApp.activityTimes,
        advertisingType: editingApp.advertisingType,
        advertisingAmount: editingApp.advertisingAmount,
        websiteUrl: editingApp.websiteUrl,
        orderCount: editingApp.orderCount,
        exchangeType: editingApp.exchangeType,
        charterCount: editingApp.charterCount,
        salesAmount: editingApp.salesAmount,
        mediaAmount: editingApp.mediaAmount,
        promotionTimes: editingApp.promotionTimes,
      })
      setAttachments(editingApp.attachments || [])
      setTourists(editingApp.tourists || [])
      setScenics(editingApp.scenics || [])
      setAccommodations(editingApp.accommodations || [])
      setGuideDrivers(editingApp.guideDrivers || [])
      setPreCheck(editingApp.preCheck || {})
    }
  }, [editingApp, form])

  // 实时校验
  useEffect(() => {
    if (!activeCategory) return
    const values = form.getFieldsValue()
    const tempApp: Partial<Application> = {
      ...values,
      category: activeCategory,
      travelStart: values.travelStart ? values.travelStart.format('YYYY-MM-DD') : undefined,
      travelEnd: values.travelEnd ? values.travelEnd.format('YYYY-MM-DD') : undefined,
      scenics,
      attachments,
    }
    const result = validateApplication(tempApp, applications, editingId)
    setValidationMsgs({ errors: result.errors, warnings: result.warnings })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, form, applications, scenics, attachments, editingId])

  // 表单数据 → 申报对象
  const buildApplication = (formValues: any, status: 'draft' | 'pending_initial' | 'pre_check_pending'): Application => {
    const data: any = {
      ...formValues,
      travelStart: formValues.travelStart ? formValues.travelStart.format('YYYY-MM-DD') : undefined,
      travelEnd: formValues.travelEnd ? formValues.travelEnd.format('YYYY-MM-DD') : undefined,
    }
    const base: Application = {
      id: editingApp?.id || genId('APP'),
      category: activeCategory,
      applicantOrg: currentUser.org || '未知旅行社',
      contactPerson: data.contactPerson || currentUser.name,
      contactPhone: data.contactPhone || '',
      status,
      submitTime: status !== 'draft' ? nowStr() : undefined,
      createTime: editingApp?.createTime || nowStr(),
      updateTime: nowStr(),
      teamName: data.teamName,
      teamSize: data.teamSize,
      inboundTourists: data.inboundTourists,
      domesticTourists: data.domesticTourists,
      stayDays: data.stayDays,
      travelStart: data.travelStart,
      travelEnd: data.travelEnd,
      travelDesc: data.travelDesc,
      dispatchNo: data.dispatchNo,
      targetAgreementNo: data.targetAgreementNo,
      flightNo: data.flightNo,
      aviationType: data.aviationType,
      trainNo: data.trainNo,
      meetingName: data.meetingName,
      meetingLocation: data.meetingLocation,
      meetingParticipants: data.meetingParticipants,
      activityTimes: data.activityTimes,
      advertisingType: data.advertisingType,
      advertisingAmount: data.advertisingAmount,
      websiteUrl: data.websiteUrl,
      orderCount: data.orderCount,
      exchangeType: data.exchangeType,
      attachments,
      tourists,
      scenics,
      accommodations,
      guideDrivers,
      preCheck: isCultureCategory ? preCheck : undefined,
      auditLogs: editingApp?.auditLogs || [],
      // 兼容旧字段
      charterCount: data.charterCount,
      salesAmount: data.salesAmount,
      mediaAmount: data.mediaAmount,
      promotionTimes: data.promotionTimes,
    }
    base.calculatedAmount = calcRewardAmount(base)
    return base
  }

  const handleSave = (isSubmit = false) => {
    form
      .validateFields(isSubmit ? undefined : [])
      .then((values) => {
        // 提交前再次校验业务规则
        if (isSubmit) {
          const tempApp: Partial<Application> = {
            ...values,
            category: activeCategory,
            travelStart: values.travelStart ? values.travelStart.format('YYYY-MM-DD') : undefined,
            travelEnd: values.travelEnd ? values.travelEnd.format('YYYY-MM-DD') : undefined,
            scenics,
            attachments,
          }
          const result = validateApplication(tempApp, applications, editingId)
          if (result.errors.length > 0) {
            message.error(result.errors[0])
            return
          }
        }

        setSubmitting(true)
        // 文旅宣传类需先走前置审核
        const needsPreCheck = isSubmit && RequiresPreCheck.includes(activeCategory)

        // 编辑模式下：根据原状态决定重新提交后的目标状态
        // 退回后重新提交：回到退回的审核节点继续
        let targetStatus: 'draft' | 'pending_initial' | 'pre_check_pending' | 'pending_review' = 'draft'
        let resubmitStage = '' // 重新提交的审核阶段标识
        if (isSubmit) {
          if (editingApp) {
            const prevStatus = editingApp.status
            if (prevStatus === 'pre_check_rejected') {
              // 前置审核退回 → 重新提交前置审核
              targetStatus = 'pre_check_pending'
              resubmitStage = 'pre_check'
            } else if (prevStatus === 'initial_returned') {
              // 初审退回 → 重新提交初审
              targetStatus = 'pending_initial'
              resubmitStage = 'initial'
            } else if (prevStatus === 'review_returned') {
              // 复审退回 → 重新提交复审（跳过初审）
              targetStatus = 'pending_review'
              resubmitStage = 'review'
            } else if (prevStatus === 'rejected') {
              // 终审不通过 → 重新走全流程
              targetStatus = needsPreCheck ? 'pre_check_pending' : 'pending_initial'
              resubmitStage = needsPreCheck ? 'pre_check' : 'initial'
            } else {
              // 草稿或其他状态 → 正常提交
              targetStatus = needsPreCheck ? 'pre_check_pending' : 'pending_initial'
              resubmitStage = needsPreCheck ? 'pre_check' : 'initial'
            }
          } else {
            targetStatus = needsPreCheck ? 'pre_check_pending' : 'pending_initial'
            resubmitStage = needsPreCheck ? 'pre_check' : 'initial'
          }
        }

        const app = buildApplication(values, targetStatus as 'draft' | 'pending_initial' | 'pre_check_pending')

        if (editingApp) {
          const logs = [...(app.auditLogs || [])]
          if (isSubmit) {
            // 判断是否为"退回后重新提交"
            const isResubmit = ['initial_returned', 'review_returned', 'pre_check_rejected', 'rejected'].includes(editingApp.status)
            logs.push({
              id: genId('log'),
              stage: resubmitStage as 'pre_check' | 'initial' | 'review' | 'final',
              operator: currentUser.name,
              operatorRole: currentUser.role,
              action: 'submit',
              comment: isResubmit
                ? `修改后重新提交（原状态：${editingApp.status === 'initial_returned' ? '初审退回' : editingApp.status === 'review_returned' ? '复审退回' : editingApp.status === 'pre_check_rejected' ? '前置审核不通过' : '终审不通过'}）`
                : (needsPreCheck ? '提交前置审核' : '提交申报'),
              time: nowStr(),
            })
          }
          updateApplication(editingApp.id, { ...app, auditLogs: logs })
          message.success(isSubmit ? (needsPreCheck ? '已提交前置审核' : '申报已提交') : '草稿已保存')
        } else {
          if (isSubmit) {
            app.auditLogs = [
              {
                id: genId('log'),
                stage: needsPreCheck ? 'pre_check' : 'initial',
                operator: currentUser.name,
                operatorRole: currentUser.role,
                action: 'submit',
                comment: needsPreCheck ? '提交前置审核' : '提交申报',
                time: nowStr(),
              },
            ]
          }
          addApplication(app)
          message.success(isSubmit ? (needsPreCheck ? '已提交前置审核' : '申报已提交') : '草稿已保存')
        }
        setSubmitting(false)
        navigate(`/applications/${app.id}`)
      })
      .catch(() => {
        if (isSubmit) message.error('请完善必填项后再提交')
      })
  }

  // 实时计算预览金额
  const previewAmount = useMemo(() => {
    const values = form.getFieldsValue()
    const temp = buildApplication(values, 'draft')
    return temp.calculatedAmount || 0
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, attachments, tourists, scenics, accommodations, activeCategory])

  // 上传（分组，可带材料标题）
  const uploadByGroup = (group: AttachmentGroup, title?: string) => ({
    beforeUpload: (file: File) => {
      const isLt20M = file.size / 1024 / 1024 < 20
      if (!isLt20M) {
        message.error('文件不能超过 20MB!')
        return Upload.LIST_IGNORE
      }
      const att: Attachment = {
        uid: genId('file'),
        name: file.name,
        size: file.size,
        type: file.type || file.name.split('.').pop() || '',
        uploadTime: nowStr(),
        group,
        title,
      }
      setAttachments((prev) => [...prev, att])
      message.success(`${file.name} 上传成功`)
      return false
    },
    multiple: true,
    showUploadList: false,
  })

  const removeAttachment = (uid: string) =>
    setAttachments((prev) => prev.filter((a) => a.uid !== uid))

  const getAttachmentsByGroup = (group: AttachmentGroup, title?: string) =>
    attachments.filter((a) => {
      const g = a.group || 'other'
      if (g !== group) return false
      if (title && a.title !== title) return false
      return true
    })

  // ========== 游客名单操作 ==========
  const addTourist = () => {
    setTourists((prev) => [
      ...prev,
      {
        key: genId('t'),
        name: '',
        idType: 'passport',
        idNumber: '',
        nationality: '',
        sourcePlace: '',
        checkInDate: '',
        checkOutDate: '',
        scenicEnterTime: '',
      },
    ])
  }
  const removeTourist = (key: string) => setTourists((prev) => prev.filter((t) => t.key !== key))
  const updateTourist = (key: string, field: keyof TouristItem, value: string) =>
    setTourists((prev) => prev.map((t) => (t.key === key ? { ...t, [field]: value } : t)))

  // ========== 景区信息操作 ==========
  const addScenic = () => {
    setScenics((prev) => [...prev, { key: genId('s'), name: '', level: '4A', enterTime: '' }])
  }
  const removeScenic = (key: string) => setScenics((prev) => prev.filter((s) => s.key !== key))
  const updateScenic = (key: string, field: keyof ScenicInfo, value: string) =>
    setScenics((prev) => prev.map((s) => (s.key === key ? { ...s, [field]: value } : s)))

  // ========== 住宿信息操作 ==========
  const addAccommodation = () => {
    setAccommodations((prev) => [...prev, { key: genId('a'), hotelName: '', checkInDate: '', checkOutDate: '' }])
  }
  const removeAccommodation = (key: string) => setAccommodations((prev) => prev.filter((a) => a.key !== key))
  const updateAccommodation = (key: string, field: keyof AccommodationInfo, value: string) =>
    setAccommodations((prev) => prev.map((a) => (a.key === key ? { ...a, [field]: value } : a)))

  // ========== 导游/司机操作 ==========
  const addGuideDriver = (type: 'guide' | 'driver') => {
    setGuideDrivers((prev) => [...prev, { key: genId('g'), type, name: '', licenseNo: '' }])
  }
  const removeGuideDriver = (key: string) => setGuideDrivers((prev) => prev.filter((g) => g.key !== key))
  const updateGuideDriver = (key: string, field: keyof GuideDriverInfo, value: string) =>
    setGuideDrivers((prev) => prev.map((g) => (g.key === key ? { ...g, [field]: value } : g)))

  // ========== 必传材料清单 ==========
  const materials = useMemo(() => (activeCategory ? getAllMaterials(activeCategory) : []), [activeCategory])

  // 渲染附件列表
  const renderAttachmentList = (group: AttachmentGroup, title?: string) => {
    const list = getAttachmentsByGroup(group, title)
    if (list.length === 0) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无文件" />
    const hasTitle = list.some((a) => a.title)
    return (
      <Table
        dataSource={list}
        rowKey="uid"
        size="small"
        pagination={false}
        columns={[
          ...(hasTitle
            ? [{ title: '材料标题', dataIndex: 'title', width: 140, render: (v: string) => v ? <Tag color="blue">{v}</Tag> : '-' }]
            : []),
          { title: '文件名', dataIndex: 'name' },
          {
            title: '大小',
            dataIndex: 'size',
            width: 100,
            render: (s: number) => (s / 1024).toFixed(1) + ' KB',
          },
          { title: '上传时间', dataIndex: 'uploadTime', width: 180 },
          {
            title: '操作',
            width: 80,
            render: (_: any, r: Attachment) => (
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
                onClick={() => removeAttachment(r.uid)}
              />
            ),
          },
        ]}
      />
    )
  }

  // 紧凑上传区域：小按钮 + 已传文件列表，一体化展示（按 group + title 过滤）
  const renderUploadArea = (group: AttachmentGroup, hint?: string, title?: string) => {
    const list = getAttachmentsByGroup(group, title)
    return (
      <div>
        <Space align="center" style={{ marginBottom: list.length > 0 ? 8 : 0 }}>
          <Upload {...uploadByGroup(group, title)}>
            <Button size="small" icon={<UploadOutlined />}>上传文件</Button>
          </Upload>
          {hint && <Text type="secondary" style={{ fontSize: 12 }}>{hint}</Text>}
          {list.length > 0 && <Tag color="green" style={{ marginLeft: 4 }}>{list.length} 个文件</Tag>}
        </Space>
        {list.length > 0 && renderAttachmentList(group, title)}
      </div>
    )
  }

  // 游客名单列定义（扩展）
  const touristCols = [
    {
      title: '序号',
      width: 50,
      render: (_: any, __: any, i: number) => i + 1,
    },
    {
      title: '姓名',
      width: 100,
      render: (v: string, r: TouristItem) => (
        <Input value={v} onChange={(e) => updateTourist(r.key, 'name', e.target.value)} placeholder="姓名" size="small" />
      ),
      dataIndex: 'name',
    },
    {
      title: '证件类型',
      width: 120,
      render: (v: string, r: TouristItem) => (
        <Select
          value={v}
          onChange={(val) => updateTourist(r.key, 'idType', val)}
          style={{ width: '100%' }}
          size="small"
          options={[
            { value: 'passport', label: '护照' },
            { value: 'id_card', label: '身份证' },
            { value: 'hk_macao_pass', label: '港澳通行证' },
            { value: 'tw_pass', label: '台湾通行证' },
            { value: 'temp_entry_permit', label: '临时入境许可证' },
          ]}
        />
      ),
      dataIndex: 'idType',
    },
    {
      title: '证件号',
      width: 140,
      render: (v: string, r: TouristItem) => (
        <Input value={v} onChange={(e) => updateTourist(r.key, 'idNumber', e.target.value)} placeholder="证件号" size="small" />
      ),
      dataIndex: 'idNumber',
    },
    {
      title: '国籍/地区',
      width: 110,
      render: (v: string, r: TouristItem) => (
        <Input value={v} onChange={(e) => updateTourist(r.key, 'nationality', e.target.value)} placeholder="如：日本" size="small" />
      ),
      dataIndex: 'nationality',
    },
    {
      title: '客源地',
      width: 110,
      render: (v: string, r: TouristItem) => (
        <Input
          value={v || ''}
          onChange={(e) => updateTourist(r.key, 'sourcePlace', e.target.value)}
          placeholder="客源地"
          size="small"
        />
      ),
      dataIndex: 'sourcePlace',
    },
    {
      title: '入住时间',
      width: 130,
      render: (v: string, r: TouristItem) => (
        <Input
          value={v || ''}
          onChange={(e) => updateTourist(r.key, 'checkInDate', e.target.value)}
          placeholder="YYYY-MM-DD"
          size="small"
        />
      ),
      dataIndex: 'checkInDate',
    },
    {
      title: '退房时间',
      width: 130,
      render: (v: string, r: TouristItem) => (
        <Input
          value={v || ''}
          onChange={(e) => updateTourist(r.key, 'checkOutDate', e.target.value)}
          placeholder="YYYY-MM-DD"
          size="small"
        />
      ),
      dataIndex: 'checkOutDate',
    },
    {
      title: '进入景区时间',
      width: 150,
      render: (v: string, r: TouristItem) => (
        <Input
          value={v || ''}
          onChange={(e) => updateTourist(r.key, 'scenicEnterTime', e.target.value)}
          placeholder="YYYY-MM-DD HH:mm"
          size="small"
        />
      ),
      dataIndex: 'scenicEnterTime',
    },
    {
      title: '操作',
      width: 60,
      render: (_: any, r: TouristItem) => (
        <Button type="link" danger icon={<DeleteOutlined />} onClick={() => removeTourist(r.key)} size="small" />
      ),
    },
  ]

  // 景区列定义
  const scenicCols = [
    {
      title: '序号',
      width: 50,
      render: (_: any, __: any, i: number) => i + 1,
    },
    {
      title: '景区名称',
      render: (v: string, r: ScenicInfo) => (
        <Input value={v} onChange={(e) => updateScenic(r.key, 'name', e.target.value)} placeholder="如：黄果树瀑布" size="small" />
      ),
      dataIndex: 'name',
    },
    {
      title: '等级',
      width: 100,
      render: (v: string, r: ScenicInfo) => (
        <Select
          value={v}
          onChange={(val) => updateScenic(r.key, 'level', val)}
          style={{ width: '100%' }}
          size="small"
          options={[
            { value: '4A', label: '4A' },
            { value: '5A', label: '5A' },
          ]}
        />
      ),
      dataIndex: 'level',
    },
    {
      title: '进入时间',
      width: 180,
      render: (v: string, r: ScenicInfo) => (
        <Input
          value={v || ''}
          onChange={(e) => updateScenic(r.key, 'enterTime', e.target.value)}
          placeholder="YYYY-MM-DD HH:mm"
          size="small"
        />
      ),
      dataIndex: 'enterTime',
    },
    {
      title: '操作',
      width: 60,
      render: (_: any, r: ScenicInfo) => (
        <Button type="link" danger icon={<DeleteOutlined />} onClick={() => removeScenic(r.key)} size="small" />
      ),
    },
  ]

  // 住宿列定义
  const accommodationCols = [
    {
      title: '序号',
      width: 50,
      render: (_: any, __: any, i: number) => i + 1,
    },
    {
      title: '酒店名称',
      render: (v: string, r: AccommodationInfo) => (
        <Input
          value={v}
          onChange={(e) => updateAccommodation(r.key, 'hotelName', e.target.value)}
          placeholder="如：贵阳凯宾斯基酒店"
          size="small"
        />
      ),
      dataIndex: 'hotelName',
    },
    {
      title: '入住日期',
      width: 150,
      render: (v: string, r: AccommodationInfo) => (
        <Input
          value={v}
          onChange={(e) => updateAccommodation(r.key, 'checkInDate', e.target.value)}
          placeholder="YYYY-MM-DD"
          size="small"
        />
      ),
      dataIndex: 'checkInDate',
    },
    {
      title: '退房日期',
      width: 150,
      render: (v: string, r: AccommodationInfo) => (
        <Input
          value={v}
          onChange={(e) => updateAccommodation(r.key, 'checkOutDate', e.target.value)}
          placeholder="YYYY-MM-DD"
          size="small"
        />
      ),
      dataIndex: 'checkOutDate',
    },
    {
      title: '操作',
      width: 60,
      render: (_: any, r: AccommodationInfo) => (
        <Button type="link" danger icon={<DeleteOutlined />} onClick={() => removeAccommodation(r.key)} size="small" />
      ),
    },
  ]

  // 导游/司机列定义
  const guideDriverCols = [
    {
      title: '类型',
      width: 90,
      render: (_: any, r: GuideDriverInfo) => (r.type === 'guide' ? '导游' : '司机'),
      dataIndex: 'type',
    },
    {
      title: '姓名',
      render: (v: string, r: GuideDriverInfo) => (
        <Input value={v} onChange={(e) => updateGuideDriver(r.key, 'name', e.target.value)} placeholder="姓名" size="small" />
      ),
      dataIndex: 'name',
    },
    {
      title: '证件号',
      render: (v: string, r: GuideDriverInfo) => (
        <Input
          value={v || ''}
          onChange={(e) => updateGuideDriver(r.key, 'licenseNo', e.target.value)}
          placeholder={r.type === 'guide' ? '导游证号' : '驾驶证号'}
          size="small"
        />
      ),
      dataIndex: 'licenseNo',
    },
    {
      title: '操作',
      width: 60,
      render: (_: any, r: GuideDriverInfo) => (
        <Button type="link" danger icon={<DeleteOutlined />} onClick={() => removeGuideDriver(r.key)} size="small" />
      ),
    },
  ]

  // 是否需要展示团队/景区/住宿/导游板块
  const needTeamInfo = isTeamOrSpecial
  const needScenicInfo = isTeamOrSpecial
  const needAccommodationInfo = isTeamOrSpecial
  const needGuideDriver = isTeamOrSpecial
  const needTouristList = isTeamOrSpecial

  if (!rule) {
    return (
      <PageContainer>
        <Alert
          type="warning"
          message="该奖励类别已废弃或不存在"
          description="请通过新建申报选择有效的奖励类别。"
          showIcon
          action={<Button type="primary" onClick={() => navigate('/applications/new')}>去新建申报</Button>}
        />
      </PageContainer>
    )
  }

  return (
    <>
      <PageHeader
        title={`${mode === 'edit' ? '编辑' : '新建'}申报 - ${rule.title || ''}`}
        breadcrumb={[
          { title: '首页', path: '/' },
          { title: '我的申报', path: '/applications' },
          { title: mode === 'edit' ? '编辑' : '新建' },
        ]}
        extra={
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
            返回
          </Button>
        }
      />
      <PageContainer>
        {/* 政策提示 */}
        <Alert
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          message={rule.title}
          description={
            <>
              <div style={{ marginBottom: 8 }}>{rule.desc}</div>
              <Space wrap>
                <Tag color="orange">申报截止：{POLICY_CONSTANTS.finalDeadline}</Tag>
                <Tag color="blue">2026 年度奖励申报</Tag>
                <Tag color={CategoryToMajor[activeCategory] === 'team_reception' ? 'gold' : CategoryToMajor[activeCategory] === 'special_tourism' ? 'green' : 'purple'}>
                  {RewardMajorLabels[CategoryToMajor[activeCategory]!]}
                </Tag>
                {RequiresPreCheck.includes(activeCategory) && <Tag color="magenta">需前置审核</Tag>}
                {rule.maxPerYear && <Tag color="red">每年≤{rule.maxPerYear}次</Tag>}
              </Space>
              {rule.tips && rule.tips.length > 0 && (
                <ul style={{ margin: '12px 0 0 0', paddingLeft: 18, color: '#666', fontSize: 12 }}>
                  {rule.tips.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              )}
            </>
          }
          style={{ marginBottom: 16 }}
        />

        {/* 业务规则校验提示 */}
        {(validationMsgs.errors.length > 0 || validationMsgs.warnings.length > 0) && (
          <>
            {validationMsgs.errors.map((err, i) => (
              <Alert
                key={`err-${i}`}
                type="error"
                showIcon
                icon={<ExclamationCircleOutlined />}
                message={err}
                style={{ marginBottom: 8 }}
                closable
              />
            ))}
            {validationMsgs.warnings.map((w, i) => (
              <Alert
                key={`warn-${i}`}
                type="warning"
                showIcon
                message={w}
                style={{ marginBottom: 8 }}
                closable
              />
            ))}
          </>
        )}

        <Form form={form} layout="vertical" initialValues={{ contactPerson: currentUser.name, applicantOrg: currentUser.org }}>
          <Tabs
            items={[
              {
                key: 'basic',
                label: '基本信息',
                children: (
                  <>
                    {/* 基本信息 */}
                    <Card title="一、申报基本信息" size="small" style={{ marginBottom: 16 }}>
                      <Row gutter={16}>
                        <Col span={12}>
                          <Form.Item label="申报旅行社" name="applicantOrg" rules={[{ required: true, message: '请输入' }]}>
                            <Input disabled placeholder="自动带入" />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item label="联系人" name="contactPerson" rules={[{ required: true, message: '请输入联系人' }]}>
                            <Input />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item label="联系电话" name="contactPhone" rules={[{ required: true, message: '请输入联系电话' }]}>
                            <Input />
                          </Form.Item>
                        </Col>
                      </Row>
                    </Card>

                    {/* 奖励类别专属字段 */}
                    <Card title="二、申报信息" size="small" style={{ marginBottom: 16 }}>
                      <CategoryFields category={activeCategory} form={form} />
                    </Card>

                    {/* 团队/行程信息 */}
                    {needTeamInfo && (
                      <Card title="三、团队与行程信息" size="small" style={{ marginBottom: 16 }}>
                        <Row gutter={16}>
                          <Col span={8}>
                            <Form.Item
                              label={
                                <span>
                                  派团单号{' '}
                                  <Tooltip title="贵州文化和旅游市场监管执法平台输出的电子行程单派团单号">
                                    <InfoCircleOutlined />
                                  </Tooltip>
                                </span>
                              }
                              name="dispatchNo"
                              rules={[{ required: true, message: '请输入派团单号' }]}
                            >
                              <Input placeholder="如：GZ20260610001" />
                            </Form.Item>
                          </Col>
                          {activeCategory === 'team_reception' && (
                            <Col span={8}>
                              <Form.Item
                                label="目标协议书编号"
                                name="targetAgreementNo"
                                rules={[{ required: true, message: '请输入目标协议书编号' }]}
                              >
                                <Input placeholder="如：XY-2026-001" />
                              </Form.Item>
                            </Col>
                          )}
                        </Row>
                      </Card>
                    )}
                  </>
                ),
              },

              // 团组成员 Tab
              needTouristList || needScenicInfo || needAccommodationInfo || needGuideDriver
                ? {
                    key: 'members',
                    label: '团组成员',
                    children: (
                      <>
                        {/* 游客名单 */}
                        {needTouristList && (
                          <Card
                            title="游客名单"
                            size="small"
                            style={{ marginBottom: 16 }}
                            extra={
                              <Button type="primary" ghost icon={<PlusOutlined />} onClick={addTourist} size="small">
                                添加游客
                              </Button>
                            }
                          >
                            <Alert
                              type="info"
                              showIcon
                              message="游客名单字段说明"
                              description="根据政策附件2要求，游客名单须包含：姓名、证件类型、证件号、国籍/地区、客源地、入住/退房时间、进入景区时间。"
                              style={{ marginBottom: 12 }}
                            />
                            <Table
                              dataSource={tourists}
                              columns={touristCols}
                              rowKey="key"
                              pagination={false}
                              size="small"
                              locale={{ emptyText: '请添加游客名单' }}
                              scroll={{ x: 1100 }}
                            />
                          </Card>
                        )}

                        {/* 景区信息 */}
                        {needScenicInfo && (
                          <Card
                            title={`参观景区信息（至少 ${POLICY_CONSTANTS.minScenicCount} 个 4A+ 景区）`}
                            size="small"
                            style={{ marginBottom: 16 }}
                            extra={
                              <Button type="primary" ghost icon={<PlusOutlined />} onClick={addScenic} size="small">
                                添加景区
                              </Button>
                            }
                          >
                            <Alert
                              type="warning"
                              showIcon
                              message={`政策要求：至少 ${POLICY_CONSTANTS.minScenicCount} 个 4A（含）以上景区`}
                              description="需提供加盖景区公章或景区销售部门公章的旅客名单（含进入景区时间）。"
                              style={{ marginBottom: 12 }}
                            />
                            <Table
                              dataSource={scenics}
                              columns={scenicCols}
                              rowKey="key"
                              pagination={false}
                              size="small"
                              locale={{ emptyText: '请添加景区信息' }}
                            />
                            {scenics.length < POLICY_CONSTANTS.minScenicCount && scenics.length > 0 && (
                              <div style={{ marginTop: 8, color: '#fa541c', fontSize: 12 }}>
                                <ExclamationCircleOutlined /> 还需添加 {POLICY_CONSTANTS.minScenicCount - scenics.length} 个景区
                              </div>
                            )}
                          </Card>
                        )}

                        {/* 住宿信息 */}
                        {needAccommodationInfo && (
                          <Card
                            title="住宿信息"
                            size="small"
                            style={{ marginBottom: 16 }}
                            extra={
                              <Button type="primary" ghost icon={<PlusOutlined />} onClick={addAccommodation} size="small">
                                添加住宿
                              </Button>
                            }
                          >
                            <Alert
                              type="info"
                              showIcon
                              message="住宿情况证明"
                              description="需提供加盖酒店销售部门或前台公章的旅客名单（含入住/退房时间）。"
                              style={{ marginBottom: 12 }}
                            />
                            <Table
                              dataSource={accommodations}
                              columns={accommodationCols}
                              rowKey="key"
                              pagination={false}
                              size="small"
                              locale={{ emptyText: '请添加住宿信息' }}
                            />
                          </Card>
                        )}

                        {/* 导游/司机信息 */}
                        {needGuideDriver && (
                          <Card
                            title="导游/司机信息（接待计划书含本人签名）"
                            size="small"
                            style={{ marginBottom: 16 }}
                            extra={
                              <Space>
                                <Button type="primary" ghost icon={<PlusOutlined />} onClick={() => addGuideDriver('guide')} size="small">
                                  添加导游
                                </Button>
                                <Button type="primary" ghost icon={<PlusOutlined />} onClick={() => addGuideDriver('driver')} size="small">
                                  添加司机
                                </Button>
                              </Space>
                            }
                          >
                            <Alert
                              type="info"
                              showIcon
                              message="接待计划书要求"
                              description="政策附件2-1-②：团组接待计划书原件须含接团导游、司机的本人签名。"
                              style={{ marginBottom: 12 }}
                            />
                            <Table
                              dataSource={guideDrivers}
                              columns={guideDriverCols}
                              rowKey="key"
                              pagination={false}
                              size="small"
                              locale={{ emptyText: '请添加导游/司机信息' }}
                            />
                          </Card>
                        )}
                      </>
                    ),
                  }
                : null,

              // 前置审核 Tab（文旅宣传类专用）
              isCultureCategory
                ? {
                    key: 'precheck',
                    label: <span>前置审核 <Tag color="magenta" style={{ marginLeft: 4 }}>必填</Tag></span>,
                    children: (
                      <Card title="前置审核信息" size="small" style={{ marginBottom: 16 }}>
                        <Alert
                          type="warning"
                          showIcon
                          message="前置审核要求（政策第十二条）"
                          description="文旅宣传交流奖励所有奖项均需遵循前置审核原则。申请企业应在活动开始前向省文化和旅游厅提交详细的活动方案、预算、预期目标等材料进行审核，审核通过后方可实施。活动结束后，企业应根据审核要求提交完整的活动报告、活动效果及证明材料。"
                          style={{ marginBottom: 16 }}
                        />
                        <Row gutter={16}>
                          <Col span={6}>
                            <Form.Item label="报备函编号">
                              <Input
                                value={preCheck.applicationNo || ''}
                                onChange={(e) => setPreCheck({ ...preCheck, applicationNo: e.target.value })}
                                placeholder="如：YC-202611-001"
                              />
                            </Form.Item>
                          </Col>
                          <Col span={6}>
                            <Form.Item label="报备日期">
                              <DatePicker
                                style={{ width: '100%' }}
                                value={preCheck.applyDate ? dayjs(preCheck.applyDate) : undefined}
                                onChange={(d) => setPreCheck({ ...preCheck, applyDate: d ? d.format('YYYY-MM-DD') : undefined })}
                              />
                            </Form.Item>
                          </Col>
                          <Col span={6}>
                            <Form.Item label="省文旅厅批复日期">
                              <DatePicker
                                style={{ width: '100%' }}
                                value={preCheck.approvedDate ? dayjs(preCheck.approvedDate) : undefined}
                                onChange={(d) => setPreCheck({ ...preCheck, approvedDate: d ? d.format('YYYY-MM-DD') : undefined })}
                              />
                            </Form.Item>
                          </Col>
                          <Col span={6}>
                            <Form.Item label="批复函编号">
                              <Input
                                value={preCheck.approvalNo || ''}
                                onChange={(e) => setPreCheck({ ...preCheck, approvalNo: e.target.value })}
                                placeholder="如：SW-F-2026-045"
                              />
                            </Form.Item>
                          </Col>
                        </Row>

                        <Divider orientationMargin={0} style={{ fontSize: 13 }}>
                          活动前材料（提交方案/预算/预期目标）
                        </Divider>
                        <Space direction="vertical" style={{ width: '100%' }}>
                          {[
                            { field: 'activityPlanUids' as const, label: '活动方案' },
                            { field: 'budgetUids' as const, label: '预算' },
                            { field: 'expectedGoalUids' as const, label: '预期目标' },
                          ].map((item) => (
                            <div key={item.field}>
                              <Space align="center" style={{ marginBottom: 4 }}>
                                <Text strong>{item.label}：</Text>
                                <Upload {...uploadByGroup('pre_check', item.label)}>
                                  <Button size="small" icon={<UploadOutlined />}>上传</Button>
                                </Upload>
                                <Text type="secondary" style={{ fontSize: 12 }}>活动开始前提交</Text>
                                {getAttachmentsByGroup('pre_check', item.label).length > 0 && (
                                  <Tag color="green" style={{ marginLeft: 4 }}>{getAttachmentsByGroup('pre_check', item.label).length} 个文件</Tag>
                                )}
                              </Space>
                              {getAttachmentsByGroup('pre_check', item.label).map((a) => (
                                <Space key={a.uid} style={{ fontSize: 12, marginLeft: 16, marginBottom: 2 }}>
                                  <Text style={{ fontSize: 12 }} ellipsis>{a.name}</Text>
                                  <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => removeAttachment(a.uid)} />
                                </Space>
                              ))}
                            </div>
                          ))}
                        </Space>

                        <Divider orientationMargin={0} style={{ fontSize: 13 }}>
                          活动后材料（提交报告/效果证明）
                        </Divider>
                        <Space direction="vertical" style={{ width: '100%' }}>
                          {[
                            { field: 'reportUids' as const, label: '活动报告' },
                            { field: 'effectUids' as const, label: '活动效果及证明材料' },
                          ].map((item) => (
                            <div key={item.field}>
                              <Space align="center" style={{ marginBottom: 4 }}>
                                <Text strong>{item.label}：</Text>
                                <Upload {...uploadByGroup('pre_check', item.label)}>
                                  <Button size="small" icon={<UploadOutlined />}>上传</Button>
                                </Upload>
                                <Text type="secondary" style={{ fontSize: 12 }}>活动结束后提交</Text>
                                {getAttachmentsByGroup('pre_check', item.label).length > 0 && (
                                  <Tag color="green" style={{ marginLeft: 4 }}>{getAttachmentsByGroup('pre_check', item.label).length} 个文件</Tag>
                                )}
                              </Space>
                              {getAttachmentsByGroup('pre_check', item.label).map((a) => (
                                <Space key={a.uid} style={{ fontSize: 12, marginLeft: 16, marginBottom: 2 }}>
                                  <Text style={{ fontSize: 12 }} ellipsis>{a.name}</Text>
                                  <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => removeAttachment(a.uid)} />
                                </Space>
                              ))}
                            </div>
                          ))}
                        </Space>

                        {getAttachmentsByGroup('pre_check').length > 0 && (
                          <div style={{ marginTop: 12 }}>
                            <Text strong>已上传前置审核材料汇总：</Text>
                            {renderAttachmentList('pre_check')}
                          </div>
                        )}
                      </Card>
                    ),
                  }
                : null,

              // 申报材料 Tab
              {
                key: 'materials',
                label: <span>申报材料 <Tag color="red" style={{ marginLeft: 4 }}>{materials.filter(m => m.required).length}项必传</Tag></span>,
                children: (
                  <>
                    {/* 基础材料 */}
                    <Card
                      title={
                        <Space>
                          <span>一、基础材料</span>
                          <Tag color="red">每次申报必传</Tag>
                        </Space>
                      }
                      size="small"
                      style={{ marginBottom: 16 }}
                    >
                      <Alert
                        type="info"
                        showIcon
                        message="基础材料说明（政策附件2）"
                        description={
                          <div>
                            <div>1. 营业执照、旅行社业务经营许可证、法定代表人身份证可在企业资质档案中调用；</div>
                            <div>2. 完税凭证和"信用中国"查询截图需每次申报当日上传（实时性要求）；</div>
                            <div>
                              3. 信用中国查询网址：
                              <a href={POLICY_CONSTANTS.creditChinaUrl} target="_blank" rel="noreferrer">
                                <LinkOutlined /> {POLICY_CONSTANTS.creditChinaUrl}
                              </a>
                            </div>
                          </div>
                        }
                        style={{ marginBottom: 16 }}
                      />

                      <Row gutter={16} style={{ marginBottom: 12 }}>
                        <Col span={8}>
                          <Card size="small" title="企业营业执照" extra={enterpriseProfile.businessLicense ? <Tag color="green">已存档</Tag> : <Tag color="orange">未存档</Tag>}>
                            {enterpriseProfile.businessLicense ? (
                              <Space direction="vertical">
                                <Text>{enterpriseProfile.businessLicense.name}</Text>
                                <Button type="link" size="small">调用档案</Button>
                              </Space>
                            ) : (
                              <Space direction="vertical" style={{ width: '100%' }}>
                                <Upload {...uploadByGroup('base', '企业营业执照')}>
                                  <Button size="small" icon={<UploadOutlined />}>上传营业执照</Button>
                                </Upload>
                                {getAttachmentsByGroup('base', '企业营业执照').map((a) => (
                                  <Space key={a.uid} style={{ fontSize: 12 }}>
                                    <Text style={{ fontSize: 12 }} ellipsis>{a.name}</Text>
                                    <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => removeAttachment(a.uid)} />
                                  </Space>
                                ))}
                              </Space>
                            )}
                          </Card>
                        </Col>
                        <Col span={8}>
                          <Card size="small" title="旅行社业务经营许可证" extra={enterpriseProfile.travelLicense ? <Tag color="green">已存档</Tag> : <Tag color="orange">未存档</Tag>}>
                            {enterpriseProfile.travelLicense ? (
                              <Space direction="vertical">
                                <Text>{enterpriseProfile.travelLicense.name}</Text>
                                <Button type="link" size="small">调用档案</Button>
                              </Space>
                            ) : (
                              <Space direction="vertical" style={{ width: '100%' }}>
                                <Upload {...uploadByGroup('base', '旅行社业务经营许可证')}>
                                  <Button size="small" icon={<UploadOutlined />}>上传许可证</Button>
                                </Upload>
                                {getAttachmentsByGroup('base', '旅行社业务经营许可证').map((a) => (
                                  <Space key={a.uid} style={{ fontSize: 12 }}>
                                    <Text style={{ fontSize: 12 }} ellipsis>{a.name}</Text>
                                    <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => removeAttachment(a.uid)} />
                                  </Space>
                                ))}
                              </Space>
                            )}
                          </Card>
                        </Col>
                        <Col span={8}>
                          <Card size="small" title="法定代表人身份证" extra={enterpriseProfile.legalRepId ? <Tag color="green">已存档</Tag> : <Tag color="orange">未存档</Tag>}>
                            {enterpriseProfile.legalRepId ? (
                              <Space direction="vertical">
                                <Text>{enterpriseProfile.legalRepId.name}</Text>
                                <Button type="link" size="small">调用档案</Button>
                              </Space>
                            ) : (
                              <Space direction="vertical" style={{ width: '100%' }}>
                                <Upload {...uploadByGroup('base', '法定代表人身份证')}>
                                  <Button size="small" icon={<UploadOutlined />}>上传身份证</Button>
                                </Upload>
                                {getAttachmentsByGroup('base', '法定代表人身份证').map((a) => (
                                  <Space key={a.uid} style={{ fontSize: 12 }}>
                                    <Text style={{ fontSize: 12 }} ellipsis>{a.name}</Text>
                                    <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => removeAttachment(a.uid)} />
                                  </Space>
                                ))}
                              </Space>
                            )}
                          </Card>
                        </Col>
                      </Row>

                      <Row gutter={16}>
                        <Col span={12}>
                          <Card size="small" title="税务部门出具的上月/季度税收完税凭证（本次申报专享）">
                            {renderUploadArea('base', '本次申报专享，需当日上传', '完税凭证')}
                          </Card>
                        </Col>
                        <Col span={12}>
                          <Card
                            size="small"
                            title={
                              <span>
                                "信用中国"网站查询截图
                                <Tooltip title="查询时点为提交资料当日">
                                  <InfoCircleOutlined style={{ marginLeft: 4 }} />
                                </Tooltip>
                              </span>
                            }
                          >
                            <Space direction="vertical" style={{ width: '100%' }}>
                              <a href={POLICY_CONSTANTS.creditChinaUrl} target="_blank" rel="noreferrer">
                                <Button type="link" size="small" icon={<LinkOutlined />}>
                                  打开信用中国查询
                                </Button>
                              </a>
                              {renderUploadArea('base', '查询时点为提交资料当日', '信用中国查询截图')}
                            </Space>
                          </Card>
                        </Col>
                      </Row>

                      {getAttachmentsByGroup('base').length > 0 && (
                        <>
                          <Divider orientationMargin={0} style={{ fontSize: 13, marginTop: 16 }}>
                            已上传基础材料（{getAttachmentsByGroup('base').length} 个）
                          </Divider>
                          {renderAttachmentList('base')}
                        </>
                      )}
                    </Card>

                    {/* 佐证材料（按类别显示） */}
                    {isTeamOrSpecial && (
                      <>
                        {/* 组团情况 */}
                        <Card title="二、组团情况" size="small" style={{ marginBottom: 16 }}>
                          <Alert
                            type="info"
                            showIcon
                            message="组团情况材料"
                            description="提供以下材料之一：（a）组团旅游企业与申报奖励单位的合同复印件并加盖申请奖励单位公章；（b）组团旅游企业与申报奖励单位认可的接待计划（邮件、社交软件截图或传真等）并加盖申请奖励单位公章。"
                            style={{ marginBottom: 12 }}
                          />
                          {renderUploadArea('group_org', '支持 PDF/JPG/PNG/XLSX，≤ 20MB', '组团情况')}
                        </Card>

                        {/* 接待情况 */}
                        <Card title="三、接待情况" size="small" style={{ marginBottom: 16 }}>
                          <Alert
                            type="info"
                            showIcon
                            message="接待情况材料"
                            description={
                              <ul style={{ margin: 0, paddingLeft: 16 }}>
                                <li>团组接待计划书原件（含接团导游、司机本人签名，加盖申报单位公章）</li>
                                <li>贵州文旅监管执法平台输出的电子行程单（含派团单号、游客名单）</li>
                                <li>旅行社责任险证明复印件（加盖公章）</li>
                              </ul>
                            }
                            style={{ marginBottom: 12 }}
                          />
                          {renderUploadArea('reception', '接待计划书、电子行程单、责任险证明', '接待情况')}
                        </Card>

                        {/* 住宿情况 */}
                        <Card title="四、住宿情况证明" size="small" style={{ marginBottom: 16 }}>
                          <Alert
                            type="info"
                            showIcon
                            message="住宿情况证明"
                            description="申请奖励团组的旅客名单（包含旅客姓名、客源地、证件号、入住/退房时间等信息）加盖酒店销售部门或前台公章。"
                            style={{ marginBottom: 12 }}
                          />
                          {renderUploadArea('accommodation', '含酒店公章', '住宿情况证明')}
                        </Card>

                        {/* 参观景区情况 */}
                        <Card title={`五、参观景区情况证明（至少 ${POLICY_CONSTANTS.minScenicCount} 个 4A+）`} size="small" style={{ marginBottom: 16 }}>
                          <Alert
                            type="info"
                            showIcon
                            message="参观景区情况证明"
                            description={`按照申报奖励要求的参观景区数量提供至少 ${POLICY_CONSTANTS.minScenicCount} 个 4A（含）以上景区相关证明。申请奖励团组的旅客名单（包含旅客姓名、证件号、客源地、进入景区的时间等信息）加盖景区公章或景区销售部门公章。`}
                            style={{ marginBottom: 12 }}
                          />
                          {renderUploadArea('scenic', '含景区公章', '参观景区情况证明')}
                        </Card>

                        {/* 专项奖励其他资料 */}
                        {SpecialExtraMaterialsList[activeCategory] && (
                          <Card title="六、专项奖励其他资料" size="small" style={{ marginBottom: 16 }}>
                            <Alert
                              type="warning"
                              showIcon
                              message="专项奖励其他资料要求"
                              description={
                                <ul style={{ margin: 0, paddingLeft: 16 }}>
                                  {SpecialExtraMaterialsList[activeCategory].map((m, i) => (
                                    <li key={i}>
                                      {m.name}
                                      {m.desc && <span style={{ color: '#999' }}>（{m.desc}）</span>}
                                    </li>
                                  ))}
                                </ul>
                              }
                              style={{ marginBottom: 12 }}
                            />
                            {renderUploadArea('special_extra', '专项奖励相关证明材料', '专项奖励其他资料')}
                          </Card>
                        )}
                      </>
                    )}

                    {/* 文旅宣传类材料 */}
                    {isCultureCategory && (
                      <>
                        <Card title="二、文旅宣传基础材料" size="small" style={{ marginBottom: 16 }}>
                          <Alert
                            type="info"
                            showIcon
                            message="基础材料"
                            description="企业参展、组织推介活动、请进来活动、举办国外青少年人文交流或其他人文交流活动的申请报备函、省文化和旅游厅的批复函件或省文化和旅游厅下发的通知复印件。"
                            style={{ marginBottom: 12 }}
                          />
                          {renderUploadArea('culture_base', '申请报备函、省文旅厅批复函/通知', '文旅宣传基础材料')}
                        </Card>

                        <Card title="三、文旅宣传其他材料" size="small" style={{ marginBottom: 16 }}>
                          <Alert
                            type="info"
                            showIcon
                            message="其他材料要求"
                            description={
                              <ul style={{ margin: 0, paddingLeft: 16 }}>
                                {CultureMaterialsList[activeCategory]?.map((m, i) => (
                                  <li key={i}>
                                    {m.name}
                                    {m.desc && <span style={{ color: '#999' }}>（{m.desc}）</span>}
                                  </li>
                                ))}
                              </ul>
                            }
                            style={{ marginBottom: 12 }}
                          />
                          {renderUploadArea('culture_extra', '文旅宣传相关证明材料', '文旅宣传其他材料')}
                        </Card>
                      </>
                    )}

                    {/* 材料清单核对（可折叠，默认隐藏） */}
                    <Collapse
                      style={{ marginTop: 16 }}
                      items={[
                        {
                          key: 'material_check',
                          label: (
                            <Space>
                              <FileTextOutlined />
                              <span>查看材料清单核对表</span>
                              <Tag color="red">{materials.filter((m) => m.required).length}项必传</Tag>
                              <Tag>{materials.length}项总计</Tag>
                            </Space>
                          ),
                          children: (
                            <Table
                              dataSource={materials}
                              rowKey={(r) => r.group + r.name}
                              size="small"
                              pagination={false}
                              columns={[
                                {
                                  title: '分组',
                                  dataIndex: 'group',
                                  width: 150,
                                  render: (g: string) => <Tag>{g}</Tag>,
                                },
                                {
                                  title: '材料名称',
                                  dataIndex: 'name',
                                },
                                {
                                  title: '必传',
                                  dataIndex: 'required',
                                  width: 80,
                                  render: (r: boolean) => (r ? <Tag color="red">必传</Tag> : <Tag>选传</Tag>),
                                },
                                {
                                  title: '说明',
                                  dataIndex: 'desc',
                                  width: 220,
                                  render: (d?: string) => (d ? <Text type="secondary" style={{ fontSize: 12 }}>{d}</Text> : '-'),
                                },
                              ]}
                            />
                          ),
                        },
                      ]}
                    />
                  </>
                ),
              },
            ].filter(Boolean) as any}
          />

          {/* 金额预览 */}
          <Card size="small" style={{ marginBottom: 16, background: '#f6ffed', border: '1px solid #b7eb8f' }}>
            <Row gutter={16} align="middle">
              <Col flex="auto">
                <Space>
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  <Text strong>系统预估奖励金额：</Text>
                  <Text strong style={{ color: '#fa541c', fontSize: 20 }}>
                    {formatMoney(previewAmount)}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    （最终金额以审核核定为准）
                  </Text>
                </Space>
              </Col>
            </Row>
          </Card>

          <Divider />
          <div style={{ textAlign: 'center', paddingBottom: 16 }}>
            <Space size="middle">
              <Button onClick={() => navigate(-1)}>取消</Button>
              <Button icon={<SaveOutlined />} onClick={() => handleSave(false)} loading={submitting}>
                保存草稿
              </Button>
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={() => handleSave(true)}
                loading={submitting}
                disabled={validationMsgs.errors.length > 0}
              >
                {RequiresPreCheck.includes(activeCategory) ? '提交前置审核' : '提交申报'}
              </Button>
            </Space>
          </div>
        </Form>
      </PageContainer>
    </>
  )
}

// 类别专属字段
function CategoryFields({ category }: { category: RewardCategory; form: any }) {
  switch (category) {
    case 'team_reception':
      return (
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="团队/项目名称" name="teamName" rules={[{ required: true }]}>
              <Input placeholder="如：韩国首尔-贵州5日游" />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item
              label="团队总人数"
              name="teamSize"
              rules={[
                { required: true },
                {
                  validator: (_, v) =>
                    v >= 10 ? Promise.resolve() : Promise.reject(new Error('团队接待奖励须10人（含）以上')),
                },
              ]}
            >
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item label="入境游客数" name="inboundTourists" rules={[{ required: true }]}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item label="停留天数" name="stayDays" rules={[{ required: true }]}>
              <InputNumber min={1} style={{ width: '100%' }} addonAfter="天" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="行程开始日期" name="travelStart" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="行程结束日期" name="travelEnd" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="行程概述" name="travelDesc">
              <TextArea rows={2} placeholder="简要描述行程路线、主要景点" />
            </Form.Item>
          </Col>
        </Row>
      )
    case 'special_aviation':
      return (
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="团队/项目名称" name="teamName" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="航空旅游类型" name="aviationType" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: 'hk_macao_direct', label: '港澳台直航' },
                  { value: 'foreign_direct', label: '外国直航' },
                ]}
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="航班号" name="flightNo" rules={[{ required: true }]}>
              <Input placeholder="如：CA8234" />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item label="总人数" name="teamSize" rules={[{ required: true }]}>
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item label="入境游客数" name="inboundTourists" rules={[{ required: true }]}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item label="停留天数" name="stayDays" rules={[{ required: true }]}>
              <InputNumber min={2} style={{ width: '100%' }} addonAfter="天" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="出发日期" name="travelStart" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="返程日期" name="travelEnd" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
      )
    case 'special_multi_stop':
      return (
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="团队/项目名称" name="teamName" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item label="总人数" name="teamSize" rules={[{ required: true }]}>
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item label="入境游客数" name="inboundTourists" rules={[{ required: true }]}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="行程开始日期" name="travelStart" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="行程结束日期" name="travelEnd" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="中转地/行程概述" name="travelDesc">
              <TextArea rows={2} placeholder="如：经香港中转，游览黄果树、荔波小七孔" />
            </Form.Item>
          </Col>
        </Row>
      )
    case 'special_240_visa_free':
      return (
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="团队/项目名称" name="teamName" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item label="总人数" name="teamSize" rules={[{ required: true }]}>
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item label="停留天数" name="stayDays" rules={[{ required: true }]}>
              <InputNumber min={1} style={{ width: '100%' }} addonAfter="天" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="行程开始日期" name="travelStart" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="行程结束日期" name="travelEnd" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="行程概述" name="travelDesc">
              <TextArea rows={2} placeholder="游览景区、住宿情况" />
            </Form.Item>
          </Col>
        </Row>
      )
    case 'special_high_speed_rail':
      return (
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="团队/项目名称" name="teamName" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="车次号" name="trainNo" rules={[{ required: true }]}>
              <Input placeholder="如：G822" />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item label="总人数" name="teamSize" rules={[{ required: true }]}>
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item label="入境游客数" name="inboundTourists" rules={[{ required: true }]}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item label="停留天数" name="stayDays" rules={[{ required: true }]}>
              <InputNumber min={2} style={{ width: '100%' }} addonAfter="天" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="出发日期" name="travelStart" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="返程日期" name="travelEnd" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
      )
    case 'special_large_overseas_team':
      return (
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="团队/项目名称" name="teamName" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item label="总人数" name="teamSize" rules={[{ required: true }]}>
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item label="入境游客数" name="inboundTourists" rules={[{ required: true }]}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item label="停留天数" name="stayDays" rules={[{ required: true }]}>
              <InputNumber min={2} style={{ width: '100%' }} addonAfter="天" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="行程开始日期" name="travelStart" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="行程结束日期" name="travelEnd" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
      )
    case 'culture_exhibition':
      return (
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="展会/活动名称" name="meetingName" rules={[{ required: true }]}>
              <Input placeholder="如：2026东京国际旅游展" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="举办地点" name="meetingLocation" rules={[{ required: true }]}>
              <Input placeholder="如：日本东京" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="参与人数" name="meetingParticipants" rules={[{ required: true }]}>
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="活动开始日期" name="travelStart" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="活动结束日期" name="travelEnd" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="参展费用（元）" name="advertisingAmount" tooltip="展位费、交通、住宿等实际费用">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item label="活动成效" name="effectDesc">
              <TextArea rows={2} placeholder="播放量、参展人次、合作意向等" />
            </Form.Item>
          </Col>
        </Row>
      )
    case 'culture_invite_in':
      return (
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="活动名称" name="meetingName" rules={[{ required: true }]}>
              <Input placeholder="如：日本旅行商贵州踩线活动" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="活动地点" name="meetingLocation" rules={[{ required: true }]}>
              <Input placeholder="如：贵州" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              label="邀请人数"
              name="meetingParticipants"
              rules={[
                { required: true },
                {
                  validator: (_, v) =>
                    v <= 30 ? Promise.resolve() : Promise.reject(new Error('邀请人数不超过30人（含）')),
                },
              ]}
            >
              <InputNumber min={1} max={30} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="停留天数" name="stayDays" rules={[{ required: true }]}>
              <InputNumber min={1} style={{ width: '100%' }} addonAfter="天" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              label="活动次数"
              name="activityTimes"
              rules={[{ required: true }]}
              tooltip={`每年不超过${POLICY_CONSTANTS.inviteInMaxPerYear}次`}
            >
              <InputNumber min={1} max={POLICY_CONSTANTS.inviteInMaxPerYear} style={{ width: '100%' }} addonAfter="次" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="活动开始日期" name="travelStart" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="活动结束日期" name="travelEnd" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
      )
    case 'culture_advertising':
      return (
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="宣传类型" name="advertisingType" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: 'ad_placement', label: '投放广告' },
                  { value: 'website_promo', label: '网站宣传' },
                ]}
              />
            </Form.Item>
          </Col>
          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.advertisingType !== cur.advertisingType}>
            {({ getFieldValue }) => {
              const adType = getFieldValue('advertisingType')
              if (adType === 'ad_placement') {
                return (
                  <>
                    <Col span={8}>
                      <Form.Item
                        label="广告投放金额（元）"
                        name="advertisingAmount"
                        rules={[{ required: true }]}
                        tooltip="按广告总费用30%奖励，单次最高5万元"
                      >
                        <InputNumber min={0} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="投放开始日期" name="travelStart" rules={[{ required: true }]}>
                        <DatePicker style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="投放结束日期" name="travelEnd" rules={[{ required: true }]}>
                        <DatePicker style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item label="投放内容概述" name="contentDesc">
                        <TextArea rows={2} placeholder="宣传内容、覆盖区域等" />
                      </Form.Item>
                    </Col>
                  </>
                )
              }
              if (adType === 'website_promo') {
                return (
                  <>
                    <Col span={16}>
                      <Form.Item label="网站网址" name="websiteUrl" rules={[{ required: true }]}>
                        <Input placeholder="https://" />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="获客订单数" name="orderCount" rules={[{ required: true }]} tooltip="按100元/人奖励">
                        <InputNumber min={0} style={{ width: '100%' }} addonAfter="人" />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item label="网站/产品截图说明" name="contentDesc">
                        <TextArea rows={2} placeholder="网站截图、国外在线旅游预订平台贵州产品线路截图等" />
                      </Form.Item>
                    </Col>
                  </>
                )
              }
              return null
            }}
          </Form.Item>
        </Row>
      )
    case 'culture_exchange':
      return (
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="交流类型" name="exchangeType" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: 'youth_exchange', label: '青少年人文交流计划' },
                  { value: 'humanity_activity', label: '人文交流活动' },
                ]}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="活动名称" name="meetingName" rules={[{ required: true }]}>
              <Input placeholder="如：中日青少年人文交流活动" />
            </Form.Item>
          </Col>
          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.exchangeType !== cur.exchangeType}>
            {({ getFieldValue }) => {
              const exType = getFieldValue('exchangeType')
              if (exType === 'youth_exchange') {
                return (
                  <>
                    <Col span={6}>
                      <Form.Item label="参与人数" name="meetingParticipants" rules={[{ required: true }]}>
                        <InputNumber min={1} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item label="停留天数" name="stayDays" rules={[{ required: true }]}>
                        <InputNumber min={1} style={{ width: '100%' }} addonAfter="天" />
                      </Form.Item>
                    </Col>
                  </>
                )
              }
              if (exType === 'humanity_activity') {
                return (
                  <Col span={12}>
                    <Form.Item
                      label="场地租赁费用（元）"
                      name="advertisingAmount"
                      rules={[{ required: true }]}
                      tooltip="按场地费30%奖励，单次最高2万元"
                    >
                      <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                )
              }
              return null
            }}
          </Form.Item>
          <Col span={6}>
            <Form.Item label="活动开始日期" name="travelStart" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="活动结束日期" name="travelEnd" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              label="活动次数"
              name="activityTimes"
              rules={[{ required: true }]}
              tooltip={`每年不超过${POLICY_CONSTANTS.exchangeMaxPerYear}次`}
            >
              <InputNumber min={1} max={POLICY_CONSTANTS.exchangeMaxPerYear} style={{ width: '100%' }} addonAfter="次" />
            </Form.Item>
          </Col>
        </Row>
      )
    default:
      return (
        <Alert
          type="warning"
          message="该奖励类别为历史数据，不再支持新建"
          description="请通过新建申报选择有效的奖励类别。"
          showIcon
        />
      )
  }
}

// 用于检查材料是否存在的辅助
export function checkMaterialExists(materials: MaterialItem[], attachments: Attachment[]): Record<string, boolean> {
  const result: Record<string, boolean> = {}
  materials.forEach((m) => {
    // 简化判断：检查是否有任意附件
    result[m.name] = attachments.length > 0
  })
  return result
}
