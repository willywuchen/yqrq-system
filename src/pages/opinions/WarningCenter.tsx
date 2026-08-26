import { useState } from 'react'
import {
  Card,
  Table,
  Tag,
  Space,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Tabs,
  App,
  Tooltip,
  Typography,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import { useStore } from '../../store'
import {
  WarningLevelLabels,
  WarningLevelColors,
  OpinionSentimentLabels,
  OpinionRiskLevelLabels,
  TourismCategoryLabels,
  GUIZHOU_CITIES,
  type OpinionWarningRule,
  type OpinionWarning,
  type WarningLevel,
  type OpinionSentiment,
  type OpinionRiskLevel,
  type TourismCategory,
} from '../../types'
import { genId, nowStr } from '../../utils'

const { Text } = Typography

export default function WarningCenter() {
  const navigate = useNavigate()
  const { modal, message } = App.useApp()
  const {
    warningRules,
    warnings,
    addWarningRule,
    updateWarningRule,
    deleteWarningRule,
    handleWarning,
    currentUser,
  } = useStore()
  const [ruleForm] = Form.useForm()
  const [handleForm] = Form.useForm()
  const [ruleModal, setRuleModal] = useState<{
    open: boolean
    editingId?: string
  }>({ open: false })
  const [handleModal, setHandleModal] = useState<{ open: boolean; warningId?: string }>({ open: false })

  // ===== 预警规则 =====
  const openAddRule = () => {
    ruleForm.resetFields()
    ruleForm.setFieldsValue({
      alertLevel: 'orange',
      enabled: true,
      threshold: 1,
      windowMinutes: 60,
    })
    setRuleModal({ open: true })
  }

  const openEditRule = (rule: OpinionWarningRule) => {
    ruleForm.setFieldsValue(rule)
    setRuleModal({ open: true, editingId: rule.id })
  }

  const submitRule = async () => {
    try {
      const values = await ruleForm.validateFields()
      if (ruleModal.editingId) {
        updateWarningRule(ruleModal.editingId, values)
        message.success('规则已更新')
      } else {
        const rule: OpinionWarningRule = {
          id: genId('WR'),
          name: values.name,
          keywords: values.keywords,
          sentiment: values.sentiment,
          riskLevel: values.riskLevel,
          city: values.city,
          tourismCategory: values.tourismCategory,
          threshold: values.threshold,
          windowMinutes: values.windowMinutes,
          alertLevel: values.alertLevel,
          enabled: values.enabled ?? true,
          createdBy: currentUser.name,
          createTime: nowStr(),
        }
        addWarningRule(rule)
        message.success('规则已新增')
      }
      setRuleModal({ open: false })
    } catch (err) {
      // 校验失败
    }
  }

  const handleDeleteRule = (rule: OpinionWarningRule) => {
    modal.confirm({
      title: '确认删除规则',
      content: `确定要删除预警规则「${rule.name}」吗？`,
      okType: 'danger',
      okText: '删除',
      cancelText: '取消',
      onOk: () => {
        deleteWarningRule(rule.id)
        message.success('规则已删除')
      },
    })
  }

  const toggleRuleEnabled = (rule: OpinionWarningRule, enabled: boolean) => {
    updateWarningRule(rule.id, { enabled })
    message.success(`规则已${enabled ? '启用' : '停用'}`)
  }

  const ruleColumns = [
    { title: '规则编号', dataIndex: 'id', width: 120 },
    { title: '规则名称', dataIndex: 'name', width: 200 },
    {
      title: '预警等级',
      dataIndex: 'alertLevel',
      width: 100,
      render: (l: WarningLevel) => <Tag color={WarningLevelColors[l]}>{WarningLevelLabels[l]}</Tag>,
    },
    {
      title: '关键词',
      dataIndex: 'keywords',
      width: 220,
      render: (ks?: string[]) =>
        ks && ks.length > 0 ? (
          <Space wrap size={[4, 4]}>
            {ks.map((k) => <Tag key={k} color="geekblue">{k}</Tag>)}
          </Space>
        ) : <Text type="secondary">-</Text>,
    },
    {
      title: '情感',
      dataIndex: 'sentiment',
      width: 80,
      render: (s?: OpinionSentiment) => s ? OpinionSentimentLabels[s] : '-',
    },
    {
      title: '风险等级',
      dataIndex: 'riskLevel',
      width: 90,
      render: (r?: OpinionRiskLevel) => r ? OpinionRiskLevelLabels[r] : '-',
    },
    {
      title: '旅游类别',
      dataIndex: 'tourismCategory',
      width: 100,
      render: (c?: TourismCategory) => (c ? TourismCategoryLabels[c] : '-'),
    },
    {
      title: '阈值',
      width: 120,
      render: (_: unknown, r: OpinionWarningRule) => `${r.threshold} 条 / ${r.windowMinutes} 分钟`,
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 80,
      render: (enabled: boolean, r: OpinionWarningRule) => (
        <Switch checked={enabled} onChange={(v) => toggleRuleEnabled(r, v)} size="small" />
      ),
    },
    {
      title: '操作',
      width: 120,
      render: (_: unknown, r: OpinionWarningRule) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditRule(r)}>编辑</Button>
          <Tooltip title="删除">
            <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteRule(r)} />
          </Tooltip>
        </Space>
      ),
    },
  ]

  // ===== 预警工单处置 =====
  const openHandleWarning = (w: OpinionWarning) => {
    handleForm.resetFields()
    setHandleModal({ open: true, warningId: w.id })
  }

  const submitHandleWarning = async () => {
    if (!handleModal.warningId) return
    try {
      const values = await handleForm.validateFields()
      handleWarning(handleModal.warningId, currentUser.name, values.opinion)
      message.success('预警已处置')
      setHandleModal({ open: false })
    } catch (err) {}
  }

  const warningColumns = [
    { title: '预警编号', dataIndex: 'id', width: 120 },
    {
      title: '等级',
      dataIndex: 'alertLevel',
      width: 90,
      render: (l: WarningLevel) => <Tag color={WarningLevelColors[l]}>{WarningLevelLabels[l]}</Tag>,
    },
    { title: '规则', dataIndex: 'ruleName', width: 200 },
    { title: '触发时间', dataIndex: 'triggerTime', width: 160 },
    { title: '摘要', dataIndex: 'summary' },
    {
      title: '关联舆情',
      dataIndex: 'relatedOpinionIds',
      width: 200,
      render: (ids: string[]) =>
        ids.length > 0 ? (
          <Space wrap size={[4, 4]}>
            {ids.map((id) => (
              <a key={id} onClick={() => navigate(`/public-opinion/${id}`)}>{id}</a>
            ))}
          </Space>
        ) : <Text type="secondary">-</Text>,
    },
    {
      title: '状态',
      dataIndex: 'handled',
      width: 100,
      render: (handled: boolean) =>
        handled ? <Tag color="success">已处置</Tag> : <Tag color="warning">待处置</Tag>,
    },
    { title: '处置人', dataIndex: 'handleBy', width: 100, render: (v?: string) => v || '-' },
    {
      title: '操作',
      width: 100,
      render: (_: unknown, w: OpinionWarning) =>
        w.handled ? (
          <Text type="secondary">已处置</Text>
        ) : (
          <Button type="link" size="small" icon={<CheckCircleOutlined />} onClick={() => openHandleWarning(w)}>
            处置
          </Button>
        ),
    },
  ]

  return (
    <>
      <PageHeader
        title="风险预警中心"
        breadcrumb={[
          { title: '首页', path: '/' },
          { title: '舆情管理分析', path: '/public-opinion' },
          { title: '风险预警' },
        ]}
      />
      <PageContainer>
        <Tabs
          defaultActiveKey="warnings"
          items={[
            {
              key: 'warnings',
              label: `预警工单（${warnings.filter((w) => !w.handled).length} 待处置）`,
              children: (
                <Card size="small">
                  <Table
                    rowKey="id"
                    columns={warningColumns}
                    dataSource={warnings}
                    pagination={{ pageSize: 10 }}
                    size="small"
                    locale={{ emptyText: '暂无预警工单' }}
                  />
                </Card>
              ),
            },
            {
              key: 'rules',
              label: `预警规则（${warningRules.length} 条）`,
              children: (
                <Card
                  size="small"
                  title="预警规则配置"
                  extra={
                    <Button type="primary" icon={<PlusOutlined />} onClick={openAddRule}>
                      新增规则
                    </Button>
                  }
                >
                  <Table
                    rowKey="id"
                    columns={ruleColumns}
                    dataSource={warningRules}
                    pagination={false}
                    size="small"
                    locale={{ emptyText: '暂无预警规则' }}
                  />
                </Card>
              ),
            },
          ]}
        />
      </PageContainer>

      {/* 规则编辑弹窗 */}
      <Modal
        title={ruleModal.editingId ? '编辑预警规则' : '新增预警规则'}
        open={ruleModal.open}
        onOk={submitRule}
        onCancel={() => setRuleModal({ open: false })}
        okText="保存"
        cancelText="取消"
        width={680}
      >
        <Form form={ruleForm} layout="vertical">
          <Form.Item
            name="name"
            label="规则名称"
            rules={[{ required: true, message: '请输入规则名称' }]}
          >
            <Input placeholder="如：负面高敏感词预警" />
          </Form.Item>
          <Form.Item name="keywords" label="触发关键词（可选）" tooltip="命中任一关键词即触发，多个用回车分隔">
            <Select mode="tags" placeholder="输入关键词后按回车" tokenSeparators={[',', '，', ' ']} />
          </Form.Item>
          <Form.Item name="sentiment" label="情感倾向（可选）">
            <Select
              allowClear
              placeholder="不限"
              options={Object.entries(OpinionSentimentLabels).map(([k, v]) => ({ value: k, label: v }))}
            />
          </Form.Item>
          <Form.Item name="riskLevel" label="风险等级（可选）">
            <Select
              allowClear
              placeholder="不限"
              options={Object.entries(OpinionRiskLevelLabels).map(([k, v]) => ({ value: k, label: v }))}
            />
          </Form.Item>
          <Form.Item name="city" label="作者定位地（可选）">
            <Select
              allowClear
              placeholder="不限"
              options={GUIZHOU_CITIES.map((c) => ({ value: c, label: c }))}
            />
          </Form.Item>
          <Form.Item name="tourismCategory" label="旅游类别（可选）">
            <Select
              allowClear
              placeholder="不限"
              options={Object.entries(TourismCategoryLabels).map(([k, v]) => ({ value: k, label: v }))}
            />
          </Form.Item>
          <Form.Item label="触发阈值（条数）" required>
            <Space>
              <Form.Item name="threshold" noStyle rules={[{ required: true, message: '请输入阈值' }]}>
                <InputNumber min={1} max={9999} style={{ width: 120 }} placeholder="如 5" />
              </Form.Item>
              <Text type="secondary">条</Text>
              <Form.Item name="windowMinutes" noStyle rules={[{ required: true, message: '请输入时间窗口' }]}>
                <InputNumber min={1} max={1440} style={{ width: 120 }} placeholder="如 60" />
              </Form.Item>
              <Text type="secondary">分钟内</Text>
            </Space>
          </Form.Item>
          <Form.Item name="alertLevel" label="预警等级" rules={[{ required: true }]}>
            <Select
              options={Object.entries(WarningLevelLabels).map(([k, v]) => ({ value: k, label: v }))}
            />
          </Form.Item>
          <Form.Item name="enabled" label="启用状态" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* 预警处置弹窗 */}
      <Modal
        title="处置预警工单"
        open={handleModal.open}
        onOk={submitHandleWarning}
        onCancel={() => setHandleModal({ open: false })}
        okText="确认处置"
        cancelText="取消"
      >
        <Form form={handleForm} layout="vertical">
          <Form.Item
            name="opinion"
            label="处置意见"
            rules={[{ required: true, message: '请输入处置意见' }]}
          >
            <Input.TextArea rows={4} placeholder="请输入处置方案/转办单位/处置结果..." />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
