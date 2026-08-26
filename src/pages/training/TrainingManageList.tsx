import { useMemo, useState } from 'react'
import { App, Button, Card, Input, Select, Space, Table, Tag, Typography } from 'antd'
import { EditOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import { useStore } from '../../store'
import { nowStr } from '../../utils'
import { richTextToPlain } from '../../components/RichTextEditor'
import {
  TrainingLevelLabels,
  TrainingMaterialStatusColors,
  TrainingMaterialStatusLabels,
  TrainingMediaTypeLabels,
  type TrainingLevel,
  type TrainingMaterial,
  type TrainingMaterialStatus,
  type TrainingMediaType,
} from '../../types/training'
import { LevelTag, MediaTypeTag } from './shared'

const { Text } = Typography

/**
 * 文旅厅侧 · 资料管理列表
 * 展示全部状态资料，提供筛选、搜索与生命周期操作（PRD §5.4 / §5.3）
 */
export default function TrainingManageList() {
  const { modal, message } = App.useApp()
  const navigate = useNavigate()
  const {
    trainingCategories,
    trainingMaterials,
    updateTrainingMaterial,
    deleteTrainingMaterial,
    currentUser,
  } = useStore()

  const [status, setStatus] = useState<TrainingMaterialStatus | 'all'>('all')
  const [category, setCategory] = useState<string>('all')
  const [level, setLevel] = useState<TrainingLevel | 'all'>('all')
  const [mediaType, setMediaType] = useState<TrainingMediaType | 'all'>('all')
  const [keyword, setKeyword] = useState('')

  const categoryName = (id: string) =>
    trainingCategories.find((c) => c.id === id)?.name || '未分类'

  // 默认按更新时间倒序，置顶优先（PRD §5.4）
  const sorted = useMemo(
    () =>
      [...trainingMaterials].sort((a, b) => {
        if (a.isTop !== b.isTop) return a.isTop ? -1 : 1
        return (b.updateTime || b.createTime).localeCompare(a.updateTime || a.createTime)
      }),
    [trainingMaterials],
  )

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    return sorted.filter((m) => {
      if (status !== 'all' && m.status !== status) return false
      if (category !== 'all' && m.categoryId !== category) return false
      if (level !== 'all' && m.level !== level) return false
      if (mediaType !== 'all' && m.mediaType !== mediaType) return false
      if (kw) {
        const hit =
          m.title.toLowerCase().includes(kw) || (m.summary || '').toLowerCase().includes(kw)
        if (!hit) return false
      }
      return true
    })
  }, [sorted, status, category, level, mediaType, keyword])

  // 发布前完整性校验：必填元数据 + 对应形式的内容（PRD §5.3 交互细节）
  const checkPublishable = (m: TrainingMaterial): string | null => {
    if (!m.title.trim()) return '缺少标题，请补全后再发布'
    const cat = trainingCategories.find((c) => c.id === m.categoryId)
    if (!cat) return '所属分类不存在，请重新选择分类'
    if (cat.status === 'disabled') return '所属分类已停用，请重新选择分类'
    if (m.mediaType === 'rich_text' && !richTextToPlain(m.content).trim())
      return '图文内容为空，请补全后再发布'
    if (m.mediaType === 'video' && !m.videoUrl) return '视频文件未上传，请补全后再发布'
    if (m.mediaType === 'audio' && !m.audioUrl) return '音频文件未上传，请补全后再发布'
    return null
  }

  const handlePublish = (m: TrainingMaterial) => {
    const error = checkPublishable(m)
    if (error) {
      message.warning(`${error}（将跳转编辑页）`)
      navigate(`/training/edit/${m.id}`)
      return
    }
    updateTrainingMaterial(m.id, {
      status: 'published',
      publishTime: nowStr(),
      updateBy: currentUser.name,
      updateTime: nowStr(),
    })
    message.success('已发布，旅行社侧即时可见')
  }

  const handleOffline = (m: TrainingMaterial) => {
    modal.confirm({
      title: '下架确认',
      content:
        '下架后旅行社侧将无法查看该资料（历史链接打开显示已下架提示）。确认下架？',
      okText: '确认下架',
      cancelText: '取消',
      onOk: () => {
        updateTrainingMaterial(m.id, {
          status: 'offline',
          updateBy: currentUser.name,
          updateTime: nowStr(),
        })
        message.success('已下架，旅行社侧不再展示该资料')
      },
    })
  }

  const handleDelete = (m: TrainingMaterial) => {
    modal.confirm({
      title: '删除确认',
      icon: null,
      content: `删除后不可恢复，确认删除「${m.title}」？`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        deleteTrainingMaterial(m.id)
        message.success('资料已删除')
      },
    })
  }

  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      ellipsis: true,
      render: (_: string, m: TrainingMaterial) => (
        <Space>
          {m.isTop && <Tag color="orange">置顶</Tag>}
          <a onClick={() => navigate(`/training/${m.id}`, { state: { from: '/training' } })} title={m.title}>
            {m.title}
          </a>
        </Space>
      ),
    },
    {
      title: '分类',
      dataIndex: 'categoryId',
      width: 100,
      render: (id: string) => <Tag>{categoryName(id)}</Tag>,
    },
    {
      title: '层级',
      dataIndex: 'level',
      width: 90,
      render: (lv: TrainingLevel) => <LevelTag level={lv} />,
    },
    {
      title: '形式',
      dataIndex: 'mediaType',
      width: 90,
      render: (t: TrainingMediaType) => <MediaTypeTag mediaType={t} />,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (s: TrainingMaterialStatus) => (
        <Tag color={TrainingMaterialStatusColors[s]}>{TrainingMaterialStatusLabels[s]}</Tag>
      ),
    },
    {
      title: '浏览量',
      dataIndex: 'viewCount',
      width: 90,
      sorter: (a: TrainingMaterial, b: TrainingMaterial) => a.viewCount - b.viewCount,
    },
    {
      title: '发布时间',
      dataIndex: 'publishTime',
      width: 160,
      render: (t?: string) => t || '-',
    },
    {
      title: '更新时间',
      dataIndex: 'updateTime',
      width: 160,
      render: (t: string, m: TrainingMaterial) => t || m.createTime,
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      render: (_: unknown, m: TrainingMaterial) => (
        <Space size={0} wrap>
          {/* 状态机（PRD §3.3）：草稿/已下架 → 发布、删除；已发布 → 下架 */}
          {(m.status === 'draft' || m.status === 'offline') && (
            <Button type="link" size="small" onClick={() => handlePublish(m)}>
              {m.status === 'offline' ? '重新发布' : '发布'}
            </Button>
          )}
          {m.status === 'published' && (
            <Button type="link" size="small" onClick={() => handleOffline(m)}>
              下架
            </Button>
          )}
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/training/edit/${m.id}`)}
          >
            编辑
          </Button>
          {(m.status === 'draft' || m.status === 'offline') && (
            <Button type="link" size="small" danger onClick={() => handleDelete(m)}>
              删除
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="文库发布"
        breadcrumb={[{ title: '首页', path: '/' }, { title: '文库管理' }, { title: '文库发布' }]}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/training/new')}>
            新建资料
          </Button>
        }
      />
      <PageContainer>
        <Card size="small">
          <Space wrap style={{ marginBottom: 16 }}>
            <Select
              value={status}
              style={{ width: 110 }}
              onChange={setStatus}
              options={[
                { value: 'all', label: '全部状态' },
                ...Object.entries(TrainingMaterialStatusLabels).map(([value, label]) => ({
                  value: value as TrainingMaterialStatus,
                  label,
                })),
              ]}
            />
            <Select
              value={category}
              style={{ width: 130 }}
              onChange={setCategory}
              options={[
                { value: 'all', label: '全部分类' },
                ...[...trainingCategories]
                  .sort((a, b) => a.sort - b.sort)
                  .map((c) => ({
                    value: c.id,
                    label: c.status === 'disabled' ? `${c.name}（已停用）` : c.name,
                  })),
              ]}
            />
            <Select
              value={level}
              style={{ width: 110 }}
              onChange={setLevel}
              options={[
                { value: 'all', label: '全部层级' },
                ...Object.entries(TrainingLevelLabels).map(([value, label]) => ({
                  value: value as TrainingLevel,
                  label,
                })),
              ]}
            />
            <Select
              value={mediaType}
              style={{ width: 100 }}
              onChange={setMediaType}
              options={[
                { value: 'all', label: '全部形式' },
                ...Object.entries(TrainingMediaTypeLabels).map(([value, label]) => ({
                  value: value as TrainingMediaType,
                  label,
                })),
              ]}
            />
            <Input
              placeholder="搜索标题/简介关键词"
              prefix={<SearchOutlined />}
              allowClear
              maxLength={50}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              style={{ width: 220 }}
            />
          </Space>
          <Table
            rowKey="id"
            size="middle"
            columns={columns}
            dataSource={filtered}
            pagination={{ pageSize: 20, showSizeChanger: true, pageSizeOptions: [10, 20, 50], showTotal: (t) => `共 ${t} 条` }}
            locale={{
              emptyText: (
                <div style={{ padding: '24px 0' }}>
                  <Text type="secondary">暂无资料，点击右上角「新建资料」发布第一条学习内容</Text>
                </div>
              ),
            }}
          />
        </Card>
      </PageContainer>
    </>
  )
}
