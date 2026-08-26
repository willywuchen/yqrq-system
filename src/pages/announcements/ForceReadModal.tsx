import { useEffect, useState } from 'react'
import { Alert, Button, List, Modal, Space, Tag, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store'
import {
  getAccountOfUser,
  getForceUnreadAnnouncements,
  regionLabel,
} from '../../mock/announcements'
import { TopTag } from './shared'

const { Text, Paragraph } = Typography

/**
 * 强制阅读提醒弹窗（全局）
 * 弹窗只做提醒与引导：列出未读强制公告（按发布时间正序），不在弹窗内预览全文与确认；
 * 点击【查看全文】后关闭弹窗并跳转详情页，正文滚动至底部后点击「我已阅读并知晓」完成确认。
 * 未确认期间每次登录都会重新提醒；红点/菜单徽标持续显示。
 */
export default function ForceReadModal() {
  const navigate = useNavigate()
  const { currentUser, announcementCategories, announcements, announcementReads } = useStore()

  // 会话内已引导过则不再弹（角色切换后重新弹出）
  const [dismissed, setDismissed] = useState(false)

  const account = getAccountOfUser(currentUser)
  // 初/复审角色无接收账号，不弹窗
  const queue = account
    ? getForceUnreadAnnouncements(announcements, announcementReads, currentUser)
    : []

  useEffect(() => {
    setDismissed(false)
  }, [currentUser.role, currentUser.name])

  if (!account || queue.length === 0 || dismissed) return null

  const handleView = (id: string) => {
    setDismissed(true)
    navigate(`/announcements/${id}`)
  }

  return (
    <Modal
      open
      title={
        <Space size={8}>
          <Tag color="red">强制阅读</Tag>
          <span>必读公告提醒</span>
        </Space>
      }
      width={640}
      closable={false}
      keyboard={false}
      maskClosable={false}
      footer={null}
      zIndex={1100}
    >
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
        message={`您有 ${queue.length} 条必读公告尚未确认`}
        description="请点击「查看全文」阅读公告，并在页面底部完成「我已阅读并知晓」确认。"
      />
      <List
        dataSource={queue}
        renderItem={(a) => {
          const categoryName =
            announcementCategories.find((c) => c.id === a.categoryId)?.name || '未分类'
          return (
            <List.Item
              actions={[
                <Button key="view" type="primary" size="small" onClick={() => handleView(a.id)}>
                  查看全文
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={
                  <Space size={6} wrap>
                    {a.isTop && <TopTag />}
                    <span>{a.title}</span>
                  </Space>
                }
                description={
                  <>
                    <Space size={12} wrap style={{ marginBottom: 4 }}>
                      <Tag style={{ marginRight: 0 }}>{categoryName}</Tag>
                      <Text type="secondary">发布时间：{(a.publishTime || '').slice(0, 16)}</Text>
                      <Text type="secondary">发布区域：{regionLabel(a.region)}</Text>
                    </Space>
                    {a.summary && (
                      <Paragraph type="secondary" ellipsis={{ rows: 1 }} style={{ marginBottom: 0 }}>
                        {a.summary}
                      </Paragraph>
                    )}
                  </>
                }
              />
            </List.Item>
          )
        }}
      />
      <Text type="secondary" style={{ display: 'block', marginTop: 12, fontSize: 12 }}>
        完成阅读确认前，每次登录都会提醒；也可稍后从「公告通知 / 公告接收」列表进入阅读。
      </Text>
    </Modal>
  )
}
