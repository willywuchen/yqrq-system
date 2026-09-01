// 学习培训管理 Mock 数据
// 对齐 2026-08-25-学习培训管理-PRD.md §5

import type { TrainingCategory, TrainingMaterial } from '../types/training'

// Mock 占位媒体源（公共可用，与旅游包车模块占位视频同源）
export const MOCK_TRAINING_VIDEO_URL = 'https://www.w3schools.com/html/mov_bbb.mp4'
export const MOCK_TRAINING_AUDIO_URL = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'

// ========== 资料分类（5 类，PRD §8 待确认 8 预置清单） ==========
export const MockTrainingCategories: TrainingCategory[] = [
  { id: 'cat-policy', name: '政策法规', sort: 1, status: 'enabled', createTime: '2026-06-01 09:00:00' },
  { id: 'cat-business', name: '业务规范', sort: 2, status: 'enabled', createTime: '2026-06-01 09:05:00' },
  { id: 'cat-safety', name: '安全应急', sort: 3, status: 'enabled', createTime: '2026-06-01 09:10:00' },
  { id: 'cat-service', name: '服务技能', sort: 4, status: 'enabled', createTime: '2026-06-01 09:15:00' },
  { id: 'cat-case', name: '案例警示', sort: 5, status: 'enabled', createTime: '2026-06-01 09:20:00' },
]

// ========== 学习资料（覆盖三种形式 × 三个层级 × 三种状态） ==========
export const MockTrainingMaterials: TrainingMaterial[] = [
  {
    id: 'mat-001',
    title: '《中华人民共和国旅游法》重点条文解读',
    categoryId: 'cat-policy',
    level: 'national',
    mediaType: 'rich_text',
    summary: '旅游经营、旅游服务合同、旅游安全等与旅行社日常经营直接相关的重点条文梳理。',
    content: `<h3>一、立法背景</h3>
<p>《中华人民共和国旅游法》于2013年4月25日由第十二届全国人大常委会第二次会议通过，自2013年10月1日起施行，是我国旅游业第一部综合性法律，覆盖旅游者权益保护、旅游规划促进、旅游经营、旅游服务合同、旅游安全监管等内容。</p>
<h3>二、旅行社需重点关注的条文</h3>
<ul>
<li><b>第三十五条</b>：旅行社不得以不合理的低价组织旅游活动，诱骗旅游者，并通过安排购物或者另行付费旅游项目获取回扣等不正当利益；</li>
<li><b>第五十七条</b>：旅行社组织旅游活动应当与旅游者订立合同，明确游览、娱乐、购物、住宿、餐饮以及自由活动时间等内容；</li>
<li><b>第七十九条</b>：旅游经营者应当对直接为旅游者提供服务的设施设备进行检查、维护，防止危及旅游者人身安全的事故发生。</li>
</ul>
<h3>三、对旅行社经营的要求</h3>
<p>旅行社应当在营业场所、公司官网等公示证照信息；组织接待团队时如实告知行程安排；发生突发事件的，立即采取必要救助和处置措施，依法履行报告义务。</p>
<p>各旅行社应当组织全员学习，导游、计调、销售岗位人员须熟练掌握与本岗位相关的条款。</p>`,
    attachments: [
      {
        uid: 'att-001',
        name: '中华人民共和国旅游法（全文）.pdf',
        size: 2 * 1024 * 1024 + 130 * 1024,
        type: 'pdf',
        uploadTime: '2026-06-10 10:00:00',
      },
    ],
    source: '文化和旅游部官网',
    isPublicToAgency: true,
    status: 'published',
    isTop: true,
    viewCount: 328,
    publishTime: '2026-06-10 10:30:00',
    createBy: '陈华',
    createTime: '2026-06-10 10:00:00',
    updateBy: '陈华',
    updateTime: '2026-06-12 15:20:00',
  },
  {
    id: 'mat-002',
    title: '《贵州省旅游条例》修订要点解读',
    categoryId: 'cat-policy',
    level: 'provincial',
    mediaType: 'rich_text',
    summary: '围绕旅游市场监管、旅行社经营规范、旅游资源保护等方面的修订要点与新旧对照。',
    content: `<h3>一、修订情况</h3>
<p>《贵州省旅游条例》经贵州省人大常委会审议通过，结合我省旅游业发展实际，对旅游促进、旅游经营、旅游监督管理等章节作出修订。</p>
<h3>二、修订要点</h3>
<ul>
<li>强化旅行社质量保证金与责任保险监管要求；</li>
<li>明确旅游经营者不得给予或者收受回扣等不正当利益；</li>
<li>完善旅游投诉处理与先行赔付机制；</li>
<li>加大对"不合理低价游"、虚假宣传等违法行为的处罚力度。</li>
</ul>
<h3>三、学习贯彻要求</h3>
<p>各旅行社要将条例学习纳入员工岗位培训计划，特别是计调与门店销售人员，应当在产品设计与宣传报价环节对照条例自查。</p>`,
    attachments: [],
    source: '贵州省人民代表大会常务委员会官网',
    isPublicToAgency: true,
    status: 'published',
    isTop: false,
    viewCount: 156,
    publishTime: '2026-07-02 09:00:00',
    createBy: '管理员',
    createTime: '2026-07-01 16:40:00',
  },
  {
    id: 'mat-003',
    title: '2026年度"引客入黔"补贴政策宣贯视频',
    categoryId: 'cat-policy',
    level: 'departmental',
    mediaType: 'video',
    summary: '省文旅厅对2026年度引客入黔补贴的申报条件、材料清单、时间节点进行视频宣贯。',
    videoUrl: MOCK_TRAINING_VIDEO_URL,
    videoDuration: 1420,
    attachments: [
      {
        uid: 'att-003',
        name: '引客入黔补贴申报操作手册.pdf',
        size: 5 * 1024 * 1024 + 820 * 1024,
        type: 'pdf',
        uploadTime: '2026-08-18 09:10:00',
      },
    ],
    source: '贵州省文化和旅游厅',
    isPublicToAgency: true,
    status: 'published',
    isTop: false,
    viewCount: 489,
    publishTime: '2026-08-18 09:30:00',
    createBy: '陈华',
    createTime: '2026-08-18 09:10:00',
  },
  {
    id: 'mat-004',
    title: '旅游团队操作规范与电子行程单使用指南',
    categoryId: 'cat-business',
    level: 'departmental',
    mediaType: 'rich_text',
    summary: '团队操作全流程规范：行前确认、行程单开具、行程变更处理与团队档案留存要求。',
    content: `<h3>一、行前准备</h3>
<ul>
<li>与组团社/地接社确认接待计划书，明确导游、车辆、住宿、餐饮安排；</li>
<li>通过"贵州文化和旅游市场监管执法平台"输出电子行程单，核对派团单号；</li>
<li>行前向游客告知行程安排、安全注意事项与当地风俗。</li>
</ul>
<h3>二、行程中规范</h3>
<ul>
<li>严格按照行程单安排游览，不得擅自增加购物点或另行付费项目；</li>
<li>行程变更的，经游客书面（含电子）确认后留存凭证；</li>
<li>每日核对游客名单，涉及住宿、景区的留存盖章证明。</li>
</ul>
<h3>三、团队档案留存</h3>
<p>团队行程结束后，将接待计划书、电子行程单、游客名单、住宿与景区证明等材料归档留存，以备申报补贴与监管检查。</p>`,
    attachments: [],
    source: '贵州省文化和旅游厅',
    isPublicToAgency: true,
    status: 'published',
    isTop: false,
    viewCount: 203,
    publishTime: '2026-07-25 14:00:00',
    createBy: '管理员',
    createTime: '2026-07-24 11:20:00',
  },
  {
    id: 'mat-005',
    title: '导游服务礼仪示范课程',
    categoryId: 'cat-service',
    level: 'national',
    mediaType: 'video',
    summary: '全国导游大赛获奖导游示范讲解与服务礼仪标准动作教学。',
    videoUrl: MOCK_TRAINING_VIDEO_URL,
    videoDuration: 2760,
    attachments: [],
    source: '文化和旅游部在线培训资源',
    isPublicToAgency: true,
    status: 'published',
    isTop: false,
    viewCount: 412,
    publishTime: '2026-06-28 10:00:00',
    createBy: '管理员',
    createTime: '2026-06-27 17:30:00',
  },
  {
    id: 'mat-006',
    title: '旅游包车安全乘车须知（宣贯音频）',
    categoryId: 'cat-safety',
    level: 'provincial',
    mediaType: 'audio',
    summary: '面向导游与游客的包车安全乘车宣贯音频，可在团队行前播放。',
    audioUrl: MOCK_TRAINING_AUDIO_URL,
    audioDuration: 215,
    attachments: [],
    source: '贵州省交通运输厅联合发布',
    isPublicToAgency: true,
    status: 'published',
    isTop: false,
    viewCount: 178,
    publishTime: '2026-08-05 09:00:00',
    createBy: '管理员',
    createTime: '2026-08-04 18:00:00',
  },
  {
    id: 'mat-007',
    title: '旅行社违规案例警示通报（第一期）',
    categoryId: 'cat-case',
    level: 'departmental',
    mediaType: 'audio',
    summary: '通报上半年查处的旅行社违规典型案例及处罚情况，供全省旅行社警示学习。',
    audioUrl: MOCK_TRAINING_AUDIO_URL,
    audioDuration: 328,
    attachments: [],
    source: '贵州省文化和旅游厅',
    isPublicToAgency: true,
    status: 'offline',
    isTop: false,
    viewCount: 96,
    publishTime: '2026-07-15 10:00:00',
    createBy: '陈华',
    createTime: '2026-07-14 16:00:00',
    updateBy: '陈华',
    updateTime: '2026-08-01 09:30:00',
  },
  {
    id: 'mat-008',
    title: '突发旅游安全事故应急处置流程',
    categoryId: 'cat-safety',
    level: 'departmental',
    mediaType: 'rich_text',
    summary: '交通事故、自然灾害、游客突发疾病等场景的应急处置流程与报告时限要求。',
    content: `<h3>一、总体要求</h3>
<p>坚持"先救人、后处置"，第一时间组织救援并向属地文旅部门和应急管理部门报告。</p>
<h3>二、处置流程</h3>
<ul>
<li>事发后<b>30分钟内</b>电话报告属地文旅部门，<b>1小时内</b>书面报告初步情况；</li>
<li>组织游客撤离危险区域，配合医疗、消防部门开展救助；</li>
<li>妥善安置滞留游客，做好食宿与行程调整；</li>
<li>保存现场影像、名单等证据材料，配合调查。</li>
</ul>`,
    attachments: [],
    source: '贵州省文化和旅游厅',
    isPublicToAgency: true,
    status: 'draft',
    isTop: false,
    viewCount: 0,
    createBy: '管理员',
    createTime: '2026-08-22 15:40:00',
  },
  {
    id: 'mat-009',
    title: '入境旅游服务英语情景对话（一）',
    categoryId: 'cat-service',
    level: 'provincial',
    mediaType: 'video',
    summary: '机场接机、酒店入住、景区讲解三个高频场景的服务英语示范。',
    videoUrl: MOCK_TRAINING_VIDEO_URL,
    videoDuration: 1980,
    attachments: [],
    source: '贵州省文化和旅游厅',
    isPublicToAgency: false, // 演示：未公开资料对旅行社（涉旅企业）角色不可见
    status: 'published',
    isTop: false,
    viewCount: 87,
    publishTime: '2026-08-10 11:00:00',
    createBy: '管理员',
    createTime: '2026-08-09 20:10:00',
  },
]
