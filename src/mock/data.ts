import type { Application, Message, RewardCategory } from '../types';
import { POLICY_CONSTANTS } from '../types';

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
      { id: 'a5', stage: 'pre_check', operator: '陈厅长', operatorRole: 'final_reviewer', action: 'pre_check_pass', comment: '前置审核通过', time: '2025-10-25 16:00:00' },
      { id: 'a6', stage: 'initial', operator: '张华', operatorRole: 'applicant', action: 'submit', time: '2027-01-05 11:00:00' },
      { id: 'a7', stage: 'initial', operator: '王芳', operatorRole: 'initial_reviewer', action: 'pass', comment: '初审通过', time: '2027-01-08 15:00:00' },
      { id: 'a8', stage: 'review', operator: '刘强', operatorRole: 'review_reviewer', action: 'pass', comment: '复审通过', time: '2027-01-15 10:00:00' },
      { id: 'a9', stage: 'final', operator: '陈厅长', operatorRole: 'final_reviewer', action: 'pass', comment: '终审通过，核定5万元', time: '2027-01-20 16:30:00' },
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
      { id: 'a13', stage: 'final', operator: '陈厅长', operatorRole: 'final_reviewer', action: 'pass', time: '2027-01-15 10:00:00' },
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
      { id: 'a21', stage: 'final', operator: '陈厅长', operatorRole: 'final_reviewer', action: 'pass', comment: '进入公示', time: '2027-01-22 16:00:00' },
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
