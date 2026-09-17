// 投诉管理处置模块 - 共享组件与工具
import { useEffect, useState } from 'react'
import { App, Form, Image, Input, Modal, Tag, Typography } from 'antd'
import { ClockCircleOutlined } from '@ant-design/icons'
import type { DisposalComplaint } from '../../types/complaint-disposal'
import {
  ElapsedLevelColors,
  elapsedLevel,
  elapsedMsOf,
  formatElapsed,
  respondentDisplay,
} from '../../types/complaint-disposal'
import { useStore } from '../../store'

// 每分钟刷新的当前时间戳：驱动「接收后动态计时」展示（分钟级变化，30秒轮询保证及时）
// oxlint-disable-next-line only-export-components
export function useTick(intervalMs = 30000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
  return now
}

// 动态耗时展示：待处置持续计时；已处置冻结为「处置耗时」（处置即停止计时）
export function ElapsedTime({ complaint, now }: { complaint: DisposalComplaint; now: number }) {
  const ms = elapsedMsOf(complaint, now)
  const color = ElapsedLevelColors[elapsedLevel(ms)]
  return (
    <span style={{ color, fontWeight: 500, whiteSpace: 'nowrap' }}>
      <ClockCircleOutlined style={{ marginRight: 4 }} />
      {complaint.status === 'disposed' ? `处置耗时 ${formatElapsed(ms)}` : formatElapsed(ms)}
    </span>
  )
}

// 督办标记：展示督办（催办）次数
export function SupervisionTag({ complaint }: { complaint: DisposalComplaint }) {
  const count = complaint.supervisions.length
  if (count <= 0) return <span style={{ color: '#bfbfbf' }}>—</span>
  return <Tag color="red">已督办 ×{count}</Tag>
}

// 市州简称（用于图表坐标轴等窄幅展示）
// oxlint-disable-next-line only-export-components
export function shortCityName(city: string): string {
  return city.replace(/市$/, '').replace(/(苗族侗族自治州|布依族苗族自治州)/, '')
}

// 附件占位图（演示数据仅登记文件名；正式开发由后端返回真实文件地址后直接替换 src）
// 按扩展名区分图标：图片类显示相机图标，文档类显示文件图标
function evidencePlaceholderUrl(name: string): string {
  const safe = name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const isDoc = /\.(pdf|docx?|xlsx?|txt|csv)$/i.test(name)
  const cameraIcon =
    '<g fill="none" stroke="#bfbfbf" stroke-width="5" stroke-linejoin="round"><rect x="170" y="130" width="140" height="96" rx="8"/><circle cx="240" cy="176" r="24"/><path d="M198 130l12-18h60l12 18"/></g>'
  const docIcon =
    '<g fill="none" stroke="#bfbfbf" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"><path d="M210 118h48l26 26v90a8 8 0 0 1-8 8h-66a8 8 0 0 1-8-8v-108a8 8 0 0 1 8-8z"/><path d="M258 118v26h26"/><path d="M220 186h40M220 206h40"/></g>'
  const icon = isDoc ? docIcon : cameraIcon
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360"><rect width="480" height="360" fill="#fafafa"/><rect x="14" y="14" width="452" height="332" fill="none" stroke="#e8e8e8" stroke-width="2" stroke-dasharray="6 4"/>${icon}<text x="240" y="278" font-size="18" fill="#8c8c8c" text-anchor="middle" font-family="PingFang SC, sans-serif">${safe}</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

// 凭证图片墙：点击缩略图可放大查看
export function EvidenceGallery({ evidences }: { evidences: string[] }) {
  if (!evidences || evidences.length === 0) {
    return <Typography.Text type="secondary">无</Typography.Text>
  }
  return (
    <Image.PreviewGroup>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {evidences.map((name) => (
          <Image
            key={name}
            src={evidencePlaceholderUrl(name)}
            alt={name}
            width={72}
            height={72}
            style={{ objectFit: 'cover', borderRadius: 6, border: '1px solid #f0f0f0' }}
            preview={{
              mask: (
                <span style={{ fontSize: 12, padding: '0 4px', wordBreak: 'break-all' }}>
                  查看
                  <br />
                  {name}
                </span>
              ),
            }}
          />
        ))}
      </div>
    </Image.PreviewGroup>
  )
}

// 省文旅厅督办弹窗（列表页与详情页共用）：填写督办意见，向市州追加一条督办记录
export function SuperviseModal({
  open,
  complaint,
  onClose,
}: {
  open: boolean
  complaint: DisposalComplaint | null
  onClose: () => void
}) {
  const [form] = Form.useForm()
  const { superviseDisposalComplaint } = useStore()
  const { message } = App.useApp()

  const close = () => {
    onClose()
    form.resetFields()
  }

  const handleOk = async () => {
    if (!complaint) return
    const values = await form.validateFields()
    superviseDisposalComplaint(complaint.id, values.note)
    message.success(`已向${complaint.city}文旅局发出督办`)
    close()
  }

  if (!complaint) return null

  return (
    <Modal
      open={open}
      title="发起督办"
      okText="确认督办"
      cancelText="取消"
      onOk={handleOk}
      onCancel={close}
      destroyOnClose
    >
      <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
        将向 <b>{complaint.city}</b> 文旅局发出督办提醒（编号 {complaint.id}，
        投诉对象：{respondentDisplay(complaint)}），督办记录将同步显示在该投诉详情及区县/市州处置工作台。
      </Typography.Paragraph>
      <Form form={form} layout="vertical">
        <Form.Item
          name="note"
          label="督办意见"
          rules={[
            { required: true, message: '请填写督办意见' },
            { max: 200, message: '督办意见不超过200字' },
          ]}
        >
          <Input.TextArea
            rows={4}
            maxLength={200}
            showCount
            placeholder="请填写督办意见，如：请尽快核查处置并向厅反馈处理情况"
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
