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
  Typography,
  message,
  Progress,
} from 'antd'
import {
  SearchOutlined,
  DownloadOutlined,
  DollarOutlined,
  CheckOutlined,
  BankOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import { useStore } from '../../store'
import {
  RewardCategoryLabels,
  StatusLabels,
  StatusColors,
  type RewardCategory,
} from '../../types'
import { BUDGET_TOTAL } from '../../mock/data'
import { formatMoney, nowStr, genId } from '../../utils'

const { Text } = Typography

export default function PaymentList() {
  const navigate = useNavigate()
  const { applications, currentUser, updateApplication, addMessage } = useStore()
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState<RewardCategory | undefined>()
  const [payModal, setPayModal] = useState<{ open: boolean; id?: string }>({ open: false })
  const [payForm] = Form.useForm()
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])

  // 待拨付 & 已拨付
  const payableApps = useMemo(() => {
    return applications.filter(
      (a) => a.status === 'pending_payment' || a.status === 'paid',
    )
  }, [applications])

  const filtered = useMemo(() => {
    return payableApps.filter((a) => {
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
  }, [payableApps, keyword, category])

  const stats = useMemo(() => {
    const pending = applications.filter((a) => a.status === 'pending_payment')
    const paid = applications.filter((a) => a.status === 'paid')
    const pendingAmount = pending.reduce((s, a) => s + (a.approvedAmount || 0), 0)
    const paidAmount = paid.reduce((s, a) => s + (a.approvedAmount || 0), 0)
    return { pendingCount: pending.length, pendingAmount, paidCount: paid.length, paidAmount }
  }, [applications])

  const handlePay = () => {
    payForm.validateFields().then((values) => {
      const app = applications.find((a) => a.id === payModal.id)
      if (!app) return
      const log = {
        id: genId('log'),
        stage: 'payment' as const,
        operator: currentUser.name,
        operatorRole: currentUser.role,
        action: 'pay' as const,
        comment: `已拨付至 ${values.bankName} ${values.bankAccount}`,
        time: nowStr(),
      }
      updateApplication(app.id, {
        status: 'paid',
        auditLogs: [...app.auditLogs, log],
      })
      addMessage({
        id: genId('msg'),
        title: '奖励资金已拨付',
        content: `您的申报 ${app.id} 奖励资金 ${formatMoney(app.approvedAmount || 0)} 已拨付至您的账户`,
        type: 'payment',
        read: false,
        createTime: nowStr(),
        applicationId: app.id,
      })
      message.success('拨付成功')
      setPayModal({ open: false })
      payForm.resetFields()
    })
  }

  const handleBatchPay = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要拨付的记录')
      return
    }
    Modal.confirm({
      title: '批量拨付确认',
      content: `将对选中的 ${selectedRowKeys.length} 条记录执行批量拨付，是否继续？`,
      onOk: () => {
        selectedRowKeys.forEach((id) => {
          const app = applications.find((a) => a.id === id)
          if (!app || app.status !== 'pending_payment') return
          const log = {
            id: genId('log'),
            stage: 'payment' as const,
            operator: currentUser.name,
            operatorRole: currentUser.role,
            action: 'pay' as const,
            comment: '批量拨付',
            time: nowStr(),
          }
          updateApplication(app.id, {
            status: 'paid',
            auditLogs: [...app.auditLogs, log],
          })
          addMessage({
            id: genId('msg'),
            title: '奖励资金已拨付',
            content: `您的申报 ${app.id} 奖励资金 ${formatMoney(app.approvedAmount || 0)} 已拨付`,
            type: 'payment',
            read: false,
            createTime: nowStr(),
            applicationId: app.id,
          })
        })
        message.success(`成功拨付 ${selectedRowKeys.length} 条`)
        setSelectedRowKeys([])
      },
    })
  }

  // 导出CSV
  const handleExport = () => {
    const headers = ['申报编号', '奖励类别', '旅行社', '团队/项目', '核定金额', '状态', '提交时间', '拨付时间']
    const rows = filtered.map((a) => [
      a.id,
      RewardCategoryLabels[a.category],
      a.applicantOrg,
      a.teamName || a.meetingName || '',
      a.approvedAmount || 0,
      StatusLabels[a.status],
      a.submitTime || '',
      a.auditLogs.find((l) => l.action === 'pay')?.time || '',
    ])
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `拨付清单_${nowStr().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    message.success('已导出')
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
      width: 200,
      ellipsis: true,
      render: (v: string, r: any) => v || r.meetingName || '-',
    },
    {
      title: '核定金额',
      dataIndex: 'approvedAmount',
      width: 130,
      render: (v?: number) => (v ? <span style={{ color: '#52c41a', fontWeight: 600 }}>{formatMoney(v)}</span> : '-'),
    },
    {
      title: '收款银行',
      dataIndex: 'bankName',
      width: 150,
      render: () => <Tag icon={<BankOutlined />}>默认开户行</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (s: string) => <Tag color={StatusColors[s as keyof typeof StatusColors]}>{StatusLabels[s as keyof typeof StatusLabels]}</Tag>,
    },
    {
      title: '拨付时间',
      width: 170,
      render: (_: any, r: any) => r.auditLogs.find((l: any) => l.action === 'pay')?.time || '-',
    },
    {
      title: '操作',
      width: 110,
      fixed: 'right' as const,
      render: (_: any, r: any) =>
        r.status === 'pending_payment' ? (
          <Button type="link" size="small" icon={<DollarOutlined />} onClick={() => setPayModal({ open: true, id: r.id })}>
            拨付
          </Button>
        ) : (
          <Button type="link" size="small" disabled>
            已拨付
          </Button>
        ),
    },
  ]

  return (
    <>
      <PageHeader
        title="资金拨付"
        breadcrumb={[{ title: '首页', path: '/' }, { title: '资金拨付' }]}
        extra={
          <Space>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              导出清单
            </Button>
            <Button type="primary" icon={<CheckOutlined />} onClick={handleBatchPay}>
              批量拨付
            </Button>
          </Space>
        }
      />
      <PageContainer>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="年度预算"
                value={BUDGET_TOTAL}
                suffix="万元"
                valueStyle={{ color: '#1677ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="已拨付金额"
                value={stats.paidAmount}
                precision={2}
                prefix="¥"
                valueStyle={{ color: '#52c41a' }}
              />
              <Progress
                percent={Number(((stats.paidAmount / 10000 / BUDGET_TOTAL) * 100).toFixed(1))}
                size="small"
                status="success"
                style={{ marginTop: 4 }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="待拨付金额"
                value={stats.pendingAmount}
                precision={2}
                prefix="¥"
                valueStyle={{ color: '#fa8c16' }}
              />
              <div style={{ marginTop: 4, fontSize: 12, color: '#999' }}>
                {stats.pendingCount} 笔待拨付
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="剩余预算"
                value={BUDGET_TOTAL * 10000 - stats.paidAmount - stats.pendingAmount}
                precision={2}
                prefix="¥"
                valueStyle={{ color: '#722ed1' }}
              />
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
              <Text type="secondary">已选 {selectedRowKeys.length} 项</Text>
            </Space>
          </div>
          <Table
            columns={columns}
            dataSource={filtered}
            rowKey="id"
            scroll={{ x: 1300 }}
            rowSelection={{
              selectedRowKeys,
              onChange: (keys) => setSelectedRowKeys(keys as string[]),
              getCheckboxProps: (r: any) => ({ disabled: r.status !== 'pending_payment' }),
            }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (t) => `共 ${t} 条记录`,
            }}
          />
        </Card>
      </PageContainer>

      {/* 拨付弹窗 */}
      <Modal
        title="确认拨付"
        open={payModal.open}
        onOk={handlePay}
        onCancel={() => {
          setPayModal({ open: false })
          payForm.resetFields()
        }}
        okText="确认拨付"
        cancelText="取消"
      >
        {(() => {
          const app = applications.find((a) => a.id === payModal.id)
          if (!app) return null
          return (
            <div style={{ marginBottom: 16, padding: 12, background: '#f6ffed', borderRadius: 4 }}>
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
                <Col span={12}>
                  <Text type="secondary">核定金额：</Text>
                  <Text strong style={{ color: '#fa541c', fontSize: 16 }}>
                    {formatMoney(app.approvedAmount || 0)}
                  </Text>
                </Col>
              </Row>
            </div>
          )
        })()}
        <Form form={payForm} layout="vertical">
          <Form.Item label="收款银行" name="bankName" rules={[{ required: true, message: '请输入收款银行' }]}>
            <Input placeholder="如：工商银行贵阳分行" />
          </Form.Item>
          <Form.Item label="收款账号" name="bankAccount" rules={[{ required: true, message: '请输入收款账号' }]}>
            <Input placeholder="银行账号" />
          </Form.Item>
          <Form.Item label="拨付备注" name="remark">
            <Input.TextArea rows={2} placeholder="备注信息" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
