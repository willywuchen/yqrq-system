import { useMemo } from 'react'
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Space,
  Steps,
  Empty,
  Row,
  Col,
  Statistic,
  Typography,
  Divider,
  Timeline,
  Alert,
  Form,
  Input,
  InputNumber,
  Modal,
  Table,
  message,
} from 'antd'
import {
  ArrowLeftOutlined,
  EditOutlined,
  SendOutlined,
  PrinterOutlined,
  CheckOutlined,
  CloseOutlined,
  RollbackOutlined,
  DollarOutlined,
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { useState } from 'react'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import { useStore } from '../../store'
import {
  CategoryToMajor,
  RewardCategoryLabels,
  RewardMajorLabels,
  RequiresPreCheck,
  StatusLabels,
  StatusColors,
  UserRoleLabels,
  type ApplicationStatus,
  type RewardMajor,
} from '../../types'
import { formatMoney, nowStr, genId } from '../../utils'

const { Text } = Typography

// 大类颜色映射
const MajorColors: Record<RewardMajor, string> = {
  team_reception: 'gold',
  special_tourism: 'green',
  culture_promotion: 'purple',
}

// 附件分组标签
const AttachmentGroupLabels: Record<string, string> = {
  base: '基础材料',
  group_org: '组团情况',
  reception: '接待情况',
  accommodation: '住宿情况',
  scenic: '参观景区情况',
  special_extra: '专项奖励其他资料',
  culture_base: '文旅宣传基础材料',
  culture_extra: '文旅宣传其他材料',
  pre_check: '前置审核材料',
  other: '其他材料',
}

// 游客证件类型
const IdTypeLabels: Record<string, string> = {
  id_card: '身份证',
  passport: '护照',
  hk_macao_pass: '港澳通行证',
  tw_pass: '台湾通行证',
  temp_entry_permit: '临时入境许可证',
}

// 航空旅游类型
const AviationTypeLabels: Record<string, string> = {
  hk_macao_direct: '港澳台直航',
  foreign_direct: '外国直航',
}

// 广告类型
const AdvertisingTypeLabels: Record<string, string> = {
  ad_placement: '投放广告',
  website_promo: '网站宣传',
}

// 交流合作类型
const ExchangeTypeLabels: Record<string, string> = {
  youth_exchange: '青少年人文交流计划',
  humanity_activity: '人文交流活动',
}

export default function ApplicationDetail() {
  const navigate = useNavigate()
  const params = useParams()
  const { applications, currentUser, updateApplication, addMessage } = useStore()
  const [auditModal, setAuditModal] = useState<{
    open: boolean
    action: 'pass' | 'return' | 'reject' | 'pay' | 'pre_check_pass' | 'pre_check_reject' | null
  }>({ open: false, action: null })
  const [auditForm] = Form.useForm()
  const [adjustedAmount, setAdjustedAmount] = useState<number | undefined>(undefined)

  const app = applications.find((a) => a.id === params.id)

  const auditLogs = app?.auditLogs || []

  // 流程步骤（4节点：提交 → 初审 → 复审 → 终审）
  const currentStep = useMemo(() => {
    if (!app) return 0
    const map: Record<ApplicationStatus, number> = {
      draft: 0,
      pre_check_pending: 0,
      pre_check_passed: 1,
      pre_check_rejected: 0,
      pending_initial: 1,
      initialing: 1,
      initial_returned: 1,
      pending_review: 2,
      reviewing: 2,
      review_returned: 2,
      pending_final: 3,
      finaling: 3,
      publicizing: 3,
      pending_payment: 3,
      paid: 3,
      rejected: 0,
      archived: 3,
    }
    return map[app.status]
  }, [app])

  if (!app) {
    return (
      <>
        <PageHeader title="申报详情" />
        <PageContainer>
          <Empty description="未找到申报记录" />
        </PageContainer>
      </>
    )
  }

  const major = CategoryToMajor[app.category]
  const isCultureCategory = app.category.startsWith('culture_')
  const isTeamOrSpecial = app.category === 'team_reception' || app.category.startsWith('special_')
  const isPreCheckStage = app.status === 'pre_check_pending'

  // 当前用户能否审核
  const canPreCheck =
    currentUser.role === 'final_reviewer' && isPreCheckStage
  const canAudit =
    (currentUser.role === 'initial_reviewer' && ['pending_initial', 'initialing'].includes(app.status)) ||
    (currentUser.role === 'review_reviewer' && ['pending_review', 'reviewing'].includes(app.status)) ||
    (currentUser.role === 'final_reviewer' && ['pending_final', 'finaling'].includes(app.status))
  const canPay = currentUser.role === 'admin' && app.status === 'pending_payment'

  // 提交草稿
  const handleSubmit = () => {
    const needsPreCheck = RequiresPreCheck.includes(app.category)
    const targetStatus: ApplicationStatus = needsPreCheck ? 'pre_check_pending' : 'pending_initial'
    const stage = needsPreCheck ? 'pre_check' : 'initial'
    const log = {
      id: genId('log'),
      stage: stage as 'pre_check' | 'initial',
      operator: currentUser.name,
      operatorRole: currentUser.role,
      action: 'submit' as const,
      comment: needsPreCheck ? '提交前置审核' : '提交申报',
      time: nowStr(),
    }
    updateApplication(app.id, {
      status: targetStatus,
      submitTime: nowStr(),
      auditLogs: [...auditLogs, log],
    })
    addMessage({
      id: genId('msg'),
      title: needsPreCheck ? '新申报待前置审核' : '新申报待审核',
      content: `${app.applicantOrg} 提交了申报 ${app.id}，${needsPreCheck ? '等待省文旅厅前置审核' : '等待初审'}`,
      type: 'audit',
      read: false,
      createTime: nowStr(),
      applicationId: app.id,
    })
    message.success(needsPreCheck ? '已提交前置审核' : '申报已提交')
  }

  // 审核操作
  const handleAudit = () => {
    auditForm.validateFields().then((values) => {
      const stage =
        currentUser.role === 'initial_reviewer'
          ? 'initial'
          : currentUser.role === 'review_reviewer'
          ? 'review'
          : currentUser.role === 'final_reviewer' && isPreCheckStage
          ? 'pre_check'
          : 'final'
      const actionMap = {
        pass: 'pass',
        return: 'return',
        reject: 'reject',
        pre_check_pass: 'pre_check_pass',
        pre_check_reject: 'pre_check_reject',
      } as const
      const action = actionMap[auditModal.action as 'pass' | 'return' | 'reject' | 'pre_check_pass' | 'pre_check_reject']

      // 状态流转
      let nextStatus: ApplicationStatus = app.status
      if (action === 'pre_check_pass') {
        nextStatus = 'pre_check_passed'
      } else if (action === 'pre_check_reject') {
        nextStatus = 'pre_check_rejected'
      } else if (action === 'pass') {
        if (stage === 'initial') nextStatus = 'pending_review'
        else if (stage === 'review') nextStatus = 'pending_final'
        else if (stage === 'final') nextStatus = 'publicizing'
      } else if (action === 'return') {
        if (stage === 'initial') nextStatus = 'initial_returned'
        else if (stage === 'review') nextStatus = 'review_returned'
      } else if (action === 'reject') {
        nextStatus = 'rejected'
      }

      const log = {
        id: genId('log'),
        stage,
        operator: currentUser.name,
        operatorRole: currentUser.role,
        action,
        comment: values.comment,
        time: nowStr(),
      }

      const patch: any = {
        status: nextStatus,
        auditLogs: [...auditLogs, log],
      }

      // 前置审核通过后，自动进入初审
      if (action === 'pre_check_pass') {
        patch.status = 'pending_initial'
      }

      // 终审通过可调整金额并进入公示→待拨付
      if (stage === 'final' && action === 'pass') {
        patch.approvedAmount = adjustedAmount ?? app.calculatedAmount
        patch.status = 'pending_payment'
      }

      updateApplication(app.id, patch)

      const actionLabel =
        action === 'pre_check_pass'
          ? '前置审核通过'
          : action === 'pre_check_reject'
          ? '前置审核不通过'
          : action === 'pass'
          ? '审核通过'
          : action === 'return'
          ? '已退回'
          : '审核不通过'

      addMessage({
        id: genId('msg'),
        title: `申报${actionLabel}`,
        content: `您的申报 ${app.id} ${actionLabel}。${values.comment || ''}`,
        type: 'audit',
        read: false,
        createTime: nowStr(),
        applicationId: app.id,
      })

      message.success('操作成功')
      setAuditModal({ open: false, action: null })
      auditForm.resetFields()
      setAdjustedAmount(undefined)
    })
  }

  // 拨付
  const handlePay = () => {
    auditForm.validateFields().then((values) => {
      const log = {
        id: genId('log'),
        stage: 'payment' as const,
        operator: currentUser.name,
        operatorRole: currentUser.role,
        action: 'pay' as const,
        comment: values.comment || '资金已拨付',
        time: nowStr(),
      }
      updateApplication(app.id, {
        status: 'paid',
        auditLogs: [...auditLogs, log],
      })
      addMessage({
        id: genId('msg'),
        title: '奖励资金已拨付',
        content: `您的申报 ${app.id} 奖励资金 ${formatMoney(app.approvedAmount || app.calculatedAmount || 0)} 已拨付至您的银行账户`,
        type: 'payment',
        read: false,
        createTime: nowStr(),
        applicationId: app.id,
      })
      message.success('拨付成功')
      setAuditModal({ open: false, action: null })
      auditForm.resetFields()
    })
  }

  // 显示字段
  const descItems: { label: string; value: any }[] = [
    { label: '申报编号', value: app.id },
    {
      label: '奖励大类',
      value: major ? <Tag color={MajorColors[major]}>{RewardMajorLabels[major]}</Tag> : '-',
    },
    { label: '奖励类别', value: <Tag color="blue">{RewardCategoryLabels[app.category]}</Tag> },
    { label: '申报旅行社', value: app.applicantOrg },
    { label: '联系人', value: app.contactPerson },
    { label: '联系电话', value: app.contactPhone },
  ]
  if (app.teamName) descItems.push({ label: '团队/项目名称', value: app.teamName })
  if (app.dispatchNo) descItems.push({ label: '派团单号', value: app.dispatchNo })
  if (app.targetAgreementNo) descItems.push({ label: '目标协议书编号', value: app.targetAgreementNo })
  if (app.teamSize) descItems.push({ label: '团队总人数', value: app.teamSize })
  if (app.inboundTourists !== undefined) descItems.push({ label: '入境游客数', value: app.inboundTourists })
  if (app.domesticTourists !== undefined) descItems.push({ label: '省外游客数', value: app.domesticTourists })
  if (app.stayDays) descItems.push({ label: '停留天数', value: `${app.stayDays} 天` })
  if (app.travelStart) descItems.push({ label: '行程开始', value: app.travelStart })
  if (app.travelEnd) descItems.push({ label: '行程结束', value: app.travelEnd })
  if (app.flightNo) descItems.push({ label: '航班号', value: app.flightNo })
  if (app.aviationType) descItems.push({ label: '航空旅游类型', value: AviationTypeLabels[app.aviationType] || app.aviationType })
  if (app.trainNo) descItems.push({ label: '车次号', value: app.trainNo })
  if (app.meetingName) descItems.push({ label: '展会/活动名称', value: app.meetingName })
  if (app.meetingLocation) descItems.push({ label: '举办地点', value: app.meetingLocation })
  if (app.meetingParticipants !== undefined) descItems.push({ label: '参与人数', value: app.meetingParticipants })
  if (app.activityTimes !== undefined) descItems.push({ label: '活动次数', value: `${app.activityTimes} 次` })
  if (app.advertisingType) descItems.push({ label: '宣传类型', value: AdvertisingTypeLabels[app.advertisingType] || app.advertisingType })
  if (app.advertisingAmount !== undefined) descItems.push({ label: '广告/场地费用', value: formatMoney(app.advertisingAmount) })
  if (app.websiteUrl) descItems.push({ label: '网站网址', value: app.websiteUrl })
  if (app.orderCount !== undefined) descItems.push({ label: '获客订单数', value: `${app.orderCount} 人` })
  if (app.exchangeType) descItems.push({ label: '交流类型', value: ExchangeTypeLabels[app.exchangeType] || app.exchangeType })
  // 兼容旧字段
  if (app.charterCount) descItems.push({ label: '包机/包列次数', value: app.charterCount })
  if (app.salesAmount !== undefined) descItems.push({ label: '销售额/费用', value: formatMoney(app.salesAmount) })
  if (app.mediaAmount !== undefined) descItems.push({ label: '媒体投放金额', value: formatMoney(app.mediaAmount) })
  if (app.promotionTimes !== undefined) descItems.push({ label: '促销次数', value: app.promotionTimes })
  descItems.push(
    { label: '提交时间', value: app.submitTime || '-' },
    { label: '创建时间', value: app.createTime },
  )

  // 按分组归类附件
  const groupedAttachments = useMemo(() => {
    const groups: Record<string, typeof app.attachments> = {}
    app.attachments.forEach((a) => {
      const g = a.group || 'other'
      if (!groups[g]) groups[g] = []
      groups[g].push(a)
    })
    return groups
  }, [app.attachments])

  const actionLabels: Record<string, string> = {
    submit: '提交',
    pass: '通过',
    return: '退回',
    reject: '不通过',
    assign: '分配',
    pay: '拨付',
    pre_check_pass: '前置审核通过',
    pre_check_reject: '前置审核不通过',
  }

  const actionColors: Record<string, string> = {
    submit: 'processing',
    pass: 'success',
    return: 'warning',
    reject: 'error',
    assign: 'blue',
    pay: 'success',
    pre_check_pass: 'success',
    pre_check_reject: 'error',
  }

  // 流程步骤（4节点：提交 → 初审 → 复审 → 终审）
  const stepsItems = [
    {
      title: '提交',
      description: app.submitTime
        ? isCultureCategory && app.status === 'pre_check_pending'
          ? `${app.submitTime} · 前置审核中`
          : app.submitTime
        : isCultureCategory
          ? '待提交（需前置审核）'
          : undefined,
    },
    {
      title: '初审',
      description: currentUser.role === 'initial_reviewer' ? '区县文旅局' : undefined,
    },
    {
      title: '复审',
      description: currentUser.role === 'review_reviewer' ? '市州文旅局' : undefined,
    },
    {
      title: '终审',
      description: currentUser.role === 'final_reviewer' ? '省文旅厅' : undefined,
    },
  ]

  return (
    <>
      <PageHeader
        title="申报详情"
        breadcrumb={[
          { title: '首页', path: '/' },
          { title: '我的申报', path: '/applications' },
          { title: app.id },
        ]}
        extra={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
              返回
            </Button>
            {app.status === 'draft' && currentUser.role === 'applicant' && (
              <>
                <Button icon={<EditOutlined />} onClick={() => navigate(`/applications/${app.id}/edit`)}>
                  编辑
                </Button>
                <Button type="primary" icon={<SendOutlined />} onClick={handleSubmit}>
                  {isCultureCategory ? '提交前置审核' : '提交申报'}
                </Button>
              </>
            )}
            {(app.status === 'initial_returned' || app.status === 'review_returned' || app.status === 'pre_check_rejected' || app.status === 'rejected') &&
              currentUser.role === 'applicant' && (
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={() => navigate(`/applications/${app.id}/edit`)}
                >
                  修改后重新提交
                </Button>
              )}
            <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
              打印
            </Button>
          </Space>
        }
      />
      <PageContainer>
        {/* 状态摘要 */}
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={24} align="middle">
            <Col flex="auto">
              <Space size="large">
                <div>
                  <Text type="secondary">当前状态：</Text>
                  <Tag color={StatusColors[app.status]} style={{ fontSize: 14, padding: '2px 12px' }}>
                    {StatusLabels[app.status]}
                  </Tag>
                </div>
                {major && (
                  <div>
                    <Text type="secondary">大类：</Text>
                    <Tag color={MajorColors[major]}>{RewardMajorLabels[major]}</Tag>
                  </div>
                )}
                <Divider type="vertical" />
                <Statistic
                  title="系统计算金额"
                  value={app.calculatedAmount || 0}
                  precision={2}
                  prefix="¥"
                  valueStyle={{ color: '#fa541c', fontSize: 18 }}
                />
                <Statistic
                  title="核定金额"
                  value={app.approvedAmount || 0}
                  precision={2}
                  prefix="¥"
                  valueStyle={{ color: '#52c41a', fontSize: 18 }}
                />
              </Space>
            </Col>
          </Row>
        </Card>

        {/* 退回/不通过提示 */}
        {(app.status === 'initial_returned' || app.status === 'review_returned' || app.status === 'pre_check_rejected' || app.status === 'rejected') && (
          <Alert
            type={app.status === 'rejected' ? 'error' : 'warning'}
            showIcon
            message={`申报已被${
              app.status === 'pre_check_rejected'
                ? '前置审核'
                : app.status === 'initial_returned'
                ? '初审'
                : app.status === 'review_returned'
                ? '复审'
                : '终审'
            }${app.status === 'rejected' ? '不通过' : '退回'}，请根据审核意见修改后重新提交`}
            description={
              <div>
                {app.auditLogs
                  .filter((l) => l.action === 'return' || l.action === 'reject' || l.action === 'pre_check_reject')
                  .slice(-1)[0]?.comment && (
                  <div style={{ marginTop: 4 }}>
                    <Text strong>审核意见：</Text>
                    <Text>{app.auditLogs.filter((l) => l.action === 'return' || l.action === 'reject' || l.action === 'pre_check_reject').slice(-1)[0]?.comment}</Text>
                  </div>
                )}
              </div>
            }
            style={{ marginBottom: 16 }}
          />
        )}

        {/* 审核流程 */}
        <Card title="审核进度" size="small" style={{ marginBottom: 16 }}>
          <Steps
            current={currentStep}
            status={
              app.status === 'rejected' || app.status === 'pre_check_rejected'
                ? 'error'
                : app.status === 'initial_returned' || app.status === 'review_returned'
                ? 'error'
                : 'process'
            }
            items={stepsItems}
          />
        </Card>

        {/* 基本信息 */}
        <Card title="申报信息" size="small" style={{ marginBottom: 16 }}>
          <Descriptions column={3} bordered size="small">
            {descItems.map((it, i) => (
              <Descriptions.Item key={i} label={it.label}>
                {it.value}
              </Descriptions.Item>
            ))}
          </Descriptions>
        </Card>

        {/* 前置审核信息（文旅宣传类专用） */}
        {isCultureCategory && app.preCheck && (
          <Card title="前置审核信息" size="small" style={{ marginBottom: 16 }}>
            <Descriptions column={3} bordered size="small">
              <Descriptions.Item label="报备函编号">{app.preCheck.applicationNo || '-'}</Descriptions.Item>
              <Descriptions.Item label="报备日期">{app.preCheck.applyDate || '-'}</Descriptions.Item>
              <Descriptions.Item label="省文旅厅批复日期">{app.preCheck.approvedDate || '-'}</Descriptions.Item>
              <Descriptions.Item label="批复函编号">{app.preCheck.approvalNo || '-'}</Descriptions.Item>
            </Descriptions>
          </Card>
        )}

        {/* 团组信息（团队/专项奖励） */}
        {isTeamOrSpecial && (
          <>
            {/* 游客名单 */}
            {app.tourists && app.tourists.length > 0 && (
              <Card title="游客名单" size="small" style={{ marginBottom: 16 }}>
                <Table
                  dataSource={app.tourists}
                  rowKey="key"
                  size="small"
                  pagination={false}
                  scroll={{ x: 1100 }}
                  columns={[
                    { title: '序号', width: 50, render: (_: any, __: any, i: number) => i + 1 },
                    { title: '姓名', dataIndex: 'name', width: 100 },
                    { title: '证件类型', dataIndex: 'idType', width: 120, render: (v: string) => IdTypeLabels[v] || v },
                    { title: '证件号', dataIndex: 'idNumber', width: 140 },
                    { title: '国籍/地区', dataIndex: 'nationality', width: 110 },
                    { title: '客源地', dataIndex: 'sourcePlace', width: 110 },
                    { title: '入住时间', dataIndex: 'checkInDate', width: 130 },
                    { title: '退房时间', dataIndex: 'checkOutDate', width: 130 },
                    { title: '进入景区时间', dataIndex: 'scenicEnterTime', width: 150 },
                  ]}
                />
              </Card>
            )}

            {/* 景区信息 */}
            {app.scenics && app.scenics.length > 0 && (
              <Card title="参观景区信息" size="small" style={{ marginBottom: 16 }}>
                <Table
                  dataSource={app.scenics}
                  rowKey="key"
                  size="small"
                  pagination={false}
                  columns={[
                    { title: '序号', width: 50, render: (_: any, __: any, i: number) => i + 1 },
                    { title: '景区名称', dataIndex: 'name' },
                    { title: '等级', dataIndex: 'level', width: 100, render: (v: string) => <Tag color={v === '5A' ? 'gold' : 'green'}>{v}</Tag> },
                    { title: '进入时间', dataIndex: 'enterTime', width: 180 },
                  ]}
                />
              </Card>
            )}

            {/* 住宿信息 */}
            {app.accommodations && app.accommodations.length > 0 && (
              <Card title="住宿信息" size="small" style={{ marginBottom: 16 }}>
                <Table
                  dataSource={app.accommodations}
                  rowKey="key"
                  size="small"
                  pagination={false}
                  columns={[
                    { title: '序号', width: 50, render: (_: any, __: any, i: number) => i + 1 },
                    { title: '酒店名称', dataIndex: 'hotelName' },
                    { title: '入住日期', dataIndex: 'checkInDate', width: 150 },
                    { title: '退房日期', dataIndex: 'checkOutDate', width: 150 },
                  ]}
                />
              </Card>
            )}

            {/* 导游/司机信息 */}
            {app.guideDrivers && app.guideDrivers.length > 0 && (
              <Card title="导游/司机信息" size="small" style={{ marginBottom: 16 }}>
                <Table
                  dataSource={app.guideDrivers}
                  rowKey="key"
                  size="small"
                  pagination={false}
                  columns={[
                    { title: '序号', width: 50, render: (_: any, __: any, i: number) => i + 1 },
                    { title: '类型', dataIndex: 'type', width: 90, render: (v: string) => (v === 'guide' ? '导游' : '司机') },
                    { title: '姓名', dataIndex: 'name' },
                    { title: '证件号', dataIndex: 'licenseNo' },
                  ]}
                />
              </Card>
            )}
          </>
        )}

        {/* 附件（按分组展示） */}
        <Card title="证明材料（按分组）" size="small" style={{ marginBottom: 16 }}>
          {app.attachments.length === 0 ? (
            <Empty description="暂无附件" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            Object.keys(AttachmentGroupLabels)
              .filter((g) => groupedAttachments[g] && groupedAttachments[g].length > 0)
              .map((g) => (
                <div key={g} style={{ marginBottom: 12 }}>
                  <div style={{ marginBottom: 6, fontWeight: 600 }}>
                    <Tag color="blue">{AttachmentGroupLabels[g]}</Tag>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {' '}{groupedAttachments[g].length} 个文件
                    </Text>
                  </div>
                  <Table
                    dataSource={groupedAttachments[g]}
                    rowKey="uid"
                    size="small"
                    pagination={false}
                    columns={[
                      {
                        title: '材料标题',
                        dataIndex: 'title',
                        width: 140,
                        render: (v: string) => (v ? <Tag color="blue">{v}</Tag> : <Text type="secondary">-</Text>),
                      },
                      { title: '文件名', dataIndex: 'name' },
                      {
                        title: '大小',
                        dataIndex: 'size',
                        width: 100,
                        render: (s: number) => (s / 1024).toFixed(1) + ' KB',
                      },
                      { title: '上传时间', dataIndex: 'uploadTime', width: 180 },
                    ]}
                  />
                </div>
              ))
          )}
        </Card>

        {/* 审核操作区 */}
        {(canAudit || canPay || canPreCheck) && (
          <Card
            title="审核操作"
            size="small"
            style={{ marginBottom: 16, background: '#fffbe6', border: '1px solid #ffe58f' }}
          >
            <Space size="middle" wrap>
              {canPreCheck && (
                <>
                  <Button
                    type="primary"
                    icon={<CheckOutlined />}
                    onClick={() => setAuditModal({ open: true, action: 'pre_check_pass' })}
                  >
                    前置审核通过
                  </Button>
                  <Button
                    danger
                    type="primary"
                    ghost
                    icon={<CloseOutlined />}
                    onClick={() => setAuditModal({ open: true, action: 'pre_check_reject' })}
                  >
                    前置审核不通过
                  </Button>
                </>
              )}
              {canAudit && (
                <>
                  <Button
                    type="primary"
                    icon={<CheckOutlined />}
                    onClick={() => {
                      if (currentUser.role === 'final_reviewer') setAdjustedAmount(app.calculatedAmount)
                      setAuditModal({ open: true, action: 'pass' })
                    }}
                  >
                    审核通过
                  </Button>
                  <Button
                    danger
                    icon={<RollbackOutlined />}
                    onClick={() => setAuditModal({ open: true, action: 'return' })}
                  >
                    退回修改
                  </Button>
                  <Button
                    danger
                    type="primary"
                    ghost
                    icon={<CloseOutlined />}
                    onClick={() => setAuditModal({ open: true, action: 'reject' })}
                  >
                    审核不通过
                  </Button>
                </>
              )}
              {canPay && (
                <Button
                  type="primary"
                  icon={<DollarOutlined />}
                  onClick={() => setAuditModal({ open: true, action: 'pay' })}
                >
                  确认拨付
                </Button>
              )}
            </Space>
          </Card>
        )}

        {/* 审核日志 */}
        <Card title="审核记录" size="small">
          {auditLogs.length === 0 ? (
            <Empty description="暂无审核记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <Timeline
              items={auditLogs.map((log) => ({
                color:
                  log.action === 'pass' || log.action === 'pay' || log.action === 'pre_check_pass'
                    ? 'green'
                    : log.action === 'return' || log.action === 'reject' || log.action === 'pre_check_reject'
                    ? 'red'
                    : 'blue',
                children: (
                  <div>
                    <div>
                      <Tag color={actionColors[log.action] || 'default'}>
                        {actionLabels[log.action] || log.action}
                      </Tag>
                      <Text strong style={{ marginLeft: 8 }}>{log.operator}</Text>
                      <Text type="secondary" style={{ marginLeft: 8 }}>({UserRoleLabels[log.operatorRole]})</Text>
                      <Text type="secondary" style={{ marginLeft: 16 }}>{log.time}</Text>
                    </div>
                    {log.comment && <div style={{ color: '#666', marginTop: 4 }}>{log.comment}</div>}
                  </div>
                ),
              }))}
            />
          )}
        </Card>
      </PageContainer>

      {/* 审核弹窗 */}
      <Modal
        title={
          auditModal.action === 'pre_check_pass'
            ? '前置审核通过'
            : auditModal.action === 'pre_check_reject'
            ? '前置审核不通过'
            : auditModal.action === 'pass'
            ? '审核通过'
            : auditModal.action === 'return'
            ? '退回修改'
            : auditModal.action === 'reject'
            ? '审核不通过'
            : '确认拨付'
        }
        open={auditModal.open}
        onOk={
          auditModal.action === 'pay'
            ? handlePay
            : handleAudit
        }
        onCancel={() => {
          setAuditModal({ open: false, action: null })
          auditForm.resetFields()
          setAdjustedAmount(undefined)
        }}
        okText="确认"
        cancelText="取消"
        okButtonProps={{
          danger:
            auditModal.action === 'return' ||
            auditModal.action === 'reject' ||
            auditModal.action === 'pre_check_reject',
        }}
      >
        <Form form={auditForm} layout="vertical">
          {auditModal.action === 'pass' && currentUser.role === 'final_reviewer' && (
            <Form.Item
              label="核定奖励金额（元）"
              required
            >
              <InputNumber
                value={adjustedAmount}
                onChange={(v) => setAdjustedAmount(typeof v === 'number' ? v : Number(v) || 0)}
                min={0}
                style={{ width: '100%' }}
                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(v) => Number(v!.replace(/[^0-9.]/g, '')) as any}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                系统计算金额：{formatMoney(app.calculatedAmount || 0)}，可调整并填写原因
              </Text>
            </Form.Item>
          )}
          <Form.Item
            label={
              auditModal.action === 'return' || auditModal.action === 'reject' || auditModal.action === 'pre_check_reject'
                ? '原因'
                : '审核意见'
            }
            name="comment"
            rules={
              auditModal.action === 'return' ||
              auditModal.action === 'reject' ||
              auditModal.action === 'pre_check_reject'
                ? [{ required: true, message: '请填写原因' }]
                : []
            }
          >
            <Input.TextArea rows={3} placeholder="请填写审核意见/原因" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}


