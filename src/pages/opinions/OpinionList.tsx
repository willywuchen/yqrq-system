import { useMemo, useState } from 'react'
import {
  Table,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Space,
  Tag,
  App,
  Tooltip,
  Modal,
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
  WarningOutlined,
  UploadOutlined,
  FileExcelOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import { richTextToPlain } from '../../components/RichTextEditor'
import { useStore } from '../../store'
import { OPINION_WARNING_REPORT_ENABLED } from '../../config/featureFlags'
import {
  OpinionDataSourceLabels,
  OpinionDataSourceColors,
  OpinionRiskLevelLabels,
  OpinionRiskLevelColors,
  OpinionHandleStatusLabels,
  OpinionHandleStatusColors,
  TourismCategoryLabels,
  GUIZHOU_CITIES,
  type PublicOpinion,
  type OpinionDataSource,
  type OpinionRiskLevel,
  type OpinionHandleStatus,
  type TourismCategory,
  type OpinionHandleLog,
} from '../../types'
import { genId, nowStr } from '../../utils'

const { RangePicker } = DatePicker

// ===== Excel 导入 =====
// 导入模板列名（与手动新增表单字段一致）
const IMPORT_HEADERS = [
  '舆情标题', '作者', '作者定位地', '关键字', '来源网站', '原地址', '舆情内容',
  '发布时间', '数据来源', '旅游类别', '风险等级', '涉及主体', '备注',
] as const

// 枚举字段：允许填中文标签或英文标识
const DATA_SOURCE_MAP: Record<string, OpinionDataSource> = Object.fromEntries(
  Object.entries(OpinionDataSourceLabels).map(([k, v]) => [v, k as OpinionDataSource]),
)
const TOURISM_CATEGORY_MAP: Record<string, TourismCategory> = Object.fromEntries(
  Object.entries(TourismCategoryLabels).map(([k, v]) => [v, k as TourismCategory]),
)
const RISK_LEVEL_MAP: Record<string, OpinionRiskLevel> = Object.fromEntries(
  Object.entries(OpinionRiskLevelLabels).map(([k, v]) => [v, k as OpinionRiskLevel]),
)

// 多值字段分隔（关键字/涉及主体）：竖线、顿号、逗号
function splitMultiValue(v: string): string[] {
  return String(v || '')
    .split(/[|｜、,，]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

// 枚举字段解析：兼容填中文标签或英文标识
function resolveEnum<T extends string>(labelMap: Record<string, T>, enumKeys: string[], value: string): T | undefined {
  if (labelMap[value]) return labelMap[value]
  if (enumKeys.includes(value)) return value as T
  return undefined
}

interface ImportParseResult {
  fileName: string
  valid: PublicOpinion[]
  errors: string[]
}

export default function OpinionList() {
  const navigate = useNavigate()
  const { modal, message } = App.useApp()
  const { publicOpinions, deleteOpinion, addOpinions, currentUser } = useStore()
  const [form] = Form.useForm()

  // 查询条件
  const [keyword, setKeyword] = useState('')
  const [authorLocation, setAuthorLocation] = useState<string | undefined>()
  const [dataSource, setDataSource] = useState<OpinionDataSource | undefined>()
  const [tourismCategory, setTourismCategory] = useState<TourismCategory | undefined>()
  const [riskLevel, setRiskLevel] = useState<OpinionRiskLevel | undefined>()
  const [handleStatus, setHandleStatus] = useState<OpinionHandleStatus | undefined>()
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null)

  // 导入弹窗
  const [importOpen, setImportOpen] = useState(false)
  const [importResult, setImportResult] = useState<ImportParseResult | null>(null)
  const [importing, setImporting] = useState(false)

  const filtered = useMemo(() => {
    return publicOpinions.filter((o) => {
      if (keyword) {
        const kw = keyword.toLowerCase()
        const inTitle = o.title.toLowerCase().includes(kw)
        const inId = o.id.toLowerCase().includes(kw)
        const inAuthor = o.author.toLowerCase().includes(kw)
        // 舆情内容为富文本时按纯文本检索
        const inContent = richTextToPlain(o.content).toLowerCase().includes(kw)
        const inUrl = o.sourceUrl.toLowerCase().includes(kw)
        if (!inTitle && !inId && !inAuthor && !inContent && !inUrl) return false
      }
      if (authorLocation && o.authorLocation !== authorLocation) return false
      if (dataSource && o.dataSource !== dataSource) return false
      if (tourismCategory && o.tourismCategory !== tourismCategory) return false
      if (riskLevel && o.riskLevel !== riskLevel) return false
      if (handleStatus && o.handleStatus !== handleStatus) return false
      if (dateRange && dateRange[0] && dateRange[1]) {
        const t = dayjs(o.publishTime)
        if (t.isBefore(dateRange[0], 'day') || t.isAfter(dateRange[1], 'day')) return false
      }
      return true
    })
  }, [
    publicOpinions,
    keyword,
    authorLocation,
    dataSource,
    tourismCategory,
    riskLevel,
    handleStatus,
    dateRange,
  ])

  const handleReset = () => {
    setKeyword('')
    setAuthorLocation(undefined)
    setDataSource(undefined)
    setTourismCategory(undefined)
    setRiskLevel(undefined)
    setHandleStatus(undefined)
    setDateRange(null)
    form.resetFields()
  }

  const handleDelete = (record: PublicOpinion) => {
    modal.confirm({
      title: '确认删除',
      content: `确定要删除舆情「${record.title}」（${record.id}）吗？此操作不可恢复。`,
      okType: 'danger',
      okText: '删除',
      cancelText: '取消',
      onOk: () => {
        deleteOpinion(record.id)
        message.success('已删除舆情记录')
      },
    })
  }

  const handleExport = () => {
    if (filtered.length === 0) {
      message.warning('当前没有可导出的数据')
      return
    }
    const headers = [
      '舆情编号',
      '标题',
      '作者',
      '作者定位地',
      '关键字',
      '来源网站',
      '原地址',
      '数据来源',
      '旅游类别',
      '风险等级',
      '处置状态',
      '发布时间',
      '创建人',
      '创建时间',
    ]
    const rows = filtered.map((o) => [
      o.id,
      o.title,
      o.author,
      o.authorLocation,
      (o.keywords || []).join('|'),
      o.sourceWebsite,
      o.sourceUrl,
      OpinionDataSourceLabels[o.dataSource],
      TourismCategoryLabels[o.tourismCategory],
      OpinionRiskLevelLabels[o.riskLevel],
      OpinionHandleStatusLabels[o.handleStatus],
      o.publishTime,
      o.createdBy,
      o.createTime,
    ])
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `舆情台账_${dayjs().format('YYYYMMDD_HHmmss')}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    message.success(`已导出 ${filtered.length} 条记录`)
  }

  // ===== Excel 导入 =====

  // 下载导入模板（字段与手动新增一致，附填写说明和示例行）
  const handleDownloadTemplate = () => {
    const exampleRow = [
      '贵阳某景区排队时间过长引发游客不满',
      '微博用户 贵州小芳',
      '贵阳市',
      '排队|景区|拥堵',
      '微博',
      'https://weibo.com/example/123',
      '周末前往某景区游玩，排队近3小时，现场无有效疏导，游客体验较差。',
      '2026-08-20 10:30:00',
      '手动录入',
      '景区',
      '中',
      '某景区',
      '示例数据，导入前请删除本行',
    ]
    const ws = XLSX.utils.aoa_to_sheet([['序号', ...IMPORT_HEADERS], [1, ...exampleRow]])
    ws['!cols'] = [{ wch: 6 }, ...IMPORT_HEADERS.map(() => ({ wch: 22 }))]
    const guideRows = [
      ['字段', '是否必填', '填写说明'],
      ['舆情标题', '是', '不超过100字符'],
      ['作者', '是', '发布该条舆情的用户/账号，不超过50字符'],
      ['作者定位地', '是', `仅限贵州省市州：${GUIZHOU_CITIES.join('、')}`],
      ['关键字', '是', '多个关键字用"|"分隔，如：排队|景区|拥堵'],
      ['来源网站', '是', '如：微博、小红书、抖音、马蜂窝、携程等'],
      ['原地址', '是', '舆情原文地址，需以 http:// 或 https:// 开头'],
      ['舆情内容', '是', '舆情正文，纯文本，不超过5000字符'],
      ['发布时间', '是', '格式：2026-08-20 10:30:00'],
      ['数据来源', '是', `可选值：${Object.values(OpinionDataSourceLabels).join('、')}`],
      ['旅游类别', '是', `可选值：${Object.values(TourismCategoryLabels).join('、')}`],
      ['风险等级', '否', `可选值：${Object.values(OpinionRiskLevelLabels).join('、')}，默认为"中"`],
      ['涉及主体', '否', '涉及的旅行社/景区/酒店/导游等，多个用"|"分隔'],
      ['备注', '否', '备注信息，不超过500字符'],
      ['', '', ''],
      ['说明', '', '1. 请勿修改第一行表头；示例数据行请删除后再填写。'],
      ['', '', '2. 每行一条舆情，导入后处置状态默认为"待处理"。'],
    ]
    const guideWs = XLSX.utils.aoa_to_sheet(guideRows)
    guideWs['!cols'] = [{ wch: 14 }, { wch: 10 }, { wch: 80 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '舆情导入模板')
    XLSX.utils.book_append_sheet(wb, guideWs, '填写说明')
    XLSX.writeFile(wb, `舆情导入模板_${dayjs().format('YYYYMMDD')}.xlsx`)
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
        const valid: PublicOpinion[] = []
        const errors: string[] = []
        const now = nowStr()

        rows.forEach((raw, idx) => {
          const rowNo = idx + 2 // 表头占第 1 行
          const get = (header: string) => String(raw[header] ?? '').trim()

          // 整行为空时跳过
          if (IMPORT_HEADERS.every((h) => !get(h))) return

          const problems: string[] = []
          const title = get('舆情标题')
          const author = get('作者')
          const authorLocation = get('作者定位地')
          const sourceWebsite = get('来源网站')
          const sourceUrl = get('原地址')
          const content = get('舆情内容')
          const keywords = splitMultiValue(get('关键字'))

          if (!title) problems.push('舆情标题不能为空')
          else if (title.length > 100) problems.push('舆情标题超过100字符')
          if (!author) problems.push('作者不能为空')
          if (!authorLocation) problems.push('作者定位地不能为空')
          else if (!GUIZHOU_CITIES.includes(authorLocation)) problems.push(`作者定位地须为贵州省市州（${GUIZHOU_CITIES.join('、')}）`)
          if (!keywords.length) problems.push('关键字不能为空')
          if (!sourceWebsite) problems.push('来源网站不能为空')
          if (!sourceUrl) problems.push('原地址不能为空')
          else if (!/^https?:\/\/.+/.test(sourceUrl)) problems.push('原地址须以 http:// 或 https:// 开头')
          if (!content) problems.push('舆情内容不能为空')
          else if (content.length > 5000) problems.push('舆情内容超过5000字符')

          // 发布时间：兼容 Excel 日期单元格与文本格式
          const rawTime = raw['发布时间']
          const timeDayjs = rawTime instanceof Date ? dayjs(rawTime) : dayjs(String(rawTime || '').trim())
          if (!rawTime) problems.push('发布时间不能为空')
          else if (!timeDayjs.isValid()) problems.push('发布时间格式不正确，应如 2026-08-20 10:30:00')

          // 枚举字段映射
          const rawDataSource = get('数据来源')
          const dataSourceVal = resolveEnum(DATA_SOURCE_MAP, Object.keys(OpinionDataSourceLabels), rawDataSource)
          if (!rawDataSource) problems.push('数据来源不能为空')
          else if (!dataSourceVal) problems.push(`数据来源须为：${Object.values(OpinionDataSourceLabels).join('、')}`)

          const rawCategory = get('旅游类别')
          const categoryVal = resolveEnum(TOURISM_CATEGORY_MAP, Object.keys(TourismCategoryLabels), rawCategory)
          if (!rawCategory) problems.push('旅游类别不能为空')
          else if (!categoryVal) problems.push(`旅游类别须为：${Object.values(TourismCategoryLabels).join('、')}`)

          const rawRisk = get('风险等级')
          const riskVal = resolveEnum(RISK_LEVEL_MAP, Object.keys(OpinionRiskLevelLabels), rawRisk)
          if (rawRisk && !riskVal) problems.push(`风险等级须为：${Object.values(OpinionRiskLevelLabels).join('、')}`)

          const remark = get('备注')
          if (remark.length > 500) problems.push('备注超过500字符')

          if (problems.length) {
            errors.push(`第 ${rowNo} 行：${problems.join('；')}`)
            return
          }

          const id = `PO-${dayjs().format('YYYYMMDD')}-${genId('').slice(-4)}`
          const log: OpinionHandleLog = {
            id: genId('LOG'),
            operator: currentUser.name,
            action: 'create',
            toStatus: 'pending',
            opinion: 'Excel 批量导入舆情',
            time: now,
          }
          valid.push({
            id,
            title,
            author,
            authorLocation,
            keywords,
            sourceWebsite,
            sourceUrl,
            content,
            publishTime: timeDayjs.format('YYYY-MM-DD HH:mm:ss'),
            dataSource: dataSourceVal!,
            tourismCategory: categoryVal!,
            sentiment: 'neutral',
            riskLevel: riskVal || 'medium',
            handleStatus: 'pending',
            involvedSubjects: splitMultiValue(get('涉及主体')),
            attachments: [],
            remark: remark || undefined,
            createdBy: currentUser.name,
            createTime: now,
            updateTime: now,
            handleLogs: [log],
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
      } catch (err) {
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
      addOpinions(importResult.valid)
      const skipped = importResult.errors.length
      message.success(`成功导入 ${importResult.valid.length} 条舆情${skipped ? `，跳过 ${skipped} 条错误数据` : ''}`)
      setImportOpen(false)
      setImportResult(null)
    } finally {
      setImporting(false)
    }
  }

  const columns = [
    {
      title: '舆情编号',
      dataIndex: 'id',
      width: 170,
      fixed: 'left' as const,
      render: (id: string) => (
        <a onClick={() => navigate(`/public-opinion/${id}`)}>{id}</a>
      ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      width: 240,
      ellipsis: true,
      render: (v: string) => v || '-',
    },
    {
      title: '作者',
      dataIndex: 'author',
      width: 160,
      ellipsis: true,
      render: (v: string) => v || '-',
    },
    {
      title: '定位地',
      dataIndex: 'authorLocation',
      width: 130,
      render: (v: string) => <Tag>{v || '-'}</Tag>,
    },
    {
      title: '数据来源',
      dataIndex: 'dataSource',
      width: 110,
      render: (v: OpinionDataSource) => (
        <Tag color={OpinionDataSourceColors[v]}>{OpinionDataSourceLabels[v]}</Tag>
      ),
    },
    {
      title: '旅游类别',
      dataIndex: 'tourismCategory',
      width: 110,
      render: (c: TourismCategory) => TourismCategoryLabels[c] || '-',
    },
    {
      title: '风险',
      dataIndex: 'riskLevel',
      width: 90,
      render: (r: OpinionRiskLevel) => (
        <Tag color={OpinionRiskLevelColors[r]}>{OpinionRiskLevelLabels[r]}</Tag>
      ),
    },
    {
      title: '处置',
      dataIndex: 'handleStatus',
      width: 100,
      render: (s: OpinionHandleStatus) => (
        <Tag color={OpinionHandleStatusColors[s]}>{OpinionHandleStatusLabels[s]}</Tag>
      ),
    },
    {
      title: '发布时间',
      dataIndex: 'publishTime',
      width: 150,
      render: (v: string) => v || '-',
    },
    {
      title: '操作',
      width: 220,
      fixed: 'right' as const,
      render: (_: unknown, r: PublicOpinion) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/public-opinion/${r.id}`)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/public-opinion/${r.id}/edit`)}
          >
            编辑
          </Button>
          <Tooltip title="删除">
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(r)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="舆情台账"
        breadcrumb={[{ title: '首页', path: '/' }, { title: '舆情管理' }, { title: '舆情台账' }]}
        extra={
          <Space>
            <Button icon={<DashboardOutlined />} onClick={() => navigate('/public-opinion/dashboard')}>
              舆情分析
            </Button>
            {/* 风险预警入口随菜单开关隐藏，恢复时改 featureFlags 即可 */}
            {OPINION_WARNING_REPORT_ENABLED && (
              <Button icon={<WarningOutlined />} onClick={() => navigate('/public-opinion/warnings')}>
                风险预警
              </Button>
            )}
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/public-opinion/new')}>
              新增舆情
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
            <Form.Item name="keyword">
              <Input
                placeholder="标题/作者/内容/URL"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                style={{ width: 240 }}
                prefix={<SearchOutlined />}
                allowClear
              />
            </Form.Item>
            <Form.Item name="authorLocation">
              <Select
                placeholder="作者定位地"
                value={authorLocation}
                onChange={setAuthorLocation}
                allowClear
                style={{ width: 180 }}
                options={GUIZHOU_CITIES.map((c) => ({ value: c, label: c }))}
              />
            </Form.Item>
            <Form.Item name="dataSource">
              <Select
                placeholder="数据来源"
                value={dataSource}
                onChange={setDataSource}
                allowClear
                style={{ width: 140 }}
                options={Object.entries(OpinionDataSourceLabels).map(([k, v]) => ({ value: k, label: v }))}
              />
            </Form.Item>
            <Form.Item name="tourismCategory">
              <Select
                placeholder="旅游类别"
                value={tourismCategory}
                onChange={setTourismCategory}
                allowClear
                style={{ width: 150 }}
                options={Object.entries(TourismCategoryLabels).map(([k, v]) => ({ value: k, label: v }))}
              />
            </Form.Item>
            <Form.Item name="riskLevel">
              <Select
                placeholder="风险等级"
                value={riskLevel}
                onChange={setRiskLevel}
                allowClear
                style={{ width: 120 }}
                options={Object.entries(OpinionRiskLevelLabels).map(([k, v]) => ({ value: k, label: v }))}
              />
            </Form.Item>
            <Form.Item name="handleStatus">
              <Select
                placeholder="处置状态"
                value={handleStatus}
                onChange={setHandleStatus}
                allowClear
                style={{ width: 120 }}
                options={Object.entries(OpinionHandleStatusLabels).map(([k, v]) => ({ value: k, label: v }))}
              />
            </Form.Item>
            <Form.Item name="dateRange">
              <RangePicker
                value={dateRange as any}
                onChange={(v) => setDateRange(v as any)}
                placeholder={['发布开始', '发布结束']}
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
          scroll={{ x: 1540 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条记录`,
          }}
        />
      </PageContainer>

      {/* 导入舆情弹窗：先下载模板，再上传解析校验，确认后批量入库 */}
      <Modal
        title="导入舆情"
        open={importOpen}
        width={720}
        okText={importResult && importResult.valid.length > 0 ? `确认导入 ${importResult.valid.length} 条` : '开始导入'}
        okButtonProps={{ disabled: !importResult || importResult.valid.length === 0, loading: importing }}
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
            <Button type="link" size="small" icon={<DownloadOutlined />} onClick={handleDownloadTemplate} style={{ padding: 0 }}>
              下载导入模板
            </Button>
          </div>
          <div>
            第二步：按模板填写舆情数据后上传，系统将自动校验；
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
                description={importResult.errors.length > 0 ? '错误数据将被跳过，可修正后重新上传导入。' : '点击"确认导入"完成批量入库。'}
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
                    { title: '舆情标题', dataIndex: 'title', ellipsis: true },
                    { title: '作者', dataIndex: 'author', width: 130, ellipsis: true },
                    { title: '定位地', dataIndex: 'authorLocation', width: 100 },
                    { title: '发布时间', dataIndex: 'publishTime', width: 150 },
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
