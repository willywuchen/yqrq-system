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
  CarOutlined,
  EnvironmentOutlined,
  AlertOutlined,
  SettingOutlined,
  BookOutlined,
  AppstoreOutlined,
  SoundOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useStore } from '../store'
import { UserRoleLabels } from '../types'
import type { UserRole } from '../types'
import { REWARD_MODULE_ENABLED, HIDDEN_USER_ROLES, OPINION_WARNING_REPORT_ENABLED } from '../config/featureFlags'
import { getUnreadAnnouncements, getAccountOfUser } from '../mock/announcements'
import { isAnnouncementManagerRole, isAnnouncementReceiverRole } from '../types/announcements'
import ForceReadModal from '../pages/announcements/ForceReadModal'

const { Header, Sider, Content } = Layout

// 舆情管理分析 - 子菜单（final_reviewer / admin 共用）
// 风险预警、舆情报告按功能开关隐藏入口，页面与路由代码保留
function opinionMenuChildren() {
  const children = [
    { key: '/public-opinion', icon: <FileSearchOutlined />, label: '舆情管理' },
    { key: '/public-opinion/dashboard', icon: <BarChartOutlined />, label: '舆情分析' },
    { key: '/public-opinion/warnings', icon: <WarningOutlined />, label: '风险预警' },
    { key: '/public-opinion/reports', icon: <FileTextOutlined />, label: '舆情报告' },
  ]
  if (OPINION_WARNING_REPORT_ENABLED) return children
  return children.filter((c) => c.key !== '/public-opinion/warnings' && c.key !== '/public-opinion/reports')
}

// 旅游包车智慧监管 - 一级菜单（final_reviewer / admin 共用）
const coachMonitorMenu = {
  key: 'coach-monitor-management',
  icon: <CarOutlined />,
  label: '旅游包车智慧监管',
  children: [
    { key: '/coach-monitor', icon: <RadarChartOutlined />, label: '监管看板' },
    { key: '/coach-monitor/vehicles', icon: <CarOutlined />, label: '车辆档案' },
    { key: '/coach-monitor/tracks', icon: <EnvironmentOutlined />, label: '轨迹回放' },
    { key: '/coach-monitor/events', icon: <AlertOutlined />, label: '风险事件' },
    { key: '/coach-monitor/rules', icon: <SettingOutlined />, label: '风险识别规则' },
  ],
}

// 文库管理 - 一级菜单（final_reviewer / admin 共用）
// 「文库查看」为旅行社浏览视图的厅侧入口，与旅行社角色看到同一页面（PRD V1.1）
const trainingManageMenu = {
  key: 'training-management',
  icon: <BookOutlined />,
  label: '文库管理',
  children: [
    { key: '/training/library', icon: <ReadOutlined />, label: '文库查看' },
    { key: '/training', icon: <FileTextOutlined />, label: '文库发布' },
    { key: '/training/categories', icon: <AppstoreOutlined />, label: '分类管理' },
  ],
}

// 公告发布管理 - 一级菜单（final_reviewer / admin；初/复审不参与本模块，PRD V1.2）
// 「公告接收」为厅侧的接收视图，复用旅行社侧公告列表（V1.3）
const announcementManageMenu = {
  key: 'announcement-management',
  icon: <SoundOutlined />,
  label: '公告发布管理',
  children: [
    { key: '/announcements', icon: <FileTextOutlined />, label: '公告管理' },
    { key: '/announcements/inbox', icon: <SoundOutlined />, label: '公告接收' },
    { key: '/announcements/categories', icon: <AppstoreOutlined />, label: '分类管理' },
  ],
}

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
      ],
    },
    // 文库查看（旅行社只读入口，PRD §2.3）
    {
      key: '/training',
      icon: <BookOutlined />,
      label: '文库查看',
    },
    // 公告通知（旅行社只读接收入口，未读徽标在渲染时包装，PRD §2.4）
    {
      key: '/announcements',
      icon: <SoundOutlined />,
      label: '公告通知',
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
        { key: '/complaints/reports', icon: <FileTextOutlined />, label: '数据报表' },
      ],
    },
    {
      key: 'opinion-management',
      icon: <RadarChartOutlined />,
      label: '舆情管理分析',
      children: opinionMenuChildren(),
    },
    coachMonitorMenu,
    trainingManageMenu,
    announcementManageMenu,
  ],
  // 第三方查验：仅有补贴申报查看权限（只读视角，不含数据统计）
  third_party_reviewer: [
    {
      key: 'subsidy-management',
      icon: <GiftOutlined />,
      label: '引客入黔补贴管理',
      children: [
        { key: '/subsidy', icon: <FileTextOutlined />, label: '补贴申报查看' },
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
        { key: '/complaints/reports', icon: <FileTextOutlined />, label: '数据报表' },
      ],
    },
    {
      key: 'opinion-management',
      icon: <RadarChartOutlined />,
      label: '舆情管理分析',
      children: opinionMenuChildren(),
    },
    coachMonitorMenu,
    trainingManageMenu,
    announcementManageMenu,
  ],
}

// 按功能开关过滤菜单：隐藏"引客入黔奖励管理"模块时，去掉该一级菜单分组（代码保留）
function visibleMenusOfRole(role: UserRole) {
  const menus = roleMenuMap[role]
  if (REWARD_MODULE_ENABLED) return menus
  return menus.filter((m) => m.key !== 'reward-management')
}

// 当前角色第一个可用菜单的路径；奖励模块隐藏时供首页/跳转兜底使用，无可用菜单返回 null
// oxlint-disable-next-line only-export-components
export function getFirstAvailablePathOfRole(role: UserRole): string | null {
  const first = visibleMenusOfRole(role)[0]
  if (!first) return null
  return first.children ? first.children[0].key : first.key
}

const roleUsers: { role: UserRole; name: string; org?: string }[] = [
  { role: 'applicant', name: '李明', org: '贵州阳光国际旅行社' },
  { role: 'initial_reviewer', name: '王芳' },
  { role: 'review_reviewer', name: '刘强' },
  { role: 'final_reviewer', name: '陈华' },
  { role: 'third_party_reviewer', name: '赵敏' },
  { role: 'admin', name: '管理员' },
]

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { currentUser, setCurrentUser, messages, announcements, announcementReads, resetAllData, restoreDemoData } = useStore()
  const { modal, message } = App.useApp()
  const {
    token: { colorBgContainer },
  } = theme.useToken()

  const unreadCount = messages.filter((m) => !m.read).length

  // 公告未读数（强制 + 普通）：接收角色（旅行社/终审/管理员）展示；初/复审不参与本模块（PRD §5.8）
  const announcementUnread = isAnnouncementReceiverRole(currentUser.role)
    ? getUnreadAnnouncements(announcements, announcementReads, currentUser).length
    : 0

  // 接收视图路径：旅行社 → 公告通知列表；厅侧（终审/管理员）→ 公告接收（V1.3）
  const inboxPath = isAnnouncementManagerRole(currentUser.role)
    ? '/announcements/inbox'
    : '/announcements'

  const menuItems = visibleMenusOfRole(currentUser.role).map((m) =>
    (m.key === '/announcements' || m.key === '/announcements/inbox') && announcementUnread > 0
      ? {
          ...m,
          label: (
            // 暗色菜单内文字颜色恢复继承由 index.css 的 .ant-menu-dark .ant-badge 规则处理
            <Badge count={announcementUnread} size="small" offset={[8, 0]}>
              <span>{m.label}</span>
            </Badge>
          ),
        }
      : m,
  )

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
    // 奖励模块隐藏后部分角色（初审/复审）可能没有可用菜单，兜底回到首页
    navigate(getFirstAvailablePathOfRole(role) ?? '/')
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
        // 奖励模块隐藏时 /applications 不可达，改为当前角色第一个可用页面
        navigate(getFirstAvailablePathOfRole(currentUser.role) ?? '/')
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
      // 按开关过滤掉临时隐藏的角色（初审/复审），角色定义本身保留
      ...roleUsers
        .filter((u) => !HIDDEN_USER_ROLES.includes(u.role))
        .map((u) => ({
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
            {/* 公告图标：未读数红点徽标，点击进入公告接收视图（接收角色可见，PRD §5.8） */}
            {isAnnouncementReceiverRole(currentUser.role) && (
              <Badge count={announcementUnread} size="small" title={`${announcementUnread} 条未读公告`}>
                <SoundOutlined
                  style={{ fontSize: 18, cursor: 'pointer' }}
                  onClick={() => navigate(inboxPath)}
                />
              </Badge>
            )}
            {/* 消息中心属于奖励管理模块，模块隐藏时顶栏铃铛一并隐藏 */}
            {REWARD_MODULE_ENABLED && (
              <Badge count={unreadCount} size="small">
                <BellOutlined
                  style={{ fontSize: 18, cursor: 'pointer' }}
                  onClick={() => navigate('/messages')}
                />
              </Badge>
            )}
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
        {/* 强制阅读弹窗：全局遮罩，未确认的强制公告逐条弹出（PRD §5.8） */}
        {getAccountOfUser(currentUser) && <ForceReadModal />}
      </Layout>
    </Layout>
  )
}
