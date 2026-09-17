// ========== 投诉管理处置模块（独立于投诉台账） ==========
// 数据来源：①游客扫「贵州旅游服务质量码」提交投诉；②「一团一码」投诉（自动带入投诉对象的旅行社/导游信息）
// 流程：游客提交 → 按所诉区域（市州+区县，区县可选）自动分派至对应区县/市州文旅局 → 无需受理直接处置；
// 无处置时限，但自接收起动态计时，处置完成即停止计时；省文旅厅查看全部数据并可督办，市州可查看并处置本市州（含区县级）数据
import { GUIZHOU_CITIES, GUIZHOU_DISTRICTS } from './index'

// 区县列表（模块内使用；页面从本文件导入）
export { GUIZHOU_DISTRICTS } from './index'

// 投诉来源（渠道）
export type DisposalComplaintSource = 'qr_service_code' | 'group_code'

export const DisposalComplaintSourceLabels: Record<DisposalComplaintSource, string> = {
  qr_service_code: '服务质量码',
  group_code: '一团一码',
}

export const DisposalComplaintSourceColors: Record<DisposalComplaintSource, string> = {
  qr_service_code: 'blue',
  group_code: 'purple',
}

// 投诉类型（与游客填报页「投诉类型」多选项一致，可多选）
export type DisposalCategory =
  | 'travel_agency' // 旅行社
  | 'tour_guide' // 导游人员
  | 'scenic_area' // 景区景点
  | 'hotel_homestay' // 酒店民宿
  | 'tourism_transport' // 旅游交通
  | 'tourism_shopping' // 旅游购物
  | 'culture_leisure' // 文化休闲
  | 'online_travel_platform' // 在线旅游平台
  | 'cultural_market' // 文化市场
  | 'other' // 其他

export const DisposalCategoryLabels: Record<DisposalCategory, string> = {
  travel_agency: '旅行社',
  tour_guide: '导游人员',
  scenic_area: '景区景点',
  hotel_homestay: '酒店民宿',
  tourism_transport: '旅游交通',
  tourism_shopping: '旅游购物',
  culture_leisure: '文化休闲',
  online_travel_platform: '在线旅游平台',
  cultural_market: '文化市场',
  other: '其他',
}

// 处置状态：无受理环节，仅 待处置 / 已处置 两态
export type DisposalStatus = 'pending' | 'disposed'

export const DisposalStatusLabels: Record<DisposalStatus, string> = {
  pending: '待处置',
  disposed: '已处置',
}

export const DisposalStatusColors: Record<DisposalStatus, string> = {
  pending: 'error',
  disposed: 'success',
}

// 处置结果（市州处置时选择）
export type DisposalResult =
  | 'mediation' // 调解和解
  | 'rectification' // 责令整改
  | 'law_transfer' // 移送执法
  | 'explanation' // 已解释说明
  | 'unfounded' // 情况不属实

export const DisposalResultLabels: Record<DisposalResult, string> = {
  mediation: '调解和解',
  rectification: '责令整改',
  law_transfer: '移送执法',
  explanation: '已解释说明',
  unfounded: '情况不属实',
}

// 处置结果展示文本：预设项映射中文，手动输入的原样展示
export function disposalResultText(result: string): string {
  return (DisposalResultLabels as Record<string, string>)[result] ?? result
}

// 处置记录（市州提交处置时写入，写入后计时停止）
// result 为处置结果文本：可从预设项（DisposalResultLabels）中选择，也支持市州手动输入
export interface DisposalRecord {
  result: string
  description: string // 处置说明
  attachments?: string[] // 佐证附件文件名（非必填，演示数据仅登记文件名）
  handler: string // 处置人
  handlerOrg: string // 处置单位（市州文旅局）
  disposedAt: string // 处置完成时间（计时截止点）
}

// 督办记录（省文旅厅发起，可多次催办）
export interface DisposalSupervisionRecord {
  id: string
  supervisor: string // 督办人
  supervisorOrg: string // 督办单位（省文旅厅）
  note: string // 督办意见
  time: string
}

// 投诉单（字段与游客填报页一致；一团一码来源自动带入投诉对象信息）
export interface DisposalComplaint {
  id: string // 投诉编号，如 TS202609100012
  source: DisposalComplaintSource
  city: string // 所属市州（所诉区域/一团一码团所属市州），提交后自动分派
  district?: string // 区县（可缺省）
  categories: DisposalCategory[] // 投诉类型（多选）
  respondentName: string // 投诉对象（一团一码来源为自动带入，如"XX旅行社·导游XX"）
  // 一团一码自动带入的投诉对象信息（仅 source === 'group_code' 时存在）
  agencyName?: string // 投诉对象旅行社
  guideName?: string // 投诉对象导游
  groupNo?: string // 团号
  content: string // 投诉内容与诉求（≤500字）
  evidences: string[] // 凭证图片文件名（最多4张）
  complainantName: string // 投诉人称呼
  isAnonymous: boolean // 是否匿名投诉
  complainantPhone: string // 联系电话
  receivedAt: string // 接收时间（游客提交即自动分派至市州，同时作为计时起点）
  status: DisposalStatus
  disposal?: DisposalRecord // 已处置时存在
  supervisions: DisposalSupervisionRecord[] // 督办记录（仅待处置期间可督办，处置后保留历史）
}

// 省文旅厅督办单位名称
export const PROVINCE_ORG_NAME = '贵州省文化和旅游厅'

// 市州文旅局账号单位 → 所属市州（按单位名称匹配贵州九市州）
export function cityOfOrg(org?: string): string | null {
  if (!org) return null
  return GUIZHOU_CITIES.find((c) => org.includes(c)) ?? null
}

// 区县文旅局账号单位 → 所属市州 + 区县（按单位名称包含的区县名反查所属市州）
export function districtOfOrg(org?: string): { city: string; district: string } | null {
  if (!org) return null
  for (const [city, districts] of Object.entries(GUIZHOU_DISTRICTS)) {
    const hit = districts.find((d) => org.includes(d))
    if (hit) return { city, district: hit }
  }
  return null
}

// 市州列窄幅展示：黔西南布依族苗族自治州 → 黔西南州
export function cityShortText(city: string): string {
  return city.replace(/(苗族侗族自治州|布依族苗族自治州)/, '州')
}

// 投诉对象展示文本
export function respondentDisplay(c: DisposalComplaint): string {
  if (c.source === 'group_code') {
    return [c.agencyName, c.guideName].filter(Boolean).join(' · ') || c.respondentName
  }
  return c.respondentName
}

// 已耗时（毫秒）：待处置 → 距接收时间的动态值；已处置 → 处置完成时间与接收时间的固定差值
export function elapsedMsOf(c: DisposalComplaint, now: number): number {
  const start = new Date(c.receivedAt.replace(' ', 'T')).getTime()
  const end = c.status === 'disposed' && c.disposal
    ? new Date(c.disposal.disposedAt.replace(' ', 'T')).getTime()
    : now
  return Math.max(0, end - start)
}

// 耗时格式化：X天X小时 / X小时X分 / X分钟
export function formatElapsed(ms: number): string {
  const minutes = Math.floor(ms / 60000)
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const mins = minutes % 60
  if (days > 0) return `${days}天${hours}小时`
  if (hours > 0) return `${hours}小时${mins}分`
  return `${mins}分钟`
}

// 耗时提示级别（无处置时限，仅作督办参考的视觉提示）：24小时内正常 / 24~72小时提醒 / 超72小时警示
export type ElapsedLevel = 'normal' | 'warn' | 'danger'

export function elapsedLevel(ms: number): ElapsedLevel {
  if (ms >= 72 * 3600 * 1000) return 'danger'
  if (ms >= 24 * 3600 * 1000) return 'warn'
  return 'normal'
}

export const ElapsedLevelColors: Record<ElapsedLevel, string> = {
  normal: '#595959',
  warn: '#fa8c16',
  danger: '#ff4d4f',
}
