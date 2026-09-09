/**
 * 旅行社端工作台（设置中心 / 产品管理 / 电子行程单）类型定义
 * 字段命名与《2026-09-08-旅行社端设置中心产品管理与电子行程单-PRD.md》§6 保持一致
 * 说明：演示环境金额以「元」存储；正式开发按 PRD §6 以「分」存储
 */

// ========== 商家池 ==========

// 商家类型：酒店/景区/餐厅/购物店/民宿（选择器全平台共享一个池子）
export type MerchantType = 'hotel' | 'scenic' | 'restaurant' | 'shop' | 'homestay'

export const MerchantTypeLabels: Record<MerchantType, string> = {
  hotel: '酒店',
  scenic: '景区',
  restaurant: '餐厅',
  shop: '购物店',
  homestay: '民宿',
}

export const MerchantTypeColors: Record<MerchantType, string> = {
  hotel: 'geekblue',
  scenic: 'green',
  restaurant: 'orange',
  shop: 'purple',
  homestay: 'cyan',
}

// 等级选项：景区级别 / 酒店住宿星级 / 民宿等级
export const SCENIC_LEVEL_OPTIONS = ['1A', '2A', '3A', '4A', '5A']
export const HOTEL_STAR_OPTIONS = ['一星级', '二星级', '三星级', '四星级', '五星级', '超五星级']
export const HOMESTAY_LEVEL_OPTIONS = [
  '一星级',
  '二星级',
  '三星级',
  '四星级',
  '五星级',
  '优品级',
  '乙品级',
  '精品级',
]

// 按商家类型取等级选项；无等级的类型返回 undefined
export function levelOptionsOfType(type: MerchantType): string[] | undefined {
  if (type === 'scenic') return SCENIC_LEVEL_OPTIONS
  if (type === 'hotel') return HOTEL_STAR_OPTIONS
  if (type === 'homestay') return HOMESTAY_LEVEL_OPTIONS
  return undefined
}

export interface Region {
  province: string
  city: string
  district: string
}

export interface Merchant {
  id: string
  name: string
  type: MerchantType
  region: Region
  address?: string
  contact?: string
  phone?: string
  creditCode?: string
  businessLicenseUrl?: string
  remark?: string
  status: 'enabled' | 'disabled'
  createdByAgency: string // 创建旅行社 ID：商家管理列表按此过滤"本社商家"；选择器返回全池
  createdByAgencyName: string
  createdByAccount?: string
  createdAt: string
  // —— 企业详细信息（按附件字段维护；不含电子印章相关内容） ——
  shortName?: string // 简称
  orgNature?: string // 企业性质
  legalPerson?: string // 法人
  legalPersonPhone?: string // 法人电话
  legalPersonIdNo?: string // 法人身份证号
  licenseNo?: string // 经营许可证编号
  legalPersonIdUrl?: string // 法人身份证照片
  businessScope?: string // 经营范围
  businessStatus?: BusinessStatus // 营业状态
  level?: string // 等级：景区级别（1A-5A）/酒店星级/民宿等级，按类型解释
  // 景区景点专属：范围与承载量
  areaSqKm?: number // 景区范围（平方公里）
  dailyMaxLoad?: number // 日最大承载量（万）
  instantMaxLoad?: number // 瞬间最大承载量（万）
  spaceLoad?: number // 空间承载量（万）
  ecoLoad?: number // 生态承载量（万）
}

// ========== 线路产品 ==========

// 团类型：组团/散团（PRD §6.2）
export type GroupType = 'group' | 'independent'

export const GroupTypeLabels: Record<GroupType, string> = {
  group: '组团',
  independent: '散团',
}

export type RouteProductStatus = 'draft' | 'published' | 'offShelf'

export const RouteProductStatusLabels: Record<RouteProductStatus, string> = {
  draft: '草稿',
  published: '已发布',
  offShelf: '已下架',
}

export const RouteProductStatusColors: Record<RouteProductStatus, string> = {
  draft: 'default',
  published: 'green',
  offShelf: 'red',
}

// 旅游地域
export type TourRegion = 'province' | 'domestic' | 'abroad'

export const TourRegionLabels: Record<TourRegion, string> = {
  province: '省内',
  domestic: '省外',
  abroad: '境外',
}

// 交通方式（交通往/交通返）
export type TransportType = 'train' | 'highSpeed' | 'bus' | 'plane' | 'ship'

export const TransportTypeLabels: Record<TransportType, string> = {
  train: '火车',
  highSpeed: '动车',
  bus: '汽车',
  plane: '飞机',
  ship: '轮船',
}

// 单价结构（成人/老人/儿童/婴儿，与电子行程单价格共用；演示环境以「元」存储）
export interface RouteProduct {
  id: string
  name: string
  tourRegion: TourRegion // 旅游地域：省内/省外/境外
  groupType: GroupType
  days: number
  prices: ItineraryPrices // 单价：成人单价/老人单价/儿童单价/婴儿价
  minGroupSize?: number // 最低成团人数
  departureAddress?: string // 发团地址（手动输入）
  closingAddress?: string // 结团地址（手动输入）
  transportGo?: TransportType // 交通往
  transportBack?: TransportType // 交通返
  coverImage?: string
  dayPlans: DayPlan[]
  status: RouteProductStatus
  agencyId: string
  createdAt: string
  publishedAt?: string
}

// ========== 每日安排（产品与行程单共用，PRD §6.3） ==========

/**
 * 字段存商家 ID 引用；名称快照用于展示（商家停用/删除后历史单据仍可读）。
 * 产品线路：用餐（meal）合并早/午/晚统一填写，与住宿、景区每项独立一行；
 * 团行程单每日安排同样合并为「用餐」，date 为该天日期（默认按出团日期自动推算，可修改）。
 */
export interface DayPlan {
  dayNo: number
  date?: string // 该天日期 YYYY-MM-DD（如第一天 9月1号）
  meal?: string // 用餐（早/午/晚合并填写，餐厅商家 ID）
  mealName?: string // 用餐商家名称快照
  breakfast?: string
  breakfastName?: string
  lunch?: string
  lunchName?: string
  dinner?: string
  dinnerName?: string
  hotel?: string
  hotelName?: string
  scenicSpots?: string[]
  scenicSpotNames?: string[]
  shoppingStores?: string[]
  shoppingStoreNames?: string[]
  description?: string
}

// ========== 电子行程单 ==========

// 获客渠道（PRD §6.4）
export type ItineraryChannel = 'offline' | 'douyin' | 'xiaohongshu' | 'ctrip' | 'tongcheng' | 'other'

export const ItineraryChannelLabels: Record<ItineraryChannel, string> = {
  offline: '线下',
  douyin: '抖音',
  xiaohongshu: '小红书',
  ctrip: '携程',
  tongcheng: '同程',
  other: '其他',
}

// 用车性质（PRD §6.4）
export type VehicleNature = 'tourBus' | 'selfDrive' | 'smallCar'

export const VehicleNatureLabels: Record<VehicleNature, string> = {
  tourBus: '旅游用车',
  selfDrive: '自驾用车',
  smallCar: '小车小团',
}

// 行程性质（组团/散团，回填自产品团类型，PRD V1.2 恢复）
export type ItineraryNature = 'group' | 'independent'

export const ItineraryNatureLabels: Record<ItineraryNature, string> = {
  group: '组团',
  independent: '散团',
}

// 行程单状态：待提交/已提交/已结束（结团日次日零点起系统自动锁定，PRD §3.2）
export type ItineraryStatus = 'draft' | 'submitted' | 'finished'

export const ItineraryStatusLabels: Record<ItineraryStatus, string> = {
  draft: '待提交',
  submitted: '已提交',
  finished: '已结束',
}

export const ItineraryStatusColors: Record<ItineraryStatus, string> = {
  draft: 'gold',
  submitted: 'blue',
  finished: 'default',
}

export interface ItineraryPrices {
  adult?: number
  senior?: number
  child?: number
  infant?: number
}

export interface EItinerary {
  id: string
  itineraryNo: string // 行程单号（生成规则由研发评估，演示用 XC+日期+序号）
  groupNo?: string // 团号（自动生成，模拟规则 TH+日期+序号）
  name: string
  tourRegion?: TourRegion // 旅游地域：省内/省外/境外（同产品线路）
  productId?: string
  productNameSnapshot?: string
  nature?: ItineraryNature
  channel: ItineraryChannel
  departureTime: string // 出团日期时间 YYYY-MM-DD HH:mm
  returnTime: string // 结团日期时间
  departurePlace: string // 发团地址（手动输入）
  closingPlace: string // 结团地址（手动输入）
  days: number // 总天数
  nights?: number // 总晚数
  prices: ItineraryPrices
  attachments?: string[]
  invoices?: string[]
  remark?: string
  dayPlans: DayPlan[]
  vehicles: ItineraryVehicle[]
  vehicleNature?: VehicleNature
  guides: GuideBooking[]
  tourists: Tourist[]
  touristCount: number
  status: ItineraryStatus
  agencyId: string
  createdByAccount: string
  createdAt: string
  submittedAt?: string
}

// ========== 预定车辆（PRD §6.6，行程单内多辆） ==========
// 命名 ItineraryVehicle 以避免与包车监管模块的 Vehicle 冲突
export interface ItineraryVehicle {
  id: string
  transportCompany: string // 运输企业（手动输入）
  plateNo: string // 车牌号或编号
  driverName: string
  driverPhone?: string
  seatCount?: number
  vehicleCount?: number
  remark?: string
}

// ========== 导游（既有功能 · 外部依赖，PRD §6.7） ==========
// 导游管理不在本系统内设计；以下结构仅作为行程单导游选择器的消费契约
export interface Guide {
  id: string
  agencyId: string
  name: string
  gender?: 'male' | 'female'
  phone?: string
  licenseNo: string
  status: 'enabled' | 'disabled'
}

export interface GuideBooking {
  id: string
  guideId: string
  guideNameSnapshot: string
  guideGenderSnapshot?: string
  guidePhoneSnapshot?: string
  guideLicenseSnapshot?: string
  startDate: string
  endDate: string
}

// ========== 游客（PRD §6.5） ==========

export type TouristIdType = 'idCard' | 'passport' | 'other'

export const TouristIdTypeLabels: Record<TouristIdType, string> = {
  idCard: '身份证',
  passport: '护照',
  other: '其他',
}

export type TouristCategory = 'adult' | 'senior' | 'child' | 'infant'

export const TouristCategoryLabels: Record<TouristCategory, string> = {
  adult: '成人',
  senior: '老人',
  child: '儿童',
  infant: '婴儿',
}

export interface Tourist {
  id: string
  itineraryId: string
  name: string
  idType: TouristIdType
  idNo: string
  phone?: string
  category: TouristCategory
  origin: string // 客源地
  // 性别/生日/年龄：身份证号自动识别回填；外籍（护照等）可空、手动填写
  gender?: 'male' | 'female'
  birthDate?: string // YYYY-MM-DD
  age?: number
}

// 身份证号解析：提取性别（第 17 位奇男偶女）、出生日期（7-14 位）并计算年龄；
// 非 18 位身份证号（外籍护照等）返回 null
export function parseIdCard(idNo?: string): { gender: 'male' | 'female'; birthDate: string; age: number } | null {
  if (!idNo || !/^\d{17}[\dXx]$/.test(idNo)) return null
  const gender = Number(idNo[16]) % 2 === 1 ? 'male' : 'female'
  const birthDate = `${idNo.slice(6, 10)}-${idNo.slice(10, 12)}-${idNo.slice(12, 14)}`
  const birth = new Date(birthDate)
  if (Number.isNaN(birth.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const beforeBirthday =
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
  if (beforeBirthday) age -= 1
  return { gender, birthDate, age: Math.max(age, 0) }
}

// 模拟团号生成：TH + 日期 + 3 位序号（正式规则由研发评估）
export function genGroupNo(existingCount: number): string {
  const d = new Date()
  const pad = (n: number) => n.toString().padStart(2, '0')
  const date = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
  return `TH${date}${String(existingCount + 1).padStart(3, '0')}`
}

// ========== 账号与资质 ==========

export type AgencyAccountRole = 'owner' | 'staff'

export const AgencyAccountRoleLabels: Record<AgencyAccountRole, string> = {
  owner: '主账号',
  staff: '子账号',
}

export interface AgencyAccount {
  id: string
  username: string
  name: string
  nickname?: string
  phone?: string
  gender?: 'male' | 'female'
  idNo?: string
  birthDate?: string
  nationality?: string
  ethnicity?: string
  hometown?: string
  politicalStatus?: string
  email?: string
  telephone?: string
  jobNo?: string
  address?: string
  // 个人资料扩展字段（设置中心 · 个人资料）
  marriageStatus?: string // 婚姻状态
  wechatNo?: string // 微信号
  dingtalkNo?: string // 钉钉号
  backupPhone?: string // 备用电话
  nativePlace?: string // 籍贯
  education?: EducationItem[] // 教育经历
  role: AgencyAccountRole
  agencyId: string
  status?: 'enabled' | 'disabled'
  createdAt?: string
}

// ========== 教育经历（设置中心 · 个人资料） ==========

export interface EducationItem {
  id: string
  studyForm?: string // 学习形式：全日制/非全日制
  degree?: string // 学历
  academicDegree?: string // 学位
  school?: string // 毕业院校
  major?: string // 所学专业
  graduationDate?: string // 毕业时间 YYYY-MM-DD
}

// 教育经历表单可选项
export const STUDY_FORM_OPTIONS = ['全日制', '非全日制']
export const EDUCATION_OPTIONS = ['博士研究生', '硕士研究生', '本科', '专科', '高中及以下']
export const ACADEMIC_DEGREE_OPTIONS = ['博士', '硕士', '学士', '无']

// ========== 信息认证（原资质管理 + 旅行社资料合并） ==========

// 认证状态：已认证 / 待审核 / 审核驳回；重新提交审核期间系统功能不受限
export type CertificationStatus = 'verified' | 'pending' | 'rejected'

export const CertificationStatusLabels: Record<CertificationStatus, string> = {
  verified: '已认证',
  pending: '待审核',
  rejected: '审核驳回',
}

export const CertificationStatusColors: Record<CertificationStatus, string> = {
  verified: 'green',
  pending: 'blue',
  rejected: 'red',
}

// 营业状态
export type BusinessStatus = 'bankrupt' | 'suspended' | 'building' | 'operating' | 'closed'

export const BusinessStatusLabels: Record<BusinessStatus, string> = {
  bankrupt: '已破产',
  suspended: '已停业',
  building: '筹建中',
  operating: '营业中',
  closed: '已关闭',
}

// 企业性质选项
export const ORG_NATURE_OPTIONS = [
  '政府机构',
  '事业单位',
  '国有企业',
  '民营企业',
  '中外合资企业',
  '外商独资企业',
  '其他',
]

// 产业类型选项
export const INDUSTRY_TYPE_OPTIONS = ['政府机构', '旅行社', '景区景点', '文化场馆']

// 企业认证信息（字段与「信息认证」页面保持一致，不含电子印章/公章授权书）
export interface AgencyCertification {
  id: string
  agencyId: string
  orgName: string // 企业名称*
  shortName?: string // 简称
  orgNature?: string // 企业性质*
  legalPerson?: string // 法人*
  legalPersonPhone?: string // 法人电话*
  legalPersonIdNo?: string // 法人身份证*
  creditCode?: string // 统一社会信用代码*
  licenseNo?: string // 经营许可证编号
  industryType?: string // 产业类型
  bankName?: string // 开户行
  bankAccount?: string // 银行账号
  bankBranchNo?: string // 行号
  contactName?: string // 联系人名字*
  contactPhone?: string // 联系人电话*
  address?: string // 详细地址*
  businessScope?: string // 经营范围
  region: Region // 所属区域*
  businessStatus?: BusinessStatus // 营业状态
  legalPersonIdUrl?: string // 法人身份证照片*
  businessLicenseUrl?: string // 营业执照照片*
  // 审核状态：重新提交审核期间旧信息继续生效、系统功能正常使用
  status: CertificationStatus
  pendingData?: Partial<AgencyCertification> // 待审核的修改内容（审核期间旧数据生效）
  rejectReason?: string
  submittedAt?: string
  verifiedAt?: string
}

// ========== 操作记录（PRD §5.8 / US-17） ==========

export interface AgencyOperationLog {
  id: string
  agencyId: string
  account: string
  action: string
  target: string
  detail?: string
  createdAt: string
}

// ========== 工具函数 ==========

// 证件号脱敏：保留前 4 后 2（演示规则，页面展示用；导出含全量）
export function maskIdNo(idNo: string): string {
  if (!idNo || idNo.length <= 6) return idNo.replace(/.(?=.{2})/g, '*')
  return `${idNo.slice(0, 4)}${'*'.repeat(Math.max(idNo.length - 6, 0))}${idNo.slice(-2)}`
}

// 手机号脱敏：138****5678
export function maskPhone(phone?: string): string {
  if (!phone || phone.length < 7) return phone ?? '—'
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`
}

// 导游证号脱敏：D-5223****
export function maskLicenseNo(no?: string): string {
  if (!no || no.length <= 4) return no ?? '—'
  return `${no.slice(0, 4)}****`
}

// 是否已过结团日（结团日次日零点起锁定只读，PRD §3.2）
export function isPastReturnDate(returnTime: string, now = new Date()): boolean {
  const returnDate = new Date(`${returnTime.slice(0, 10)}T23:59:59`)
  return now.getTime() > returnDate.getTime()
}

// 计算行程单展示状态：submitted 且已过结团日 → finished（系统自动标记）
export function displayStatus(it: EItinerary, now = new Date()): ItineraryStatus {
  if (it.status === 'submitted' && isPastReturnDate(it.returnTime, now)) return 'finished'
  return it.status
}

// 行程单是否可编辑：待提交，或已提交且未过结团日（撤销后可编辑）
export function canEditItinerary(it: EItinerary, now = new Date()): boolean {
  if (it.status === 'draft') return true
  if (it.status === 'submitted') return !isPastReturnDate(it.returnTime, now)
  return false
}

// 生成行程单号（演示规则：XC + 日期 + 3 位序号；正式规则由研发评估）
export function genItineraryNo(existingCount: number): string {
  const d = new Date()
  const pad = (n: number) => n.toString().padStart(2, '0')
  const date = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
  return `XC${date}${String(existingCount + 1).padStart(3, '0')}`
}
