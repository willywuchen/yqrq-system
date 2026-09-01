// 公告发布管理 Mock 数据与规则函数
// 对齐 2026-08-25-公告发布管理-PRD.md（V1.2）§1.2 / §2.3 / §5
// 说明：区域树按"后端字典"的定位维护（PRD §8 结论 11），MVP 阶段为前端静态树

import type { UserRole } from '../types'
import type {
  Announcement,
  AnnouncementCategory,
  AnnouncementReadRecord,
  AnnouncementRegion,
  AnnouncementTarget,
} from '../types/announcements'

// ========== 贵州省行政区划树（省 → 9 市州 → 区县） ==========
export interface MockDistrict {
  code: string
  name: string
}
export interface MockCity {
  code: string
  name: string
  districts: MockDistrict[]
}

export const GUIZHOU_REGION_TREE: MockCity[] = [
  {
    code: '520100',
    name: '贵阳市',
    districts: [
      { code: '520102', name: '南明区' },
      { code: '520103', name: '云岩区' },
      { code: '520111', name: '花溪区' },
      { code: '520112', name: '乌当区' },
      { code: '520113', name: '白云区' },
      { code: '520115', name: '观山湖区' },
      { code: '520181', name: '清镇市' },
      { code: '520123', name: '修文县' },
      { code: '520122', name: '息烽县' },
      { code: '520121', name: '开阳县' },
    ],
  },
  {
    code: '520200',
    name: '六盘水市',
    districts: [
      { code: '520201', name: '钟山区' },
      { code: '520203', name: '六枝特区' },
      { code: '520204', name: '水城区' },
      { code: '520222', name: '盘州市' },
    ],
  },
  {
    code: '520300',
    name: '遵义市',
    districts: [
      { code: '520302', name: '红花岗区' },
      { code: '520303', name: '汇川区' },
      { code: '520304', name: '播州区' },
      { code: '520322', name: '桐梓县' },
      { code: '520323', name: '绥阳县' },
      { code: '520324', name: '正安县' },
      { code: '520325', name: '道真仡佬族苗族自治县' },
      { code: '520326', name: '务川仡佬族苗族自治县' },
      { code: '520327', name: '凤冈县' },
      { code: '520328', name: '湄潭县' },
      { code: '520329', name: '余庆县' },
      { code: '520330', name: '习水县' },
      { code: '520381', name: '赤水市' },
      { code: '520382', name: '仁怀市' },
    ],
  },
  {
    code: '520400',
    name: '安顺市',
    districts: [
      { code: '520402', name: '西秀区' },
      { code: '520403', name: '平坝区' },
      { code: '520422', name: '普定县' },
      { code: '520423', name: '镇宁布依族苗族自治县' },
      { code: '520424', name: '关岭布依族苗族自治县' },
      { code: '520425', name: '紫云苗族布依族自治县' },
    ],
  },
  {
    code: '520500',
    name: '毕节市',
    districts: [
      { code: '520502', name: '七星关区' },
      { code: '520522', name: '大方县' },
      { code: '520581', name: '黔西市' },
      { code: '520523', name: '金沙县' },
      { code: '520524', name: '织金县' },
      { code: '520525', name: '纳雍县' },
      { code: '520526', name: '威宁彝族回族苗族自治县' },
      { code: '520527', name: '赫章县' },
    ],
  },
  {
    code: '520600',
    name: '铜仁市',
    districts: [
      { code: '520602', name: '碧江区' },
      { code: '520603', name: '万山区' },
      { code: '520621', name: '江口县' },
      { code: '520622', name: '玉屏侗族自治县' },
      { code: '520623', name: '石阡县' },
      { code: '520624', name: '思南县' },
      { code: '520625', name: '印江土家族苗族自治县' },
      { code: '520626', name: '德江县' },
      { code: '520627', name: '沿河土家族自治县' },
      { code: '520628', name: '松桃苗族自治县' },
    ],
  },
  {
    code: '522300',
    name: '黔西南布依族苗族自治州',
    districts: [
      { code: '522301', name: '兴义市' },
      { code: '522302', name: '兴仁市' },
      { code: '522323', name: '普安县' },
      { code: '522324', name: '晴隆县' },
      { code: '522325', name: '贞丰县' },
      { code: '522326', name: '望谟县' },
      { code: '522327', name: '册亨县' },
      { code: '522328', name: '安龙县' },
    ],
  },
  {
    code: '522600',
    name: '黔东南苗族侗族自治州',
    districts: [
      { code: '522601', name: '凯里市' },
      { code: '522622', name: '黄平县' },
      { code: '522623', name: '施秉县' },
      { code: '522624', name: '三穗县' },
      { code: '522625', name: '镇远县' },
      { code: '522626', name: '岑巩县' },
      { code: '522627', name: '天柱县' },
      { code: '522628', name: '锦屏县' },
      { code: '522629', name: '剑河县' },
      { code: '522630', name: '台江县' },
      { code: '522631', name: '黎平县' },
      { code: '522632', name: '榕江县' },
      { code: '522633', name: '从江县' },
      { code: '522634', name: '雷山县' },
      { code: '522635', name: '麻江县' },
      { code: '522636', name: '丹寨县' },
    ],
  },
  {
    code: '522700',
    name: '黔南布依族苗族自治州',
    districts: [
      { code: '522701', name: '都匀市' },
      { code: '522702', name: '福泉市' },
      { code: '522722', name: '荔波县' },
      { code: '522723', name: '贵定县' },
      { code: '522725', name: '瓮安县' },
      { code: '522726', name: '独山县' },
      { code: '522727', name: '平塘县' },
      { code: '522728', name: '罗甸县' },
      { code: '522729', name: '长顺县' },
      { code: '522730', name: '龙里县' },
      { code: '522731', name: '惠水县' },
      { code: '522732', name: '三都水族自治县' },
    ],
  },
]

// 全省默认区域
export const PROVINCE_REGION: AnnouncementRegion = { level: 'province', code: '520000', name: '贵州省' }

// ========== 平台账号目录（接收对象 / 已读统计分母，静态目录不落 store） ==========
// 监管账号（对应角色：终审审核员 / 系统管理员 + 各市州文旅局账号；初/复审不参与本模块）
export interface MockDeptAccount {
  id: string
  name: string
  role: UserRole
  orgName: string
  cityCode?: string // 所属市州编码；省级账号不填（可接收全省公告）
  districtCode?: string // 所属区县编码；市州级账号不填
}

// 旅行社账号（MVP 用注册地 mock 演示，真实接入待账号体系补充，PRD §8 遗留跟进）
export interface MockAgencyAccount {
  id: string
  name: string // 账号联系人
  orgName: string // 旅行社名称
  cityCode: string
  districtCode: string
  erpRegistered: boolean // 是否已接入旅行社 ERP 系统
}

export const MockDeptAccounts: MockDeptAccount[] = [
  { id: 'dept-chen', name: '陈华', role: 'final_reviewer', orgName: '贵州省文化和旅游厅' },
  { id: 'dept-admin', name: '管理员', role: 'admin', orgName: '贵州省文化和旅游厅' },
  // 各市州文旅局监管账号（用于"监管账号按区域发布"演示；登录演示账号固定取首个省级账号）
  { id: 'dept-guiyang', name: '周贵阳', role: 'final_reviewer', orgName: '贵阳市文化和旅游局', cityCode: '520100' },
  { id: 'dept-zunyi', name: '何遵义', role: 'final_reviewer', orgName: '遵义市文化和旅游局', cityCode: '520300' },
  { id: 'dept-anming', name: '吴安顺', role: 'final_reviewer', orgName: '安顺市文化和旅游局', cityCode: '520400' },
  { id: 'dept-liupanshui', name: '龙六盘', role: 'final_reviewer', orgName: '六盘水市文化和旅游局', cityCode: '520200' },
  { id: 'dept-bijie', name: '穆毕节', role: 'final_reviewer', orgName: '毕节市文化和旅游局', cityCode: '520500' },
  { id: 'dept-tongren', name: '田铜仁', role: 'final_reviewer', orgName: '铜仁市文化和旅游局', cityCode: '520600' },
  { id: 'dept-qianxinan', name: '岑黔西南', role: 'final_reviewer', orgName: '黔西南州文化广电和旅游局', cityCode: '522300' },
  { id: 'dept-qiandongnan', name: '杨黔东南', role: 'final_reviewer', orgName: '黔东南州文体广电旅游局', cityCode: '522600' },
  { id: 'dept-qiannan', name: '蒙黔南', role: 'final_reviewer', orgName: '黔南州文化广电和旅游局', cityCode: '522700' },
]

export const MockAgencyAccounts: MockAgencyAccount[] = [
  { id: 'agency-001', name: '李明', orgName: '贵州阳光国际旅行社', cityCode: '520100', districtCode: '520102', erpRegistered: true },
  { id: 'agency-002', name: '王华', orgName: '贵州山水旅行社', cityCode: '520100', districtCode: '520115', erpRegistered: false },
  { id: 'agency-003', name: '周红', orgName: '遵义红色之旅旅行社', cityCode: '520300', districtCode: '520302', erpRegistered: true },
  { id: 'agency-004', name: '吴强', orgName: '赤水河谷旅行社', cityCode: '520300', districtCode: '520381', erpRegistered: false },
  { id: 'agency-005', name: '郑敏', orgName: '安顺黄果树旅行社', cityCode: '520400', districtCode: '520402', erpRegistered: true },
  { id: 'agency-006', name: '杨秀', orgName: '苗乡侗寨旅行社', cityCode: '522600', districtCode: '522601', erpRegistered: false },
  { id: 'agency-007', name: '刘涛', orgName: '六盘水凉都旅行社', cityCode: '520200', districtCode: '520201', erpRegistered: true },
  { id: 'agency-008', name: '赵芬', orgName: '毕节花海旅行社', cityCode: '520500', districtCode: '520502', erpRegistered: false },
  { id: 'agency-009', name: '孙浩', orgName: '铜仁梵净山旅行社', cityCode: '520600', districtCode: '520602', erpRegistered: true },
  { id: 'agency-010', name: '钱丽', orgName: '荔波小七孔旅行社', cityCode: '522700', districtCode: '522722', erpRegistered: false },
  { id: 'agency-011', name: '冯军', orgName: '兴义万峰林旅行社', cityCode: '522300', districtCode: '522301', erpRegistered: true },
]

// ========== 公告分类（预置 4 类，PRD §8 结论 10） ==========
export const MockAnnouncementCategories: AnnouncementCategory[] = [
  { id: 'anc-cat-law', name: '法律法规', sort: 1, status: 'enabled', createTime: '2026-06-01 09:00:00' },
  { id: 'anc-cat-policy', name: '政策文件', sort: 2, status: 'enabled', createTime: '2026-06-01 09:05:00' },
  { id: 'anc-cat-notice', name: '通知公告', sort: 3, status: 'enabled', createTime: '2026-06-01 09:10:00' },
  { id: 'anc-cat-industry', name: '行业动态', sort: 4, status: 'enabled', createTime: '2026-06-01 09:15:00' },
]

// ========== 公告（覆盖三状态 × 各类定向组合） ==========
export const MockAnnouncements: Announcement[] = [
  {
    id: 'anc-001',
    title: '关于开展2026年暑期旅游市场专项整治工作的通知',
    categoryId: 'anc-cat-notice',
    summary: '针对不合理低价游、强迫购物、非法组团等突出问题开展为期两个月的专项整治，请各旅行社立即自查自纠。',
    content: `<h3>一、整治重点</h3>
<ul>
<li><b>不合理低价游</b>：以"低价团费+购物回扣"模式招徕游客的，依法从严查处；</li>
<li><b>强迫或变相强迫购物</b>：行程中擅自增加购物点、诱导消费的，游客投诉一经查实，顶格处罚；</li>
<li><b>非法组团</b>：无资质组织"一日游""VIP小团"，通过社交平台私揽业务的，纳入重点打击范围；</li>
<li><b>合同不规范</b>：未签电子合同、行程单与实际行程不符的，责令整改并记入信用档案。</li>
</ul>
<h3>二、工作步骤</h3>
<p><b>自查自纠阶段（8月25日—9月10日）</b>：各旅行社对照整治重点逐项自查，形成自查报告留存备查。</p>
<p><b>集中检查阶段（9月11日—10月10日）</b>：省、市、县三级文旅执法部门联动，采取"四不两直"方式现场检查。</p>
<p><b>总结提升阶段（10月11日—10月20日）</b>：通报典型案例，完善长效监管机制。</p>
<h3>三、工作要求</h3>
<p>各旅行社要高度重视，法定代表人为第一责任人；对整治期间被查实的违法违规行为，依法依规实施行政处罚并纳入信用管理，情节严重的依法吊销经营许可。</p>
<p>整治期间实行<b>周报告制度</b>，各旅行社每周五17:00前通过本平台报送自查整改进展。</p>`,
    attachments: [
      {
        uid: 'att-anc-001',
        name: '2026年暑期旅游市场专项整治工作方案.pdf',
        size: 1 * 1024 * 1024 + 320 * 1024,
        type: 'pdf',
        uploadTime: '2026-08-24 09:00:00',
      },
    ],
    isTop: true,
    isForceRead: true,
    targets: ['erp', 'dept_account', 'agency_user'],
    region: PROVINCE_REGION,
    status: 'published',
    viewCount: 187,
    publishTime: '2026-08-24 09:30:00',
    createBy: '陈华',
    createTime: '2026-08-24 09:00:00',
  },
  {
    id: 'anc-002',
    title: '关于进一步规范补贴审核工作纪律的若干规定（厅内）',
    categoryId: 'anc-cat-policy',
    summary: '面向厅内工作人员的审核工作纪律要求：双人复核、限时办结、回避制度与责任追究。',
    content: `<h3>一、双人复核</h3>
<p>补贴申报材料的初审、复审环节必须由两名以上工作人员分别复核，严禁一人代办全流程。</p>
<h3>二、限时办结</h3>
<p>收到申报材料后<b>5个工作日</b>内完成初审，复杂材料经分管领导批准可延长<b>3个工作日</b>，超期须书面说明原因。</p>
<h3>三、回避制度</h3>
<p>工作人员与申报旅行社存在亲属关系、经济往来等利害关系的，应当主动申报并回避。</p>
<h3>四、责任追究</h3>
<p>对违反工作纪律造成不良影响的，依规依纪严肃处理；涉嫌违法的，移送司法机关。</p>`,
    attachments: [],
    isTop: false,
    isForceRead: true,
    targets: ['dept_account'],
    region: PROVINCE_REGION,
    status: 'published',
    viewCount: 2,
    publishTime: '2026-08-20 10:00:00',
    createBy: '管理员',
    createTime: '2026-08-20 09:40:00',
  },
  {
    id: 'anc-003',
    title: '贵阳市2026年国庆黄金周旅游接待工作安排',
    categoryId: 'anc-cat-notice',
    summary: '国庆期间甲秀楼、青岩古镇等景区实行预约限流，旅行社团队须提前3日报送接待计划。',
    content: `<h3>一、景区预约</h3>
<p>国庆期间（10月1日—10月7日），甲秀楼、青岩古镇、天河潭等热门景区实行<b>分时段预约限流</b>，旅行社团队通过景区团队通道统一预约。</p>
<h3>二、团队报备</h3>
<p>旅行社接待团队须提前<b>3个工作日</b>通过本平台报送接待计划（含行程、人数、车辆、导游信息），未报备团队景区可拒绝接待。</p>
<h3>三、应急值守</h3>
<p>黄金周期间实行24小时应急值守，遇突发事件第一时间报告属地文旅部门。</p>`,
    attachments: [],
    isTop: false,
    isForceRead: false,
    targets: ['agency_user'],
    region: { level: 'city', code: '520100', name: '贵阳市' },
    status: 'published',
    viewCount: 41,
    publishTime: '2026-08-22 15:00:00',
    createBy: '管理员',
    createTime: '2026-08-22 14:30:00',
  },
  {
    id: 'anc-004',
    title: '《旅行社条例》实施细则宣贯要点',
    categoryId: 'anc-cat-law',
    summary: '围绕保证金存缴、分支机构备案、出境社委托代理等条款的实施细则宣贯要点梳理。',
    content: `<h3>一、质量保证金</h3>
<p>经营境内游的旅行社存缴质量保证金<b>20万元</b>；经营出境游的增存<b>120万元</b>。每设立一个分社增存5万元。</p>
<h3>二、分支机构备案</h3>
<p>旅行社设立分社、服务网点的，应当自设立之日起<b>3个工作日</b>内向所在地文旅部门备案。</p>
<h3>三、出境游委托</h3>
<p>出境社委托代理招徕的，应当签订委托合同并向社会公示，受托社不得再行委托。</p>`,
    attachments: [],
    isTop: false,
    isForceRead: false,
    targets: ['agency_user', 'erp'],
    region: { level: 'city', code: '520300', name: '遵义市' },
    status: 'published',
    viewCount: 26,
    publishTime: '2026-08-15 11:00:00',
    createBy: '陈华',
    createTime: '2026-08-15 10:20:00',
  },
  {
    id: 'anc-005',
    title: '《中华人民共和国旅游法》修订条款施行公告',
    categoryId: 'anc-cat-law',
    summary: '本次修订重点调整旅游者权益保护与经营者义务条款，自2026年9月1日起施行，请组织全员学习。',
    content: `<h3>一、修订背景</h3>
<p>全国人大常委会对《中华人民共和国旅游法》部分条款作出修订，修订条款自<b>2026年9月1日</b>起施行。</p>
<h3>二、主要修订内容</h3>
<ul>
<li>细化旅游者个人信息保护义务，经营者不得过度收集、泄露游客信息；</li>
<li>强化在线旅游平台责任，对平台内经营者资质审核义务提出明确要求；</li>
<li>提高对强迫购物、擅自变更行程等行为的罚款幅度；</li>
<li>完善旅游突发事件报告与先行处置制度。</li>
</ul>
<h3>三、贯彻要求</h3>
<p>各旅行社应当自公告发布之日起组织全员学习，修订后的合规要点要落实到产品、销售、接待各环节；9月1日后发生的违规行为，按修订后的条款执行处罚。</p>`,
    attachments: [
      {
        uid: 'att-anc-005',
        name: '旅游法修订条款对照表.docx',
        size: 680 * 1024,
        type: 'docx',
        uploadTime: '2026-08-18 10:00:00',
      },
    ],
    isTop: false,
    isForceRead: true,
    targets: ['agency_user'],
    region: PROVINCE_REGION,
    status: 'published',
    viewCount: 93,
    publishTime: '2026-08-18 10:30:00',
    createBy: '管理员',
    createTime: '2026-08-18 10:00:00',
  },
  {
    id: 'anc-006',
    title: '中秋节假期旅游安全工作提示（草稿）',
    categoryId: 'anc-cat-notice',
    summary: '中秋节前安全隐患排查、行车安全与值班值守工作提示，拟于节前一周发布。',
    content: `<h3>一、隐患排查</h3><p>节前完成经营场所、团队用车安全隐患排查。</p>`,
    attachments: [],
    isTop: false,
    isForceRead: false,
    targets: [],
    region: PROVINCE_REGION,
    status: 'draft',
    viewCount: 0,
    createBy: '管理员',
    createTime: '2026-08-25 16:40:00',
  },
  {
    id: 'anc-007',
    title: '2026年上半年全省入境旅游市场运行情况',
    categoryId: 'anc-cat-industry',
    summary: '上半年全省接待入境游客同比增长38%，东南亚市场占比过半，引客入黔奖励政策效应显现。',
    content: `<h3>一、总体情况</h3>
<p>2026年上半年全省接待入境游客人次同比增长<b>38%</b>，旅游外汇收入创历史同期新高。</p>
<h3>二、市场结构</h3>
<p>东南亚市场占入境市场<b>52%</b>，其中越南、泰国、马来西亚位居前三；欧美长线市场稳步恢复。</p>
<h3>三、政策效应</h3>
<p>"引客入黔"奖励政策实施以来，累计奖励入境组团社120余家次，政策带动效应持续显现。</p>`,
    attachments: [],
    isTop: false,
    isForceRead: false,
    targets: ['agency_user'],
    region: PROVINCE_REGION,
    status: 'offline',
    viewCount: 64,
    publishTime: '2026-07-10 09:00:00',
    createBy: '陈华',
    createTime: '2026-07-09 17:00:00',
    updateBy: '陈华',
    updateTime: '2026-08-01 09:30:00',
  },
  {
    id: 'anc-008',
    title: '2026贵州旅游产业发展大会观摩线路踩线通知',
    categoryId: 'anc-cat-industry',
    summary: '旅发大会观摩线路踩线活动报名启动，各旅行社可申报2名计调人员参加。',
    content: `<h3>一、活动安排</h3>
<p>2026贵州旅游产业发展大会将于9月下旬召开，会前组织观摩线路踩线活动，为期3天。</p>
<h3>二、报名方式</h3>
<p>各旅行社可申报<b>2名</b>计调或产品人员，通过本平台公告附件中的报名表填报，截止9月5日。</p>`,
    attachments: [],
    isTop: false,
    isForceRead: false,
    targets: ['agency_user'],
    region: PROVINCE_REGION,
    status: 'published',
    viewCount: 35,
    publishTime: '2026-08-21 09:00:00',
    createBy: '管理员',
    createTime: '2026-08-20 18:00:00',
  },
  {
    id: 'anc-009',
    title: '黔东南州苗侗节庆活动组团接待规范要求',
    categoryId: 'anc-cat-notice',
    summary: '村超、侗族大歌等节庆活动期间团队接待须提前报备，严禁组织游客进入未开放区域。',
    content: `<h3>一、团队报备</h3>
<p>节庆活动期间（9月—11月）进入黔东南州的旅游团队，须提前<b>2个工作日</b>向属地文旅部门报备行程。</p>
<h3>二、接待规范</h3>
<ul>
<li>严禁组织游客进入未开放村寨、施工区域；</li>
<li>尊重民族习俗，村寨内拍摄须征得同意；</li>
<li>规范使用当地向导，不得聘用无资质人员。</li>
</ul>`,
    attachments: [],
    isTop: false,
    isForceRead: true,
    targets: ['agency_user'],
    region: { level: 'city', code: '522600', name: '黔东南苗族侗族自治州' },
    status: 'published',
    viewCount: 18,
    publishTime: '2026-08-23 10:00:00',
    createBy: '管理员',
    createTime: '2026-08-23 09:20:00',
  },
]

// ========== 阅读记录（演示：阳光旅行社等部分账号未读，用于强制弹窗/红标演示） ==========
export const MockAnnouncementReads: AnnouncementReadRecord[] = [
  // anc-001（全省强制，三端）：厅内管理员已读、4家旅行社已读；陈华与阳光等未读 → 弹窗演示
  { id: 'aread-001', announcementId: 'anc-001', userId: 'dept-admin', userName: '管理员', userType: 'dept', orgName: '贵州省文化和旅游厅', confirmMethod: 'force_confirm', readTime: '2026-08-24 11:00:00' },
  { id: 'aread-002', announcementId: 'anc-001', userId: 'agency-003', userName: '周红', userType: 'agency', orgName: '遵义红色之旅旅行社', confirmMethod: 'force_confirm', readTime: '2026-08-24 14:20:00' },
  { id: 'aread-003', announcementId: 'anc-001', userId: 'agency-005', userName: '郑敏', userType: 'agency', orgName: '安顺黄果树旅行社', confirmMethod: 'force_confirm', readTime: '2026-08-24 15:05:00' },
  { id: 'aread-004', announcementId: 'anc-001', userId: 'agency-007', userName: '刘涛', userType: 'agency', orgName: '六盘水凉都旅行社', confirmMethod: 'force_confirm', readTime: '2026-08-25 09:12:00' },
  { id: 'aread-005', announcementId: 'anc-001', userId: 'agency-009', userName: '孙浩', userType: 'agency', orgName: '铜仁梵净山旅行社', confirmMethod: 'force_confirm', readTime: '2026-08-25 10:40:00' },
  // anc-002（仅厅内强制）：均未读 → 厅内登录弹窗演示
  // anc-003（贵阳普通）：山水旅行社已读，阳光未读 → 红点演示
  { id: 'aread-006', announcementId: 'anc-003', userId: 'agency-002', userName: '王华', userType: 'agency', orgName: '贵州山水旅行社', confirmMethod: 'detail_open', readTime: '2026-08-22 20:15:00' },
  // anc-004（遵义普通）：两家遵义社均读
  { id: 'aread-007', announcementId: 'anc-004', userId: 'agency-003', userName: '周红', userType: 'agency', orgName: '遵义红色之旅旅行社', confirmMethod: 'detail_open', readTime: '2026-08-16 09:00:00' },
  { id: 'aread-008', announcementId: 'anc-004', userId: 'agency-004', userName: '吴强', userType: 'agency', orgName: '赤水河谷旅行社', confirmMethod: 'detail_open', readTime: '2026-08-17 11:30:00' },
  // anc-005（全省强制）：3家已读，阳光未读 → 弹窗演示
  { id: 'aread-009', announcementId: 'anc-005', userId: 'agency-003', userName: '周红', userType: 'agency', orgName: '遵义红色之旅旅行社', confirmMethod: 'force_confirm', readTime: '2026-08-18 16:00:00' },
  { id: 'aread-010', announcementId: 'anc-005', userId: 'agency-005', userName: '郑敏', userType: 'agency', orgName: '安顺黄果树旅行社', confirmMethod: 'force_confirm', readTime: '2026-08-19 09:45:00' },
  { id: 'aread-011', announcementId: 'anc-005', userId: 'agency-010', userName: '钱丽', userType: 'agency', orgName: '荔波小七孔旅行社', confirmMethod: 'force_confirm', readTime: '2026-08-20 14:10:00' },
  // anc-007（已下架）：历史已读保留
  { id: 'aread-012', announcementId: 'anc-007', userId: 'agency-001', userName: '李明', userType: 'agency', orgName: '贵州阳光国际旅行社', confirmMethod: 'detail_open', readTime: '2026-07-11 10:00:00' },
  { id: 'aread-013', announcementId: 'anc-007', userId: 'agency-011', userName: '冯军', userType: 'agency', orgName: '兴义万峰林旅行社', confirmMethod: 'detail_open', readTime: '2026-07-12 09:30:00' },
  // anc-008（全省普通）：2家已读
  { id: 'aread-014', announcementId: 'anc-008', userId: 'agency-002', userName: '王华', userType: 'agency', orgName: '贵州山水旅行社', confirmMethod: 'detail_open', readTime: '2026-08-21 15:20:00' },
  { id: 'aread-015', announcementId: 'anc-008', userId: 'agency-008', userName: '赵芬', userType: 'agency', orgName: '毕节花海旅行社', confirmMethod: 'detail_open', readTime: '2026-08-22 08:50:00' },
  // anc-009（黔东南强制）：苗乡侗寨已读
  { id: 'aread-016', announcementId: 'anc-009', userId: 'agency-006', userName: '杨秀', userType: 'agency', orgName: '苗乡侗寨旅行社', confirmMethod: 'force_confirm', readTime: '2026-08-23 17:30:00' },
]

// ========== 规则函数（PRD §2.3 可见性 / §5.5 已读统计） ==========

// 当前登录用户对应的接收账号（申请人按旅行社名称匹配、厅内按角色匹配；初/复审返回 null）
export function getAccountOfUser(user: { name: string; role: UserRole; org?: string }) {
  if (user.role === 'applicant') {
    return MockAgencyAccounts.find((a) => a.orgName === user.org) || null
  }
  if (user.role === 'final_reviewer' || user.role === 'admin') {
    return MockDeptAccounts.find((a) => a.role === user.role) || null
  }
  return null
}

// 账号 → 阅读留痕账号信息（store.markAnnouncementRead 入参）
export function toReadAccount(account: MockDeptAccount | MockAgencyAccount): {
  id: string
  name: string
  userType: 'dept' | 'agency'
  orgName: string
} {
  return {
    id: account.id,
    name: account.name,
    userType: account.id.startsWith('dept-') ? 'dept' : 'agency',
    orgName: account.orgName,
  }
}

// 发布区域是否覆盖旅行社注册地（PRD §2.3：全省覆盖所有；市州/区县按注册地匹配）
export function regionMatchAgency(region: AnnouncementRegion, agency: MockAgencyAccount): boolean {
  if (region.level === 'province') return true
  if (region.level === 'city') return agency.cityCode === region.code
  return agency.districtCode === region.code
}

// 发布区域是否覆盖监管账号所属区域（省级账号可接收全省公告，市州账号仅接收所属区域公告）
export function regionMatchDept(region: AnnouncementRegion, dept: MockDeptAccount): boolean {
  if (region.level === 'province') return true
  if (region.level === 'city') return dept.cityCode === region.code
  return dept.districtCode === region.code
}

// 公告是否对当前用户可见（PRD §2.3：已发布 + 对象匹配 + 区域匹配）
export function isVisibleToUser(
  announcement: Announcement,
  user: { name: string; role: UserRole; org?: string },
): boolean {
  if (announcement.status !== 'published') return false
  if (user.role === 'applicant') {
    if (!announcement.targets.includes('agency_user')) return false
    const agency = MockAgencyAccounts.find((a) => a.orgName === user.org)
    return !!agency && regionMatchAgency(announcement.region, agency)
  }
  if (user.role === 'final_reviewer' || user.role === 'admin') {
    if (!announcement.targets.includes('dept_account')) return false
    const dept = MockDeptAccounts.find((a) => a.role === user.role)
    return !!dept && regionMatchDept(announcement.region, dept)
  }
  return false // 初/复审不参与本模块
}

// 平台内目标账号（动态口径分母：区域内监管账号 + 区域内涉旅企业账号；ERP 仅计数提示，PRD §8 结论 7）
export interface TargetAccount {
  id: string
  name: string
  userType: 'dept' | 'agency'
  orgName: string
}

export function buildTargetAccounts(announcement: Announcement): TargetAccount[] {
  const result: TargetAccount[] = []
  if (announcement.targets.includes('dept_account')) {
    for (const d of MockDeptAccounts) {
      if (regionMatchDept(announcement.region, d)) {
        result.push({ id: d.id, name: d.name, userType: 'dept', orgName: d.orgName })
      }
    }
  }
  if (announcement.targets.includes('agency_user')) {
    for (const a of MockAgencyAccounts) {
      if (regionMatchAgency(announcement.region, a)) {
        result.push({ id: a.id, name: a.name, userType: 'agency', orgName: a.orgName })
      }
    }
  }
  return result
}

// 区域内已接入 ERP 的旅行社数（统计抽屉"待对接"提示用）
export function countErpAgencies(announcement: Announcement): number {
  return MockAgencyAccounts.filter((a) => a.erpRegistered && regionMatchAgency(announcement.region, a)).length
}

// 已读统计（PRD §5.5）：目标账号 / 已读名单 / 未读名单 / 已读率
export function getReadStats(announcement: Announcement, reads: AnnouncementReadRecord[]) {
  const targets = buildTargetAccounts(announcement)
  const recordMap = new Map<string, AnnouncementReadRecord>()
  for (const r of reads) {
    if (r.announcementId === announcement.id && !recordMap.has(r.userId)) {
      recordMap.set(r.userId, r) // 同一账号仅一条，取首次确认时间
    }
  }
  const readList: (TargetAccount & { readTime: string })[] = []
  const unreadList: TargetAccount[] = []
  for (const t of targets) {
    const r = recordMap.get(t.id)
    if (r) readList.push({ ...t, readTime: r.readTime })
    else unreadList.push(t)
  }
  const readCount = readList.length
  const total = targets.length
  return {
    targets,
    readList,
    unreadList,
    readCount,
    unreadCount: total - readCount,
    readRate: total > 0 ? Math.round((readCount / total) * 100) : 0,
  }
}

// 当前用户的未读公告（可见 + 无阅读记录）
export function getUnreadAnnouncements(
  announcements: Announcement[],
  reads: AnnouncementReadRecord[],
  user: { name: string; role: UserRole; org?: string },
): Announcement[] {
  const account = getAccountOfUser(user)
  if (!account) return []
  return announcements
    .filter(
      (a) =>
        isVisibleToUser(a, user) &&
        !reads.some((r) => r.announcementId === a.id && r.userId === account.id),
    )
    .sort((a, b) => (a.publishTime || '').localeCompare(b.publishTime || ''))
}

// 当前用户的未读强制公告（登录弹窗队列，按发布时间正序，PRD §5.8）
export function getForceUnreadAnnouncements(
  announcements: Announcement[],
  reads: AnnouncementReadRecord[],
  user: { name: string; role: UserRole; org?: string },
): Announcement[] {
  return getUnreadAnnouncements(announcements, reads, user).filter((a) => a.isForceRead)
}

// 区域文本（列表展示用，如"贵州省"→ 全省）
export function regionLabel(region: AnnouncementRegion): string {
  if (region.level === 'province') return `${region.name}（全省）`
  return region.name
}

// 构造区域（由级联选择路径转换）
export function regionFromCascader(path: string[]): AnnouncementRegion {
  if (path.length <= 1) return PROVINCE_REGION
  if (path.length === 2) {
    const city = GUIZHOU_REGION_TREE.find((c) => c.code === path[1])
    return city ? { level: 'city', code: city.code, name: city.name } : PROVINCE_REGION
  }
  const city = GUIZHOU_REGION_TREE.find((c) => c.code === path[1])
  const district = city?.districts.find((d) => d.code === path[2])
  return district ? { level: 'district', code: district.code, name: district.name } : PROVINCE_REGION
}

// 区域转级联选择路径
export function regionToCascader(region: AnnouncementRegion): string[] {
  if (region.level === 'province') return [PROVINCE_REGION.code]
  if (region.level === 'city') return [PROVINCE_REGION.code, region.code]
  const city = GUIZHOU_REGION_TREE.find((c) => c.districts.some((d) => d.code === region.code))
  return city ? [PROVINCE_REGION.code, city.code, region.code] : [PROVINCE_REGION.code]
}

// 发布对象短标签组合（列表 Tag 用）
export function targetShortText(targets: AnnouncementTarget[]): string {
  return targets.map((t) => ({ erp: 'ERP系统', dept_account: '监管账号', agency_user: '涉旅企业账号' })[t]).join('、')
}
