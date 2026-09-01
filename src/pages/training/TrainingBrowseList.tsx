import { useMemo, useState } from 'react'
import { Card, Col, Empty, Input, Menu, Pagination, Row, Select, Space, Tag } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { useLocation, useNavigate } from 'react-router-dom'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import { useStore } from '../../store'
import {
  isTrainingManagerRole,
  TrainingLevelLabels,
  TrainingMediaTypeLabels,
  type TrainingLevel,
  type TrainingMediaType,
} from '../../types/training'
import { LevelTag, MediaCover, MediaTypeTag, ViewCount } from './shared'

const PAGE_SIZE = 9

/**
 * 旅行社侧 · 学习资料浏览列表
 * 仅展示已发布资料：左侧分类导航 + 层级/形式筛选 + 关键词搜索（PRD §5.5）
 * 文旅厅侧菜单「学习资料」（/training/library）复用本页
 */
export default function TrainingBrowseList() {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentUser, trainingCategories, trainingMaterials } = useStore()
  const isManager = isTrainingManagerRole(currentUser.role)

  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [level, setLevel] = useState<TrainingLevel | 'all'>('all')
  const [mediaType, setMediaType] = useState<TrainingMediaType | 'all'>('all')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)

  const enabledCategories = useMemo(
    () =>
      [...trainingCategories]
        .filter((c) => c.status === 'enabled')
        .sort((a, b) => a.sort - b.sort),
    [trainingCategories],
  )

  const categoryName = (id: string) =>
    trainingCategories.find((c) => c.id === id)?.name || '未分类'

  // 已发布且向涉旅企业公开的资料才对旅行社（涉旅企业）角色可见；文旅厅侧可见全部已发布资料
  // 置顶优先，其次发布时间倒序
  const published = useMemo(
    () =>
      trainingMaterials
        .filter((m) => m.status === 'published' && (isManager || m.isPublicToAgency))
        .sort((a, b) => {
          if (a.isTop !== b.isTop) return a.isTop ? -1 : 1
          return (b.publishTime || '').localeCompare(a.publishTime || '')
        }),
    [trainingMaterials, isManager],
  )

  const categoryCount = (id: string) => published.filter((m) => m.categoryId === id).length

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    return published.filter((m) => {
      if (activeCategory !== 'all' && m.categoryId !== activeCategory) return false
      if (level !== 'all' && m.level !== level) return false
      if (mediaType !== 'all' && m.mediaType !== mediaType) return false
      if (kw) {
        const hit =
          m.title.toLowerCase().includes(kw) || (m.summary || '').toLowerCase().includes(kw)
        if (!hit) return false
      }
      return true
    })
  }, [published, activeCategory, level, mediaType, keyword])

  const hasFilter =
    activeCategory !== 'all' || level !== 'all' || mediaType !== 'all' || keyword.trim() !== ''

  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const clearFilters = () => {
    setActiveCategory('all')
    setLevel('all')
    setMediaType('all')
    setKeyword('')
    setPage(1)
  }

  return (
    <>
      <PageHeader
        title="文库查看"
        breadcrumb={[{ title: '首页', path: '/' }, { title: isManager ? '文库管理' : '文库查看' }]}
      />
      <PageContainer>
        <Row gutter={16}>
          {/* 左侧分类导航 */}
          <Col xs={24} md={6} lg={5}>
            <Card size="small" title="资料分类">
              <Menu
                mode="inline"
                style={{ border: 'none' }}
                selectedKeys={[activeCategory]}
                onClick={({ key }) => {
                  setActiveCategory(key as string)
                  setPage(1)
                }}
                items={[
                  { key: 'all', label: `全部（${published.length}）` },
                  ...enabledCategories.map((c) => ({
                    key: c.id,
                    label: `${c.name}（${categoryCount(c.id)}）`,
                  })),
                ]}
              />
            </Card>
          </Col>

          {/* 右侧筛选 + 卡片列表 */}
          <Col xs={24} md={18} lg={19}>
            <Card size="small" style={{ marginBottom: 16 }}>
              <Space wrap>
                <Input
                  placeholder="搜索标题/简介关键词"
                  prefix={<SearchOutlined />}
                  allowClear
                  value={keyword}
                  maxLength={50}
                  style={{ width: 260 }}
                  onChange={(e) => {
                    setKeyword(e.target.value)
                    setPage(1)
                  }}
                />
                <Select
                  value={level}
                  style={{ width: 110 }}
                  onChange={(v) => {
                    setLevel(v)
                    setPage(1)
                  }}
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
                  onChange={(v) => {
                    setMediaType(v)
                    setPage(1)
                  }}
                  options={[
                    { value: 'all', label: '全部形式' },
                    ...Object.entries(TrainingMediaTypeLabels).map(([value, label]) => ({
                      value: value as TrainingMediaType,
                      label,
                    })),
                  ]}
                />
              </Space>
            </Card>

            {pageData.length === 0 ? (
              <Card>
                <Empty
                  description={
                    hasFilter ? '未找到匹配的学习资料，可调整关键词或清空筛选' : '暂无学习资料，敬请期待'
                  }
                  style={{ padding: '40px 0' }}
                >
                  {hasFilter && (
                    <a onClick={clearFilters}>清空筛选</a>
                  )}
                </Empty>
              </Card>
            ) : (
              <Row gutter={[16, 16]}>
                {pageData.map((m) => (
                  <Col xs={24} sm={12} lg={8} key={m.id}>
                    <Card
                      hoverable
                      cover={<MediaCover mediaType={m.mediaType} coverUrl={m.coverUrl} />}
                      styles={{ body: { padding: 14 } }}
                      onClick={() => navigate(`/training/${m.id}`, { state: { from: location.pathname } })}
                    >
                      <div
                        title={m.title}
                        style={{
                          fontWeight: 600,
                          marginBottom: 8,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          minHeight: 44,
                        }}
                      >
                        {m.isTop && (
                          <Tag color="orange" style={{ marginRight: 4 }}>
                            置顶
                          </Tag>
                        )}
                        {m.title}
                      </div>
                      <Space size={4} wrap style={{ marginBottom: 8 }}>
                        <LevelTag level={m.level} />
                        <MediaTypeTag mediaType={m.mediaType} />
                        <Tag>{categoryName(m.categoryId)}</Tag>
                      </Space>
                      {m.summary && (
                        <div
                          style={{
                            color: '#999',
                            fontSize: 12,
                            marginBottom: 8,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {m.summary}
                        </div>
                      )}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <ViewCount count={m.viewCount} />
                        <span style={{ color: '#999', fontSize: 12 }}>
                          {(m.publishTime || '').slice(0, 10)}
                        </span>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}

            {filtered.length > PAGE_SIZE && (
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <Pagination
                  current={page}
                  pageSize={PAGE_SIZE}
                  total={filtered.length}
                  showTotal={(t) => `共 ${t} 条`}
                  onChange={setPage}
                />
              </div>
            )}
          </Col>
        </Row>
      </PageContainer>
    </>
  )
}
