import type { Application, Complaint, Message, RewardCategory, TouristItem, ScenicInfo, AccommodationInfo, GuideDriverInfo, Attachment, PublicOpinion, OpinionWarningRule, OpinionWarning, OpinionReport, OpinionHandleLog } from '../types';
import { POLICY_CONSTANTS } from '../types';
import type { ComplaintReport, ComplaintReportTemplate, ComplaintReportArchiveLog, ComplaintSeasonCalendarItem } from '../types';
import { getDefaultReportTemplates, getDefaultSeasonCalendar, DEFAULT_REPORT_CHAPTERS } from '../types';
import { buildComplaintReportSnapshot, buildReportSummary } from '../utils';

// 当前年度预算（万元）
export const BUDGET_TOTAL = 5000;

// ========== 奖励规则（按政策第十/十一/十二条对齐） ==========
export interface RewardRule {
  title: string;
  desc: string;
  major: 'team_reception' | 'special_tourism' | 'culture_promotion';
  // 阶梯规则（团队接待奖励的目标协议分档）
  tiers?: { label: string; perPerson: number; minNights?: number }[];
  // 专项奖励单人次奖励
  perPerson?: number;
  // 单次奖励上限
  maxPerTime?: number;
  // 比例奖励
  ratio?: number;
  // 每年最多申请次数
  maxPerYear?: number;
  // 政策依据条款
  policyRef: string;
  // 申报要点提示
  tips?: string[];
}

export const RewardRules: Record<RewardCategory, RewardRule | undefined> = {
  // === 入境旅游团队接待奖励（第十条）===
  team_reception: {
    title: '入境旅游团队接待奖励',
    desc: '组织境外游客来黔旅游，按目标协议分档奖励，每月预拨、年度清算。须与省文旅厅签订目标协议书。',
    major: 'team_reception',
    tiers: [
      { label: '一档（亚洲国家）', perPerson: 30, minNights: 1 },
      { label: '二档（亚洲国家）', perPerson: 50, minNights: 1 },
      { label: '三档（亚洲国家）', perPerson: 80, minNights: 1 },
      { label: '一档（东盟以外其他国家）', perPerson: 30, minNights: 1 },
      { label: '二档（东盟以外其他国家）', perPerson: 50, minNights: 1 },
      { label: '三档（东盟以外其他国家）', perPerson: 80, minNights: 1 },
    ],
    policyRef: '第十条 入境旅游团队接待奖励',
    tips: [
      '须满足该团为10人（含）以上持港澳台居民来往内地通行证或持外国护照的游客',
      '需与省文旅厅签订目标协议书',
      '1-11月每月预拨，次年1月30日前加上12月数据进行年度评估',
      '未达目标档次50%的不获得奖励；达50%-100%的按30%×实际人次奖励',
      '申请此项奖励的企业将不能申请第十一条专项旅游奖励',
    ],
  },

  // === 专项旅游奖励（第十一条）===
  special_aviation: {
    title: '航空旅游',
    desc: '组织港澳台直航或外国直航游客入黔，按人次奖励',
    major: 'special_tourism',
    perPerson: 10, // 港澳台直航10元/人次（外国直航按政策另定）
    policyRef: '第十一条（一）航空旅游',
    tips: [
      '港澳台直航：30人（含）以上持港澳台居民来往内地通行证，住宿≥2晚，游览≥2个4A+景区，10元/人次',
      '外国直航：30人（含）以上持外国护照，住宿≥2晚，游览≥2个4A+景区，按政策标准奖励',
      '一团一申请，行程结束后45天内提交',
      '与团队接待奖励互斥，不可同时申报',
      '需提供航空公司团体机票行程单 或 游客证件+入境签章',
    ],
  },
  special_multi_stop: {
    title: '一程多站联程旅游',
    desc: '组织游客经港澳台或大陆其他省市进入贵州旅游',
    major: 'special_tourism',
    perPerson: 15,
    policyRef: '第十一条（二）一程多站联程旅游',
    tips: [
      '亚洲国家游客：16人（含）以上，15元/人次',
      '亚洲以外国家游客：10人（含）以上，20元/人次',
      '一团一申请，行程结束后45天内提交',
      '需提供游客证件+入境签章 或 交通方式证明',
    ],
  },
  special_240_visa_free: {
    title: '240小时过境免签旅游',
    desc: '组织持外国护照符合240小时过境免签政策的游客入黔',
    major: 'special_tourism',
    perPerson: 30,
    policyRef: '第十一条（三）240小时过境免签旅游',
    tips: [
      '1人（含）以上，在贵州至少住宿1晚，游览≥1个4A+景区',
      '亚洲国家游客：30元/人次；亚洲以外国家游客：80元/人次',
      '需提供游客证件+临时入境许可证 或 交通方式证明',
    ],
  },
  special_high_speed_rail: {
    title: '高铁旅游',
    desc: '组织港澳台或外国游客乘同一车次高铁入黔',
    major: 'special_tourism',
    perPerson: 20,
    policyRef: '第十一条（四）高铁旅游',
    tips: [
      '港澳台120人（含）以上 或 外国30人（含）以上',
      '从香港乘同一车次高铁入黔（含经第三地当日入黔）',
      '在贵州至少住宿2晚，游览≥2个4A+景区',
      '20元/人次',
      '需提供团队游客车票 或 铁路团队信息表',
    ],
  },
  special_large_overseas_team: {
    title: '境外大型团队旅游',
    desc: '组织境外大型团队入黔旅游',
    major: 'special_tourism',
    perPerson: 60,
    policyRef: '第十一条（五）境外大型团队旅游',
    tips: [
      '东南亚游客150人（含）以上 或 东南亚以外国家50人（含）以上',
      '在贵州住宿≥2晚，游览≥1个4A+景区',
      '每人每晚住宿费用≥120元',
      '60元/人次',
      '需提供境外旅行商协议、住宿支付凭证、省文旅厅批复函',
    ],
  },

  // === 文旅宣传交流奖励（第十二条）===
  culture_exhibition: {
    title: '参展推广奖励',
    desc: '参加境外展会或组织推介活动宣传贵州文旅',
    major: 'culture_promotion',
    policyRef: '第十二条（一）参展推广奖励',
    tips: [
      '需前置审核：活动前提交方案、预算、预期目标',
      '活动结束后提交活动报告、效果及证明材料',
      '有购买展位：需展位合同/支付凭证 + 参展人员机票/高铁票 + 住宿凭证',
      '无购买展位：需参展人员机票/高铁票 + 住宿发票',
    ],
  },
  culture_invite_in: {
    title: '请进来奖励',
    desc: '邀请境外旅行商、媒体记者、博主等来贵州踩线考察',
    major: 'culture_promotion',
    perPerson: 250, // 港澳台起步250元/人/夜
    maxPerYear: POLICY_CONSTANTS.inviteInMaxPerYear,
    policyRef: '第十二条（二）请进来奖励',
    tips: [
      '邀请人数不超过30人（含）',
      '港澳台：250元/人/夜；亚洲：300元/人/夜；亚洲以外：450元/人/夜',
      `同一企业每年申请不超过${POLICY_CONSTANTS.inviteInMaxPerYear}次`,
      '需提前报备，活动结束后由省文旅厅批复',
      '需提供人员名单、机票/高铁票、住宿证明、接待行程、活动方案及总结报告',
    ],
  },
  culture_advertising: {
    title: '入境旅游宣传奖励',
    desc: '在境外投放广告或建立网站宣传贵州文旅产品',
    major: 'culture_promotion',
    ratio: 0.3,
    maxPerTime: 50000,
    policyRef: '第十二条（三）入境旅游宣传奖励',
    tips: [
      '投放广告：按广告总费用30%奖励，单次最高5万元',
      '  - 需广告合同、第三方出具的播放总结报告（含截图、效果）',
      '网站宣传：按获客订单实际人数100元/人奖励',
      '  - 需网站网址+截图、获客订单合同、人员在贵州出行依据',
    ],
  },
  culture_exchange: {
    title: '交流合作奖励',
    desc: '引进国外青少年交流计划或开展人文交流活动',
    major: 'culture_promotion',
    perPerson: 200, // 青少年交流亚洲200元/人次
    maxPerYear: POLICY_CONSTANTS.exchangeMaxPerYear,
    policyRef: '第十二条（四）交流合作奖励',
    tips: [
      '青少年人文交流：亚洲200元/人次，亚洲以外400元/人次',
      '人文交流活动：场地租赁费30%奖励，单次最高2万元',
      `同一企业每年申请不超过${POLICY_CONSTANTS.exchangeMaxPerYear}次`,
      '需提供人员名单、机票/高铁票、住宿证明、接待行程、活动方案及总结报告',
    ],
  },

  // === 旧类别（兼容历史数据展示） ===
  team_organize_inbound: undefined,
  team_receive_inbound: undefined,
  team_organize_domestic: undefined,
  charter_flight: undefined,
  charter_train: undefined,
  online_sales: undefined,
  media_promotion: undefined,
  meeting_exhibition: undefined,
  overseas_promotion: undefined,
};

// ========== 奖励金额计算（按政策重写） ==========
export function calcRewardAmount(app: Partial<Application>): number {
  if (!app.category) return 0;
  const rule = RewardRules[app.category];
  if (!rule) return 0;

  switch (app.category) {
    case 'team_reception': {
      // 团队接待奖励：按目标协议档次 × 实际人次
      // 简化：以入境游客数 × 单价（取中档50元/人次为示例）
      const inbound = app.inboundTourists || app.teamSize || 0;
      return inbound * 50;
    }
    case 'special_aviation': {
      const size = app.teamSize || 0;
      const per = app.aviationType === 'foreign_direct' ? 15 : 10;
      return size >= 30 ? size * per : 0;
    }
    case 'special_multi_stop': {
      const size = app.teamSize || 0;
      // 简化：按亚洲15元计算
      return size >= 16 ? size * 15 : 0;
    }
    case 'special_240_visa_free': {
      const size = app.teamSize || 0;
      return size >= 1 ? size * 30 : 0;
    }
    case 'special_high_speed_rail': {
      const size = app.teamSize || 0;
      return size >= 30 ? size * 20 : 0;
    }
    case 'special_large_overseas_team': {
      const size = app.teamSize || 0;
      return size >= 50 ? size * 60 : 0;
    }
    case 'culture_invite_in': {
      const people = app.meetingParticipants || 0;
      const nights = app.stayDays || 1;
      const times = app.activityTimes || 1;
      return people * nights * 250 * times;
    }
    case 'culture_advertising': {
      if (app.advertisingType === 'website_promo') {
        return (app.orderCount || 0) * 100;
      }
      // 投放广告：30% 且 ≤5万/次
      const amount = (app.advertisingAmount || 0) * (rule.ratio || 0.3);
      return Math.min(amount, rule.maxPerTime || 50000);
    }
    case 'culture_exchange': {
      if (app.exchangeType === 'humanity_activity') {
        // 场地费30%，最高2万
        const amount = (app.advertisingAmount || 0) * 0.3;
        return Math.min(amount, 20000);
      }
      const people = app.meetingParticipants || 0;
      return people * 200;
    }
    case 'culture_exhibition':
      // 参展推广：按实际费用30%奖励，简化处理
      return Math.min((app.advertisingAmount || 0) * 0.3, 50000);
    default:
      return 0;
  }
}

// ========== 必传材料清单（按附件2完整对齐） ==========
export interface MaterialItem {
  group: string; // 分组
  name: string; // 材料名称
  required: boolean; // 是否必传
  desc?: string; // 说明
}

// 基础材料（每次申报都需提交，附件2第161-164行）
export const BaseMaterials: MaterialItem[] = [
  { group: '基础材料', name: '《2026年贵州省入境"引客入黔"旅游奖励申请表》原件（加盖单位公章）', required: true, desc: '系统生成的申报单打印后盖章上传' },
  { group: '基础材料', name: '企业营业执照复印件（加盖公章）', required: true, desc: '可在企业资质档案中调用' },
  { group: '基础材料', name: '旅行社业务经营许可证复印件（加盖公章）', required: true, desc: '可在企业资质档案中调用' },
  { group: '基础材料', name: '法定代表人身份证复印件（加盖公章）', required: true, desc: '可在企业资质档案中调用' },
  { group: '基础材料', name: '税务部门出具的上月/季度税收完税凭证（加盖公章）', required: true, desc: '本次申报专享上传' },
  { group: '基础材料', name: '"信用中国"网站查询截图（加盖公章，查询时点为提交当日）', required: true, desc: `查询网址：${POLICY_CONSTANTS.creditChinaUrl}` },
];

// 入境团队接待+专项奖励的基本佐证材料（附件2第166-176行）
export const TeamSpecialBaseMaterials: MaterialItem[] = [
  { group: '组团情况', name: '组团社合同 或 接待计划（邮件、社交软件截图、传真等，加盖申报单位公章）', required: true, desc: '附件2-1-①' },
  { group: '接待情况', name: '团组接待计划书原件（含接团导游、司机本人签名，加盖申报单位公章）', required: true, desc: '附件2-1-②' },
  { group: '接待情况', name: '贵州文旅监管执法平台输出的电子行程单（含派团单号、游客名单）', required: true, desc: '需录入派团单号关联' },
  { group: '接待情况', name: '旅行社责任险证明复印件（加盖公章）', required: true, desc: '附件2-1-②' },
  { group: '住宿情况', name: '旅客名单（含入住/退房时间，加盖酒店销售部门或前台公章）', required: true, desc: '附件2-1-③' },
  { group: '参观景区情况', name: `至少${POLICY_CONSTANTS.minScenicCount}个4A+景区证明（旅客名单含进入景区时间，加盖景区公章）`, required: true, desc: '附件2-1-④' },
];

// 各专项奖励的"其他资料"（附件2-2，第177-193行）
export const SpecialExtraMaterials: Record<string, MaterialItem[]> = {
  team_reception: [
    { group: '团队接待其他资料', name: '与省文旅厅签订的目标协议书', required: true, desc: '附件2-2-①' },
    { group: '团队接待其他资料', name: '游客证件个人信息页复印件及中国（内陆）入境签章 或 持有效工作签证/留学签证页复印件', required: true, desc: '或提供交通方式证明（机票/高铁票/包车合同）' },
  ],
  special_aviation: [
    { group: '航空旅游其他资料', name: '航空公司出具的团队游客姓名的团体机票行程单', required: false, desc: '与下方二选一' },
    { group: '航空旅游其他资料', name: '团队所有游客的证件个人信息页复印件及中国（内陆）入境签章（或有效工作/留学签证页复印件）', required: false, desc: '与上方二选一' },
  ],
  special_multi_stop: [
    { group: '一程多站其他资料', name: '团队所有游客的证件个人信息页复印件及中国（内陆）入境签章（或有效工作/留学签证页复印件）', required: false, desc: '与下方二选一' },
    { group: '一程多站其他资料', name: '团队从港澳台或大陆进入贵州的交通方式证明（机票/高铁票/包车合同）', required: false, desc: '与上方二选一' },
  ],
  special_240_visa_free: [
    { group: '240小时过境免签其他资料', name: '团队所有游客的证件个人信息页复印件 + 临时入境许可证复印件', required: false, desc: '与下方二选一' },
    { group: '240小时过境免签其他资料', name: '团队从港澳台或大陆进入贵州的交通方式证明（含过路收费凭证）', required: false, desc: '与上方二选一' },
  ],
  special_high_speed_rail: [
    { group: '高铁旅游其他资料', name: '团队游客的车票原件或复印件（加盖申报单位公章）', required: false, desc: '与下方二选一' },
    { group: '高铁旅游其他资料', name: '加盖铁路销售部门公章的团队信息表（含姓名、证件号、车次、客源地）', required: false, desc: '与上方二选一' },
  ],
  special_large_overseas_team: [
    { group: '境外大型团队其他资料', name: '与境外旅行商签订的协议复印件', required: true },
    { group: '境外大型团队其他资料', name: '该团的住宿支付凭证（一团一开，发票单位不一致需说明关系）', required: true },
    { group: '境外大型团队其他资料', name: '省文化和旅游厅的批复函', required: true },
  ],
};

// 文旅宣传交流奖励佐证材料（附件2-194-209行）
export const CultureMaterials: Record<string, MaterialItem[]> = {
  culture_exhibition: [
    { group: '文旅宣传基础材料', name: '申请报备函', required: true, desc: '附件2-文旅-1' },
    { group: '文旅宣传基础材料', name: '省文旅厅的批复函件 或 下发的通知复印件', required: true, desc: '前置审核批复' },
    { group: '参展推广其他材料', name: '购买展位的合同复印件 或 支付凭证复印件（有购买展位时）', required: false },
    { group: '参展推广其他材料', name: '参展人员往返机票或高铁票', required: true },
    { group: '参展推广其他材料', name: '住宿凭证（加盖申报单位公章）', required: true },
  ],
  culture_invite_in: [
    { group: '文旅宣传基础材料', name: '申请报备函', required: true },
    { group: '文旅宣传基础材料', name: '省文旅厅的批复函件', required: true, desc: '活动结束后由省文旅厅宣传推广与交流合作处批复' },
    { group: '请进来其他材料', name: '参加人员名单（姓名、职务、联系方式）', required: true },
    { group: '请进来其他材料', name: '机票或高铁票复印件', required: true },
    { group: '请进来其他材料', name: '住宿证明（加盖酒店销售部门或前台公章）', required: true },
    { group: '请进来其他材料', name: '接待行程安排（加盖申请奖励单位公章）', required: true },
    { group: '请进来其他材料', name: '活动方案及总结报告（含现场图片、视频、媒体报道）', required: true },
  ],
  culture_advertising: [
    { group: '文旅宣传基础材料', name: '申请报备函', required: true },
    { group: '文旅宣传基础材料', name: '省文旅厅的批复函件', required: true },
    { group: '入境旅游宣传-投放广告', name: '投放广告的合同复印件（加盖申报单位公章）', required: true, desc: '投放广告情形必备' },
    { group: '入境旅游宣传-投放广告', name: '第三方出具的当地播放广告的总结报告（含广告投放截图、效果）', required: true, desc: '投放广告情形必备' },
    { group: '入境旅游宣传-网站宣传', name: '企业自建网站网址及截图 或 国外在线旅游预订平台贵州产品线路截图', required: true, desc: '网站宣传情形必备' },
    { group: '入境旅游宣传-网站宣传', name: '获客订单合同复印件（加盖申报单位公章）', required: true, desc: '网站宣传情形必备' },
    { group: '入境旅游宣传-网站宣传', name: '订单所含人员在贵州出行的依据（接待行程单、照片、住宿发票、入黔交通凭证）', required: true, desc: '网站宣传情形必备' },
  ],
  culture_exchange: [
    { group: '文旅宣传基础材料', name: '申请报备函', required: true },
    { group: '文旅宣传基础材料', name: '省文旅厅的批复函件', required: true },
    { group: '交流合作其他材料', name: '参加人员名单', required: true },
    { group: '交流合作其他材料', name: '机票或高铁票复印件', required: true },
    { group: '交流合作其他材料', name: '住宿证明（加盖酒店销售部门或前台公章）', required: true },
    { group: '交流合作其他材料', name: '接待行程安排（加盖申请奖励单位公章）', required: true },
    { group: '交流合作其他材料', name: '活动方案及总结报告（含现场图片、视频、媒体报道）', required: true },
  ],
};

// 前置审核材料（文旅宣传类专用，附件2-109行）
export const PreCheckMaterials: MaterialItem[] = [
  { group: '前置审核-活动前', name: '活动方案', required: true, desc: '活动开始前提交' },
  { group: '前置审核-活动前', name: '预算', required: true, desc: '活动开始前提交' },
  { group: '前置审核-活动前', name: '预期目标', required: true, desc: '活动开始前提交' },
  { group: '前置审核-活动后', name: '活动报告', required: true, desc: '活动结束后提交' },
  { group: '前置审核-活动后', name: '活动效果及证明材料', required: true, desc: '活动结束后提交' },
];

// 获取某类别的全部必传材料清单
export function getAllMaterials(category: RewardCategory): MaterialItem[] {
  const result: MaterialItem[] = [...BaseMaterials];

  // 文旅宣传类：前置审核 + 基础材料 + 类别专属
  if (category.startsWith('culture_')) {
    result.push(...PreCheckMaterials);
    const extra = CultureMaterials[category] || [];
    result.push(...extra);
    return result;
  }

  // 团队接待 + 专项奖励：基本佐证 + 类别专属其他资料
  result.push(...TeamSpecialBaseMaterials);
  const extra = SpecialExtraMaterials[category] || [];
  result.push(...extra);
  return result;
}

// ========== Mock 申报数据 ==========
export const MockApplications: Application[] = [
  {
    id: 'APP202601001',
    category: 'team_reception',
    applicantOrg: '贵州阳光国际旅行社',
    contactPerson: '李明',
    contactPhone: '13800138001',
    status: 'pending_initial',
    submitTime: '2027-01-10 10:30:00',
    createTime: '2027-01-08 09:00:00',
    updateTime: '2027-01-10 10:30:00',
    teamName: '韩国首尔-贵州5日游',
    teamSize: 25,
    inboundTourists: 25,
    stayDays: 5,
    travelStart: '2026-06-10',
    travelEnd: '2026-06-14',
    dispatchNo: 'GZ20260610001',
    targetAgreementNo: 'XY-2026-001',
    calculatedAmount: 1250,
    attachments: [
      { uid: '1', name: '团队行程单.pdf', size: 524288, type: 'application/pdf', uploadTime: '2027-01-10 10:25:00', group: 'reception' },
      { uid: '2', name: '游客名单.xlsx', size: 32768, type: 'xlsx', uploadTime: '2027-01-10 10:26:00', group: 'reception' },
      { uid: '3', name: '住宿凭证.pdf', size: 1048576, type: 'application/pdf', uploadTime: '2027-01-10 10:27:00', group: 'accommodation' },
      { uid: '4', name: '目标协议书.pdf', size: 824288, type: 'application/pdf', uploadTime: '2027-01-10 10:27:30', group: 'special_extra' },
    ],
    scenics: [
      { key: 's1', name: '黄果树瀑布', level: '5A', enterTime: '2026-06-11 09:00' },
      { key: 's2', name: '荔波小七孔', level: '5A', enterTime: '2026-06-12 08:30' },
    ],
    auditLogs: [
      { id: 'a1', stage: 'initial', operator: '李明', operatorRole: 'applicant', action: 'submit', comment: '提交申报', time: '2027-01-10 10:30:00' },
    ],
  },
  {
    id: 'APP202601002',
    category: 'special_aviation',
    applicantOrg: '贵州阳光国际旅行社',
    contactPerson: '李明',
    contactPhone: '13800138001',
    status: 'initialing',
    submitTime: '2027-01-12 14:20:00',
    createTime: '2027-01-11 16:00:00',
    updateTime: '2027-01-13 09:15:00',
    teamName: '日本大阪直航团',
    teamSize: 145,
    inboundTourists: 145,
    stayDays: 4,
    travelStart: '2026-09-15',
    travelEnd: '2026-09-18',
    flightNo: 'CA8234',
    aviationType: 'foreign_direct',
    dispatchNo: 'GZ20260915001',
    calculatedAmount: 2175,
    attachments: [
      { uid: '4', name: '团体机票行程单.pdf', size: 2097152, type: 'application/pdf', uploadTime: '2027-01-12 14:15:00', group: 'special_extra' },
      { uid: '5', name: '航班信息.pdf', size: 102400, type: 'application/pdf', uploadTime: '2027-01-12 14:16:00', group: 'special_extra' },
    ],
    auditLogs: [
      { id: 'a2', stage: 'initial', operator: '李明', operatorRole: 'applicant', action: 'submit', comment: '提交申报', time: '2027-01-12 14:20:00' },
      { id: 'a3', stage: 'initial', operator: '王芳', operatorRole: 'initial_reviewer', action: 'assign', comment: '分配给王芳初审', time: '2027-01-13 09:15:00' },
    ],
  },
  {
    id: 'APP202601003',
    category: 'culture_advertising',
    applicantOrg: '贵州黔程旅行社',
    contactPerson: '张华',
    contactPhone: '13900139002',
    status: 'pending_payment',
    submitTime: '2027-01-05 11:00:00',
    createTime: '2027-01-03 10:00:00',
    updateTime: '2027-01-20 16:30:00',
    advertisingType: 'ad_placement',
    advertisingAmount: 280000,
    calculatedAmount: 50000,
    approvedAmount: 50000,
    preCheck: {
      applicationNo: 'YC-202510-001',
      applyDate: '2025-10-15',
      approvedDate: '2025-10-25',
      approvalNo: 'SW-F-2025-088',
    },
    attachments: [
      { uid: '6', name: '广告合同.pdf', size: 524288, type: 'application/pdf', uploadTime: '2027-01-05 10:50:00', group: 'culture_extra' },
      { uid: '7', name: '第三方播放报告.pdf', size: 1524288, type: 'application/pdf', uploadTime: '2027-01-05 10:50:30', group: 'culture_extra' },
      { uid: '8', name: '省文旅厅批复函.pdf', size: 324288, type: 'application/pdf', uploadTime: '2027-01-05 10:51:00', group: 'culture_base' },
    ],
    auditLogs: [
      { id: 'a4', stage: 'pre_check', operator: '张华', operatorRole: 'applicant', action: 'submit', comment: '提交前置审核', time: '2025-10-15 10:00:00' },
      { id: 'a5', stage: 'pre_check', operator: '陈华', operatorRole: 'final_reviewer', action: 'pre_check_pass', comment: '前置审核通过', time: '2025-10-25 16:00:00' },
      { id: 'a6', stage: 'initial', operator: '张华', operatorRole: 'applicant', action: 'submit', time: '2027-01-05 11:00:00' },
      { id: 'a7', stage: 'initial', operator: '王芳', operatorRole: 'initial_reviewer', action: 'pass', comment: '初审通过', time: '2027-01-08 15:00:00' },
      { id: 'a8', stage: 'review', operator: '刘强', operatorRole: 'review_reviewer', action: 'pass', comment: '复审通过', time: '2027-01-15 10:00:00' },
      { id: 'a9', stage: 'final', operator: '陈华', operatorRole: 'final_reviewer', action: 'pass', comment: '终审通过，核定5万元', time: '2027-01-20 16:30:00' },
    ],
  },
  {
    id: 'APP202601004',
    category: 'special_high_speed_rail',
    applicantOrg: '贵州黔程旅行社',
    contactPerson: '张华',
    contactPhone: '13900139002',
    status: 'initial_returned',
    submitTime: '2027-01-09 09:30:00',
    createTime: '2027-01-07 14:00:00',
    updateTime: '2027-01-11 11:00:00',
    teamName: '香港高铁团',
    teamSize: 38,
    inboundTourists: 38,
    stayDays: 4,
    travelStart: '2026-07-01',
    travelEnd: '2026-07-04',
    trainNo: 'G822',
    dispatchNo: 'GZ20260701001',
    calculatedAmount: 760,
    attachments: [
      { uid: '7', name: '团队行程单.pdf', size: 524288, type: 'application/pdf', uploadTime: '2027-01-09 09:25:00', group: 'reception' },
    ],
    auditLogs: [
      { id: 'a8', stage: 'initial', operator: '张华', operatorRole: 'applicant', action: 'submit', time: '2027-01-09 09:30:00' },
      { id: 'a9', stage: 'initial', operator: '王芳', operatorRole: 'initial_reviewer', action: 'return', comment: '游客名单缺失身份证号，请补充', time: '2027-01-11 11:00:00' },
    ],
  },
  {
    id: 'APP202601005',
    category: 'culture_invite_in',
    applicantOrg: '贵州山水旅行社',
    contactPerson: '王磊',
    contactPhone: '13700137003',
    status: 'paid',
    submitTime: '2026-12-28 10:00:00',
    createTime: '2026-12-25 10:00:00',
    updateTime: '2027-01-25 14:00:00',
    meetingName: '日本旅行商贵州踩线活动',
    meetingLocation: '贵州',
    meetingParticipants: 15,
    activityTimes: 1,
    stayDays: 3,
    travelStart: '2026-12-10',
    travelEnd: '2026-12-13',
    calculatedAmount: 11250,
    approvedAmount: 11250,
    preCheck: {
      applicationNo: 'YC-202611-005',
      applyDate: '2026-11-05',
      approvedDate: '2026-11-15',
      approvalNo: 'SW-F-2026-045',
    },
    attachments: [
      { uid: '8', name: '活动方案及总结报告.pdf', size: 1048576, type: 'application/pdf', uploadTime: '2026-12-28 09:50:00', group: 'culture_extra' },
      { uid: '9', name: '费用票据汇总.pdf', size: 2097152, type: 'application/pdf', uploadTime: '2026-12-28 09:55:00', group: 'culture_extra' },
    ],
    auditLogs: [
      { id: 'a10', stage: 'initial', operator: '王磊', operatorRole: 'applicant', action: 'submit', time: '2026-12-28 10:00:00' },
      { id: 'a11', stage: 'initial', operator: '王芳', operatorRole: 'initial_reviewer', action: 'pass', time: '2027-01-03 10:00:00' },
      { id: 'a12', stage: 'review', operator: '刘强', operatorRole: 'review_reviewer', action: 'pass', time: '2027-01-08 14:00:00' },
      { id: 'a13', stage: 'final', operator: '陈华', operatorRole: 'final_reviewer', action: 'pass', time: '2027-01-15 10:00:00' },
      { id: 'a14', stage: 'payment', operator: '财务-赵敏', operatorRole: 'admin', action: 'pay', comment: '资金已拨付', time: '2027-01-25 14:00:00' },
    ],
  },
  {
    id: 'APP202601006',
    category: 'culture_exchange',
    applicantOrg: '贵州山水旅行社',
    contactPerson: '王磊',
    contactPhone: '13700137003',
    status: 'draft',
    createTime: '2027-01-15 09:00:00',
    updateTime: '2027-01-15 09:00:00',
    meetingName: '中日青少年人文交流活动',
    exchangeType: 'youth_exchange',
    meetingParticipants: 20,
    stayDays: 5,
    calculatedAmount: 4000,
    attachments: [],
    auditLogs: [],
  },
  {
    id: 'APP202601007',
    category: 'special_multi_stop',
    applicantOrg: '贵州中铁旅行社',
    contactPerson: '陈伟',
    contactPhone: '13600136004',
    status: 'reviewing',
    submitTime: '2027-01-06 15:00:00',
    createTime: '2027-01-04 09:00:00',
    updateTime: '2027-01-14 10:00:00',
    teamName: '经香港中转-贵州5日游',
    teamSize: 32,
    inboundTourists: 32,
    stayDays: 5,
    travelStart: '2026-08-10',
    travelEnd: '2026-08-14',
    dispatchNo: 'GZ20260810001',
    calculatedAmount: 480,
    attachments: [
      { uid: '10', name: '游客证件复印件.pdf', size: 3145728, type: 'application/pdf', uploadTime: '2027-01-06 14:50:00', group: 'special_extra' },
    ],
    auditLogs: [
      { id: 'a15', stage: 'initial', operator: '陈伟', operatorRole: 'applicant', action: 'submit', time: '2027-01-06 15:00:00' },
      { id: 'a16', stage: 'initial', operator: '王芳', operatorRole: 'initial_reviewer', action: 'pass', time: '2027-01-10 11:00:00' },
      { id: 'a17', stage: 'review', operator: '刘强', operatorRole: 'review_reviewer', action: 'assign', time: '2027-01-14 10:00:00' },
    ],
  },
  {
    id: 'APP202601008',
    category: 'culture_exhibition',
    applicantOrg: '贵州中铁旅行社',
    contactPerson: '陈伟',
    contactPhone: '13600136004',
    status: 'publicizing',
    submitTime: '2027-01-02 09:00:00',
    createTime: '2026-12-30 09:00:00',
    updateTime: '2027-01-22 16:00:00',
    meetingName: '2026东京国际旅游展',
    meetingLocation: '日本东京',
    meetingParticipants: 50,
    travelStart: '2026-12-20',
    travelEnd: '2026-12-22',
    advertisingAmount: 150000,
    calculatedAmount: 45000,
    approvedAmount: 45000,
    preCheck: {
      applicationNo: 'YC-202611-008',
      applyDate: '2026-11-10',
      approvedDate: '2026-11-20',
      approvalNo: 'SW-F-2026-052',
    },
    attachments: [
      { uid: '11', name: '参展方案.pdf', size: 1048576, type: 'application/pdf', uploadTime: '2027-01-02 08:50:00', group: 'culture_extra' },
      { uid: '12', name: '展位合同.pdf', size: 524288, type: 'application/pdf', uploadTime: '2027-01-02 08:51:00', group: 'culture_extra' },
    ],
    auditLogs: [
      { id: 'a18', stage: 'initial', operator: '陈伟', operatorRole: 'applicant', action: 'submit', time: '2027-01-02 09:00:00' },
      { id: 'a19', stage: 'initial', operator: '王芳', operatorRole: 'initial_reviewer', action: 'pass', time: '2027-01-05 10:00:00' },
      { id: 'a20', stage: 'review', operator: '刘强', operatorRole: 'review_reviewer', action: 'pass', time: '2027-01-12 11:00:00' },
      { id: 'a21', stage: 'final', operator: '陈华', operatorRole: 'final_reviewer', action: 'pass', comment: '进入公示', time: '2027-01-22 16:00:00' },
    ],
  },
];

export const MockMessages: Message[] = [
  {
    id: 'm1',
    title: '申报已退回',
    content: '您的申报 APP202601004 被初审退回，原因：游客名单缺失身份证号，请补充',
    type: 'audit',
    read: false,
    createTime: '2027-01-11 11:00:00',
    applicationId: 'APP202601004',
  },
  {
    id: 'm2',
    title: '初审通过',
    content: '您的申报 APP202601007 已通过初审，进入复审环节',
    type: 'audit',
    read: false,
    createTime: '2027-01-10 11:00:00',
    applicationId: 'APP202601007',
  },
  {
    id: 'm3',
    title: '资金已拨付',
    content: '您的申报 APP202601005 奖励资金11250元已拨付至您的银行账户，请查收',
    type: 'payment',
    read: true,
    createTime: '2027-01-25 14:00:00',
    applicationId: 'APP202601005',
  },
  {
    id: 'm4',
    title: '申报截止提醒',
    content: '2026年度奖励申报截止日期为2027年1月31日，请尽快完成申报',
    type: 'system',
    read: false,
    createTime: '2027-01-20 09:00:00',
  },
  {
    id: 'm5',
    title: '前置审核通过',
    content: '您的文旅宣传交流奖励前置审核已通过（批复编号：SW-F-2025-088），可进行正式申报',
    type: 'audit',
    read: true,
    createTime: '2025-10-25 16:00:00',
    applicationId: 'APP202601003',
  },
];

// ========== Mock 投诉台账数据 ==========
export const MockComplaints: Complaint[] = [
  {
    id: 'TS-20260801-0001',
    title: '旅行社擅自变更行程路线',
    province: '贵州省',
    city: '贵阳市',
    district: '南明区',
    complaintMethod: 'hotline_12345',
    tourismCategory: 'travel_agency',
    complaintTime: '2026-08-01',
    status: 'closed',
    complainant: {
      name: '张三',
      gender: 'male',
      phone: '138****5678',
      email: 'zhangsan@example.com',
      address: '四川省成都市武侯区XX路10号',
      contractDate: '2026-07-20',
    },
    respondent: {
      name: '贵州阳光国际旅行社',
      address: '贵阳市南明区花果园大街1号',
      phone: '0851-85123456',
    },
    content: '本人参加贵州阳光国际旅行社组织的"黄果树-荔波5日游"旅行团，合同约定第三天游览黄果树瀑布景区，但导游在未征得游客同意的情况下擅自将行程变更为购物点，严重违反合同约定。',
    requests: '要求旅行社退还购物点相关费用并赔偿精神损失',
    handlerOpinion: '经核实，该旅行社确实存在擅自变更行程的行为，已约谈旅行社负责人，要求整改并退还相关费用。',
    reviewerOpinion: '同意办理意见，责成旅行社7个工作日内完成退款。',
    replyStatus: 'closed',
    replyTime: '2026-08-10',
    replyContent: '已协调旅行社退还购物点费用共计500元/人，游客表示满意。',
    attachments: [
      { uid: 'c1', name: '旅游合同扫描件.pdf', size: 524288, type: 'application/pdf', uploadTime: '2026-08-01 10:00:00', title: '旅游合同' },
      { uid: 'c2', name: '行程变更照片.jpg', size: 102400, type: 'image/jpeg', uploadTime: '2026-08-01 10:01:00', title: '现场照片' },
    ],
    remark: '游客通过12345热线投诉，工单编号：GZ20260801001',
    createdBy: '管理员',
    createTime: '2026-08-01 10:05:00',
    updateTime: '2026-08-10 16:00:00',
    operationLogs: [
      { id: 'ol1', operator: '管理员', action: 'create', summary: '录入投诉信息', time: '2026-08-01 10:05:00' },
      { id: 'ol2', operator: '管理员', action: 'process', summary: '填写办理意见', time: '2026-08-05 14:00:00' },
      { id: 'ol3', operator: '管理员', action: 'review', summary: '负责人审核通过', time: '2026-08-06 10:00:00' },
      { id: 'ol4', operator: '管理员', action: 'close', summary: '办结归档', time: '2026-08-10 16:00:00' },
    ],
  },
  {
    id: 'TS-20260805-0002',
    title: '景区门票价格未公示',
    province: '贵州省',
    city: '安顺市',
    district: '镇宁布依族苗族自治县',
    complaintMethod: 'hotline_12345',
    tourismCategory: 'scenic_area',
    complaintTime: '2026-08-05',
    status: 'processing',
    complainant: {
      name: '李四',
      gender: 'female',
      phone: '139****1234',
      contractDate: '2026-08-03',
    },
    respondent: {
      name: '黄果树瀑布景区',
      address: '安顺市镇宁布依族苗族自治县黄果树镇',
      phone: '0851-33591111',
    },
    content: '黄果树瀑布景区入口处未见门票价格公示牌，游客无法了解票价信息，且窗口售票人员未主动告知优惠政策。',
    requests: '要求景区规范价格公示，并退还多收的门票费用',
    handlerOpinion: '已联系景区管理处核实情况，景区承认公示牌存在损坏正在更换中。已要求景区加快整改进度。',
    replyStatus: 'none',
    attachments: [
      { uid: 'c3', name: '景区入口照片.jpg', size: 204800, type: 'image/jpeg', uploadTime: '2026-08-05 09:30:00', title: '现场照片' },
    ],
    createdBy: '管理员',
    createTime: '2026-08-05 09:35:00',
    updateTime: '2026-08-08 15:00:00',
    operationLogs: [
      { id: 'ol5', operator: '管理员', action: 'create', summary: '录入投诉信息', time: '2026-08-05 09:35:00' },
      { id: 'ol6', operator: '管理员', action: 'process', summary: '填写办理意见', time: '2026-08-08 15:00:00' },
    ],
  },
  {
    id: 'TS-20260720-0003',
    title: '导游强制购物投诉',
    province: '贵州省',
    city: '黔东南苗族侗族自治州',
    district: '雷山县',
    complaintMethod: 'phone',
    tourismCategory: 'tour_guide',
    complaintTime: '2026-07-20',
    status: 'replied',
    complainant: {
      name: '王五',
      gender: 'male',
      phone: '137****8888',
      email: 'wangwu@example.com',
      address: '湖南省长沙市岳麓区XX路20号',
      contractDate: '2026-07-15',
    },
    respondent: {
      name: '导游李某（执业证号：D-5201-000123）',
      address: '贵阳市云岩区',
      phone: '136****0001',
    },
    content: '在参加西江千户苗寨一日游过程中，导游李某多次强制安排购物行程，言语威胁不购物就不安排午餐，严重损害游客权益。',
    requests: '要求查处导游违规行为，退还强制购物费用',
    handlerOpinion: '经调查，导游李某确实存在强制购物行为。已将情况通报旅游执法大队，拟对李某进行行政处罚。',
    reviewerOpinion: '同意办理意见，依法依规处理。',
    isTransferredToCase: true,
    suspectedIssue: '导游强制购物，违反《旅游法》第三十五条',
    replyStatus: 'replied',
    replyTime: '2026-08-01',
    replyContent: '已对导游李某立案调查，强制购物费用共计1200元已退还投诉人。',
    attachments: [
      { uid: 'c4', name: '购物小票.jpg', size: 51200, type: 'image/jpeg', uploadTime: '2026-07-20 14:00:00', title: '购物凭证' },
      { uid: 'c5', name: '导游证件照片.jpg', size: 81920, type: 'image/jpeg', uploadTime: '2026-07-20 14:01:00', title: '导游证' },
    ],
    remark: '诉转案，已转执法大队处理',
    createdBy: '管理员',
    createTime: '2026-07-20 14:10:00',
    updateTime: '2026-08-01 17:00:00',
    operationLogs: [
      { id: 'ol7', operator: '管理员', action: 'create', summary: '录入投诉信息', time: '2026-07-20 14:10:00' },
      { id: 'ol8', operator: '管理员', action: 'process', summary: '填写办理意见，标记诉转案', time: '2026-07-25 10:00:00' },
      { id: 'ol9', operator: '管理员', action: 'review', summary: '负责人审核通过', time: '2026-07-26 15:00:00' },
      { id: 'ol10', operator: '管理员', action: 'reply', summary: '回复投诉人', time: '2026-08-01 17:00:00' },
    ],
  },
  {
    id: 'TS-20260810-0004',
    title: '酒店卫生条件差要求退款',
    province: '贵州省',
    city: '贵阳市',
    district: '观山湖区',
    complaintMethod: 'phone',
    tourismCategory: 'accommodation',
    complaintTime: '2026-08-10',
    status: 'pending',
    complainant: {
      name: '赵六',
      gender: 'male',
      phone: '135****6666',
    },
    respondent: {
      name: '贵阳XX大酒店',
      address: '贵阳市观山湖区XX路88号',
      phone: '0851-87999999',
    },
    content: '入住贵阳XX大酒店后发现房间床单有污渍、卫生间有异味，要求更换房间被前台拒绝，要求退款被拒。',
    requests: '要求酒店退还房费并道歉',
    replyStatus: 'none',
    attachments: [],
    createdBy: '管理员',
    createTime: '2026-08-10 11:00:00',
    updateTime: '2026-08-10 11:00:00',
    operationLogs: [
      { id: 'ol11', operator: '管理员', action: 'create', summary: '录入投诉信息', time: '2026-08-10 11:00:00' },
    ],
  },
  {
    id: 'TS-20260615-0005',
    title: '在线旅游平台虚假宣传',
    province: '贵州省',
    city: '遵义市',
    district: '红花岗区',
    complaintMethod: 'online_platform',
    tourismCategory: 'online_travel',
    complaintTime: '2026-06-15',
    status: 'closed',
    complainant: {
      name: '孙七',
      gender: 'female',
      phone: '133****2222',
      email: 'sunqi@example.com',
      contractDate: '2026-06-10',
    },
    respondent: {
      name: 'XX在线旅游平台',
      address: '上海市浦东新区XX大厦',
    },
    content: '在XX在线旅游平台预订遵义红色旅游线路，页面宣传包含"全程五星酒店"，实际入住为三星级酒店，涉嫌虚假宣传。',
    requests: '要求平台退还差价并更正宣传信息',
    handlerOpinion: '已联系平台核实，平台承认页面信息有误，同意退还差价并更正宣传内容。',
    reviewerOpinion: '同意处理意见。',
    replyStatus: 'closed',
    replyTime: '2026-06-25',
    replyContent: '平台已退还差价800元，并更正了相关页面宣传信息。',
    attachments: [
      { uid: 'c6', name: '平台宣传截图.png', size: 307200, type: 'image/png', uploadTime: '2026-06-15 16:00:00', title: '宣传截图' },
    ],
    createdBy: '管理员',
    createTime: '2026-06-15 16:10:00',
    updateTime: '2026-06-25 14:00:00',
    operationLogs: [
      { id: 'ol12', operator: '管理员', action: 'create', summary: '录入投诉信息', time: '2026-06-15 16:10:00' },
      { id: 'ol13', operator: '管理员', action: 'close', summary: '办结归档', time: '2026-06-25 14:00:00' },
    ],
  },
  {
    id: 'TS-20260728-0006',
    title: '旅游大巴超载行驶',
    province: '贵州省',
    city: '铜仁市',
    district: '江口县',
    complaintMethod: 'online_platform',
    tourismCategory: 'transportation',
    complaintTime: '2026-07-28',
    status: 'transferred',
    complainant: {
      name: '周八',
      gender: 'male',
      phone: '138****9999',
      address: '广东省广州市天河区XX路5号',
    },
    respondent: {
      name: '铜仁XX旅游客运公司',
      address: '铜仁市碧江区XX路',
      phone: '0856-5212345',
    },
    content: '乘坐梵净山旅游专线大巴时，发现车辆核载35人实际乘坐42人，存在严重安全隐患。',
    requests: '要求查处超载行为',
    handlerOpinion: '涉嫌违反道路交通安全法规，已转交交通运输执法部门处理。',
    reviewerOpinion: '同意转办。',
    isTransferredToCase: true,
    suspectedIssue: '客车超载，违反《道路交通安全法》',
    replyStatus: 'none',
    attachments: [
      { uid: 'c7', name: '车内现场照片.jpg', size: 153600, type: 'image/jpeg', uploadTime: '2026-07-28 09:00:00', title: '现场照片' },
    ],
    remark: '来信投诉，已转交通运输部门',
    createdBy: '管理员',
    createTime: '2026-07-28 09:30:00',
    updateTime: '2026-08-02 10:00:00',
    operationLogs: [
      { id: 'ol14', operator: '管理员', action: 'create', summary: '录入投诉信息', time: '2026-07-28 09:30:00' },
      { id: 'ol15', operator: '管理员', action: 'process', summary: '填写办理意见，标记诉转案', time: '2026-08-01 14:00:00' },
    ],
  },
  // V1.2：以下 4 条投诉用于演示聚类分析（同一商家重复投诉、同一区域×相同类型高发组合）
  {
    id: 'TS-20260815-0006',
    title: '旅行社擅自增加自费项目',
    province: '贵州省',
    city: '贵阳市',
    district: '南明区',
    complaintMethod: 'phone',
    tourismCategory: 'travel_agency',
    complaintTime: '2026-08-15',
    status: 'processing',
    complainant: { name: '孙九', gender: 'female', phone: '139****2233', contractDate: '2026-08-10' },
    respondent: { name: '贵州阳光国际旅行社', address: '贵阳市南明区花果园大街1号', phone: '0851-85123456' },
    content: '参加贵州阳光国际旅行社组织的"西江千户苗寨2日游"，导游在行程中强制增加自费项目，不参加就被孤立，与8月初同类问题如出一辙。',
    requests: '要求查处并退还自费项目费用',
    handlerOpinion: '已约谈旅行社，要求立即整改并退还费用。',
    replyStatus: 'none',
    attachments: [],
    createdBy: '管理员',
    createTime: '2026-08-15 10:20:00',
    updateTime: '2026-08-15 10:20:00',
    operationLogs: [{ id: 'ol16', operator: '管理员', action: 'create', summary: '录入投诉信息', time: '2026-08-15 10:20:00' }],
  },
  {
    id: 'TS-20260816-0007',
    title: '旅行社合同违约拒绝退款',
    province: '贵州省',
    city: '贵阳市',
    district: '云岩区',
    complaintMethod: 'hotline_12345',
    tourismCategory: 'travel_agency',
    complaintTime: '2026-08-16',
    status: 'pending',
    complainant: { name: '周十', gender: 'male', phone: '137****4455', contractDate: '2026-08-12' },
    respondent: { name: '贵州阳光国际旅行社', address: '贵阳市南明区花果园大街1号', phone: '0851-85123456' },
    content: '贵州阳光国际旅行社未按合同约定提供4星级住宿，实际安排快捷酒店，要求退差价被拒，该旅行社近期投诉频发。',
    requests: '要求退还住宿差价并赔偿',
    replyStatus: 'none',
    attachments: [{ uid: 'c8', name: '住宿对比照片.jpg', size: 96000, type: 'image/jpeg', uploadTime: '2026-08-16 09:00:00', title: '现场照片' }],
    createdBy: '管理员',
    createTime: '2026-08-16 09:10:00',
    updateTime: '2026-08-16 09:10:00',
    operationLogs: [{ id: 'ol17', operator: '管理员', action: 'create', summary: '录入投诉信息', time: '2026-08-16 09:10:00' }],
  },
  {
    id: 'TS-20260818-0008',
    title: '景区强制拍照收费',
    province: '贵州省',
    city: '安顺市',
    district: '镇宁布依族苗族自治县',
    complaintMethod: 'hotline_12345',
    tourismCategory: 'scenic_area',
    complaintTime: '2026-08-18',
    status: 'processing',
    complainant: { name: '吴十一', gender: 'male', phone: '135****7788', contractDate: '2026-08-16' },
    respondent: { name: '黄果树瀑布景区', address: '安顺市镇宁布依族苗族自治县黄果树镇', phone: '0851-33591111' },
    content: '黄果树瀑布景区内多处设点强制游客拍照并收费，不付费不让通过，与8月初门票未公示问题叠加，管理混乱。',
    requests: '要求取消强制拍照收费并公示',
    handlerOpinion: '已要求景区管理处核实并整改。',
    replyStatus: 'none',
    attachments: [],
    createdBy: '管理员',
    createTime: '2026-08-18 14:00:00',
    updateTime: '2026-08-18 14:00:00',
    operationLogs: [{ id: 'ol18', operator: '管理员', action: 'create', summary: '录入投诉信息', time: '2026-08-18 14:00:00' }],
  },
  {
    id: 'TS-20260819-0009',
    title: '景区停车乱收费',
    province: '贵州省',
    city: '安顺市',
    district: '镇宁布依族苗族自治县',
    complaintMethod: 'phone',
    tourismCategory: 'scenic_area',
    complaintTime: '2026-08-19',
    status: 'pending',
    complainant: { name: '郑十二', gender: 'female', phone: '138****1100', contractDate: '2026-08-17' },
    respondent: { name: '黄果树瀑布景区', address: '安顺市镇宁布依族苗族自治县黄果树镇', phone: '0851-33591111' },
    content: '黄果树瀑布景区停车场无收费公示牌，收费员随意要价，比公示标准多收20元，要求退还。',
    requests: '要求退还多收停车费并规范收费',
    replyStatus: 'none',
    attachments: [],
    createdBy: '管理员',
    createTime: '2026-08-19 11:00:00',
    updateTime: '2026-08-19 11:00:00',
    operationLogs: [{ id: 'ol19', operator: '管理员', action: 'create', summary: '录入投诉信息', time: '2026-08-19 11:00:00' }],
  },
];

// ========== 团信息预设数据（模拟用户提前填报的团信息） ==========
export interface TeamPreset {
  teamName: string;
  teamSize: number;
  inboundTourists: number;
  stayDays: number;
  travelStart: string;
  travelEnd: string;
  travelDesc: string;
  dispatchNo: string;
  targetAgreementNo: string;
  flightNo?: string;
  trainNo?: string;
  tourists: TouristItem[];
  scenics: ScenicInfo[];
  accommodations: AccommodationInfo[];
  guideDrivers: GuideDriverInfo[];
}

export const MockTeamPresets: TeamPreset[] = [
  {
    teamName: '韩国首尔-贵州5日游',
    teamSize: 15,
    inboundTourists: 12,
    stayDays: 5,
    travelStart: '2026-09-01',
    travelEnd: '2026-09-05',
    travelDesc: '贵阳入境→黄果树瀑布→荔波小七孔→西江千户苗寨→贵阳出境',
    dispatchNo: 'GZ-2026-0901-001',
    targetAgreementNo: 'TA-2026-001',
    flightNo: 'CA8234',
    tourists: [
      { key: 't1', name: 'Kim Min-su', idType: 'passport', idNumber: 'KR1234567', nationality: '韩国', sourcePlace: '首尔', age: 35, gender: 'male' },
      { key: 't2', name: 'Lee Ji-eun', idType: 'passport', idNumber: 'KR2345678', nationality: '韩国', sourcePlace: '首尔', age: 28, gender: 'female' },
      { key: 't3', name: 'Park Chan-wook', idType: 'passport', idNumber: 'KR3456789', nationality: '韩国', sourcePlace: '釜山', age: 42, gender: 'male' },
      { key: 't4', name: 'Choi Seung-hyun', idType: 'passport', idNumber: 'KR4567890', nationality: '韩国', sourcePlace: '首尔', age: 31, gender: 'male' },
    ],
    scenics: [
      { key: 's1', name: '黄果树瀑布景区', level: '5A', enterTime: '2026-09-02 09:00' },
      { key: 's2', name: '荔波小七孔景区', level: '5A', enterTime: '2026-09-03 08:30' },
    ],
    accommodations: [
      { key: 'a1', hotelName: '贵阳凯宾斯基酒店', checkInDate: '2026-09-01', checkOutDate: '2026-09-02' },
      { key: 'a2', hotelName: '安顺百灵希尔顿逸林酒店', checkInDate: '2026-09-02', checkOutDate: '2026-09-03' },
      { key: 'a3', hotelName: '贵阳凯宾斯基酒店', checkInDate: '2026-09-04', checkOutDate: '2026-09-05' },
    ],
    guideDrivers: [
      { key: 'g1', type: 'guide', name: '张小明', licenseNo: 'GZ-2021-0568' },
      { key: 'g2', type: 'driver', name: '王师傅', licenseNo: 'GZ-A-2021-0568' },
    ],
  },
  {
    teamName: '日本东京-贵州4日游',
    teamSize: 20,
    inboundTourists: 18,
    stayDays: 4,
    travelStart: '2026-09-10',
    travelEnd: '2026-09-13',
    travelDesc: '贵阳入境→梵净山→镇远古城→贵阳出境',
    dispatchNo: 'GZ-2026-0910-002',
    targetAgreementNo: 'TA-2026-002',
    flightNo: 'MU729',
    tourists: [
      { key: 't1', name: 'Tanaka Hiroshi', idType: 'passport', idNumber: 'JP1234567', nationality: '日本', sourcePlace: '东京', age: 45, gender: 'male' },
      { key: 't2', name: 'Suzuki Yuki', idType: 'passport', idNumber: 'JP2345678', nationality: '日本', sourcePlace: '大阪', age: 33, gender: 'female' },
      { key: 't3', name: 'Yamamoto Aoi', idType: 'passport', idNumber: 'JP3456789', nationality: '日本', sourcePlace: '东京', age: 27, gender: 'female' },
    ],
    scenics: [
      { key: 's1', name: '梵净山景区', level: '5A', enterTime: '2026-09-11 07:00' },
      { key: 's2', name: '镇远古城景区', level: '4A', enterTime: '2026-09-12 10:00' },
    ],
    accommodations: [
      { key: 'a1', hotelName: '铜仁江华国际酒店', checkInDate: '2026-09-10', checkOutDate: '2026-09-11' },
      { key: 'a2', hotelName: '镇远府城宾馆', checkInDate: '2026-09-11', checkOutDate: '2026-09-12' },
      { key: 'a3', hotelName: '贵阳铂尔曼大酒店', checkInDate: '2026-09-12', checkOutDate: '2026-09-13' },
    ],
    guideDrivers: [
      { key: 'g1', type: 'guide', name: '李芳', licenseNo: 'GZ-2020-0321' },
      { key: 'g2', type: 'driver', name: '刘师傅', licenseNo: 'GZ-B-2020-0321' },
    ],
  },
  {
    teamName: '香港直飞-贵州3日游',
    teamSize: 12,
    inboundTourists: 10,
    stayDays: 3,
    travelStart: '2026-09-15',
    travelEnd: '2026-09-17',
    travelDesc: '贵阳入境→西江千户苗寨→青岩古镇→贵阳出境',
    dispatchNo: 'GZ-2026-0915-003',
    targetAgreementNo: 'TA-2026-003',
    flightNo: 'CZ3092',
    tourists: [
      { key: 't1', name: 'Chan Tai Man', idType: 'hk_macao_pass', idNumber: 'HK9876543', nationality: '中国香港', sourcePlace: '香港', age: 50, gender: 'male' },
      { key: 't2', name: 'Wong Siu Ming', idType: 'hk_macao_pass', idNumber: 'HK8765432', nationality: '中国香港', sourcePlace: '香港', age: 38, gender: 'female' },
    ],
    scenics: [
      { key: 's1', name: '西江千户苗寨', level: '4A', enterTime: '2026-09-16 09:00' },
      { key: 's2', name: '青岩古镇', level: '4A', enterTime: '2026-09-16 14:00' },
    ],
    accommodations: [
      { key: 'a1', hotelName: '贵阳喜来登贵航酒店', checkInDate: '2026-09-15', checkOutDate: '2026-09-16' },
      { key: 'a2', hotelName: '雷山西江大酒店', checkInDate: '2026-09-16', checkOutDate: '2026-09-17' },
    ],
    guideDrivers: [
      { key: 'g1', type: 'guide', name: '杨小红', licenseNo: 'GZ-2022-0789' },
      { key: 'g2', type: 'driver', name: '陈师傅', licenseNo: 'GZ-C-2022-0789' },
    ],
  },
];

// ========== 企业资质档案模拟证照数据 ==========
export const MockEnterpriseCertificates: {
  businessLicense?: Attachment;
  travelLicense?: Attachment;
  legalRepId?: Attachment;
} = {
  businessLicense: {
    uid: 'ent-bl-001',
    name: '贵州阳光国际旅行社_营业执照.pdf',
    size: 512000,
    type: 'application/pdf',
    uploadTime: '2025-03-15 10:00:00',
    group: 'base',
    title: '企业营业执照',
  },
  travelLicense: {
    uid: 'ent-tl-001',
    name: '贵州阳光国际旅行社_业务经营许可证.pdf',
    size: 384000,
    type: 'application/pdf',
    uploadTime: '2025-03-15 10:05:00',
    group: 'base',
    title: '旅行社业务经营许可证',
  },
  legalRepId: {
    uid: 'ent-lr-001',
    name: '法定代表人身份证_李明.pdf',
    size: 256000,
    type: 'application/pdf',
    uploadTime: '2025-03-15 10:10:00',
    group: 'base',
    title: '法定代表人身份证',
  },
};

// ========== 舆情管理分析 mock 数据 ==========
// 辅助：生成近 N 天的 ISO 时间字符串
function opinionTime(daysAgo: number, h = 10, m = 0): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(h, m, 0, 0)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`
}

// 处置日志生成器
function makeLog(operator: string, action: OpinionHandleLog['action'], opinion: string, daysAgo: number, fromStatus?: any, toStatus?: any): OpinionHandleLog {
  return {
    id: `LOG-${Math.random().toString(36).slice(2, 8)}`,
    operator,
    action,
    fromStatus,
    toStatus,
    opinion,
    time: opinionTime(daysAgo, 9, 30),
  }
}

export const MockPublicOpinions: PublicOpinion[] = [
  {
    id: 'PO-20260801-0001',
    title: '贵阳某酒店强制消费被游客投诉',
    author: '小红书用户 贵州小芳',
    authorLocation: '贵阳市',
    keywords: ['强制消费', '酒店', '贵阳', '宰客'],
    sourceWebsite: '小红书',
    sourceUrl: 'https://www.xiaohongshu.com/explore/example1',
    content: '贵州贵阳某四星级酒店前台强制推销"贵州特产礼包"价格880元，不购买则拒绝办理入住。导游全程冷眼旁观，态度恶劣。同行团员集体抗议才得以退回。强烈建议市场监管部门查处！',
    publishTime: opinionTime(3, 14, 25),
    dataSource: 'opinion_system',
    tourismCategory: 'accommodation',
    sentiment: 'negative',
    riskLevel: 'high',
    riskScore: 78,
    handleStatus: 'processing',
    involvedSubjects: ['贵阳某四星级酒店', '某地接导游'],
    attachments: [],
    remark: '已转市监局',
    createdBy: '舆情系统',
    createTime: opinionTime(3, 14, 30),
    updateTime: opinionTime(1, 10, 0),
    handleLogs: [
      makeLog('舆情系统', 'create', '自动从舆情系统抓取入库', 3),
      makeLog('陈华', 'process', '转贵阳市文旅局核实处理', 1, 'pending', 'processing'),
    ],
  },
  {
    id: 'PO-20260802-0002',
    title: '黄果树瀑布景区排队3小时游客怒发抖音',
    author: '抖音用户 旅行达人阿杰',
    authorLocation: '安顺市',
    keywords: ['景区', '排队', '黄果树', '拥堵'],
    sourceWebsite: '抖音',
    sourceUrl: 'https://www.douyin.com/video/example2',
    content: '黄金周第一天去黄果树，结果大瀑布入口排队3小时只能进入观景台15分钟。景区限流措施完全失效，工作人员指引不清晰。带老人小孩的特别崩溃。贵州旅游体验极差！',
    publishTime: opinionTime(5, 11, 0),
    dataSource: 'opinion_system',
    tourismCategory: 'scenic_area',
    sentiment: 'negative',
    riskLevel: 'critical',
    riskScore: 85,
    handleStatus: 'pending',
    involvedSubjects: ['黄果树瀑布景区'],
    attachments: [],
    remark: '黄金周高发，需重点关注',
    createdBy: '舆情系统',
    createTime: opinionTime(5, 11, 5),
    updateTime: opinionTime(5, 11, 5),
    handleLogs: [
      makeLog('舆情系统', 'create', '自动抓取入库，风险指数 85', 5),
    ],
  },
  {
    id: 'PO-20260803-0003',
    title: '黔东南民宿卫生问题被多名游客曝光',
    author: '微博用户 苗寨住宿体验官',
    authorLocation: '黔东南苗族侗族自治州',
    keywords: ['民宿', '卫生', '黔东南', '西江千户苗寨'],
    sourceWebsite: '微博',
    sourceUrl: 'https://weibo.com/example3',
    content: '西江千户苗寨某网红民宿床品有污渍、浴室发霉、早餐变质。老板态度敷衍，退还部分房款了事。同行5位朋友都发帖曝光了，希望监管部门介入。',
    publishTime: opinionTime(7, 20, 30),
    dataSource: 'cyberspace_admin',
    tourismCategory: 'accommodation',
    sentiment: 'negative',
    riskLevel: 'high',
    riskScore: 72,
    handleStatus: 'handled',
    involvedSubjects: ['西江千户苗寨某民宿'],
    attachments: [],
    remark: '已转黔东南文旅局处理，民宿被责令停业整改',
    createdBy: '网信办',
    createTime: opinionTime(7, 20, 35),
    updateTime: opinionTime(2, 16, 0),
    handleLogs: [
      makeLog('网信办', 'create', '网信办推送', 7),
      makeLog('陈华', 'process', '转黔东南州文旅局核实', 5, 'pending', 'processing'),
      makeLog('陈华', 'handle', '民宿被责令停业整改，已回复原作者', 2, 'processing', 'handled'),
    ],
  },
  {
    id: 'PO-20260804-0004',
    title: '贵州导游专业热情获游客点赞',
    author: '马蜂窝用户 走遍中国',
    authorLocation: '遵义市',
    keywords: ['导游', '服务', '遵义', '好评'],
    sourceWebsite: '马蜂窝',
    sourceUrl: 'https://www.mafengwo.cn/example4',
    content: '遵义会议会址导游小杨讲解生动专业，全程陪同3小时无怨言，老一辈游客特别感动。强烈推荐贵州红色旅游，导游服务行业应该推广这样的标杆。',
    publishTime: opinionTime(8, 15, 0),
    dataSource: 'manual_entry',
    tourismCategory: 'tour_guide',
    sentiment: 'positive',
    riskLevel: 'low',
    riskScore: 15,
    handleStatus: 'handled',
    involvedSubjects: ['遵义会议会址导游小杨'],
    attachments: [],
    remark: '',
    createdBy: '管理员',
    createTime: opinionTime(8, 15, 10),
    updateTime: opinionTime(6, 9, 0),
    handleLogs: [
      makeLog('管理员', 'create', '手动录入正面舆情', 8),
      makeLog('陈华', 'handle', '作为正面案例归档，可用于行业标杆宣传', 6, 'pending', 'handled'),
    ],
  },
  {
    id: 'PO-20260805-0005',
    title: '铜仁梵净山门票价格调整引发讨论',
    author: '知乎用户 文旅观察者',
    authorLocation: '铜仁市',
    keywords: ['门票', '价格', '梵净山', '铜仁'],
    sourceWebsite: '知乎',
    sourceUrl: 'https://www.zhihu.com/question/example5',
    content: '梵净山门票价格从100元调整至120元，是否合理？部分游客认为旺季涨价可以理解，部分认为价格虚高且未体现服务提升。建议景区公示涨价依据并优化动线。',
    publishTime: opinionTime(10, 9, 0),
    dataSource: 'opinion_system',
    tourismCategory: 'scenic_area',
    sentiment: 'neutral',
    riskLevel: 'medium',
    riskScore: 42,
    handleStatus: 'pending',
    involvedSubjects: ['梵净山景区'],
    attachments: [],
    createdBy: '舆情系统',
    createTime: opinionTime(10, 9, 5),
    updateTime: opinionTime(10, 9, 5),
    handleLogs: [
      makeLog('舆情系统', 'create', '自动抓取入库，中性讨论', 10),
    ],
  },
  {
    id: 'PO-20260806-0006',
    title: '毕节百里杜鹃景区交通接驳混乱',
    author: '百度贴吧用户 摄影老李',
    authorLocation: '毕节市',
    keywords: ['交通', '接驳', '百里杜鹃', '景区'],
    sourceWebsite: '百度贴吧',
    sourceUrl: 'https://tieba.baidu.com/example6',
    content: '毕节百里杜鹃景区停车场饱和后无引导，自驾游客堵在路上2小时。景区摆渡车排队超1小时，标识不清。建议增设临时停车场和电子导引牌。',
    publishTime: opinionTime(12, 16, 30),
    dataSource: 'provincial_police',
    tourismCategory: 'transportation',
    sentiment: 'negative',
    riskLevel: 'medium',
    riskScore: 48,
    handleStatus: 'processing',
    involvedSubjects: ['百里杜鹃景区'],
    attachments: [],
    remark: '省公安厅推送，涉交通秩序',
    createdBy: '省公安厅',
    createTime: opinionTime(12, 16, 35),
    updateTime: opinionTime(4, 10, 0),
    handleLogs: [
      makeLog('省公安厅', 'create', '省公安厅推送，涉交通秩序', 12),
      makeLog('陈华', 'process', '转毕节市交警与文旅局联合处置', 4, 'pending', 'processing'),
    ],
  },
  {
    id: 'PO-20260807-0007',
    title: '贵州美食获美食博主集体推荐',
    author: 'B站用户 美食侦探',
    authorLocation: '贵阳市',
    keywords: ['美食', '丝娃娃', '酸汤鱼', '好评'],
    sourceWebsite: '哔哩哔哩',
    sourceUrl: 'https://www.bilibili.com/video/example7',
    content: '贵州美食地图：丝娃娃、酸汤鱼、肠旺面、恋爱豆腐果……贵州旅游的隐藏彩蛋就是美食！强烈推荐自由行游客深度体验贵阳青云路夜市。',
    publishTime: opinionTime(15, 19, 0),
    dataSource: 'opinion_system',
    tourismCategory: 'other',
    sentiment: 'positive',
    riskLevel: 'low',
    riskScore: 10,
    handleStatus: 'handled',
    involvedSubjects: ['贵阳青云路夜市'],
    attachments: [],
    createdBy: '舆情系统',
    createTime: opinionTime(15, 19, 5),
    updateTime: opinionTime(13, 10, 0),
    handleLogs: [
      makeLog('舆情系统', 'create', '正面宣传内容，可放大营销', 15),
      makeLog('陈华', 'handle', '转营销处用于宣传素材', 13, 'pending', 'handled'),
    ],
  },
  {
    id: 'PO-20260808-0008',
    title: '六盘水滑雪场安全事故引发关注',
    author: '抖音用户 极限运动咖',
    authorLocation: '六盘水市',
    keywords: ['安全', '事故', '滑雪', '六盘水'],
    sourceWebsite: '抖音',
    sourceUrl: 'https://www.douyin.com/video/example8',
    content: '六盘水某滑雪场游客碰撞事故，雪道安全员响应慢，救护车1小时才到。建议景区增配安全员和医疗点，公示紧急处置流程。',
    publishTime: opinionTime(18, 11, 30),
    dataSource: 'cyberspace_admin',
    tourismCategory: 'entertainment',
    sentiment: 'negative',
    riskLevel: 'critical',
    riskScore: 88,
    handleStatus: 'handled',
    involvedSubjects: ['六盘水某滑雪场'],
    attachments: [],
    remark: '涉安全事故，已启动应急预案',
    createdBy: '网信办',
    createTime: opinionTime(18, 11, 35),
    updateTime: opinionTime(14, 17, 0),
    handleLogs: [
      makeLog('网信办', 'create', '涉安全事故，红色预警', 18),
      makeLog('陈华', 'process', '启动应急预案，转六盘水市文旅局+市监局', 17, 'pending', 'processing'),
      makeLog('陈华', 'handle', '景区增配安全员和医疗点，已处理完毕', 14, 'processing', 'handled'),
    ],
  },
  {
    id: 'PO-20260809-0009',
    title: '黔南荔波小七孔景区游客承载量预警',
    author: '携程用户 亲子游妈妈',
    authorLocation: '黔南布依族苗族自治州',
    keywords: ['承载量', '限流', '荔波', '小七孔'],
    sourceWebsite: '携程',
    sourceUrl: 'https://www.ctrip.com/example9',
    content: '荔波小七孔景区承载量已达上限但未及时限流，导致游客长时间滞留。建议景区动态公布实时客流并提前预约制限流。',
    publishTime: opinionTime(20, 13, 0),
    dataSource: 'opinion_system',
    tourismCategory: 'scenic_area',
    sentiment: 'negative',
    riskLevel: 'medium',
    riskScore: 55,
    handleStatus: 'pending',
    involvedSubjects: ['荔波小七孔景区'],
    attachments: [],
    createdBy: '舆情系统',
    createTime: opinionTime(20, 13, 5),
    updateTime: opinionTime(20, 13, 5),
    handleLogs: [
      makeLog('舆情系统', 'create', '自动抓取入库', 20),
    ],
  },
  {
    id: 'PO-20260810-0010',
    title: '贵州旅行社组团强迫购物被曝光',
    author: '黑猫投诉用户 维权者小张',
    authorLocation: '遵义市',
    keywords: ['强制购物', '旅行社', '遵义', '维权'],
    sourceWebsite: '黑猫投诉',
    sourceUrl: 'https://tousu.sina.com/example10',
    content: '遵义某旅行社组织黔北旅游，全程强制进3家购物店，导游言语威胁不购物不让上车。已向12345和黑猫投诉，要求退还团费并处罚旅行社。',
    publishTime: opinionTime(25, 21, 0),
    dataSource: 'opinion_system',
    tourismCategory: 'travel_agency',
    sentiment: 'negative',
    riskLevel: 'high',
    riskScore: 75,
    handleStatus: 'handled',
    involvedSubjects: ['遵义某旅行社', '某导游'],
    attachments: [],
    remark: '旅行社被立案调查',
    createdBy: '舆情系统',
    createTime: opinionTime(25, 21, 5),
    updateTime: opinionTime(15, 11, 0),
    handleLogs: [
      makeLog('舆情系统', 'create', '负面高敏感舆情，自动触发橙色预警', 25),
      makeLog('陈华', 'process', '转市监局+文旅执法大队', 22, 'pending', 'processing'),
      makeLog('陈华', 'handle', '旅行社停业整顿并处罚款，已回复投诉人', 15, 'processing', 'handled'),
    ],
  },
  {
    id: 'PO-20260811-0011',
    title: '贵阳地铁直达景区交通便捷获好评',
    author: '小红书用户 城市观察家',
    authorLocation: '贵阳市',
    keywords: ['交通', '地铁', '贵阳', '好评'],
    sourceWebsite: '小红书',
    sourceUrl: 'https://www.xiaohongshu.com/explore/example11',
    content: '贵阳地铁直达黔灵山公园，交通极其便利。城市公共服务配套完善，外地游客自由行体验很好。贵州文旅基础设施提升明显。',
    publishTime: opinionTime(28, 8, 0),
    dataSource: 'manual_entry',
    tourismCategory: 'transportation',
    sentiment: 'positive',
    riskLevel: 'low',
    riskScore: 12,
    handleStatus: 'handled',
    attachments: [],
    createdBy: '管理员',
    createTime: opinionTime(28, 8, 5),
    updateTime: opinionTime(26, 9, 0),
    handleLogs: [
      makeLog('管理员', 'create', '手动录入正面舆情', 28),
      makeLog('陈华', 'handle', '归档为正面案例', 26, 'pending', 'handled'),
    ],
  },
  {
    id: 'PO-20260812-0012',
    title: '安顺黄蜡石景区购物店价格虚高',
    author: '大众点评用户 老饕食客',
    authorLocation: '安顺市',
    keywords: ['购物', '价格', '安顺', '虚高'],
    sourceWebsite: '大众点评',
    sourceUrl: 'https://www.dianping.com/example12',
    content: '安顺某景区出口购物店黄蜡石摆件标价6800元，实际成本几百元。店员强制推销，纠缠游客10分钟才放行。强烈要求市场监管部门查处价格欺诈。',
    publishTime: opinionTime(32, 14, 0),
    dataSource: 'opinion_system',
    tourismCategory: 'shopping',
    sentiment: 'negative',
    riskLevel: 'medium',
    riskScore: 50,
    handleStatus: 'processing',
    involvedSubjects: ['安顺某景区购物店'],
    attachments: [],
    createdBy: '舆情系统',
    createTime: opinionTime(32, 14, 5),
    updateTime: opinionTime(20, 10, 0),
    handleLogs: [
      makeLog('舆情系统', 'create', '自动抓取入库', 32),
      makeLog('陈华', 'process', '转安顺市监局核实价格', 20, 'pending', 'processing'),
    ],
  },
  {
    id: 'PO-20260813-0013',
    title: '贵州红色旅游获中央媒体专题报道',
    author: '央视新闻',
    authorLocation: '遵义市',
    keywords: ['红色旅游', '央视', '遵义', '正面'],
    sourceWebsite: '央视新闻',
    sourceUrl: 'https://news.cctv.com/example13',
    content: '央视新闻专题报道贵州红色旅游资源整合成效：遵义会议会址、娄山关、四渡赤水等景点联动发展，年接待游客超千万，红色文化传承与旅游经济双丰收。',
    publishTime: opinionTime(40, 19, 0),
    dataSource: 'cyberspace_admin',
    tourismCategory: 'cultural_market',
    sentiment: 'positive',
    riskLevel: 'low',
    riskScore: 8,
    handleStatus: 'handled',
    involvedSubjects: ['遵义会议会址', '娄山关', '四渡赤水'],
    attachments: [],
    remark: '央媒正面报道，可作为典型宣传素材',
    createdBy: '网信办',
    createTime: opinionTime(40, 19, 5),
    updateTime: opinionTime(38, 9, 0),
    handleLogs: [
      makeLog('网信办', 'create', '央媒推送', 40),
      makeLog('陈华', 'handle', '转宣传处用于对外推介', 38, 'pending', 'handled'),
    ],
  },
  {
    id: 'PO-20260814-0014',
    title: '贵州在线旅游平台退款纠纷频发',
    author: '黑猫投诉用户 集体维权',
    authorLocation: '贵阳市',
    keywords: ['在线旅游', '退款', '纠纷', '平台'],
    sourceWebsite: '黑猫投诉',
    sourceUrl: 'https://tousu.sina.com/example14',
    content: '贵州某在线旅游平台近1个月退款纠纷超50起，涉及门票、酒店、跟团游等多品类。平台以"系统升级"为由拖延退款，涉嫌违规占用消费者资金。',
    publishTime: opinionTime(45, 10, 30),
    dataSource: 'opinion_system',
    tourismCategory: 'online_travel',
    sentiment: 'negative',
    riskLevel: 'high',
    riskScore: 70,
    handleStatus: 'pending',
    involvedSubjects: ['某在线旅游平台'],
    attachments: [],
    remark: '集体维权舆情，需重点关注',
    createdBy: '舆情系统',
    createTime: opinionTime(45, 10, 35),
    updateTime: opinionTime(45, 10, 35),
    handleLogs: [
      makeLog('舆情系统', 'create', '集体维权，触发橙色预警', 45),
    ],
  },
  {
    id: 'PO-20260815-0015',
    title: '黔西南马岭河峡谷漂流安全装备问题',
    author: '微博用户 户外探险家',
    authorLocation: '黔西南布依族苗族自治州',
    keywords: ['漂流', '安全', '马岭河', '装备'],
    sourceWebsite: '微博',
    sourceUrl: 'https://weibo.com/example15',
    content: '马岭河峡谷漂流救生衣老化破损、头盔缺失。安全员配比不足。多名游客反映类似问题，建议景区立即停业整改并通报全市漂流类景区排查。',
    publishTime: opinionTime(50, 15, 0),
    dataSource: 'provincial_police',
    tourismCategory: 'entertainment',
    sentiment: 'negative',
    riskLevel: 'critical',
    riskScore: 82,
    handleStatus: 'handled',
    involvedSubjects: ['马岭河峡谷漂流景区'],
    attachments: [],
    remark: '涉人身安全，红色预警',
    createdBy: '省公安厅',
    createTime: opinionTime(50, 15, 5),
    updateTime: opinionTime(42, 16, 0),
    handleLogs: [
      makeLog('省公安厅', 'create', '涉安全装备，红色预警', 50),
      makeLog('陈华', 'process', '启动应急预案，景区停业整改', 48, 'pending', 'processing'),
      makeLog('陈华', 'handle', '景区完成整改复检通过，恢复营业', 42, 'processing', 'handled'),
    ],
  },
  {
    id: 'PO-20260816-0016',
    title: '贵州民族风情获境外游客点赞',
    author: 'TripAdvisor 用户 GlobalTraveler',
    authorLocation: '贵阳市',
    keywords: ['入境游', '民族风情', '正面', '境外'],
    sourceWebsite: 'TripAdvisor',
    sourceUrl: 'https://www.tripadvisor.com/example16',
    content: 'Guizhou ethnic culture tour was amazing! Miao and Dong villages preserved authentic traditions. Local guides English-fluent. Highly recommend for international travelers seeking authentic China experience.',
    publishTime: opinionTime(55, 8, 0),
    dataSource: 'opinion_system',
    tourismCategory: 'other',
    sentiment: 'positive',
    riskLevel: 'low',
    riskScore: 5,
    handleStatus: 'handled',
    involvedSubjects: ['苗寨', '侗寨'],
    attachments: [],
    remark: '境外正面评价，可放大入境游宣传',
    createdBy: '舆情系统',
    createTime: opinionTime(55, 8, 5),
    updateTime: opinionTime(52, 9, 0),
    handleLogs: [
      makeLog('舆情系统', 'create', '境外平台正面评价', 55),
      makeLog('陈华', 'handle', '转入境游营销用于宣传', 52, 'pending', 'handled'),
    ],
  },
  {
    id: 'PO-20260817-0017',
    title: '贵阳出租车司机拒载游客被举报',
    author: '12345热线用户 张先生',
    authorLocation: '贵阳市',
    keywords: ['出租车', '拒载', '贵阳', '交通'],
    sourceWebsite: '12345热线',
    sourceUrl: 'https://12345.guizhou.gov.cn/example17',
    content: '贵阳北站出租车等候区，多名司机以"不顺路"为由拒载短途游客，强制拼车。强烈建议交通部门加大查处力度，规范营运秩序。',
    publishTime: opinionTime(60, 17, 0),
    dataSource: 'provincial_police',
    tourismCategory: 'transportation',
    sentiment: 'negative',
    riskLevel: 'medium',
    riskScore: 45,
    handleStatus: 'pending',
    involvedSubjects: ['贵阳北站出租车'],
    attachments: [],
    createdBy: '省公安厅',
    createTime: opinionTime(60, 17, 5),
    updateTime: opinionTime(60, 17, 5),
    handleLogs: [
      makeLog('省公安厅', 'create', '12345转办，涉交通秩序', 60),
    ],
  },
  {
    id: 'PO-20260818-0018',
    title: '贵州非物质文化遗产体验获好评',
    author: '小红书用户 手工达人',
    authorLocation: '黔东南苗族侗族自治州',
    keywords: ['非遗', '蜡染', '银饰', '好评'],
    sourceWebsite: '小红书',
    sourceUrl: 'https://www.xiaohongshu.com/explore/example18',
    content: '黔东南苗族侗寨非遗体验项目超棒！蜡染、银饰、芦笙制作都可亲手体验，老师傅手把手教学，作品可带走。强烈推荐深度文化游。',
    publishTime: opinionTime(65, 11, 0),
    dataSource: 'manual_entry',
    tourismCategory: 'cultural_market',
    sentiment: 'positive',
    riskLevel: 'low',
    riskScore: 10,
    handleStatus: 'handled',
    attachments: [],
    createdBy: '管理员',
    createTime: opinionTime(65, 11, 5),
    updateTime: opinionTime(62, 9, 0),
    handleLogs: [
      makeLog('管理员', 'create', '手动录入正面案例', 65),
      makeLog('陈华', 'handle', '作为非遗旅游推广素材', 62, 'pending', 'handled'),
    ],
  },
  {
    id: 'PO-20260819-0019',
    title: '贵州某5A景区厕所卫生问题被曝光',
    author: '抖音用户 卫生监督员',
    authorLocation: '安顺市',
    keywords: ['厕所', '卫生', '5A景区', '安顺'],
    sourceWebsite: '抖音',
    sourceUrl: 'https://www.douyin.com/video/example19',
    content: '安顺某5A景区厕所数量不足、卫生极差、异味严重。游客排队如厕超20分钟。强烈建议景区增设第三卫生间和母婴室，提升基础服务。',
    publishTime: opinionTime(70, 12, 0),
    dataSource: 'opinion_system',
    tourismCategory: 'scenic_area',
    sentiment: 'negative',
    riskLevel: 'medium',
    riskScore: 47,
    handleStatus: 'processing',
    involvedSubjects: ['安顺某5A景区'],
    attachments: [],
    createdBy: '舆情系统',
    createTime: opinionTime(70, 12, 5),
    updateTime: opinionTime(50, 10, 0),
    handleLogs: [
      makeLog('舆情系统', 'create', '自动抓取入库', 70),
      makeLog('陈华', 'process', '转安顺文旅局督促整改', 50, 'pending', 'processing'),
    ],
  },
  {
    id: 'PO-20260820-0020',
    title: '贵州高速服务区旅游咨询服务获赞',
    author: '马蜂窝用户 自驾老王',
    authorLocation: '遵义市',
    keywords: ['高速', '服务区', '咨询', '好评'],
    sourceWebsite: '马蜂窝',
    sourceUrl: 'https://www.mafengwo.cn/example20',
    content: '贵州高速服务区设旅游咨询点，工作人员热情专业，免费提供路线规划、景点推荐和应急物资。强烈点赞贵州文旅公共服务。',
    publishTime: opinionTime(75, 14, 0),
    dataSource: 'manual_entry',
    tourismCategory: 'other',
    sentiment: 'positive',
    riskLevel: 'low',
    riskScore: 8,
    handleStatus: 'handled',
    attachments: [],
    createdBy: '管理员',
    createTime: opinionTime(75, 14, 5),
    updateTime: opinionTime(72, 9, 0),
    handleLogs: [
      makeLog('管理员', 'create', '手动录入正面案例', 75),
      makeLog('陈华', 'handle', '作为公共服务标杆案例', 72, 'pending', 'handled'),
    ],
  },
];

export const MockOpinionWarningRules: OpinionWarningRule[] = [
  {
    id: 'WR-001',
    name: '负面高敏感词预警',
    keywords: ['宰客', '强制消费', '安全事故', '食物中毒'],
    sentiment: 'negative',
    riskLevel: 'high',
    threshold: 1,
    windowMinutes: 60,
    alertLevel: 'red',
    enabled: true,
    createdBy: '管理员',
    createTime: opinionTime(30, 9, 0),
  },
  {
    id: 'WR-002',
    name: '负面舆情高频次预警',
    sentiment: 'negative',
    threshold: 5,
    windowMinutes: 60,
    alertLevel: 'orange',
    enabled: true,
    createdBy: '管理员',
    createTime: opinionTime(30, 9, 5),
  },
  {
    id: 'WR-003',
    name: '高风险等级预警',
    riskLevel: 'critical',
    threshold: 1,
    windowMinutes: 1440,
    alertLevel: 'red',
    enabled: true,
    createdBy: '管理员',
    createTime: opinionTime(30, 9, 10),
  },
  {
    id: 'WR-004',
    name: '住宿类负面舆情预警',
    tourismCategory: 'accommodation',
    sentiment: 'negative',
    threshold: 3,
    windowMinutes: 1440,
    alertLevel: 'orange',
    enabled: true,
    createdBy: '管理员',
    createTime: opinionTime(30, 9, 15),
  },
  {
    id: 'WR-005',
    name: '景区类负面舆情预警',
    tourismCategory: 'scenic_area',
    sentiment: 'negative',
    threshold: 3,
    windowMinutes: 1440,
    alertLevel: 'yellow',
    enabled: false,
    createdBy: '管理员',
    createTime: opinionTime(30, 9, 20),
  },
];

export const MockOpinionWarnings: OpinionWarning[] = [
  {
    id: 'WARN-001',
    ruleId: 'WR-001',
    ruleName: '负面高敏感词预警',
    alertLevel: 'red',
    triggerTime: opinionTime(5, 11, 5),
    relatedOpinionIds: ['PO-20260802-0002'],
    relatedComplaintIds: [],
    summary: '黄果树瀑布景区排队3小时游客怒发抖音 - 触发关键词"安全事故"附近词',
    handled: true,
    handleBy: '陈华',
    handleTime: opinionTime(4, 10, 0),
    handleOpinion: '转安顺市文旅局督促整改，已回复原作者',
  },
  {
    id: 'WARN-002',
    ruleId: 'WR-003',
    ruleName: '高风险等级预警',
    alertLevel: 'red',
    triggerTime: opinionTime(50, 15, 5),
    relatedOpinionIds: ['PO-20260815-0015'],
    relatedComplaintIds: [],
    summary: '马岭河峡谷漂流安全装备问题 - 风险等级=极高',
    handled: true,
    handleBy: '陈华',
    handleTime: opinionTime(42, 16, 0),
    handleOpinion: '启动应急预案，景区完成整改复检通过',
  },
  {
    id: 'WARN-003',
    ruleId: 'WR-002',
    ruleName: '负面舆情高频次预警',
    alertLevel: 'orange',
    triggerTime: opinionTime(1, 9, 0),
    relatedOpinionIds: ['PO-20260801-0001', 'PO-20260802-0002'],
    relatedComplaintIds: [],
    summary: '近1小时负面舆情达2条，超过阈值',
    handled: false,
  },
  {
    id: 'WARN-004',
    ruleId: 'WR-004',
    ruleName: '住宿类负面舆情预警',
    alertLevel: 'orange',
    triggerTime: opinionTime(7, 20, 35),
    relatedOpinionIds: ['PO-20260803-0003'],
    relatedComplaintIds: [],
    summary: '黔东南民宿卫生问题 - 住宿类负面',
    handled: true,
    handleBy: '陈华',
    handleTime: opinionTime(2, 16, 0),
    handleOpinion: '民宿被责令停业整改',
  },
];

export const MockOpinionReports: OpinionReport[] = [
  {
    id: 'RPT-202608-D-001',
    type: 'daily',
    title: '2026-08-16 舆情日报',
    periodStart: '2026-08-16 00:00:00',
    periodEnd: '2026-08-16 23:59:59',
    generatedAt: opinionTime(1, 18, 0),
    content: `【舆情概述】本日新增舆情3条，其中负面2条、中性1条、正面0条。负面舆情主要涉及景区排队、酒店强制消费。

【负面清单】
1. 黄果树瀑布景区排队3小时（风险指数85，红色预警）
2. 贵阳某酒店强制消费（风险指数78，橙色预警）

【TOP热点】排队、强制消费、贵阳、安顺

【处置情况】新增待处置1条，处置中1条，已完成处置1条

【风险提示】景区排队与酒店消费类负面舆情高发，需在节假日加强应急响应。`,
    createdBy: '系统自动',
  },
  {
    id: 'RPT-202608-W-001',
    type: 'weekly',
    title: '2026年第33周 舆情周报',
    periodStart: '2026-08-10 00:00:00',
    periodEnd: '2026-08-16 23:59:59',
    generatedAt: opinionTime(1, 19, 0),
    content: `【趋势分析】本周新增舆情8条，环比上周+15%。负面占比62.5%（5/8），市场情绪整体偏负。

【情感分布】正面2条（25%），负面5条（62.5%），中性1条（12.5%）

【地域分布】贵阳2条、安顺2条、黔东南1条、遵义1条、六盘水1条、毕节1条

【TOP热点】排队、强制消费、卫生、安全、价格

【改进建议】
1. 景区排队与限流措施需在节假日提前部署
2. 酒店强制消费问题应专项整治
3. 民宿卫生问题应建立卫生可视化长效机制
4. 安全装备类问题需启动应急预案排查`,
    createdBy: '系统自动',
  },
  {
    id: 'RPT-202607-M-001',
    type: 'monthly',
    title: '2026年7月 舆情月报',
    periodStart: '2026-07-01 00:00:00',
    periodEnd: '2026-07-31 23:59:59',
    generatedAt: opinionTime(15, 20, 0),
    content: `【全维度分析】7月共录入舆情12条，其中负面8条（66.7%），正面3条（25%），中性1条（8.3%）。负面占比高于年度平均。

【环比分析】环比6月+33%，主要因暑期旺季游客量激增，服务承载力不足。

【案例复盘】
1. 黄果树景区排队事件：通过增派志愿者、增设限流提示牌，舆情在48小时内平息
2. 黔东南民宿卫生：建立卫生可视化机制后，同类投诉减少60%

【决策建议】
1. 暑期旺季前30天启动应急监测机制
2. 推行景区厕所革命和民宿卫生星级评定
3. 建立"负面舆情—投诉数据—申报数据"联动分析模型`,
    createdBy: '系统自动',
  },
];

// ========== 引客入黔补贴管理 mock 数据 ==========
import type { SubsidyApplication, SubsidyOperationLog } from '../types';

// 补贴申报 - 默认空行模板生成器
export function emptyTeamReceptionRows() {
  return [
    { key: 'tr1', project: '港澳台地区（一档、二档、三档）', amount: 0, teamSize: 0 },
    { key: 'tr2', project: '东盟国家（一档、二档、三档）', amount: 0, teamSize: 0 },
    { key: 'tr3', project: '东盟以外其他国家（一档、二档、三档）', amount: 0, teamSize: 0 },
  ];
}

export function emptySpecialTourismRows() {
  return [
    { key: 'sp1', project: '港澳台直航', amount: 0, teamSize: 0 },
    { key: 'sp2', project: '亚洲国家直航', amount: 0, teamSize: 0 },
    { key: 'sp3', project: '一程多站联程旅游', amount: 0, teamSize: 0 },
    { key: 'sp4', project: '240小时过境免签旅游', amount: 0, teamSize: 0 },
    { key: 'sp5', project: '高铁旅游奖励', amount: 0, teamSize: 0 },
    { key: 'sp6', project: '境外大型团队旅游', amount: 0, teamSize: 0 },
  ];
}

export function emptyCulturePromotionRows() {
  return [
    { key: 'cp1', project: '参展推广奖励', amount: 0, activityName: '', location: '', participants: 0 },
    { key: 'cp2', project: '请进来奖励', amount: 0, activityName: '', location: '', participants: 0 },
    { key: 'cp3', project: '入境旅游宣传', amount: 0, activityName: '', location: '', participants: 0 },
    { key: 'cp4', project: '交流合作奖励', amount: 0, activityName: '', location: '', participants: 0 },
  ];
}

// 锁定截止时间计算：行程结束日当日 23:59:59（行程结束当日仍可修改，次日 00:00 锁定）
export function calcLockDeadline(travelEnd: string): string {
  const d = new Date(travelEnd);
  d.setHours(23, 59, 59, 0);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// 从团预设生成补贴申报记录（拉取时的字段映射）
export function buildSubsidyFromTeamPreset(teamPreset: TeamPreset, options: {
  id: string;
  applicationNo: string;
  createdBy: string;
  createdByOrg: string;
}): SubsidyApplication {
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const lockDeadline = calcLockDeadline(teamPreset.travelEnd);

  // 按客源地统计团队人数分档
  const sourcePlaces = Array.from(new Set(teamPreset.tourists.map((t) => t.sourcePlace || t.nationality).filter(Boolean)));
  const sourcePlaceStr = sourcePlaces.join('、');

  // 提取前5晚酒店名
  const hotelFirst5Nights = teamPreset.accommodations.slice(0, 5).map((a) => a.hotelName);

  // 4A级以上景区筛选
  const scenics4APlus = teamPreset.scenics.filter((s) => s.level === '4A' || s.level === '5A');

  // 车号合并去重（guideDrivers中驾驶员的licenseNo视作车号，简化处理）
  const vehicleNos = Array.from(new Set(
    teamPreset.guideDrivers
      .filter((g) => g.type === 'driver')
      .map((g) => g.licenseNo)
      .filter(Boolean)
  ));

  // 客源地分档统计（简化：东盟=东南亚国家，东盟以外其他=欧美等）
  const aseanCountries = ['泰国', '越南', '马来西亚', '新加坡', '印尼', '菲律宾', '缅甸', '柬埔寨', '老挝', '文莱'];
  const isAsean = (s: string) => aseanCountries.some((c) => s.includes(c));
  const isHmt = (s: string) => s.includes('香港') || s.includes('澳门') || s.includes('台湾');

  // 默认填充：根据团客源地自动填充对应的"申请团队人数"
  const receptionRows = emptyTeamReceptionRows();
  sourcePlaces.forEach((sp) => {
    const cnt = teamPreset.tourists.filter((t) => (t.sourcePlace || t.nationality) === sp).length;
    if (isHmt(sp)) {
      receptionRows[0].teamSize += cnt; // 港澳台
    } else if (isAsean(sp)) {
      receptionRows[1].teamSize += cnt; // 东盟国家
    } else {
      receptionRows[2].teamSize += cnt; // 东盟以外其他国家
    }
  });

  return {
    id: options.id,
    applicationNo: options.applicationNo,
    teamPresetSnapshot: {
      teamName: teamPreset.teamName,
      teamSize: teamPreset.teamSize,
      inboundTourists: teamPreset.inboundTourists,
      stayDays: teamPreset.stayDays,
      travelStart: teamPreset.travelStart,
      travelEnd: teamPreset.travelEnd,
      travelDesc: teamPreset.travelDesc,
      dispatchNo: teamPreset.dispatchNo,
      targetAgreementNo: teamPreset.targetAgreementNo,
      flightNo: teamPreset.flightNo,
      trainNo: teamPreset.trainNo,
      tourists: teamPreset.tourists.map((t, i) => ({
        ...t,
        birthDate: t.birthDate || (t.age ? `${new Date().getFullYear() - t.age}-01-01` : ''),
        contractStatus: t.contractStatus || '已签订',
        contractNo: t.contractNo || `${teamPreset.dispatchNo}-C${i + 1}`,
      })),
      scenics: teamPreset.scenics,
      accommodations: teamPreset.accommodations,
      guideDrivers: teamPreset.guideDrivers,
    },
    unitName: options.createdByOrg,
    legalRepresentative: '张文华',
    operator: options.createdBy,
    contactPhone: '0851-85888888',
    bankAccount: {
      accountName: options.createdByOrg,
      bankName: '中国工商银行贵阳分行',
      accountNo: '2402000109201088888',
    },
    teamReceptionRows: receptionRows,
    specialTourismRows: emptySpecialTourismRows(),
    teamBaseInfo: {
      teamNo: teamPreset.dispatchNo,
      travelStartDate: teamPreset.travelStart,
      travelEndDate: teamPreset.travelEnd,
      nights: teamPreset.stayDays - 1,
      days: teamPreset.stayDays,
      sourcePlace: sourcePlaceStr,
      hotelFirst5Nights,
      hotelStar: '5星级或同等档次',
      vehicleCount: vehicleNos.length,
      vehicleNos,
      scenicCount4APlus: scenics4APlus.length,
      scenicNames4APlus: scenics4APlus.map((s) => s.name),
    },
    culturePromotionRows: emptyCulturePromotionRows(),
    declaration: {
      contactPhone: '0851-85888888',
      date: now.substring(0, 10),
    },
    totalAmount: 0,
    totalTeamSize: teamPreset.teamSize,
    status: 'draft',
    createTime: now,
    updateTime: now,
    lockDeadline,
    createdBy: options.createdBy,
    createdByOrg: options.createdByOrg,
  };
}

// 3条 mock 补贴申报记录
export const MockSubsidyApplications: SubsidyApplication[] = [
  // 记录1：草稿态，关联团1（韩国首尔-贵州5日游）
  (() => {
    const app = buildSubsidyFromTeamPreset(MockTeamPresets[0], {
      id: 'SUB-2026-0001',
      applicationNo: 'SUB-2026-0001',
      createdBy: '李明',
      createdByOrg: '贵州阳光国际旅行社',
    });
    app.createTime = '2026-08-15 10:30:00';
    app.updateTime = '2026-08-16 14:20:00';
    app.legalRepresentative = '张文华';
    app.contactPhone = '0851-85888888';
    app.bankAccount = { accountName: '贵州阳光国际旅行社', bankName: '中国工商银行贵阳分行', accountNo: '2402000109201088888' };
    // 用户已填写团队接待奖励金额：东盟以外其他国家 12人 × 30元 = 360元
    app.teamReceptionRows[2].amount = 360;
    app.teamReceptionRows[2].teamSize = 12;
    app.totalAmount = 360;
    return app;
  })(),
  // 记录2：已提交态，关联团2（日本东京-贵州4日游）
  (() => {
    const app = buildSubsidyFromTeamPreset(MockTeamPresets[1], {
      id: 'SUB-2026-0002',
      applicationNo: 'SUB-2026-0002',
      createdBy: '李明',
      createdByOrg: '贵州阳光国际旅行社',
    });
    app.createTime = '2026-08-12 09:15:00';
    app.updateTime = '2026-08-13 16:45:00';
    app.submitTime = '2026-08-13 16:45:00';
    app.status = 'submitted';
    app.legalRepresentative = '张文华';
    app.contactPhone = '0851-85888888';
    app.bankAccount = { accountName: '贵州阳光国际旅行社', bankName: '中国工商银行贵阳分行', accountNo: '2402000109201088888' };
    // 已填写专项奖励：亚洲国家直航 18人 × 10元 = 180元
    app.specialTourismRows[1].amount = 180;
    app.specialTourismRows[1].teamSize = 18;
    app.totalAmount = 180;
    return app;
  })(),
  // 记录3：已锁定态，独立快照（出团日期已过）
  (() => {
    const app = buildSubsidyFromTeamPreset({
      teamName: '新加坡-贵州4日游（已归档）',
      teamSize: 25,
      inboundTourists: 25,
      stayDays: 4,
      travelStart: '2026-07-15',
      travelEnd: '2026-07-18',
      travelDesc: '贵阳入境→黄果树瀑布→西江千户苗寨→贵阳出境',
      dispatchNo: 'GZ-2026-0715-088',
      targetAgreementNo: 'TA-2026-088',
      flightNo: 'MU578',
      tourists: [
        { key: 't1', name: 'Tan Wei Ming', idType: 'passport', idNumber: 'SG1234567', nationality: '新加坡', sourcePlace: '新加坡', age: 40, gender: 'male' },
        { key: 't2', name: 'Lim Ah Beng', idType: 'passport', idNumber: 'SG2345678', nationality: '新加坡', sourcePlace: '新加坡', age: 36, gender: 'male' },
        // 复游游客：与申报2日本团为同一人（证件号相同），二次随团入黔，统计上总人次+1、总数不重复计
        { key: 't3', name: 'Tanaka Hiroshi', idType: 'passport', idNumber: 'JP1234567', nationality: '日本', sourcePlace: '新加坡', age: 45, gender: 'male' },
      ],
      scenics: [
        { key: 's1', name: '黄果树瀑布景区', level: '5A', enterTime: '2026-07-16 09:00' },
        { key: 's2', name: '西江千户苗寨', level: '4A', enterTime: '2026-07-17 10:00' },
      ],
      accommodations: [
        { key: 'a1', hotelName: '贵阳凯宾斯基酒店', checkInDate: '2026-07-15', checkOutDate: '2026-07-16' },
        { key: 'a2', hotelName: '安顺百灵希尔顿逸林酒店', checkInDate: '2026-07-16', checkOutDate: '2026-07-17' },
        { key: 'a3', hotelName: '贵阳凯宾斯基酒店', checkInDate: '2026-07-17', checkOutDate: '2026-07-18' },
      ],
      guideDrivers: [
        { key: 'g1', type: 'guide', name: '张小明', licenseNo: 'GZ-2021-0568' },
        { key: 'g2', type: 'driver', name: '王师傅', licenseNo: '贵A-12345' },
      ],
    }, {
      id: 'SUB-2026-0003',
      applicationNo: 'SUB-2026-0003',
      createdBy: '李明',
      createdByOrg: '贵州阳光国际旅行社',
    });
    app.createTime = '2026-07-10 11:00:00';
    app.updateTime = '2026-07-14 22:30:00';
    app.submitTime = '2026-07-14 22:30:00';
    app.status = 'locked'; // 出团日期 2026-07-15，已过锁定时间
    app.legalRepresentative = '张文华';
    app.contactPhone = '0851-85888888';
    app.bankAccount = { accountName: '贵州阳光国际旅行社', bankName: '中国工商银行贵阳分行', accountNo: '2402000109201088888' };
    // 东盟国家：25人 × 30元 = 750元
    app.teamReceptionRows[1].amount = 750;
    app.teamReceptionRows[1].teamSize = 25;
    app.totalAmount = 750;
    return app;
  })(),
];

// 补贴管理操作日志（与上述3条记录对应）
export const MockSubsidyOperationLogs: SubsidyOperationLog[] = [
  { id: 'sol-1', applicationId: 'SUB-2026-0001', operator: '李明', operatorRole: 'applicant', action: 'create', comment: '从团信息[韩国首尔-贵州5日游]拉取创建', time: '2026-08-15 10:30:00' },
  { id: 'sol-2', applicationId: 'SUB-2026-0001', operator: '李明', operatorRole: 'applicant', action: 'edit', comment: '编辑申报信息', time: '2026-08-16 14:20:00' },
  { id: 'sol-3', applicationId: 'SUB-2026-0002', operator: '李明', operatorRole: 'applicant', action: 'create', comment: '从团信息[日本东京-贵州4日游]拉取创建', time: '2026-08-12 09:15:00' },
  { id: 'sol-4', applicationId: 'SUB-2026-0002', operator: '李明', operatorRole: 'applicant', action: 'edit', comment: '完善申报信息', time: '2026-08-13 16:40:00' },
  { id: 'sol-5', applicationId: 'SUB-2026-0002', operator: '李明', operatorRole: 'applicant', action: 'submit', comment: '提交申报', time: '2026-08-13 16:45:00' },
  { id: 'sol-6', applicationId: 'SUB-2026-0003', operator: '李明', operatorRole: 'applicant', action: 'create', comment: '从团信息[新加坡-贵州4日游]拉取创建', time: '2026-07-10 11:00:00' },
  { id: 'sol-7', applicationId: 'SUB-2026-0003', operator: '李明', operatorRole: 'applicant', action: 'submit', comment: '提交申报', time: '2026-07-14 22:30:00' },
  { id: 'sol-8', applicationId: 'SUB-2026-0003', operator: '系统', operatorRole: 'admin', action: 'lock', comment: '到达锁定时间，自动锁定', time: '2026-07-14 23:59:59' },
];

// ========== Mock 投诉数据报表 ==========
export const MockComplaintReportTemplates: ComplaintReportTemplate[] = getDefaultReportTemplates();

export const MockSeasonCalendar: ComplaintSeasonCalendarItem[] = getDefaultSeasonCalendar();

export const MockComplaintReports: ComplaintReport[] = [
  (() => {
    const periodStart = '2026-08-01';
    const periodEnd = '2026-08-31';
    const scopeName = '全省';
    const snapshot = buildComplaintReportSnapshot(MockComplaints, periodStart, periodEnd, scopeName);
    // V1.3：AI 归因结论（规则计算块已在上文展示数据，此处仅做综合研判结论）
    const topMerchant = snapshot.respondentClusters[0];
    const topRegionCat = snapshot.regionCategoryClusters[0];
    const aiInsight = `<p style="margin:0 0 8px">综合上述规则分析，本期投诉态势<b style="color:#d4380d">需重点关注</b>。核心风险集中在"${topMerchant?.name || '上述商家'}"（${topMerchant?.count || 0}次重复投诉），呈现"同一主体反复违规"特征，疑为内部管理失效而非个案。${topRegionCat ? `${topRegionCat.region}${topRegionCat.categoryLabel}领域同类投诉集聚（${topRegionCat.count}件），反映该区域该业态存在共性问题。` : ''}</p>`;
    return {
      id: 'RPT-20260824-0001',
      title: '2026年8月 投诉月报（贵州省）',
      reportType: 'low_season_month' as const,
      periodStart,
      periodEnd,
      scopeLevel: 'province' as const,
      scopeName,
      generatedBy: '系统',
      generatedAt: '2026-08-24 10:05:00',
      summary: buildReportSummary(snapshot, 'low_season_month', scopeName),
      hasAiInsight: true,
      aiInsight,
      status: snapshot.total === 0 ? 'empty' : 'normal',
      templateId: 'TPL-LSM-001',
      chapters: JSON.parse(JSON.stringify(DEFAULT_REPORT_CHAPTERS.low_season_month)),
      snapshot,
      trigger: 'scheduled' as const,
    };
  })(),
  (() => {
    const periodStart = '2026-08-15';
    const periodEnd = '2026-08-21';
    const scopeName = '贵阳市';
    const snapshot = buildComplaintReportSnapshot(MockComplaints, periodStart, periodEnd, scopeName);
    const topMerchant = snapshot.respondentClusters[0];
    const aiInsight = `<p style="margin:0">本周风险研判结论：贵阳市投诉${snapshot.total}件，${topMerchant ? `"${topMerchant.name}"连续${topMerchant.count}次被投诉，` : ''}环比${snapshot.momRate >= 0 ? '上升' : '下降'}${Math.abs(snapshot.momRate).toFixed(1)}%。${topMerchant ? '该商家近 30 天投诉呈集聚态势，存在违规惯性，建议升级为橙色风险并启动约谈+限期整改。' : ''}</p>`;
    return {
      id: 'RPT-20260824-0002',
      title: '2026年8月第3周 投诉周报（贵阳市）',
      reportType: 'peak_week' as const,
      periodStart,
      periodEnd,
      scopeLevel: 'city' as const,
      scopeName,
      generatedBy: '系统',
      generatedAt: '2026-08-22 10:00:00',
      summary: buildReportSummary(snapshot, 'peak_week', scopeName),
      hasAiInsight: true,
      aiInsight,
      status: snapshot.total === 0 ? 'empty' : 'normal',
      templateId: 'TPL-PW-001',
      chapters: JSON.parse(JSON.stringify(DEFAULT_REPORT_CHAPTERS.peak_week)),
      snapshot,
      trigger: 'scheduled' as const,
    };
  })(),
  (() => {
    const periodStart = '2026-08-01';
    const periodEnd = '2026-08-01';
    const scopeName = '全省';
    const snapshot = buildComplaintReportSnapshot(MockComplaints, periodStart, periodEnd, scopeName);
    const topMerchant = snapshot.respondentClusters[0];
    const aiInsight = `<p style="margin:0">当日研判结论：受理${snapshot.total}件，${topMerchant ? `"${topMerchant.name}"为重点跟踪对象，` : ''}${snapshot.pending > 0 ? `${snapshot.pending}件待办需24小时内响应。` : '处置进度正常。'}建议次日重点复查高风险商家整改落实情况。</p>`;
    return {
      id: 'RPT-20260824-0003',
      title: '2026-08-01 投诉日报（贵州省·紧急日报）',
      reportType: 'important_day' as const,
      periodStart,
      periodEnd,
      scopeLevel: 'province' as const,
      scopeName,
      generatedBy: '管理员',
      generatedAt: '2026-08-01 18:30:00',
      summary: buildReportSummary(snapshot, 'important_day', scopeName),
      hasAiInsight: true,
      aiInsight,
      status: snapshot.total === 0 ? 'empty' : 'normal',
      templateId: 'TPL-ID-001',
      chapters: JSON.parse(JSON.stringify(DEFAULT_REPORT_CHAPTERS.important_day)),
      snapshot,
      trigger: 'manual' as const,
    };
  })(),
];

export const MockComplaintReportArchiveLogs: ComplaintReportArchiveLog[] = [
  { archiveLogId: 'cral-1', reportId: 'RPT-20260824-0001', action: 'generate', operator: '系统', operatorLevel: 'province', operatedAt: '2026-08-24 10:05:00', detail: '定时任务自动生成（淡季月报模板）' },
  { archiveLogId: 'cral-2', reportId: 'RPT-20260824-0001', action: 'preview', operator: '陈华', operatorLevel: 'province', operatedAt: '2026-08-24 10:30:00', detail: '在线预览' },
  { archiveLogId: 'cral-3', reportId: 'RPT-20260824-0001', action: 'export', operator: '陈华', operatorLevel: 'province', operatedAt: '2026-08-24 11:20:00', detail: '导出 Word' },
  { archiveLogId: 'cral-4', reportId: 'RPT-20260824-0002', action: 'generate', operator: '系统', operatorLevel: 'city', operatedAt: '2026-08-22 10:00:00', detail: '定时任务自动生成（旺季周报模板）' },
  { archiveLogId: 'cral-5', reportId: 'RPT-20260824-0003', action: 'generate', operator: '管理员', operatorLevel: 'province', operatedAt: '2026-08-01 18:30:00', detail: '手动生成紧急日报' },
];
