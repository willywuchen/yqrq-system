import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Tabs,
  Table,
  Switch,
  Button,
  Space,
  App,
  Typography,
  Alert,
  Card,
  Tag,
  Input,
  Result,
} from 'antd'
import {
  SaveOutlined,
  UndoOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import { useStore } from '../../store'
import {
  ComplaintReportChapterKindLabels,
  ComplaintReportTypeLabels,
  DEFAULT_REPORT_CHAPTERS,
  type ComplaintReportChapter,
  type ComplaintReportTemplate,
  type ComplaintReportType,
} from '../../types'

const { Text, Paragraph } = Typography

export default function ComplaintReportTemplateConfig() {
  const navigate = useNavigate()
  const { message, modal } = App.useApp()
  const { complaintReportTemplates, currentUser, updateComplaintReportTemplate, restoreDefaultTemplates } = useStore()

  // 非系统管理员不可访问
  if (currentUser.role !== 'admin') {
    return (
      <PageContainer>
        <Result
          status="403"
          title="无权限"
          subTitle="报表模板配置仅系统管理员可访问"
          extra={<Button type="primary" onClick={() => navigate('/complaints/reports')}>返回报表中心</Button>}
        />
      </PageContainer>
    )
  }

  const [activeType, setActiveType] = useState<ComplaintReportType>('low_season_month')
  const [draft, setDraft] = useState<ComplaintReportChapter[]>([])

  const activeTemplate = complaintReportTemplates.find((t) => t.reportType === activeType)!

  // 切换模板时加载章节副本到 draft
  useEffect(() => {
    setDraft(JSON.parse(JSON.stringify(activeTemplate.chapters)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeType, activeTemplate.chapters])

  // 检测是否有未保存改动
  const dirty = JSON.stringify(draft) !== JSON.stringify(activeTemplate.chapters)

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir
    if (target < 0 || target >= draft.length) return
    const next = [...draft]
    ;[next[index], next[target]] = [next[target], next[index]]
    setDraft(next)
  }

  const toggleEnabled = (index: number, enabled: boolean) => {
    const next = [...draft]
    next[index] = { ...next[index], enabled }
    setDraft(next)
  }

  const editTitle = (index: number, title: string) => {
    const next = [...draft]
    next[index] = { ...next[index], title }
    setDraft(next)
  }

  const handleSave = () => {
    if (!draft.some((c) => c.enabled)) {
      message.warning('至少需要保留一个启用的章节')
      return
    }
    updateComplaintReportTemplate(activeTemplate.templateId, { chapters: draft })
    message.success('模板已保存')
  }

  const handleRestoreOne = () => {
    modal.confirm({
      title: '还原该模板默认章节',
      content: '将该模板章节恢复为系统默认结构，已编辑内容将丢失。',
      okText: '确认还原',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        setDraft(JSON.parse(JSON.stringify(DEFAULT_REPORT_CHAPTERS[activeType])))
        updateComplaintReportTemplate(activeTemplate.templateId, {
          chapters: JSON.parse(JSON.stringify(DEFAULT_REPORT_CHAPTERS[activeType])),
        })
        message.success('已还原默认章节')
      },
    })
  }

  const handleRestoreAll = () => {
    modal.confirm({
      title: '还原全部模板默认',
      content: '将三类周期报表模板全部恢复为系统默认结构，所有已编辑内容将丢失。',
      okText: '确认还原',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        restoreDefaultTemplates()
        setDraft(JSON.parse(JSON.stringify(DEFAULT_REPORT_CHAPTERS[activeType])))
        message.success('全部模板已还原默认')
      },
    })
  }

  const columns = [
    {
      title: '序号',
      width: 64,
      render: (_: unknown, __: ComplaintReportChapter, i: number) => i + 1,
    },
    {
      title: '启用',
      width: 80,
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled: boolean, _: ComplaintReportChapter, i: number) => (
        <Switch checked={enabled} onChange={(v) => toggleEnabled(i, v)} />
      ),
    },
    {
      title: '章节标题',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, _: ComplaintReportChapter, i: number) => (
        <Input value={title} onChange={(e) => editTitle(i, e.target.value)} style={{ width: '100%' }} />
      ),
    },
    {
      title: '章节类型',
      width: 160,
      dataIndex: 'kind',
      key: 'kind',
      render: (kind: string) => (
        <Tag>{ComplaintReportChapterKindLabels[kind as keyof typeof ComplaintReportChapterKindLabels] || kind}</Tag>
      ),
    },
    {
      title: '排序',
      width: 120,
      key: 'order',
      render: (_: unknown, __: ComplaintReportChapter, i: number) => (
        <Space>
          <Button size="small" icon={<ArrowUpOutlined />} disabled={i === 0} onClick={() => move(i, -1)} />
          <Button size="small" icon={<ArrowDownOutlined />} disabled={i === draft.length - 1} onClick={() => move(i, 1)} />
        </Space>
      ),
    },
  ]

  const tabItems = complaintReportTemplates.map((t: ComplaintReportTemplate) => ({
    key: t.reportType,
    label: `${t.templateName}（${t.chapters.length} 章）`,
    children: (
      <Card
        title={
          <Space>
            <Text strong>{t.templateName}</Text>
            <Tag>{ComplaintReportTypeLabels[t.reportType]}</Tag>
          </Space>
        }
        extra={
          <Space>
            <Button icon={<UndoOutlined />} onClick={handleRestoreOne}>还原该模板默认</Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} disabled={!dirty}>保存</Button>
          </Space>
        }
      >
        {dirty && activeTemplate.templateId === t.templateId && (
          <Alert
            type="warning"
            showIcon
            message="当前模板有未保存改动，请保存或还原默认"
            style={{ marginBottom: 16 }}
          />
        )}
        <Table
          rowKey={(_, i) => String(i)}
          columns={columns}
          dataSource={draft}
          pagination={false}
          size="small"
        />
        <Paragraph type="secondary" style={{ fontSize: 12, marginTop: 12 }}>
          说明：调整章节顺序与启用状态后点击「保存」，新生成的报表将按此模板渲染。已生成的历史报表不受影响（其章节快照已冻结）。
        </Paragraph>
      </Card>
    ),
  }))

  return (
    <>
      <PageHeader
        title="报表模板配置"
        breadcrumb={[
          { title: '首页', path: '/' },
          { title: '投诉台账', path: '/complaints' },
          { title: '数据报表', path: '/complaints/reports' },
          { title: '模板配置' },
        ]}
        extra={
          <Button icon={<UndoOutlined />} onClick={handleRestoreAll}>还原全部默认</Button>
        }
      />
      <PageContainer>
        <Tabs
          items={tabItems}
          activeKey={activeType}
          onChange={(k) => setActiveType(k as ComplaintReportType)}
        />
      </PageContainer>
    </>
  )
}
