import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card,
  Descriptions,
  Tag,
  Space,
  Button,
  Empty,
  Timeline,
  Modal,
  Form,
  Input,
  Select,
  Typography,
  App,
  Row,
  Col,
  Divider,
} from 'antd'
import {
  ArrowLeftOutlined,
  EditOutlined,
  ExportOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import { isRichTextHtml, richTextToPlain } from '../../components/RichTextEditor'
import { useStore } from '../../store'
import {
  OpinionDataSourceLabels,
  OpinionDataSourceColors,
  OpinionSentimentLabels,
  OpinionSentimentColors,
  OpinionRiskLevelLabels,
  OpinionRiskLevelColors,
  OpinionHandleStatusLabels,
  OpinionHandleStatusColors,
  OpinionActionLabels,
  TourismCategoryLabels,
  type OpinionHandleStatus,
  type OpinionHandleLog,
} from '../../types'
import { genId, nowStr } from '../../utils'

const { Text, Paragraph } = Typography

// 操作日志颜色映射
const logActionColors: Record<string, string> = {
  create: 'blue',
  edit: 'blue',
  process: 'processing',
  handle: 'green',
  reopen: 'orange',
  transfer: 'purple',
  export: 'purple',
  delete: 'red',
}

export default function OpinionDetail() {
  const navigate = useNavigate()
  const params = useParams()
  const { message } = App.useApp()
  const {
    publicOpinions,
    setOpinionStatus,
    appendOpinionLog,
    currentUser,
  } = useStore()
  const [handleForm] = Form.useForm()
  const [handleModal, setHandleModal] = useState<{ open: boolean }>({ open: false })

  const opinion = publicOpinions.find((o) => o.id === params.id)

  if (!opinion) {
    return (
      <>
        <PageHeader title="舆情详情" />
        <PageContainer>
          <Empty description="未找到舆情记录" />
        </PageContainer>
      </>
    )
  }

  // 处置状态步骤
  const stepMap: Record<OpinionHandleStatus, number> = {
    pending: 0,
    processing: 1,
    handled: 2,
  }
  const currentStep = stepMap[opinion.handleStatus]
  const stepsItems = [
    { title: '待处理' },
    { title: '处理中' },
    { title: '已处理' },
  ]

  // 打开处置弹窗
  const openHandleModal = () => {
    handleForm.resetFields()
    // 默认填充当前处置状态，便于直接修改
    handleForm.setFieldsValue({ handleStatus: opinion.handleStatus })
    setHandleModal({ open: true })
  }

  // 提交处置
  const submitHandle = async () => {
    try {
      const values = await handleForm.validateFields()
      const fromStatus = opinion.handleStatus
      const toStatus: OpinionHandleStatus = values.handleStatus

      // 根据目标状态推断日志 action（保持日志语义清晰）
      let action: OpinionHandleLog['action'] = 'edit'
      if (toStatus === 'pending') action = 'reopen'
      else if (toStatus === 'processing') action = 'process'
      else if (toStatus === 'handled') action = 'handle'

      const log: OpinionHandleLog = {
        id: genId('LOG'),
        operator: currentUser.name,
        action,
        fromStatus,
        toStatus,
        opinion: values.opinion || `处置状态变更为${OpinionHandleStatusLabels[toStatus]}`,
        time: nowStr(),
      }
      setOpinionStatus(opinion.id, toStatus, log)
      message.success('处置成功')
      setHandleModal({ open: false })
    } catch (err) {
      // 校验失败
    }
  }

  // 导出单条 PDF（这里简化为导出文本）
  const handleExportOne = () => {
    const content = `舆情编号：${opinion.id}
标题：${opinion.title}
作者：${opinion.author}
作者定位地：${opinion.authorLocation}
关键字：${(opinion.keywords || []).join('、')}
来源网站：${opinion.sourceWebsite}
原文地址：${opinion.sourceUrl}
发布时间：${opinion.publishTime}
数据来源：${OpinionDataSourceLabels[opinion.dataSource]}
旅游类别：${TourismCategoryLabels[opinion.tourismCategory]}
情感倾向：${OpinionSentimentLabels[opinion.sentiment]}
风险等级：${OpinionRiskLevelLabels[opinion.riskLevel]}
处置状态：${OpinionHandleStatusLabels[opinion.handleStatus]}
涉及主体：${(opinion.involvedSubjects || []).join('、') || '-'}
备注：${opinion.remark || '-'}

【舆情正文】
${richTextToPlain(opinion.content)}

【处置日志】
${opinion.handleLogs.map((l) => `[${l.time}] ${l.operator} ${OpinionActionLabels[l.action]}：${l.opinion}`).join('\n')}
`
    const blob = new Blob([`\uFEFF${content}`], { type: 'text/plain;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `舆情_${opinion.id}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    // 记录导出日志
    const log: OpinionHandleLog = {
      id: genId('LOG'),
      operator: currentUser.name,
      action: 'export',
      opinion: '导出舆情详情',
      time: nowStr(),
    }
    appendOpinionLog(opinion.id, log)
    message.success('已导出舆情详情')
  }

  const handleLogs = opinion.handleLogs || []

  return (
    <>
      <PageHeader
        title="舆情详情"
        breadcrumb={[
          { title: '首页', path: '/' },
          { title: '舆情管理', path: '/public-opinion' },
          { title: opinion.id },
        ]}
        extra={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
              返回
            </Button>
            <Button icon={<EditOutlined />} onClick={() => navigate(`/public-opinion/${opinion.id}/edit`)}>
              编辑
            </Button>
            <Button icon={<ExportOutlined />} onClick={handleExportOne}>
              导出
            </Button>
          </Space>
        }
      />
      <PageContainer>
        {/* 处置进度 */}
        <Card title="处置进度" size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16} align="middle">
            <Col flex="auto">
              <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                {stepsItems.map((s, i) => {
                  const isCurrent = i === currentStep
                  const isDone = i < currentStep
                  const color = isDone ? '#52c41a' : isCurrent ? '#1677ff' : '#bfbfbf'
                  return (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        flex: 1,
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: color,
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 600,
                          marginBottom: 6,
                        }}
                      >
                        {i + 1}
                      </div>
                      <Text style={{ color, fontWeight: isCurrent ? 600 : 400 }}>{s.title}</Text>
                    </div>
                  )
                })}
              </div>
            </Col>
            <Col>
              <Space direction="vertical" align="end">
                <Tag color={OpinionHandleStatusColors[opinion.handleStatus]}>
                  {OpinionHandleStatusLabels[opinion.handleStatus]}
                </Tag>
                <Button
                  type="primary"
                  size="small"
                  icon={<SettingOutlined />}
                  onClick={openHandleModal}
                >
                  处置
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* 基本信息 */}
        <Card title="基本信息" size="small" style={{ marginBottom: 16 }}>
          <Descriptions column={3} bordered size="small">
            <Descriptions.Item label="舆情编号">{opinion.id}</Descriptions.Item>
            <Descriptions.Item label="舆情标题" span={2}>{opinion.title}</Descriptions.Item>
            <Descriptions.Item label="作者">{opinion.author}</Descriptions.Item>
            <Descriptions.Item label="作者定位地">
              <Tag>{opinion.authorLocation}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="发布时间">{opinion.publishTime}</Descriptions.Item>
            <Descriptions.Item label="来源网站">{opinion.sourceWebsite}</Descriptions.Item>
            <Descriptions.Item label="原文地址" span={2}>
              <a href={opinion.sourceUrl} target="_blank" rel="noreferrer">
                {opinion.sourceUrl}
              </a>
            </Descriptions.Item>
            <Descriptions.Item label="数据来源">
              <Tag color={OpinionDataSourceColors[opinion.dataSource]}>
                {OpinionDataSourceLabels[opinion.dataSource]}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="旅游类别">
              {TourismCategoryLabels[opinion.tourismCategory]}
            </Descriptions.Item>
            <Descriptions.Item label="情感倾向">
              <Tag color={OpinionSentimentColors[opinion.sentiment]}>
                {OpinionSentimentLabels[opinion.sentiment]}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="风险等级">
              <Tag color={OpinionRiskLevelColors[opinion.riskLevel]}>
                {OpinionRiskLevelLabels[opinion.riskLevel]}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="涉及主体" span={3}>
              {(opinion.involvedSubjects || []).length > 0 ? (
                <Space wrap>
                  {opinion.involvedSubjects!.map((s) => (
                    <Tag key={s} color="blue">{s}</Tag>
                  ))}
                </Space>
              ) : (
                '-'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="关键字" span={3}>
              <Space wrap>
                {(opinion.keywords || []).map((k) => (
                  <Tag key={k} color="geekblue">{k}</Tag>
                ))}
              </Space>
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 舆情正文：富文本（图文）渲染，历史纯文本数据按段落展示 */}
        <Card title="舆情正文" size="small" style={{ marginBottom: 16 }}>
          {isRichTextHtml(opinion.content) ? (
            <div
              className="rich-text-content"
              style={{ lineHeight: 1.9, fontSize: 14 }}
              dangerouslySetInnerHTML={{ __html: opinion.content }}
            />
          ) : (
            <Paragraph style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
              {opinion.content}
            </Paragraph>
          )}
          {opinion.remark && (
            <>
              <Divider style={{ margin: '12px 0' }} />
              <Text type="secondary">备注：</Text>
              <Text>{opinion.remark}</Text>
            </>
          )}
        </Card>

        {/* 处置日志 */}
        <Card title="处置日志" size="small">
          {handleLogs.length === 0 ? (
            <Empty description="暂无处置日志" />
          ) : (
            <Timeline
              items={handleLogs.map((log) => ({
                color: logActionColors[log.action] || 'gray',
                children: (
                  <div>
                    <Space>
                      <Text strong>{log.operator}</Text>
                      <Tag color={logActionColors[log.action] || 'default'}>
                        {OpinionActionLabels[log.action]}
                      </Tag>
                      {log.fromStatus && log.toStatus && (
                        <Text type="secondary">
                          {OpinionHandleStatusLabels[log.fromStatus]} → {OpinionHandleStatusLabels[log.toStatus]}
                        </Text>
                      )}
                      <Text type="secondary">{log.time}</Text>
                    </Space>
                    <div style={{ marginTop: 4 }}>
                      <Text>{log.opinion}</Text>
                    </div>
                  </div>
                ),
              }))}
            />
          )}
        </Card>

        {/* 处置弹窗 */}
        <Modal
          title="舆情处置"
          open={handleModal.open}
          onOk={submitHandle}
          onCancel={() => setHandleModal({ open: false })}
          okText="确认"
          cancelText="取消"
        >
          <Form form={handleForm} layout="vertical">
            <Form.Item
              name="handleStatus"
              label="处置状态"
              rules={[{ required: true, message: '请选择处置状态' }]}
            >
              <Select
                placeholder="请选择处置状态"
                options={Object.entries(OpinionHandleStatusLabels).map(([k, v]) => ({
                  value: k,
                  label: v,
                }))}
              />
            </Form.Item>
            <Form.Item
              name="opinion"
              label="处置描述"
              rules={[{ required: true, message: '请输入处置描述' }]}
            >
              <Input.TextArea
                rows={4}
                placeholder="请输入处置方案/处置结果/转办情况/整改说明..."
              />
            </Form.Item>
          </Form>
        </Modal>
      </PageContainer>
    </>
  )
}
