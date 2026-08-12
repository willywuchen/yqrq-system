import { useState } from 'react'
import { Layout, Menu, theme, Avatar, Dropdown, Badge, Space, Tag, Modal, message } from 'antd'
import {
  FileTextOutlined,
  AuditOutlined,
  MoneyCollectOutlined,
  BarChartOutlined,
  BellOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DownOutlined,
  HomeOutlined,
  ProfileOutlined,
  ReadOutlined,
  DeleteOutlined,
  DatabaseOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useStore } from '../store'
import { UserRoleLabels } from '../types'
import type { UserRole } from '../types'

const { Header, Sider, Content } = Layout

const roleMenuMap: Record<UserRole, any[]> = {
  applicant: [
    { key: '/applications', icon: <FileTextOutlined />, label: '我的申报' },
    { key: '/applications/new', icon: <FileTextOutlined />, label: '新建申报' },
    { key: '/profile', icon: <ProfileOutlined />, label: '企业资质档案' },
    { key: '/policy', icon: <ReadOutlined />, label: '政策信息' },
    { key: '/messages', icon: <BellOutlined />, label: '消息中心' },
  ],
  initial_reviewer: [
    { key: '/audit/todo', icon: <AuditOutlined />, label: '待办审核' },
    { key: '/audit/all', icon: <AuditOutlined />, label: '全部记录' },
    { key: '/policy', icon: <ReadOutlined />, label: '政策信息' },
    { key: '/messages', icon: <BellOutlined />, label: '消息中心' },
  ],
  review_reviewer: [
    { key: '/audit/todo', icon: <AuditOutlined />, label: '待办审核' },
    { key: '/audit/all', icon: <AuditOutlined />, label: '全部记录' },
    { key: '/policy', icon: <ReadOutlined />, label: '政策信息' },
    { key: '/messages', icon: <BellOutlined />, label: '消息中心' },
  ],
  final_reviewer: [
    { key: '/audit/todo', icon: <AuditOutlined />, label: '待办审核' },
    { key: '/audit/all', icon: <AuditOutlined />, label: '全部记录' },
    { key: '/finance/approval', icon: <MoneyCollectOutlined />, label: '奖励核定' },
    { key: '/policy', icon: <ReadOutlined />, label: '政策信息' },
    { key: '/statistics', icon: <BarChartOutlined />, label: '数据统计' },
    { key: '/messages', icon: <BellOutlined />, label: '消息中心' },
  ],
  admin: [
    { key: '/applications', icon: <FileTextOutlined />, label: '申报管理' },
    { key: '/audit/all', icon: <AuditOutlined />, label: '审核记录' },
    { key: '/finance/payment', icon: <MoneyCollectOutlined />, label: '资金拨付' },
    { key: '/policy', icon: <ReadOutlined />, label: '政策信息' },
    { key: '/statistics', icon: <BarChartOutlined />, label: '数据统计' },
    { key: '/messages', icon: <BellOutlined />, label: '消息中心' },
  ],
}

const roleUsers: { role: UserRole; name: string; org?: string }[] = [
  { role: 'applicant', name: '李明', org: '贵州阳光国际旅行社' },
  { role: 'initial_reviewer', name: '王芳' },
  { role: 'review_reviewer', name: '刘强' },
  { role: 'final_reviewer', name: '陈厅长' },
  { role: 'admin', name: '管理员' },
]

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { currentUser, setCurrentUser, messages, resetAllData, restoreDemoData } = useStore()
  const {
    token: { colorBgContainer },
  } = theme.useToken()

  const unreadCount = messages.filter((m) => !m.read).length
  const menuItems = roleMenuMap[currentUser.role]

  // 当前激活的菜单key（处理子路径）
  const selectedKey =
    menuItems.find((m) => location.pathname.startsWith(m.key) && m.key !== '/')?.key ||
    (location.pathname === '/' ? menuItems[0].key : location.pathname)

  const handleRoleChange = (role: UserRole) => {
    const u = roleUsers.find((r) => r.role === role)!
    setCurrentUser(u)
    navigate(menuItemsOfRole(role)[0].key)
  }

  // 数据全清（演示用）
  const handleResetAllData = () => {
    Modal.confirm({
      title: '数据全清确认',
      icon: <DeleteOutlined />,
      content: '将清空所有申报记录、消息通知和企业资质档案。清空后可从空白状态演示完整申报流程。此操作不可撤销。',
      okText: '确认清空',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        resetAllData()
        message.success('已清空所有测试数据')
        navigate('/applications')
      },
    })
  }

  // 恢复演示数据
  const handleRestoreDemoData = () => {
    Modal.confirm({
      title: '恢复演示数据',
      icon: <DatabaseOutlined />,
      content: '将恢复系统内置的演示申报记录和消息通知，便于展示已有数据的页面效果。',
      okText: '确认恢复',
      cancelText: '取消',
      onOk: () => {
        restoreDemoData()
        message.success('已恢复演示数据')
      },
    })
  }

  const userMenu = {
    items: [
      ...roleUsers.map((u) => ({
        key: u.role,
        label: (
          <span>
            <UserOutlined /> {u.name}（{UserRoleLabels[u.role]}）
          </span>
        ),
      })),
      { type: 'divider' as const },
      {
        key: 'reset_data',
        label: (
          <span style={{ color: '#ff4d4f' }}>
            <DeleteOutlined /> 数据全清（演示）
          </span>
        ),
      },
      {
        key: 'restore_data',
        label: (
          <span>
            <DatabaseOutlined /> 恢复演示数据
          </span>
        ),
      },
      { type: 'divider' as const },
      {
        key: 'logout',
        label: '退出登录',
      },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'logout') return
      if (key === 'reset_data') {
        handleResetAllData()
        return
      }
      if (key === 'restore_data') {
        handleRestoreDemoData()
        return
      }
      handleRoleChange(key as UserRole)
    },
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} width={220}>
        <div
          style={{
            height: 56,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600,
            fontSize: collapsed ? 14 : 16,
            padding: '0 12px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {collapsed ? '引黔' : '引客入黔奖励系统'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 16px',
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,21,41,0.08)',
          }}
        >
          <Space>
            <span
              style={{ fontSize: 18, cursor: 'pointer' }}
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </span>
            <Tag color="blue" icon={<HomeOutlined />} style={{ margin: 0 }}>
              2026 年度
            </Tag>
            <Tag color="orange">申报截止：2027-01-31</Tag>
          </Space>
          <Space size="middle">
            <Badge count={unreadCount} size="small">
              <BellOutlined
                style={{ fontSize: 18, cursor: 'pointer' }}
                onClick={() => navigate('/messages')}
              />
            </Badge>
            <Dropdown menu={userMenu} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar size="small" icon={<UserOutlined />} style={{ background: '#1677ff' }} />
                <span>
                  {currentUser.name}
                  <Tag style={{ marginLeft: 8 }}>{UserRoleLabels[currentUser.role]}</Tag>
                </span>
                <DownOutlined />
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content
          style={{
            margin: 0,
            padding: 0,
            minHeight: 280,
            background: '#f0f2f5',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

function menuItemsOfRole(role: UserRole) {
  return roleMenuMap[role]
}
