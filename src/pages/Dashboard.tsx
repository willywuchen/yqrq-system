import { Card, Row, Col, Statistic, Typography, Space, Tag, List, Button, Alert, Divider, Progress } from 'antd'
import {
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  ArrowRightOutlined,
  BellOutlined,
  CalendarOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import PageHeader, { PageContainer } from '../components/PageHeader'
import { useStore } from '../store'
import {
  RewardCategoryLabels,
  StatusLabels,
  StatusColors,
  UserRoleLabels,
} from '../types'
import { formatMoney } from '../utils'
import { BUDGET_TOTAL } from '../mock/data'

const { Text } = Typography

export default function Dashboard() {
  const navigate = useNavigate()
  const { applications, currentUser, messages } = useStore()

  // 申请人看自己，其他角色看全部
  const myApps =
    currentUser.role === 'applicant'
      ? applications.filter((a) => a.applicantOrg === currentUser.org)
      : applications

  const total = myApps.length
  const pending = myApps.filter((a) =>
    ['pending_initial', 'pending_review', 'pending_final', 'initialing', 'reviewing', 'finaling'].includes(a.status),
  ).length
  const approved = myApps.filter((a) => ['paid', 'publicizing', 'pending_payment'].includes(a.status)).length
  const totalAmount = myApps.reduce((s, a) => s + (a.approvedAmount || a.calculatedAmount || 0), 0)
  const paidAmount = myApps.filter((a) => a.status === 'paid').reduce((s, a) => s + (a.approvedAmount || 0), 0)

  const unreadMessages = messages.filter((m) => !m.read)
  const recentApps = [...myApps].sort((a, b) => (b.updateTime || '').localeCompare(a.updateTime || '')).slice(0, 5)

  // 审核员待办数
  const todoCount =
    currentUser.role === 'initial_reviewer'
      ? applications.filter((a) => a.status === 'pending_initial').length
      : currentUser.role === 'review_reviewer'
      ? applications.filter((a) => a.status === 'pending_review').length
      : currentUser.role === 'final_reviewer'
      ? applications.filter((a) => a.status === 'pending_final').length
      : 0

  return (
    <>
      <PageHeader
        title="工作台"
        breadcrumb={[{ title: '首页', path: '/' }, { title: '工作台' }]}
      />
      <PageContainer>
        <Alert
          type="info"
          showIcon
          message={`欢迎您，${currentUser.name}（${UserRoleLabels[currentUser.role]}）`}
          description={
            <Space>
              <Tag color="blue" icon={<CalendarOutlined />}>2026 年度申报</Tag>
              <Text type="secondary">本年度申报截止日期：2027-01-31</Text>
            </Space>
          }
          style={{ marginBottom: 16 }}
        />

        {/* 指标卡 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card hoverable onClick={() => navigate('/applications')}>
              <Statistic
                title="申报总数"
                value={total}
                suffix="项"
                prefix={<FileTextOutlined />}
                valueStyle={{ color: '#1677ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card hoverable onClick={() => navigate('/applications')}>
              <Statistic
                title="审核中"
                value={pending}
                suffix="项"
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card hoverable onClick={() => navigate('/applications')}>
              <Statistic
                title="已通过"
                value={approved}
                suffix="项"
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card hoverable onClick={() => navigate('/applications')}>
              <Statistic
                title="奖励金额"
                value={totalAmount}
                prefix={<DollarOutlined />}
                precision={2}
                valueStyle={{ color: '#fa541c' }}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={16}>
          {/* 左侧 - 最近申报 */}
          <Col span={16}>
            <Card
              title="最近申报"
              size="small"
              extra={
                <Button type="link" onClick={() => navigate('/applications')}>
                  查看全部 <ArrowRightOutlined />
                </Button>
              }
              style={{ marginBottom: 16 }}
            >
              <List
                dataSource={recentApps}
                locale={{ emptyText: '暂无申报记录' }}
                renderItem={(a) => (
                  <List.Item
                    actions={[
                      <Button type="link" size="small" onClick={() => navigate(`/applications/${a.id}`)}>
                        查看
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <Space>
                          <Text strong>{a.id}</Text>
                          <Tag color="blue">{RewardCategoryLabels[a.category]}</Tag>
                          <Tag color={StatusColors[a.status]}>{StatusLabels[a.status]}</Tag>
                        </Space>
                      }
                      description={
                        <Space split={<Divider type="vertical" />}>
                          <Text type="secondary">{a.applicantOrg}</Text>
                          <Text type="secondary">{a.teamName || a.meetingName || '-'}</Text>
                          {a.calculatedAmount ? (
                            <Text style={{ color: '#fa541c' }}>{formatMoney(a.calculatedAmount)}</Text>
                          ) : null}
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {a.updateTime}
                          </Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>

            {/* 审核员待办 */}
            {(currentUser.role === 'initial_reviewer' ||
              currentUser.role === 'review_reviewer' ||
              currentUser.role === 'final_reviewer') && (
              <Card
                title="待办任务"
                size="small"
                extra={
                  <Button type="link" onClick={() => navigate('/audit/todo')}>
                    去处理 <ArrowRightOutlined />
                  </Button>
                }
              >
                <div style={{ textAlign: 'center', padding: 24 }}>
                  <Statistic
                    title="待审核任务"
                    value={todoCount}
                    suffix="项"
                    valueStyle={{ color: todoCount > 0 ? '#fa541c' : '#52c41a', fontSize: 36 }}
                  />
                  {todoCount > 0 ? (
                    <Text type="secondary">您有 {todoCount} 项申报待审核，请尽快处理</Text>
                  ) : (
                    <Text type="secondary">暂无待办任务</Text>
                  )}
                </div>
              </Card>
            )}

            {/* 终审/管理员 - 预算执行 */}
            {(currentUser.role === 'final_reviewer' || currentUser.role === 'admin') && (
              <Card title="预算执行情况" size="small">
                <Statistic
                  title={`年度预算执行率 (预算 ${BUDGET_TOTAL} 万元)`}
                  value={(paidAmount / 10000 / BUDGET_TOTAL) * 100}
                  precision={1}
                  suffix="%"
                  valueStyle={{ color: '#722ed1' }}
                />
                <Progress
                  percent={Number(((paidAmount / 10000 / BUDGET_TOTAL) * 100).toFixed(1))}
                  status="active"
                  style={{ marginTop: 8 }}
                />
                <Row gutter={16} style={{ marginTop: 12 }}>
                  <Col span={8}>
                    <Text type="secondary">已拨付：</Text>
                    <Text strong style={{ color: '#52c41a' }}>{formatMoney(paidAmount)}</Text>
                  </Col>
                  <Col span={8}>
                    <Text type="secondary">待拨付：</Text>
                    <Text strong style={{ color: '#fa8c16' }}>
                      {formatMoney(myApps.filter((a) => a.status === 'pending_payment').reduce((s, a) => s + (a.approvedAmount || 0), 0))}
                    </Text>
                  </Col>
                  <Col span={8}>
                    <Text type="secondary">剩余：</Text>
                    <Text strong>
                      {formatMoney(BUDGET_TOTAL * 10000 - paidAmount)}
                    </Text>
                  </Col>
                </Row>
              </Card>
            )}
          </Col>

          {/* 右侧 - 消息 + 快捷入口 */}
          <Col span={8}>
            <Card
              title={<Space><BellOutlined /> 最新消息</Space>}
              size="small"
              extra={
                <Button type="link" onClick={() => navigate('/messages')}>
                  更多
                </Button>
              }
              style={{ marginBottom: 16 }}
            >
              <List
                dataSource={unreadMessages.slice(0, 4)}
                locale={{ emptyText: '暂无未读消息' }}
                renderItem={(m) => (
                  <List.Item>
                    <List.Item.Meta
                      title={<Text ellipsis style={{ maxWidth: 220 }}>{m.title}</Text>}
                      description={
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {m.createTime}
                        </Text>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>

            {currentUser.role === 'applicant' && (
              <Card title="快捷操作" size="small">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Button
                    type="primary"
                    block
                    icon={<FileTextOutlined />}
                    onClick={() => navigate('/applications/new')}
                  >
                    新建申报
                  </Button>
                  <Button block icon={<FileTextOutlined />} onClick={() => navigate('/applications')}>
                    我的申报
                  </Button>
                  <Button block icon={<BellOutlined />} onClick={() => navigate('/messages')}>
                    消息中心
                  </Button>
                </Space>
              </Card>
            )}
          </Col>
        </Row>
      </PageContainer>
    </>
  )
}
