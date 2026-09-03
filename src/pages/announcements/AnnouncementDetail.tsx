import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  App,
  Button,
  Card,
  Divider,
  Result,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  DownloadOutlined,
  DownOutlined,
  EditOutlined,
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import { useStore } from '../../store'
import { formatFileSize } from '../../utils'
import {
  getAccountOfUser,
  isVisibleToUser,
  regionLabel,
  targetShortText,
  toReadAccount,
} from '../../mock/announcements'
import { isAnnouncementManagerRole } from '../../types/announcements'
import { ForceReadTag, TopTag } from './shared'

const { Text, Paragraph } = Typography

/**
 * 公告详情页（PRD §5.7）
 * - 普通公告：接收方打开即记已读（detail_open）
 * - 强制公告（未读）：底部固定确认条，正文滚动至底部后「我已阅读并知晓」方可点击
 * - 强制公告（已读）：确认条显示成功态与确认时间
 */
export default function AnnouncementDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const {
    currentUser,
    announcementCategories,
    announcements,
    announcementReads,
    incrementAnnouncementView,
    markAnnouncementRead,
  } = useStore()

  const isManager = isAnnouncementManagerRole(currentUser.role)
  const announcement = announcements.find((a) => a.id === id)
  const category = announcementCategories.find((c) => c.id === announcement?.categoryId)
  const account = getAccountOfUser(currentUser)

  // 当前用户视角的接收状态
  const isReceiver = !!announcement && isVisibleToUser(announcement, currentUser)
  const ownRecord = announcement && account
    ? announcementReads.find((r) => r.announcementId === announcement.id && r.userId === account.id)
    : undefined
  const forcePending = !!announcement && announcement.isForceRead && isReceiver && !ownRecord

  // 浏览量 +1（ref 防止 StrictMode 双挂载重复计数）
  const countedRef = useRef(false)
  useEffect(() => {
    if (!announcement || !isViewable()) return
    if (countedRef.current) return
    countedRef.current = true
    incrementAnnouncementView(announcement.id)
  }, [announcement?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // 普通公告：接收方打开即记已读（PRD §5.5 已读口径）
  const readMarkedRef = useRef(false)
  useEffect(() => {
    if (!announcement || !account || readMarkedRef.current) return
    if (isReceiver && !announcement.isForceRead && !ownRecord) {
      readMarkedRef.current = true
      markAnnouncementRead(announcement.id, toReadAccount(account), 'detail_open')
    }
  }, [announcement?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // 强制公告确认门槛：正文滚动至页面底部后按钮启用（PRD §5.7，页面级滚动）
  const [reachedBottom, setReachedBottom] = useState(false)
  useEffect(() => {
    setReachedBottom(false)
  }, [announcement?.id])
  useEffect(() => {
    if (!forcePending) return
    const check = () => {
      const doc = document.documentElement
      if (window.innerHeight + window.scrollY >= doc.scrollHeight - 48) {
        setReachedBottom(true)
      }
    }
    // 正文不足一屏：挂载即视为到底
    check()
    window.addEventListener('scroll', check, { passive: true })
    window.addEventListener('resize', check)
    return () => {
      window.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
    }
  }, [forcePending, announcement?.id])

  // 管理角色可查看全部状态；其余角色仅可查看已发布且定向给自己的公告
  function isViewable() {
    return !!announcement && (isManager || isVisibleToUser(announcement, currentUser))
  }

  if (!announcement) {
    return (
      <Result
        status="404"
        title="该公告不存在或已删除"
        extra={
          <Button type="primary" onClick={() => navigate('/announcements')}>
            返回列表
          </Button>
        }
      />
    )
  }

  if (!isViewable()) {
    // 已下架 / 未向当前账号发布，分别提示（PRD §5.7 边界条件）
    return (
      <Result
        status="info"
        title={announcement.status === 'offline' ? '该公告已下架' : '该公告未向当前账号发布'}
        subTitle="该公告当前不可查看，如需了解详情请联系省文旅厅"
        extra={
          <Button type="primary" onClick={() => navigate('/announcements')}>
            返回列表
          </Button>
        }
      />
    )
  }

  const handleConfirm = () => {
    if (!account || !announcement) return
    markAnnouncementRead(announcement.id, toReadAccount(account), 'force_confirm')
    message.success('已完成阅读确认')
  }

  const handleDownload = (name?: string) => {
    void name
    message.info('演示环境：附件为模拟数据，未提供真实下载地址')
  }

  // 返回来源页（接收列表 / 管理列表）；直链进入无历史时按角色兜底
  const handleBack = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate(isManager ? '/announcements/inbox' : '/announcements')
  }

  const backLabel = '返回列表'

  return (
    <>
      <PageHeader
        title="公告详情"
        breadcrumb={[
          { title: '首页', path: '/' },
          ...(isManager
            ? [{ title: '公告发布管理' }, { title: '公告接收', path: '/announcements/inbox' }]
            : [{ title: '公告通知' }, { title: '公告列表', path: '/announcements' }]),
          { title: '公告详情' },
        ]}
        extra={
          isManager &&
          (announcement.status === 'draft' ? (
            <Button
              icon={<EditOutlined />}
              onClick={() => navigate(`/announcements/edit/${announcement.id}`)}
            >
              编辑公告
            </Button>
          ) : (
            <Tooltip
              title={
                announcement.status === 'published'
                  ? '已发布公告不可编辑；如需修改内容，请先下架，再新建公告重新发布'
                  : '已下架公告不可编辑；如需修改内容，请新建公告重新发布'
              }
            >
              <Button icon={<EditOutlined />} disabled>
                编辑公告
              </Button>
            </Tooltip>
          ))
        }
      />
      <PageContainer>
        {isManager && announcement.status === 'draft' && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="该公告为草稿，仅文旅厅内部可见，接收方无法查看"
          />
        )}
        {isManager && announcement.status === 'offline' && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message="该公告已下架，接收方无法查看；可在公告管理列表重新发布或删除（已读统计保留）；公告内容不可修改，如需变更请新建公告重新发布"
          />
        )}

        <Card>
          {/* 封面大图 */}
          {announcement.coverUrl && (
            <img
              src={announcement.coverUrl}
              alt="封面"
              style={{ width: '100%', maxHeight: 320, objectFit: 'cover', borderRadius: 6, marginBottom: 16 }}
            />
          )}

          {/* 标题与元信息 */}
          <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 12 }}>
            {announcement.title}
          </Typography.Title>
          <Space size={8} wrap style={{ marginBottom: 8 }}>
            {category && <Tag>{category.name}</Tag>}
            {announcement.isForceRead && <ForceReadTag />}
            {announcement.isTop && <TopTag />}
          </Space>
          <Space size={16} wrap style={{ marginBottom: 4 }}>
            <Text type="secondary">发布时间：{announcement.publishTime || '未发布'}</Text>
            <Text type="secondary">发布区域：{regionLabel(announcement.region)}</Text>
            <Text type="secondary">发布对象：{targetShortText(announcement.targets) || '—'}</Text>
            <Text type="secondary">浏览量：{announcement.viewCount}</Text>
          </Space>
          {announcement.summary && (
            <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
              {announcement.summary}
            </Paragraph>
          )}
          <Divider style={{ margin: '16px 0' }} />

          {/* 正文 */}
          <div
            className="rich-text-content"
            style={{ lineHeight: 1.9 }}
            dangerouslySetInnerHTML={{ __html: announcement.content || '（无内容）' }}
          />

          {/* 附件区 */}
          {announcement.attachments.length > 0 && (
            <>
              <Divider style={{ margin: '16px 0' }} />
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                附件（{announcement.attachments.length}）
              </Text>
              <Space direction="vertical" size={8} style={{ width: '100%', maxWidth: 720 }}>
                {announcement.attachments.map((a) => (
                  <Card
                    key={a.uid}
                    size="small"
                    style={{ background: '#fafafa' }}
                    styles={{ body: { padding: '8px 12px' } }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span
                        style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {a.name}
                      </span>
                      <Space>
                        <Tag>{formatFileSize(a.size)}</Tag>
                        <Button
                          size="small"
                          icon={<DownloadOutlined />}
                          onClick={() => handleDownload(a.name)}
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
          <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
            {backLabel}
          </Button>
        </Card>
      </PageContainer>

      {/* 强制阅读确认条：吸附视口底部（PRD §5.7） */}
      {announcement.isForceRead && isReceiver && (
        <div
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 100,
            background: '#fff',
            borderTop: '1px solid #f0f0f0',
            boxShadow: '0 -2px 8px rgba(0,0,0,0.08)',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          {ownRecord ? (
            <Space>
              <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} />
              <Text strong>已确认</Text>
              <Text type="secondary">阅读确认时间：{ownRecord.readTime}</Text>
            </Space>
          ) : (
            <>
              <Space>
                {reachedBottom ? (
                  <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />
                ) : (
                  <DownOutlined style={{ color: '#999' }} />
                )}
                <Text type={reachedBottom ? 'success' : 'secondary'}>
                  {reachedBottom ? '已阅读至底部，可进行确认' : '请滚动阅读至公告底部后确认'}
                </Text>
              </Space>
              <Button
                type="primary"
                disabled={!reachedBottom}
                onClick={handleConfirm}
                style={{ minWidth: 160 }}
              >
                我已阅读并知晓
              </Button>
            </>
          )}
        </div>
      )}
    </>
  )
}
