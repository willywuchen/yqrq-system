import { useMemo, useState } from 'react'
import { Table, Card, Button, Input, Select, Space, Tag, Row, Col, Statistic, Tabs } from 'antd'
import { SearchOutlined, ReloadOutlined, EyeOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import { useStore } from '../../store'
import {
  RewardCategoryLabels,
  StatusLabels,
  StatusColors,
  UserRoleLabels,
  type RewardCategory,
  type ApplicationStatus,
} from '../../types'
import { formatMoney } from '../../utils'

// 各角色可见的状态
const roleStatusMap: Record<string, ApplicationStatus[]> = {
  initial_reviewer: ['pending_initial', 'initialing', 'initial_returned'],
  review_reviewer: ['pending_review', 'reviewing', 'review_returned'],
  final_reviewer: ['pending_final', 'finaling', 'publicizing'],
}

export default function AuditList() {
  const navigate = useNavigate()
  const location = useLocation()
  const { applications, currentUser } = useStore()
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState<RewardCategory | undefined>()

  const isTodo = location.pathname.endsWith('/todo')

  // 各角色待办
  const visibleStatus = roleStatusMap[currentUser.role] || []

  const filtered = useMemo(() => {
    return applications.filter((a) => {
      // 管理员看全部
      if (currentUser.role !== 'admin') {
        if (isTodo) {
          // 仅看待办状态
          const target = visibleStatus[0] // 第一个为待处理状态
          if (a.status !== target) return false
        } else {
          if (!visibleStatus.includes(a.status)) return false
        }
      }
      if (keyword) {
        const kw = keyword.toLowerCase()
        if (
          !a.id.toLowerCase().includes(kw) &&
          !a.applicantOrg.toLowerCase().includes(kw) &&
          !(a.teamName || '').toLowerCase().includes(kw)
        )
          return false
      }
      if (category && a.category !== category) return false
      return true
    })
  }, [applications, currentUser, isTodo, visibleStatus, keyword, category])

  const stats = useMemo(() => {
    const todo = applications.filter((a) => a.status === visibleStatus[0]).length
    const processing = applications.filter((a) => visibleStatus.includes(a.status) && a.status !== visibleStatus[0]).length
    const totalAmount = filtered.reduce((s, a) => s + (a.approvedAmount || a.calculatedAmount || 0), 0)
    return { todo, processing, total: filtered.length, totalAmount }
  }, [applications, visibleStatus, filtered])

  const columns = [
    {
      title: '申报编号',
      dataIndex: 'id',
      width: 140,
      fixed: 'left' as const,
      render: (id: string) => <a onClick={() => navigate(`/applications/${id}`)}>{id}</a>,
    },
    {
      title: '奖励类别',
      dataIndex: 'category',
      width: 180,
      render: (c: RewardCategory) => <Tag color="blue">{RewardCategoryLabels[c]}</Tag>,
    },
    {
      title: '团队/项目名称',
      dataIndex: 'teamName',
      width: 200,
      ellipsis: true,
      render: (v: string, r: any) => v || r.meetingName || '-',
    },
    {
      title: '申报旅行社',
      dataIndex: 'applicantOrg',
      width: 180,
      ellipsis: true,
    },
    {
      title: '团队人数',
      dataIndex: 'teamSize',
      width: 90,
      render: (v?: number) => v || '-',
    },
    {
      title: '计算金额',
      dataIndex: 'calculatedAmount',
      width: 130,
      render: (v?: number) => (v ? <span style={{ color: '#fa541c' }}>{formatMoney(v)}</span> : '-'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (s: ApplicationStatus) => <Tag color={StatusColors[s]}>{StatusLabels[s]}</Tag>,
    },
    {
      title: '提交时间',
      dataIndex: 'submitTime',
      width: 170,
      render: (v?: string) => v || '-',
    },
    {
      title: '操作',
      width: 100,
      fixed: 'right' as const,
      render: (_: any, r: any) => (
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/applications/${r.id}`)}>
          审核
        </Button>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title={isTodo ? '待办审核' : '审核记录'}
        breadcrumb={[{ title: '首页', path: '/' }, { title: isTodo ? '待办审核' : '审核记录' }]}
      />
      <PageContainer>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="待办任务"
                value={stats.todo}
                suffix="项"
                valueStyle={{ color: '#fa541c' }}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="处理中" value={stats.processing} suffix="项" valueStyle={{ color: '#1677ff' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="涉及金额" value={stats.totalAmount} prefix="¥" precision={2} valueStyle={{ color: '#52c41a' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="当前角色" value={UserRoleLabels[currentUser.role]} />
            </Card>
          </Col>
        </Row>

        <Card>
          <Tabs
            defaultActiveKey={isTodo ? 'todo' : 'all'}
            onChange={(k) => navigate(k === 'todo' ? '/audit/todo' : '/audit/all')}
            items={[
              { key: 'todo', label: `待办任务 (${stats.todo})` },
              { key: 'all', label: `全部记录 (${stats.total})` },
            ]}
          />
          <div className="page-toolbar">
            <Space wrap>
              <Input
                placeholder="申报编号/旅行社/团队名称"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                style={{ width: 260 }}
                prefix={<SearchOutlined />}
                allowClear
              />
              <Select
                placeholder="奖励类别"
                value={category}
                onChange={setCategory}
                allowClear
                style={{ width: 180 }}
                options={Object.entries(RewardCategoryLabels).map(([k, v]) => ({ value: k, label: v }))}
              />
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  setKeyword('')
                  setCategory(undefined)
                }}
              >
                重置
              </Button>
            </Space>
          </div>
          <Table
            columns={columns}
            dataSource={filtered}
            rowKey="id"
            scroll={{ x: 1300 }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (t) => `共 ${t} 条记录`,
            }}
          />
        </Card>
      </PageContainer>
    </>
  )
}
