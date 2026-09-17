// 投诉详情页：区县/市州文旅局在此提交处置（处置后计时停止）；省文旅厅查看并可发起督办
// 排版：左栏「投诉信息」→「提交处置」（本辖区待处置时）；右栏「处置记录」时间轴独立呈现
import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import {
  App,
  AutoComplete,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  Result,
  Row,
  Space,
  Tag,
  Timeline,
  Typography,
  Upload,
} from 'antd'
import type { UploadFile } from 'antd'
import { ClockCircleOutlined, UploadOutlined, WarningOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import { useStore } from '../../store'
import {
  DisposalCategoryLabels,
  DisposalComplaintSourceColors,
  DisposalComplaintSourceLabels,
  DisposalResultLabels,
  DisposalStatusColors,
  DisposalStatusLabels,
  ElapsedLevelColors,
  cityOfOrg,
  disposalResultText,
  districtOfOrg,
  elapsedLevel,
  elapsedMsOf,
  formatElapsed,
  respondentDisplay,
  type DisposalComplaint,
} from '../../types/complaint-disposal'
import { EvidenceGallery, SuperviseModal, useTick } from './shared'

const labelStyle: CSSProperties = { color: 'rgba(0,0,0,0.45)', fontSize: 13, marginBottom: 4 }
const timeStyle: CSSProperties = { color: '#8c8c8c', fontSize: 12, marginBottom: 2 }

// 顶部状态条单格
function StatusCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      {children}
    </div>
  )
}

interface TimelineEntry {
  key: string
  time: string
  color: string
  children: ReactNode
}

// 处置记录时间轴条目：每条按 时间 / 标题 / 内容 三行结构展示，按时间正序排列
function buildTimelineEntries(complaint: DisposalComplaint): TimelineEntry[] {
  const dispatchOrg = `${complaint.city}${complaint.district ?? ''}文旅局`
  const entries: TimelineEntry[] = [
    {
      key: 'received',
      time: complaint.receivedAt,
      color: 'blue',
      children: (
        <div>
          <div style={timeStyle}>{complaint.receivedAt}</div>
          <div style={{ fontWeight: 600 }}>投诉接收</div>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            游客提交投诉，自动分派至{dispatchOrg}
          </Typography.Paragraph>
        </div>
      ),
    },
    ...complaint.supervisions.map((s) => ({
      key: s.id,
      time: s.time,
      color: 'red',
      children: (
        <div>
          <div style={timeStyle}>{s.time}</div>
          <div style={{ fontWeight: 600 }}>
            {s.supervisorOrg} {s.supervisor} 发起督办
          </div>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
            {s.note}
          </Typography.Paragraph>
        </div>
      ),
    })),
  ]
  const d = complaint.disposal
  if (complaint.status === 'disposed' && d) {
    entries.push({
      key: 'disposed',
      time: d.disposedAt,
      color: 'green',
      children: (
        <div>
          <div style={timeStyle}>{d.disposedAt}</div>
          <div style={{ fontWeight: 600 }}>处置完成 · {disposalResultText(d.result)}</div>
          <Typography.Paragraph style={{ marginBottom: 4, whiteSpace: 'pre-wrap' }}>
            {d.description}
          </Typography.Paragraph>
          <Typography.Text type="secondary">
            处置人：{d.handler}（{d.handlerOrg}）
          </Typography.Text>
          {d.attachments && d.attachments.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ color: '#8c8c8c', fontSize: 12, marginBottom: 6 }}>佐证附件（点击查看）</div>
              <EvidenceGallery evidences={d.attachments} />
            </div>
          )}
        </div>
      ),
    })
  }
  return entries.sort((a, b) => a.time.localeCompare(b.time))
}

export default function DisposalDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { modal, message } = App.useApp()
  const { currentUser, disposalComplaints, disposeDisposalComplaint } = useStore()
  const [form] = Form.useForm<{ result: string; description: string; attachments?: UploadFile[] }>()
  const now = useTick()

  // 督办弹窗（省级视角）
  const [superviseOpen, setSuperviseOpen] = useState(false)

  const complaint = disposalComplaints.find((c) => c.id === id)

  if (!complaint) {
    return (
      <>
        <PageHeader
          title="投诉详情"
          breadcrumb={[{ title: '投诉处置管理' }, { title: '投诉详情' }]}
        />
        <PageContainer>
          <Result
            status="404"
            title="投诉不存在"
            subTitle={`未找到编号为 ${id} 的投诉，可能已被删除或编号有误。`}
            extra={
              <Button type="primary" onClick={() => navigate('/complaint-disposal')}>
                返回列表
              </Button>
            }
          />
        </PageContainer>
      </>
    )
  }

  const isBureau = currentUser.role === 'city_bureau' || currentUser.role === 'district_bureau'
  // 处置范围：市州文旅局 → 本市州全部（含区县）；区县文旅局 → 仅本区县
  const districtScope = currentUser.role === 'district_bureau' ? districtOfOrg(currentUser.org) : null
  const myCity = districtScope?.city ?? cityOfOrg(currentUser.org)
  const myDistrict = districtScope?.district
  const canDispose =
    isBureau &&
    complaint.city === myCity &&
    (!districtScope || complaint.district === myDistrict) &&
    complaint.status === 'pending'
  const canSupervise = !isBureau && complaint.status === 'pending'

  const ms = elapsedMsOf(complaint, now)
  const elapsedColor = ElapsedLevelColors[elapsedLevel(ms)]
  const timelineEntries = buildTimelineEntries(complaint)

  // 市州提交处置：二次确认后写入处置记录，计时停止
  const handleSubmit = async () => {
    const values = await form.validateFields()
    modal.confirm({
      title: '确认完成处置？',
      icon: <WarningOutlined />,
      content: (
        <div>
          <p style={{ margin: '4px 0' }}>
            处置结果：<b>{values.result}</b>
          </p>
          <p style={{ margin: '4px 0' }}>
            提交后投诉状态将变更为「已处置」，动态计时停止（当前已计时 {formatElapsed(ms)}）。
          </p>
        </div>
      ),
      okText: '确认处置',
      cancelText: '再检查一下',
      onOk: () => {
        const attachments = (values.attachments ?? []).map((f) => f.name)
        disposeDisposalComplaint(complaint.id, values.result, values.description, attachments)
        message.success('处置完成，计时已停止')
      },
    })
  }

  return (
    <>
      <PageHeader
        title={complaint.id}
        breadcrumb={[
          { title: '投诉处置管理' },
          { title: isBureau ? '处置工作台' : '全省投诉', path: '/complaint-disposal' },
          { title: '投诉详情' },
        ]}
        extra={
          <Space>
            {canSupervise && (
              <Button danger onClick={() => setSuperviseOpen(true)}>
                发起督办
              </Button>
            )}
            <Button onClick={() => navigate('/complaint-disposal')}>返回列表</Button>
          </Space>
        }
      />
      <PageContainer>
        {/* 状态条 */}
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            <Col xs={12} md={3}>
              <StatusCell label="当前状态">
                <Tag
                  color={DisposalStatusColors[complaint.status]}
                  style={{ fontSize: 14, padding: '2px 10px', marginInlineEnd: 0 }}
                >
                  {DisposalStatusLabels[complaint.status]}
                </Tag>
              </StatusCell>
            </Col>
            <Col xs={12} md={3}>
              <StatusCell label="来源">
                <Tag
                  color={DisposalComplaintSourceColors[complaint.source]}
                  style={{ fontSize: 13, marginInlineEnd: 0 }}
                >
                  {DisposalComplaintSourceLabels[complaint.source]}
                </Tag>
              </StatusCell>
            </Col>
            <Col xs={12} md={3}>
              <StatusCell label="所属市州">
                <span style={{ fontSize: 15 }}>{complaint.city}</span>
              </StatusCell>
            </Col>
            <Col xs={12} md={3}>
              <StatusCell label="所属区县">
                <span style={{ fontSize: 15 }}>
                  {complaint.district ?? <span style={{ color: '#bfbfbf' }}>未指定</span>}
                </span>
              </StatusCell>
            </Col>
            <Col xs={12} md={4}>
              <StatusCell label="接收时间">
                <span style={{ fontSize: 15 }}>{complaint.receivedAt}</span>
              </StatusCell>
            </Col>
            <Col xs={12} md={4}>
              <StatusCell
                label={complaint.status === 'disposed' ? '处置耗时（已停止计时）' : '接收后已计时（动态）'}
              >
                <span style={{ color: elapsedColor, fontSize: 20, fontWeight: 600 }}>
                  <ClockCircleOutlined style={{ marginRight: 6 }} />
                  {formatElapsed(ms)}
                </span>
              </StatusCell>
            </Col>
            <Col xs={12} md={4}>
              <StatusCell label="督办次数">
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 600,
                    color: complaint.supervisions.length > 0 ? '#ff4d4f' : undefined,
                  }}
                >
                  {complaint.supervisions.length}
                </span>
              </StatusCell>
            </Col>
          </Row>
        </Card>

        <Row gutter={16}>
          {/* 左栏：投诉信息 → 提交处置 */}
          <Col xs={24} lg={14}>
            <Card title="投诉信息" style={{ marginBottom: 16 }}>
              <Descriptions column={2} size="small" bordered>
                <Descriptions.Item label="投诉类型">
                  <Space size={4} wrap>
                    {complaint.categories.map((cat) => (
                      <Tag key={cat}>{DisposalCategoryLabels[cat]}</Tag>
                    ))}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="投诉人">
                  <Space size={8}>
                    {complaint.complainantName}
                    {complaint.isAnonymous && <Tag>匿名投诉</Tag>}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="联系电话">{complaint.complainantPhone}</Descriptions.Item>
                <Descriptions.Item label="所属市州">{complaint.city}</Descriptions.Item>
                <Descriptions.Item label="所属区县">
                  {complaint.district ?? <span style={{ color: '#bfbfbf' }}>未指定</span>}
                </Descriptions.Item>
                <Descriptions.Item label="投诉对象">
                  {respondentDisplay(complaint)}
                  {complaint.source === 'group_code' && (
                    <Tag color="purple" style={{ marginLeft: 8 }}>
                      一团一码自动带入
                    </Tag>
                  )}
                </Descriptions.Item>
                {complaint.source === 'group_code' && (
                  <>
                    <Descriptions.Item label="投诉对象旅行社">
                      {complaint.agencyName ?? '—'}
                    </Descriptions.Item>
                    <Descriptions.Item label="投诉对象导游">
                      {complaint.guideName ?? '—'}
                    </Descriptions.Item>
                    <Descriptions.Item label="团号" span={2}>
                      {complaint.groupNo ?? '—'}
                    </Descriptions.Item>
                  </>
                )}
                <Descriptions.Item label="投诉内容与诉求" span={2}>
                  <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                    {complaint.content}
                  </Typography.Paragraph>
                </Descriptions.Item>
                <Descriptions.Item label="凭证图片" span={2}>
                  <EvidenceGallery evidences={complaint.evidences} />
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {canDispose && (
              <Card title="提交处置" style={{ marginBottom: 16 }}>
                <Form form={form} layout="vertical">
                  <Form.Item
                    name="result"
                    label="处置结果"
                    rules={[{ required: true, message: '请选择或输入处置结果' }]}
                  >
                    <AutoComplete
                      options={Object.values(DisposalResultLabels).map((l) => ({ value: l }))}
                      placeholder="点击选择，或直接输入自定义处置结果"
                      filterOption={(input, option) =>
                        String(option?.value ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                    />
                  </Form.Item>
                  <Form.Item
                    name="description"
                    label="处置说明"
                    rules={[
                      { required: true, message: '请填写处置说明' },
                      { max: 500, message: '处置说明不超过500字' },
                    ]}
                  >
                    <Input.TextArea
                      rows={5}
                      maxLength={500}
                      showCount
                      placeholder="请填写核实情况、处理过程与结果（将同步至省文旅厅）"
                    />
                  </Form.Item>
                  <Form.Item
                    name="attachments"
                    label="佐证附件（非必填）"
                    valuePropName="fileList"
                    getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
                    extra="支持图片、PDF、Word、Excel 等，最多 5 个"
                  >
                    <Upload multiple maxCount={5} beforeUpload={() => false} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx">
                      <Button icon={<UploadOutlined />}>上传附件</Button>
                    </Upload>
                  </Form.Item>
                  <Button type="primary" block onClick={handleSubmit}>
                    提交处置
                  </Button>
                </Form>
              </Card>
            )}
          </Col>

          {/* 右栏：处置记录时间轴独立呈现 */}
          <Col xs={24} lg={10}>
            <Card title="处置记录">
              <Timeline
                style={{ marginTop: 4 }}
                items={timelineEntries.map((it) => ({
                  key: it.key,
                  color: it.color,
                  children: it.children,
                }))}
              />
            </Card>
          </Col>
        </Row>
      </PageContainer>

      <SuperviseModal open={superviseOpen} complaint={complaint} onClose={() => setSuperviseOpen(false)} />
    </>
  )
}
