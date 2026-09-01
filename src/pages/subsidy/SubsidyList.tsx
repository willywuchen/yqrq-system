import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  DatePicker,
  Input,
  Select,
  Space,
  Table,
  Tag,
  App,
  Tooltip,
  Row,
  Col,
  Statistic,
} from 'antd'
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  ExportOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import { useStore } from '../../store'
import {
  SubsidyStatusColors,
  SubsidyStatusLabels,
  SubsidyRewardMajorColors,
  SubsidyRewardMajorLabels,
  getDeclaredRewardMajors,
  type SubsidyApplication,
  type SubsidyStatus,
  type RewardMajor,
} from '../../types'
import { formatMoney } from '../../utils'

const { RangePicker } = DatePicker

// 计算剩余锁定时间描述
function getLockCountdown(lockDeadline: string, status: SubsidyStatus): { text: string; color: string } | null {
  if (status === 'locked') return { text: '已锁定', color: 'red' }
  if (status === 'draft') return null // 草稿态不展示倒计时
  const deadline = new Date(lockDeadline.replace(/-/g, '/')).getTime()
  const now = Date.now()
  if (now >= deadline) return { text: '已锁定', color: 'red' }
  const diff = deadline - now
  const days = Math.floor(diff / (24 * 3600 * 1000))
  const hours = Math.floor((diff % (24 * 3600 * 1000)) / (3600 * 1000))
  const minutes = Math.floor((diff % (3600 * 1000)) / (60 * 1000))
  let text: string
  let color: string
  if (days >= 1) {
    text = `${days}天${hours}小时`
    color = 'default'
  } else if (hours >= 1) {
    text = `${hours}小时${minutes}分钟`
    color = 'orange'
  } else {
    text = `${minutes}分钟`
    color = 'red'
  }
  return { text, color }
}

export default function SubsidyList() {
  const navigate = useNavigate()
  const { subsidyApplications, currentUser, deleteSubsidyApplication, appendSubsidyLog, refreshSubsidyLockStatus } = useStore()
  const { modal, message } = App.useApp()

  const [statusFilter, setStatusFilter] = useState<SubsidyStatus | ''>('')
  const [rewardFilter, setRewardFilter] = useState<RewardMajor[]>([])
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null)
  const [keyword, setKeyword] = useState('')
  const [orgFilter, setOrgFilter] = useState('')

  // 进入页面时刷新锁定状态
  useEffect(() => {
    refreshSubsidyLockStatus()
  }, [refreshSubsidyLockStatus])

  const isApplicant = currentUser.role === 'applicant'
  // 厅侧查看视角：终审员与第三方审核均可见全量已提交记录（草稿不可见）
  const canViewAll = currentUser.role === 'final_reviewer' || currentUser.role === 'third_party_reviewer'

  // 数据范围过滤：旅行社仅本单位；厅侧查看角色全量已提交
  const visibleApps = useMemo(() => {
    let list = subsidyApplications
    if (isApplicant) {
      list = list.filter((a) => a.createdByOrg === currentUser.org)
    } else if (canViewAll) {
      // 终审员/第三方审核仅可见已提交和已锁定的记录（草稿不可见）
      list = list.filter((a) => a.status !== 'draft')
    } else {
      list = []
    }
    return list
  }, [subsidyApplications, currentUser, isApplicant, canViewAll])

  // 二次筛选
  const filteredApps = useMemo(() => {
    let list = visibleApps
    if (statusFilter) list = list.filter((a) => a.status === statusFilter)
    if (orgFilter) list = list.filter((a) => a.createdByOrg.includes(orgFilter))
    // 申报奖励项筛选（三大奖项互斥，可复选）
    if (rewardFilter.length) {
      list = list.filter((a) => getDeclaredRewardMajors(a).some((m) => rewardFilter.includes(m)))
    }
    if (keyword) {
      const kw = keyword.toLowerCase()
      list = list.filter(
        (a) =>
          a.applicationNo.toLowerCase().includes(kw) ||
          a.teamPresetSnapshot.teamName.toLowerCase().includes(kw) ||
          a.teamPresetSnapshot.dispatchNo.toLowerCase().includes(kw) ||
          a.teamPresetSnapshot.travelDesc.toLowerCase().includes(kw),
      )
    }
    if (dateRange && dateRange[0] && dateRange[1]) {
      const start = dateRange[0].format('YYYY-MM-DD')
      const end = dateRange[1].format('YYYY-MM-DD')
      list = list.filter((a) => {
        const t = a.teamPresetSnapshot.travelStart
        return t >= start && t <= end
      })
    }
    return list
  }, [visibleApps, statusFilter, orgFilter, rewardFilter, keyword, dateRange])

  // 统计
  const stats = useMemo(() => {
    const draftCnt = visibleApps.filter((a) => a.status === 'draft').length
    const submittedCnt = visibleApps.filter((a) => a.status === 'submitted').length
    const lockedCnt = visibleApps.filter((a) => a.status === 'locked').length
    const totalAmount = visibleApps.reduce((s, a) => s + (a.totalAmount || 0), 0)
    return { draftCnt, submittedCnt, lockedCnt, totalAmount }
  }, [visibleApps])

  const handleDelete = (record: SubsidyApplication) => {
    modal.confirm({
      title: '确认删除',
      icon: <DeleteOutlined />,
      content: `确认删除申报记录「${record.applicationNo}」吗？草稿删除后不可恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        deleteSubsidyApplication(record.id)
        appendSubsidyLog({
          id: `sol-del-${record.id}-${Date.now()}`,
          applicationId: record.id,
          operator: currentUser.name,
          operatorRole: currentUser.role,
          action: 'delete',
          comment: '删除草稿',
          time: new Date().toISOString().replace('T', ' ').substring(0, 19),
        })
        message.success('已删除')
      },
    })
  }

  const columns = [
    {
      title: '申报编号',
      dataIndex: 'applicationNo',
      width: 140,
      fixed: 'left' as const,
      render: (v: string, record: SubsidyApplication) => (
        <a onClick={() => navigate(`/subsidy/${record.id}`)}>{v}</a>
      ),
    },
    {
      title: '团单位',
      dataIndex: ['createdByOrg'],
      width: 160,
      ellipsis: true,
    },
    {
      title: '团名称',
      dataIndex: ['teamPresetSnapshot', 'teamName'],
      width: 180,
      ellipsis: true,
    },
    {
      title: '团队编号',
      dataIndex: ['teamPresetSnapshot', 'dispatchNo'],
      width: 150,
    },
    {
      title: '旅游路线',
      dataIndex: ['teamPresetSnapshot', 'travelDesc'],
      width: 220,
      ellipsis: true,
    },
    {
      title: '出团日期',
      dataIndex: ['teamPresetSnapshot', 'travelStart'],
      width: 110,
      sorter: (a: SubsidyApplication, b: SubsidyApplication) =>
        a.teamPresetSnapshot.travelStart.localeCompare(b.teamPresetSnapshot.travelStart),
      defaultSortOrder: 'ascend' as const,
    },
    {
      title: '行程天数',
      dataIndex: ['teamPresetSnapshot', 'stayDays'],
      width: 90,
      render: (v: number) => `${v}天`,
    },
    {
      title: '客源地',
      dataIndex: ['teamBaseInfo', 'sourcePlace'],
      width: 120,
      ellipsis: true,
    },
    {
      title: '申报奖励项',
      key: 'rewardMajor',
      width: 180,
      ellipsis: true,
      render: (_: unknown, record: SubsidyApplication) => {
        const majors = getDeclaredRewardMajors(record)
        if (!majors.length) return <span style={{ color: '#999' }}>-</span>
        return (
          <Space size={4} wrap>
            {majors.map((m) => (
              <Tag key={m} color={SubsidyRewardMajorColors[m]} style={{ margin: 0 }}>
                {SubsidyRewardMajorLabels[m]}
              </Tag>
            ))}
          </Space>
        )
      },
    },
    {
      title: '申报人数',
      dataIndex: 'totalTeamSize',
      width: 90,
      render: (v: number) => `${v}人`,
    },
    {
      title: '申请奖励合计',
      dataIndex: 'totalAmount',
      width: 130,
      align: 'right' as const,
      render: (v: number) => <span style={{ color: '#cf1322', fontWeight: 600 }}>{formatMoney(v || 0)}</span>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (v: SubsidyStatus) => <Tag color={SubsidyStatusColors[v]}>{SubsidyStatusLabels[v]}</Tag>,
    },
    {
      title: '锁定倒计时',
      key: 'lockCountdown',
      width: 130,
      render: (_: unknown, record: SubsidyApplication) => {
        const cd = getLockCountdown(record.lockDeadline, record.status)
        if (!cd) return <span style={{ color: '#999' }}>-</span>
        return (
          <Tooltip title={`锁定时间：${record.lockDeadline}`}>
            <Tag color={cd.color} icon={<ClockCircleOutlined />}>{cd.text}</Tag>
          </Tooltip>
        )
      },
    },
    {
      title: '提交时间',
      dataIndex: 'submitTime',
      width: 160,
      render: (v?: string) => v || '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      fixed: 'right' as const,
      render: (_: unknown, record: SubsidyApplication) => {
        const canEdit = isApplicant && record.status !== 'locked'
        const canDelete = isApplicant && record.status === 'draft'
        return (
          <Space size="small">
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/subsidy/${record.id}`)}>
              查看
            </Button>
            {canEdit && (
              <Button type="link" size="small" icon={<EditOutlined />} onClick={() => navigate(`/subsidy/${record.id}/edit`)}>
                编辑
              </Button>
            )}
            {isApplicant && (
              <Button
                type="link"
                size="small"
                icon={<ExportOutlined />}
                onClick={() => navigate(`/subsidy/${record.id}`)}
              >
                导出
              </Button>
            )}
            {canDelete && (
              <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)}>
                删除
              </Button>
            )}
          </Space>
        )
      },
    },
  ]

  return (
    <>
      <PageHeader
        title="引客入黔补贴管理"
        breadcrumb={[{ title: '首页', path: '/' }, { title: '引客入黔补贴管理' }]}
        extra={
          isApplicant ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/subsidy/new')}>
              新建申报
            </Button>
          ) : null
        }
      >
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card size="small">
              <Statistic title="草稿" value={stats.draftCnt} suffix="条" valueStyle={{ color: '#8c8c8c' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="已提交" value={stats.submittedCnt} suffix="条" valueStyle={{ color: '#1677ff' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="已锁定" value={stats.lockedCnt} suffix="条" valueStyle={{ color: '#cf1322' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="申请奖励合计"
                value={stats.totalAmount}
                precision={2}
                prefix="¥"
                valueStyle={{ color: '#cf1322' }}
              />
            </Card>
          </Col>
        </Row>
      </PageHeader>
      <PageContainer>
        <Card style={{ margin: 16 }}>
          <Space wrap style={{ marginBottom: 16 }}>
            <Input.Search
              placeholder="搜索申报编号/团名称/团队编号/路线"
              allowClear
              style={{ width: 280 }}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <Select
              placeholder="申报状态"
              allowClear
              style={{ width: 140 }}
              value={statusFilter || undefined}
              onChange={(v) => setStatusFilter(v || '')}
              options={(Object.keys(SubsidyStatusLabels) as SubsidyStatus[]).map((s) => ({
                value: s,
                label: SubsidyStatusLabels[s],
              }))}
            />
            <Select
              placeholder="申报奖励项"
              allowClear
              mode="multiple"
              maxTagCount="responsive"
              style={{ minWidth: 200 }}
              value={rewardFilter}
              onChange={(v) => setRewardFilter(v || [])}
              options={(Object.keys(SubsidyRewardMajorLabels) as RewardMajor[]).map((m) => ({
                value: m,
                label: SubsidyRewardMajorLabels[m],
              }))}
            />
            {canViewAll && (
              <Input
                placeholder="旅行社名称"
                allowClear
                style={{ width: 200 }}
                value={orgFilter}
                onChange={(e) => setOrgFilter(e.target.value)}
              />
            )}
            <RangePicker
              value={dateRange as any}
              onChange={(v) => setDateRange(v as any)}
              placeholder={['出团开始', '出团结束']}
            />
            <Button icon={<ReloadOutlined />} onClick={() => refreshSubsidyLockStatus()}>
              刷新锁定状态
            </Button>
          </Space>

          <Table
            rowKey="id"
            dataSource={filteredApps}
            columns={columns}
            scroll={{ x: 2080 }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (t) => `共 ${t} 条`,
            }}
          />
        </Card>
      </PageContainer>
    </>
  )
}
