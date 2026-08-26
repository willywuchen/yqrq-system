import { useEffect, useRef, useState } from 'react'
import { Alert, App, Button, Card, Divider, Result, Space, Tag, Typography } from 'antd'
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  EditOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import { useStore } from '../../store'
import { formatFileSize } from '../../utils'
import { isTrainingManagerRole } from '../../types/training'
import { formatDuration, LevelTag, MediaCover, MediaTypeTag, ViewCount } from './shared'

const { Text, Paragraph } = Typography

/**
 * 资料详情页：按形式渲染图文/视频/音频，展示附件并累加浏览量（PRD §5.6）
 */
export default function TrainingDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { message } = App.useApp()
  const { trainingCategories, trainingMaterials, incrementTrainingView, currentUser } = useStore()

  // 返回来源：浏览列表/管理列表跳转时携带，直链访问时兜底回 /training
  const fromPath = (location.state as { from?: string } | null)?.from || '/training'

  const isManager = isTrainingManagerRole(currentUser.role)
  const material = trainingMaterials.find((m) => m.id === id)
  const category = trainingCategories.find((c) => c.id === material?.categoryId)

  // 浏览量 +1（ref 防止 StrictMode 双挂载重复计数）
  const countedRef = useRef(false)
  useEffect(() => {
    if (!material || !isManagerVisible()) return
    if (countedRef.current) return
    countedRef.current = true
    incrementTrainingView(material.id)
    // eslint 无关：仅依赖资料 id
  }, [material?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // 媒体加载失败兜底（key 变化强制重载实现"重试"）
  const [mediaError, setMediaError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  useEffect(() => {
    setMediaError(false)
  }, [material?.id])

  // 非管理角色仅可查看已发布资料：草稿/已下架统一提示，不暴露存在性
  function isManagerVisible() {
    return !!material && (isManager || material.status === 'published')
  }

  if (!material) {
    return (
      <Result
        status="404"
        title="该资料不存在或已删除"
        extra={
          <Button type="primary" onClick={() => navigate(fromPath)}>
            返回列表
          </Button>
        }
      />
    )
  }

  if (!isManagerVisible()) {
    return (
      <Result
        status="info"
        title="该资料已下架"
        subTitle="该资料当前不可查看，如需了解详情请联系省文旅厅"
        extra={
          <Button type="primary" onClick={() => navigate(fromPath)}>
            返回列表
          </Button>
        }
      />
    )
  }

  const handleDownload = (url?: string, name?: string) => {
    if (url) {
      const a = document.createElement('a')
      a.href = url
      a.download = name || ''
      a.click()
      return
    }
    message.info('演示环境：附件为模拟数据，未提供真实下载地址')
  }

  const mediaUrl =
    material.mediaType === 'video' ? material.videoUrl : material.audioUrl

  return (
    <>
      <PageHeader
        title={material.title}
        breadcrumb={[
          { title: '首页', path: '/' },
          { title: isManager ? '文库管理' : '文库查看' },
          { title: '资料详情' },
        ]}
        extra={
          isManager && (
            <Button icon={<EditOutlined />} onClick={() => navigate(`/training/edit/${material.id}`)}>
              编辑资料
            </Button>
          )
        }
      />
      <PageContainer>
        {/* 管理员查看未发布资料时的提示 */}
        {isManager && material.status === 'draft' && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="该资料为草稿，仅文旅厅内部可见，旅行社无法查看"
          />
        )}
        {isManager && material.status === 'offline' && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message="该资料已下架，旅行社无法查看；可在资料管理列表重新发布"
          />
        )}

        <Card>
          {/* 元数据区 */}
          <Space size={8} wrap style={{ marginBottom: 12 }}>
            <LevelTag level={material.level} />
            {category && <Tag>{category.name}</Tag>}
            <MediaTypeTag mediaType={material.mediaType} />
            {material.isTop && <Tag color="orange">置顶</Tag>}
          </Space>
          <Space size={16} wrap style={{ marginBottom: 8 }}>
            <Text type="secondary">
              发布时间：{material.publishTime ? material.publishTime.slice(0, 10) : '未发布'}
            </Text>
            <ViewCount count={material.viewCount} />
            <Text type="secondary">来源：{material.source || '—'}</Text>
          </Space>
          {material.summary && (
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              {material.summary}
            </Paragraph>
          )}
          <Divider style={{ margin: '16px 0' }} />

          {/* 内容区：按形式渲染 */}
          {material.mediaType === 'rich_text' && (
            <div
              className="rich-text-content"
              style={{ lineHeight: 1.9 }}
              dangerouslySetInnerHTML={{ __html: material.content || '（无内容）' }}
            />
          )}

          {(material.mediaType === 'video' || material.mediaType === 'audio') && !mediaError && (
            <div style={{ maxWidth: 720 }}>
              {material.mediaType === 'video' ? (
                <video
                  key={reloadKey}
                  controls
                  preload="metadata"
                  src={mediaUrl}
                  onError={() => setMediaError(true)}
                  style={{ width: '100%', maxHeight: 480, background: '#000', borderRadius: 6 }}
                />
              ) : (
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <MediaCover
                    mediaType="audio"
                    coverUrl={material.coverUrl}
                    height={180}
                    iconSize={48}
                  />
                  <audio key={reloadKey} controls preload="metadata" src={mediaUrl} onError={() => setMediaError(true)} style={{ width: '100%' }} />
                </Space>
              )}
              <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                时长 {formatDuration(material.videoDuration || material.audioDuration)}
              </Text>
            </div>
          )}

          {(material.mediaType === 'video' || material.mediaType === 'audio') && mediaError && (
            <div
              style={{
                maxWidth: 720,
                padding: '40px 0',
                textAlign: 'center',
                background: '#fafafa',
                borderRadius: 6,
              }}
            >
              <div style={{ color: '#999', marginBottom: 12 }}>媒体文件加载失败</div>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  setMediaError(false)
                  setReloadKey((k) => k + 1)
                }}
              >
                重试
              </Button>
            </div>
          )}

          {/* 附件区 */}
          {material.attachments.length > 0 && (
            <>
              <Divider style={{ margin: '16px 0' }} />
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                附件（{material.attachments.length}）
              </Text>
              <Space direction="vertical" size={8} style={{ width: '100%', maxWidth: 720 }}>
                {material.attachments.map((a) => (
                  <Card key={a.uid} size="small" style={{ background: '#fafafa' }} styles={{ body: { padding: '8px 12px' } }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.name}
                      </span>
                      <Space>
                        <Tag>{formatFileSize(a.size)}</Tag>
                        <Button
                          size="small"
                          icon={<DownloadOutlined />}
                          onClick={() => handleDownload(a.url, a.name)}
                        >
                          下载
                        </Button>
                      </Space>
                    </div>
                  </Card>
                ))}
              </Space>
            </>
          )}

          <Divider style={{ margin: '24px 0 16px' }} />
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(fromPath)}>
            返回列表
          </Button>
        </Card>
      </PageContainer>
    </>
  )
}
