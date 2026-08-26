// ========== 公告发布管理 ==========
// 文档对齐：2026-08-25-公告发布管理-PRD.md（V1.2）§5

import type { UserRole, Attachment } from './index'

// 发布对象（多选，PRD §1.2）
export type AnnouncementTarget = 'erp' | 'dept_account' | 'agency_user'

export const AnnouncementTargetLabels: Record<AnnouncementTarget, string> = {
  erp: '旅行社ERP系统',
  dept_account: '文旅监管平台·厅内账号',
  agency_user: '文旅监管平台·旅行社账号',
}

// 列表 Tag 用的短标签
export const AnnouncementTargetShortLabels: Record<AnnouncementTarget, string> = {
  erp: 'ERP系统',
  dept_account: '厅内账号',
  agency_user: '旅行社账号',
}

// 发布区域（三级单选，仅对旅行社侧对象生效，PRD §1.2/§2.3）
export type AnnouncementRegionLevel = 'province' | 'city' | 'district'

export interface AnnouncementRegion {
  level: AnnouncementRegionLevel
  code: string // 省 520000 / 市州 / 区县行政区划代码
  name: string
}

// 公告状态（生命周期：草稿 → 已发布 → 已下架，PRD §3.5）
export type AnnouncementStatus = 'draft' | 'published' | 'offline'

export const AnnouncementStatusLabels: Record<AnnouncementStatus, string> = {
  draft: '草稿',
  published: '已发布',
  offline: '已下架',
}

export const AnnouncementStatusColors: Record<AnnouncementStatus, string> = {
  draft: 'default',
  published: 'success',
  offline: 'warning',
}

// 分类状态
export type AnnouncementCategoryStatus = 'enabled' | 'disabled'

export const AnnouncementCategoryStatusLabels: Record<AnnouncementCategoryStatus, string> = {
  enabled: '启用中',
  disabled: '已停用',
}

// 公告分类（单级，可维护，预置 4 类）
export interface AnnouncementCategory {
  id: string
  name: string // 2-20 字
  sort: number // 0-999，越小越靠前
  status: AnnouncementCategoryStatus
  createTime: string
}

// 公告
export interface Announcement {
  id: string
  title: string // 1-100 字
  categoryId: string
  summary?: string // 0-200 字
  coverUrl?: string // jpg/png，≤5MB，建议 2:1
  content?: string // 图文富文本 HTML
  attachments: Attachment[] // ≤5 个，单个 ≤20MB
  isTop: boolean
  isForceRead: boolean // 强制阅读：未确认前登录弹窗 + 红点 + 徽标持续提醒
  targets: AnnouncementTarget[] // 发布对象，发布时至少 1 项
  region: AnnouncementRegion // 发布区域，默认贵州省全省
  status: AnnouncementStatus
  viewCount: number
  publishTime?: string // 发布/重新发布时间
  createBy: string
  createTime: string
  updateBy?: string
  updateTime?: string
}

// 阅读记录（公告主表 + 阅读记录表，PRD §5.5）
export type AnnouncementConfirmMethod = 'force_confirm' | 'detail_open'

export interface AnnouncementReadRecord {
  id: string
  announcementId: string
  userId: string // 厅内/旅行社账号 id（见 mock/announcements.ts 账号目录）
  userName: string
  userType: 'dept' | 'agency'
  orgName: string
  confirmMethod: AnnouncementConfirmMethod // 强制确认 / 打开详情
  readTime: string
}

// 可管理公告的角色（终审 + 管理员；初/复审不参与本模块，PRD V1.2 §2.1）
export const ANNOUNCEMENT_MANAGER_ROLES: UserRole[] = ['final_reviewer', 'admin']

export function isAnnouncementManagerRole(role: UserRole): boolean {
  return ANNOUNCEMENT_MANAGER_ROLES.includes(role)
}

// 可作为公告接收对象的角色（旅行社 + 厅内终审/管理员；初/复审不参与）
export function isAnnouncementReceiverRole(role: UserRole): boolean {
  return role === 'applicant' || isAnnouncementManagerRole(role)
}

// 数量与上传限制（PRD §5.1/§5.2）
export const ANNOUNCEMENT_LIMITS = {
  categoryLimit: 20,
  titleMaxLength: 100,
  summaryMaxLength: 200,
  contentMaxLength: 50000,
  coverMaxMB: 5,
  attachmentMaxMB: 20,
  attachmentMaxCount: 5,
  topSuggest: 3, // 置顶建议上限（软提示，不阻断）
} as const
