import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Divider,
  Form,
  Input,
  InputNumber,
  Row,
  Space,
  Table,
  Tag,
  Tabs,
  App,
  Typography,
  Tooltip,
  Statistic,
} from 'antd'
import {
  ArrowLeftOutlined,
  SaveOutlined,
  SendOutlined,
  UndoOutlined,
  ClockCircleOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  LockOutlined,
  PlusOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import { useStore } from '../../store'
import {
  SubsidyStatusColors,
  SubsidyStatusLabels,
  type SubsidyApplication,
  type SubsidyOperationLog,
} from '../../types'
import { formatMoney, nowStr } from '../../utils'

const { Text } = Typography

// 锁定时间校验
function checkLocked(app: SubsidyApplication): boolean {
  if (app.status === 'locked') return true
  const deadline = new Date(app.lockDeadline.replace(/-/g, '/')).getTime()
  return Date.now() >= deadline
}

// 倒计时
function useCountdown(lockDeadline: string, status: string) {
  const [, setTick] = useState(0)
  useEffect(() => {
    if (status === 'locked') return
    const t = setInterval(() => setTick((v) => v + 1), 60 * 1000)
    return () => clearInterval(t)
  }, [status])

  if (status === 'locked') return { text: '已锁定', color: 'red' }
  const deadline = new Date(lockDeadline.replace(/-/g, '/')).getTime()
  const diff = deadline - Date.now()
  if (diff <= 0) return { text: '已锁定', color: 'red' }
  const days = Math.floor(diff / (24 * 3600 * 1000))
  const hours = Math.floor((diff % (24 * 3600 * 1000)) / (3600 * 1000))
  const minutes = Math.floor((diff % (3600 * 1000)) / (60 * 1000))
  if (days >= 1) return { text: `${days}天${hours}小时`, color: 'default' }
  if (hours >= 1) return { text: `${hours}小时${minutes}分`, color: 'orange' }
  return { text: `${minutes}分钟`, color: 'red' }
}

// 酒店行项
interface HotelRow {
  key: string
  nightNo: string // 第几晚
  hotelName: string
  hotelStar: string
}

export default function SubsidyForm() {
  const navigate = useNavigate()
  const params = useParams()
  const id = params.id
  const {
    subsidyApplications,
    updateSubsidyApplication,
    appendSubsidyLog,
    currentUser,
    refreshSubsidyLockStatus,
    subsidyOperationLogs,
  } = useStore()
  const { modal, message } = App.useApp()

  const editingApp = subsidyApplications.find((a) => a.id === id)

  // 本地编辑态
  const [formValues, setFormValues] = useState<SubsidyApplication | null>(
    editingApp ? JSON.parse(JSON.stringify(editingApp)) : null,
  )
  // 酒店行（从 teamBaseInfo.hotelFirst5Nights 派生）
  const [hotelRows, setHotelRows] = useState<HotelRow[]>(() => {
    if (!editingApp) return []
    const names = editingApp.teamBaseInfo.hotelFirst5Nights || []
    return names.map((n, i) => ({
      key: `h-${i}-${Date.now()}`,
      nightNo: `第${i + 1}晚`,
      hotelName: n,
      hotelStar: editingApp.teamBaseInfo.hotelStar || '',
    }))
  })

  // 进入页面时刷新锁定状态
  useEffect(() => {
    refreshSubsidyLockStatus()
  }, [refreshSubsidyLockStatus])

  // 当 store 中应用状态变化时同步本地
  useEffect(() => {
    if (editingApp && (!formValues || formValues.status !== editingApp.status)) {
      setFormValues(JSON.parse(JSON.stringify(editingApp)))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingApp?.status, editingApp?.updateTime])

  if (!editingApp || !formValues) {
    return (
      <PageContainer>
        <Card style={{ margin: 16 }}>
          <Alert type="warning" message="未找到申报记录" showIcon />
          <Button style={{ marginTop: 16 }} onClick={() => navigate('/subsidy')}>
            返回列表
          </Button>
        </Card>
      </PageContainer>
    )
  }

  const isLocked = checkLocked(editingApp)
  const canEdit = !isLocked && editingApp.status !== 'locked'
  const countdown = useCountdown(editingApp.lockDeadline, editingApp.status)

  // 计算金额合计
  const totalAmount = useMemo(() => {
    const tr = formValues.teamReceptionRows.reduce((s, r) => s + (Number(r.amount) || 0), 0)
    const sp = formValues.specialTourismRows.reduce((s, r) => s + (Number(r.amount) || 0), 0)
    const cp = formValues.culturePromotionRows.reduce((s, r) => s + (Number(r.amount) || 0), 0)
    return tr + sp + cp
  }, [formValues])

  // 更新表单字段
  const updateField = <K extends keyof SubsidyApplication>(key: K, value: SubsidyApplication[K]) => {
    setFormValues((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const updateTeamBaseInfo = (key: string, value: any) => {
    setFormValues((prev) =>
      prev ? { ...prev, teamBaseInfo: { ...prev.teamBaseInfo, [key]: value } } : prev,
    )
  }

  // 更新区块B/C/E行项
  const updateRow = (
    section: 'teamReceptionRows' | 'specialTourismRows' | 'culturePromotionRows',
    rowKey: string,
    field: string,
    value: any,
  ) => {
    setFormValues((prev) => {
      if (!prev) return prev
      const rows = prev[section].map((r) => (r.key === rowKey ? { ...r, [field]: value } : r))
      return { ...prev, [section]: rows }
    })
  }

  // 酒店行编辑
  const updateHotelRow = (rowKey: string, field: keyof HotelRow, value: string) => {
    setHotelRows((prev) => {
      const next = prev.map((r) => (r.key === rowKey ? { ...r, [field]: value } : r))
      // 同步回 teamBaseInfo
      updateTeamBaseInfo('hotelFirst5Nights', next.map((r) => r.hotelName))
      // 星级取首个非空
      const star = next.find((r) => r.hotelStar)?.hotelStar || ''
      updateTeamBaseInfo('hotelStar', star)
      return next
    })
  }

  const addHotelRow = () => {
    const newKey = `h-new-${Date.now()}`
    setHotelRows((prev) => {
      const next = [...prev, { key: newKey, nightNo: `第${prev.length + 1}晚`, hotelName: '', hotelStar: '' }]
      updateTeamBaseInfo('hotelFirst5Nights', next.map((r) => r.hotelName))
      return next
    })
  }

  const removeHotelRow = (rowKey: string) => {
    setHotelRows((prev) => {
      const next = prev.filter((r) => r.key !== rowKey).map((r, i) => ({ ...r, nightNo: `第${i + 1}晚` }))
      updateTeamBaseInfo('hotelFirst5Nights', next.map((r) => r.hotelName))
      return next
    })
  }

  // 4A景区名称可编辑（字符串数组 → 输入框列表）
  const updateScenicName = (idx: number, value: string) => {
    setFormValues((prev) => {
      if (!prev) return prev
      const names = [...(prev.teamBaseInfo.scenicNames4APlus || [])]
      names[idx] = value
      return { ...prev, teamBaseInfo: { ...prev.teamBaseInfo, scenicNames4APlus: names } }
    })
  }

  const addScenicName = () => {
    setFormValues((prev) => {
      if (!prev) return prev
      const names = [...(prev.teamBaseInfo.scenicNames4APlus || []), '']
      return {
        ...prev,
        teamBaseInfo: { ...prev.teamBaseInfo, scenicNames4APlus: names, scenicCount4APlus: names.length },
      }
    })
  }

  const removeScenicName = (idx: number) => {
    setFormValues((prev) => {
      if (!prev) return prev
      const names = (prev.teamBaseInfo.scenicNames4APlus || []).filter((_, i) => i !== idx)
      return {
        ...prev,
        teamBaseInfo: { ...prev.teamBaseInfo, scenicNames4APlus: names, scenicCount4APlus: names.length },
      }
    })
  }

  // 保存
  const handleSave = () => {
    if (!canEdit) {
      message.error('已过锁定时间，不可修改')
      return
    }
    const patch: Partial<SubsidyApplication> = {
      ...formValues,
      totalAmount,
      updateTime: nowStr(),
    }
    updateSubsidyApplication(editingApp.id, patch)
    appendSubsidyLog({
      id: `sol-edit-${editingApp.id}-${Date.now()}`,
      applicationId: editingApp.id,
      operator: currentUser.name,
      operatorRole: currentUser.role,
      action: 'edit',
      comment: '保存编辑内容',
      time: nowStr(),
    })
    message.success('保存成功')
  }

  // 提交
  const handleSubmit = () => {
    if (!canEdit) {
      message.error('已过锁定时间，不可提交')
      return
    }
    if (!formValues.unitName) {
      message.error('请填写单位名称')
      return
    }
    if (!formValues.contactPhone) {
      message.error('请填写联系电话')
      return
    }
    if (totalAmount <= 0) {
      message.error('请至少填写一项奖励金额')
      return
    }
    modal.confirm({
      title: '确认提交申报',
      icon: <SendOutlined />,
      content: (
        <div>
          <p>提交后省文旅厅终审员将可查看本申报记录。</p>
          <p>出团前一日 24:00 前仍可修改（剩余：<b>{countdown.text}</b>）。</p>
          <p>申请奖励合计：<b style={{ color: '#cf1322' }}>{formatMoney(totalAmount)}</b></p>
        </div>
      ),
      okText: '确认提交',
      cancelText: '取消',
      onOk: () => {
        const now = nowStr()
        const newStatus = checkLocked(editingApp) ? 'locked' : 'submitted'
        updateSubsidyApplication(editingApp.id, {
          ...formValues,
          totalAmount,
          status: newStatus,
          submitTime: now,
          updateTime: now,
        })
        appendSubsidyLog({
          id: `sol-submit-${editingApp.id}-${Date.now()}`,
          applicationId: editingApp.id,
          operator: currentUser.name,
          operatorRole: currentUser.role,
          action: 'submit',
          comment: newStatus === 'locked' ? '提交时已过锁定时间，自动锁定' : '提交申报',
          time: now,
        })
        message.success('提交成功')
        navigate(`/subsidy/${editingApp.id}`)
      },
    })
  }

  // 撤回
  const handleWithdraw = () => {
    if (!canEdit) {
      message.error('已过锁定时间，不可撤回')
      return
    }
    modal.confirm({
      title: '确认撤回申报',
      icon: <UndoOutlined />,
      content: '撤回后将回到草稿状态，省文旅厅终审员将不可见。可在锁定时间前重新提交。',
      okText: '确认撤回',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        updateSubsidyApplication(editingApp.id, {
          status: 'draft',
          submitTime: undefined,
          updateTime: nowStr(),
        })
        appendSubsidyLog({
          id: `sol-withdraw-${editingApp.id}-${Date.now()}`,
          applicationId: editingApp.id,
          operator: currentUser.name,
          operatorRole: currentUser.role,
          action: 'withdraw',
          comment: '撤回至草稿',
          time: nowStr(),
        })
        message.success('已撤回至草稿')
      },
    })
  }

  // 团信息重新拉取
  const handleRefetch = () => {
    modal.confirm({
      title: '重新拉取团信息',
      icon: <ReloadOutlined />,
      content: '重新拉取将覆盖当前已编辑内容（包括团队基本信息、住宿、车号、景区等），是否继续？',
      okText: '确认覆盖',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        const snapshot = editingApp.teamPresetSnapshot
        const newHotelNames = snapshot.accommodations.slice(0, 5).map((a) => a.hotelName)
        const newVehicleNos = Array.from(
          new Set(snapshot.guideDrivers.filter((g) => g.type === 'driver').map((g) => g.licenseNo).filter(Boolean)),
        )
        const newScenics4A = snapshot.scenics.filter((s) => s.level === '4A' || s.level === '5A')
        setFormValues((prev) =>
          prev
            ? {
                ...prev,
                teamBaseInfo: {
                  ...prev.teamBaseInfo,
                  teamNo: snapshot.dispatchNo,
                  travelStartDate: snapshot.travelStart,
                  travelEndDate: snapshot.travelEnd,
                  nights: snapshot.stayDays - 1,
                  days: snapshot.stayDays,
                  hotelFirst5Nights: newHotelNames,
                  vehicleNos: newVehicleNos,
                  vehicleCount: newVehicleNos.length,
                  scenicNames4APlus: newScenics4A.map((s) => s.name),
                  scenicCount4APlus: newScenics4A.length,
                },
              }
            : prev,
        )
        setHotelRows(
          newHotelNames.map((n, i) => ({
            key: `h-${i}-${Date.now()}`,
            nightNo: `第${i + 1}晚`,
            hotelName: n,
            hotelStar: formValues.teamBaseInfo.hotelStar || '',
          })),
        )
        message.success('已重新拉取团信息')
      },
    })
  }

  // 操作日志
  const logs = subsidyOperationLogs
    .filter((l) => l.applicationId === editingApp.id)
    .sort((a, b) => b.time.localeCompare(a.time))

  // 表格列
  const receptionColumns = [
    { title: '申请项目', dataIndex: 'project', width: 240 },
    {
      title: '申请奖励金额（元）',
      dataIndex: 'amount',
      width: 160,
      render: (_: unknown, r: any) => (
        <InputNumber
          value={r.amount}
          min={0}
          precision={2}
          disabled={!canEdit}
          style={{ width: '100%' }}
          onChange={(v) => updateRow('teamReceptionRows', r.key, 'amount', v || 0)}
        />
      ),
    },
    {
      title: '申请团队人数',
      dataIndex: 'teamSize',
      width: 140,
      render: (_: unknown, r: any) => (
        <InputNumber
          value={r.teamSize}
          min={0}
          disabled={!canEdit}
          style={{ width: '100%' }}
          onChange={(v) => updateRow('teamReceptionRows', r.key, 'teamSize', v || 0)}
        />
      ),
    },
  ]

  const specialColumns = receptionColumns

  const cultureColumns = [
    { title: '申请项目', dataIndex: 'project', width: 160 },
    {
      title: '申请金额（元）',
      dataIndex: 'amount',
      width: 130,
      render: (_: unknown, r: any) => (
        <InputNumber
          value={r.amount}
          min={0}
          precision={2}
          disabled={!canEdit}
          style={{ width: '100%' }}
          onChange={(v) => updateRow('culturePromotionRows', r.key, 'amount', v || 0)}
        />
      ),
    },
    {
      title: '参加或组织活动名称',
      dataIndex: 'activityName',
      render: (_: unknown, r: any) => (
        <Input
          value={r.activityName}
          disabled={!canEdit}
          placeholder="活动名称"
          onChange={(e) => updateRow('culturePromotionRows', r.key, 'activityName', e.target.value)}
        />
      ),
    },
    {
      title: '地点',
      dataIndex: 'location',
      width: 160,
      render: (_: unknown, r: any) => (
        <Input
          value={r.location}
          disabled={!canEdit}
          placeholder="地点"
          onChange={(e) => updateRow('culturePromotionRows', r.key, 'location', e.target.value)}
        />
      ),
    },
    {
      title: '派遣/接待人数',
      dataIndex: 'participants',
      width: 130,
      render: (_: unknown, r: any) => (
        <InputNumber
          value={r.participants}
          min={0}
          disabled={!canEdit}
          style={{ width: '100%' }}
          onChange={(v) => updateRow('culturePromotionRows', r.key, 'participants', v || 0)}
        />
      ),
    },
  ]

  const hotelColumns = [
    {
      title: '第几晚',
      dataIndex: 'nightNo',
      width: 100,
      render: (_: unknown, r: HotelRow) => (
        <Input
          value={r.nightNo}
          disabled={!canEdit}
          onChange={(e) => updateHotelRow(r.key, 'nightNo', e.target.value)}
        />
      ),
    },
    {
      title: '酒店名称',
      dataIndex: 'hotelName',
      render: (_: unknown, r: HotelRow) => (
        <Input
          value={r.hotelName}
          disabled={!canEdit}
          placeholder="酒店名称"
          onChange={(e) => updateHotelRow(r.key, 'hotelName', e.target.value)}
        />
      ),
    },
    {
      title: '酒店星级',
      dataIndex: 'hotelStar',
      width: 160,
      render: (_: unknown, r: HotelRow) => (
        <Input
          value={r.hotelStar}
          disabled={!canEdit}
          placeholder="如：五星级 / 四星级"
          onChange={(e) => updateHotelRow(r.key, 'hotelStar', e.target.value)}
        />
      ),
    },
    {
      title: '操作',
      key: 'op',
      width: 80,
      render: (_: unknown, r: HotelRow) =>
        canEdit ? (
          <Button type="link" danger size="small" icon={<DeleteOutlined />} onClick={() => removeHotelRow(r.key)}>
            删除
          </Button>
        ) : null,
    },
  ]

  return (
    <>
      <PageHeader
        title={`编辑申报 - ${editingApp.applicationNo}`}
        breadcrumb={[
          { title: '首页', path: '/' },
          { title: '引客入黔补贴管理', path: '/subsidy' },
          { title: '编辑' },
        ]}
        extra={
          <Space>
            <Tag color={SubsidyStatusColors[editingApp.status]} style={{ margin: 0 }}>
              {SubsidyStatusLabels[editingApp.status]}
            </Tag>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/subsidy/${editingApp.id}`)}>
              返回详情
            </Button>
          </Space>
        }
      >
        <Alert
          type={canEdit ? 'info' : 'warning'}
          showIcon
          icon={canEdit ? <InfoCircleOutlined /> : <LockOutlined />}
          message={
            <Space>
              <span>数据来源：团信息 [{editingApp.teamPresetSnapshot.teamName}]</span>
              <Divider type="vertical" />
              <span>出团日期：{editingApp.teamPresetSnapshot.travelStart}</span>
              <Divider type="vertical" />
              <span>锁定时间：{editingApp.lockDeadline}</span>
              <Divider type="vertical" />
              <Tooltip title="出团前一日 24:00 前可修改">
                <Tag color={countdown.color} icon={<ClockCircleOutlined />}>
                  剩余可修改：{countdown.text}
                </Tag>
              </Tooltip>
            </Space>
          }
          style={{ marginBottom: 16 }}
          action={
            canEdit ? (
              <Button size="small" icon={<ReloadOutlined />} onClick={handleRefetch}>
                重新拉取
              </Button>
            ) : undefined
          }
        />
      </PageHeader>
      <PageContainer>
        <div style={{ padding: 16 }}>
          {/* 金额汇总 */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="团队接待奖励合计"
                  value={formValues.teamReceptionRows.reduce((s, r) => s + (Number(r.amount) || 0), 0)}
                  precision={2}
                  prefix="¥"
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="专项旅游奖励合计"
                  value={formValues.specialTourismRows.reduce((s, r) => s + (Number(r.amount) || 0), 0)}
                  precision={2}
                  prefix="¥"
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="文旅宣传奖励合计"
                  value={formValues.culturePromotionRows.reduce((s, r) => s + (Number(r.amount) || 0), 0)}
                  precision={2}
                  prefix="¥"
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="申请奖励合计"
                  value={totalAmount}
                  precision={2}
                  prefix="¥"
                  valueStyle={{ color: '#cf1322', fontWeight: 700 }}
                />
              </Card>
            </Col>
          </Row>

          <Tabs
            defaultActiveKey="block-a"
            items={[
              // A. 申报单位基本信息
              {
                key: 'block-a',
                label: 'A. 申报单位基本信息',
                children: (
                  <Card bordered={false}>
                    <Form layout="vertical">
                      <Row gutter={16}>
                        <Col span={12}>
                          <Form.Item label="单位名称" required>
                            <Input
                              value={formValues.unitName}
                              onChange={(e) => updateField('unitName', e.target.value)}
                              disabled={!canEdit}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item label="法定代表人">
                            <Input
                              value={formValues.legalRepresentative || ''}
                              onChange={(e) => updateField('legalRepresentative', e.target.value)}
                              disabled={!canEdit}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item
                            label={
                              <Space>
                                <span>经办人</span>
                                <Tag color="blue" style={{ fontSize: 11 }}>
                                  来源：团信息
                                </Tag>
                              </Space>
                            }
                          >
                            <Input
                              value={formValues.operator || ''}
                              onChange={(e) => updateField('operator', e.target.value)}
                              disabled={!canEdit}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item label="联系电话" required>
                            <Input
                              value={formValues.contactPhone || ''}
                              onChange={(e) => updateField('contactPhone', e.target.value)}
                              disabled={!canEdit}
                              placeholder="如：0851-XXXXXXXX"
                            />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item label="银行账户-户名">
                            <Input
                              value={formValues.bankAccount?.accountName || ''}
                              onChange={(e) => {
                                const next = { ...(formValues.bankAccount || {}), accountName: e.target.value }
                                updateField('bankAccount', next)
                              }}
                              disabled={!canEdit}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item label="银行账户-开户行">
                            <Input
                              value={formValues.bankAccount?.bankName || ''}
                              onChange={(e) => {
                                const next = { ...(formValues.bankAccount || {}), bankName: e.target.value }
                                updateField('bankAccount', next)
                              }}
                              disabled={!canEdit}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item label="银行账户-账号">
                            <Input
                              value={formValues.bankAccount?.accountNo || ''}
                              onChange={(e) => {
                                const next = { ...(formValues.bankAccount || {}), accountNo: e.target.value }
                                updateField('bankAccount', next)
                              }}
                              disabled={!canEdit}
                            />
                          </Form.Item>
                        </Col>
                      </Row>
                    </Form>
                  </Card>
                ),
              },
              // D. 团队基本信息（紧接A，便于用户从团信息核对方便）
              {
                key: 'block-d',
                label: 'D. 团队基本信息',
                children: (
                  <Card bordered={false}>
                    <Alert
                      type="info"
                      showIcon
                      message="以下字段已从团信息自动拉取；可编辑字段（车号、住宿酒店、景区名称）已开放编辑。"
                      style={{ marginBottom: 16 }}
                    />
                    <Form layout="vertical">
                      <Row gutter={16}>
                        <Col span={8}>
                          <Form.Item
                            label={
                              <Space>
                                <span>团队编号（贵州监管执法平台）</span>
                                <Tag color="blue" style={{ fontSize: 11 }}>来源：团信息</Tag>
                              </Space>
                            }
                          >
                            <Input
                              value={formValues.teamBaseInfo.teamNo || ''}
                              onChange={(e) => updateTeamBaseInfo('teamNo', e.target.value)}
                              disabled={!canEdit}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item
                            label={
                              <Space>
                                <span>团队在黔时间-起</span>
                                <Tag color="blue" style={{ fontSize: 11 }}>来源：团信息</Tag>
                              </Space>
                            }
                          >
                            <DatePicker
                              value={formValues.teamBaseInfo.travelStartDate ? dayjs(formValues.teamBaseInfo.travelStartDate) : null}
                              onChange={(_, s) => updateTeamBaseInfo('travelStartDate', s as string)}
                              disabled={!canEdit}
                              style={{ width: '100%' }}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item
                            label={
                              <Space>
                                <span>团队在黔时间-止</span>
                                <Tag color="blue" style={{ fontSize: 11 }}>来源：团信息</Tag>
                              </Space>
                            }
                          >
                            <DatePicker
                              value={formValues.teamBaseInfo.travelEndDate ? dayjs(formValues.teamBaseInfo.travelEndDate) : null}
                              onChange={(_, s) => updateTeamBaseInfo('travelEndDate', s as string)}
                              disabled={!canEdit}
                              style={{ width: '100%' }}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item label="总晚数">
                            <InputNumber
                              value={formValues.teamBaseInfo.nights}
                              onChange={(v) => updateTeamBaseInfo('nights', v || 0)}
                              disabled={!canEdit}
                              style={{ width: '100%' }}
                              addonAfter="晚"
                            />
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item label="总天数">
                            <InputNumber
                              value={formValues.teamBaseInfo.days}
                              onChange={(v) => updateTeamBaseInfo('days', v || 0)}
                              disabled={!canEdit}
                              style={{ width: '100%' }}
                              addonAfter="天"
                            />
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item
                            label={
                              <Space>
                                <span>游客来源地</span>
                                <Tag color="blue" style={{ fontSize: 11 }}>来源：团信息</Tag>
                              </Space>
                            }
                          >
                            <Input
                              value={formValues.teamBaseInfo.sourcePlace || ''}
                              onChange={(e) => updateTeamBaseInfo('sourcePlace', e.target.value)}
                              disabled={!canEdit}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item label="省外组团社名称">
                            <Input
                              value={formValues.teamBaseInfo.outboundTourOrgName || ''}
                              onChange={(e) => updateTeamBaseInfo('outboundTourOrgName', e.target.value)}
                              disabled={!canEdit}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item
                            label={
                              <Space>
                                <span>租用客车-辆数</span>
                                <Tag color="blue" style={{ fontSize: 11 }}>自动计数</Tag>
                              </Space>
                            }
                          >
                            <InputNumber
                              value={formValues.teamBaseInfo.vehicleCount}
                              onChange={(v) => updateTeamBaseInfo('vehicleCount', v || 0)}
                              disabled={!canEdit}
                              style={{ width: '100%' }}
                              addonAfter="辆"
                            />
                          </Form.Item>
                        </Col>
                        <Col span={16}>
                          <Form.Item
                            label={
                              <Space>
                                <span>租用客车-车号</span>
                                <Tag color="orange" style={{ fontSize: 11 }}>可编辑</Tag>
                              </Space>
                            }
                          >
                            <Input
                              value={(formValues.teamBaseInfo.vehicleNos || []).join('、')}
                              onChange={(e) => {
                                const arr = e.target.value
                                  .split(/[、,，\s]+/)
                                  .map((s) => s.trim())
                                  .filter(Boolean)
                                updateTeamBaseInfo('vehicleNos', arr)
                                updateTeamBaseInfo('vehicleCount', arr.length)
                              }}
                              disabled={!canEdit}
                              placeholder="多个车号用顿号分隔，如：贵A-12345、贵A-67890"
                            />
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item
                            label={
                              <Space>
                                <span>4A+景区数量</span>
                                <Tag color="orange" style={{ fontSize: 11 }}>库匹配</Tag>
                              </Space>
                            }
                          >
                            <InputNumber
                              value={formValues.teamBaseInfo.scenicCount4APlus}
                              onChange={(v) => updateTeamBaseInfo('scenicCount4APlus', v || 0)}
                              disabled={!canEdit}
                              style={{ width: '100%' }}
                              addonAfter="个"
                            />
                          </Form.Item>
                        </Col>
                      </Row>

                      {/* 住宿酒店：第几晚 / 酒店名称 / 酒店星级（合并编辑） */}
                      <Divider orientation="left">
                        <Space>
                          <span>团队住宿信息</span>
                          <Tag color="orange" style={{ fontSize: 11 }}>可编辑</Tag>
                        </Space>
                      </Divider>
                      <div style={{ marginBottom: 8 }}>
                        {canEdit && (
                          <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addHotelRow}>
                            添加一行
                          </Button>
                        )}
                      </div>
                      <Table
                        rowKey="key"
                        dataSource={hotelRows}
                        columns={hotelColumns}
                        pagination={false}
                        size="small"
                        locale={{ emptyText: '无住宿信息' }}
                      />

                      {/* 4A景区名称：可编辑 */}
                      <Divider orientation="left">
                        <Space>
                          <span>4A+景区名称</span>
                          <Tag color="orange" style={{ fontSize: 11 }}>可编辑</Tag>
                        </Space>
                      </Divider>
                      <div style={{ marginBottom: 8 }}>
                        {canEdit && (
                          <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addScenicName}>
                            添加一个景区
                          </Button>
                        )}
                      </div>
                      {(formValues.teamBaseInfo.scenicNames4APlus || []).length === 0 ? (
                        <Text type="secondary">无景区</Text>
                      ) : (
                        <Space wrap>
                          {(formValues.teamBaseInfo.scenicNames4APlus || []).map((name, idx) => (
                            <Space key={idx} style={{ marginBottom: 8 }}>
                              <Input
                                value={name}
                                disabled={!canEdit}
                                placeholder="景区名称"
                                style={{ width: 240 }}
                                onChange={(e) => updateScenicName(idx, e.target.value)}
                              />
                              {canEdit && (
                                <Button
                                  type="link"
                                  danger
                                  size="small"
                                  icon={<DeleteOutlined />}
                                  onClick={() => removeScenicName(idx)}
                                />
                              )}
                            </Space>
                          ))}
                        </Space>
                      )}
                    </Form>
                  </Card>
                ),
              },
              // B. 入境旅游团队接待奖励
              {
                key: 'block-b',
                label: 'B. 入境旅游团队接待奖励',
                children: (
                  <Card bordered={false}>
                    <Alert
                      type="info"
                      showIcon
                      message="申请团队人数已根据团信息游客客源地自动统计；如需调整可直接修改。"
                      style={{ marginBottom: 16 }}
                    />
                    <Table
                      rowKey="key"
                      dataSource={formValues.teamReceptionRows}
                      columns={receptionColumns}
                      pagination={false}
                      size="small"
                      summary={(data) => {
                        const totalAmt = data.reduce((s, r: any) => s + (Number(r.amount) || 0), 0)
                        const totalPpl = data.reduce((s, r: any) => s + (Number(r.teamSize) || 0), 0)
                        return (
                          <Table.Summary.Row>
                            <Table.Summary.Cell index={0}>
                              <Text strong>合计</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={1}>
                              <Text strong style={{ color: '#cf1322' }}>{formatMoney(totalAmt)}</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={2}>
                              <Text strong>{totalPpl}人</Text>
                            </Table.Summary.Cell>
                          </Table.Summary.Row>
                        )
                      }}
                    />
                  </Card>
                ),
              },
              // C. 专项旅游奖励
              {
                key: 'block-c',
                label: 'C. 专项旅游奖励',
                children: (
                  <Card bordered={false}>
                    <Alert
                      type="info"
                      showIcon
                      message="根据团实际情况选择适用项填写；不适用的项目留空。"
                      style={{ marginBottom: 16 }}
                    />
                    <Table
                      rowKey="key"
                      dataSource={formValues.specialTourismRows}
                      columns={specialColumns}
                      pagination={false}
                      size="small"
                      summary={(data) => {
                        const totalAmt = data.reduce((s, r: any) => s + (Number(r.amount) || 0), 0)
                        const totalPpl = data.reduce((s, r: any) => s + (Number(r.teamSize) || 0), 0)
                        return (
                          <Table.Summary.Row>
                            <Table.Summary.Cell index={0}>
                              <Text strong>合计</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={1}>
                              <Text strong style={{ color: '#cf1322' }}>{formatMoney(totalAmt)}</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={2}>
                              <Text strong>{totalPpl}人</Text>
                            </Table.Summary.Cell>
                          </Table.Summary.Row>
                        )
                      }}
                    />
                  </Card>
                ),
              },
              // E. 旅游宣传奖励
              {
                key: 'block-e',
                label: 'E. 旅游宣传奖励',
                children: (
                  <Card bordered={false}>
                    <Alert
                      type="info"
                      showIcon
                      message="根据团实际情况选择适用项填写；不适用的项目留空。"
                      style={{ marginBottom: 16 }}
                    />
                    <Table
                      rowKey="key"
                      dataSource={formValues.culturePromotionRows}
                      columns={cultureColumns}
                      pagination={false}
                      size="small"
                      scroll={{ x: 900 }}
                      summary={(data) => {
                        const totalAmt = data.reduce((s, r: any) => s + (Number(r.amount) || 0), 0)
                        const totalPpl = data.reduce((s, r: any) => s + (Number(r.participants) || 0), 0)
                        return (
                          <Table.Summary.Row>
                            <Table.Summary.Cell index={0}>
                              <Text strong>合计</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={1}>
                              <Text strong style={{ color: '#cf1322' }}>{formatMoney(totalAmt)}</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={2}>-</Table.Summary.Cell>
                            <Table.Summary.Cell index={3}>-</Table.Summary.Cell>
                            <Table.Summary.Cell index={4}>
                              <Text strong>{totalPpl}人</Text>
                            </Table.Summary.Cell>
                          </Table.Summary.Row>
                        )
                      }}
                    />
                  </Card>
                ),
              },
              // 操作记录
              {
                key: 'logs',
                label: '操作记录',
                children: (
                  <Card bordered={false}>
                    <Table
                      rowKey="id"
                      dataSource={logs}
                      pagination={false}
                      size="small"
                      columns={[
                        { title: '时间', dataIndex: 'time', width: 180 },
                        { title: '操作人', dataIndex: 'operator', width: 120 },
                        {
                          title: '动作',
                          dataIndex: 'action',
                          width: 120,
                          render: (v: SubsidyOperationLog['action']) => {
                            const map: Record<string, string> = {
                              create: '创建',
                              edit: '编辑',
                              submit: '提交',
                              withdraw: '撤回',
                              lock: '锁定',
                              export_team: '导出团行程信息',
                              export_form: '导出申报表',
                              delete: '删除',
                            }
                            return <Tag>{map[v] || v}</Tag>
                          },
                        },
                        { title: '说明', dataIndex: 'comment' },
                      ]}
                    />
                  </Card>
                ),
              },
            ]}
          />

          {/* 底部操作栏 */}
          <Card bordered={false} style={{ marginTop: 16 }}>
            <Row justify="space-between" align="middle">
              <Col>
                <Space>
                  <Tag color={SubsidyStatusColors[editingApp.status]}>
                    {SubsidyStatusLabels[editingApp.status]}
                  </Tag>
                  <Text type="secondary">
                    创建于 {editingApp.createTime}
                    {editingApp.submitTime ? ` · 提交于 ${editingApp.submitTime}` : ''}
                  </Text>
                </Space>
              </Col>
              <Col>
                <Space>
                  <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/subsidy/${editingApp.id}`)}>
                    取消
                  </Button>
                  {canEdit && (
                    <Button icon={<SaveOutlined />} onClick={handleSave}>
                      保存
                    </Button>
                  )}
                  {canEdit && editingApp.status !== 'submitted' && (
                    <Button type="primary" icon={<SendOutlined />} onClick={handleSubmit}>
                      提交申报
                    </Button>
                  )}
                  {canEdit && editingApp.status === 'submitted' && (
                    <Button icon={<UndoOutlined />} onClick={handleWithdraw}>
                      撤回
                    </Button>
                  )}
                  {isLocked && (
                    <Alert
                      type="error"
                      showIcon
                      icon={<LockOutlined />}
                      message="已过锁定时间，不可修改"
                      style={{ padding: '4px 12px' }}
                    />
                  )}
                </Space>
              </Col>
            </Row>
          </Card>
        </div>
      </PageContainer>
    </>
  )
}
