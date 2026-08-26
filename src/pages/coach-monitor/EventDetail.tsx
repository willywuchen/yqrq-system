import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card,
  Row,
  Col,
  Tag,
  Empty,
  Button,
  Space,
  Input,
  App,
  Timeline,
  Typography,
  Descriptions,
} from 'antd'
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  StopOutlined,
  PauseCircleOutlined,
  InboxOutlined,
} from '@ant-design/icons'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import VideoPlayer from '../../components/coach-monitor/VideoPlayer'
import TranscriptViewer from '../../components/coach-monitor/TranscriptViewer'
import EvidenceChainExport from '../../components/coach-monitor/EvidenceChainExport'
import { useStore } from '../../store'
import {
  EventStatusLabels,
  EventStatusColors,
  RiskLevelLabels,
  RiskLevelColors,
  ViolationCategoryLabels,
  type EventAction,
} from '../../types/coach-monitor'

const { TextArea } = Input

/**
 * 风险事件详情页
 * - 左：视频 + 文字稿
 * - 右：事件信息 + 证据链 + 核查处置按钮
 */
export default function EventDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { modal, message } = App.useApp()
  const {
    riskEvents,
    vehicles,
    videoChannels,
    transcripts,
    tracks,
    videoClips,
    evidenceChains,
    currentUser,
    handleRiskEvent,
    archiveRiskEvent,
    appendCoachMonitorLog,
  } = useStore()

  const [seekTo, setSeekTo] = useState<number | null>(null)

  const event = riskEvents.find((e) => e.eventId === id)

  const vehicle = useMemo(
    () => vehicles.find((v) => v.vehicleId === event?.vehicleId),
    [vehicles, event],
  )
  const channels = useMemo(
    () => videoChannels.filter((c) => c.vehicleId === event?.vehicleId),
    [videoChannels, event],
  )
  const eventTranscripts = useMemo(
    () =>
      transcripts.filter(
        (t) => t.vehicleId === event?.vehicleId && t.transcriptId === event?.transcriptId,
      ).concat(
        // 关联上下 10 分钟内的同车文字稿，便于核查上下文
        transcripts.filter((t) => {
          if (t.vehicleId !== event?.vehicleId) return false
          if (t.transcriptId === event?.transcriptId) return false
          const tTime = new Date(t.startTime.replace(/-/g, '/')).getTime()
          const eTime = new Date(event.occurredAt.replace(/-/g, '/')).getTime()
          return Math.abs(tTime - eTime) <= 10 * 60 * 1000
        }),
      ),
    [transcripts, event],
  )
  const eventTracks = useMemo(
    () => tracks.filter((t) => t.vehicleId === event?.vehicleId),
    [tracks, event],
  )
  const eventVideoClips = useMemo(() => {
    if (!event?.videoClipId) return []
    return videoClips.filter((c) => c.clipId === event.videoClipId)
  }, [videoClips, event])
  const evidence = useMemo(
    () => evidenceChains.find((e) => e.eventId === event?.eventId),
    [evidenceChains, event],
  )

  if (!event) {
    return (
      <PageContainer>
        <Empty description="未找到该事件">
          <Button onClick={() => navigate('/coach-monitor/events')}>返回列表</Button>
        </Empty>
      </PageContainer>
    )
  }

  const handleAction = (action: EventAction) => {
    const actionLabels: Record<EventAction, { title: string; okText: string }> = {
      confirm: { title: '确认违规', okText: '确认违规' },
      mark_false: { title: '标记为误报', okText: '标记误报' },
      suspend: { title: '挂起待查', okText: '挂起' },
      archive: { title: '归档并生成证据链', okText: '归档' },
    }
    const config = actionLabels[action]
    let noteValue = ''
    modal.confirm({
      title: config.title,
      content: (
        <div>
          <p>事件编号：{event.eventId}</p>
          <p>车牌：{event.plateNo}</p>
          {action === 'archive' && (
            <p style={{ color: '#fa8c16' }}>
              归档后将打包视频片段 + 文字稿 + 命中规则 + 轨迹点生成证据链。
            </p>
          )}
          <TextArea
            placeholder="请输入核查备注（必填）"
            rows={3}
            onChange={(e) => (noteValue = e.target.value)}
          />
        </div>
      ),
      okText: config.okText,
      cancelText: '取消',
      onOk: () => {
        if (!noteValue.trim()) {
          message.error('请输入核查备注')
          return Promise.reject()
        }
        if (action === 'archive') {
          archiveRiskEvent(event.eventId, currentUser.name, noteValue)
        } else {
          handleRiskEvent(event.eventId, action, currentUser.name, noteValue)
        }
        appendCoachMonitorLog({
          id: `LOG${Date.now()}`,
          operator: currentUser.name,
          operatorRole: currentUser.role,
          action: action === 'archive' ? 'archive_event' : `${action}_event`,
          targetId: event.eventId,
          summary: `${config.title}：${event.eventId}`,
          time: new Date().toISOString().replace('T', ' ').substring(0, 19),
        })
        message.success(`${config.title}成功`)
      },
    })
  }

  const isArchived = event.status === 'archived'
  const actionButtons = (
    <Space wrap>
      <Button
        icon={<CheckCircleOutlined />}
        type="primary"
        danger
        disabled={event.status !== 'pending' && event.status !== 'suspended'}
        onClick={() => handleAction('confirm')}
      >
        确认违规
      </Button>
      <Button
        icon={<StopOutlined />}
        disabled={isArchived}
        onClick={() => handleAction('mark_false')}
      >
        标记误报
      </Button>
      <Button
        icon={<PauseCircleOutlined />}
        disabled={event.status !== 'pending'}
        onClick={() => handleAction('suspend')}
      >
        挂起待查
      </Button>
      <Button
        icon={<InboxOutlined />}
        disabled={event.status === 'pending' || isArchived}
        onClick={() => handleAction('archive')}
      >
        生成证据链归档
      </Button>
      <EvidenceChainExport
        event={event}
        evidence={evidence}
        videoClips={eventVideoClips}
        transcripts={eventTranscripts}
        trackPoints={eventTracks}
      />
    </Space>
  )

  return (
    <>
      <PageHeader
        title={`事件详情 - ${event.eventId}`}
        breadcrumb={[
          { title: '首页', path: '/' },
          { title: '旅游包车智慧监管', path: '/coach-monitor' },
          { title: '风险事件', path: '/coach-monitor/events' },
          { title: event.eventId },
        ]}
        extra={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/coach-monitor/events')}>
              返回列表
            </Button>
            {!isArchived && actionButtons}
          </Space>
        }
      />
      <PageContainer>
        <div style={{ padding: 16 }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={14}>
              <Card size="small" title="车载视频" style={{ marginBottom: 16 }}>
                <VideoPlayer
                  channels={channels}
                  defaultChannelId={event.channelId}
                  seekTo={seekTo}
                />
              </Card>
              <Card size="small" title="语音文字稿（与视频时间轴对齐）">
                <TranscriptViewer
                  transcripts={eventTranscripts}
                  extraKeywords={event.hitKeywords}
                  onTranscriptClick={(t) => {
                    // Mock：跳转到事件发生时间前后
                    const eventTime = new Date(event.occurredAt.replace(/-/g, '/')).getTime()
                    const transcriptTime = new Date(t.startTime.replace(/-/g, '/')).getTime()
                    const offset = Math.max(0, (transcriptTime - eventTime) / 1000)
                    setSeekTo(offset)
                    message.info(`已跳转到 ${t.startTime}`)
                  }}
                />
              </Card>
            </Col>
            <Col xs={24} lg={10}>
              <Card size="small" title="事件信息" style={{ marginBottom: 16 }}>
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="事件编号">{event.eventId}</Descriptions.Item>
                  <Descriptions.Item label="车牌号">
                    <strong>{event.plateNo}</strong>
                    {vehicle && (
                      <Button
                        type="link"
                        size="small"
                        onClick={() => navigate(`/coach-monitor/vehicles/${vehicle.vehicleId}`)}
                      >
                        查看车辆
                      </Button>
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="旅行社">{event.travelAgencyName}</Descriptions.Item>
                  <Descriptions.Item label="违规类别">
                    <Tag>{ViolationCategoryLabels[event.category]}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="风险等级">
                    <Tag color={RiskLevelColors[event.riskLevel]}>{RiskLevelLabels[event.riskLevel]}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="命中规则">{event.ruleName}</Descriptions.Item>
                  <Descriptions.Item label="命中关键词">
                    {event.hitKeywords.length === 0 ? (
                      <span style={{ color: '#999' }}>无</span>
                    ) : (
                      event.hitKeywords.map((k) => (
                        <Tag color="red" key={k} style={{ margin: '0 4px 2px 0' }}>
                          {k}
                        </Tag>
                      ))
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="命中片段">
                    <Typography.Text type="secondary">{event.hitSnippet}</Typography.Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="发生时间">{event.occurredAt}</Descriptions.Item>
                  <Descriptions.Item label="所属区域">{event.regionName}</Descriptions.Item>
                  <Descriptions.Item label="状态">
                    <Tag color={EventStatusColors[event.status]}>
                      {EventStatusLabels[event.status]}
                    </Tag>
                  </Descriptions.Item>
                  {event.handledBy && (
                    <Descriptions.Item label="处置人">{event.handledBy}</Descriptions.Item>
                  )}
                  {event.handleTime && (
                    <Descriptions.Item label="处置时间">{event.handleTime}</Descriptions.Item>
                  )}
                  {event.handleNote && (
                    <Descriptions.Item label="核查备注">{event.handleNote}</Descriptions.Item>
                  )}
                </Descriptions>
              </Card>

              {evidence && (
                <Card size="small" title="证据链" style={{ marginBottom: 16 }}>
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="证据链编号">
                      {evidence.evidenceId}
                    </Descriptions.Item>
                    <Descriptions.Item label="归档人">{evidence.archivedBy}</Descriptions.Item>
                    <Descriptions.Item label="归档时间">{evidence.archivedAt}</Descriptions.Item>
                    <Descriptions.Item label="视频片段">
                      {evidence.videoClipIds.length === 0 ? '无' : evidence.videoClipIds.join(', ')}
                    </Descriptions.Item>
                    <Descriptions.Item label="文字稿">
                      {evidence.transcriptIds.length} 条
                    </Descriptions.Item>
                    <Descriptions.Item label="轨迹点">
                      {evidence.trackPoints.length} 个
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              )}

              <Card size="small" title="事件时间线">
                <Timeline
                  items={[
                    {
                      color: 'blue',
                      children: `事件创建：${event.createTime}`,
                    },
                    ...(event.status === 'confirmed' ||
                    event.status === 'false_positive' ||
                    event.status === 'suspended'
                      ? [
                          {
                            color: event.status === 'confirmed' ? 'red' : event.status === 'false_positive' ? 'gray' : 'orange',
                            children: `${EventStatusLabels[event.status]}：${event.handleTime}（${event.handledBy}）${event.handleNote ? ' - ' + event.handleNote : ''}`,
                          },
                        ]
                      : []),
                    ...(isArchived
                      ? [
                          {
                            color: 'green',
                            children: `生成证据链并归档：${event.handleTime}（${event.handledBy}）`,
                          },
                        ]
                      : []),
                  ]}
                />
              </Card>
            </Col>
          </Row>
        </div>
      </PageContainer>
    </>
  )
}
