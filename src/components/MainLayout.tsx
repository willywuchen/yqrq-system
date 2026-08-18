import { useState } from 'react'
import { Layout, Menu, theme, Avatar, Dropdown, Badge, Space, Tag, App } from 'antd'
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
  TrophyOutlined,
  FileSearchOutlined,
  RadarChartOutlined,
  WarningOutlined,
  GiftOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useStore } from '../store'
import { UserRoleLabels } from '../types'
import type { UserRole } from '../types'

const { Header, Sider, Content } = Layout

const roleMenuMap: Record<UserRole, any[]> = {
  applicant: [
    {
      key: 'reward-management',
      icon: <TrophyOutlined />,
      label: '引客入黔奖励管理',
      children: [
        { key: '/applications', icon: <FileTextOutlined />, label: '我的申报' },
        { key: '/applications/new', icon: <FileTextOutlined />, label: '新建申报' },
        { key: '/profile', icon: <ProfileOutlined />, label: '企业资质档案' },
        { key: '/policy', icon: <ReadOutlined />, label: '政策信息' },
        { key: '/messages', icon: <BellOutlined />, label: '消息中心' },
      ],
    },
    {
      key: 'subsidy-management',
      icon: <GiftOutlined />,
      label: '引客入黔补贴管理',
      children: [
        { key: '/subsidy', icon: <FileTextOutlined />, label: '补贴申报列表' },
        { key: '/subsidy/new', icon: <FileTextOutlined />, label: '新建补贴申报' },
      ],
    },
  ],
  initial_reviewer: [
    {
      key: 'reward-management',
      icon: <TrophyOutlined />,
      label: '引客入黔奖励管理',
      children: [
        { key: '/audit/todo', icon: <AuditOutlined />, label: '待办审核' },
        { key: '/audit/all', icon: <AuditOutlined />, label: '全部记录' },
        { key: '/policy', icon: <ReadOutlined />, label: '政策信息' },
        { key: '/messages', icon: <BellOutlined />, label: '消息中心' },
      ],
    },
  ],
  review_reviewer: [
    {
      key: 'reward-management',
      icon: <TrophyOutlined />,
      label: '引客入黔奖励管理',
      children: [
        { key: '/audit/todo', icon: <AuditOutlined />, label: '待办审核' },
        { key: '/audit/all', icon: <AuditOutlined />, label: '全部记录' },
        { key: '/policy', icon: <ReadOutlined />, label: '政策信息' },
        { key: '/messages', icon: <BellOutlined />, label: '消息中心' },
      ],
    },
  ],
  final_reviewer: [
    {
      key: 'reward-management',
      icon: <TrophyOutlined />,
      label: '引客入黔奖励管理',
      children: [
        { key: '/audit/todo', icon: <AuditOutlined />, label: '待办审核' },
        { key: '/audit/all', icon: <AuditOutlined />, label: '全部记录' },
        { key: '/finance/approval', icon: <MoneyCollectOutlined />, label: '奖励核定' },
        { key: '/policy', icon: <ReadOutlined />, label: '政策信息' },
        { key: '/statistics', icon: <BarChartOutlined />, label: '数据统计' },
        { key: '/messages', icon: <BellOutlined />, label: '消息中心' },
      ],
    },
    {
      key: 'subsidy-management',
      icon: <GiftOutlined />,
      label: '引客入黔补贴管理',
      children: [
        { key: '/subsidy', icon: <FileTextOutlined />, label: '补贴申报查看' },
        { key: '/subsidy/statistics', icon: <BarChartOutlined />, label: '数据统计' },
      ],
    },
    {
      key: 'complaint-management',
      icon: <FileSearchOutlined />,
      label: '投诉台账',
      children: [
        { key: '/complaints', icon: <FileTextOutlined />, label: '台账列表' },
        { key: '/complaints/dashboard', icon: <BarChartOutlined />, label: '数据看板' },
      ],
    },
    {
      key: 'opinion-management',
      icon: <RadarChartOutlined />,
      label: '舆情管理分析',
      children: [
        { key: '/public-opinion', icon: <FileSearchOutlined />, label: '舆情管理' },
        { key: '/public-opinion/dashboard', icon: <BarChartOutlined />, label: '舆情分析' },
        { key: '/public-opinion/warnings', icon: <WarningOutlined />, label: '风险预警' },
        { key: '/public-opinion/reports', icon: <FileTextOutlined />, label: '舆情报告' },
      ],
    },
  ],
  admin: [
    {
      key: 'reward-management',
      icon: <TrophyOutlined />,
      label: '引客入黔奖励管理',
      children: [
        { key: '/applications', icon: <FileTextOutlined />, label: '申报管理' },
        { key: '/audit/all', icon: <AuditOutlined />, label: '审核记录' },
        { key: '/finance/payment', icon: <MoneyCollectOutlined />, label: '资金拨付' },
        { key: '/policy', icon: <ReadOutlined />, label: '政策信息' },
        { key: '/statistics', icon: <BarChartOutlined />, label: '数据统计' },
        { key: '/messages', icon: <BellOutlined />, label: '消息中心' },
      ],
    },
    {
      key: 'complaint-management',
      icon: <FileSearchOutlined />,
      label: '投诉台账',
      children: [
        { key: '/complaints', icon: <FileTextOutlined />, label: '台账列表' },
        { key: '/complaints/dashboard', icon: <BarChartOutlined />, label: '数据看板' },
      ],
    },
    {
      key: 'opinion-management',
      icon: <RadarChartOutlined />,
      label: '舆情管理分析',
      children: [
        { key: '/public-opinion', icon: <FileSearchOutlined />, label: '舆情管理' },
        { key: '/public-opinion/dashboard', icon: <BarChartOutlined />, label: '舆情分析' },
        { key: '/public-opinion/warnings', icon: <WarningOutlined />, label: '风险预警' },
        { key: '/public-opinion/reports', icon: <FileTextOutlined />, label: '舆情报告' },
      ],
    },
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
  const { modal, message } = App.useApp()
  const {
    token: { colorBgContainer },
  } = theme.useToken()

  const unreadCount = messages.filter((m) => !m.read).length
  const menuItems = roleMenuMap[currentUser.role]

  // 当前激活的菜单key（处理子路径，支持嵌套菜单）
  // 按长度降序排列，确保更具体的路径优先匹配（如 /complaints/dashboard 优先于 /complaints）
  const flatKeys = menuItems
    .flatMap((m) =>
      m.children ? m.children.map((c: any) => c.key as string) : [m.key as string],
    )
    .sort((a, b) => b.length - a.length)
  const selectedKey =
    flatKeys.find((k) => location.pathname.startsWith(k) && k !== '/') ||
    (location.pathname === '/' ? flatKeys[0] : location.pathname)

  // 默认展开所有一级菜单
  const openKeys = menuItems.map((m) => m.key as string)

  const handleRoleChange = (role: UserRole) => {
    const u = roleUsers.find((r) => r.role === role)!
    setCurrentUser(u)
    const items = menuItemsOfRole(role)
    const firstItem = items[0]
    const firstKey = firstItem.children ? firstItem.children[0].key : firstItem.key
    navigate(firstKey)
  }

  // 数据全清（演示用）
  const handleResetAllData = () => {
    modal.confirm({
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
    modal.confirm({
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
            fontSize: collapsed ? 14 : 15,
            padding: '0 8px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {collapsed ? '监督' : '贵州文旅市场监督执法平台'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          defaultOpenKeys={openKeys}
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
            <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
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
