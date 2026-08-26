import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
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
  Drawer,
  Timeline,
  Empty,
  Radio,
  Tooltip,
  Input,
} from 'antd'
import {
  PlusOutlined,
  EyeOutlined,
  DownloadOutlined,
  DeleteOutlined,
  SettingOutlined,
  CalendarOutlined,
  HistoryOutlined,
  FileExcelOutlined,
  FileWordOutlined,
  Html5Outlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import { useStore } from '../../store'
import {
  ComplaintReportTypeLabels,
  ComplaintReportTypeColors,
  ComplaintReportScopeLabels,
  ComplaintReportArchiveActionLabels,
  ComplaintSeasonLabels,
  ComplaintSeasonColors,
  DEFAULT_REPORT_CHAPTERS,
  GUIZHOU_CITIES,
  type ComplaintReport,
  type ComplaintReportType,
  type ComplaintReportScope,
  type ComplaintReportArchiveLog,
  type ComplaintSeason,
} from '../../types'
import { genId, nowStr, buildComplaintReportSnapshot, buildReportSummary } from '../../utils'
import { buildComplaintReportHtml, exportComplaintDetailCsv as exportDetailCsv } from '../../utils/complaintReportHtml'

const { Text, Paragraph } = Typography

const { RangePicker } = DatePicker

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
    complaintReportArchiveLogs,
    seasonCalendar,
    updateSeasonCalendar,
    restoreDefaultSeasonCalendar,
  } = useStore()

  const isAdmin = currentUser.role === 'admin'
  const [form] = Form.useForm()
  const [genOpen, setGenOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [archiveReport, setArchiveReport] = useState<ComplaintReport | null>(null)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [filters, setFilters] = useState<{ type?: ComplaintReportType; scope?: ComplaintReportScope; range?: [dayjs.Dayjs, dayjs.Dayjs] }>({})

  // 仅展示未删除报表，按生成时间倒序
  const visibleReports = complaintReports.filter((r) => !r.deleted)
  const filtered = visibleReports.filter((r) => {
    if (filters.type && r.reportType !== filters.type) return false
    if (filters.scope && r.scopeLevel !== filters.scope) return false
    if (filters.range) {
      const t = dayjs(r.periodEnd)
      if (t.isBefore(filters.range[0].startOf('day')) || t.isAfter(filters.range[1].endOf('day'))) return false
    }
    return true
  })

  // 当前用户可生成的层级范围（V1.1：县级不可越权；当前角色简化为 final_reviewer=省级，admin=全部）
  const allowedScopes: ComplaintReportScope[] = isAdmin ? ['province', 'city', 'district'] : ['province']

  const handleGenerate = async () => {
    try {
      const values = await form.validateFields()
      const templateId: string = values.templateId
      const reportType: ComplaintReportType = values.reportType
      const scope: ComplaintReportScope = values.scope
      const scopeName = scope === 'province' ? '全省' : values.scopeName || '贵阳市'
      const start = values.range[0] instanceof dayjs.Dayjs ? values.range[0] : dayjs(values.range[0])
      const end = values.range[1] instanceof dayjs.Dayjs ? values.range[1] : dayjs(values.range[1])
      const periodStart = start.format('YYYY-MM-DD')
      const periodEnd = end.format('YYYY-MM-DD')

      // 权限校验（V1.1：县级不可越权）
      if (!allowedScopes.includes(scope)) {
        message.error(`您的层级不可生成${ComplaintReportScopeLabels[scope]}报表`)
        return
      }

      setGenerating(true)
      // 模拟生成耗时
      await new Promise((res) => setTimeout(res, 600))

      const snapshot = buildComplaintReportSnapshot(complaints, periodStart, periodEnd, scopeName)
      const chapters = JSON.parse(JSON.stringify(DEFAULT_REPORT_CHAPTERS[reportType]))
      const report: ComplaintReport = {
        id: genId('RPT'),
        title: `${start.format('YYYY年M月D日')}~${end.format('YYYY年M月D日')} ${ComplaintReportTypeLabels[reportType]}（${scopeName}）`,
        reportType,
        periodStart,
        periodEnd,
        scopeLevel: scope,
        scopeName,
        generatedBy: currentUser.name,
        generatedAt: nowStr(),
        summary: buildReportSummary(snapshot, reportType, scopeName),
        hasAiInsight: false,
        status: snapshot.total === 0 ? 'empty' : 'normal',
        templateId,
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
        detail: '手动生成报表',
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

  const archiveLogs = archiveReport
    ? complaintReportArchiveLogs.filter((l) => l.reportId === archiveReport.id).sort((a, b) => b.operatedAt.localeCompare(a.operatedAt))
    : []

  const columns = [
    {
      title: '报表标题',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: ComplaintReport) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
          {/* 第一行：报表类型 + 标题（超长省略，悬停查看全文） */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <Tag
              color={ComplaintReportTypeColors[record.reportType]}
              style={{ marginRight: 0, flexShrink: 0 }}
            >
              {ComplaintReportTypeLabels[record.reportType]}
            </Tag>
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
            {record.trigger === 'manual' && (
              <Tag color="purple" style={{ marginRight: 0, flexShrink: 0 }}>手动</Tag>
            )}
            {record.hasAiInsight && (
              <Tag color="green" style={{ marginRight: 0, flexShrink: 0 }}>含风险研判</Tag>
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
          <Button type="link" size="small" icon={<HistoryOutlined />} onClick={() => setArchiveReport(record)}>归档</Button>
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
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setGenOpen(true)}>手动生成报表</Button>
            <Tooltip title="系统管理员可配置报表模板章节">
              <Button icon={<SettingOutlined />} disabled={!isAdmin} onClick={() => navigate('/complaints/reports/template-config')}>模板配置</Button>
            </Tooltip>
            <Button icon={<CalendarOutlined />} onClick={() => setCalendarOpen(true)}>淡旺季日历</Button>
          </Space>
        }
      />
      <PageContainer>
        <Card style={{ marginBottom: 16 }}>
          <Space wrap>
            <Select
              placeholder="报表类型"
              allowClear
              style={{ width: 150 }}
              value={filters.type}
              onChange={(v) => setFilters({ ...filters, type: v })}
              options={Object.entries(ComplaintReportTypeLabels).map(([k, v]) => ({ value: k as ComplaintReportType, label: v }))}
            />
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
              description="暂无报表，点击右上角「手动生成报表」创建第一份"
              style={{ padding: '40px 0' }}
            >
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setGenOpen(true)}>手动生成报表</Button>
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

      {/* 手动生成报表 Modal */}
      <Modal
        title="手动生成报表"
        open={genOpen}
        onCancel={() => setGenOpen(false)}
        onOk={handleGenerate}
        okText="生成报表"
        cancelText="取消"
        confirmLoading={generating}
        width={560}
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={{ scope: 'province' }}>
          <Form.Item label="报表类型（模板）" name="templateId" rules={[{ required: true, message: '请选择报表类型' }]}>
            <Select
              placeholder="选择报表类型"
              onChange={(v) => {
                // 同步 reportType
                const reportType = v.startsWith('TPL-LSM') ? 'low_season_month' : v.startsWith('TPL-PW') ? 'peak_week' : 'important_day'
                form.setFieldValue('reportType', reportType)
              }}
              options={[
                { value: 'TPL-LSM-001', label: '淡季月报模板' },
                { value: 'TPL-PW-001', label: '旺季周报模板' },
                { value: 'TPL-ID-001', label: '重要时段日报模板（含紧急日报）' },
              ]}
            />
          </Form.Item>
          <Form.Item name="reportType" hidden>
            <Input />
          </Form.Item>
          <Form.Item label="统计时间范围" name="range" rules={[{ required: true, message: '请选择时间范围' }]}>
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="数据层级" name="scope" rules={[{ required: true }]}>
            <Radio.Group>
              {(['province', 'city', 'district'] as ComplaintReportScope[]).map((s) => (
                <Radio key={s} value={s} disabled={!allowedScopes.includes(s)}>
                  {ComplaintReportScopeLabels[s]}
                  {!allowedScopes.includes(s) && <span style={{ color: '#999', fontSize: 12 }}>（您的层级不可选）</span>}
                </Radio>
              ))}
            </Radio.Group>
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, cur) => prev.scope !== cur.scope}
          >
            {({ getFieldValue }) => {
              const scope: ComplaintReportScope = getFieldValue('scope')
              if (scope === 'province') return null
              return (
                <Form.Item label={scope === 'city' ? '市州' : '区县'} name="scopeName" rules={[{ required: true, message: '请选择区域' }]}>
                  <Select
                    placeholder="选择区域"
                    options={GUIZHOU_CITIES.map((c) => ({ value: c, label: c }))}
                  />
                </Form.Item>
              )
            }}
          </Form.Item>
          <Form.Item label="AI 文本归因（风险研判段）">
            <Space>
              <Tag color="default">二期功能（MVP 未启用）</Tag>
              <Text type="secondary" style={{ fontSize: 12 }}>MVP 上线后 2 个月内启动</Text>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 归档记录 Drawer */}
      <Drawer
        title={archiveReport ? `归档记录 · ${archiveReport.title}` : '归档记录'}
        open={!!archiveReport}
        onClose={() => setArchiveReport(null)}
        width={480}
      >
        {archiveReport && (
          <div>
            <Paragraph type="secondary" style={{ fontSize: 12 }}>
              报表编号：{archiveReport.id} ｜ 归档保留 3 年，3 年后转冷存储
            </Paragraph>
            {archiveLogs.length === 0 ? (
              <Empty description="暂无操作记录" />
            ) : (
              <Timeline
                items={archiveLogs.map((log: ComplaintReportArchiveLog) => ({
                  color: log.action === 'delete' ? 'red' : log.action === 'export' ? 'blue' : 'green',
                  children: (
                    <div>
                      <Space>
                        <Tag color={log.action === 'delete' ? 'red' : log.action === 'export' ? 'blue' : 'green'}>
                          {ComplaintReportArchiveActionLabels[log.action]}
                        </Tag>
                        <Text strong>{log.operator}</Text>
                      </Space>
                      <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                        {log.operatedAt} ｜ {ComplaintReportScopeLabels[log.operatorLevel]}
                      </div>
                      {log.detail && <div style={{ color: '#666', fontSize: 12, marginTop: 2 }}>{log.detail}</div>}
                    </div>
                  ),
                }))}
              />
            )}
          </div>
        )}
      </Drawer>

      {/* 淡旺季日历 Drawer */}
      <Drawer
        title="淡旺季日历"
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        width={520}
        extra={isAdmin ? <Button size="small" onClick={() => { restoreDefaultSeasonCalendar(); message.success('已恢复默认淡旺季日历') }}>恢复默认</Button> : undefined}
      >
        <Paragraph type="secondary" style={{ fontSize: 12 }}>
          淡季（月报）｜ 旺季（周报）｜ 重要时段（日报）。{isAdmin ? '点击月份切换类型。' : '仅查看，配置需系统管理员权限。'}
        </Paragraph>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {seasonCalendar.map((item) => (
            <div
              key={item.month}
              style={{
                border: '1px solid #f0f0f0',
                borderRadius: 6,
                padding: 12,
                textAlign: 'center',
                cursor: isAdmin ? 'pointer' : 'default',
                background:
                  item.season === 'important' ? '#fff1f0' : item.season === 'peak' ? '#fff7e6' : '#f0f5ff',
              }}
              onClick={() => {
                if (!isAdmin) return
                const next: ComplaintSeason = item.season === 'low' ? 'peak' : item.season === 'peak' ? 'important' : 'low'
                updateSeasonCalendar(item.month, next)
              }}
            >
              <div style={{ fontWeight: 600 }}>{item.month}</div>
              <Tag color={ComplaintSeasonColors[item.season]} style={{ marginTop: 4 }}>
                {ComplaintSeasonLabels[item.season]}
              </Tag>
            </div>
          ))}
        </div>
      </Drawer>
    </>
  )
}
