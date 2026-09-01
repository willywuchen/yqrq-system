import { useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { App, Button, Space, Empty, Tag, Typography, Dropdown, Result } from 'antd'
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  PrinterOutlined,
  Html5Outlined,
  FileWordOutlined,
  FileExcelOutlined,
} from '@ant-design/icons'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import { useStore } from '../../store'
import {
  ComplaintReportScopeLabels,
} from '../../types'
import { buildComplaintReportHtml, exportComplaintDetailCsv } from '../../utils/complaintReportHtml'

const { Text } = Typography

export default function ComplaintReportPreview() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const { complaintReports, complaints, currentUser, appendComplaintReportLog } = useStore()
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const report = useMemo(
    () => complaintReports.find((r) => r.id === id && !r.deleted),
    [complaintReports, id],
  )

  const html = useMemo(() => (report ? buildComplaintReportHtml(report) : ''), [report])

  if (!report) {
    return (
      <PageContainer>
        <Result
          status="404"
          title="报表不存在"
          subTitle="该报表可能已被删除或链接失效"
          extra={<Button type="primary" onClick={() => navigate('/complaints/reports')}>返回报表中心</Button>}
        />
      </PageContainer>
    )
  }

  const logExport = (format: string) => {
    appendComplaintReportLog({
      archiveLogId: `cral-pv-export-${report.id}-${Date.now()}`,
      reportId: report.id,
      action: 'export',
      operator: currentUser.name,
      operatorLevel: report.scopeLevel,
      operatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      detail: `预览页导出 ${format}`,
    })
  }

  const openHtmlInNewWin = () => {
    const newWin = window.open('', '_blank')
    if (!newWin) {
      message.error('浏览器拦截了新窗口，请允许弹出窗口后重试')
      return
    }
    newWin.document.open()
    newWin.document.write(html)
    newWin.document.close()
    newWin.document.title = report.title
  }

  const handleExportHtml = () => {
    openHtmlInNewWin()
    logExport('HTML')
    message.success('HTML 已在新窗口打开')
  }

  const handleExportWord = () => {
    openHtmlInNewWin()
    logExport('Word')
    message.success('已在新窗口打开，使用浏览器"打印"功能可另存为 PDF/Word')
  }

  const handleExportExcel = () => {
    exportComplaintDetailCsv(report, complaints)
    logExport('Excel')
    message.success('Excel 明细已开始下载')
  }

  const handlePrint = () => {
    const iframe = iframeRef.current
    if (iframe?.contentWindow) {
      iframe.contentWindow.focus()
      iframe.contentWindow.print()
    } else {
      message.error('打印失败，请重试')
    }
  }

  const exportMenu = {
    items: [
      { key: 'html', icon: <Html5Outlined />, label: '导出 HTML' },
      { key: 'word', icon: <FileWordOutlined />, label: '导出 Word' },
      { key: 'excel', icon: <FileExcelOutlined />, label: '导出 Excel（明细）' },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'html') handleExportHtml()
      else if (key === 'word') handleExportWord()
      else handleExportExcel()
    },
  }

  return (
    <>
      <PageHeader
        title={report.title}
        breadcrumb={[
          { title: '首页', path: '/' },
          { title: '投诉台账', path: '/complaints' },
          { title: '数据报表', path: '/complaints/reports' },
          { title: '预览' },
        ]}
        extra={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/complaints/reports')}>返回</Button>
            <Button icon={<PrinterOutlined />} onClick={handlePrint}>打印</Button>
            <Dropdown menu={exportMenu} placement="bottomRight">
              <Button type="primary" icon={<DownloadOutlined />}>导出</Button>
            </Dropdown>
          </Space>
        }
      />
      <PageContainer>
        <div style={{ marginBottom: 12 }}>
          <Space size="middle">
            <Text type="secondary">统计周期：{report.periodStart} 至 {report.periodEnd}</Text>
            <Text type="secondary">数据范围：{ComplaintReportScopeLabels[report.scopeLevel]} · {report.scopeName}</Text>
            <Text type="secondary">生成人：{report.generatedBy}</Text>
            <Text type="secondary">生成时间：{report.generatedAt}</Text>
            {report.status === 'empty' && <Tag color="warning">空报表</Tag>}
          </Space>
        </div>
        <div
          style={{
            background: '#fff',
            border: '1px solid #f0f0f0',
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          {report.snapshot.total === 0 ? (
            <Empty description="本期统计范围内无投诉数据，已生成空报表" style={{ padding: '60px 0' }} />
          ) : (
            <iframe
              ref={iframeRef}
              title={report.title}
              srcDoc={html}
              style={{ width: '100%', height: 'calc(100vh - 260px)', minHeight: 600, border: 'none' }}
            />
          )}
        </div>
      </PageContainer>
    </>
  )
}
