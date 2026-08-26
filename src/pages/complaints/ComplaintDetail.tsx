import { Card, Descriptions, Tag, Button, Steps, Timeline, Space, Divider, Empty, Typography } from 'antd'
import { ArrowLeftOutlined, EditOutlined, DownloadOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import { useStore } from '../../store'
import {
  ComplaintStatusLabels,
  ComplaintStatusColors,
  ComplaintMethodLabels,
  TourismCategoryLabels,
  ReplyStatusLabels,
  type ComplaintStatus,
} from '../../types'
import { formatFileSize } from '../../utils'

const { Paragraph, Text } = Typography

// 投诉人性别展示
const GenderLabels: Record<string, string> = {
  male: '男',
  female: '女',
  unknown: '未知',
}

export default function ComplaintDetail() {
  const navigate = useNavigate()
  const params = useParams()
  const { complaints } = useStore()

  const complaint = complaints.find((c) => c.id === params.id)

  if (!complaint) {
    return (
      <>
        <PageHeader title="投诉详情" />
        <PageContainer>
          <Empty description="未找到投诉记录" />
        </PageContainer>
      </>
    )
  }

  // 处理进度步骤
  const stepMap: Record<ComplaintStatus, number> = {
    pending: 0,
    processing: 1,
    reviewing: 2,
    replied: 3,
    closed: 4,
    not_accepted: 0,
    transferred: 1,
  }
  const currentStep = stepMap[complaint.status]
  const stepStatus: 'process' | 'error' | 'finish' =
    complaint.status === 'not_accepted' || complaint.status === 'transferred'
      ? 'error'
      : complaint.status === 'closed'
      ? 'finish'
      : 'process'

  const stepsItems = [
    { title: '待受理' },
    { title: '办理中' },
    { title: '审核中' },
    { title: '已回复' },
    { title: '已办结' },
  ]

  // 操作日志时间线颜色
  const logActionColors: Record<string, string> = {
    create: 'blue',
    edit: 'blue',
    process: 'processing',
    review: 'warning',
    reply: 'cyan',
    close: 'green',
    import: 'purple',
    export: 'purple',
    delete: 'red',
  }

  const region = [complaint.province, complaint.city, complaint.district].filter(Boolean).join(' ')

  return (
    <>
      <PageHeader
        title="投诉详情"
        breadcrumb={[
          { title: '首页', path: '/' },
          { title: '投诉台账', path: '/complaints' },
          { title: '投诉详情' },
        ]}
        extra={
          <Space>
            <Button icon={<EditOutlined />} onClick={() => navigate(`/complaints/${complaint.id}/edit`)}>
              编辑
            </Button>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
              返回
            </Button>
          </Space>
        }
      />
      <PageContainer>
        {/* 处理进度 */}
        <Card title="处理进度" size="small" style={{ marginBottom: 16 }}>
          <Steps current={currentStep} status={stepStatus} items={stepsItems} />
        </Card>

        {/* 基本信息 */}
        <Card title="基本信息" size="small" style={{ marginBottom: 16 }}>
          <Descriptions column={3} bordered size="small">
            <Descriptions.Item label="投诉编号">{complaint.id}</Descriptions.Item>
            <Descriptions.Item label="投诉标题">{complaint.title}</Descriptions.Item>
            <Descriptions.Item label="所属区域">{region || '-'}</Descriptions.Item>
            <Descriptions.Item label="投诉方式">
              <Tag color="blue">{ComplaintMethodLabels[complaint.complaintMethod]}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="投诉类别">
              <Tag color="geekblue">{TourismCategoryLabels[complaint.tourismCategory]}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="投诉时间">{complaint.complaintTime}</Descriptions.Item>
            <Descriptions.Item label="当前状态">
              <Tag color={ComplaintStatusColors[complaint.status]}>
                {ComplaintStatusLabels[complaint.status]}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="创建人">{complaint.createdBy}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{complaint.createTime}</Descriptions.Item>
            <Descriptions.Item label="更新时间" span={3}>{complaint.updateTime}</Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 投诉人信息 */}
        <Card title="投诉人信息" size="small" style={{ marginBottom: 16 }}>
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="姓名">{complaint.complainant.name}</Descriptions.Item>
            <Descriptions.Item label="性别">
              {complaint.complainant.gender ? GenderLabels[complaint.complainant.gender] : '未知'}
            </Descriptions.Item>
            <Descriptions.Item label="联系电话">{complaint.complainant.phone || '-'}</Descriptions.Item>
            <Descriptions.Item label="电子邮箱">{complaint.complainant.email || '-'}</Descriptions.Item>
            <Descriptions.Item label="联系地址" span={2}>
              {complaint.complainant.address || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="合同日期" span={2}>
              {complaint.complainant.contractDate || '-'}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 被投诉人信息 */}
        <Card title="被投诉人信息" size="small" style={{ marginBottom: 16 }}>
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="名称">{complaint.respondent.name}</Descriptions.Item>
            <Descriptions.Item label="联系电话">{complaint.respondent.phone || '-'}</Descriptions.Item>
            <Descriptions.Item label="地址" span={2}>
              {complaint.respondent.address || '-'}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 投诉内容与请求 */}
        <Card title="投诉内容与请求" size="small" style={{ marginBottom: 16 }}>
          <Divider orientation="left" plain style={{ marginTop: 0 }}>
            投诉内容
          </Divider>
          <Paragraph>{complaint.content}</Paragraph>
          <Divider orientation="left" plain>
            投诉请求
          </Divider>
          <Paragraph>{complaint.requests || '-'}</Paragraph>
        </Card>

        {/* 办理与审核 */}
        <Card title="办理与审核" size="small" style={{ marginBottom: 16 }}>
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="投诉办理人员意见">
              {complaint.handlerOpinion || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="负责人审核意见">
              {complaint.reviewerOpinion || '-'}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 回复情况 */}
        <Card title="回复情况" size="small" style={{ marginBottom: 16 }}>
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="回复状态">
              <Tag color={complaint.replyStatus === 'closed' ? 'success' : complaint.replyStatus === 'replied' ? 'cyan' : 'default'}>
                {ReplyStatusLabels[complaint.replyStatus]}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="回复时间">{complaint.replyTime || '-'}</Descriptions.Item>
            <Descriptions.Item label="回复内容" span={2}>
              {complaint.replyContent || '-'}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 附件 */}
        <Card title="附件" size="small" style={{ marginBottom: 16 }}>
          {complaint.attachments.length === 0 ? (
            <Empty description="暂无附件" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {complaint.attachments.map((file) => (
                <div
                  key={file.uid}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    border: '1px solid #f0f0f0',
                    borderRadius: 4,
                  }}
                >
                  <Space>
                    {file.title && <Tag color="blue">{file.title}</Tag>}
                    <Text>{file.name}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {formatFileSize(file.size)}
                    </Text>
                  </Space>
                  <Button
                    type="link"
                    size="small"
                    icon={<DownloadOutlined />}
                    href={file.url}
                    onClick={(e) => {
                      if (!file.url) {
                        e.preventDefault()
                      }
                    }}
                  >
                    下载
                  </Button>
                </div>
              ))}
            </Space>
          )}
        </Card>

        {/* 备注 */}
        {complaint.remark && (
          <Card title="备注" size="small" style={{ marginBottom: 16 }}>
            <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>{complaint.remark}</Paragraph>
          </Card>
        )}

        {/* 操作日志 */}
        <Card title="操作日志" size="small">
          {complaint.operationLogs.length === 0 ? (
            <Empty description="暂无操作记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <Timeline
              items={complaint.operationLogs.map((log) => ({
                color: logActionColors[log.action] || 'blue',
                children: (
                  <div>
                    <div>
                      <Text strong>{log.operator}</Text>
                      <Text type="secondary" style={{ marginLeft: 16 }}>{log.time}</Text>
                    </div>
                    <div style={{ color: '#666', marginTop: 4 }}>{log.summary}</div>
                  </div>
                ),
              }))}
            />
          )}
        </Card>
      </PageContainer>
    </>
  )
}
