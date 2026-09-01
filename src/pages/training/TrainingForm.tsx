import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  App,
  Button,
  Card,
  Divider,
  Form,
  Input,
  Radio,
  Result,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
  Upload,
} from 'antd'
import {
  DeleteOutlined,
  ExperimentOutlined,
  InboxOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import RichTextEditor, { richTextToPlain } from '../../components/RichTextEditor'
import { useStore } from '../../store'
import { formatFileSize, genId, nowStr } from '../../utils'
import {
  isTrainingManagerRole,
  TrainingLevelLabels,
  TRAINING_UPLOAD_LIMITS,
  type TrainingLevel,
  type TrainingMaterialStatus,
  type TrainingMediaType,
} from '../../types/training'
import type { Attachment } from '../../types'
import {
  MOCK_TRAINING_AUDIO_URL,
  MOCK_TRAINING_VIDEO_URL,
} from '../../mock/training'
import { formatDuration } from './shared'

const { Text } = Typography

const { Dragger } = Upload

// 已选媒体文件（演示环境：本地文件转 blob URL，刷新后需重新选择）
interface MediaFile {
  url: string
  name: string
  size: number
  duration?: number
}

// 读取媒体时长（秒），失败返回 0
function readMediaDuration(url: string, kind: 'video' | 'audio'): Promise<number> {
  return new Promise((resolve) => {
    const el = document.createElement(kind)
    el.preload = 'metadata'
    el.src = url
    el.onloadedmetadata = () => resolve(Math.round(el.duration) || 0)
    el.onerror = () => resolve(0)
  })
}

// 封面图压缩为 dataURL（避免大图写爆 localStorage 持久化）
function fileToCompressedCover(file: File, maxWidth = 800): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width)
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.onerror = reject
      img.src = String(reader.result)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * 资料新建/编辑页（PRD §5.2）
 * 元数据区 + 按形式动态切换的内容区（图文富文本 / 视频上传 / 音频上传）
 */
export default function TrainingForm({ mode }: { mode: 'new' | 'edit' }) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { modal, message } = App.useApp()
  const {
    trainingCategories,
    trainingMaterials,
    addTrainingMaterial,
    updateTrainingMaterial,
    currentUser,
  } = useStore()
  const [form] = Form.useForm()

  const isManager = isTrainingManagerRole(currentUser.role)
  const editing = mode === 'edit' ? trainingMaterials.find((m) => m.id === id) : undefined

  const [mediaType, setMediaType] = useState<TrainingMediaType>('rich_text')
  const [richText, setRichText] = useState('')
  const [media, setMedia] = useState<MediaFile | null>(null)
  const [cover, setCover] = useState<{ url: string; name: string } | null>(null)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [dirty, setDirty] = useState(false)
  const loadedRef = useRef(false)

  // 编辑回填（仅首次加载）
  useEffect(() => {
    if (mode !== 'edit' || loadedRef.current) return
    loadedRef.current = true
    if (!editing) return
    form.setFieldsValue({
      title: editing.title,
      categoryId: editing.categoryId,
      level: editing.level,
      summary: editing.summary,
      source: editing.source,
      isTop: editing.isTop,
      isPublicToAgency: editing.isPublicToAgency,
    })
    setMediaType(editing.mediaType)
    setRichText(editing.content || '')
    if (editing.mediaType === 'video' && editing.videoUrl) {
      setMedia({
        url: editing.videoUrl,
        name: '已上传视频.mp4',
        size: 0,
        duration: editing.videoDuration,
      })
    }
    if (editing.mediaType === 'audio' && editing.audioUrl) {
      setMedia({
        url: editing.audioUrl,
        name: '已上传音频.mp3',
        size: 0,
        duration: editing.audioDuration,
      })
    }
    if (editing.coverUrl) setCover({ url: editing.coverUrl, name: '已设置封面' })
    setAttachments(editing.attachments || [])
  }, [mode, editing?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // 无权限：提示并重定向（路由守卫，PRD §5.2 边界条件）
  useEffect(() => {
    if (!isManager) message.warning('无权限访问该页面')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 离开保护：浏览器刷新/关闭
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  if (!isManager) return <Navigate to="/training" replace />
  if (mode === 'edit' && !editing) {
    return (
      <Result
        status="404"
        title="该资料不存在或已删除"
        extra={
          <Button type="primary" onClick={() => navigate('/training')}>
            返回文库发布
          </Button>
        }
      />
    )
  }

  // 已发布资料不允许编辑：只能下架后编辑，再重新发布（编辑前状态）
  const editingStatus = editing?.status
  if (mode === 'edit' && editingStatus === 'published') {
    return (
      <Result
        status="info"
        title="该资料已发布，不可编辑"
        subTitle="如需修改内容，请先在文库发布列表将其下架，下架后编辑并重新发布"
        extra={
          <Button type="primary" onClick={() => navigate('/training')}>
            返回文库发布
          </Button>
        }
      />
    )
  }

  // 分类选项：启用中的分类；编辑时所属分类已停用则额外带入并标注
  const enabledCategories = [...trainingCategories]
    .filter((c) => c.status === 'enabled')
    .sort((a, b) => a.sort - b.sort)
  const categoryOptions = [...enabledCategories]
  if (editing) {
    const own = trainingCategories.find((c) => c.id === editing.categoryId)
    if (own && own.status === 'disabled' && !categoryOptions.some((c) => c.id === own.id)) {
      categoryOptions.push(own)
    }
  }

  const hasContentEntered =
    mediaType === 'rich_text' ? !!richTextToPlain(richText).trim() : !!media?.url

  // 切换资料形式：已有内容时二次确认（PRD §5.2 交互细节）
  const applyMediaType = (next: TrainingMediaType) => {
    setMediaType(next)
    setRichText('')
    setMedia(null)
    setDirty(true)
  }
  const handleMediaTypeChange = (next: TrainingMediaType) => {
    if (next === mediaType) return
    if (hasContentEntered) {
      modal.confirm({
        title: '切换资料形式',
        content: '切换资料形式将清空已录入的内容，确认切换？',
        okText: '确认切换',
        cancelText: '取消',
        onOk: () => applyMediaType(next),
      })
    } else {
      applyMediaType(next)
    }
  }

  // ===== 上传处理 =====
  const handleMediaFile = async (file: File, kind: 'video' | 'audio') => {
    const exts = kind === 'video' ? ['.mp4', '.mov'] : ['.mp3', '.m4a', '.wav']
    const maxMB = kind === 'video' ? TRAINING_UPLOAD_LIMITS.videoMaxMB : TRAINING_UPLOAD_LIMITS.audioMaxMB
    const label = kind === 'video' ? '视频' : '音频'
    if (!exts.some((e) => file.name.toLowerCase().endsWith(e))) {
      message.error(`仅支持 ${exts.join('、')} 格式${label}，请转换后重试`)
      return false
    }
    if (file.size > maxMB * 1024 * 1024) {
      message.error(`${label}不超过 ${maxMB}MB，请压缩后重试`)
      return false
    }
    const url = URL.createObjectURL(file)
    const duration = await readMediaDuration(url, kind)
    setMedia({ url, name: file.name, size: file.size, duration })
    setDirty(true)
    return false
  }

  const fillDemoMedia = (kind: 'video' | 'audio') => {
    if (kind === 'video') {
      setMedia({ url: MOCK_TRAINING_VIDEO_URL, name: '演示视频.mp4', size: 10 * 1024 * 1024, duration: 1420 })
    } else {
      setMedia({ url: MOCK_TRAINING_AUDIO_URL, name: '演示音频.mp3', size: 4 * 1024 * 1024, duration: 372 })
    }
    setDirty(true)
  }

  const handleCoverFile = async (file: File) => {
    if (!['.jpg', '.jpeg', '.png'].some((e) => file.name.toLowerCase().endsWith(e))) {
      message.error('封面仅支持 jpg、png 格式')
      return false
    }
    if (file.size > TRAINING_UPLOAD_LIMITS.coverMaxMB * 1024 * 1024) {
      message.error(`封面图片不超过 ${TRAINING_UPLOAD_LIMITS.coverMaxMB}MB，请压缩后重试`)
      return false
    }
    const dataUrl = await fileToCompressedCover(file)
    setCover({ url: dataUrl, name: file.name })
    setDirty(true)
    return false
  }

  const handleAttachmentFile = (file: File) => {
    const exts = ['.pdf', '.doc', '.docx', '.xlsx']
    if (!exts.some((e) => file.name.toLowerCase().endsWith(e))) {
      message.error('附件仅支持 pdf、doc、docx、xlsx 格式')
      return false
    }
    if (attachments.length >= TRAINING_UPLOAD_LIMITS.attachmentMaxCount) {
      message.error(`附件最多 ${TRAINING_UPLOAD_LIMITS.attachmentMaxCount} 个`)
      return false
    }
    if (file.size > TRAINING_UPLOAD_LIMITS.attachmentMaxMB * 1024 * 1024) {
      message.error(`附件不超过 ${TRAINING_UPLOAD_LIMITS.attachmentMaxMB}MB，请压缩后重试`)
      return false
    }
    setAttachments((prev) => [
      ...prev,
      {
        uid: genId('att'),
        name: file.name,
        size: file.size,
        type: file.name.split('.').pop()?.toLowerCase() || '',
        uploadTime: nowStr(),
      },
    ])
    setDirty(true)
    return false
  }

  // ===== 保存 =====
  // 状态流转：发布 → published；保存 → 保持原状态（新建则为草稿），符合 PRD §3.3 状态机
  const handleSave = async (target: 'save' | 'publish') => {
    const willPublish = target === 'publish'
    const keepStatus: TrainingMaterialStatus = editing ? editing.status : 'draft'
    const nextStatus: TrainingMaterialStatus = willPublish ? 'published' : keepStatus
    // 发布时全量校验；草稿/已下架保存仅校验标题（PRD §5.2）
    const strict = willPublish
    try {
      if (strict) await form.validateFields()
      else await form.validateFields(['title'])
    } catch {
      return
    }
    const values = form.getFieldsValue()
    if (strict) {
      if (mediaType === 'rich_text' && !richTextToPlain(richText).trim()) {
        message.warning('请录入图文内容')
        return
      }
      if (mediaType === 'video' && !media?.url) {
        message.warning('请上传视频文件')
        return
      }
      if (mediaType === 'audio' && !media?.url) {
        message.warning('请上传音频文件')
        return
      }
      const cat = trainingCategories.find((c) => c.id === values.categoryId)
      if (cat?.status === 'disabled') {
        message.error('所属分类已停用，请重新选择分类')
        return
      }
    }
    const now = nowStr()
    const contentPayload = {
      title: values.title.trim(),
      categoryId: values.categoryId,
      level: values.level as TrainingLevel,
      mediaType,
      summary: values.summary?.trim() || undefined,
      source: values.source?.trim() || undefined,
      isTop: !!values.isTop,
      isPublicToAgency: !!values.isPublicToAgency,
      coverUrl: cover?.url,
      content: mediaType === 'rich_text' ? richText : undefined,
      videoUrl: mediaType === 'video' ? media?.url : undefined,
      videoDuration: mediaType === 'video' ? media?.duration : undefined,
      audioUrl: mediaType === 'audio' ? media?.url : undefined,
      audioDuration: mediaType === 'audio' ? media?.duration : undefined,
      attachments,
    }
    if (mode === 'new') {
      addTrainingMaterial({
        id: genId('mat'),
        ...contentPayload,
        status: nextStatus,
        viewCount: 0,
        publishTime: willPublish ? now : undefined,
        createBy: currentUser.name,
        createTime: now,
      })
    } else if (editing) {
      updateTrainingMaterial(editing.id, {
        ...contentPayload,
        status: nextStatus,
        publishTime: willPublish ? now : editing.publishTime,
        updateBy: currentUser.name,
        updateTime: now,
      })
    }
    message.success(
      willPublish
        ? '已发布' + (values.isPublicToAgency ? '，涉旅企业侧即时可见' : '，未向涉旅企业公开、仅文旅厅内部可见')
        : nextStatus === 'offline'
          ? '已保存，资料仍为已下架状态'
          : '已保存为草稿，可在管理列表继续编辑',
    )
    navigate('/training')
  }

  const handleCancel = () => {
    if (dirty) {
      modal.confirm({
        title: '离开确认',
        content: '当前内容尚未保存，离开后将丢失，确认离开？',
        okText: '确认离开',
        cancelText: '继续编辑',
        onOk: () => navigate('/training'),
      })
    } else {
      navigate('/training')
    }
  }

  const saveButtonLabel = editingStatus === 'offline' ? '保 存' : '保存为草稿'

  return (
    <>
      <PageHeader
        title={mode === 'new' ? '新建资料' : '编辑资料'}
        breadcrumb={[
          { title: '首页', path: '/' },
          { title: '文库管理' },
          { title: '文库发布', path: '/training' },
          { title: mode === 'new' ? '新建资料' : '编辑资料' },
        ]}
      />
      <PageContainer>
        {editingStatus === 'offline' && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="该资料已下架，保存后仍为下架状态；点击「重新发布」可恢复对涉旅企业可见"
          />
        )}

        <Card>
          <Form
            form={form}
            layout="vertical"
            initialValues={{ level: 'departmental', isTop: false, isPublicToAgency: true }}
            onValuesChange={() => setDirty(true)}
            style={{ maxWidth: 860 }}
          >
            <Divider orientation="left" plain>
              基本信息
            </Divider>
            <Form.Item
              name="title"
              label="标题"
              rules={[
                { required: true, message: '请输入标题' },
                { max: 60, message: '标题不超过 60 字' },
              ]}
            >
              <Input maxLength={60} showCount placeholder="请输入资料标题" />
            </Form.Item>
            <Space size={16} wrap>
              <Form.Item
                name="categoryId"
                label="所属分类"
                rules={[{ required: true, message: '请选择分类' }]}
                style={{ minWidth: 220 }}
              >
                <Select
                  placeholder="请选择分类"
                  options={categoryOptions.map((c) => ({
                    value: c.id,
                    label: c.status === 'disabled' ? `${c.name}（已停用）` : c.name,
                  }))}
                />
              </Form.Item>
              <Form.Item name="level" label="资料层级" rules={[{ required: true }]}>
                <Radio.Group
                  options={Object.entries(TrainingLevelLabels).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                />
              </Form.Item>
            </Space>
            <Form.Item label="资料形式">
              <Radio.Group
                value={mediaType}
                onChange={(e) => handleMediaTypeChange(e.target.value as TrainingMediaType)}
              >
                <Radio.Button value="rich_text">图文</Radio.Button>
                <Radio.Button value="video">视频</Radio.Button>
                <Radio.Button value="audio">音频</Radio.Button>
              </Radio.Group>
            </Form.Item>
            <Form.Item name="summary" label="简介" rules={[{ max: 200, message: '简介不超过 200 字' }]}>
              <Input.TextArea
                rows={2}
                maxLength={200}
                showCount
                placeholder="列表卡片展示的一句话简介（选填）"
              />
            </Form.Item>
            <Form.Item name="source" label="来源" rules={[{ max: 100, message: '来源不超过 100 字' }]}>
              <Input maxLength={100} placeholder="如：文化和旅游部官网（选填）" />
            </Form.Item>
            <Space size={32} wrap>
              <Form.Item name="isTop" label="置顶" valuePropName="checked">
                <Switch checkedChildren="是" unCheckedChildren="否" />
              </Form.Item>
              <Form.Item
                name="isPublicToAgency"
                label="是否向涉旅企业公开"
                valuePropName="checked"
                help="开启后，旅行社等涉旅企业账号可在文库查看中浏览该资料；关闭则仅文旅厅内部可见"
              >
                <Switch checkedChildren="公开" unCheckedChildren="不公开" />
              </Form.Item>
              <Form.Item label="封面图（选填，jpg/png，≤5MB，自动压缩存储）">
                <Space>
                  <Upload accept=".jpg,.jpeg,.png" showUploadList={false} beforeUpload={handleCoverFile}>
                    <Button icon={<UploadOutlined />}>选择图片</Button>
                  </Upload>
                  {cover && (
                    <Space>
                      <img
                        src={cover.url}
                        alt="封面预览"
                        style={{ width: 96, height: 64, objectFit: 'cover', borderRadius: 4 }}
                      />
                      <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => {
                          setCover(null)
                          setDirty(true)
                        }}
                      />
                    </Space>
                  )}
                </Space>
              </Form.Item>
            </Space>

            <Divider orientation="left" plain>
              资料内容（按形式录入）
            </Divider>

            {mediaType === 'rich_text' && (
              <Form.Item
                label="图文内容"
                required
                validateStatus={undefined}
                help="支持加粗、列表、图文混排；本地图片不超过 2MB"
              >
                <RichTextEditor
                  value={richText}
                  onChange={(html) => {
                    setRichText(html)
                    setDirty(true)
                  }}
                  placeholder="请录入图文内容…"
                  minHeight={260}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  当前字数：{richTextToPlain(richText).length} / {TRAINING_UPLOAD_LIMITS.contentMaxLength}
                </Text>
              </Form.Item>
            )}

            {mediaType === 'video' && (
              <Form.Item label="视频文件" required help="支持 mp4、mov 格式，不超过 500MB；演示环境本地文件刷新后需重新上传">
                {!media ? (
                  <Dragger
                    accept=".mp4,.mov"
                    maxCount={1}
                    showUploadList={false}
                    beforeUpload={(f) => handleMediaFile(f, 'video')}
                    style={{ padding: '12px 0' }}
                  >
                    <p className="ant-upload-drag-icon">
                      <InboxOutlined />
                    </p>
                    <p className="ant-upload-text">点击或拖拽视频文件到此处上传</p>
                    <p className="ant-upload-hint">上传后自动读取时长，仅本页保存前有效</p>
                  </Dragger>
                ) : (
                  <Space direction="vertical" size={8}>
                    <video
                      controls
                      src={media.url}
                      style={{ width: 420, maxHeight: 240, background: '#000', borderRadius: 6 }}
                    />
                    <Space>
                      <Tag>{media.name}</Tag>
                      {media.size > 0 && <Tag>{formatFileSize(media.size)}</Tag>}
                      <Tag color="blue">时长 {formatDuration(media.duration)}</Tag>
                      <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => {
                          setMedia(null)
                          setDirty(true)
                        }}
                      >
                        移除
                      </Button>
                      <Button size="small" icon={<ExperimentOutlined />} onClick={() => fillDemoMedia('video')}>
                        使用演示视频
                      </Button>
                    </Space>
                  </Space>
                )}
                {!media && (
                  <Button size="small" icon={<ExperimentOutlined />} onClick={() => fillDemoMedia('video')}>
                    使用演示视频地址
                  </Button>
                )}
              </Form.Item>
            )}

            {mediaType === 'audio' && (
              <Form.Item label="音频文件" required help="支持 mp3、m4a、wav 格式，不超过 50MB；演示环境本地文件刷新后需重新上传">
                {!media ? (
                  <Dragger
                    accept=".mp3,.m4a,.wav"
                    maxCount={1}
                    showUploadList={false}
                    beforeUpload={(f) => handleMediaFile(f, 'audio')}
                    style={{ padding: '12px 0' }}
                  >
                    <p className="ant-upload-drag-icon">
                      <InboxOutlined />
                    </p>
                    <p className="ant-upload-text">点击或拖拽音频文件到此处上传</p>
                    <p className="ant-upload-hint">上传后自动读取时长</p>
                  </Dragger>
                ) : (
                  <Space direction="vertical" size={8} style={{ width: 420 }}>
                    <audio controls src={media.url} style={{ width: '100%' }} />
                    <Space>
                      <Tag>{media.name}</Tag>
                      {media.size > 0 && <Tag>{formatFileSize(media.size)}</Tag>}
                      <Tag color="blue">时长 {formatDuration(media.duration)}</Tag>
                      <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => {
                          setMedia(null)
                          setDirty(true)
                        }}
                      >
                        移除
                      </Button>
                      <Button size="small" icon={<ExperimentOutlined />} onClick={() => fillDemoMedia('audio')}>
                        使用演示音频
                      </Button>
                    </Space>
                  </Space>
                )}
                {!media && (
                  <Button size="small" icon={<ExperimentOutlined />} onClick={() => fillDemoMedia('audio')}>
                    使用演示音频地址
                  </Button>
                )}
              </Form.Item>
            )}

            <Divider orientation="left" plain>
              附件（选填）
            </Divider>
            <Form.Item
              help={`政策原文等佐证材料，pdf/doc/docx/xlsx，单个 ≤20MB，最多 ${TRAINING_UPLOAD_LIMITS.attachmentMaxCount} 个`}
            >
              <Upload
                multiple
                accept=".pdf,.doc,.docx,.xlsx"
                fileList={attachments.map((a) => ({ uid: a.uid, name: a.name, status: 'done' as const }))}
                beforeUpload={handleAttachmentFile}
                onRemove={(f) => {
                  setAttachments((prev) => prev.filter((a) => a.uid !== f.uid))
                  setDirty(true)
                }}
              >
                <Button icon={<UploadOutlined />}>添加附件</Button>
              </Upload>
            </Form.Item>

            <Divider />
            <Space>
              <Button onClick={handleCancel}>取 消</Button>
              <Button onClick={() => handleSave('save')}>{saveButtonLabel}</Button>
              {editingStatus !== 'published' && (
                <Button type="primary" onClick={() => handleSave('publish')}>
                  {editingStatus === 'offline' ? '重新发布' : '发 布'}
                </Button>
              )}
            </Space>
          </Form>
        </Card>
      </PageContainer>
    </>
  )
}
