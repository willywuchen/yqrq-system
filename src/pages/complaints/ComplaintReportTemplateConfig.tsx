import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
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
  DEFAULT_REPORT_CHAPTERS,
  type ComplaintReportChapter,
} from '../../types'

const { Text, Paragraph } = Typography

// 兼容旧持久化数据：过滤已废弃的章节类型（V1.4 移除 hot_topics/risk_warning/media_focus 等）
const KNOWN_KINDS = new Set(Object.keys(ComplaintReportChapterKindLabels))

export default function ComplaintReportTemplateConfig() {
  const navigate = useNavigate()
  const { message, modal } = App.useApp()
  const { complaintReportTemplates, currentUser, updateComplaintReportTemplate, restoreDefaultTemplates } = useStore()

  const [draft, setDraft] = useState<ComplaintReportChapter[]>([])

  const template = complaintReportTemplates[0]
  const templateChapters = (template?.chapters || []).filter((c) => KNOWN_KINDS.has(c.kind))
  // 模板缺失或为空时兜底默认章节（旧持久化数据兼容）
  const effectiveChapters = templateChapters.length > 0 ? templateChapters : DEFAULT_REPORT_CHAPTERS
  const templateId = template?.templateId || 'TPL-GENERAL-001'

  useEffect(() => {
    setDraft(JSON.parse(JSON.stringify(effectiveChapters)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complaintReportTemplates])

  // 非系统管理员不可访问（钩子之后早退，保证 Hook 调用顺序稳定）
  if (currentUser.role !== 'admin') {
    return (
      <PageContainer>
        <Result
          status="403"
          title="无权限"
          subTitle="报表章节配置仅系统管理员可访问"
          extra={<Button type="primary" onClick={() => navigate('/complaints/reports')}>返回报表中心</Button>}
        />
      </PageContainer>
    )
  }

  // 检测是否有未保存改动
  const dirty = JSON.stringify(draft) !== JSON.stringify(effectiveChapters)

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
    updateComplaintReportTemplate(templateId, { chapters: draft })
    message.success('章节配置已保存')
  }

  const handleRestore = () => {
    modal.confirm({
      title: '还原默认章节',
      content: '将报表章节恢复为系统默认结构，已编辑内容将丢失。',
      okText: '确认还原',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        restoreDefaultTemplates()
        setDraft(JSON.parse(JSON.stringify(DEFAULT_REPORT_CHAPTERS)))
        message.success('已还原默认章节')
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

  return (
    <>
      <PageHeader
        title="报表章节配置"
        breadcrumb={[
          { title: '首页', path: '/' },
          { title: '投诉台账', path: '/complaints' },
          { title: '数据报表', path: '/complaints/reports' },
          { title: '章节配置' },
        ]}
        extra={
          <Button icon={<UndoOutlined />} onClick={handleRestore}>还原默认章节</Button>
        }
      />
      <PageContainer>
        <Card
          title={
            <Space>
              <Text strong>通用报表模板</Text>
              <Tag>{draft.length} 章</Tag>
            </Space>
          }
          extra={
            <Space>
              <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} disabled={!dirty}>保存</Button>
            </Space>
          }
        >
          {dirty && (
            <Alert
              type="warning"
              showIcon
              message="当前配置有未保存改动，请保存或还原默认"
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
            说明：V1.4 起报表不再区分淡季月报/旺季周报/重要时段日报，所有报表统一使用本章节结构。调整章节顺序与启用状态后点击「保存」，新生成的报表将按此配置渲染。已生成的历史报表不受影响（其章节快照已冻结）。
          </Paragraph>
        </Card>
      </PageContainer>
    </>
  )
}
