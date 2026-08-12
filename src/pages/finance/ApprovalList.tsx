import { useMemo, useState } from 'react'
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Input,
  Select,
  Row,
  Col,
  Statistic,
  Modal,
  Form,
  InputNumber,
  Typography,
  message,
  Alert,
} from 'antd'
import { SearchOutlined, CheckOutlined, AuditOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import { useStore } from '../../store'
import {
  RewardCategoryLabels,
  StatusLabels,
  StatusColors,
  type RewardCategory,
} from '../../types'
import { formatMoney, nowStr, genId } from '../../utils'

const { Text } = Typography

export default function ApprovalList() {
  const navigate = useNavigate()
  const { applications, currentUser, updateApplication, addMessage } = useStore()
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState<RewardCategory | undefined>()
  const [adjustModal, setAdjustModal] = useState<{ open: boolean; id?: string }>({ open: false })
  const [adjustForm] = Form.useForm()
  const [adjustedAmount, setAdjustedAmount] = useState<number | undefined>(undefined)

  // 待终审
  const finalApps = useMemo(() => {
    return applications.filter(
      (a) => a.status === 'pending_final' || a.status === 'finaling' || a.status === 'publicizing' || a.status === 'pending_payment',
    )
  }, [applications])

  const filtered = useMemo(() => {
    return finalApps.filter((a) => {
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
  }, [finalApps, keyword, category])

  const stats = useMemo(() => {
    const pending = applications.filter((a) => a.status === 'pending_final').length
    const approved = applications.filter((a) => ['publicizing', 'pending_payment', 'paid'].includes(a.status)).length
    const pendingAmount = applications
      .filter((a) => a.status === 'pending_final')
      .reduce((s, a) => s + (a.calculatedAmount || 0), 0)
    const approvedAmount = applications
      .filter((a) => ['publicizing', 'pending_payment', 'paid'].includes(a.status))
      .reduce((s, a) => s + (a.approvedAmount || 0), 0)
    return { pending, approved, pendingAmount, approvedAmount }
  }, [applications])

  const handleApprove = () => {
    adjustForm.validateFields().then((values) => {
      const app = applications.find((a) => a.id === adjustModal.id)
      if (!app) return
      const log = {
        id: genId('log'),
        stage: 'final' as const,
        operator: currentUser.name,
        operatorRole: currentUser.role,
        action: 'pass' as const,
        comment: `核定金额 ${formatMoney(adjustedAmount || 0)}${values.comment ? '；' + values.comment : ''}`,
        time: nowStr(),
      }
      updateApplication(app.id, {
        status: 'pending_payment',
        approvedAmount: adjustedAmount,
        auditLogs: [...app.auditLogs, log],
      })
      addMessage({
        id: genId('msg'),
        title: '终审通过',
        content: `您的申报 ${app.id} 已通过终审，核定金额 ${formatMoney(adjustedAmount || 0)}，等待资金拨付`,
        type: 'audit',
        read: false,
        createTime: nowStr(),
        applicationId: app.id,
      })
      message.success('终审通过，已进入资金拨付环节')
      setAdjustModal({ open: false })
      adjustForm.resetFields()
      setAdjustedAmount(undefined)
    })
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
      title: '奖励类别',
      dataIndex: 'category',
      width: 160,
      render: (c: RewardCategory) => <Tag color="blue">{RewardCategoryLabels[c]}</Tag>,
    },
    {
      title: '申报旅行社',
      dataIndex: 'applicantOrg',
      width: 180,
      ellipsis: true,
    },
    {
      title: '团队/项目名称',
      dataIndex: 'teamName',
      width: 180,
      ellipsis: true,
      render: (v: string, r: any) => v || r.meetingName || '-',
    },
    {
      title: '系统计算金额',
      dataIndex: 'calculatedAmount',
      width: 140,
      render: (v?: number) => (v ? <Text style={{ color: '#fa541c' }}>{formatMoney(v)}</Text> : '-'),
    },
    {
      title: '核定金额',
      dataIndex: 'approvedAmount',
      width: 140,
      render: (v?: number) =>
        v ? <Text strong style={{ color: '#52c41a' }}>{formatMoney(v)}</Text> : <Text type="secondary">待核定</Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (s: string) => <Tag color={StatusColors[s as keyof typeof StatusColors]}>{StatusLabels[s as keyof typeof StatusLabels]}</Tag>,
    },
    {
      title: '操作',
      width: 160,
      fixed: 'right' as const,
      render: (_: any, r: any) => (
        <Space>
          {r.status === 'pending_final' && (
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => {
                setAdjustedAmount(r.calculatedAmount)
                setAdjustModal({ open: true, id: r.id })
              }}
            >
              核定
            </Button>
          )}
          <Button type="link" size="small" onClick={() => navigate(`/applications/${r.id}`)}>
            详情
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="奖励核定"
        breadcrumb={[{ title: '首页', path: '/' }, { title: '奖励核定' }]}
      />
      <PageContainer>
        <Alert
          type="info"
          showIcon
          message="终审核定说明"
          description="请核对系统计算金额，可根据实际情况调整核定金额并填写调整原因。核定后将进入资金拨付环节。"
          style={{ marginBottom: 16 }}
        />

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="待核定"
                value={stats.pending}
                suffix="项"
                valueStyle={{ color: '#fa541c' }}
                prefix={<AuditOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="已核定" value={stats.approved} suffix="项" valueStyle={{ color: '#52c41a' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="待核定金额" value={stats.pendingAmount} prefix="¥" precision={2} valueStyle={{ color: '#fa8c16' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="已核定金额" value={stats.approvedAmount} prefix="¥" precision={2} valueStyle={{ color: '#52c41a' }} />
            </Card>
          </Col>
        </Row>

        <Card>
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
            </Space>
          </div>
          <Table
            columns={columns}
            dataSource={filtered}
            rowKey="id"
            scroll={{ x: 1300 }}
            pagination={{
              pageSize: 10,
              showTotal: (t) => `共 ${t} 条记录`,
            }}
          />
        </Card>
      </PageContainer>

      {/* 核定弹窗 */}
      <Modal
        title="奖励金额核定"
        open={adjustModal.open}
        onOk={handleApprove}
        onCancel={() => {
          setAdjustModal({ open: false })
          adjustForm.resetFields()
          setAdjustedAmount(undefined)
        }}
        okText="确认核定"
        cancelText="取消"
        width={500}
      >
        {(() => {
          const app = applications.find((a) => a.id === adjustModal.id)
          if (!app) return null
          return (
            <div style={{ marginBottom: 16, padding: 12, background: '#f0f5ff', borderRadius: 4 }}>
              <Row>
                <Col span={12}>
                  <Text type="secondary">申报编号：</Text>
                  <Text strong>{app.id}</Text>
                </Col>
                <Col span={12}>
                  <Text type="secondary">旅行社：</Text>
                  <Text strong>{app.applicantOrg}</Text>
                </Col>
              </Row>
              <Row style={{ marginTop: 8 }}>
                <Col span={24}>
                  <Text type="secondary">奖励类别：</Text>
                  <Tag color="blue">{RewardCategoryLabels[app.category]}</Tag>
                </Col>
              </Row>
              <Row style={{ marginTop: 8 }}>
                <Col span={12}>
                  <Text type="secondary">系统计算：</Text>
                  <Text style={{ color: '#fa541c' }}>{formatMoney(app.calculatedAmount || 0)}</Text>
                </Col>
              </Row>
            </div>
          )
        })()}
        <Form form={adjustForm} layout="vertical">
          <Form.Item label="核定奖励金额（元）" required>
            <InputNumber
              value={adjustedAmount}
              onChange={(v) => setAdjustedAmount(typeof v === 'number' ? v : Number(v) || 0)}
              min={0}
              style={{ width: '100%' }}
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(v) => Number(v!.replace(/[^0-9.]/g, '')) as any}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              可调整核定金额，与系统计算金额差异较大时请在备注中说明
            </Text>
          </Form.Item>
          <Form.Item label="核定备注" name="comment">
            <Input.TextArea rows={3} placeholder="调整原因、核定依据等" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
