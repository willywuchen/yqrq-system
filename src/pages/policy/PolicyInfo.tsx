import { useMemo, useState } from 'react'
import {
  Card,
  Row,
  Col,
  Typography,
  Tag,
  Table,
  Tabs,
  Alert,
  Space,
  Divider,
  Collapse,
  Input,
  Empty,
} from 'antd'
import {
  InfoCircleOutlined,
  SearchOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import {
  NewRewardCategories,
  POLICY_CONSTANTS,
  RequiresPreCheck,
  RewardCategoryLabels,
  RewardMajorLabels,
  CategoryToMajor,
  type RewardCategory,
  type RewardMajor,
} from '../../types'
import {
  RewardRules,
  getAllMaterials,
  BaseMaterials,
  PreCheckMaterials,
} from '../../mock/data'

const { Text, Title, Paragraph } = Typography

// 材料清单列（外部使用）
const materialColumns = [
  {
    title: '分组',
    dataIndex: 'group',
    width: 180,
    render: (g: string) => <Tag color="blue">{g}</Tag>,
  },
  { title: '材料名称', dataIndex: 'name' },
  {
    title: '必传',
    dataIndex: 'required',
    width: 80,
    render: (r: boolean) => (r ? <Tag color="red">必传</Tag> : <Tag>选传</Tag>),
  },
  {
    title: '说明',
    dataIndex: 'desc',
    width: 240,
    render: (d?: string) => (d ? <Text type="secondary" style={{ fontSize: 12 }}>{d}</Text> : '-'),
  },
]


// 大类信息
const MajorInfo: Record<RewardMajor, { icon: string; color: string; policyRef: string }> = {
  team_reception: { icon: '🤝', color: 'gold', policyRef: '第十条' },
  special_tourism: { icon: '✈️', color: 'green', policyRef: '第十一条' },
  culture_promotion: { icon: '🌏', color: 'purple', policyRef: '第十二条' },
}

export default function PolicyInfo() {
  const [activeMajor, setActiveMajor] = useState<RewardMajor | 'all'>('all')
  const [keyword, setKeyword] = useState('')

  // 按大类分组的奖励规则
  const groupedRules = useMemo(() => {
    const groups: Record<RewardMajor, RewardCategory[]> = {
      team_reception: [],
      special_tourism: [],
      culture_promotion: [],
    }
    NewRewardCategories.forEach((cat) => {
      const major = CategoryToMajor[cat]
      if (major) groups[major].push(cat)
    })
    return groups
  }, [])

  // 关键词过滤
  const filteredCategories = useMemo(() => {
    if (!keyword) return NewRewardCategories
    const kw = keyword.toLowerCase()
    return NewRewardCategories.filter((cat) => {
      const rule = RewardRules[cat]
      if (!rule) return false
      return (
        cat.toLowerCase().includes(kw) ||
        RewardCategoryLabels[cat].toLowerCase().includes(kw) ||
        rule.title.toLowerCase().includes(kw) ||
        rule.desc.toLowerCase().includes(kw) ||
        (rule.tips || []).some((t) => t.toLowerCase().includes(kw))
      )
    })
  }, [keyword])

  // 材料清单列（使用模块顶部的 materialColumns）

  return (
    <>
      <PageHeader
        title="政策信息"
        breadcrumb={[
          { title: '首页', path: '/' },
          { title: '政策信息' },
        ]}
      />
      <PageContainer>
        {/* 政策概览 */}
        <Card style={{ marginBottom: 16, background: '#e6f4ff', border: '1px solid #91caff' }}>
          <Row gutter={24}>
            <Col flex="auto">
              <Space direction="vertical" size="small">
                <Title level={5} style={{ margin: 0 }}>
                  <InfoCircleOutlined style={{ marginRight: 8, color: '#1677ff' }} />
                  2026年贵州省入境「引客入黔」奖励办法
                </Title>
                <Text type="secondary">
                  政策三大类奖项互斥，企业只能选择一项申报；专项奖励内部单项互斥；文旅宣传交流奖励均需前置审核。
                </Text>
              </Space>
            </Col>
            <Col>
              <Space direction="vertical" size="small" align="end">
                <Tag color="orange">最终截止：{POLICY_CONSTANTS.finalDeadline}</Tag>
                <Tag color="blue">行程结束后 {POLICY_CONSTANTS.submitAfterTravelDays} 天内提交</Tag>
              </Space>
            </Col>
          </Row>
        </Card>

        <Tabs
          defaultActiveKey="rules"
          items={[
            {
              key: 'rules',
              label: '奖励规则',
              children: <RulesTab groupedRules={groupedRules} activeMajor={activeMajor} setActiveMajor={setActiveMajor} keyword={keyword} setKeyword={setKeyword} filteredCategories={filteredCategories} />,
            },
            {
              key: 'materials',
              label: '材料清单',
              children: <MaterialsTab />,
            },
            {
              key: 'process',
              label: '申报流程',
              children: <ProcessTab />,
            },
            {
              key: 'tips',
              label: '常见问题',
              children: <TipsTab />,
            },
          ]}
        />
      </PageContainer>
    </>
  )
}

// ========== 奖励规则 Tab ==========
function RulesTab({
  groupedRules,
  activeMajor,
  setActiveMajor,
  keyword,
  setKeyword,
  filteredCategories,
}: {
  groupedRules: Record<RewardMajor, RewardCategory[]>
  activeMajor: RewardMajor | 'all'
  setActiveMajor: (v: RewardMajor | 'all') => void
  keyword: string
  setKeyword: (v: string) => void
  filteredCategories: RewardCategory[]
}) {
  return (
    <>
      {/* 关键政策提示 */}
      <Alert
        type="warning"
        showIcon
        icon={<WarningOutlined />}
        message="互斥规则提示"
        description={
          <div>
            <div>1. 政策第八条：企业只能选择一项进行申报，三大类奖项互斥；</div>
            <div>2. 政策第十一条：专项奖励一次只能选择其中一项奖项申报（5个子项互斥）；</div>
            <div>3. 政策第十二条：文旅宣传交流奖励均需前置审核（活动前提交方案/预算/预期目标）。</div>
          </div>
        }
        style={{ marginBottom: 16 }}
      />

      {/* 大类筛选 */}
      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="搜索奖励类别/关键词"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          style={{ width: 240 }}
          prefix={<SearchOutlined />}
          allowClear
        />
        <Tag
          style={{ cursor: 'pointer', padding: '4px 12px' }}
          color={activeMajor === 'all' ? 'blue' : 'default'}
          onClick={() => setActiveMajor('all')}
        >
          全部
        </Tag>
        {(['team_reception', 'special_tourism', 'culture_promotion'] as RewardMajor[]).map((m) => (
          <Tag
            key={m}
            style={{ cursor: 'pointer', padding: '4px 12px' }}
            color={activeMajor === m ? MajorInfo[m].color : 'default'}
            onClick={() => setActiveMajor(m)}
          >
            {MajorInfo[m].icon} {RewardMajorLabels[m]}
          </Tag>
        ))}
      </Space>

      {/* 按大类展示规则 */}
      {(['team_reception', 'special_tourism', 'culture_promotion'] as RewardMajor[]).map((major) => {
        if (activeMajor !== 'all' && activeMajor !== major) return null
        const cats = groupedRules[major].filter((c) => filteredCategories.includes(c))
        if (cats.length === 0) return null
        const info = MajorInfo[major]
        return (
          <div key={major} style={{ marginBottom: 24 }}>
            <Card
              size="small"
              style={{ marginBottom: 12, background: '#fafafa' }}
              title={
                <Space>
                  <span style={{ fontSize: 20 }}>{info.icon}</span>
                  <Text strong>{RewardMajorLabels[major]}</Text>
                  <Tag color={info.color}>政策{info.policyRef}</Tag>
                  <Tag>{cats.length} 个子项</Tag>
                </Space>
              }
            >
              <Text type="secondary">{RewardRules[cats[0]]?.desc}</Text>
            </Card>

            <Row gutter={[16, 16]}>
              {cats.map((cat) => {
                const rule = RewardRules[cat]
                if (!rule) return null
                return (
                  <Col xs={24} lg={12} key={cat}>
                    <Card size="small" title={
                      <Space>
                        <Text strong>{rule.title}</Text>
                        {RequiresPreCheck.includes(cat) && <Tag color="magenta">需前置审核</Tag>}
                        {rule.maxPerYear && <Tag color="red">每年≤{rule.maxPerYear}次</Tag>}
                      </Space>
                    }>
                      <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 8 }}>
                        {rule.desc}
                      </Paragraph>

                      <Text type="secondary" style={{ fontSize: 11 }}>政策依据：</Text>
                      <Tag color="blue" style={{ marginBottom: 8 }}>{rule.policyRef}</Tag>

                      {/* 奖励标准 */}
                      {rule.tiers && rule.tiers.length > 0 && (
                        <div style={{ marginBottom: 8 }}>
                          <Text strong style={{ fontSize: 12 }}>奖励标准（分档）：</Text>
                          <div style={{ marginTop: 4 }}>
                            {rule.tiers.map((t, i) => (
                              <Tag key={i} color="orange" style={{ marginBottom: 4 }}>
                                {t.label} · {t.perPerson}元/人次
                                {t.minNights ? ` · ≥${t.minNights}晚` : ''}
                              </Tag>
                            ))}
                          </div>
                        </div>
                      )}
                      {rule.perPerson && (
                        <div style={{ marginBottom: 8 }}>
                          <Text strong style={{ fontSize: 12 }}>奖励标准：</Text>
                          <Tag color="orange" style={{ marginLeft: 4 }}>{rule.perPerson} 元/人次</Tag>
                        </div>
                      )}
                      {rule.ratio && (
                        <div style={{ marginBottom: 8 }}>
                          <Text strong style={{ fontSize: 12 }}>奖励比例：</Text>
                          <Tag color="orange" style={{ marginLeft: 4 }}>
                            {rule.ratio * 100}%{rule.maxPerTime ? `，单次≤${rule.maxPerTime.toLocaleString()}元` : ''}
                          </Tag>
                        </div>
                      )}

                      {/* 申报要点 */}
                      {rule.tips && rule.tips.length > 0 && (
                        <div>
                          <Text strong style={{ fontSize: 12 }}>申报要点：</Text>
                          <ul style={{ margin: '4px 0 0 0', paddingLeft: 18, fontSize: 12, color: '#666' }}>
                            {rule.tips.map((t, i) => (
                              <li key={i} style={{ marginBottom: 2 }}>{t}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </Card>
                  </Col>
                )
              })}
            </Row>
          </div>
        )
      })}

      {filteredCategories.length === 0 && (
        <Empty description="未找到符合条件的奖励类别" />
      )}
    </>
  )
}

// ========== 材料清单 Tab ==========
function MaterialsTab() {
  const [selectedCategory, setSelectedCategory] = useState<RewardCategory>('team_reception')
  const materials = useMemo(() => getAllMaterials(selectedCategory), [selectedCategory])

  return (
    <>
      <Alert
        type="info"
        showIcon
        message="材料清单说明"
        description="根据政策附件2《2026年贵州省入境「引客入黔」奖励申报细则》整理。基础材料为每次申报必传；其他材料按申报类别有所不同。"
        style={{ marginBottom: 16 }}
      />

      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Text strong>选择奖励类别查看材料清单：</Text>
          {NewRewardCategories.map((cat) => (
            <Tag
              key={cat}
              style={{ cursor: 'pointer', padding: '4px 8px' }}
              color={selectedCategory === cat ? 'blue' : 'default'}
              onClick={() => setSelectedCategory(cat)}
            >
              {RewardCategoryLabels[cat]}
            </Tag>
          ))}
        </Space>
      </Card>

      <Card title={`「${RewardCategoryLabels[selectedCategory]}」材料清单`} size="small">
        <Table
          dataSource={materials}
          rowKey={(r) => r.group + r.name}
          size="small"
          pagination={false}
          columns={[
            {
              title: '分组',
              dataIndex: 'group',
              width: 180,
              render: (g: string) => <Tag color="blue">{g}</Tag>,
            },
            { title: '材料名称', dataIndex: 'name' },
            {
              title: '必传',
              dataIndex: 'required',
              width: 80,
              render: (r: boolean) => (r ? <Tag color="red">必传</Tag> : <Tag>选传</Tag>),
            },
            {
              title: '说明',
              dataIndex: 'desc',
              width: 240,
              render: (d?: string) => (d ? <Text type="secondary" style={{ fontSize: 12 }}>{d}</Text> : '-'),
            },
          ]}
        />
      </Card>

      {/* 基础材料单独说明 */}
      <Card title="基础材料（所有类别通用）" size="small" style={{ marginTop: 16 }}>
        <Alert
          type="warning"
          showIcon
          message="基础材料每次申报必传"
          description="以下材料每次申报均需提交，其中：营业执照、旅行社业务经营许可证、法定代表人身份证可在「企业资质档案」中预存后调用；完税凭证和「信用中国」查询截图需每次申报当日上传。"
          style={{ marginBottom: 12 }}
        />
        <Table
          dataSource={BaseMaterials}
          rowKey="name"
          size="small"
          pagination={false}
          columns={materialColumns}
        />
      </Card>

      {/* 前置审核材料 */}
      <Card title="前置审核材料（文旅宣传交流奖励专用）" size="small" style={{ marginTop: 16 }}>
        <Alert
          type="info"
          showIcon
          message="前置审核流程"
          description="文旅宣传交流奖励均需遵循前置审核原则：活动前提交方案/预算/预期目标；活动结束后提交活动报告/活动效果及证明材料。"
          style={{ marginBottom: 12 }}
        />
        <Table
          dataSource={PreCheckMaterials}
          rowKey="name"
          size="small"
          pagination={false}
          columns={materialColumns}
        />
      </Card>
    </>
  )
}

// ========== 申报流程 Tab ==========
function ProcessTab() {
  return (
    <>
      <Card title="申报流程总览" size="small" style={{ marginBottom: 16 }}>
        <Alert
          type="info"
          showIcon
          message="申报总流程"
          description="旅行社申报 → 初审（区县文旅局）→ 复审（市州文旅局）→ 终审（省文旅厅）→ 公示 → 资金拨付 → 归档。文旅宣传交流奖励增加前置审核环节。"
          style={{ marginBottom: 16 }}
        />

        <Collapse
          defaultActiveKey={['1']}
          items={[
            {
              key: '1',
              label: '一、申报前准备',
              children: (
                <ol style={{ paddingLeft: 18, lineHeight: 2 }}>
                  <li>注册并登录「引客入黔」奖励申报系统；</li>
                  <li>在「企业资质档案」中预存营业执照、旅行社业务经营许可证、法定代表人身份证；</li>
                  <li>确认拟申报的奖励类别（注意三大类互斥规则）；</li>
                  <li>文旅宣传交流奖励需提前向省文旅厅报备活动方案、预算、预期目标；</li>
                  <li>团队接待奖励需与省文旅厅签订目标协议书。</li>
                </ol>
              ),
            },
            {
              key: '2',
              label: '二、活动/行程实施',
              children: (
                <ol style={{ paddingLeft: 18, lineHeight: 2 }}>
                  <li>按计划组织游客入黔旅游或开展文旅宣传活动；</li>
                  <li>通过「贵州文化和旅游市场监管执法平台」输出电子行程单（含派团单号）；</li>
                  <li>收集游客名单、住宿证明（加盖酒店公章）、景区证明（加盖景区公章）；</li>
                  <li>准备接待计划书（含导游、司机本人签名）；</li>
                  <li>文旅宣传类活动结束后编写活动报告、效果及证明材料。</li>
                </ol>
              ),
            },
            {
              key: '3',
              label: '三、提交申报（行程结束后45天内）',
              children: (
                <ol style={{ paddingLeft: 18, lineHeight: 2 }}>
                  <li>登录系统，选择「新建申报」；</li>
                  <li>系统自动校验互斥规则与次数限制；</li>
                  <li>填写申报信息、团队/行程信息、游客名单、景区/住宿/导游信息；</li>
                  <li>上传基础材料（含当日完税凭证、「信用中国」查询截图）；</li>
                  <li>上传各类别专属佐证材料；</li>
                  <li>确认材料清单完整后提交申报。</li>
                </ol>
              ),
            },
            {
              key: '4',
              label: '四、审核流程',
              children: (
                <ol style={{ paddingLeft: 18, lineHeight: 2 }}>
                  <li><Text strong>前置审核</Text>（文旅宣传类专用）：省文旅厅审核活动方案、预算、预期目标，通过后进入正式申报流程；</li>
                  <li><Text strong>初审</Text>（区县文旅局）：审核材料完整性、真实性；</li>
                  <li><Text strong>复审</Text>（市州文旅局）：复核申报内容；</li>
                  <li><Text strong>终审</Text>（省文旅厅）：核定奖励金额；</li>
                  <li><Text strong>公示</Text>：通过审核的申报进行公示；</li>
                  <li><Text strong>资金拨付</Text>：公示无异议后拨付奖励资金。</li>
                </ol>
              ),
            },
            {
              key: '5',
              label: '五、注意事项',
              children: (
                <ul style={{ paddingLeft: 18, lineHeight: 2 }}>
                  <li>申报最终截止日期：<Text strong color="red">{POLICY_CONSTANTS.finalDeadline}</Text>；</li>
                  <li>行程结束后 <Text strong>{POLICY_CONSTANTS.submitAfterTravelDays}</Text> 天内提交申请，逾期视为自动放弃；</li>
                  <li>请进来奖励每年不超过 <Text strong>{POLICY_CONSTANTS.inviteInMaxPerYear}</Text> 次；</li>
                  <li>交流合作奖励每年不超过 <Text strong>{POLICY_CONSTANTS.exchangeMaxPerYear}</Text> 次；</li>
                  <li>团队接待奖励：入境游客需 <Text strong>{POLICY_CONSTANTS.teamReceptionMinSize}</Text> 人（含）以上；</li>
                  <li>境外大型团队：东南亚 <Text strong>{POLICY_CONSTANTS.largeTeamSEA}</Text> 人+ 或 东南亚以外 <Text strong>{POLICY_CONSTANTS.largeTeamNonSEA}</Text> 人+；</li>
                  <li>至少 <Text strong>{POLICY_CONSTANTS.minScenicCount}</Text> 个 4A+ 景区。</li>
                </ul>
              ),
            },
          ]}
        />
      </Card>

      <Card title="互斥规则图示" size="small">
        <Row gutter={16}>
          <Col span={8}>
            <Card size="small" style={{ background: '#fffbe6', border: '1px solid #ffe58f' }}>
              <Title level={5}>🤝 入境旅游团队接待奖励</Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                第十条 · 与专项旅游奖励互斥
              </Text>
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" style={{ background: '#f6ffed', border: '1px solid #b7eb8f' }}>
              <Title level={5}>✈️ 专项旅游奖励（5项）</Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                第十一条 · 5个子项内部互斥，与团队接待奖励互斥
              </Text>
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" style={{ background: '#f9f0ff', border: '1px solid #d3adf7' }}>
              <Title level={5}>🌏 文旅宣传交流奖励（4项）</Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                第十二条 · 需前置审核，与其他两大类互斥
              </Text>
            </Card>
          </Col>
        </Row>
        <Divider />
        <Alert
          type="error"
          showIcon
          message="核心规则"
          description="同一企业同一年度，只能选择三大类奖项中的一项进行申报；专项奖励内部5个子项也只能选择一项申报。"
        />
      </Card>
    </>
  )
}

// ========== 常见问题 Tab ==========
function TipsTab() {
  const faqs = [
    {
      q: '各类补贴是否可以一并申报？',
      a: '不可以。政策采用「互斥 + 一团一申请」设计：三大类奖项互斥，专项奖励内部5个子项也互斥。同一企业同一年度只能选择一项申报。一团一申请指乘坐同一航班或高铁等同一时间抵离贵州且行程和住宿一致的视为同一团组，不可拆分申报。',
    },
    {
      q: '申报截止日期是什么时候？',
      a: `行程结束后 ${POLICY_CONSTANTS.submitAfterTravelDays} 天内提交申请；所有申报材料递交最终截止时间为 ${POLICY_CONSTANTS.finalDeadline}。逾期将被视为自动放弃奖励。`,
    },
    {
      q: '单独提交申报会增加旅行社操作负担吗？',
      a: '政策要求「一团一申请」确实会增加操作步骤，但系统已通过以下方式缓解：①互斥校验前置（选择类别时即提示）；②企业资质档案预存基础材料；③团组信息复用；④游客名单、景区、住宿等结构化录入；⑤必传材料清单核对，避免反复修改。',
    },
    {
      q: '文旅宣传交流奖励的前置审核流程是什么？',
      a: '文旅宣传交流奖励均需遵循前置审核原则：①活动开始前提交活动方案、预算、预期目标至省文旅厅；②省文旅厅审核通过后批复；③活动实施；④活动结束后提交活动报告、活动效果及证明材料；⑤省文旅厅根据审核要求批复后正式申报。',
    },
    {
      q: '团队接待奖励的目标协议是什么？',
      a: '团队接待奖励须与省文旅厅签订目标协议书，按目标协议分档奖励。1-11月每月预拨，次年1月30日前加上12月数据进行年度评估。未达目标档次50%的不获得奖励；达50%-100%的按30%×实际人次奖励。',
    },
    {
      q: '「信用中国」查询截图需要什么时间点的？',
      a: `政策附件2要求「信用中国」网站查询截图的查询时点为提交资料当日。查询网址：${POLICY_CONSTANTS.creditChinaUrl}。请勿使用历史截图，否则将影响申报审核。`,
    },
    {
      q: '请进来奖励和交流合作奖励的次数限制？',
      a: `政策第十二条第二款规定：请进来奖励同一企业每年申请不超过 ${POLICY_CONSTANTS.inviteInMaxPerYear} 次；第十二条第四款规定：交流合作奖励同一企业每年申请不超过 ${POLICY_CONSTANTS.exchangeMaxPerYear} 次。系统会在申报时自动校验次数限制。`,
    },
    {
      q: '游客名单需要包含哪些信息？',
      a: '根据政策附件2要求，游客名单须包含：姓名、证件类型、证件号、国籍/地区、客源地、入住/退房时间、进入景区时间。同时需提供加盖酒店公章的住宿证明和加盖景区公章的景区证明。',
    },
    {
      q: '电子行程单和派团单号是什么？',
      a: '电子行程单由「贵州文化和旅游市场监管执法平台」输出，包含派团单号和游客名单。申报时需录入派团单号关联电子行程单，作为接待情况的必备佐证材料。',
    },
    {
      q: '景区数量有什么要求？',
      a: `除240小时过境免签旅游（至少1个4A+景区）和境外大型团队（至少1个4A+景区）外，其他团队/专项奖励均要求至少 ${POLICY_CONSTANTS.minScenicCount} 个 4A（含）以上景区。需提供加盖景区公章或景区销售部门公章的旅客名单（含进入景区时间）。`,
    },
  ]

  return (
    <Card title="常见问题" size="small">
      <Collapse
        items={faqs.map((faq, i) => ({
          key: String(i),
          label: (
            <Space>
              <Tag color="blue">Q{i + 1}</Tag>
              <Text strong>{faq.q}</Text>
            </Space>
          ),
          children: (
            <div style={{ padding: '8px 0' }}>
              <Space align="start">
                <Tag color="green">解答</Tag>
                <Text>{faq.a}</Text>
              </Space>
            </div>
          ),
        }))}
      />
    </Card>
  )
}

// 材料清单列（外部使用）
