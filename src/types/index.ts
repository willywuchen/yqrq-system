// ========== 奖励类别（按政策第八条对齐三大类10子项） ==========
export type RewardMajor = 'team_reception' | 'special_tourism' | 'culture_promotion';

export const RewardMajorLabels: Record<RewardMajor, string> = {
  team_reception: '入境旅游团队接待奖励',
  special_tourism: '专项旅游奖励',
  culture_promotion: '文旅宣传交流奖励',
};

// 政策第八条：企业只能选择一项进行申报（三大类互斥）
// 政策第十一条：专项奖励一次只能选择其中一项奖项申报（专项内部互斥）
export type RewardCategory =
  // 入境旅游团队接待奖励（第十条）
  | 'team_reception'
  // 专项旅游奖励（第十一条）5项
  | 'special_aviation' // 航空旅游（港澳台直航、外国直航）
  | 'special_multi_stop' // 一程多站联程旅游
  | 'special_240_visa_free' // 240小时过境免签旅游
  | 'special_high_speed_rail' // 高铁旅游
  | 'special_large_overseas_team' // 境外大型团队旅游
  // 文旅宣传交流奖励（第十二条）4项
  | 'culture_exhibition' // 参展推广奖励
  | 'culture_invite_in' // 请进来奖励
  | 'culture_advertising' // 入境旅游宣传奖励（投放广告 + 网站宣传）
  | 'culture_exchange' // 交流合作奖励
  // 兼容历史数据（标记为废弃，不再用于新建）
  | 'team_organize_inbound'
  | 'team_receive_inbound'
  | 'team_organize_domestic'
  | 'charter_flight'
  | 'charter_train'
  | 'online_sales'
  | 'media_promotion'
  | 'meeting_exhibition'
  | 'overseas_promotion';

export const RewardCategoryLabels: Record<RewardCategory, string> = {
  team_reception: '入境旅游团队接待奖励',
  special_aviation: '航空旅游',
  special_multi_stop: '一程多站联程旅游',
  special_240_visa_free: '240小时过境免签旅游',
  special_high_speed_rail: '高铁旅游',
  special_large_overseas_team: '境外大型团队旅游',
  culture_exhibition: '参展推广奖励',
  culture_invite_in: '请进来奖励',
  culture_advertising: '入境旅游宣传奖励',
  culture_exchange: '交流合作奖励',
  // 兼容旧类别
  team_organize_inbound: '组织入境游客团队奖励（旧）',
  team_receive_inbound: '接待入境游客团队奖励（旧）',
  team_organize_domestic: '组织省外游客团队奖励（旧）',
  charter_flight: '包机奖励（旧）',
  charter_train: '包列奖励（旧）',
  online_sales: '网络销售奖励（旧）',
  media_promotion: '媒体投放奖励（旧）',
  meeting_exhibition: '会议会展奖励（旧）',
  overseas_promotion: '境外促销奖励（旧）',
};

// 新版类别 → 所属大类映射
export const CategoryToMajor: Record<RewardCategory, RewardMajor | undefined> = {
  team_reception: 'team_reception',
  special_aviation: 'special_tourism',
  special_multi_stop: 'special_tourism',
  special_240_visa_free: 'special_tourism',
  special_high_speed_rail: 'special_tourism',
  special_large_overseas_team: 'special_tourism',
  culture_exhibition: 'culture_promotion',
  culture_invite_in: 'culture_promotion',
  culture_advertising: 'culture_promotion',
  culture_exchange: 'culture_promotion',
  // 旧类别映射（用于历史数据展示）
  team_organize_inbound: 'team_reception',
  team_receive_inbound: 'team_reception',
  team_organize_domestic: 'team_reception',
  charter_flight: 'special_tourism',
  charter_train: 'special_tourism',
  online_sales: 'culture_promotion',
  media_promotion: 'culture_promotion',
  meeting_exhibition: 'culture_promotion',
  overseas_promotion: 'culture_promotion',
};

// 申报可用的新版类别（不含旧类别）
export const NewRewardCategories: RewardCategory[] = [
  'team_reception',
  'special_aviation',
  'special_multi_stop',
  'special_240_visa_free',
  'special_high_speed_rail',
  'special_large_overseas_team',
  'culture_exhibition',
  'culture_invite_in',
  'culture_advertising',
  'culture_exchange',
];

// 是否需要前置审核（政策第十二条：文旅宣传交流奖励均需前置审核）
export const RequiresPreCheck: RewardCategory[] = [
  'culture_exhibition',
  'culture_invite_in',
  'culture_advertising',
  'culture_exchange',
];

// ========== 申报状态 ==========
export type ApplicationStatus =
  | 'draft' // 草稿
  | 'pre_check_pending' // 待前置审核（文旅宣传类专用）
  | 'pre_check_passed' // 前置审核通过
  | 'pre_check_rejected' // 前置审核不通过
  | 'pending_initial' // 待初审
  | 'initialing' // 初审中
  | 'initial_returned' // 初审退回
  | 'pending_review' // 待复审
  | 'reviewing' // 复审中
  | 'review_returned' // 复审退回
  | 'pending_final' // 待终审
  | 'finaling' // 终审中
  | 'publicizing' // 公示中
  | 'pending_payment' // 待拨付
  | 'paid' // 已拨付
  | 'rejected' // 不通过
  | 'archived'; // 已归档

export const StatusLabels: Record<ApplicationStatus, string> = {
  draft: '草稿',
  pre_check_pending: '待前置审核',
  pre_check_passed: '前置审核通过',
  pre_check_rejected: '前置审核不通过',
  pending_initial: '待初审',
  initialing: '初审中',
  initial_returned: '初审退回',
  pending_review: '待复审',
  reviewing: '复审中',
  review_returned: '复审退回',
  pending_final: '待终审',
  finaling: '终审中',
  publicizing: '公示中',
  pending_payment: '待拨付',
  paid: '已拨付',
  rejected: '不通过',
  archived: '已归档',
};

export const StatusColors: Record<ApplicationStatus, string> = {
  draft: 'default',
  pre_check_pending: 'purple',
  pre_check_passed: 'cyan',
  pre_check_rejected: 'error',
  pending_initial: 'blue',
  initialing: 'processing',
  initial_returned: 'warning',
  pending_review: 'blue',
  reviewing: 'processing',
  review_returned: 'warning',
  pending_final: 'blue',
  finaling: 'processing',
  publicizing: 'cyan',
  pending_payment: 'gold',
  paid: 'success',
  rejected: 'error',
  archived: 'default',
};

// ========== 用户角色 ==========
export type UserRole = 'applicant' | 'initial_reviewer' | 'review_reviewer' | 'final_reviewer' | 'admin';

export const UserRoleLabels: Record<UserRole, string> = {
  applicant: '旅行社申报员',
  initial_reviewer: '第三方初审员',
  review_reviewer: '市州复审员',
  final_reviewer: '省文旅厅终审员',
  admin: '系统管理员',
};

// ========== 附件 ==========
export interface Attachment {
  uid: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  uploadTime: string;
  // 附件分组（按附件2材料清单分组）
  group?: AttachmentGroup;
  // 材料标题（用于审核时识别材料类型，如"活动方案"、"预算"等）
  title?: string;
}

// 附件分组（对齐附件2材料清单结构）
export type AttachmentGroup =
  | 'base' // 基础材料
  | 'group_org' // 组团情况
  | 'reception' // 接待情况
  | 'accommodation' // 住宿情况
  | 'scenic' // 参观景区情况
  | 'special_extra' // 专项奖励其他资料
  | 'culture_base' // 文旅宣传基础材料
  | 'culture_extra' // 文旅宣传其他材料
  | 'pre_check' // 前置审核材料
  | 'other';

// ========== 游客名单（扩展字段） ==========
export interface TouristItem {
  key: string;
  name: string;
  idType: 'id_card' | 'passport' | 'hk_macao_pass' | 'tw_pass' | 'temp_entry_permit';
  idNumber: string;
  nationality: string; // 国籍/地区
  sourcePlace?: string; // 客源地（电子行程单必备）
  checkInDate?: string; // 入住时间（住宿证明必备）
  checkOutDate?: string; // 退房时间（住宿证明必备）
  scenicEnterTime?: string; // 进入景区时间（景区证明必备）
  phone?: string;
  // 证件影印件附件UID列表
  idCopyUids?: string[];
  // 入境签章影印件附件UID列表
  entryStampUids?: string[];
  // 临时入境许可证影印件（240小时过境免签必备）
  tempPermitUids?: string[];
  // 年龄（用于数据统计：游客来源分析）
  age?: number;
  // 性别（用于数据统计）
  gender?: 'male' | 'female' | 'unknown';
}

// ========== 景区信息（政策：至少2个4A+景区） ==========
export interface ScenicInfo {
  key: string;
  name: string; // 景区名称
  level: string; // 等级：4A / 5A
  enterTime?: string; // 进入时间
  attachmentUids?: string[]; // 旅客名单加盖景区公章
}

// ========== 住宿信息 ==========
export interface AccommodationInfo {
  key: string;
  hotelName: string;
  checkInDate: string;
  checkOutDate: string;
  attachmentUids?: string[]; // 旅客名单加盖酒店公章
}

// ========== 导游/司机信息（接待计划书含本人签名） ==========
export interface GuideDriverInfo {
  key: string;
  type: 'guide' | 'driver';
  name: string;
  licenseNo?: string; // 导游证号/驾驶证号
  signatureUid?: string; // 本人签名影印件
}

// ========== 前置审核信息（文旅宣传交流奖励专用） ==========
export interface PreCheckInfo {
  applicationNo?: string; // 报备函编号
  applyDate?: string; // 报备日期
  approvedDate?: string; // 省文旅厅批复日期
  approvalNo?: string; // 批复函编号
  activityPlanUids?: string[]; // 活动方案
  budgetUids?: string[]; // 预算
  expectedGoalUids?: string[]; // 预期目标
  reportUids?: string[]; // 活动报告（活动后提交）
  effectUids?: string[]; // 活动效果及证明材料
}

// ========== 申报记录 ==========
export interface Application {
  id: string;
  category: RewardCategory;
  applicantOrg: string; // 申报旅行社
  contactPerson: string;
  contactPhone: string;
  status: ApplicationStatus;
  submitTime?: string;
  createTime: string;
  updateTime: string;

  // 团队基本信息
  teamName?: string;
  teamSize?: number;
  inboundTourists?: number; // 入境游客数
  domesticTourists?: number; // 省外游客数（兼容旧字段）
  stayDays?: number; // 停留天数
  travelStart?: string;
  travelEnd?: string;
  travelDesc?: string; // 行程概述

  // 派团单号（与贵州文旅监管执法平台对接）
  dispatchNo?: string;
  // 目标协议书编号（团队接待奖励必备）
  targetAgreementNo?: string;

  // 航空旅游
  flightNo?: string;
  aviationType?: 'hk_macao_direct' | 'foreign_direct'; // 港澳台直航 / 外国直航

  // 高铁旅游
  trainNo?: string;

  // 文旅宣传类
  meetingName?: string; // 展会/活动名称
  meetingLocation?: string;
  meetingParticipants?: number;
  activityTimes?: number; // 活动次数（请进来/交流合作每年≤4次）
  advertisingType?: 'ad_placement' | 'website_promo'; // 入境旅游宣传：投放广告 / 网站宣传
  advertisingAmount?: number; // 广告投放金额
  websiteUrl?: string; // 网站网址
  orderCount?: number; // 获客订单数
  exchangeType?: 'youth_exchange' | 'humanity_activity'; // 交流合作：青少年人文交流 / 人文交流活动

  // 计算
  calculatedAmount?: number; // 系统计算金额
  approvedAmount?: number; // 终审核定金额

  // 关联信息
  attachments: Attachment[];
  tourists?: TouristItem[];
  scenics?: ScenicInfo[]; // 景区信息
  accommodations?: AccommodationInfo[]; // 住宿信息
  guideDrivers?: GuideDriverInfo[]; // 导游司机信息
  preCheck?: PreCheckInfo; // 前置审核信息
  auditLogs: AuditLog[];

  // 兼容旧字段
  charterCount?: number;
  salesAmount?: number;
  mediaAmount?: number;
  promotionTimes?: number;
}

// ========== 审核日志 ==========
export interface AuditLog {
  id: string;
  stage: 'pre_check' | 'initial' | 'review' | 'final' | 'payment';
  operator: string;
  operatorRole: UserRole;
  action: 'submit' | 'pass' | 'return' | 'reject' | 'assign' | 'pay' | 'pre_check_pass' | 'pre_check_reject';
  comment?: string;
  time: string;
}

// ========== 消息 ==========
export interface Message {
  id: string;
  title: string;
  content: string;
  type: 'system' | 'audit' | 'payment';
  read: boolean;
  createTime: string;
  applicationId?: string;
}

// ========== 业务规则常量 ==========
export const POLICY_CONSTANTS = {
  // 申报截止日期（最终）
  finalDeadline: '2027-01-31',
  // 行程结束后提交申报期限（天）
  submitAfterTravelDays: 45,
  // 请进来奖励每年最多4次（政策第十二条第二款）
  inviteInMaxPerYear: 4,
  // 交流合作奖励每年最多4次（政策第十二条第四款）
  exchangeMaxPerYear: 4,
  // 团队接待奖励：入境游客最少10人（港澳台或外国护照）
  teamReceptionMinSize: 10,
  // 境外大型团队：东南亚150人+ 或 东南亚以外50人+
  largeTeamSEA: 150,
  largeTeamNonSEA: 50,
  // 景区最少数量：至少2个4A+
  minScenicCount: 2,
  // 信用中国网站
  creditChinaUrl: 'https://www.creditchina.gov.cn',
};

// ========== 投诉台账 ==========
export type ComplaintMethod =
  | 'hotline_12345'
  | 'phone'
  | 'online_platform';

export const ComplaintMethodLabels: Record<ComplaintMethod, string> = {
  hotline_12345: '12345热线',
  phone: '来电',
  online_platform: '监管平台',
};

export type TourismCategory =
  | 'travel_agency'
  | 'tour_guide'
  | 'scenic_area'
  | 'accommodation'
  | 'transportation'
  | 'shopping'
  | 'entertainment'
  | 'online_travel'
  | 'cultural_market'
  | 'other';

export const TourismCategoryLabels: Record<TourismCategory, string> = {
  travel_agency: '旅行社',
  tour_guide: '导游',
  scenic_area: '景区',
  accommodation: '住宿',
  transportation: '交通',
  shopping: '购物',
  entertainment: '娱乐',
  online_travel: '在线旅游平台',
  cultural_market: '文化市场',
  other: '其他',
};

export type ComplaintStatus =
  | 'pending'
  | 'processing'
  | 'reviewing'
  | 'replied'
  | 'closed'
  | 'not_accepted'
  | 'transferred';

export const ComplaintStatusLabels: Record<ComplaintStatus, string> = {
  pending: '待受理',
  processing: '办理中',
  reviewing: '负责人审核中',
  replied: '已回复',
  closed: '已办结',
  not_accepted: '不予受理',
  transferred: '已转办',
};

export const ComplaintStatusColors: Record<ComplaintStatus, string> = {
  pending: 'default',
  processing: 'processing',
  reviewing: 'warning',
  replied: 'cyan',
  closed: 'success',
  not_accepted: 'error',
  transferred: 'purple',
};

export type ReplyStatus = 'none' | 'replied' | 'closed';

export const ReplyStatusLabels: Record<ReplyStatus, string> = {
  none: '未回复',
  replied: '已回复',
  closed: '已办结',
};

export interface ComplaintOperationLog {
  id: string;
  operator: string;
  action: 'create' | 'edit' | 'process' | 'review' | 'reply' | 'close' | 'import' | 'export' | 'delete';
  summary: string;
  time: string;
}

export interface Complaint {
  id: string;
  title: string;
  province: string;
  city: string;
  district?: string;
  complaintMethod: ComplaintMethod;
  tourismCategory: TourismCategory;
  complaintTime: string;
  status: ComplaintStatus;
  // 投诉人信息
  complainant: {
    name: string;
    gender?: 'male' | 'female' | 'unknown';
    phone?: string;
    email?: string;
    address?: string;
    contractDate?: string;
  };
  // 被投诉人信息
  respondent: {
    name: string;
    address?: string;
    phone?: string;
  };
  content: string;
  requests?: string;
  handlerOpinion?: string;
  reviewerOpinion?: string;
  isTransferredToCase?: boolean;
  suspectedIssue?: string;
  replyStatus: ReplyStatus;
  replyTime?: string;
  replyContent?: string;
  attachments: Attachment[];
  remark?: string;
  createdBy: string;
  createTime: string;
  updateTime: string;
  operationLogs: ComplaintOperationLog[];
  importBatchNo?: string;
}

// 贵州省市州列表（用于区域级联）
export const GUIZHOU_CITIES = [
  '贵阳市', '六盘水市', '遵义市', '安顺市', '毕节市', '铜仁市',
  '黔西南布依族苗族自治州', '黔东南苗族侗族自治州', '黔南布依族苗族自治州',
];

// ========== 舆情管理分析 ==========
// 数据来源（多方汇聚）
export type OpinionDataSource =
  | 'cyberspace_admin'   // 网信办
  | 'provincial_police'  // 省公安厅
  | 'opinion_system'     // 舆情系统
  | 'manual_entry';      // 手动录入（默认）

export const OpinionDataSourceLabels: Record<OpinionDataSource, string> = {
  cyberspace_admin: '网信办',
  provincial_police: '省公安厅',
  opinion_system: '舆情系统',
  manual_entry: '手动录入',
};

export const OpinionDataSourceColors: Record<OpinionDataSource, string> = {
  cyberspace_admin: 'purple',
  provincial_police: 'geekblue',
  opinion_system: 'cyan',
  manual_entry: 'default',
};

// 情感倾向（正/负/中）
export type OpinionSentiment = 'positive' | 'negative' | 'neutral';

export const OpinionSentimentLabels: Record<OpinionSentiment, string> = {
  positive: '正面',
  negative: '负面',
  neutral: '中性',
};

export const OpinionSentimentColors: Record<OpinionSentiment, string> = {
  positive: 'success',
  negative: 'error',
  neutral: 'default',
};

// 风险等级
export type OpinionRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export const OpinionRiskLevelLabels: Record<OpinionRiskLevel, string> = {
  low: '低',
  medium: '中',
  high: '高',
  critical: '极高',
};

export const OpinionRiskLevelColors: Record<OpinionRiskLevel, string> = {
  low: 'blue',
  medium: 'orange',
  high: 'red',
  critical: 'magenta',
};

// 风险等级对应的风险指数区间
export const OpinionRiskScoreRange: Record<OpinionRiskLevel, [number, number]> = {
  low: [0, 25],
  medium: [26, 50],
  high: [51, 75],
  critical: [76, 100],
};

// 处置状态
export type OpinionHandleStatus = 'pending' | 'processing' | 'handled';

export const OpinionHandleStatusLabels: Record<OpinionHandleStatus, string> = {
  pending: '待处理',
  processing: '处理中',
  handled: '已处理',
};

export const OpinionHandleStatusColors: Record<OpinionHandleStatus, string> = {
  pending: 'default',
  processing: 'processing',
  handled: 'success',
};

// 舆情处置操作日志
export interface OpinionHandleLog {
  id: string;
  operator: string;
  action: 'create' | 'edit' | 'process' | 'handle' | 'reopen' | 'transfer' | 'export' | 'delete';
  fromStatus?: OpinionHandleStatus;
  toStatus?: OpinionHandleStatus;
  opinion: string;
  time: string;
}

export const OpinionActionLabels: Record<OpinionHandleLog['action'], string> = {
  create: '新增',
  edit: '编辑',
  process: '标记处理中',
  handle: '标记已处理',
  reopen: '重新打开',
  transfer: '转办',
  export: '导出',
  delete: '删除',
};

// 舆情主体
export interface PublicOpinion {
  id: string;
  title: string;
  author: string;
  authorLocation: string;
  keywords: string[];
  sourceWebsite: string;
  sourceUrl: string;
  content: string;
  publishTime: string;
  dataSource: OpinionDataSource;
  tourismCategory: TourismCategory;
  sentiment: OpinionSentiment;
  riskLevel: OpinionRiskLevel;
  riskScore?: number;
  handleStatus: OpinionHandleStatus;
  involvedSubjects?: string[];
  attachments: Attachment[];
  remark?: string;
  createdBy: string;
  createTime: string;
  updateTime: string;
  handleLogs: OpinionHandleLog[];
}

// 预警等级
export type WarningLevel = 'red' | 'orange' | 'yellow';

export const WarningLevelLabels: Record<WarningLevel, string> = {
  red: '红色',
  orange: '橙色',
  yellow: '黄色',
};

export const WarningLevelColors: Record<WarningLevel, string> = {
  red: 'error',
  orange: 'warning',
  yellow: 'gold',
};

// 预警规则
export interface OpinionWarningRule {
  id: string;
  name: string;
  keywords?: string[];
  sentiment?: OpinionSentiment;
  riskLevel?: OpinionRiskLevel;
  city?: string;
  tourismCategory?: TourismCategory;
  threshold: number;       // 触发阈值（条数）
  windowMinutes: number;  // 时间窗口（分钟）
  alertLevel: WarningLevel;
  enabled: boolean;
  createdBy: string;
  createTime: string;
}

// 预警工单
export interface OpinionWarning {
  id: string;
  ruleId: string;
  ruleName: string;
  alertLevel: WarningLevel;
  triggerTime: string;
  relatedOpinionIds: string[];
  relatedComplaintIds: string[];
  summary: string;
  handled: boolean;
  handleBy?: string;
  handleTime?: string;
  handleOpinion?: string;
}

// 舆情报告
export type ReportType = 'daily' | 'weekly' | 'monthly';

export const ReportTypeLabels: Record<ReportType, string> = {
  daily: '日报',
  weekly: '周报',
  monthly: '月报',
};

export interface OpinionReport {
  id: string;
  type: ReportType;
  title: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  content: string;
  createdBy: string;
}

// ========== 引客入黔补贴管理（简化版，无审核流程） ==========
// 状态机：DRAFT → SUBMITTED → LOCKED
export type SubsidyStatus = 'draft' | 'submitted' | 'locked';

export const SubsidyStatusLabels: Record<SubsidyStatus, string> = {
  draft: '草稿',
  submitted: '已提交',
  locked: '已锁定',
};

export const SubsidyStatusColors: Record<SubsidyStatus, string> = {
  draft: 'default',
  submitted: 'blue',
  locked: 'red',
};

// 区块B：入境旅游团队接待奖励申报行项
export interface TeamReceptionRow {
  key: string;
  project: string; // 申请项目（如：港澳台地区-一档）
  amount: number; // 申请奖励金额
  teamSize: number; // 申请团队人数
}

// 区块C：专项旅游奖励申报行项
export interface SpecialTourismRow {
  key: string;
  project: string; // 申请项目（如：港澳台直航）
  amount: number;
  teamSize: number;
}

// 区块E：旅游宣传奖励申报行项
export interface CulturePromotionRow {
  key: string;
  project: string; // 申请项目（如：参展推广奖励）
  amount: number;
  activityName: string; // 参加或组织活动名称
  location: string; // 地点
  participants: number; // 派遣或接待人数
}

// 区块F：承诺与签字
export interface SubsidyDeclaration {
  legalRepSignature?: string; // 法人代表签字
  operatorSignature?: string; // 经办人员签字
  contactPhone?: string; // 联系电话（与区块A联动）
  date?: string; // 日期
  sealUid?: string; // 盖章图片UID
  sealUrl?: string; // 盖章图片URL（前端预览用）
}

// 补贴申报记录（简化版，无审核流程）
export interface SubsidyApplication {
  id: string;
  // 申报编号（系统生成）
  applicationNo: string;
  // 关联团信息（拉取时的快照，团信息后续修改不影响申报记录）
  teamPresetSnapshot: {
    teamName: string;
    teamSize: number;
    inboundTourists: number;
    stayDays: number;
    travelStart: string;
    travelEnd: string;
    travelDesc: string;
    dispatchNo: string;
    targetAgreementNo?: string;
    flightNo?: string;
    trainNo?: string;
    tourists: TouristItem[];
    scenics: ScenicInfo[];
    accommodations: AccommodationInfo[];
    guideDrivers: GuideDriverInfo[];
  };

  // 区块A：申报单位基本信息
  unitName: string; // 单位名称（拉取自团信息单位）
  legalRepresentative?: string; // 法定代表人
  operator?: string; // 经办人（拉取自持单人）
  contactPhone?: string; // 联系电话
  bankAccount?: {
    accountName?: string; // 户名
    bankName?: string; // 开户行
    accountNo?: string; // 账号
  };

  // 区块B：入境旅游团队接待奖励申报
  teamReceptionRows: TeamReceptionRow[];

  // 区块C：专项旅游奖励申报
  specialTourismRows: SpecialTourismRow[];

  // 区块D：团队基本信息（拉取自团信息）
  teamBaseInfo: {
    teamNo?: string; // 团队编号（团信息-行程单号）
    travelStartDate?: string; // 团队在黔时间-起
    travelEndDate?: string; // 团队在黔时间-止
    nights?: number; // 总晚数 = 止 - 起
    days?: number; // 总天数 = 止 - 起 + 1
    sourcePlace?: string; // 游客来源地
    outboundTourOrgName?: string; // 省外组团社名称
    hotelFirst5Nights?: string[]; // 第1~5晚酒店名
    hotelStar?: string; // 酒店星级
    vehicleCount?: number; // 租用客车-辆数
    vehicleNos?: string[]; // 租用客车-车号
    scenicCount4APlus?: number; // 4A级以上景区数量
    scenicNames4APlus?: string[]; // 4A级以上景区名称
  };

  // 区块E：旅游宣传奖励申报
  culturePromotionRows: CulturePromotionRow[];

  // 区块F：承诺与签字
  declaration: SubsidyDeclaration;

  // 申请奖励金额合计（各子项金额求和，前端计算）
  totalAmount: number;

  // 申报团队人数（自动统计或用户填写）
  totalTeamSize: number;

  // 状态
  status: SubsidyStatus;

  // 时间字段
  createTime: string;
  updateTime: string;
  submitTime?: string;
  // 锁定截止时间：出团日期前一日 23:59:59（等价于出团当日 00:00:00）
  lockDeadline: string;

  // 创建人
  createdBy: string;
  createdByOrg: string; // 创建单位
}

// 补贴管理 - 操作日志（提交、撤回、编辑、导出等）
export interface SubsidyOperationLog {
  id: string;
  applicationId: string;
  operator: string;
  operatorRole: UserRole;
  action: 'create' | 'edit' | 'submit' | 'withdraw' | 'lock' | 'export_team' | 'export_form' | 'delete';
  comment?: string;
  time: string;
}

export const SubsidyActionLabels: Record<SubsidyOperationLog['action'], string> = {
  create: '创建',
  edit: '编辑',
  submit: '提交',
  withdraw: '撤回',
  lock: '锁定',
  export_team: '导出团行程信息',
  export_form: '导出申报表',
  delete: '删除',
};
