import { useMemo, useState, useEffect } from 'react'
import { Card, Empty, Tag, Button, Space, Tooltip, Slider, App } from 'antd'
import { EnvironmentOutlined, PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons'
import type { TrackPoint, Vehicle } from '../../types/coach-monitor'

interface TrackMapProps {
  vehicle?: Vehicle
  points: TrackPoint[]
}

/**
 * 轨迹地图组件
 * - 简化版：使用 SVG 绘制轨迹折线（不引入第三方地图 SDK，便于 Mock 演示）
 * - 支持播放/暂停、进度拖动
 * - 点击轨迹点弹窗显示详情
 * 注：实际对接时替换为高德/百度/leaflet 地图
 */
export default function TrackMap({ vehicle, points }: TrackMapProps) {
  const [playing, setPlaying] = useState(false)
  const [currentIdx, setCurrentIdx] = useState(0)
  const { message } = App.useApp()

  const sorted = useMemo(
    () => [...points].sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
    [points],
  )

  // 计算 SVG 坐标范围
  const bounds = useMemo(() => {
    if (sorted.length === 0) return null
    const lngs = sorted.map((p) => p.lng)
    const lats = sorted.map((p) => p.lat)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    return { minLng, maxLng, minLat, maxLat }
  }, [sorted])

  // 播放推进
  useEffect(() => {
    if (!playing) return
    if (currentIdx >= sorted.length - 1) {
      setPlaying(false)
      return
    }
    const timer = setTimeout(() => setCurrentIdx((i) => i + 1), 1000)
    return () => clearTimeout(timer)
  }, [playing, currentIdx, sorted.length])

  if (sorted.length === 0) {
    return <Empty description="所选时段无轨迹数据" />
  }

  if (!bounds) return null

  const W = 800
  const H = 400
  const padding = 40
  const lngRange = bounds.maxLng - bounds.minLng || 0.01
  const latRange = bounds.maxLat - bounds.minLat || 0.01

  const project = (p: TrackPoint) => {
    const x = padding + ((p.lng - bounds.minLng) / lngRange) * (W - padding * 2)
    // 纬度方向需要反转（地图上北下南）
    const y = padding + ((bounds.maxLat - p.lat) / latRange) * (H - padding * 2)
    return { x, y }
  }

  const path = sorted
    .map((p, i) => {
      const { x, y } = project(p)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  const currentPoint = sorted[currentIdx]
  const currentProj = project(currentPoint)

  const handlePointClick = (p: TrackPoint) => {
    message.info({
      content: (
        <div>
          <div>时间：{p.timestamp}</div>
          <div>经纬度：{p.lng.toFixed(6)}, {p.lat.toFixed(6)}</div>
          {p.speed != null && <div>速度：{p.speed} km/h</div>}
          {p.heading != null && <div>方向角：{p.heading}°</div>}
          {p.location && <div>位置：{p.location}</div>}
        </div>
      ),
      duration: 5,
    })
  }

  return (
    <Card
      size="small"
      title={
        <Space>
          <EnvironmentOutlined />
          <span>
            {vehicle ? `${vehicle.plateNo} 轨迹回放` : '轨迹回放'}
          </span>
          {vehicle && (
            <Tag color="blue">{vehicle.travelAgencyName}</Tag>
          )}
        </Space>
      }
      extra={
        <Space>
          <Button
            icon={playing ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            onClick={() => {
              if (currentIdx >= sorted.length - 1) setCurrentIdx(0)
              setPlaying(!playing)
            }}
          >
            {playing ? '暂停' : '播放'}
          </Button>
        </Space>
      }
    >
      <div style={{ background: '#f5f5f5', borderRadius: 4, padding: 8 }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
          {/* 网格背景 */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e8e8e8" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width={W} height={H} fill="url(#grid)" />

          {/* 轨迹折线 */}
          <path d={path} fill="none" stroke="#1677ff" strokeWidth="3" strokeLinejoin="round" />

          {/* 已经过部分高亮 */}
          {currentIdx > 0 && (
            <path
              d={sorted.slice(0, currentIdx + 1).map((p, i) => {
                const { x, y } = project(p)
                return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
              }).join(' ')}
              fill="none"
              stroke="#52c41a"
              strokeWidth="4"
              strokeLinejoin="round"
            />
          )}

          {/* 轨迹点 */}
          {sorted.map((p, i) => {
            const { x, y } = project(p)
            return (
              <Tooltip key={p.trackId} title={`${p.timestamp} ${p.location || ''}`}>
                <circle
                  cx={x}
                  cy={y}
                  r={4}
                  fill={i === currentIdx ? '#f5222d' : '#1677ff'}
                  stroke="#fff"
                  strokeWidth="1.5"
                  style={{ cursor: 'pointer' }}
                  onClick={() => handlePointClick(p)}
                />
              </Tooltip>
            )
          })}

          {/* 当前点车辆标记 */}
          <g transform={`translate(${currentProj.x}, ${currentProj.y})`}>
            <circle r="10" fill="#f5222d" opacity="0.3" />
            <circle r="6" fill="#f5222d" stroke="#fff" strokeWidth="2" />
          </g>
        </svg>
      </div>

      <div style={{ marginTop: 12 }}>
        <Slider
          min={0}
          max={sorted.length - 1}
          value={currentIdx}
          onChange={setCurrentIdx}
          tooltip={{
            formatter: () => sorted[currentIdx]?.timestamp || '',
          }}
        />
        <div style={{ textAlign: 'center', color: '#666', fontSize: 12 }}>
          {currentPoint.timestamp} · {currentPoint.location || `${currentPoint.lng.toFixed(4)}, ${currentPoint.lat.toFixed(4)}`}
          {currentPoint.speed != null && ` · ${currentPoint.speed} km/h`}
        </div>
      </div>
    </Card>
  )
}
