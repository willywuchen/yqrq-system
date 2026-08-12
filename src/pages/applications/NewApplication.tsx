import { Card, Row, Col, Typography, Tag, Button, Space, Alert, Divider } from 'antd'
import { ArrowRightOutlined, InfoCircleOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import { RewardRules } from '../../mock/data'
import {
  CategoryToMajor,
  NewRewardCategories,
  POLICY_CONSTANTS,
  RequiresPreCheck,
  RewardCategoryLabels,
  RewardMajorLabels,
  type RewardCategory,
  type RewardMajor,
} from '../../types'
import { useStore } from '../../store'
import { checkCategoryMutex, checkTimesLimit } from '../../utils/validators'

const { Text } = Typography

// 大类信息
const MajorInfo: Record<RewardMajor, { icon: string; color: string; desc: string }> = {
  team_reception: {
    icon: '🤝',
    color: 'gold',
    desc: '组织境外游客来黔旅游，按目标协议分档奖励，每月预拨、年度清算。',
  },
  special_tourism: {
    icon: '✈️',
    color: 'green',
    desc: '航空、一程多站、240小时过境免签、高铁、境外大型团队 5 项专项奖励。',
  },
  culture_promotion: {
    icon: '🌏',
    color: 'purple',
    desc: '参展推广、请进来、入境旅游宣传、交流合作 4 项文旅宣传交流奖励。',
  },
}

export default function NewApplication() {
  const navigate = useNavigate()
  const { applications, currentUser } = useStore()

  // 检查每个类别的可申报状态
  const categoryStatus = useMemo(() => {
    const result: Record<string, { disabled: boolean; reason?: string }> = {}
    NewRewardCategories.forEach((cat) => {
      const mutex = checkCategoryMutex(cat, applications)
      if (!mutex.ok) {
        result[cat] = { disabled: true, reason: mutex.reason }
        return
      }
      const times = checkTimesLimit(cat, applications)
      if (!times.ok) {
        result[cat] = { disabled: true, reason: times.reason }
        return
      }
      result[cat] = { disabled: false }
    })
    return result
  }, [applications])

  // 按大类分组
  const groupedCategories = useMemo(() => {
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

  return (
    <>
      <PageHeader
        title="新建申报"
        breadcrumb={[
          { title: '首页', path: '/' },
          { title: '我的申报', path: '/applications' },
          { title: '新建申报' },
        ]}
      />
      <PageContainer>
        <Alert
          type="warning"
          showIcon
          icon={<InfoCircleOutlined />}
          message="政策申报规则提示"
          description={
            <div>
              <div>1. 政策第八条规定：企业只能选择一项进行申报，三大类奖项互斥；</div>
              <div>2. 政策第十一条规定：专项奖励一次只能选择其中一项奖项申报；</div>
              <div>3. 行程结束后 {POLICY_CONSTANTS.submitAfterTravelDays} 天内提交申请，最终截止日 {POLICY_CONSTANTS.finalDeadline}；</div>
              <div>4. 文旅宣传交流奖励均需前置审核（活动前提交方案/预算/预期目标）。</div>
            </div>
          }
          style={{ marginBottom: 16 }}
        />

        {(['team_reception', 'special_tourism', 'culture_promotion'] as RewardMajor[]).map((major) => {
          const info = MajorInfo[major]
          const cats = groupedCategories[major]
          if (cats.length === 0) return null
          return (
            <div key={major} style={{ marginBottom: 24 }}>
              <Card
                size="small"
                style={{ marginBottom: 12, background: '#fafafa' }}
                title={
                  <Space>
                    <span style={{ fontSize: 20 }}>{info.icon}</span>
                    <Text strong>{RewardMajorLabels[major]}</Text>
                    <Tag color={info.color}>{cats.length} 个子项</Tag>
                  </Space>
                }
              >
                <Text type="secondary">{info.desc}</Text>
              </Card>

              <Row gutter={[16, 16]}>
                {cats.map((cat) => {
                  const rule = RewardRules[cat]
                  if (!rule) return null
                  const status = categoryStatus[cat] || { disabled: false }
                  return (
                    <Col xs={24} sm={12} lg={8} key={cat}>
                      <Card
                        hoverable={!status.disabled}
                        style={{ height: '100%', opacity: status.disabled ? 0.55 : 1 }}
                        styles={{ body: { padding: 20, height: '100%', display: 'flex', flexDirection: 'column' } }}
                        onClick={() => !status.disabled && navigate(`/applications/new/${cat}`)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <Typography.Title level={5} style={{ margin: 0, flex: 1 }}>
                            {rule.title}
                          </Typography.Title>
                          {RequiresPreCheck.includes(cat) && (
                            <Tag color="magenta">需前置审核</Tag>
                          )}
                          {status.disabled && (
                            <Tag color="red" icon={<LockOutlined />}>不可申报</Tag>
                          )}
                        </div>
                        <Tag color="blue" style={{ alignSelf: 'flex-start', marginBottom: 12 }}>
                          {RewardCategoryLabels[cat]}
                        </Tag>

                        <Text type="secondary" style={{ display: 'block', marginBottom: 12, minHeight: 44, fontSize: 12 }}>
                          {rule.desc}
                        </Text>

                        {/* 奖励标准展示 */}
                        {rule.tiers && rule.tiers.length > 0 && (
                          <div style={{ marginBottom: 12 }}>
                            <Text strong style={{ fontSize: 12 }}>奖励标准（分档）：</Text>
                            <div style={{ marginTop: 4 }}>
                              {rule.tiers.slice(0, 3).map((t, i) => (
                                <Tag key={i} style={{ marginBottom: 4 }} color="orange">
                                  {t.label} · {t.perPerson}元/人次
                                </Tag>
                              ))}
                              {rule.tiers.length > 3 && (
                                <Tag style={{ marginBottom: 4 }}>共 {rule.tiers.length} 档</Tag>
                              )}
                            </div>
                          </div>
                        )}
                        {rule.perPerson && (
                          <div style={{ marginBottom: 12 }}>
                            <Text strong style={{ fontSize: 12 }}>奖励标准：</Text>
                            <Tag color="orange" style={{ marginLeft: 4 }}>{rule.perPerson} 元/人次</Tag>
                          </div>
                        )}
                        {rule.ratio && (
                          <div style={{ marginBottom: 12 }}>
                            <Text strong style={{ fontSize: 12 }}>奖励比例：</Text>
                            <Tag color="orange" style={{ marginLeft: 4 }}>
                              {rule.ratio * 100}%{rule.maxPerTime ? `，单次≤${rule.maxPerTime.toLocaleString()}元` : ''}
                            </Tag>
                          </div>
                        )}

                        {/* 次数限制 */}
                        {rule.maxPerYear && (
                          <div style={{ marginBottom: 12 }}>
                            <Tag color="red">每年≤{rule.maxPerYear}次</Tag>
                          </div>
                        )}

                        {/* 政策依据 */}
                        <div style={{ marginBottom: 12 }}>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            依据：{rule.policyRef}
                          </Text>
                        </div>

                        {/* 申报要点 */}
                        {rule.tips && rule.tips.length > 0 && (
                          <div style={{ marginBottom: 12, background: '#f6f6f6', padding: 8, borderRadius: 4 }}>
                            <Text strong style={{ fontSize: 11 }}>申报要点：</Text>
                            <ul style={{ margin: '4px 0 0 0', paddingLeft: 16, fontSize: 11, color: '#666' }}>
                              {rule.tips.slice(0, 3).map((t, i) => (
                                <li key={i}>{t}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* 不可申报原因 */}
                        {status.disabled && status.reason && (
                          <Alert
                            type="error"
                            showIcon
                            message={status.reason}
                            style={{ marginBottom: 12, fontSize: 12 }}
                          />
                        )}

                        <Divider style={{ margin: '8px 0' }} />

                        <div style={{ marginTop: 'auto', textAlign: 'right' }}>
                          <Button
                            type="primary"
                            ghost
                            icon={<ArrowRightOutlined />}
                            iconPosition="end"
                            disabled={status.disabled}
                          >
                            选择申报
                          </Button>
                        </div>
                      </Card>
                    </Col>
                  )
                })}
              </Row>
            </div>
          )
        })}

        {/* 当前用户提示 */}
        <Card size="small" style={{ marginTop: 16, background: '#e6f4ff', border: '1px solid #91caff' }}>
          <Space>
            <InfoCircleOutlined style={{ color: '#1677ff' }} />
            <Text>
              当前申报单位：<Text strong>{currentUser.org || '未知旅行社'}</Text>
              ，请确认申报单位信息正确后再选择奖励类别。
            </Text>
          </Space>
        </Card>
      </PageContainer>
    </>
  )
}
