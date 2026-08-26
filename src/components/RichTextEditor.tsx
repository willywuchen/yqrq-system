import { useEffect, useRef, useState } from 'react'
import { App, Button, Input, Modal, Tooltip, Upload } from 'antd'
import {
  BoldOutlined,
  ClearOutlined,
  ItalicOutlined,
  OrderedListOutlined,
  PictureOutlined,
  StrikethroughOutlined,
  UnderlineOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'

interface Props {
  value?: string
  onChange?: (html: string) => void
  placeholder?: string
  minHeight?: number
}

// 工具栏命令配置（不含回调，避免渲染期闭包访问 ref）
const TOOLBAR_COMMANDS: { icon: React.ReactNode; title: string; command: string }[] = [
  { icon: <BoldOutlined />, title: '加粗', command: 'bold' },
  { icon: <ItalicOutlined />, title: '斜体', command: 'italic' },
  { icon: <UnderlineOutlined />, title: '下划线', command: 'underline' },
  { icon: <StrikethroughOutlined />, title: '删除线', command: 'strikeThrough' },
  { icon: <UnorderedListOutlined />, title: '无序列表', command: 'insertUnorderedList' },
  { icon: <OrderedListOutlined />, title: '有序列表', command: 'insertOrderedList' },
  { icon: <ClearOutlined />, title: '清除格式', command: 'removeFormat' },
]

// 轻量图文编辑器：基于 contentEditable，支持加粗/斜体/下划线/删除线/列表/图文混排
// value 为 HTML 字符串；图片支持网络地址插入和本地图片（转 base64 内联）
export default function RichTextEditor({ value, onChange, placeholder, minHeight = 200 }: Props) {
  const { message } = App.useApp()
  const editorRef = useRef<HTMLDivElement>(null)
  const [imageModal, setImageModal] = useState({ open: false, url: '' })

  // 外部值变化时同步到编辑器（如编辑回填），避免输入过程中光标跳动
  useEffect(() => {
    const el = editorRef.current
    if (el && value !== undefined && value !== el.innerHTML) {
      el.innerHTML = value
    }
  }, [value])

  const emitChange = () => {
    const el = editorRef.current
    if (el && onChange) onChange(el.innerHTML)
  }

  // 工具栏命令：onMouseDown 阻止默认行为以保留选区
  const exec = (command: string, arg?: string) => {
    editorRef.current?.focus()
    document.execCommand(command, false, arg)
    emitChange()
  }

  const insertImage = (src: string) => {
    if (!src) return
    exec('insertHTML', `<img src="${src}" style="max-width:100%" />`)
  }

  const handleLocalImage = (file: File) => {
    if (!file.type.startsWith('image/')) {
      message.warning('仅支持插入图片文件')
      return false
    }
    if (file.size > 2 * 1024 * 1024) {
      message.warning('图片不能超过 2MB，请压缩后重试')
      return false
    }
    const reader = new FileReader()
    reader.onload = () => insertImage(String(reader.result))
    reader.readAsDataURL(file)
    return false
  }

  return (
    <div style={{ border: '1px solid #d9d9d9', borderRadius: 6, background: '#fff' }}>
      <div
        style={{
          padding: '4px 8px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        {TOOLBAR_COMMANDS.map((btn) => (
          <Tooltip key={btn.title} title={btn.title}>
            <Button
              type="text"
              size="small"
              icon={btn.icon}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => exec(btn.command)}
            />
          </Tooltip>
        ))}
        <Tooltip title="插入网络图片">
          <Button
            type="text"
            size="small"
            icon={<PictureOutlined />}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setImageModal({ open: true, url: '' })}
          />
        </Tooltip>
        <Tooltip title="插入本地图片（不超过2MB）">
          <Upload accept="image/*" showUploadList={false} beforeUpload={handleLocalImage}>
            <Button type="text" size="small" icon={<PictureOutlined />} onMouseDown={(e) => e.preventDefault()} />
          </Upload>
        </Tooltip>
      </div>
      <div
        ref={editorRef}
        className="rich-text-editor-empty"
        contentEditable
        suppressContentEditableWarning
        onInput={emitChange}
        onBlur={emitChange}
        data-placeholder={placeholder}
        style={{
          minHeight,
          maxHeight: 480,
          overflowY: 'auto',
          padding: '8px 12px',
          outline: 'none',
          fontSize: 14,
          lineHeight: 1.8,
          wordBreak: 'break-word',
        }}
      />
      <Modal
        title="插入网络图片"
        open={imageModal.open}
        okText="插入"
        cancelText="取消"
        onOk={() => {
          insertImage(imageModal.url.trim())
          setImageModal({ open: false, url: '' })
        }}
        onCancel={() => setImageModal({ open: false, url: '' })}
      >
        <Input
          placeholder="请输入图片地址，如 https://..."
          value={imageModal.url}
          onChange={(e) => setImageModal((s) => ({ ...s, url: e.target.value }))}
        />
      </Modal>
    </div>
  )
}

// 富文本工具：提取纯文本（校验、导出、列表搜索用）
// oxlint-disable-next-line only-export-components
export function richTextToPlain(html: string | undefined | null): string {
  if (!html) return ''
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
}

// 是否包含 HTML 标签（区分历史纯文本数据与富文本数据）
// oxlint-disable-next-line only-export-components
export function isRichTextHtml(content: string | undefined | null): boolean {
  return /<[a-z][^>]*>/i.test(content || '')
}
