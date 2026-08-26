import { useEffect, useRef, useState } from 'react'
import { Tag } from 'antd'
import {
  NotificationOutlined,
  PushpinOutlined,
} from '@ant-design/icons'
import type { ReactNode } from 'react'
import {
  AnnouncementStatusColors,
  AnnouncementStatusLabels,
  AnnouncementTargetShortLabels,
  type Announcement,
  type AnnouncementStatus,
  type AnnouncementTarget,
} from '../../types/announcements'
import { GUIZHOU_REGION_TREE } from '../../mock/announcements'

// 强制阅读标签
export function ForceReadTag() {
  return (
    <Tag color="red" icon={<NotificationOutlined />}>
      强制阅读
    </Tag>
  )
}

// 置顶标签
export function TopTag() {
  return (
    <Tag color="orange" icon={<PushpinOutlined />}>
      置顶
    </Tag>
  )
}

// 状态标签
export function StatusTag({ status }: { status: AnnouncementStatus }) {
  return <Tag color={AnnouncementStatusColors[status]}>{AnnouncementStatusLabels[status]}</Tag>
}

// 发布对象标签组
export function TargetTags({ targets }: { targets: AnnouncementTarget[] }) {
  if (targets.length === 0) return <span style={{ color: '#999' }}>—</span>
  return (
    <>
      {targets.map((t) => (
        <Tag key={t} color={t === 'dept_account' ? 'geekblue' : t === 'erp' ? 'purple' : 'green'}>
          {AnnouncementTargetShortLabels[t]}
        </Tag>
      ))}
    </>
  )
}

// 无封面时的默认封面：按分类配色的渐变 + 光斑装饰 + 发布单位落款（不使用图标）
const categoryCoverColors: Record<string, [string, string]> = {
  'anc-cat-law': ['#4c1d95', '#8b5cf6'],
  'anc-cat-policy': ['#1d4ed8', '#60a5fa'],
  'anc-cat-notice': ['#b91c1c', '#f87171'],
  'anc-cat-industry': ['#0f766e', '#2dd4bf'],
}

export function AnnouncementCover({
  announcement,
  height = 140,
}: {
  announcement: Announcement
  height?: number
}) {
  if (announcement.coverUrl) {
    return (
      <img
        src={announcement.coverUrl}
        alt="封面"
        style={{ width: '100%', height, objectFit: 'cover', display: 'block' }}
      />
    )
  }
  const [from, to] = categoryCoverColors[announcement.categoryId] || ['#1d4ed8', '#60a5fa']
  return (
    <div
      style={{
        width: '100%',
        height,
        position: 'relative',
        background: [
          'radial-gradient(circle at 82% 18%, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0) 42%)',
          'radial-gradient(circle at 16% 86%, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 38%)',
          `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
        ].join(', '),
      }}
    >
      {/* 顶部细线装饰 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: 'rgba(255,255,255,0.35)',
        }}
      />
      {/* 发布单位落款 */}
      <span
        style={{
          position: 'absolute',
          left: 12,
          bottom: 10,
          color: 'rgba(255,255,255,0.85)',
          fontSize: 12,
          letterSpacing: 1,
        }}
      >
        贵州省文化和旅游厅
      </span>
    </div>
  )
}

// 市州/区县编码 → 区划名称（供已读名单展示注册地）
export function districtNameOf(cityCode: string, districtCode: string): string {
  const city = GUIZHOU_REGION_TREE.find((c) => c.code === cityCode)
  if (!city) return '—'
  const district = city.districts.find((d) => d.code === districtCode)
  return district ? `${city.name}${district.name}` : city.name
}

/**
 * 滚动到底检测的富文本内容区（强制阅读确认门槛，PRD §5.7/§5.8）
 * - 正文滚动至底部（scrollTop + 可视高度 ≥ 总高度）时触发 onReachBottom
 * - 正文不足一屏（无滚动条）时挂载即触发
 * - 内容变化（切换公告）时重置，需重新滚动到底
 */
export function ScrollBottomArea({
  html,
  height,
  onReachBottom,
  bottomReached,
  children,
}: {
  html: string
  height: number | string
  onReachBottom: () => void
  bottomReached: boolean
  children?: (reached: boolean) => ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [reached, setReached] = useState(false)

  // 内容变化时重置滚动进度
  useEffect(() => {
    setReached(false)
    const el = ref.current
    if (el) el.scrollTop = 0
  }, [html])

  // 正文不足一屏（无滚动条）：挂载即视为到底；用 ResizeObserver 兜底
  // 弹窗缩放动画、图片加载等布局变化稳定后再次判定，避免挂载瞬间误判
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const check = () => {
      if (el.scrollHeight <= el.clientHeight + 8) {
        setReached(true)
        onReachBottom()
      }
    }
    check()
    const observer = new ResizeObserver(check)
    observer.observe(el)
    return () => observer.disconnect()
  }, [html]) // eslint-disable-line react-hooks/exhaustive-deps

  const checkScroll = () => {
    if (reached) return
    const el = ref.current
    if (!el) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) {
      setReached(true)
      onReachBottom()
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={ref}
        className="rich-text-content"
        onScroll={checkScroll}
        style={{
          height,
          overflowY: 'auto',
          padding: '12px 4px',
          background: '#fff',
          borderRadius: 6,
          border: '1px solid #f0f0f0',
        }}
      >
        <div dangerouslySetInnerHTML={{ __html: html || '（无内容）' }} />
      </div>
      {children?.(reached || bottomReached)}
    </div>
  )
}
