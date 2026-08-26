import { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Descriptions, Tabs, Tag, Table, Button, Empty, Card, App } from 'antd'
import { ArrowLeftOutlined, EnvironmentOutlined, VideoCameraOutlined, FileTextOutlined } from '@ant-design/icons'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import VideoPlayer from '../../components/coach-monitor/VideoPlayer'
import TranscriptViewer from '../../components/coach-monitor/TranscriptViewer'
import TrackMap from '../../components/coach-monitor/TrackMap'
import { useStore } from '../../store'
import {
  VehicleStatusLabels,
  VehicleStatusColors,
  VehicleTypeLabels,
  RegionLevelLabels,
  EventStatusLabels,
  EventStatusColors,
  ViolationCategoryLabels,
  RiskLevelLabels,
  RiskLevelColors,
  type RiskEvent,
} from '../../types/coach-monitor'

/**
 * 车辆详情页
 * - 含车辆基本信息、视频、文字稿、轨迹、关联事件多标签
 */
export default function VehicleDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const {
    vehicles,
    videoChannels,
    transcripts,
    tracks,
    riskEvents,
  } = useStore()

  const vehicle = vehicles.find((v) => v.vehicleId === id)

  const channels = useMemo(
    () => videoChannels.filter((c) => c.vehicleId === id),
    [videoChannels, id],
  )
  const vehicleTranscripts = useMemo(
    () => transcripts.filter((t) => t.vehicleId === id),
    [transcripts, id],
  )
  const vehicleTracks = useMemo(
    () => tracks.filter((t) => t.vehicleId === id),
    [tracks, id],
  )
  const vehicleEvents = useMemo(
    () => riskEvents.filter((e) => e.vehicleId === id),
    [riskEvents, id],
  )

  if (!vehicle) {
    return (
      <PageContainer>
        <Empty description="未找到车辆">
          <Button onClick={() => navigate('/coach-monitor/vehicles')}>返回列表</Button>
        </Empty>
      </PageContainer>
    )
  }

  const eventColumns = [
    { title: '事件编号', dataIndex: 'eventId', width: 160,
      render: (v: string) => <a onClick={() => navigate(`/coach-monitor/events/${v}`)}>{v}</a> },
    { title: '发生时间', dataIndex: 'occurredAt', width: 160 },
    { title: '违规类别', dataIndex: 'category', width: 110,
      render: (c: RiskEvent['category']) => ViolationCategoryLabels[c] },
    { title: '风险等级', dataIndex: 'riskLevel', width: 90,
      render: (l: RiskEvent['riskLevel']) => <Tag color={RiskLevelColors[l]}>{RiskLevelLabels[l]}</Tag> },
    { title: '状态', dataIndex: 'status', width: 110,
      render: (s: RiskEvent['status']) => <Tag color={EventStatusColors[s]}>{EventStatusLabels[s]}</Tag> },
  ]

  return (
    <>
      <PageHeader
        title={`车辆详情 - ${vehicle.plateNo}`}
        breadcrumb={[
          { title: '首页', path: '/' },
          { title: '旅游包车智慧监管', path: '/coach-monitor' },
          { title: '车辆档案', path: '/coach-monitor/vehicles' },
          { title: vehicle.plateNo },
        ]}
        extra={
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/coach-monitor/vehicles')}>
            返回列表
          </Button>
        }
      />
      <PageContainer>
        <div style={{ padding: 16 }}>
          <Card size="small" style={{ marginBottom: 16 }}>
            <Descriptions size="small" column={{ xs: 1, sm: 2, md: 3, lg: 4 }}>
              <Descriptions.Item label="车牌号">
                <strong>{vehicle.plateNo}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="车型">{VehicleTypeLabels[vehicle.vehicleType]}</Descriptions.Item>
              <Descriptions.Item label="核载人数">{vehicle.seatCount}</Descriptions.Item>
              <Descriptions.Item label="所属旅行社">{vehicle.travelAgencyName || '-'}</Descriptions.Item>
              <Descriptions.Item label="车载终端">{vehicle.deviceId || '-'}</Descriptions.Item>
              <Descriptions.Item label="监管层级">{RegionLevelLabels[vehicle.regionLevel]}</Descriptions.Item>
              <Descriptions.Item label="所属区域">{vehicle.regionName}</Descriptions.Item>
              <Descriptions.Item label="在线状态">
                {vehicle.online ? <Tag color="success">在线</Tag> : <Tag>离线</Tag>}
              </Descriptions.Item>
              <Descriptions.Item label="车辆状态">
                <Tag color={VehicleStatusColors[vehicle.status]}>{VehicleStatusLabels[vehicle.status]}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="更新时间">{vehicle.updateTime}</Descriptions.Item>
            </Descriptions>
          </Card>

          <Tabs
            defaultActiveKey="video"
            items={[
              {
                key: 'video',
                label: (
                  <span>
                    <VideoCameraOutlined /> 车载视频
                  </span>
                ),
                children: (
                  <VideoPlayer channels={channels} />
                ),
              },
              {
                key: 'transcript',
                label: (
                  <span>
                    <FileTextOutlined /> 语音文字稿（{vehicleTranscripts.length}）
                  </span>
                ),
                children: (
                  <TranscriptViewer
                    transcripts={vehicleTranscripts}
                    onTranscriptClick={(t) =>
                      message.info(`跳转到文字稿：${t.startTime}`)
                    }
                  />
                ),
              },
              {
                key: 'track',
                label: (
                  <span>
                    <EnvironmentOutlined /> 历史轨迹（{vehicleTracks.length}）
                  </span>
                ),
                children: <TrackMap vehicle={vehicle} points={vehicleTracks} />,
              },
              {
                key: 'events',
                label: `关联风险事件（${vehicleEvents.length}）`,
                children: (
                  <Table
                    size="small"
                    rowKey="eventId"
                    columns={eventColumns}
                    dataSource={vehicleEvents}
                    pagination={{ pageSize: 5 }}
                    locale={{ emptyText: '该车辆暂无关联风险事件' }}
                  />
                ),
              },
            ]}
          />
        </div>
      </PageContainer>
    </>
  )
}
