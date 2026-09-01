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
  Empty,
  Radio,
  Tooltip,
} from 'antd'
import {
  PlusOutlined,
  EyeOutlined,
  DownloadOutlined,
  DeleteOutlined,
  SettingOutlined,
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

export default function ComplaintReportList() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const {
    complaintReports,
    complaints,
    complaintReportTemplates,
    currentUser,
    addComplaintReport,
    deleteComplaintReport,
    appendComplaintReportLog,
  } = useStore()

  const isAdmin = currentUser.role === 'admin'
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

  // 当前用户可生成的层级范围（V1.1：县级不可越权；当前角色简化为 final_reviewer=省级，admin=全部）
  const allowedScopes: ComplaintReportScope[] = isAdmin ? ['province', 'city', 'district'] : ['province']

  const handleGenerate = async () => {
    try {
      const values = await form.validateFields()
      const scope: ComplaintReportScope = values.scope
      const scopeName = scope === 'province' ? '全省' : values.scopeName || '贵阳市'
      const start = values.range[0] instanceof dayjs.Dayjs ? values.range[0] : dayjs(values.range[0])
      const end = values.range[1] instanceof dayjs.Dayjs ? values.range[1] : dayjs(values.range[1])
      const genDate = values.generateDate instanceof dayjs.Dayjs ? values.generateDate : dayjs(values.generateDate)
      const periodStart = start.format('YYYY-MM-DD')
      const periodEnd = end.format('YYYY-MM-DD')
      const generatedAt = genDate.format('YYYY-MM-DD HH:mm:ss')

      // 权限校验（V1.1：县级不可越权）
      if (!allowedScopes.includes(scope)) {
        message.error(`您的层级不可生成${ComplaintReportScopeLabels[scope]}报表`)
        return
      }

      setGenerating(true)
      // 模拟生成耗时
      await new Promise((res) => setTimeout(res, 600))

      const snapshot = buildComplaintReportSnapshot(complaints, periodStart, periodEnd, scopeName)
      // 章节取通用模板配置（管理员可在"章节配置"中调整），兜底默认章节
      const configured = complaintReportTemplates[0]?.chapters
      const chapters = JSON.parse(JSON.stringify(configured && configured.length > 0 ? configured : DEFAULT_REPORT_CHAPTERS))
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
            <Tooltip title="系统管理员可配置报表章节">
              <Button icon={<SettingOutlined />} disabled={!isAdmin} onClick={() => navigate('/complaints/reports/template-config')}>章节配置</Button>
            </Tooltip>
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
        <Form form={form} layout="vertical" initialValues={{ scope: 'province', generateDate: dayjs() }}>
          <Form.Item label="统计时间范围" name="range" rules={[{ required: true, message: '请选择时间范围' }]}>
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            label="报表生成日期"
            name="generateDate"
            rules={[
              { required: true, message: '请选择报表生成日期' },
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve()
                  const range: [dayjs.Dayjs, dayjs.Dayjs] | undefined = form.getFieldValue('range')
                  if (range?.[1] && value.isBefore(range[1].endOf('day'))) {
                    return Promise.reject(new Error('生成日期不能早于统计周期结束日'))
                  }
                  if (value.isAfter(dayjs().endOf('day'))) {
                    return Promise.reject(new Error('生成日期不能晚于今天'))
                  }
                  return Promise.resolve()
                },
              },
            ]}
            extra="报表落款与归档时间将使用该日期；可选历史日期补录"
          >
            <DatePicker showTime style={{ width: '100%' }} />
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
    </>
  )
}
