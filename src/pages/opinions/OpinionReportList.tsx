import { useState } from 'react'
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
  App,
  Typography,
  Empty,
} from 'antd'
import {
  PlusOutlined,
  EyeOutlined,
  DownloadOutlined,
  DeleteOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import { useStore } from '../../store'
import {
  ReportTypeLabels,
  type OpinionReport,
  type ReportType,
} from '../../types'
import { genId, nowStr } from '../../utils'

const { Text, Paragraph } = Typography

export default function OpinionReportList() {
  const { message } = App.useApp()
  const { opinionReports, addOpinionReport, deleteOpinionReport, currentUser, publicOpinions, complaints } = useStore()
  const [form] = Form.useForm()
  const [genOpen, setGenOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState<OpinionReport | null>(null)

  // 生成报告
  const handleGenerate = async () => {
    try {
      const values = await form.validateFields()
      const type: ReportType = values.type
      const end = values.periodEnd instanceof dayjs.Dayjs ? values.periodEnd : dayjs(values.periodEnd)
      const start = values.periodStart instanceof dayjs.Dayjs ? values.periodStart : dayjs(values.periodStart)
      const startStr = start.format('YYYY-MM-DD 00:00:00')
      const endStr = end.format('YYYY-MM-DD 23:59:59')

      // 简化版报告内容生成
      const opinionsInPeriod = publicOpinions.filter((o) => {
        const t = dayjs(o.publishTime)
        return !t.isBefore(start.startOf('day')) && !t.isAfter(end.endOf('day'))
      })
      const complaintsInPeriod = complaints.filter((c) => {
        const t = dayjs(c.complaintTime)
        return !t.isBefore(start.startOf('day')) && !t.isAfter(end.endOf('day'))
      })

      const negativeCount = opinionsInPeriod.filter((o) => o.sentiment === 'negative').length
      const positiveCount = opinionsInPeriod.filter((o) => o.sentiment === 'positive').length
      const neutralCount = opinionsInPeriod.filter((o) => o.sentiment === 'neutral').length
      const handledCount = opinionsInPeriod.filter((o) => o.handleStatus === 'handled').length
      const totalOpinion = opinionsInPeriod.length
      const totalComplaint = complaintsInPeriod.length

      const content = `【舆情概述】本周期新增舆情 ${totalOpinion} 条、投诉 ${totalComplaint} 件。其中正面 ${positiveCount} 条、负面 ${negativeCount} 条、中性 ${neutralCount} 条。

【情感分布】正面 ${positiveCount} 条（${totalOpinion > 0 ? ((positiveCount / totalOpinion) * 100).toFixed(1) : 0}%），负面 ${negativeCount} 条（${totalOpinion > 0 ? ((negativeCount / totalOpinion) * 100).toFixed(1) : 0}%），中性 ${neutralCount} 条

【处置情况】已完成处置 ${handledCount} 条，处置率 ${totalOpinion > 0 ? ((handledCount / totalOpinion) * 100).toFixed(1) : 0}%

【负面清单（Top 5）】
${opinionsInPeriod.filter((o) => o.sentiment === 'negative').slice(0, 5).map((o, i) => `${i + 1}. ${o.title}（风险指数 ${o.riskScore ?? '-'}）`).join('\n') || '暂无'}

【风险提示】
- 负面舆情占比 ${totalOpinion > 0 ? ((negativeCount / totalOpinion) * 100).toFixed(1) : 0}%，需重点关注
- 投诉总量 ${totalComplaint} 件，反映市场实际诉求

【决策建议】
1. 针对负面高发主题开展专项整治
2. 加强节假日应急响应
3. 推动投诉与舆情联动分析`

      const report: OpinionReport = {
        id: genId('RPT'),
        type,
        title: `${start.format('YYYY-MM-DD')}~${end.format('YYYY-MM-DD')} 舆情${ReportTypeLabels[type]}`,
        periodStart: startStr,
        periodEnd: endStr,
        generatedAt: nowStr(),
        content,
        createdBy: currentUser.name,
      }
      addOpinionReport(report)
      message.success('报告已生成')
      setGenOpen(false)
      form.resetFields()
    } catch (err) {
      // 校验失败
    }
  }

  const handleExport = (report: OpinionReport) => {
    const content = `${report.title}
周期：${report.periodStart} 至 ${report.periodEnd}
生成时间：${report.generatedAt}
报告类型：${ReportTypeLabels[report.type]}
生成人：${report.createdBy}

${report.content}
`
    const blob = new Blob([`\uFEFF${content}`], { type: 'text/plain;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${report.title}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    message.success('报告已导出')
  }

  const handleDelete = (report: OpinionReport) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除报告「${report.title}」吗？`,
      okType: 'danger',
      okText: '删除',
      cancelText: '取消',
      onOk: () => {
        deleteOpinionReport(report.id)
        message.success('报告已删除')
      },
    })
  }

  const columns = [
    { title: '报告编号', dataIndex: 'id', width: 180 },
    { title: '标题', dataIndex: 'title' },
    {
      title: '类型',
      dataIndex: 'type',
      width: 80,
      render: (t: ReportType) => <Tag color="blue">{ReportTypeLabels[t]}</Tag>,
    },
    { title: '周期开始', dataIndex: 'periodStart', width: 170 },
    { title: '周期结束', dataIndex: 'periodEnd', width: 170 },
    { title: '生成时间', dataIndex: 'generatedAt', width: 170 },
    { title: '生成人', dataIndex: 'createdBy', width: 100 },
    {
      title: '操作',
      width: 200,
      render: (_: unknown, r: OpinionReport) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => setPreviewOpen(r)}>
            预览
          </Button>
          <Button type="link" size="small" icon={<DownloadOutlined />} onClick={() => handleExport(r)}>
            导出
          </Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(r)} />
        </Space>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="舆情报告"
        breadcrumb={[
          { title: '首页', path: '/' },
          { title: '舆情管理分析', path: '/public-opinion' },
          { title: '舆情报告' },
        ]}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setGenOpen(true)}>
            生成报告
          </Button>
        }
      />
      <PageContainer>
        <Card size="small">
          <Table
            rowKey="id"
            columns={columns}
            dataSource={opinionReports}
            pagination={{ pageSize: 10 }}
            size="small"
            locale={{ emptyText: '暂无报告，可点击右上角"生成报告"创建' }}
          />
        </Card>
      </PageContainer>

      {/* 生成报告弹窗 */}
      <Modal
        title="生成舆情报告"
        open={genOpen}
        onOk={handleGenerate}
        onCancel={() => setGenOpen(false)}
        okText="生成"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="type" label="报告类型" rules={[{ required: true, message: '请选择报告类型' }]}>
            <Select
              placeholder="请选择"
              options={Object.entries(ReportTypeLabels).map(([k, v]) => ({ value: k, label: v }))}
            />
          </Form.Item>
          <Form.Item label="报告周期" required>
            <Space>
              <Form.Item name="periodStart" noStyle rules={[{ required: true, message: '请选择开始日期' }]}>
                <DatePicker placeholder="开始日期" />
              </Form.Item>
              <Text type="secondary">至</Text>
              <Form.Item name="periodEnd" noStyle rules={[{ required: true, message: '请选择结束日期' }]}>
                <DatePicker placeholder="结束日期" />
              </Form.Item>
            </Space>
          </Form.Item>
          <Text type="secondary">系统将根据周期内舆情数据自动生成报告内容，含概述、情感分布、负面清单、风险提示、决策建议。</Text>
        </Form>
      </Modal>

      {/* 报告预览弹窗 */}
      <Modal
        title={previewOpen?.title}
        open={!!previewOpen}
        onCancel={() => setPreviewOpen(null)}
        footer={[
          <Button key="close" onClick={() => setPreviewOpen(null)}>关闭</Button>,
          <Button key="export" type="primary" icon={<DownloadOutlined />} onClick={() => previewOpen && handleExport(previewOpen)}>
            导出
          </Button>,
        ]}
        width={720}
      >
        {previewOpen ? (
          <div>
            <Space direction="vertical" style={{ marginBottom: 16 }}>
              <div>
                <Text type="secondary">报告类型：</Text>
                <Tag color="blue">{ReportTypeLabels[previewOpen.type]}</Tag>
              </div>
              <div>
                <Text type="secondary">周期：</Text>
                <Text>{previewOpen.periodStart} 至 {previewOpen.periodEnd}</Text>
              </div>
              <div>
                <Text type="secondary">生成时间：</Text>
                <Text>{previewOpen.generatedAt}</Text>
                <Text type="secondary" style={{ marginLeft: 16 }}>生成人：</Text>
                <Text>{previewOpen.createdBy}</Text>
              </div>
            </Space>
            <Paragraph style={{ whiteSpace: 'pre-wrap', background: '#fafafa', padding: 16, borderRadius: 4 }}>
              {previewOpen.content}
            </Paragraph>
          </div>
        ) : (
          <Empty />
        )}
      </Modal>
    </>
  )
}
