// ========== 学习培训管理 ==========
// 文档对齐：2026-08-25-学习培训管理-PRD.md §5

import type { UserRole, Attachment } from './index'

// 资料层级（发布主体行政层级）
export type TrainingLevel = 'national' | 'provincial' | 'departmental'

export const TrainingLevelLabels: Record<TrainingLevel, string> = {
  national: '国家级',
  provincial: '省级',
  departmental: '厅级',
}

export const TrainingLevelColors: Record<TrainingLevel, string> = {
  national: 'red',
  provincial: 'blue',
  departmental: 'cyan',
}

// 资料形式
export type TrainingMediaType = 'rich_text' | 'video' | 'audio'

export const TrainingMediaTypeLabels: Record<TrainingMediaType, string> = {
  rich_text: '图文',
  video: '视频',
  audio: '音频',
}

// 资料状态（生命周期：草稿 → 已发布 → 已下架，见 PRD §3.3）
export type TrainingMaterialStatus = 'draft' | 'published' | 'offline'

export const TrainingMaterialStatusLabels: Record<TrainingMaterialStatus, string> = {
  draft: '草稿',
  published: '已发布',
  offline: '已下架',
}

export const TrainingMaterialStatusColors: Record<TrainingMaterialStatus, string> = {
  draft: 'default',
  published: 'success',
  offline: 'warning',
}

// 分类状态
export type TrainingCategoryStatus = 'enabled' | 'disabled'

export const TrainingCategoryStatusLabels: Record<TrainingCategoryStatus, string> = {
  enabled: '启用中',
  disabled: '已停用',
}

// 学习资料分类（单级，可维护）
export interface TrainingCategory {
  id: string
  name: string // 2-20 字
  sort: number // 0-999，越小越靠前
  status: TrainingCategoryStatus
  createTime: string
}

// 学习资料
export interface TrainingMaterial {
  id: string
  title: string // 1-60 字
  categoryId: string
  level: TrainingLevel
  mediaType: TrainingMediaType
  summary?: string // 0-200 字
  coverUrl?: string
  content?: string // 图文富文本 HTML
  videoUrl?: string
  videoDuration?: number // 秒，上传后自动读取
  audioUrl?: string
  audioDuration?: number // 秒，上传后自动读取
  attachments: Attachment[] // ≤5 个，单个 ≤20MB
  source?: string // 资料来源，如"文化和旅游部官网"
  status: TrainingMaterialStatus
  isTop: boolean
  viewCount: number
  publishTime?: string // 发布/重新发布时间
  createBy: string
  createTime: string
  updateBy?: string
  updateTime?: string
}

// 可管理学习培训资料的角色（省文旅厅 + 系统管理员）
export const TRAINING_MANAGER_ROLES: UserRole[] = ['final_reviewer', 'admin']

export function isTrainingManagerRole(role: UserRole): boolean {
  return TRAINING_MANAGER_ROLES.includes(role)
}

// 分类数量上限（PRD §5.1）
export const TRAINING_CATEGORY_LIMIT = 50

// 上传限制（PRD §5.2 数据规范；富文本内嵌图片 ≤2MB 由 RichTextEditor 统一控制）
export const TRAINING_UPLOAD_LIMITS = {
  coverMaxMB: 5,
  videoMaxMB: 500,
  audioMaxMB: 50,
  attachmentMaxMB: 20,
  attachmentMaxCount: 5,
  contentMaxLength: 50000,
} as const
