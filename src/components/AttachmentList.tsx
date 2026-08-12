import { Card, Empty, Tag, Tooltip, Space } from 'antd'
import { FilePdfOutlined, FileImageOutlined, FileExcelOutlined, FileTextOutlined, PaperClipOutlined } from '@ant-design/icons'
import type { Attachment } from '../types'
import { formatFileSize } from '../utils'

const iconMap: Record<string, any> = {
  pdf: <FilePdfOutlined style={{ color: '#ff4d4f' }} />,
  jpg: <FileImageOutlined style={{ color: '#52c41a' }} />,
  png: <FileImageOutlined style={{ color: '#52c41a' }} />,
  jpeg: <FileImageOutlined style={{ color: '#52c41a' }} />,
  xlsx: <FileExcelOutlined style={{ color: '#52c41a' }} />,
  xls: <FileExcelOutlined style={{ color: '#52c41a' }} />,
  doc: <FileTextOutlined style={{ color: '#1677ff' }} />,
  docx: <FileTextOutlined style={{ color: '#1677ff' }} />,
}

function getIcon(type: string, name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || type.split('/').pop() || ''
  return iconMap[ext] || <PaperClipOutlined />
}

interface Props {
  attachments: Attachment[]
  emptyText?: string
}

export default function AttachmentList({ attachments, emptyText = '暂无附件' }: Props) {
  if (!attachments || attachments.length === 0) {
    return <Empty description={emptyText} image={Empty.PRESENTED_IMAGE_SIMPLE} />
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {attachments.map((a) => (
        <Card
          key={a.uid}
          size="small"
          style={{ background: '#fafafa' }}
          styles={{ body: { padding: '8px 12px' } }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
              {getIcon(a.type, a.name)}
              <Tooltip title={a.name}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {a.name}
                </span>
              </Tooltip>
            </div>
            <Space>
              <Tag>{formatFileSize(a.size)}</Tag>
              <span style={{ color: '#999', fontSize: 12 }}>{a.uploadTime}</span>
            </Space>
          </div>
        </Card>
      ))}
    </div>
  )
}
