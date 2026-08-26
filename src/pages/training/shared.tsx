import { Tag } from 'antd'
import {
  EyeOutlined,
  FileTextOutlined,
  SoundOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons'
import type { ReactNode } from 'react'
import {
  TrainingLevelColors,
  TrainingLevelLabels,
  TrainingMediaTypeLabels,
  type TrainingLevel,
  type TrainingMediaType,
} from '../../types/training'

// 时长格式化：215 → "3:35"，3725 → "1:02:05"
// oxlint-disable-next-line only-export-components
export function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return '-'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`
}

export function LevelTag({ level }: { level: TrainingLevel }) {
  return <Tag color={TrainingLevelColors[level]}>{TrainingLevelLabels[level]}</Tag>
}

export function MediaTypeIcon({ mediaType }: { mediaType: TrainingMediaType }): ReactNode {
  if (mediaType === 'video') return <VideoCameraOutlined />
  if (mediaType === 'audio') return <SoundOutlined />
  return <FileTextOutlined />
}

export function MediaTypeTag({ mediaType }: { mediaType: TrainingMediaType }) {
  return (
    <Tag icon={<MediaTypeIcon mediaType={mediaType} />}>{TrainingMediaTypeLabels[mediaType]}</Tag>
  )
}

export function ViewCount({ count }: { count: number }) {
  return (
    <span style={{ color: '#999', fontSize: 12 }}>
      <EyeOutlined style={{ marginRight: 4 }} />
      {count}
    </span>
  )
}

// 无封面时的默认封面：按资料形式展示渐变底 + 图标
const defaultCoverStyles: Record<TrainingMediaType, { background: string; icon: ReactNode }> = {
  rich_text: {
    background: 'linear-gradient(135deg, #1677ff 0%, #69b1ff 100%)',
    icon: <FileTextOutlined />,
  },
  video: {
    background: 'linear-gradient(135deg, #722ed1 0%, #b37feb 100%)',
    icon: <VideoCameraOutlined />,
  },
  audio: {
    background: 'linear-gradient(135deg, #13c2c2 0%, #5cdbd3 100%)',
    icon: <SoundOutlined />,
  },
}

export function MediaCover({
  mediaType,
  coverUrl,
  height = 140,
  iconSize = 40,
}: {
  mediaType: TrainingMediaType
  coverUrl?: string
  height?: number
  iconSize?: number
}) {
  if (coverUrl) {
    return (
      <img
        src={coverUrl}
        alt="封面"
        style={{ width: '100%', height, objectFit: 'cover', display: 'block' }}
      />
    )
  }
  const style = defaultCoverStyles[mediaType]
  return (
    <div
      style={{
        width: '100%',
        height,
        background: style.background,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'rgba(255,255,255,0.9)',
        fontSize: iconSize,
      }}
    >
      {style.icon}
    </div>
  )
}
