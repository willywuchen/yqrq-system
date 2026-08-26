import { useMemo, useState } from 'react'
import { Input, Empty, Tag, Typography } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import type { Transcript } from '../../types/coach-monitor'

interface TranscriptViewerProps {
  transcripts: Transcript[]
  /** 高亮关键词（除 transcript 自带 keywords 外的额外关键词） */
  extraKeywords?: string[]
  /** 点击某条文字稿时回调（用于跳转视频） */
  onTranscriptClick?: (t: Transcript) => void
}

/**
 * 语音文字稿展示组件
 * - 时间倒序展示
 * - 关键词高亮（红色背景）
 * - 支持全文搜索
 * - 点击跳转视频
 */
export default function TranscriptViewer({
  transcripts,
  extraKeywords = [],
  onTranscriptClick,
}: TranscriptViewerProps) {
  const [keyword, setKeyword] = useState('')

  const filtered = useMemo(() => {
    const sorted = [...transcripts].sort((a, b) =>
      b.startTime.localeCompare(a.startTime),
    )
    if (!keyword) return sorted
    const kw = keyword.toLowerCase()
    return sorted.filter((t) => t.text.toLowerCase().includes(kw))
  }, [transcripts, keyword])

  if (transcripts.length === 0) {
    return <Empty description="文字稿待厂商推送" />
  }

  // 渲染高亮文本
  const renderText = (text: string, keywords: string[]) => {
    if (keywords.length === 0) return text
    const escaped = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    const regex = new RegExp(`(${escaped.join('|')})`, 'gi')
    const parts = text.split(regex)
    return parts.map((part, i) => {
      if (keywords.some((k) => k.toLowerCase() === part.toLowerCase())) {
        return (
          <Tag key={i} color="red" style={{ margin: '0 2px' }}>
            {part}
          </Tag>
        )
      }
      return <span key={i}>{part}</span>
    })
  }

  return (
    <div>
      <Input
        placeholder="搜索文字稿内容"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        prefix={<SearchOutlined />}
        allowClear
        style={{ marginBottom: 12 }}
      />
      {filtered.length === 0 ? (
        <Empty description={`未找到包含「${keyword}」的文字稿`} />
      ) : (
        <div style={{ maxHeight: 480, overflowY: 'auto', paddingRight: 8 }}>
          {filtered.map((t) => {
            const allKeywords = [...new Set([...(t.keywords || []), ...extraKeywords])]
            return (
              <div
                key={t.transcriptId}
                onClick={() => onTranscriptClick?.(t)}
                style={{
                  padding: '8px 12px',
                  marginBottom: 8,
                  background: '#fafafa',
                  borderRadius: 4,
                  borderLeft: '3px solid #1677ff',
                  cursor: onTranscriptClick ? 'pointer' : 'default',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 12,
                    color: '#999',
                    marginBottom: 4,
                  }}
                >
                  <span>
                    {t.startTime} ~ {t.endTime}
                  </span>
                  {t.confidence != null && (
                    <span>置信度：{(t.confidence * 100).toFixed(0)}%</span>
                  )}
                </div>
                <Typography.Paragraph style={{ margin: 0 }}>
                  {renderText(t.text, allKeywords)}
                </Typography.Paragraph>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
