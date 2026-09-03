import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Card,
  Table,
  Tag,
  Space,
  Button,
  Modal,
  Form,
  Select,
  DatePicker,
  Dropdown,
  App,
  Typography,
  Popconfirm,
  Empty,
} from 'antd'
import {
  PlusOutlined,
  EyeOutlined,
  DownloadOutlined,
  DeleteOutlined,
  FileExcelOutlined,
  FileWordOutlined,
  Html5Outlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import { useStore } from '../../store'
import {
  ComplaintReportScopeLabels,
  DEFAULT_REPORT_CHAPTERS,
  GUIZHOU_CITIES,
  type ComplaintReport,
  type ComplaintReportScope,
} from '../../types'
import { genId, nowStr, buildComplaintReportSnapshot, buildReportSummary, buildReportTitle } from '../../utils'
import { buildComplaintReportHtml, exportComplaintDetailCsv as exportDetailCsv } from '../../utils/complaintReportHtml'

const { Text } = Typography

const { RangePicker } = DatePicker

// 按当前账号层级自动确定报表范围（V1.8：不再手动选择数据层级）
// 省级账号（文旅厅/系统管理员）→ 全省报表；市州级账号（市州复审员）→ 所属市州报表
function resolveReportScope(currentUser: { role: string; org?: string }): {
  scope: ComplaintReportScope
  scopeName: string
} {
  if (currentUser.role === 'review_reviewer') {
    const city = GUIZHOU_CITIES.find((c) => (currentUser.org || '').includes(c))
    return { scope: 'city', scopeName: city || GUIZHOU_CITIES[0] }
  }
  return { scope: 'province', scopeName: '全省' }
}

export default function ComplaintReportList() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const {
    complaintReports,
    complaints,
    currentUser,
    addComplaintReport,
    deleteComplaintReport,
    appendComplaintReportLog,
  } = useStore()

  const [form] = Form.useForm()
  const [genOpen, setGenOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [filters, setFilters] = useState<{ scope?: ComplaintReportScope; range?: [dayjs.Dayjs, dayjs.Dayjs] }>({})

  // 仅展示未删除报表，按生成时间倒序
  const visibleReports = complaintReports.filter((r) => !r.deleted)
  const filtered = visibleReports.filter((r) => {
    if (filters.scope && r.scopeLevel !== filters.scope) return false
    if (filters.range) {
      const t = dayjs(r.periodEnd)
      if (t.isBefore(filters.range[0].startOf('day')) || t.isAfter(filters.range[1].endOf('day'))) return false
    }
    return true
  })

  const handleGenerate = async () => {
    try {
      const values = await form.validateFields()
      const { scope, scopeName } = resolveReportScope(currentUser)
      const start = values.range[0] instanceof dayjs.Dayjs ? values.range[0] : dayjs(values.range[0])
      const end = values.range[1] instanceof dayjs.Dayjs ? values.range[1] : dayjs(values.range[1])
      const periodStart = start.format('YYYY-MM-DD')
      const periodEnd = end.format('YYYY-MM-DD')
      // 报表生成日期即操作成功生成报表的时间，不再手动选择
      const generatedAt = nowStr()

      setGenerating(true)
      // 模拟生成耗时
      await new Promise((res) => setTimeout(res, 600))

      const snapshot = buildComplaintReportSnapshot(complaints, periodStart, periodEnd, scopeName)
      // 报表模板固化：统一使用默认章节（无章节配置功能）
      const chapters = JSON.parse(JSON.stringify(DEFAULT_REPORT_CHAPTERS))
      const report: ComplaintReport = {
        id: genId('RPT'),
        title: buildReportTitle(periodStart, periodEnd, scopeName),
        periodStart,
        periodEnd,
        scopeLevel: scope,
        scopeName,
        generatedBy: currentUser.name,
        generatedAt,
        summary: buildReportSummary(snapshot, scopeName),
        hasAiInsight: false,
        status: snapshot.total === 0 ? 'empty' : 'normal',
        chapters,
        snapshot,
        trigger: 'manual',
      }
      addComplaintReport(report)
      appendComplaintReportLog({
        archiveLogId: `cral-${genId('').replace('APP', '')}-${Date.now()}`,
        reportId: report.id,
        action: 'generate',
        operator: currentUser.name,
        operatorLevel: scope,
        operatedAt: nowStr(),
        detail: '新增报表',
      })
      message.success('报表已生成')
      setGenOpen(false)
      form.resetFields()
      setGenerating(false)
      navigate(`/complaints/reports/${report.id}`)
    } catch (err) {
      setGenerating(false)
      // 校验失败
    }
  }

  const handlePreview = (report: ComplaintReport) => {
    appendComplaintReportLog({
      archiveLogId: `cral-preview-${report.id}-${Date.now()}`,
      reportId: report.id,
      action: 'preview',
      operator: currentUser.name,
      operatorLevel: report.scopeLevel,
      operatedAt: nowStr(),
      detail: '在线预览',
    })
    navigate(`/complaints/reports/${report.id}`)
  }

  const handleExportHtml = (report: ComplaintReport) => {
    const html = buildComplaintReportHtml(report)
    const newWin = window.open('', '_blank')
    if (!newWin) {
      message.error('浏览器拦截了新窗口，请允许弹出窗口后重试')
      return
    }
    newWin.document.open()
    newWin.document.write(html)
    newWin.document.close()
    newWin.document.title = report.title
    appendComplaintReportLog({
      archiveLogId: `cral-export-${report.id}-${Date.now()}`,
      reportId: report.id,
      action: 'export',
      operator: currentUser.name,
      operatorLevel: report.scopeLevel,
      operatedAt: nowStr(),
      detail: '导出 HTML',
    })
    message.success('HTML 已在新窗口打开')
  }

  const handleExportWord = (report: ComplaintReport) => {
    // MVP：用 HTML 新窗口 + 浏览器打印另存为 Word/PDF
    const html = buildComplaintReportHtml(report)
    const newWin = window.open('', '_blank')
    if (!newWin) {
      message.error('浏览器拦截了新窗口，请允许弹出窗口后重试')
      return
    }
    newWin.document.open()
    newWin.document.write(html)
    newWin.document.close()
    newWin.document.title = report.title
    appendComplaintReportLog({
      archiveLogId: `cral-export-w-${report.id}-${Date.now()}`,
      reportId: report.id,
      action: 'export',
      operator: currentUser.name,
      operatorLevel: report.scopeLevel,
      operatedAt: nowStr(),
      detail: '导出 Word（HTML 打印）',
    })
    message.success('已在新窗口打开，使用浏览器"打印"功能可另存为 PDF/Word')
  }

  const handleExportExcel = (report: ComplaintReport) => {
    exportDetailCsv(report, complaints)
    appendComplaintReportLog({
      archiveLogId: `cral-export-x-${report.id}-${Date.now()}`,
      reportId: report.id,
      action: 'export',
      operator: currentUser.name,
      operatorLevel: report.scopeLevel,
      operatedAt: nowStr(),
      detail: '导出 Excel（CSV 明细）',
    })
    message.success('Excel 明细已开始下载')
  }

  const handleDelete = (report: ComplaintReport) => {
    deleteComplaintReport(report.id)
    appendComplaintReportLog({
      archiveLogId: `cral-del-${report.id}-${Date.now()}`,
      reportId: report.id,
      action: 'delete',
      operator: currentUser.name,
      operatorLevel: report.scopeLevel,
      operatedAt: nowStr(),
      detail: '软删除报表',
    })
    message.success('报表已删除，30 天内可在回收站恢复')
  }

  const exportMenu = (report: ComplaintReport) => ({
    items: [
      { key: 'html', icon: <Html5Outlined />, label: '导出 HTML' },
      { key: 'word', icon: <FileWordOutlined />, label: '导出 Word' },
      { key: 'excel', icon: <FileExcelOutlined />, label: '导出 Excel（明细）' },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'html') handleExportHtml(report)
      else if (key === 'word') handleExportWord(report)
      else handleExportExcel(report)
    },
  })

  const columns = [
    {
      title: '报表标题',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: ComplaintReport) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
          {/* 第一行：报表标题（超长省略，悬停查看全文） */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <Text
              strong
              style={{ cursor: 'pointer', flex: 1, minWidth: 0 }}
              ellipsis={{ tooltip: text }}
              onClick={() => handlePreview(record)}
            >
              {text}
            </Text>
          </div>
          {/* 第二行：状态标签 + 简述（单行省略，悬停查看全文） */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
            {record.status === 'empty' && (
              <Tag color="default" style={{ marginRight: 0, flexShrink: 0 }}>空报表</Tag>
            )}
            <Text
              type="secondary"
              style={{ fontSize: 12, flex: 1, minWidth: 0 }}
              ellipsis={{ tooltip: record.summary }}
            >
              {record.summary}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: '统计周期',
      key: 'period',
      width: 200,
      render: (_: unknown, record: ComplaintReport) => (
        <Text style={{ fontSize: 12 }}>{record.periodStart} ~ {record.periodEnd}</Text>
      ),
    },
    {
      title: '数据范围',
      key: 'scope',
      width: 120,
      render: (_: unknown, record: ComplaintReport) => (
        <Text style={{ fontSize: 12 }}>{ComplaintReportScopeLabels[record.scopeLevel]} · {record.scopeName}</Text>
      ),
    },
    {
      title: '生成人/时间',
      key: 'gen',
      width: 160,
      render: (_: unknown, record: ComplaintReport) => (
        <div>
          <div>{record.generatedBy}</div>
          <Text type="secondary" style={{ fontSize: 11 }}>{record.generatedAt}</Text>
        </div>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 240,
      render: (_: unknown, record: ComplaintReport) => (
        <Space size={4}>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handlePreview(record)}>预览</Button>
          <Dropdown menu={exportMenu(record)} placement="bottomRight">
            <Button type="link" size="small" icon={<DownloadOutlined />}>导出</Button>
          </Dropdown>
          <Popconfirm
            title="确定删除该报表吗？"
            description="删除后 30 天内可恢复"
            okText="确认删除"
            okType="danger"
            cancelText="取消"
            onConfirm={() => handleDelete(record)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="数据报表"
        breadcrumb={[{ title: '首页', path: '/' }, { title: '投诉台账', path: '/complaints' }, { title: '数据报表' }]}
        extra={
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setGenOpen(true)}>新增报表</Button>
          </Space>
        }
      />
      <PageContainer>
        <Card style={{ marginBottom: 16 }}>
          <Space wrap>
            <Select
              placeholder="数据层级"
              allowClear
              style={{ width: 120 }}
              value={filters.scope}
              onChange={(v) => setFilters({ ...filters, scope: v })}
              options={Object.entries(ComplaintReportScopeLabels).map(([k, v]) => ({ value: k as ComplaintReportScope, label: v }))}
            />
            <RangePicker
              value={filters.range}
              onChange={(v) => setFilters({ ...filters, range: v as [dayjs.Dayjs, dayjs.Dayjs] | undefined })}
            />
            <Button onClick={() => setFilters({})}>重置</Button>
            <Text type="secondary" style={{ fontSize: 12 }}>共 {filtered.length} 份报表</Text>
          </Space>
        </Card>

        <Card>
          {filtered.length === 0 ? (
            <Empty
              description="暂无报表，点击右上角「新增报表」创建第一份"
              style={{ padding: '40px 0' }}
            >
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setGenOpen(true)}>新增报表</Button>
            </Empty>
          ) : (
            <Table
              rowKey="id"
              columns={columns}
              dataSource={filtered}
              pagination={{ pageSize: 10, showSizeChanger: true }}
              size="middle"
            />
          )}
        </Card>
      </PageContainer>

      {/* 新增报表 Modal（V1.8 简化：仅选择统计时间范围；数据范围按账号层级自动确定，生成日期即生成成功时间） */}
      <Modal
        title="新增报表"
        open={genOpen}
        onCancel={() => setGenOpen(false)}
        onOk={handleGenerate}
        okText="生成报表"
        cancelText="取消"
        confirmLoading={generating}
        width={520}
        destroyOnClose
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={`数据范围：${ComplaintReportScopeLabels[resolveReportScope(currentUser).scope]} · ${resolveReportScope(currentUser).scopeName}（按当前账号层级自动确定）`}
        />
        <Form form={form} layout="vertical">
          <Form.Item label="统计时间范围" name="range" rules={[{ required: true, message: '请选择时间范围' }]}>
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
