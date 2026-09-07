import { useMemo, useState } from 'react'
import {
  Table,
  Form,
  Input,
  Select,
  DatePicker,
  Cascader,
  Button,
  Space,
  Tag,
  Modal,
  App,
  Alert,
  Upload,
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  DeleteOutlined,
  EyeOutlined,
  EditOutlined,
  DownloadOutlined,
  DashboardOutlined,
  UploadOutlined,
  FileExcelOutlined,
  FileZipOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import { useStore } from '../../store'
import {
  ComplaintStatusLabels,
  ComplaintStatusColors,
  ComplaintSourceLabels,
  TourismCategoryLabels,
  GUIZHOU_CITIES,
  GUIZHOU_DISTRICTS,
  GUIZHOU_REGION_OPTIONS,
  type ComplaintStatus,
  type ComplaintSource,
  type TourismCategory,
  type Complaint,
  AttachmentKindLabels,
  detectAttachmentKind,
  getComplaintRegions,
  complaintRegionText,
} from '../../types'
import { nowStr, formatFileSize } from '../../utils'
import { getAttachmentFile } from '../../utils/attachmentFiles'

const { RangePicker } = DatePicker

// ===== Excel 导入 =====
// 导入模板列名（与手动新增表单字段一致；区域级联拆分为 省/市州/区县 三列填写）
const IMPORT_HEADERS = [
  '投诉标题', '所属省份', '所属市州', '区/县', '投诉来源', '投诉类别', '投诉时间',
  '投诉人姓名', '投诉人性别', '投诉人电话', '投诉人邮箱', '投诉人地址', '合同日期',
  '被投诉人名称', '被投诉人电话', '被投诉人地址', '投诉内容', '投诉请求',
  '投诉办理人员意见', '负责人审核意见', '是否转办', '转办部门',
  '回复时间', '回复内容', '备注', '办理状态',
] as const

// 枚举字段：允许填中文标签或英文标识
const COMPLAINT_SOURCE_MAP: Record<string, ComplaintSource> = Object.fromEntries(
  Object.entries(ComplaintSourceLabels).map(([k, v]) => [v, k as ComplaintSource]),
)
const COMPLAINT_CATEGORY_MAP: Record<string, TourismCategory> = Object.fromEntries(
  Object.entries(TourismCategoryLabels).map(([k, v]) => [v, k as TourismCategory]),
)
const COMPLAINT_STATUS_MAP: Record<string, ComplaintStatus> = Object.fromEntries(
  Object.entries(ComplaintStatusLabels).map(([k, v]) => [v, k as ComplaintStatus]),
)
const GENDER_MAP: Record<string, 'male' | 'female' | 'unknown'> = {
  '男': 'male',
  '女': 'female',
  '未知': 'unknown',
}
// 是否转办
const TRANSFER_MAP: Record<string, boolean> = {
  '是': true,
  '否': false,
}

// 枚举字段解析：兼容填中文标签或英文标识
function resolveEnum<T extends string>(
  labelMap: Record<string, T>,
  enumKeys: string[],
  value: string,
): T | undefined {
  if (labelMap[value]) return labelMap[value]
  if (enumKeys.includes(value)) return value as T
  return undefined
}

// 日期字段解析：兼容 Excel 日期单元格与文本格式（如 2026-08-20、2026/8/20）
function toDayjs(raw: unknown): dayjs.Dayjs | null {
  if (raw instanceof Date) return dayjs(raw)
  const s = String(raw ?? '').trim()
  if (!s) return null
  return dayjs(s)
}

interface ImportParseResult {
  fileName: string
  valid: Complaint[]
  errors: string[]
}

export default function ComplaintList() {
  const navigate = useNavigate()
  const { modal, message } = App.useApp()
  const { complaints, deleteComplaint, importComplaints, updateComplaint, currentUser } = useStore()
  const [form] = Form.useForm()

  // 查询条件
  const [titleKeyword, setTitleKeyword] = useState('')
  const [region, setRegion] = useState<string[]>([])
  const [complaintSource, setComplaintSource] = useState<ComplaintSource | undefined>()
  const [tourismCategory, setTourismCategory] = useState<TourismCategory | undefined>()
  const [status, setStatus] = useState<ComplaintStatus | undefined>()
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null)
  const [complainantKeyword, setComplainantKeyword] = useState('')
  const [respondentKeyword, setRespondentKeyword] = useState('')

  // 导入弹窗：解析结果与导入中状态
  const [importOpen, setImportOpen] = useState(false)
  const [importResult, setImportResult] = useState<ImportParseResult | null>(null)
  const [importing, setImporting] = useState(false)

  const filtered = useMemo(() => {
    return complaints.filter((c) => {
      if (titleKeyword) {
        const kw = titleKeyword.toLowerCase()
        if (
          !c.title.toLowerCase().includes(kw) &&
          !c.id.toLowerCase().includes(kw)
        )
          return false
      }
      // 按区域级联筛选：投诉可能关联多个区域，任一区域命中即通过（选中到哪一级按哪一级过滤）
      if (region.length > 0) {
        const matched = getComplaintRegions(c).some((r) => {
          if (region[0] && r.province !== region[0]) return false
          if (region[1] && r.city !== region[1]) return false
          if (region[2] && r.district !== region[2]) return false
          return true
        })
        if (!matched) return false
      }
      if (complaintSource && c.complaintSource !== complaintSource) return false
      if (tourismCategory && c.tourismCategory !== tourismCategory) return false
      if (status && c.status !== status) return false
      if (dateRange && dateRange[0] && dateRange[1]) {
        const t = dayjs(c.complaintTime)
        if (t.isBefore(dateRange[0], 'day') || t.isAfter(dateRange[1], 'day')) return false
      }
      if (complainantKeyword) {
        const kw = complainantKeyword.toLowerCase()
        if (
          !c.complainant.name.toLowerCase().includes(kw) &&
          !(c.complainant.phone || '').toLowerCase().includes(kw)
        )
          return false
      }
      if (respondentKeyword) {
        const kw = respondentKeyword.toLowerCase()
        if (!c.respondent.name.toLowerCase().includes(kw)) return false
      }
      return true
    })
  }, [
    complaints,
    titleKeyword,
    region,
    complaintSource,
    tourismCategory,
    status,
    dateRange,
    complainantKeyword,
    respondentKeyword,
  ])

  const handleReset = () => {
    setTitleKeyword('')
    setRegion([])
    setComplaintSource(undefined)
    setTourismCategory(undefined)
    setStatus(undefined)
    setDateRange(null)
    setComplainantKeyword('')
    setRespondentKeyword('')
    form.resetFields()
  }

  const handleDelete = (record: Complaint) => {
    modal.confirm({
      title: '确认删除',
      content: `确定要删除投诉记录「${record.title}」（${record.id}）吗？此操作不可恢复。`,
      okType: 'danger',
      okText: '删除',
      cancelText: '取消',
      onOk: () => {
        deleteComplaint(record.id)
        message.success('已删除投诉记录')
      },
    })
  }

  const handleExport = () => {
    if (filtered.length === 0) {
      message.warning('当前没有可导出的数据')
      return
    }
    const headers = [
      '投诉编号',
      '标题',
      '省',
      '市',
      '区县',
      '投诉来源',
      '投诉类别',
      '投诉时间',
      '投诉人',
      '投诉人电话',
      '被投诉人',
      '被投诉人电话',
      '状态',
      '回复时间',
      '创建人',
      '创建时间',
    ]
    const rows = filtered.map((c) => [
      c.id,
      c.title,
      c.province,
      c.city,
      c.district || '',
      ComplaintSourceLabels[c.complaintSource],
      TourismCategoryLabels[c.tourismCategory],
      c.complaintTime,
      c.complainant.name,
      c.complainant.phone || '',
      c.respondent.name,
      c.respondent.phone || '',
      ComplaintStatusLabels[c.status],
      c.replyTime || '',
      c.createdBy,
      c.createTime,
    ])
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    // 添加 BOM 以便 Excel 正确识别 UTF-8 编码
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `投诉台账_${dayjs().format('YYYYMMDD_HHmmss')}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    message.success(`已导出 ${filtered.length} 条记录`)
  }

  // ===== 打包移交 =====
  // 文件夹名不能包含的字符
  const sanitizeFileName = (name: string) => name.replace(/[\\/:*?"<>|\r\n]+/g, '').trim()

  const GENDER_LABELS: Record<string, string> = { male: '男', female: '女', unknown: '未知' }

  // 生成投诉信息 Excel（字段/内容两列布局 + 附件清单工作表），返回二进制内容
  const buildComplaintWorkbook = (c: Complaint) => {
    const rows: [string, string][] = [
      ['投诉编号', c.id],
      ['投诉标题', c.title],
      ['所属区域', complaintRegionText(c)],
      ['投诉来源', ComplaintSourceLabels[c.complaintSource]],
      ['投诉类别', TourismCategoryLabels[c.tourismCategory] || ''],
      ['投诉时间', c.complaintTime],
      ['办理状态', ComplaintStatusLabels[c.status]],
      ['投诉人姓名', c.complainant.name],
      ['投诉人性别', c.complainant.gender ? GENDER_LABELS[c.complainant.gender] : ''],
      ['投诉人电话', c.complainant.phone || ''],
      ['投诉人邮箱', c.complainant.email || ''],
      ['投诉人地址', c.complainant.address || ''],
      ['合同日期', c.complainant.contractDate || ''],
      ['被投诉人名称', c.respondent.name],
      ['被投诉人电话', c.respondent.phone || ''],
      ['被投诉人地址', c.respondent.address || ''],
      ['投诉内容', c.content],
      ['投诉请求', c.requests || ''],
      ['投诉办理人员意见', c.handlerOpinion || ''],
      ['负责人审核意见', c.reviewerOpinion || ''],
      ['是否转办', c.isTransferred ? '是' : '否'],
      ['转办部门', c.isTransferred ? c.transferDepartment || '' : ''],
      ['移交部门', c.handoverDepartment || ''],
      ['回复时间', c.replyTime || ''],
      ['回复内容', c.replyContent || ''],
      ['备注', c.remark || ''],
      ['创建人', c.createdBy],
      ['创建时间', c.createTime],
      ['更新时间', c.updateTime],
    ]
    const ws = XLSX.utils.aoa_to_sheet([['字段', '内容'], ...rows])
    ws['!cols'] = [{ wch: 18 }, { wch: 100 }]

    const attRows: (string | number)[][] = [
      ['序号', '附件名称', '附件类型', '大小', '上传时间'],
      ...c.attachments.map((a, i) => {
        const kind = a.kind || detectAttachmentKind(a.name, a.type)
        return [i + 1, a.name, AttachmentKindLabels[kind], formatFileSize(a.size), a.uploadTime]
      }),
    ]
    const attWs = XLSX.utils.aoa_to_sheet(attRows)
    attWs['!cols'] = [{ wch: 6 }, { wch: 40 }, { wch: 10 }, { wch: 12 }, { wch: 22 }]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '投诉信息')
    XLSX.utils.book_append_sheet(wb, attWs, '附件清单')
    return XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  }

  // 将单条投诉打包为压缩包（含投诉信息 Excel 与全部附件）并触发下载
  const packageComplaint = async (record: Complaint) => {
    const folderName = sanitizeFileName(`${record.id}_${record.title}`).slice(0, 80) || record.id
    const zip = new JSZip()
    const root = zip.folder(folderName)
    if (!root) throw new Error('创建压缩文件夹失败')

    // 1. 投诉信息 Excel
    root.file(`${record.id}_投诉信息表.xlsx`, buildComplaintWorkbook(record))

    // 2. 附件：按 文件/视频/音频 分子文件夹存放
    const attRoot = root.folder('附件')
    if (!attRoot) throw new Error('创建附件文件夹失败')
    if (record.attachments.length === 0) {
      attRoot.file('说明.txt', '该投诉暂无登记附件。')
    }
    for (const a of record.attachments) {
      const kind = a.kind || detectAttachmentKind(a.name, a.type)
      const sub = attRoot.folder(AttachmentKindLabels[kind])
      if (!sub) continue
      const raw = getAttachmentFile(a.uid)
      if (raw) {
        sub.file(a.name, raw)
      } else {
        // 演示/历史数据未保存原始文件内容，写入占位说明，便于接收方核对附件清单
        sub.file(
          `${a.name}.txt`,
          `【占位说明】附件「${a.name}」\n类型：${AttachmentKindLabels[kind]}\n大小：${formatFileSize(a.size)}\n上传时间：${a.uploadTime}\n\n该附件为系统演示/历史数据，未保存原始文件内容，请与台账登记人核实后补充原件。`,
        )
      }
    }

    // 3. 生成并下载压缩包
    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${folderName}.zip`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    // 4. 记录打包操作日志
    const now = nowStr()
    updateComplaint(record.id, {
      updateTime: now,
      operationLogs: [
        ...record.operationLogs,
        {
          id: `${Date.now()}`,
          operator: currentUser.name,
          action: 'export',
          summary: '打包投诉材料（信息表 + 附件）用于移交',
          time: now,
        },
      ],
    })
  }

  const handlePackage = (record: Complaint) => {
    modal.confirm({
      title: '确认打包',
      content: `将把投诉「${record.title}」（${record.id}）的全部信息打包为一个压缩文件夹（含投诉信息 Excel 表和所有附件）。是否继续？`,
      okText: '打包',
      cancelText: '取消',
      onOk: async () => {
        try {
          await packageComplaint(record)
          message.success(`投诉「${record.id}」已打包并开始下载`)
        } catch {
          message.error('打包失败，请重试')
        }
      },
    })
  }

  // ===== Excel 导入 =====

  // 下载导入模板（字段与手动新增一致，附填写说明和示例行）
  const handleDownloadTemplate = () => {
    const exampleRow = [
      '贵州某旅行社擅自增加购物点引发游客投诉',
      '贵州省',
      '贵阳市',
      '南明区',
      '12345热线',
      '旅行社',
      '2026-08-20',
      '张三',
      '男',
      '13800001111',
      'zhangsan@example.com',
      '贵阳市南明区某小区',
      '2026-08-15',
      '某某国际旅行社',
      '0851-88887777',
      '贵阳市云岩区某大厦',
      '行程中被擅自增加两个购物点，停留时间过长，与合同约定不符。',
      '要求退还购物相关费用并道歉',
      '已与投诉人沟通解释，正在协调旅行社处理。',
      '同意办理意见，请跟进回复。',
      '否',
      '',
      '2026-08-22',
      '已协调旅行社退还相关费用，投诉人表示满意。',
      '示例数据，导入前请删除本行',
      '已办结',
    ]
    const ws = XLSX.utils.aoa_to_sheet([['序号', ...IMPORT_HEADERS], [1, ...exampleRow]])
    ws['!cols'] = [{ wch: 6 }, ...IMPORT_HEADERS.map(() => ({ wch: 20 }))]
    const guideRows = [
      ['字段', '是否必填', '填写说明'],
      ['投诉标题', '是', '不超过100字符'],
      ['所属省份', '是', '固定填：贵州省（留空时默认贵州省）'],
      ['所属市州', '是', `可选值：${GUIZHOU_CITIES.join('、')}`],
      ['区/县', '否', `须为所选市州下辖区县，如：${GUIZHOU_DISTRICTS[GUIZHOU_CITIES[0]].slice(0, 3).join('、')}等`],
      ['投诉来源', '是', `可选值：${Object.values(ComplaintSourceLabels).join('、')}`],
      ['投诉类别', '是', `可选值：${Object.values(TourismCategoryLabels).join('、')}`],
      ['投诉时间', '是', '格式：2026-08-20'],
      ['投诉人姓名', '是', '不超过50字符'],
      ['投诉人性别', '否', '可选值：男、女、未知'],
      ['投诉人电话', '否', '联系电话'],
      ['投诉人邮箱', '否', '电子邮箱'],
      ['投诉人地址', '否', '联系地址'],
      ['合同日期', '否', '格式：2026-08-15'],
      ['被投诉人名称', '是', '旅行社/景区/酒店等被投诉主体名称'],
      ['被投诉人电话', '否', '联系电话'],
      ['被投诉人地址', '否', '地址'],
      ['投诉内容', '是', '投诉正文，不超过2000字符'],
      ['投诉请求', '否', '投诉人诉求'],
      ['投诉办理人员意见', '否', '投诉办理人员意见'],
      ['负责人审核意见', '否', '负责人审核意见'],
      ['是否转办', '否', '可选值：是、否，默认为"否"'],
      ['转办部门', '否', '是否转办为"是"时必填，如：贵阳市文化和旅游局'],
      ['回复时间', '否', '格式：2026-08-22'],
      ['回复内容', '否', '回复投诉人的内容'],
      ['备注', '否', '备注信息'],
      ['办理状态', '否', `可选值：${Object.values(ComplaintStatusLabels).join('、')}，默认为"待受理"`],
      ['', '', ''],
      ['说明', '', '1. 请勿修改第一行表头；示例数据行请删除后再填写。'],
      ['', '', '2. 每行一条投诉，区域按"省份/市州/区县"三列填写，区县可不填。'],
      ['', '', '3. 附件暂不支持批量导入，导入后可在详情页补充上传。'],
    ]
    const guideWs = XLSX.utils.aoa_to_sheet(guideRows)
    guideWs['!cols'] = [{ wch: 18 }, { wch: 10 }, { wch: 80 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '投诉导入模板')
    XLSX.utils.book_append_sheet(wb, guideWs, '填写说明')
    XLSX.writeFile(wb, `投诉导入模板_${dayjs().format('YYYYMMDD')}.xlsx`)
  }

  // 解析并校验上传的 Excel 文件
  const parseImportFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array', cellDates: true })
        const ws = wb.Sheets[wb.SheetNames[0]]
        if (!ws) {
          message.error('Excel 中没有工作表，请使用下载的导入模板填写')
          return
        }
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
        const valid: Complaint[] = []
        const errors: string[] = []
        const now = nowStr()
        const batchNo = `IMP-${dayjs().format('YYYYMMDD-HHmmss')}`
        const usedIds = new Set(complaints.map((c) => c.id))

        rows.forEach((raw, idx) => {
          const rowNo = idx + 2 // 表头占第 1 行
          const get = (header: string) => String(raw[header] ?? '').trim()

          // 整行为空时跳过
          if (IMPORT_HEADERS.every((h) => !get(h))) return

          const problems: string[] = []
          const title = get('投诉标题')
          const complainantName = get('投诉人姓名')
          const respondentName = get('被投诉人名称')
          const content = get('投诉内容')

          if (!title) problems.push('投诉标题不能为空')
          else if (title.length > 100) problems.push('投诉标题超过100字符')
          if (!complainantName) problems.push('投诉人姓名不能为空')
          if (!respondentName) problems.push('被投诉人名称不能为空')
          if (!content) problems.push('投诉内容不能为空')
          else if (content.length > 2000) problems.push('投诉内容超过2000字符')

          // 区域：省份默认贵州省，市州必填，区县须属于该市州
          const rawProvince = get('所属省份')
          const province = rawProvince || '贵州省'
          if (rawProvince && rawProvince !== '贵州省') problems.push('所属省份目前仅支持贵州省')
          const city = get('所属市州')
          if (!city) problems.push('所属市州不能为空')
          else if (!GUIZHOU_CITIES.includes(city)) {
            problems.push(`所属市州须为：${GUIZHOU_CITIES.join('、')}`)
          }
          const district = get('区/县')
          if (city && GUIZHOU_CITIES.includes(city) && district) {
            const districts = GUIZHOU_DISTRICTS[city] || []
            if (!districts.includes(district)) problems.push(`区/县须为${city}下辖区县`)
          }

          // 枚举字段映射
          const rawMethod = get('投诉来源')
          const methodVal = resolveEnum(COMPLAINT_SOURCE_MAP, Object.keys(ComplaintSourceLabels), rawMethod)
          if (!rawMethod) problems.push('投诉来源不能为空')
          else if (!methodVal) problems.push(`投诉来源须为：${Object.values(ComplaintSourceLabels).join('、')}`)

          const rawCategory = get('投诉类别')
          const categoryVal = resolveEnum(COMPLAINT_CATEGORY_MAP, Object.keys(TourismCategoryLabels), rawCategory)
          if (!rawCategory) problems.push('投诉类别不能为空')
          else if (!categoryVal) problems.push(`投诉类别须为：${Object.values(TourismCategoryLabels).join('、')}`)

          // 日期字段：投诉时间必填，合同日期/回复时间可选
          const complaintDayjs = toDayjs(raw['投诉时间'])
          if (!get('投诉时间')) problems.push('投诉时间不能为空')
          else if (!complaintDayjs?.isValid()) problems.push('投诉时间格式不正确，应如 2026-08-20')
          const contractDayjs = toDayjs(raw['合同日期'])
          if (get('合同日期') && !contractDayjs?.isValid()) problems.push('合同日期格式不正确，应如 2026-08-15')
          const replyDayjs = toDayjs(raw['回复时间'])
          if (get('回复时间') && !replyDayjs?.isValid()) problems.push('回复时间格式不正确，应如 2026-08-22')

          // 性别/状态枚举（可选字段）
          const rawGender = get('投诉人性别')
          const genderVal = rawGender ? GENDER_MAP[rawGender] : undefined
          if (rawGender && !genderVal) problems.push('投诉人性别须为：男、女、未知')

          const rawStatus = get('办理状态')
          const statusVal = rawStatus
            ? resolveEnum(COMPLAINT_STATUS_MAP, Object.keys(ComplaintStatusLabels), rawStatus)
            : undefined
          if (rawStatus && !statusVal) {
            problems.push(`办理状态须为：${Object.values(ComplaintStatusLabels).join('、')}`)
          }

          // 是否转办：空值默认"否"；转办时转办部门必填，不转办时忽略该列
          const rawTransfer = get('是否转办')
          const transferVal = rawTransfer ? TRANSFER_MAP[rawTransfer] : false
          if (rawTransfer && transferVal === undefined) {
            problems.push('是否转办须为：是、否')
          }
          const transferDepartment = get('转办部门')
          if (transferVal && !transferDepartment) {
            problems.push('是否转办为"是"时，转办部门不能为空')
          }

          if (problems.length) {
            errors.push(`第 ${rowNo} 行：${problems.join('；')}`)
            return
          }

          // 生成不重复的投诉编号：TS-YYYYMMDD-XXXX
          let id = ''
          do {
            id = `TS-${dayjs().format('YYYYMMDD')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`
          } while (usedIds.has(id))
          usedIds.add(id)

          valid.push({
            id,
            title,
            province,
            city,
            district: district || undefined,
            complaintSource: methodVal!,
            tourismCategory: categoryVal!,
            complaintTime: complaintDayjs!.format('YYYY-MM-DD'),
            status: statusVal || 'pending',
            complainant: {
              name: complainantName,
              gender: genderVal,
              phone: get('投诉人电话') || undefined,
              email: get('投诉人邮箱') || undefined,
              address: get('投诉人地址') || undefined,
              contractDate: contractDayjs?.isValid() ? contractDayjs.format('YYYY-MM-DD') : undefined,
            },
            respondent: {
              name: respondentName,
              address: get('被投诉人地址') || undefined,
              phone: get('被投诉人电话') || undefined,
            },
            content,
            requests: get('投诉请求') || undefined,
            handlerOpinion: get('投诉办理人员意见') || undefined,
            reviewerOpinion: get('负责人审核意见') || undefined,
            isTransferredToCase: false,
            isTransferred: transferVal,
            transferDepartment: transferVal ? transferDepartment : undefined,
            // 回复状态不再单独导入，随办理状态联动
            replyStatus: statusVal === 'closed' ? 'closed' : statusVal === 'replied' ? 'replied' : 'none',
            replyTime: replyDayjs?.isValid() ? replyDayjs.format('YYYY-MM-DD') : undefined,
            replyContent: get('回复内容') || undefined,
            attachments: [],
            remark: get('备注') || undefined,
            createdBy: currentUser.name,
            createTime: now,
            updateTime: now,
            operationLogs: [
              {
                id: `ol-${Date.now()}-${idx}`,
                operator: currentUser.name,
                action: 'import',
                summary: 'Excel 批量导入投诉',
                time: now,
              },
            ],
            importBatchNo: batchNo,
          })
        })

        if (rows.length === 0) {
          message.warning('未解析到数据行，请按模板填写后重新上传')
          setImportResult(null)
          return
        }
        setImportResult({ fileName: file.name, valid, errors })
        if (valid.length === 0) {
          message.error('上传文件中没有可导入的有效数据，请根据错误提示修改后重试')
        }
      } catch {
        message.error('文件解析失败，请确认使用下载的导入模板（.xlsx）填写')
      }
    }
    reader.readAsArrayBuffer(file)
    return false
  }

  // 执行导入
  const handleConfirmImport = () => {
    if (!importResult || importResult.valid.length === 0) return
    setImporting(true)
    try {
      importComplaints(importResult.valid)
      const skipped = importResult.errors.length
      message.success(
        `成功导入 ${importResult.valid.length} 条投诉${skipped ? `，跳过 ${skipped} 条错误数据` : ''}`,
      )
      setImportOpen(false)
      setImportResult(null)
    } finally {
      setImporting(false)
    }
  }

  const columns = [
    {
      title: '投诉编号',
      dataIndex: 'id',
      width: 160,
      fixed: 'left' as const,
      render: (id: string) => <a onClick={() => navigate(`/complaints/${id}`)}>{id}</a>,
    },
    {
      title: '标题',
      dataIndex: 'title',
      width: 220,
      ellipsis: true,
      render: (v: string) => v || '-',
    },
    {
      title: '区域',
      width: 200,
      ellipsis: true,
      render: (_: unknown, r: Complaint) => complaintRegionText(r) || '-',
    },
    {
      title: '投诉来源',
      dataIndex: 'complaintSource',
      width: 120,
      render: (m: ComplaintSource) => <Tag>{ComplaintSourceLabels[m]}</Tag>,
    },
    {
      title: '投诉类别',
      dataIndex: 'tourismCategory',
      width: 120,
      render: (c: TourismCategory) => TourismCategoryLabels[c] || '-',
    },
    {
      title: '投诉时间',
      dataIndex: 'complaintTime',
      width: 120,
      render: (v: string) => v || '-',
    },
    {
      title: '被投诉人',
      dataIndex: 'respondent',
      width: 180,
      ellipsis: true,
      render: (r: Complaint['respondent']) => r?.name || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (s: ComplaintStatus) => (
        <Tag color={ComplaintStatusColors[s]}>{ComplaintStatusLabels[s]}</Tag>
      ),
    },
    {
      title: '创建人',
      dataIndex: 'createdBy',
      width: 100,
      render: (v: string) => v || '-',
    },
    {
      title: '操作',
      width: 260,
      fixed: 'right' as const,
      render: (_: unknown, r: Complaint) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/complaints/${r.id}`)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/complaints/${r.id}/edit`)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            icon={<FileZipOutlined />}
            onClick={() => handlePackage(r)}
          >
            打包
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(r)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="投诉台账"
        breadcrumb={[{ title: '首页', path: '/' }, { title: '投诉台账' }]}
        extra={
          <Space>
            <Button icon={<DashboardOutlined />} onClick={() => navigate('/complaints/dashboard')}>
              数据看板
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/complaints/new')}>
              新增投诉
            </Button>
            <Button icon={<FileExcelOutlined />} onClick={() => setImportOpen(true)}>
              导入
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              导出
            </Button>
          </Space>
        }
      />
      <PageContainer>
        <div className="page-toolbar" style={{ background: '#fff', padding: '16px 24px' }}>
          <Form form={form} layout="inline" onValuesChange={() => {}}>
            <Form.Item name="title">
              <Input
                placeholder="标题/投诉编号"
                value={titleKeyword}
                onChange={(e) => setTitleKeyword(e.target.value)}
                style={{ width: 220 }}
                prefix={<SearchOutlined />}
                allowClear
              />
            </Form.Item>
            <Form.Item name="region">
              <Cascader
                placeholder="区域（省/市州/区县）"
                value={region}
                onChange={(v) => setRegion((v as string[]) || [])}
                allowClear
                changeOnSelect
                style={{ width: 220 }}
                options={GUIZHOU_REGION_OPTIONS}
              />
            </Form.Item>
            <Form.Item name="complaintSource">
              <Select
                placeholder="投诉来源"
                value={complaintSource}
                onChange={setComplaintSource}
                allowClear
                style={{ width: 150 }}
                options={Object.entries(ComplaintSourceLabels).map(([k, v]) => ({ value: k, label: v }))}
              />
            </Form.Item>
            <Form.Item name="tourismCategory">
              <Select
                placeholder="投诉类别"
                value={tourismCategory}
                onChange={setTourismCategory}
                allowClear
                style={{ width: 160 }}
                options={Object.entries(TourismCategoryLabels).map(([k, v]) => ({ value: k, label: v }))}
              />
            </Form.Item>
            <Form.Item name="status">
              <Select
                placeholder="办理状态"
                value={status}
                onChange={setStatus}
                allowClear
                style={{ width: 150 }}
                options={Object.entries(ComplaintStatusLabels).map(([k, v]) => ({ value: k, label: v }))}
              />
            </Form.Item>
            <Form.Item name="dateRange">
              <RangePicker
                value={dateRange as any}
                onChange={(v) => setDateRange(v as any)}
                placeholder={['投诉开始', '投诉结束']}
              />
            </Form.Item>
            <Form.Item name="complainant">
              <Input
                placeholder="投诉人姓名/电话"
                value={complainantKeyword}
                onChange={(e) => setComplainantKeyword(e.target.value)}
                style={{ width: 200 }}
                allowClear
              />
            </Form.Item>
            <Form.Item name="respondent">
              <Input
                placeholder="被投诉人名称"
                value={respondentKeyword}
                onChange={(e) => setRespondentKeyword(e.target.value)}
                style={{ width: 200 }}
                allowClear
              />
            </Form.Item>
            <Form.Item>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                重置
              </Button>
            </Form.Item>
          </Form>
        </div>
        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          scroll={{ x: 1700 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条记录`,
          }}
        />
      </PageContainer>

      {/* 导入投诉弹窗：先下载模板，再上传解析校验，确认后批量入库 */}
      <Modal
        title="导入投诉"
        open={importOpen}
        width={760}
        okText={
          importResult && importResult.valid.length > 0
            ? `确认导入 ${importResult.valid.length} 条`
            : '开始导入'
        }
        okButtonProps={{
          disabled: !importResult || importResult.valid.length === 0,
          loading: importing,
        }}
        cancelText="取消"
        onOk={handleConfirmImport}
        onCancel={() => {
          setImportOpen(false)
          setImportResult(null)
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            第一步：下载导入模板（Excel 格式，字段与手动新增一致），
            <Button
              type="link"
              size="small"
              icon={<DownloadOutlined />}
              onClick={handleDownloadTemplate}
              style={{ padding: 0 }}
            >
              下载导入模板
            </Button>
          </div>
          <div>
            第二步：按模板填写投诉数据后上传，系统将自动校验；
            <Upload
              accept=".xlsx,.xls"
              maxCount={1}
              showUploadList={false}
              beforeUpload={(file) => {
                setImportResult(null)
                parseImportFile(file)
                return false
              }}
            >
              <Button icon={<UploadOutlined />} style={{ marginLeft: 8 }}>
                选择 Excel 文件
              </Button>
            </Upload>
          </div>
          {importResult && (
            <>
              <Alert
                type={importResult.valid.length > 0 ? 'success' : 'error'}
                showIcon
                message={`文件「${importResult.fileName}」解析完成：可导入 ${importResult.valid.length} 条${importResult.errors.length ? `，错误 ${importResult.errors.length} 条` : ''}`}
                description={
                  importResult.errors.length > 0
                    ? '错误数据将被跳过，可修正后重新上传导入。'
                    : '点击"确认导入"完成批量入库。'
                }
              />
              {importResult.errors.length > 0 && (
                <div
                  style={{
                    maxHeight: 160,
                    overflowY: 'auto',
                    background: '#fff2f0',
                    border: '1px solid #ffccc7',
                    borderRadius: 6,
                    padding: '8px 12px',
                    fontSize: 12,
                    color: '#cf1322',
                  }}
                >
                  {importResult.errors.map((e, i) => (
                    <div key={i}>{e}</div>
                  ))}
                </div>
              )}
              {importResult.valid.length > 0 && (
                <Table
                  size="small"
                  rowKey="id"
                  dataSource={importResult.valid.slice(0, 5)}
                  pagination={false}
                  caption={`可导入数据预览（最多显示前 5 条，共 ${importResult.valid.length} 条）`}
                  columns={[
                    { title: '投诉标题', dataIndex: 'title', ellipsis: true },
                    {
                      title: '区域',
                      width: 180,
                      ellipsis: true,
                      render: (_: unknown, r: Complaint) =>
                        [r.province, r.city, r.district].filter(Boolean).join(' / '),
                    },
                    {
                      title: '投诉类别',
                      dataIndex: 'tourismCategory',
                      width: 110,
                      render: (c: TourismCategory) => TourismCategoryLabels[c] || '-',
                    },
                    {
                      title: '办理状态',
                      dataIndex: 'status',
                      width: 110,
                      render: (s: ComplaintStatus) => (
                        <Tag color={ComplaintStatusColors[s]}>{ComplaintStatusLabels[s]}</Tag>
                      ),
                    },
                  ]}
                />
              )}
            </>
          )}
        </Space>
      </Modal>
    </>
  )
}
