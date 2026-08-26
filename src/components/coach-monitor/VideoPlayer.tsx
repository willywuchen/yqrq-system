import { useState, useRef, useEffect } from 'react'
import { Row, Col, Card, Tag, Empty, Button, Spin, App } from 'antd'
import { VideoCameraOutlined, ReloadOutlined } from '@ant-design/icons'
import type { VideoChannel } from '../../types/coach-monitor'
import { ChannelTypeLabels } from '../../types/coach-monitor'

interface VideoPlayerProps {
  channels: VideoChannel[]
  /** 初始选中的通道（如事件详情场景下传入命中的通道） */
  defaultChannelId?: string
  /** 当前播放时间（用于和文字稿联动跳转） */
  onTimeUpdate?: (time: number) => void
  /** 外部跳转到指定时间（秒） */
  seekTo?: number | null
}

/**
 * 多通道视频播放器
 * - 4 通道缩略图列表 + 主播放区
 * - Mock 占位视频源（w3schools mov_bbb.mp4）
 * - 加载失败降级占位 + 重试
 */
export default function VideoPlayer({
  channels,
  defaultChannelId,
  onTimeUpdate,
  seekTo,
}: VideoPlayerProps) {
  const { message } = App.useApp()
  const [activeChannelId, setActiveChannelId] = useState<string | undefined>(
    defaultChannelId || channels.find((c) => c.online)?.channelId,
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const activeChannel = channels.find((c) => c.channelId === activeChannelId)

  // 切换通道重置状态
  useEffect(() => {
    if (activeChannelId) {
      setLoading(true)
      setError(false)
    }
  }, [activeChannelId])

  // 外部跳转
  useEffect(() => {
    if (seekTo != null && videoRef.current) {
      videoRef.current.currentTime = seekTo
    }
  }, [seekTo])

  const handleLoaded = () => {
    setLoading(false)
    setError(false)
  }

  const handleError = () => {
    setLoading(false)
    setError(true)
    message.error('视频流加载失败，请重试')
  }

  const handleRetry = () => {
    if (!activeChannel) return
    setLoading(true)
    setError(false)
    // 强制重新加载 video 元素
    const v = videoRef.current
    if (v) {
      v.load()
    }
  }

  if (channels.length === 0) {
    return <Empty description="该车辆暂无视频通道" />
  }

  return (
    <div>
      <Row gutter={[8, 8]}>
        <Col span={24}>
          <Card
            size="small"
            styles={{ body: { padding: 0, background: '#000' } }}
          >
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
              {loading && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#000',
                  }}
                >
                  <Spin tip="视频加载中..." />
                </div>
              )}
              {error && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#000',
                    color: '#fff',
                    gap: 12,
                  }}
                >
                  <VideoCameraOutlined style={{ fontSize: 48, opacity: 0.3 }} />
                  <div>视频流加载失败</div>
                  <Button icon={<ReloadOutlined />} onClick={handleRetry} size="small">
                    重试
                  </Button>
                </div>
              )}
              {!error && activeChannel?.online && activeChannel.streamUrl && (
                <video
                  ref={videoRef}
                  src={activeChannel.streamUrl}
                  controls
                  onLoadedData={handleLoaded}
                  onError={handleError}
                  onTimeUpdate={(e) => onTimeUpdate?.(e.currentTarget.currentTime)}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    background: '#000',
                  }}
                />
              )}
              {!error && activeChannel && !activeChannel.online && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#333',
                    color: '#aaa',
                    gap: 8,
                  }}
                >
                  <VideoCameraOutlined style={{ fontSize: 48, opacity: 0.3 }} />
                  <div>设备离线</div>
                  <div style={{ fontSize: 12 }}>
                    通道：{ChannelTypeLabels[activeChannel.channelType]}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </Col>
        <Col span={24}>
          <Row gutter={[8, 8]}>
            {channels.map((c) => (
              <Col span={6} key={c.channelId}>
                <Card
                  size="small"
                  hoverable
                  onClick={() => setActiveChannelId(c.channelId)}
                  styles={{
                    body: {
                      padding: 8,
                      background: c.channelId === activeChannelId ? '#e6f4ff' : undefined,
                      border:
                        c.channelId === activeChannelId ? '1px solid #1677ff' : undefined,
                    },
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ fontSize: 12 }}>
                      {ChannelTypeLabels[c.channelType]}
                    </span>
                    <Tag color={c.online ? 'success' : 'default'} style={{ margin: 0 }}>
                      {c.online ? '在线' : '离线'}
                    </Tag>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </Col>
      </Row>
    </div>
  )
}
