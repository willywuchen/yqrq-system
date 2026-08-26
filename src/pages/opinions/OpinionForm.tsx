import { useEffect, useState } from 'react'
import {
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Card,
  Space,
  Row,
  Col,
  Tag,
  App,
} from 'antd'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import RichTextEditor, { richTextToPlain } from '../../components/RichTextEditor'
import { useStore } from '../../store'
import {
  OpinionDataSourceLabels,
  OpinionRiskLevelLabels,
  OpinionHandleStatusLabels,
  OpinionHandleStatusColors,
  TourismCategoryLabels,
  GUIZHOU_CITIES,
  type PublicOpinion,
  type OpinionHandleStatus,
  type OpinionHandleLog,
} from '../../types'
import { genId, nowStr } from '../../utils'

const { TextArea } = Input

interface Props {
  mode: 'new' | 'edit'
}

// 主流来源网站预设
const SOURCE_WEBSITE_PRESETS = [
  '微博',
  '小红书',
  '抖音',
  '哔哩哔哩',
  '知乎',
  '百度贴吧',
  '微信公众号',
  '马蜂窝',
  '携程',
  '美团',
  '大众点评',
  '飞猪',
  '去哪儿',
  '黑猫投诉',
  '12345热线',
  'TripAdvisor',
  '央视新闻',
  '腾讯新闻',
  '网易新闻',
  '新浪新闻',
]

const COMMON_KEYWORDS = [
  '宰客', '强制消费', '强制购物', '价格虚高', '退款', '维权',
  '排队', '拥堵', '限流', '承载量', '卫生', '厕所', '安全', '事故',
  '食物中毒', '强制推销', '服务态度', '导游', '景区', '酒店', '民宿',
  '旅行社', '交通', '出租车', '停车', '门票', '正面', '好评', '差评',
]

export default function OpinionForm({ mode }: Props) {
  const navigate = useNavigate()
  const params = useParams()
  const { message } = App.useApp()
  const {
    publicOpinions,
    addOpinion,
    updateOpinion,
    appendOpinionLog,
    setOpinionStatus,
    currentUser,
  } = useStore()
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  // 编辑模式下当前选择的处理类型，用于控制处理描述的显隐
  const [handleStatus, setHandleStatus] = useState<OpinionHandleStatus>('pending')

  const editingId = mode === 'edit' ? params.id : undefined
  const editingOpinion = editingId
    ? publicOpinions.find((o) => o.id === editingId)
    : undefined

  useEffect(() => {
    if (editingOpinion) {
      form.setFieldsValue({
        title: editingOpinion.title,
        author: editingOpinion.author,
        authorLocation: editingOpinion.authorLocation,
        keywords: editingOpinion.keywords,
        sourceWebsite: editingOpinion.sourceWebsite,
        sourceUrl: editingOpinion.sourceUrl,
        content: editingOpinion.content,
        publishTime: editingOpinion.publishTime
          ? dayjs(editingOpinion.publishTime)
          : undefined,
        dataSource: editingOpinion.dataSource,
        tourismCategory: editingOpinion.tourismCategory,
        riskLevel: editingOpinion.riskLevel,
        involvedSubjects: editingOpinion.involvedSubjects,
        remark: editingOpinion.remark,
        handleStatus: editingOpinion.handleStatus,
      })
      setHandleStatus(editingOpinion.handleStatus)
    } else {
      form.resetFields()
      form.setFieldsValue({
        dataSource: 'manual_entry',
        riskLevel: 'medium',
        authorLocation: '贵阳市',
      })
    }
  }, [editingOpinion, form])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)

      const publishTime = dayjs.isDayjs(values.publishTime)
        ? values.publishTime.format('YYYY-MM-DD HH:mm:ss')
        : values.publishTime
      const now = nowStr()

      if (mode === 'new') {
        const id = `PO-${dayjs().format('YYYYMMDD')}-${genId('').slice(-4)}`
        const log: OpinionHandleLog = {
          id: genId('LOG'),
          operator: currentUser.name,
          action: 'create',
          toStatus: 'pending',
          opinion: `手动新增舆情，风险等级=${OpinionRiskLevelLabels[values.riskLevel]}`,
          time: now,
        }
        const opinion: PublicOpinion = {
          id,
          title: values.title,
          author: values.author,
          authorLocation: values.authorLocation,
          keywords: values.keywords || [],
          sourceWebsite: values.sourceWebsite,
          sourceUrl: values.sourceUrl,
          content: values.content,
          publishTime,
          dataSource: values.dataSource,
          tourismCategory: values.tourismCategory,
          sentiment: 'neutral',
          riskLevel: values.riskLevel,
          handleStatus: 'pending',
          involvedSubjects: values.involvedSubjects || [],
          attachments: [],
          remark: values.remark,
          createdBy: currentUser.name,
          createTime: now,
          updateTime: now,
          handleLogs: [log],
        }
        addOpinion(opinion)
        message.success(`舆情新增成功，编号：${id}`)
        navigate(`/public-opinion/${id}`)
      } else if (editingOpinion) {
        updateOpinion(editingOpinion.id, {
          title: values.title,
          author: values.author,
          authorLocation: values.authorLocation,
          keywords: values.keywords || [],
          sourceWebsite: values.sourceWebsite,
          sourceUrl: values.sourceUrl,
          content: values.content,
          publishTime,
          dataSource: values.dataSource,
          tourismCategory: values.tourismCategory,
          riskLevel: values.riskLevel,
          involvedSubjects: values.involvedSubjects || [],
          remark: values.remark,
        })
        const editLog: OpinionHandleLog = {
          id: genId('LOG'),
          operator: currentUser.name,
          action: 'edit',
          opinion: '编辑舆情信息',
          time: now,
        }
        appendOpinionLog(editingOpinion.id, editLog)

        // 处置：处理类型变化时更新状态并记录日志；已处理必须填写处理描述（表单校验保证）
        const newStatus: OpinionHandleStatus = values.handleStatus
        const handleDesc = (values.handleDescription || '').trim()
        if (newStatus !== editingOpinion.handleStatus) {
          let action: OpinionHandleLog['action'] = 'edit'
          if (newStatus === 'pending') action = 'reopen'
          else if (newStatus === 'processing') action = 'process'
          else if (newStatus === 'handled') action = 'handle'
          const log: OpinionHandleLog = {
            id: genId('LOG'),
            operator: currentUser.name,
            action,
            fromStatus: editingOpinion.handleStatus,
            toStatus: newStatus,
            opinion: handleDesc || `处置状态变更为${OpinionHandleStatusLabels[newStatus]}`,
            time: now,
          }
          setOpinionStatus(editingOpinion.id, newStatus, log)
        } else if (handleDesc) {
          appendOpinionLog(editingOpinion.id, {
            id: genId('LOG'),
            operator: currentUser.name,
            action: 'edit',
            opinion: `处置说明：${handleDesc}`,
            time: now,
          })
        }
        message.success('舆情信息已更新')
        navigate(`/public-opinion/${editingOpinion.id}`)
      }
    } catch (err) {
      // 校验失败由 antd 处理；其余异常输出到控制台便于排查
      console.error('OpinionForm 提交异常', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    navigate(-1)
  }

  return (
    <>
      <PageHeader
        title={mode === 'new' ? '新增舆情' : '编辑舆情'}
        breadcrumb={[
          { title: '首页', path: '/' },
          { title: '舆情管理', path: '/public-opinion' },
          { title: mode === 'new' ? '新增舆情' : '编辑舆情' },
        ]}
        extra={
          editingOpinion ? (
            <Tag color={OpinionHandleStatusColors[editingOpinion.handleStatus]}>
              {OpinionHandleStatusLabels[editingOpinion.handleStatus]}
            </Tag>
          ) : (
            <Tag color="default">新增</Tag>
          )
        }
      />
      <PageContainer>
        <Form form={form} layout="vertical">
          {/* Section 1 - 基本信息 */}
          <Card title="基本信息" style={{ marginBottom: 16 }}>
            <Row gutter={24}>
              <Col span={12}>
                <Form.Item
                  name="title"
                  label="舆情标题"
                  rules={[
                    { required: true, message: '请输入舆情标题' },
                    { max: 100, message: '标题不能超过100字符' },
                  ]}
                >
                  <Input placeholder="请输入舆情标题" maxLength={100} showCount />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="author"
                  label="作者"
                  rules={[
                    { required: true, message: '请输入作者' },
                    { max: 50, message: '作者不能超过50字符' },
                  ]}
                >
                  <Input placeholder="如：微博用户 xxx" maxLength={50} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="authorLocation"
                  label="作者定位地"
                  rules={[{ required: true, message: '请选择作者定位地' }]}
                >
                  <Select
                    placeholder="请选择"
                    showSearch
                    options={GUIZHOU_CITIES.map((c) => ({ value: c, label: c }))}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="keywords"
                  label="关键字"
                  rules={[{ required: true, message: '请至少输入1个关键字' }]}
                  tooltip="支持多个关键字标签，可输入后按回车添加"
                >
                  <Select
                    mode="tags"
                    placeholder="输入关键字后按回车，或从下拉常用词选择"
                    tokenSeparators={[',', '，', ' ']}
                    options={COMMON_KEYWORDS.map((k) => ({ value: k, label: k }))}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="sourceWebsite"
                  label="来源网站"
                  rules={[{ required: true, message: '请输入或选择来源网站' }]}
                >
                  <Select
                    showSearch
                    placeholder="请选择或输入"
                    options={SOURCE_WEBSITE_PRESETS.map((s) => ({ value: s, label: s }))}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="publishTime"
                  label="发布时间"
                  rules={[{ required: true, message: '请选择发布时间' }]}
                >
                  <DatePicker
                    showTime
                    style={{ width: '100%' }}
                    placeholder="请选择发布时间"
                    disabledDate={(current) => current && current > dayjs().endOf('day')}
                  />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item
                  name="sourceUrl"
                  label="原地址"
                  rules={[
                    { required: true, message: '请输入原文地址' },
                    { type: 'url', message: '请输入合法的URL，如 https://...' },
                  ]}
                >
                  <Input placeholder="https://..." />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item
                  name="content"
                  label="舆情内容"
                  rules={[
                    {
                      required: true,
                      validator: (_, value) => {
                        const plain = richTextToPlain(value)
                        if (!plain) return Promise.reject(new Error('请输入舆情内容'))
                        if (plain.length > 5000) return Promise.reject(new Error('内容不能超过5000字符'))
                        return Promise.resolve()
                      },
                    },
                  ]}
                >
                  <RichTextEditor
                    placeholder="请输入舆情正文内容，支持图文混排（可加粗、列表、插入图片等）"
                    minHeight={220}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* Section 2 - 分类与风险 */}
          <Card title="分类与风险" style={{ marginBottom: 16 }}>
            <Row gutter={24}>
              <Col span={8}>
                <Form.Item
                  name="dataSource"
                  label="数据来源"
                  rules={[{ required: true, message: '请选择数据来源' }]}
                >
                  <Select
                    options={Object.entries(OpinionDataSourceLabels).map(([k, v]) => ({
                      value: k,
                      label: v,
                    }))}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="tourismCategory"
                  label="旅游类别"
                  rules={[{ required: true, message: '请选择旅游类别' }]}
                >
                  <Select
                    options={Object.entries(TourismCategoryLabels).map(([k, v]) => ({
                      value: k,
                      label: v,
                    }))}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="riskLevel"
                  label="风险等级"
                  rules={[{ required: true, message: '请选择风险等级' }]}
                >
                  <Select
                    options={Object.entries(OpinionRiskLevelLabels).map(([k, v]) => ({
                      value: k,
                      label: v,
                    }))}
                  />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="involvedSubjects" label="涉及主体" tooltip="涉及的旅行社/景区/酒店/导游等，多个用回车分隔">
                  <Select
                    mode="tags"
                    placeholder="输入主体名称后按回车添加"
                    tokenSeparators={[',', '，', ' ']}
                  />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="remark" label="备注">
                  <TextArea rows={2} placeholder="备注信息" maxLength={500} showCount />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* Section 3 - 舆情处置（仅编辑时可对舆情进行处置） */}
          {mode === 'edit' && (
            <Card title="舆情处置" style={{ marginBottom: 16 }}>
              <Row gutter={24}>
                <Col span={8}>
                  <Form.Item
                    name="handleStatus"
                    label="处理类型"
                    rules={[{ required: true, message: '请选择处理类型' }]}
                  >
                    <Select
                      placeholder="请选择处理类型"
                      onChange={(v: OpinionHandleStatus) => setHandleStatus(v)}
                      options={Object.entries(OpinionHandleStatusLabels).map(([k, v]) => ({
                        value: k,
                        label: v,
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col span={16}>
                  {handleStatus === 'handled' && (
                    <Form.Item
                      name="handleDescription"
                      label="处理描述"
                      rules={[
                        { required: true, message: '处理类型为已处理时，必须填写处理描述' },
                        { max: 500, message: '处理描述不能超过500字符' },
                      ]}
                    >
                      <TextArea
                        rows={2}
                        placeholder="请输入处理结果、整改说明等处理描述"
                        maxLength={500}
                        showCount
                      />
                    </Form.Item>
                  )}
                </Col>
              </Row>
            </Card>
          )}

          {/* 操作区 */}
          <Card>
            <Space>
              <Button type="primary" icon={<SaveOutlined />} loading={submitting} onClick={handleSubmit}>
                {mode === 'new' ? '提交新增' : '保存修改'}
              </Button>
              <Button icon={<ArrowLeftOutlined />} onClick={handleCancel}>
                取消
              </Button>
            </Space>
          </Card>
        </Form>
      </PageContainer>
    </>
  )
}
