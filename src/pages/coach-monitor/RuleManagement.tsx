import { useState } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Drawer,
  Form,
  Input,
  Select,
  Switch,
  InputNumber,
  Modal,
  App,
  Typography,
  Divider,
  Descriptions,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ExperimentOutlined,
} from '@ant-design/icons'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import { useStore } from '../../store'
import {
  RuleTypeLabels,
  RiskLevelLabels,
  RiskLevelColors,
  ViolationCategoryLabels,
  type RiskRule,
  type RuleType,
  type RiskLevel,
  type ViolationCategory,
} from '../../types/coach-monitor'
import { nowStr, genId } from '../../utils'

/**
 * 风险识别规则管理
 * - 仅 final_reviewer / admin 可管理（admin 默认开放）
 * - 关键词/模板/频次 三种规则
 * - 支持启停、测试
 */
export default function RuleManagement() {
  const { modal, message } = App.useApp()
  const {
    riskRules,
    addRiskRule,
    updateRiskRule,
    deleteRiskRule,
    currentUser,
  } = useStore()
  const [form] = Form.useForm()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<RiskRule | null>(null)
  const [testOpen, setTestOpen] = useState(false)
  const [testingRule, setTestingRule] = useState<RiskRule | null>(null)
  const [testText, setTestText] = useState('')
  const [testResult, setTestResult] = useState<{ hit: boolean; keywords: string[] } | null>(null)

  // 仅省级监管员 / admin 可管理规则
  const canManage = currentUser.role === 'admin' || currentUser.role === 'final_reviewer'

  // 测试规则命中
  const runTest = (rule: RiskRule, text: string) => {
    const keywords = rule.pattern.keywords || []
    const hits: string[] = []
    if (rule.ruleType === 'keyword' || rule.ruleType === 'template') {
      keywords.forEach((k) => {
        if (text.toLowerCase().includes(k.toLowerCase())) hits.push(k)
      })
    } else if (rule.ruleType === 'frequency') {
      const window = rule.pattern.windowSeconds || 60
      const minCount = rule.pattern.minCount || 3
      let count = 0
      keywords.forEach((k) => {
        const matches = text.toLowerCase().split(k.toLowerCase()).length - 1
        count += matches
      })
      if (count >= minCount) {
        hits.push(`命中频次：${count} 次 / ${window} 秒（阈值 ${minCount}）`)
      }
    }
    return { hit: hits.length > 0, keywords: hits }
  }

  const handleAdd = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({
      ruleType: 'keyword',
      riskLevel: 'medium',
      category: 'peddling',
      enabled: true,
    })
    setDrawerOpen(true)
  }

  const handleEdit = (rule: RiskRule) => {
    setEditing(rule)
    form.setFieldsValue({
      ...rule,
      keywords: rule.pattern.keywords?.join('，'),
      windowSeconds: rule.pattern.windowSeconds,
      minCount: rule.pattern.minCount,
    })
    setDrawerOpen(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const keywordsStr = (values.keywords || '').trim()
      const keywords = keywordsStr
        ? keywordsStr.split(/[，,]/).map((s: string) => s.trim()).filter(Boolean)
        : []

      const pattern: RiskRule['pattern'] = {
        keywords,
        ...(values.windowSeconds ? { windowSeconds: values.windowSeconds } : {}),
        ...(values.minCount ? { minCount: values.minCount } : {}),
      }

      if (editing) {
        updateRiskRule(editing.ruleId, {
          ruleName: values.ruleName,
          ruleType: values.ruleType,
          pattern,
          riskLevel: values.riskLevel,
          category: values.category,
          enabled: values.enabled,
        })
        message.success('规则已更新')
      } else {
        const newRule: RiskRule = {
          ruleId: `R${genId('').slice(-6)}`,
          ruleName: values.ruleName,
          ruleType: values.ruleType,
          pattern,
          riskLevel: values.riskLevel,
          category: values.category,
          enabled: values.enabled,
          hitCount: 0,
          createdBy: currentUser.name,
          createTime: nowStr(),
          updateTime: nowStr(),
        }
        addRiskRule(newRule)
        message.success('已新增规则')
      }
      setDrawerOpen(false)
    } catch {
      // 校验失败
    }
  }

  const handleDelete = (rule: RiskRule) => {
    modal.confirm({
      title: '删除规则',
      content: `确认删除规则「${rule.ruleName}」吗？`,
      okType: 'danger',
      okText: '删除',
      cancelText: '取消',
      onOk: () => {
        deleteRiskRule(rule.ruleId)
        message.success('已删除规则')
      },
    })
  }

  const handleToggle = (rule: RiskRule, enabled: boolean) => {
    updateRiskRule(rule.ruleId, { enabled })
    message.success(`规则已${enabled ? '启用' : '停用'}`)
  }

  const handleTest = (rule: RiskRule) => {
    setTestingRule(rule)
    setTestText('')
    setTestResult(null)
    setTestOpen(true)
  }

  const runTestAction = () => {
    if (!testingRule || !testText.trim()) {
      message.warning('请输入测试文本')
      return
    }
    setTestResult(runTest(testingRule, testText))
  }

  const columns = [
    { title: '规则编号', dataIndex: 'ruleId', width: 100 },
    { title: '规则名称', dataIndex: 'ruleName', width: 180 },
    {
      title: '类型',
      dataIndex: 'ruleType',
      width: 100,
      render: (t: RuleType) => <Tag color="blue">{RuleTypeLabels[t]}</Tag>,
    },
    {
      title: '违规类别',
      dataIndex: 'category',
      width: 110,
      render: (c: ViolationCategory) => ViolationCategoryLabels[c],
    },
    {
      title: '风险等级',
      dataIndex: 'riskLevel',
      width: 90,
      render: (l: RiskLevel) => <Tag color={RiskLevelColors[l]}>{RiskLevelLabels[l]}</Tag>,
    },
    {
      title: '关键词/模板',
      dataIndex: 'pattern',
      ellipsis: true,
      width: 240,
      render: (p: RiskRule['pattern']) => {
        const ks = p.keywords || []
        if (ks.length === 0) return '-'
        return ks.map((k) => (
          <Tag key={k} style={{ margin: '0 4px 2px 0' }}>
            {k}
          </Tag>
        ))
      },
    },
    {
      title: '命中数',
      dataIndex: 'hitCount',
      width: 80,
      render: (n?: number) => (n ?? 0),
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 90,
      render: (enabled: boolean, r: RiskRule) =>
        canManage ? (
          <Switch checked={enabled} onChange={(v) => handleToggle(r, v)} size="small" />
        ) : (
          <Tag color={enabled ? 'success' : 'default'}>{enabled ? '启用' : '停用'}</Tag>
        ),
    },
    {
      title: '操作',
      width: 220,
      render: (_: unknown, r: RiskRule) => (
        <Space>
          <Button type="link" size="small" icon={<ExperimentOutlined />} onClick={() => handleTest(r)}>
            测试
          </Button>
          {canManage && (
            <>
              <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)}>
                编辑
              </Button>
              <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(r)}>
                删除
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="风险识别规则"
        breadcrumb={[
          { title: '首页', path: '/' },
          { title: '旅游包车智慧监管', path: '/coach-monitor' },
          { title: '风险识别规则' },
        ]}
        extra={
          canManage && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新增规则
            </Button>
          )
        }
      />
      <PageContainer>
        <Card size="small" style={{ margin: 0 }}>
          <Table
            columns={columns}
            dataSource={riskRules}
            rowKey="ruleId"
            scroll={{ x: 1400 }}
            pagination={{ pageSize: 10, showSizeChanger: true }}
          />
        </Card>
      </PageContainer>

      <Drawer
        title={editing ? '编辑规则' : '新增规则'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={520}
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button type="primary" onClick={handleSubmit}>
              保存
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item name="ruleName" label="规则名称" rules={[{ required: true, message: '请输入规则名称' }]}>
            <Input placeholder="如：疑似兜售商品" />
          </Form.Item>
          <Form.Item name="ruleType" label="规则类型" rules={[{ required: true }]}>
            <Select
              options={Object.entries(RuleTypeLabels).map(([k, v]) => ({ value: k, label: v }))}
            />
          </Form.Item>
          <Form.Item name="category" label="违规类别" rules={[{ required: true }]}>
            <Select
              options={Object.entries(ViolationCategoryLabels).map(([k, v]) => ({ value: k, label: v }))}
            />
          </Form.Item>
          <Form.Item name="riskLevel" label="风险等级" rules={[{ required: true }]}>
            <Select
              options={Object.entries(RiskLevelLabels).map(([k, v]) => ({ value: k, label: v }))}
            />
          </Form.Item>
          <Form.Item
            name="keywords"
            label="关键词（多个用逗号分隔）"
            rules={[{ required: true, message: '请输入至少一个关键词' }]}
          >
            <Input.TextArea
              rows={3}
              placeholder="如：特产, 限量, 最后机会, 特价, 先到先得"
            />
          </Form.Item>
          <Form.Item name="windowSeconds" label="时间窗口（秒，仅频次规则）">
            <InputNumber min={1} placeholder="如：60" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="minCount" label="最小命中次数（仅频次规则）">
            <InputNumber min={1} placeholder="如：3" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="enabled" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Drawer>

      <Modal
        title={`测试规则 - ${testingRule?.ruleName || ''}`}
        open={testOpen}
        onCancel={() => setTestOpen(false)}
        onOk={runTestAction}
        okText="运行测试"
        cancelText="关闭"
        width={640}
      >
        {testingRule && (
          <div>
            <Descriptions size="small" column={1} style={{ marginBottom: 12 }}>
              <Descriptions.Item label="类型">
                {RuleTypeLabels[testingRule.ruleType]}
              </Descriptions.Item>
              <Descriptions.Item label="关键词">
                {(testingRule.pattern.keywords || []).map((k) => (
                  <Tag key={k} color="blue" style={{ margin: '0 4px 2px 0' }}>
                    {k}
                  </Tag>
                ))}
              </Descriptions.Item>
              {testingRule.ruleType === 'frequency' && (
                <Descriptions.Item label="频次配置">
                  {testingRule.pattern.minCount} 次 / {testingRule.pattern.windowSeconds} 秒
                </Descriptions.Item>
              )}
            </Descriptions>
            <Divider />
            <Typography.Paragraph strong>输入测试文本：</Typography.Paragraph>
            <Input.TextArea
              rows={5}
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              placeholder="请输入要测试的语音文字稿文本..."
            />
            {testResult && (
              <div style={{ marginTop: 16 }}>
                <Typography.Paragraph strong>测试结果：</Typography.Paragraph>
                {testResult.hit ? (
                  <div>
                    <Tag color="red">命中</Tag>
                    {testResult.keywords.map((k) => (
                      <Tag key={k} color="red" style={{ margin: '0 4px 2px 0' }}>
                        {k}
                      </Tag>
                    ))}
                  </div>
                ) : (
                  <Tag color="default">未命中</Tag>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  )
}
