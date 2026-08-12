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
