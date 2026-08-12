import { useState } from 'react'
import { Card, List, Tag, Button, Space, Empty, Typography, Tabs, Badge } from 'antd'
import {
  BellOutlined,
  AuditOutlined,
  DollarOutlined,
  SettingOutlined,
  CheckOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import { useStore } from '../../store'

const { Text } = Typography

const typeMap = {
  system: { label: '系统', color: 'default', icon: <SettingOutlined /> },
  audit: { label: '审核', color: 'blue', icon: <AuditOutlined /> },
  payment: { label: '资金', color: 'gold', icon: <DollarOutlined /> },
} as const

export default function Messages() {
  const navigate = useNavigate()
  const { messages, markMessageRead, markAllRead } = useStore()
  const [activeTab, setActiveTab] = useState('all')

  const filtered = messages.filter((m) => {
    if (activeTab === 'all') return true
    if (activeTab === 'unread') return !m.read
    return m.type === activeTab
  })

  const unreadCount = messages.filter((m) => !m.read).length

  return (
    <>
      <PageHeader
        title="消息中心"
        breadcrumb={[{ title: '首页', path: '/' }, { title: '消息中心' }]}
        extra={
          <Space>
            <Button icon={<CheckOutlined />} onClick={markAllRead} disabled={unreadCount === 0}>
              全部标为已读
            </Button>
          </Space>
        }
      />
      <PageContainer>
        <Card>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'all',
                label: (
                  <span>
                    <BellOutlined /> 全部消息
                    <Badge count={messages.length} showZero color="#1677ff" style={{ marginLeft: 8 }} />
                  </span>
                ),
              },
              {
                key: 'unread',
                label: (
                  <span>
                    未读
                    <Badge count={unreadCount} style={{ marginLeft: 8 }} />
                  </span>
                ),
              },
              { key: 'audit', label: '审核消息' },
              { key: 'payment', label: '资金消息' },
              { key: 'system', label: '系统消息' },
            ]}
          />
          {filtered.length === 0 ? (
            <Empty description="暂无消息" />
          ) : (
            <List
              dataSource={filtered}
              renderItem={(m) => {
                const t = typeMap[m.type]
                return (
                  <List.Item
                    actions={[
                      !m.read && (
                        <Button
                          type="link"
                          size="small"
                          onClick={() => markMessageRead(m.id)}
                        >
                          标为已读
                        </Button>
                      ),
                      m.applicationId && (
                        <Button
                          type="link"
                          size="small"
                          onClick={() => navigate(`/applications/${m.applicationId}`)}
                        >
                          查看申报
                        </Button>
                      ),
                    ].filter(Boolean)}
                    style={{
                      background: m.read ? 'transparent' : '#f0f5ff',
                      padding: '12px 16px',
                      marginBottom: 8,
                      borderRadius: 4,
                      border: '1px solid #f0f0f0',
                    }}
                  >
                    <List.Item.Meta
                      avatar={
                        <Badge dot={!m.read}>
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: '50%',
                              background: '#e6f4ff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#1677ff',
                              fontSize: 16,
                            }}
                          >
                            {t.icon}
                          </div>
                        </Badge>
                      }
                      title={
                        <Space>
                          <Text strong={!m.read}>{m.title}</Text>
                          <Tag color={t.color}>{t.label}</Tag>
                          {!m.read && <Tag color="red">未读</Tag>}
                        </Space>
                      }
                      description={
                        <div>
                          <div style={{ color: '#666' }}>{m.content}</div>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {m.createTime}
                          </Text>
                        </div>
                      }
                    />
                  </List.Item>
                )
              }}
            />
          )}
        </Card>
      </PageContainer>
    </>
  )
}
