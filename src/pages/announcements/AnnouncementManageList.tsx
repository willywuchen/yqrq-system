import { useMemo, useState } from 'react'
import { App, Button, Card, Input, Select, Space, Table, Tag, Tooltip, Typography } from 'antd'
import { BarChartOutlined, EditOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import { useStore } from '../../store'
import { nowStr } from '../../utils'
import { ANNOUNCEMENT_READ_STATS_ENABLED } from '../../config/featureFlags'
import { getReadStats, regionLabel } from '../../mock/announcements'
import {
  AnnouncementStatusLabels,
  ANNOUNCEMENT_LIMITS,
  type Announcement,
  type AnnouncementStatus,
  type AnnouncementTarget,
} from '../../types/announcements'
import { StatusTag, TargetTags, TopTag } from './shared'
import ReadStatsDrawer from './ReadStatsDrawer'

const { Text } = Typography

/**
 * 文旅厅侧 · 公告管理列表（PRD §5.4）
 * 全部状态 + 筛选搜索 + 生命周期操作 + 已读率一览
 */
export default function AnnouncementManageList() {
  const { modal, message } = App.useApp()
  const navigate = useNavigate()
  const {
    announcementCategories,
    announcements,
    announcementReads,
    updateAnnouncement,
    deleteAnnouncement,
    currentUser,
  } = useStore()

  const [status, setStatus] = useState<AnnouncementStatus | 'all'>('all')
  const [category, setCategory] = useState('all')
  const [target, setTarget] = useState<AnnouncementTarget | 'all'>('all')
  const [forceOnly, setForceOnly] = useState<'all' | 'yes'>('all')
  const [keyword, setKeyword] = useState('')
  const [statsFor, setStatsFor] = useState<Announcement | null>(null)

  const categoryName = (id: string) =>
    announcementCategories.find((c) => c.id === id)?.name || '未分类'

  // 默认置顶优先，其次发布时间倒序（PRD §5.4）
  const sorted = useMemo(
    () =>
      [...announcements].sort((a, b) => {
        if (a.isTop !== b.isTop) return a.isTop ? -1 : 1
        return (b.publishTime || b.createTime).localeCompare(a.publishTime || a.createTime)
      }),
    [announcements],
  )

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    return sorted.filter((a) => {
      if (status !== 'all' && a.status !== status) return false
      if (category !== 'all' && a.categoryId !== category) return false
      if (target !== 'all' && !a.targets.includes(target)) return false
      if (forceOnly === 'yes' && !a.isForceRead) return false
      if (kw) {
        const hit =
          a.title.toLowerCase().includes(kw) || (a.summary || '').toLowerCase().includes(kw)
        if (!hit) return false
      }
      return true
    })
  }, [sorted, status, category, target, forceOnly, keyword])

  // 发布前完整性校验（PRD §5.3）
  const checkPublishable = (a: Announcement): string | null => {
    if (!a.title.trim()) return '缺少标题，请补全后再发布'
    const cat = announcementCategories.find((c) => c.id === a.categoryId)
    if (!cat) return '所属分类不存在，请重新选择分类'
    if (cat.status === 'disabled') return '所属分类已停用，请重新选择分类'
    if (!a.content || !a.content.replace(/<[^>]+>/g, '').trim()) return '公告正文为空，请补全后再发布'
    if (a.targets.length === 0) return '发布对象为空，请至少选择一个发布对象'
    return null
  }

  const handlePublish = (a: Announcement) => {
    const error = checkPublishable(a)
    if (error) {
      // 仅草稿可进入编辑页补全；已下架公告不可编辑，提示后可删除或新建公告
      if (a.status === 'draft') {
        message.warning(`${error}（将跳转编辑页）`)
        navigate(`/announcements/edit/${a.id}`)
      } else {
        message.warning(`${error}；已下架公告不可编辑，如需变更内容请新建公告`)
      }
      return
    }
    updateAnnouncement(a.id, {
      status: 'published',
      publishTime: nowStr(),
      updateBy: currentUser.name,
      updateTime: nowStr(),
    })
    message.success('已发布，目标账号即时可见')
  }

  const handleOffline = (a: Announcement) => {
    modal.confirm({
      title: '下架确认',
      content:
        '下架后接收方将无法查看该公告（历史链接打开显示已下架提示），已读统计保留。确认下架？',
      okText: '确认下架',
      cancelText: '取消',
      onOk: () => {
        updateAnnouncement(a.id, {
          status: 'offline',
          updateBy: currentUser.name,
          updateTime: nowStr(),
        })
        message.success('已下架，接收方不再展示该公告')
      },
    })
  }

  const handleDelete = (a: Announcement) => {
    modal.confirm({
      title: '删除确认',
      icon: null,
      content: `删除后不可恢复（已读统计将一并删除），确认删除「${a.title}」？`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        deleteAnnouncement(a.id)
        message.success('公告已删除')
      },
    })
  }

  // 置顶/取消置顶：即时切换；超过建议条数软提示不阻断（PRD §5.3）
  const handleToggleTop = (a: Announcement) => {
    const next = !a.isTop
    updateAnnouncement(a.id, { isTop: next, updateBy: currentUser.name, updateTime: nowStr() })
    if (next) {
      const topCount = announcements.filter((x) => x.isTop && x.id !== a.id).length + 1
      if (topCount > ANNOUNCEMENT_LIMITS.topSuggest) {
        message.warning(`置顶公告较多，建议不超过 ${ANNOUNCEMENT_LIMITS.topSuggest} 条`)
      } else {
        message.success('已置顶')
      }
    } else {
      message.success('已取消置顶')
    }
  }

  // 已读率列：仅已发布展示；仅 ERP 对象显示"待对接"（PRD §5.4）
  const renderReadRate = (a: Announcement) => {
    if (a.status !== 'published') return <Text type="secondary">—</Text>
    if (!a.targets.includes('dept_account') && !a.targets.includes('agency_user')) {
      return <Tooltip title="发布对象仅为 ERP 系统，需二期接口回传后统计"><Tag>待对接</Tag></Tooltip>
    }
    const s = getReadStats(a, announcementReads)
    return (
      <Tooltip title={`已读 ${s.readCount} / 目标 ${s.targets.length}`}>
        <span style={{ cursor: 'default' }}>
          <Text
            strong
            style={{ color: a.isForceRead && s.unreadCount > 0 ? '#ff4d4f' : undefined }}
          >
            {s.readRate}%
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {' '}
            ({s.readCount}/{s.targets.length})
          </Text>
        </span>
      </Tooltip>
    )
  }

  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      render: (_: string, a: Announcement) => (
        <div style={{ padding: '2px 0' }}>
          <a
            onClick={() => navigate(`/announcements/${a.id}`)}
            title={a.title}
            style={{
              display: 'block',
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {a.title}
          </a>
          {(a.isTop || a.isForceRead) && (
            <Space size={4} style={{ marginTop: 4 }}>
              {a.isTop && <TopTag />}
              {a.isForceRead && (
                <Tag color="red" style={{ marginRight: 0 }}>
                  强制阅读
                </Tag>
              )}
            </Space>
          )}
        </div>
      ),
    },
    {
      title: '分类',
      dataIndex: 'categoryId',
      width: 100,
      render: (id: string) => <Tag>{categoryName(id)}</Tag>,
    },
    {
      title: '发布对象',
      dataIndex: 'targets',
      width: 190,
      render: (t: AnnouncementTarget[]) => <TargetTags targets={t} />,
    },
    {
      title: '发布区域',
      dataIndex: 'region',
      width: 140,
      ellipsis: true,
      render: (r: Announcement['region']) => regionLabel(r),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (s: AnnouncementStatus) => <StatusTag status={s} />,
    },
    // 已读率列随功能开关显隐（关闭时整列不渲染，代码保留）
    ...(ANNOUNCEMENT_READ_STATS_ENABLED
      ? [
          {
            title: '已读率',
            key: 'readRate',
            width: 110,
            sorter: (a: Announcement, b: Announcement) => {
              const sa = getReadStats(a, announcementReads).readRate
              const sb = getReadStats(b, announcementReads).readRate
              return sa - sb
            },
            render: (_: unknown, a: Announcement) => renderReadRate(a),
          },
        ]
      : []),
    {
      title: '发布时间',
      dataIndex: 'publishTime',
      width: 160,
      render: (t?: string) => t || '—',
    },
    {
      title: '操作',
      key: 'action',
      width: 280,
      render: (_: unknown, a: Announcement) => (
        <Space size={0} wrap>
          {/* 状态机（PRD §3.5）：草稿/已下架 → 发布、删除；已发布 → 下架、置顶 */}
          {(a.status === 'draft' || a.status === 'offline') && (
            <Button type="link" size="small" onClick={() => handlePublish(a)}>
              {a.status === 'offline' ? '重新发布' : '发布'}
            </Button>
          )}
          {a.status === 'published' && (
            <>
              <Button type="link" size="small" onClick={() => handleToggleTop(a)}>
                {a.isTop ? '取消置顶' : '置顶'}
              </Button>
              <Button type="link" size="small" onClick={() => handleOffline(a)}>
                下架
              </Button>
              {ANNOUNCEMENT_READ_STATS_ENABLED && (
                <Button
                  type="link"
                  size="small"
                  icon={<BarChartOutlined />}
                  onClick={() => setStatsFor(a)}
                >
                  已读统计
                </Button>
              )}
            </>
          )}
          {/* 内容修改规则：仅草稿可编辑；已发布上架后仅可下架，下架后同样不可编辑——如需变更内容，新建公告重新发布 */}
          {a.status === 'draft' ? (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => navigate(`/announcements/edit/${a.id}`)}
            >
              编辑
            </Button>
          ) : (
            <Tooltip
              title={
                a.status === 'published'
                  ? '已发布公告不可编辑；如需修改内容，请先下架，再新建公告重新发布'
                  : '已下架公告不可编辑；如需修改内容，请新建公告重新发布'
              }
            >
              <Button type="link" size="small" icon={<EditOutlined />} disabled>
                编辑
              </Button>
            </Tooltip>
          )}
          {(a.status === 'draft' || a.status === 'offline') && (
            <Button type="link" size="small" danger onClick={() => handleDelete(a)}>
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
        title="公告管理"
        breadcrumb={[{ title: '首页', path: '/' }, { title: '公告发布管理' }, { title: '公告管理' }]}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/announcements/new')}>
            新建公告
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
                ...Object.entries(AnnouncementStatusLabels).map(([value, label]) => ({
                  value: value as AnnouncementStatus,
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
                ...[...announcementCategories]
                  .sort((a, b) => a.sort - b.sort)
                  .map((c) => ({
                    value: c.id,
                    label: c.status === 'disabled' ? `${c.name}（已停用）` : c.name,
                  })),
              ]}
            />
            <Select
              value={target}
              style={{ width: 130 }}
              onChange={setTarget}
              options={[
                { value: 'all', label: '全部对象' },
                { value: 'erp' as AnnouncementTarget, label: '含 ERP 系统' },
                { value: 'dept_account' as AnnouncementTarget, label: '含监管账号' },
                { value: 'agency_user' as AnnouncementTarget, label: '含涉旅企业账号' },
              ]}
            />
            <Select
              value={forceOnly}
              style={{ width: 120 }}
              onChange={setForceOnly}
              options={[
                { value: 'all', label: '全部公告' },
                { value: 'yes', label: '仅强制阅读' },
              ]}
            />
            <Input
              placeholder="搜索标题/摘要关键词"
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
                  <Text type="secondary">暂无公告，点击右上角「新建公告」发布第一条通知</Text>
                </div>
              ),
            }}
          />
        </Card>
      </PageContainer>
      <ReadStatsDrawer
        open={!!statsFor}
        announcement={statsFor}
        onClose={() => setStatsFor(null)}
      />
    </>
  )
}
