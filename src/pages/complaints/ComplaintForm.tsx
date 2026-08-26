import { useEffect, useState } from 'react'
import {
  Form,
  Input,
  Select,
  DatePicker,
  Cascader,
  Button,
  Card,
  Space,
  Upload,
  Tag,
  App,
  Row,
  Col,
  type UploadFile,
} from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import { useStore } from '../../store'
import {
  type Complaint,
  type ComplaintMethod,
  ComplaintMethodLabels,
  type TourismCategory,
  TourismCategoryLabels,
  type ComplaintStatus,
  ComplaintStatusLabels,
  type ReplyStatus,
  ReplyStatusLabels,
  GUIZHOU_REGION_OPTIONS,
  type Attachment,
} from '../../types'
import { nowStr } from '../../utils'

const { TextArea } = Input

interface Props {
  mode: 'new' | 'edit'
}

export default function ComplaintForm({ mode }: Props) {
  const navigate = useNavigate()
  const params = useParams()
  const { message } = App.useApp()
  const { complaints, addComplaint, updateComplaint, currentUser } = useStore()
  const [form] = Form.useForm()
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [submitting, setSubmitting] = useState(false)

  const editingId = mode === 'edit' ? params.id : undefined
  const editingComplaint = editingId ? complaints.find((c) => c.id === editingId) : undefined

  useEffect(() => {
    if (editingComplaint) {
      form.setFieldsValue({
        title: editingComplaint.title,
        region: [editingComplaint.province, editingComplaint.city, editingComplaint.district].filter(
          Boolean,
        ),
        complaintMethod: editingComplaint.complaintMethod,
        tourismCategory: editingComplaint.tourismCategory,
        complaintTime: editingComplaint.complaintTime
          ? dayjs(editingComplaint.complaintTime)
          : undefined,
        status: editingComplaint.status,
        complainantName: editingComplaint.complainant.name,
        complainantGender: editingComplaint.complainant.gender,
        complainantPhone: editingComplaint.complainant.phone,
        complainantEmail: editingComplaint.complainant.email,
        complainantAddress: editingComplaint.complainant.address,
        contractDate: editingComplaint.complainant.contractDate
          ? dayjs(editingComplaint.complainant.contractDate)
          : undefined,
        respondentName: editingComplaint.respondent.name,
        respondentAddress: editingComplaint.respondent.address,
        respondentPhone: editingComplaint.respondent.phone,
        content: editingComplaint.content,
        requests: editingComplaint.requests,
        handlerOpinion: editingComplaint.handlerOpinion,
        reviewerOpinion: editingComplaint.reviewerOpinion,
        replyStatus: editingComplaint.replyStatus,
        replyTime: editingComplaint.replyTime ? dayjs(editingComplaint.replyTime) : undefined,
        replyContent: editingComplaint.replyContent,
        remark: editingComplaint.remark,
      })
      setAttachments(editingComplaint.attachments || [])
    } else {
      form.setFieldsValue({
        region: ['贵州省'],
        status: 'pending',
        replyStatus: 'none',
      })
    }
  }, [editingComplaint, form])

  // 生成投诉编号：TS-YYYYMMDD-XXXX
  const generateComplaintId = () => {
    const now = new Date()
    const y = now.getFullYear().toString()
    const m = (now.getMonth() + 1).toString().padStart(2, '0')
    const d = now.getDate().toString().padStart(2, '0')
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    return `TS-${y}${m}${d}-${random}`
  }

  const handleSubmit = () => {
    form
      .validateFields()
      .then((values) => {
        setSubmitting(true)
        const now = nowStr()

        // 从区域级联选择器中提取省、市州、区县（各级均可只选到任意一级）
        const regionValue = (values.region as string[]) || []
        const province = regionValue[0] || '贵州省'
        const city = regionValue[1] || ''
        const district = regionValue[2] || undefined

        const complaintData: Complaint = {
          id: editingComplaint?.id || generateComplaintId(),
          title: values.title,
          province,
          city,
          district,
          complaintMethod: values.complaintMethod as ComplaintMethod,
          tourismCategory: values.tourismCategory as TourismCategory,
          complaintTime: values.complaintTime ? values.complaintTime.format('YYYY-MM-DD') : '',
          status: values.status as ComplaintStatus,
          complainant: {
            name: values.complainantName,
            gender: values.complainantGender,
            phone: values.complainantPhone,
            email: values.complainantEmail,
            address: values.complainantAddress,
            contractDate: values.contractDate
              ? values.contractDate.format('YYYY-MM-DD')
              : undefined,
          },
          respondent: {
            name: values.respondentName,
            address: values.respondentAddress,
            phone: values.respondentPhone,
          },
          content: values.content,
          requests: values.requests,
          handlerOpinion: values.handlerOpinion,
          reviewerOpinion: values.reviewerOpinion,
          // 表单已不再维护"是否转案件"，保留原记录值避免编辑时丢失历史数据
          isTransferredToCase: editingComplaint?.isTransferredToCase || false,
          suspectedIssue: editingComplaint?.suspectedIssue,
          replyStatus: values.replyStatus as ReplyStatus,
          replyTime: values.replyTime ? values.replyTime.format('YYYY-MM-DD') : undefined,
          replyContent: values.replyContent,
          attachments,
          remark: values.remark,
          createdBy: editingComplaint?.createdBy || currentUser.name,
          createTime: editingComplaint?.createTime || now,
          updateTime: now,
          operationLogs: editingComplaint
            ? [
                ...editingComplaint.operationLogs,
                {
                  id: Date.now().toString(),
                  operator: currentUser.name,
                  action: 'edit',
                  summary: '编辑投诉信息',
                  time: now,
                },
              ]
            : [
                {
                  id: Date.now().toString(),
                  operator: currentUser.name,
                  action: 'create',
                  summary: '录入投诉信息',
                  time: now,
                },
              ],
        }

        if (editingComplaint) {
          updateComplaint(editingComplaint.id, complaintData)
          message.success('投诉信息已更新')
        } else {
          addComplaint(complaintData)
          message.success('投诉信息已创建')
        }
        setSubmitting(false)
        navigate('/complaints')
      })
      .catch(() => {
        message.error('请完善必填项后再提交')
      })
  }

  const handleCancel = () => {
    navigate('/complaints')
  }

  return (
    <>
      <PageHeader
        title={mode === 'new' ? '新增投诉' : '编辑投诉'}
        breadcrumb={[
          { title: '首页', path: '/' },
          { title: '投诉台账', path: '/complaints' },
          { title: mode === 'new' ? '新增投诉' : '编辑投诉' },
        ]}
        extra={
          mode === 'edit' && editingComplaint ? (
            <Tag color="blue">{ComplaintStatusLabels[editingComplaint.status]}</Tag>
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
                  label="投诉标题"
                  rules={[
                    { required: true, message: '请输入投诉标题' },
                    { max: 100, message: '标题不能超过100个字符' },
                  ]}
                >
                  <Input placeholder="请输入投诉标题" maxLength={100} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="region"
                  label="区域"
                  rules={[{ required: true, message: '请选择区域' }]}
                >
                  <Cascader
                    options={GUIZHOU_REGION_OPTIONS}
                    placeholder="请选择区域（省/市州/区县）"
                    changeOnSelect
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={24}>
              <Col span={12}>
                <Form.Item
                  name="complaintMethod"
                  label="投诉方式"
                  rules={[{ required: true, message: '请选择投诉方式' }]}
                >
                  <Select placeholder="请选择投诉方式">
                    {Object.entries(ComplaintMethodLabels).map(([value, label]) => (
                      <Select.Option key={value} value={value}>
                        {label}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="tourismCategory"
                  label="投诉类别"
                  rules={[{ required: true, message: '请选择投诉类别' }]}
                >
                  <Select placeholder="请选择投诉类别">
                    {Object.entries(TourismCategoryLabels).map(([value, label]) => (
                      <Select.Option key={value} value={value}>
                        {label}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={24}>
              <Col span={12}>
                <Form.Item
                  name="complaintTime"
                  label="投诉时间"
                  rules={[{ required: true, message: '请选择投诉时间' }]}
                >
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* Section 2 - 投诉人信息 */}
          <Card title="投诉人信息" style={{ marginBottom: 16 }}>
            <Row gutter={24}>
              <Col span={12}>
                <Form.Item
                  name="complainantName"
                  label="姓名"
                  rules={[{ required: true, message: '请输入投诉人姓名' }]}
                >
                  <Input placeholder="请输入投诉人姓名" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="complainantGender" label="性别">
                  <Select placeholder="请选择性别" allowClear>
                    <Select.Option value="male">男</Select.Option>
                    <Select.Option value="female">女</Select.Option>
                    <Select.Option value="unknown">未知</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={24}>
              <Col span={12}>
                <Form.Item name="complainantPhone" label="联系电话">
                  <Input placeholder="请输入联系电话" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="complainantEmail" label="电子邮箱">
                  <Input placeholder="请输入电子邮箱" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={24}>
              <Col span={12}>
                <Form.Item name="complainantAddress" label="联系地址">
                  <Input placeholder="请输入联系地址" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="contractDate" label="合同日期">
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* Section 3 - 被投诉人信息 */}
          <Card title="被投诉人信息" style={{ marginBottom: 16 }}>
            <Row gutter={24}>
              <Col span={12}>
                <Form.Item
                  name="respondentName"
                  label="名称"
                  rules={[{ required: true, message: '请输入被投诉人名称' }]}
                >
                  <Input placeholder="请输入被投诉人名称" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="respondentPhone" label="联系电话">
                  <Input placeholder="请输入联系电话" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={24}>
              <Col span={24}>
                <Form.Item name="respondentAddress" label="地址">
                  <Input placeholder="请输入地址" />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* Section 4 - 投诉内容与请求 */}
          <Card title="投诉内容与请求" style={{ marginBottom: 16 }}>
            <Form.Item
              name="content"
              label="投诉内容"
              rules={[
                { required: true, message: '请输入投诉内容' },
                { max: 2000, message: '投诉内容不能超过2000个字符' },
              ]}
            >
              <TextArea rows={5} placeholder="请输入投诉内容" maxLength={2000} showCount />
            </Form.Item>
            <Form.Item name="requests" label="投诉请求">
              <TextArea rows={3} placeholder="请输入投诉请求" />
            </Form.Item>
          </Card>

          {/* Section 5 - 办理与审核 */}
          <Card title="办理与审核" style={{ marginBottom: 16 }}>
            <Form.Item name="handlerOpinion" label="投诉办理人员意见">
              <TextArea rows={3} placeholder="请输入投诉办理人员意见" />
            </Form.Item>
            <Form.Item name="reviewerOpinion" label="负责人审核意见">
              <TextArea rows={3} placeholder="请输入负责人审核意见" />
            </Form.Item>
          </Card>

          {/* Section 6 - 回复情况 */}
          <Card title="回复情况" style={{ marginBottom: 16 }}>
            <Row gutter={24}>
              <Col span={12}>
                <Form.Item name="replyStatus" label="回复状态">
                  <Select>
                    {Object.entries(ReplyStatusLabels).map(([value, label]) => (
                      <Select.Option key={value} value={value}>
                        {label}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="replyTime" label="回复时间">
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="replyContent" label="回复内容">
              <TextArea rows={3} placeholder="请输入回复内容" />
            </Form.Item>
          </Card>

          {/* Section 7 - 附件与备注 */}
          <Card title="附件与备注" style={{ marginBottom: 16 }}>
            <Form.Item label="附件">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Upload
                  beforeUpload={(file) => {
                    const att: Attachment = {
                      uid: Date.now().toString(),
                      name: file.name,
                      size: file.size,
                      type: file.type || file.name.split('.').pop() || '',
                      uploadTime: nowStr(),
                    }
                    setAttachments((prev) => [...prev, att])
                    message.success(`${file.name} 上传成功`)
                    return false
                  }}
                  onRemove={(file) => {
                    setAttachments((prev) => prev.filter((a) => a.uid !== file.uid))
                  }}
                  fileList={
                    attachments.map((a) => ({
                      uid: a.uid,
                      name: a.name,
                      status: 'done' as const,
                      size: a.size,
                      type: a.type,
                    })) as unknown as UploadFile[]
                  }
                  multiple
                >
                  <Button icon={<UploadOutlined />}>上传附件</Button>
                </Upload>
                {attachments.length > 0 && (
                  <Tag color="blue">{attachments.length} 个附件</Tag>
                )}
              </Space>
            </Form.Item>
            <Form.Item name="remark" label="备注">
              <TextArea rows={3} placeholder="请输入备注信息" />
            </Form.Item>
          </Card>

          {/* Section 8 - 办理状态（最后填写） */}
          <Card title="办理状态" style={{ marginBottom: 16 }}>
            <Row gutter={24}>
              <Col span={12}>
                <Form.Item
                  name="status"
                  label="办理状态"
                  rules={[{ required: true, message: '请选择办理状态' }]}
                >
                  <Select placeholder="请选择办理状态">
                    {Object.entries(ComplaintStatusLabels).map(([value, label]) => (
                      <Select.Option key={value} value={value}>
                        {label}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* 底部按钮 */}
          <div style={{ textAlign: 'center', marginTop: 16, marginBottom: 16 }}>
            <Space size="large">
              <Button type="primary" loading={submitting} onClick={handleSubmit}>
                保存
              </Button>
              <Button onClick={handleCancel}>取消</Button>
            </Space>
          </div>
        </Form>
      </PageContainer>
    </>
  )
}
