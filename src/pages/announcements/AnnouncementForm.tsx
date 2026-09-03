import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Cascader,
  Divider,
  Form,
  Input,
  Result,
  Select,
  Space,
  Switch,
  Typography,
  Upload,
} from 'antd'
import { DeleteOutlined, UploadOutlined } from '@ant-design/icons'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import RichTextEditor, { richTextToPlain } from '../../components/RichTextEditor'
import { useStore } from '../../store'
import { genId, nowStr } from '../../utils'
import {
  ANNOUNCEMENT_LIMITS,
  AnnouncementTargetLabels,
  isAnnouncementManagerRole,
  type AnnouncementTarget,
} from '../../types/announcements'
import {
  GUIZHOU_REGION_TREE,
  MockAgencyAccounts,
  MockDeptAccounts,
  PROVINCE_REGION,
  regionFromCascader,
  regionLabel,
  regionMatchAgency,
  regionMatchDept,
  regionToCascader,
} from '../../mock/announcements'
import type { Attachment } from '../../types'

const { Text } = Typography

// 级联选项：贵州省 → 9 市州 → 区县（区域字典，PRD §8 结论 11）
const regionOptions = [
  {
    code: PROVINCE_REGION.code,
    name: `${PROVINCE_REGION.name}（全省）`,
    districts: GUIZHOU_REGION_TREE,
  },
]

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
 * 公告新建/编辑页（PRD §5.2）
 * 基本信息区 + 图文正文区 + 发布设置区（置顶/强制阅读/发布对象/发布区域）
 */
export default function AnnouncementForm({ mode }: { mode: 'new' | 'edit' }) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { modal, message } = App.useApp()
  const {
    announcementCategories,
    announcements,
    addAnnouncement,
    updateAnnouncement,
    currentUser,
  } = useStore()
  const [form] = Form.useForm()

  const isManager = isAnnouncementManagerRole(currentUser.role)
  const editing = mode === 'edit' ? announcements.find((a) => a.id === id) : undefined

  const [richText, setRichText] = useState('')
  const [cover, setCover] = useState<{ url: string; name: string } | null>(null)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [targets, setTargets] = useState<AnnouncementTarget[]>([])
  const [regionPath, setRegionPath] = useState<string[]>([PROVINCE_REGION.code])
  const [dirty, setDirty] = useState(false)
  const loadedRef = useRef(false)
  // 强制阅读开关的联动提示（须在早退 return 前无条件调用 Hook）
  const isForceRead = Form.useWatch('isForceRead', form)

  // 编辑回填（仅首次加载）
  useEffect(() => {
    if (mode !== 'edit' || loadedRef.current) return
    loadedRef.current = true
    if (!editing) return
    form.setFieldsValue({
      title: editing.title,
      categoryId: editing.categoryId,
      summary: editing.summary,
      isTop: editing.isTop,
      isForceRead: editing.isForceRead,
    })
    setRichText(editing.content || '')
    if (editing.coverUrl) setCover({ url: editing.coverUrl, name: '已设置封面' })
    setAttachments(editing.attachments || [])
    setTargets(editing.targets)
    setRegionPath(regionToCascader(editing.region))
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

  if (!isManager) return <Navigate to="/announcements" replace />
  if (mode === 'edit' && !editing) {
    return (
      <Result
        status="404"
        title="该公告不存在或已删除"
        extra={
          <Button type="primary" onClick={() => navigate('/announcements')}>
            返回公告管理
          </Button>
        }
      />
    )
  }

  const editingStatus = editing?.status

  // 已发布/已下架公告内容不可修改（PRD §3.5）：发布上架后仅可下架；如需变更内容，下架后通过「新建公告」重新发布
  if (mode === 'edit' && (editingStatus === 'published' || editingStatus === 'offline')) {
    return (
      <Result
        status="info"
        title={editingStatus === 'published' ? '该公告已发布，不可编辑' : '该公告已下架，不可编辑'}
        subTitle={
          editingStatus === 'published'
            ? '已上架公告仅可下架；如需修改内容，请先下架，再通过「新建公告」重新发布'
            : '已下架公告不可编辑；如需修改内容，请通过「新建公告」重新发布'
        }
        extra={
          <Button type="primary" onClick={() => navigate('/announcements')}>
            返回公告管理
          </Button>
        }
      />
    )
  }

  // 分类选项：启用中的分类；编辑时所属分类已停用则额外带入并标注
  const enabledCategories = [...announcementCategories]
    .filter((c) => c.status === 'enabled')
    .sort((a, b) => a.sort - b.sort)
  const categoryOptions = [...enabledCategories]
  if (editing) {
    const own = announcementCategories.find((c) => c.id === editing.categoryId)
    if (own && own.status === 'disabled' && !categoryOptions.some((c) => c.id === own.id)) {
      categoryOptions.push(own)
    }
  }

  // 当前已置顶条数（软提示用）
  const topCount = announcements.filter(
    (a) => a.isTop && a.id !== editing?.id && a.status === 'published',
  ).length

  // 区域字段在发布对象含监管账号或旅行社侧（ERP 或涉旅企业账号）时可编辑；
  // 监管账号也可按区域发布至不同地区的文旅账号
  const regionEditable =
    targets.includes('dept_account') || targets.includes('agency_user') || targets.includes('erp')
  const currentRegion = regionFromCascader(regionPath)
  const regionAgencyCount = regionEditable
    ? MockAgencyAccounts.filter((a) => regionMatchAgency(currentRegion, a)).length
    : 0
  const regionDeptCount = regionEditable
    ? MockDeptAccounts.filter((d) => regionMatchDept(currentRegion, d)).length
    : 0

  const handleCoverFile = async (file: File) => {
    if (!['.jpg', '.jpeg', '.png'].some((e) => file.name.toLowerCase().endsWith(e))) {
      message.error('封面仅支持 jpg、png 格式')
      return false
    }
    if (file.size > ANNOUNCEMENT_LIMITS.coverMaxMB * 1024 * 1024) {
      message.error(`封面图片不超过 ${ANNOUNCEMENT_LIMITS.coverMaxMB}MB，请压缩后重试`)
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
    if (attachments.length >= ANNOUNCEMENT_LIMITS.attachmentMaxCount) {
      message.error(`附件最多 ${ANNOUNCEMENT_LIMITS.attachmentMaxCount} 个`)
      return false
    }
    if (file.size > ANNOUNCEMENT_LIMITS.attachmentMaxMB * 1024 * 1024) {
      message.error(`附件不超过 ${ANNOUNCEMENT_LIMITS.attachmentMaxMB}MB，请压缩后重试`)
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

  // ===== 保存（状态流转符合 PRD §3.5 状态机；仅草稿可进入本页编辑，发布后内容不可修改）=====
  const handleSave = async (target: 'save' | 'publish') => {
    const willPublish = target === 'publish'
    const nextStatus = willPublish ? 'published' : 'draft'
    // 发布时全量校验；草稿保存仅校验标题（PRD §5.2）
    try {
      if (willPublish) await form.validateFields()
      else await form.validateFields(['title'])
    } catch {
      return
    }
    const values = form.getFieldsValue()
    if (willPublish) {
      if (!richTextToPlain(richText).trim()) {
        message.warning('请录入公告正文')
        return
      }
      if (targets.length === 0) {
        message.warning('请至少选择一个发布对象')
        return
      }
      if (regionEditable && regionPath.length === 0) {
        message.warning('请选择发布区域')
        return
      }
      const cat = announcementCategories.find((c) => c.id === values.categoryId)
      if (cat?.status === 'disabled') {
        message.error('所属分类已停用，请重新选择分类')
        return
      }
    }
    const now = nowStr()
    const payload = {
      title: values.title.trim(),
      categoryId: values.categoryId,
      summary: values.summary?.trim() || undefined,
      coverUrl: cover?.url,
      content: richText,
      attachments,
      isTop: !!values.isTop,
      isForceRead: !!values.isForceRead,
      targets,
      region: regionEditable ? currentRegion : PROVINCE_REGION,
    }
    if (mode === 'new') {
      addAnnouncement({
        id: genId('anc'),
        ...payload,
        status: nextStatus,
        viewCount: 0,
        publishTime: willPublish ? now : undefined,
        createBy: currentUser.name,
        createTime: now,
      })
    } else if (editing) {
      updateAnnouncement(editing.id, {
        ...payload,
        status: nextStatus,
        publishTime: willPublish ? now : undefined,
        updateBy: currentUser.name,
        updateTime: now,
      })
    }
    message.success(
      willPublish ? '已发布，目标账号即时可见' : '已保存为草稿，可在管理列表继续编辑',
    )
    navigate('/announcements')
  }

  const handleCancel = () => {
    if (dirty) {
      modal.confirm({
        title: '离开确认',
        content: '当前内容尚未保存，离开后将丢失，确认离开？',
        okText: '确认离开',
        cancelText: '继续编辑',
        onOk: () => navigate('/announcements'),
      })
    } else {
      navigate('/announcements')
    }
  }

  const saveButtonLabel = '保存为草稿'

  return (
    <>
      <PageHeader
        title={mode === 'new' ? '新建公告' : '编辑公告'}
        breadcrumb={[
          { title: '首页', path: '/' },
          { title: '公告发布管理' },
          { title: '公告管理', path: '/announcements' },
          { title: mode === 'new' ? '新建公告' : '编辑公告' },
        ]}
      />
      <PageContainer>
        <Card>
          <Form
            form={form}
            layout="vertical"
            initialValues={{ isTop: false, isForceRead: false }}
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
                { max: ANNOUNCEMENT_LIMITS.titleMaxLength, message: `标题不超过 ${ANNOUNCEMENT_LIMITS.titleMaxLength} 字` },
              ]}
            >
              <Input maxLength={ANNOUNCEMENT_LIMITS.titleMaxLength} showCount placeholder="请输入公告标题" />
            </Form.Item>
            <Form.Item
              name="categoryId"
              label="所属分类"
              rules={[{ required: true, message: '请选择分类' }]}
              style={{ maxWidth: 320 }}
            >
              <Select
                placeholder="请选择分类"
                options={categoryOptions.map((c) => ({
                  value: c.id,
                  label: c.status === 'disabled' ? `${c.name}（已停用）` : c.name,
                }))}
              />
            </Form.Item>
            <Form.Item
              name="summary"
              label="摘要"
              rules={[{ max: ANNOUNCEMENT_LIMITS.summaryMaxLength, message: '摘要不超过 200 字' }]}
            >
              <Input.TextArea
                rows={2}
                maxLength={ANNOUNCEMENT_LIMITS.summaryMaxLength}
                showCount
                placeholder="列表卡片展示的摘要（选填）"
              />
            </Form.Item>
            <Form.Item label="封面图（选填，jpg/png，≤5MB，建议 2:1 横图，自动压缩存储）">
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

            <Divider orientation="left" plain>
              公告正文（图文）
            </Divider>
            <Form.Item
              label="正文内容"
              required
              help="支持加粗、列表、图文混排；本地图片不超过 2MB"
            >
              <RichTextEditor
                value={richText}
                onChange={(html) => {
                  setRichText(html)
                  setDirty(true)
                }}
                placeholder="请录入公告正文…"
                minHeight={260}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                当前字数：{richTextToPlain(richText).length} / {ANNOUNCEMENT_LIMITS.contentMaxLength}
              </Text>
            </Form.Item>

            <Divider orientation="left" plain>
              附件（选填）
            </Divider>
            <Form.Item
              help={`政策原文等材料，pdf/doc/docx/xlsx，单个 ≤20MB，最多 ${ANNOUNCEMENT_LIMITS.attachmentMaxCount} 个`}
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

            <Divider orientation="left" plain>
              发布设置
            </Divider>
            <Space size={32} wrap style={{ marginBottom: 8 }}>
              <Form.Item
                name="isTop"
                label="置顶"
                valuePropName="checked"
                help={`置顶公告建议不超过 ${ANNOUNCEMENT_LIMITS.topSuggest} 条，当前已置顶 ${topCount} 条`}
              >
                <Switch checkedChildren="是" unCheckedChildren="否" />
              </Form.Item>
              <Form.Item name="isForceRead" label="强制阅读" valuePropName="checked">
                <Switch checkedChildren="开" unCheckedChildren="关" />
              </Form.Item>
            </Space>
            {isForceRead && (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
                message='开启后，目标账号未点击"我已阅读并知晓"前，每次登录都会弹窗提醒'
              />
            )}
            <Form.Item label="发布对象（多选，发布时至少 1 项）" required>
              <Checkbox.Group
                value={targets}
                onChange={(v) => {
                  setTargets(v as AnnouncementTarget[])
                  setDirty(true)
                }}
                options={(Object.keys(AnnouncementTargetLabels) as AnnouncementTarget[]).map((t) => ({
                  value: t,
                  label: AnnouncementTargetLabels[t],
                }))}
              />
              {targets.includes('erp') && (
                <Alert
                  type="info"
                  showIcon
                  style={{ marginTop: 8 }}
                  message="旅行社 ERP 系统推送需二期接口对接，当前仅标记与统计占位"
                />
              )}
            </Form.Item>
            <Form.Item
              label="发布区域"
              required={regionEditable}
              help={
                regionEditable
                  ? `当前区域有 ${regionDeptCount} 个监管账号、${regionAgencyCount} 家旅行社；按账号所属区域匹配，全省区域覆盖全部账号`
                  : '请先选择发布对象后再选择发布区域'
              }
            >
              <Cascader
                style={{ maxWidth: 360 }}
                value={regionPath}
                changeOnSelect
                disabled={!regionEditable}
                fieldNames={{ label: 'name', value: 'code', children: 'districts' }}
                options={regionOptions}
                placeholder="请选择发布区域"
                onChange={(path) => {
                  setRegionPath(path as string[])
                  setDirty(true)
                }}
                displayRender={(labels) => labels.join(' / ')}
              />
              {regionEditable && (
                <Text type="secondary" style={{ display: 'block', marginTop: 4, fontSize: 12 }}>
                  当前选择：{regionLabel(currentRegion)}
                </Text>
              )}
            </Form.Item>

            <Divider />
            <Space>
              <Button onClick={handleCancel}>取 消</Button>
              <Button onClick={() => handleSave('save')}>{saveButtonLabel}</Button>
              <Button type="primary" onClick={() => handleSave('publish')}>
                发 布
              </Button>
            </Space>
          </Form>
        </Card>
      </PageContainer>
    </>
  )
}
