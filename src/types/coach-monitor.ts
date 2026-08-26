// ========== 旅游包车智慧监管 ==========
// 文档对齐：docs/2026-08-24-旅游包车视频监管-PRD.md §5

// 监管层级（数据权限维度）
export type RegionLevel = 'province' | 'city' | 'county'

export const RegionLevelLabels: Record<RegionLevel, string> = {
  province: '省级',
  city: '市级',
  county: '县级',
}

// 车辆状态
export type VehicleStatus = 'operating' | 'stopped' | 'scrapped'

export const VehicleStatusLabels: Record<VehicleStatus, string> = {
  operating: '运营中',
  stopped: '停运',
  scrapped: '报废',
}

export const VehicleStatusColors: Record<VehicleStatus, string> = {
  operating: 'success',
  stopped: 'default',
  scrapped: 'error',
}

// 车型
export type VehicleType = 'bus' | 'minibus' | 'car'

export const VehicleTypeLabels: Record<VehicleType, string> = {
  bus: '大巴',
  minibus: '中巴',
  car: '小车',
}

// 视频通道
export type ChannelType = 'front' | 'rear' | 'driver' | 'guide'

export const ChannelTypeLabels: Record<ChannelType, string> = {
  front: '前视',
  rear: '后视',
  driver: '驾驶位',
  guide: '导游位',
}

// ========== 车辆档案 ==========
export interface Vehicle {
  vehicleId: string
  plateNo: string
  vehicleType: VehicleType
  seatCount: number
  travelAgencyId: string
  travelAgencyName?: string
  deviceId?: string
  regionLevel: RegionLevel
  regionCode: string
  regionName: string
  status: VehicleStatus
  online?: boolean
  createTime: string
  updateTime: string
}

// ========== 轨迹点 ==========
export interface TrackPoint {
  trackId: string
  vehicleId: string
  timestamp: string
  lng: number
  lat: number
  speed?: number
  heading?: number
  location?: string
}

// ========== 视频通道 ==========
export interface VideoChannel {
  channelId: string
  vehicleId: string
  channelType: ChannelType
  streamUrl?: string
  online: boolean
}

// 视频片段（按事件/时段转存）
export interface VideoClip {
  clipId: string
  vehicleId: string
  channelId: string
  startTime: string
  endTime: string
  url?: string
  createdBy: string
  createTime: string
}

// ========== 语音文字稿 ==========
export interface Transcript {
  transcriptId: string
  vehicleId: string
  channelId: string
  startTime: string
  endTime: string
  text: string
  confidence?: number
  keywords?: string[]
  createTime: string
}

// ========== 风险识别规则 ==========
export type RuleType = 'keyword' | 'template' | 'frequency'

export const RuleTypeLabels: Record<RuleType, string> = {
  keyword: '关键词命中',
  template: '话术模板',
  frequency: '频次规则',
}

export type RiskLevel = 'high' | 'medium' | 'low'

export const RiskLevelLabels: Record<RiskLevel, string> = {
  high: '高',
  medium: '中',
  low: '低',
}

export const RiskLevelColors: Record<RiskLevel, string> = {
  high: 'red',
  medium: 'orange',
  low: 'blue',
}

// 违规类别
export type ViolationCategory =
  | 'peddling' // 兜售商品
  | 'forced_consumption' // 强制消费
  | 'false_advertising' // 虚假宣传
  | 'itinerary_change' // 变更行程

export const ViolationCategoryLabels: Record<ViolationCategory, string> = {
  peddling: '兜售商品',
  forced_consumption: '强制消费',
  false_advertising: '虚假宣传',
  itinerary_change: '变更行程',
}

export interface RiskRule {
  ruleId: string
  ruleName: string
  ruleType: RuleType
  pattern: {
    keywords?: string[]
    windowSeconds?: number
    minCount?: number
  }
  riskLevel: RiskLevel
  category: ViolationCategory
  enabled: boolean
  hitCount?: number
  createdBy: string
  createTime: string
  updateTime: string
}

// ========== 风险事件 ==========
export type EventStatus =
  | 'pending' // 待核查
  | 'confirmed' // 已确认违规
  | 'false_positive' // 误报
  | 'suspended' // 挂起待查
  | 'archived' // 已归档

export const EventStatusLabels: Record<EventStatus, string> = {
  pending: '待核查',
  confirmed: '已确认违规',
  false_positive: '误报',
  suspended: '挂起待查',
  archived: '已归档',
}

export const EventStatusColors: Record<EventStatus, string> = {
  pending: 'warning',
  confirmed: 'error',
  false_positive: 'default',
  suspended: 'processing',
  archived: 'default',
}

// 事件处置动作
export type EventAction = 'confirm' | 'mark_false' | 'suspend' | 'archive'

export const EventActionLabels: Record<EventAction, string> = {
  confirm: '确认违规',
  mark_false: '标记误报',
  suspend: '挂起待查',
  archive: '归档',
}

// 证据链
export interface EvidenceChain {
  evidenceId: string
  eventId: string
  vehicleId: string
  videoClipIds: string[]
  transcriptIds: string[]
  ruleId: string
  hitKeywords: string[]
  occurredAt: string
  trackPoints: TrackPoint[]
  archivedBy: string
  archivedAt: string
  note?: string
}

// 风险事件
export interface RiskEvent {
  eventId: string
  vehicleId: string
  plateNo: string
  travelAgencyName: string
  ruleId: string
  ruleName: string
  category: ViolationCategory
  riskLevel: RiskLevel
  transcriptId: string
  videoClipId?: string
  channelId?: string
  occurredAt: string
  regionLevel: RegionLevel
  regionCode: string
  regionName: string
  hitKeywords: string[]
  hitSnippet: string
  status: EventStatus
  evidenceChainId?: string
  handledBy?: string
  handleNote?: string
  handleTime?: string
  createTime: string
}

// ========== 操作日志 ==========
export interface CoachMonitorOperationLog {
  id: string
  operator: string
  operatorRole: string
  action: string
  targetId?: string
  summary: string
  time: string
}
