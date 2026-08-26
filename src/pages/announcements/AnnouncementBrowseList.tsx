import { useMemo, useState } from 'react'
import { Button, Card, Col, Empty, Input, Pagination, Row, Select, Space, Tag, Typography } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import { useStore } from '../../store'
import { isVisibleToUser, getAccountOfUser } from '../../mock/announcements'
import { isAnnouncementManagerRole } from '../../types/announcements'
import type { Announcement } from '../../types/announcements'
import { AnnouncementCover } from './shared'

const PAGE_SIZE = 9
const { Text } = Typography

/**
 * 接收方公告列表（PRD §5.6）
 * 旅行社侧（「公告通知」）与文旅厅侧（「公告发布管理 → 公告接收」）复用本页，
 * 均按可见性规则（§2.3）展示定向给自己的已发布公告。
 * 置顶公告与普通公告统一为卡片流：置顶优先排前，样式一致（V1.3 调整）。
 */
export default function AnnouncementBrowseList() {
  const navigate = useNavigate()
  const { currentUser, announcementCategories, announcements, announcementReads } = useStore()
  const isManager = isAnnouncementManagerRole(currentUser.role)

  const [category, setCategory] = useState('all')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)

  const categoryName = (id: string) =>
    announcementCategories.find((c) => c.id === id)?.name || '未分类'

  // 可见公告（PRD §2.3 可见性规则）
  const visible = useMemo(
    () => announcements.filter((a) => isVisibleToUser(a, currentUser)),
    [announcements, currentUser],
  )

  // 当前账号的已读公告集合（企业主账号口径 mock）
  const readIds = useMemo(() => {
    const account = getAccountOfUser(currentUser)
    if (!account) return new Set<string>()
    return new Set(
      announcementReads.filter((r) => r.userId === account.id).map((r) => r.announcementId),
    )
  }, [announcementReads, currentUser])

  const isUnread = (a: Announcement) => !readIds.has(a.id)

  // 排序：置顶优先 → 未读强制公告次之 → 发布时间倒序（PRD §5.6）
  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    const list = visible.filter((a) => {
      if (category !== 'all' && a.categoryId !== category) return false
      if (kw) {
        const hit =
          a.title.toLowerCase().includes(kw) || (a.summary || '').toLowerCase().includes(kw)
        if (!hit) return false
      }
      return true
    })
    return list.sort((a, b) => {
      if (a.isTop !== b.isTop) return a.isTop ? -1 : 1
      const fa = a.isForceRead && isUnread(a) ? 1 : 0
      const fb = b.isForceRead && isUnread(b) ? 1 : 0
      if (fa !== fb) return fb - fa
      return (b.publishTime || '').localeCompare(a.publishTime || '')
    })
  }, [visible, category, keyword, readIds])

  const hasFilter = category !== 'all' || keyword.trim() !== ''
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const clearFilters = () => {
    setCategory('all')
    setKeyword('')
    setPage(1)
  }

  // 统一卡片：等宽等高（撑满列宽与行高），未读红点绝对定位于卡片右上角；
  // 封面（无封面用分类默认底图）+ 标题 + 标签行 + 摘要 + 底部信息
  const renderCard = (a: Announcement) => (
    <Col xs={24} sm={12} lg={8} key={a.id} style={{ display: 'flex' }}>
      <div
        style={{
          position: 'relative',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
        }}
        onClick={() => navigate(`/announcements/${a.id}`)}
      >
        {isUnread(a) && (
          <span
            title="未读"
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 2,
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#ff4d4f',
              boxShadow: '0 0 0 2px rgba(255,255,255,0.9)',
            }}
          />
        )}
        <Card
          hoverable
          style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', cursor: 'pointer' }}
          cover={<AnnouncementCover announcement={a} />}
          styles={{ body: { padding: 14, display: 'flex', flexDirection: 'column', flex: 1 } }}
        >
          <div
            title={a.title}
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
            {a.title}
          </div>
          <Space size={4} wrap style={{ marginBottom: 8 }}>
            <Tag style={{ marginRight: 0 }}>{categoryName(a.categoryId)}</Tag>
            {a.isTop && (
              <Tag color="orange" style={{ marginRight: 0 }}>
                置顶
              </Tag>
            )}
            {a.isForceRead && (
              <Tag color="red" style={{ marginRight: 0 }}>
                强制阅读
              </Tag>
            )}
          </Space>
          <div
            style={{
              color: '#999',
              fontSize: 12,
              marginBottom: 8,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              flex: 1,
            }}
          >
            {a.summary || '—'}
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 'auto',
            }}
          >
            <Text type={isUnread(a) ? 'danger' : 'secondary'} style={{ fontSize: 12 }}>
              {isUnread(a) ? '未读' : '已读'}
            </Text>
            <span style={{ color: '#999', fontSize: 12 }}>
              {(a.publishTime || '').slice(0, 10)} 发布
            </span>
          </div>
        </Card>
      </div>
    </Col>
  )

  return (
    <>
      <PageHeader
        title="公告列表"
        breadcrumb={
          isManager
            ? [{ title: '首页', path: '/' }, { title: '公告发布管理' }, { title: '公告接收' }]
            : [{ title: '首页', path: '/' }, { title: '公告通知' }]
        }
      />
      <PageContainer>
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space wrap>
            <Input
              placeholder="搜索标题/摘要关键词"
              prefix={<SearchOutlined />}
              allowClear
              maxLength={50}
              value={keyword}
              style={{ width: 260 }}
              onChange={(e) => {
                setKeyword(e.target.value)
                setPage(1)
              }}
            />
            <Select
              value={category}
              style={{ width: 130 }}
              onChange={(v) => {
                setCategory(v)
                setPage(1)
              }}
              options={[
                { value: 'all', label: '全部分类' },
                ...[...announcementCategories]
                  .filter((c) => c.status === 'enabled')
                  .sort((a, b) => a.sort - b.sort)
                  .map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          </Space>
        </Card>

        {pageData.length === 0 ? (
          <Card>
            <Empty
              description={hasFilter ? '未找到匹配的公告，可调整关键词或清空筛选' : '暂无公告，敬请期待'}
              style={{ padding: '40px 0' }}
            >
              {hasFilter && <Button onClick={clearFilters}>清空筛选</Button>}
            </Empty>
          </Card>
        ) : (
          <Row gutter={[16, 16]}>{pageData.map(renderCard)}</Row>
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
      </PageContainer>
    </>
  )
}
