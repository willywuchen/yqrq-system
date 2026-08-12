import { useMemo, useState } from 'react'
import {
  Table,
  Card,
  Button,
  Input,
  Select,
  Space,
  Tag,
  DatePicker,
  Row,
  Col,
  Statistic,
  Popconfirm,
  message,
} from 'antd'
import { PlusOutlined, SearchOutlined, ReloadOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import { useStore } from '../../store'
import {
  CategoryToMajor,
  NewRewardCategories,
  RewardCategoryLabels,
  RewardMajorLabels,
  StatusLabels,
  StatusColors,
  type RewardCategory,
  type RewardMajor,
  type ApplicationStatus,
} from '../../types'
import { formatMoney } from '../../utils'

const { RangePicker } = DatePicker

// 大类颜色映射
const MajorColors: Record<RewardMajor, string> = {
  team_reception: 'gold',
  special_tourism: 'green',
  culture_promotion: 'purple',
}

export default function ApplicationList() {
  const navigate = useNavigate()
  const { applications, currentUser, deleteApplication } = useStore()
  const [keyword, setKeyword] = useState('')
  const [major, setMajor] = useState<RewardMajor | undefined>()
  const [category, setCategory] = useState<RewardCategory | undefined>()
  const [status, setStatus] = useState<ApplicationStatus | undefined>()
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null)

  // 申请人只能看自己的
  const visibleApps = useMemo(() => {
    if (currentUser.role === 'applicant') {
      return applications.filter((a) => a.applicantOrg === currentUser.org)
    }
    return applications
  }, [applications, currentUser])

  const filtered = useMemo(() => {
    return visibleApps.filter((a) => {
      if (keyword) {
        const kw = keyword.toLowerCase()
        if (
          !a.id.toLowerCase().includes(kw) &&
          !a.applicantOrg.toLowerCase().includes(kw) &&
          !(a.teamName || '').toLowerCase().includes(kw) &&
          !(a.meetingName || '').toLowerCase().includes(kw) &&
          !(a.dispatchNo || '').toLowerCase().includes(kw)
        )
          return false
      }
      // 大类筛选
      if (major && CategoryToMajor[a.category] !== major) return false
      if (category && a.category !== category) return false
      if (status && a.status !== status) return false
      if (dateRange && dateRange[0] && dateRange[1]) {
        const t = dayjs(a.submitTime || a.createTime)
        if (t.isBefore(dateRange[0], 'day') || t.isAfter(dateRange[1], 'day')) return false
      }
      return true
    })
  }, [visibleApps, keyword, major, category, status, dateRange])

  // 统计
  const stats = useMemo(() => {
    const total = filtered.length
    const pending = filtered.filter((a) =>
      ['pre_check_pending', 'pending_initial', 'pending_review', 'pending_final', 'initialing', 'reviewing', 'finaling'].includes(a.status),
    ).length
    const approved = filtered.filter((a) => ['paid', 'publicizing', 'pending_payment'].includes(a.status)).length
    const totalAmount = filtered.reduce((s, a) => s + (a.approvedAmount || a.calculatedAmount || 0), 0)
    return { total, pending, approved, totalAmount }
  }, [filtered])

  const handleDelete = (id: string) => {
    deleteApplication(id)
    message.success('已删除草稿')
  }

  const columns = [
    {
      title: '申报编号',
      dataIndex: 'id',
      width: 140,
      fixed: 'left' as const,
      render: (id: string) => <a onClick={() => navigate(`/applications/${id}`)}>{id}</a>,
    },
    {
      title: '大类',
      dataIndex: 'category',
      width: 130,
      render: (c: RewardCategory) => {
        const m = CategoryToMajor[c]
        return m ? <Tag color={MajorColors[m]}>{RewardMajorLabels[m]}</Tag> : '-'
      },
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
      title: '派团单号',
      dataIndex: 'dispatchNo',
      width: 150,
      render: (v?: string) => v || '-',
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
      width: 120,
      render: (v?: number) => (v ? <span style={{ color: '#fa541c', fontWeight: 600 }}>{formatMoney(v)}</span> : '-'),
    },
    {
      title: '核定金额',
      dataIndex: 'approvedAmount',
      width: 120,
      render: (v?: number) =>
        v ? <span style={{ color: '#52c41a', fontWeight: 600 }}>{formatMoney(v)}</span> : '-',
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
      width: 180,
      fixed: 'right' as const,
      render: (_: any, r: any) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/applications/${r.id}`)}
          >
            查看
          </Button>
          {(r.status === 'draft' || r.status === 'initial_returned' || r.status === 'review_returned') && currentUser.role === 'applicant' && (
            <>
              <Button
                type="link"
                size="small"
                onClick={() => navigate(`/applications/${r.id}/edit`)}
              >
                编辑
              </Button>
              {r.status === 'draft' && (
                <Popconfirm title="确定删除此草稿？" onConfirm={() => handleDelete(r.id)}>
                  <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                    删除
                  </Button>
                </Popconfirm>
              )}
            </>
          )}
        </Space>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="申报管理"
        breadcrumb={[{ title: '首页', path: '/' }, { title: '申报管理' }]}
        extra={
          currentUser.role === 'applicant' && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/applications/new')}>
              新建申报
            </Button>
          )
        }
      />
      <PageContainer>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card>
              <Statistic title="申报总数" value={stats.total} suffix="项" />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="审核中（含前置审核）" value={stats.pending} suffix="项" valueStyle={{ color: '#1677ff' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="已通过" value={stats.approved} suffix="项" valueStyle={{ color: '#52c41a' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="奖励金额合计"
                value={stats.totalAmount}
                precision={2}
                prefix="¥"
                valueStyle={{ color: '#fa541c' }}
              />
            </Card>
          </Col>
        </Row>

        <Card>
          <div className="page-toolbar">
            <Space wrap>
              <Input
                placeholder="申报编号/旅行社/团队名称/派团单号"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                style={{ width: 280 }}
                prefix={<SearchOutlined />}
                allowClear
              />
              <Select
                placeholder="奖励大类"
                value={major}
                onChange={setMajor}
                allowClear
                style={{ width: 180 }}
                options={Object.entries(RewardMajorLabels).map(([k, v]) => ({ value: k, label: v }))}
              />
              <Select
                placeholder="具体类别"
                value={category}
                onChange={setCategory}
                allowClear
                style={{ width: 200 }}
                options={NewRewardCategories.map((k) => ({ value: k, label: RewardCategoryLabels[k] }))}
              />
              <Select
                placeholder="申报状态"
                value={status}
                onChange={setStatus}
                allowClear
                style={{ width: 150 }}
                options={Object.entries(StatusLabels).map(([k, v]) => ({ value: k, label: v }))}
              />
              <RangePicker
                value={dateRange as any}
                onChange={(v) => setDateRange(v as any)}
                placeholder={['提交开始', '提交结束']}
              />
              <Button icon={<ReloadOutlined />} onClick={() => {
                setKeyword('')
                setMajor(undefined)
                setCategory(undefined)
                setStatus(undefined)
                setDateRange(null)
              }}>
                重置
              </Button>
            </Space>
          </div>
          <Table
            columns={columns}
            dataSource={filtered}
            rowKey="id"
            scroll={{ x: 1700 }}
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
