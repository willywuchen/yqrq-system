import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Result } from 'antd'
import MainLayout, { getFirstAvailablePathOfRole } from './components/MainLayout'
import { useStore } from './store'
import { REWARD_MODULE_ENABLED } from './config/featureFlags'
import Dashboard from './pages/Dashboard'
import ApplicationList from './pages/applications/ApplicationList'
import NewApplication from './pages/applications/NewApplication'
import ApplicationForm from './pages/applications/ApplicationForm'
import ApplicationDetail from './pages/applications/ApplicationDetail'
import AuditList from './pages/audit/AuditList'
import ApprovalList from './pages/finance/ApprovalList'
import PaymentList from './pages/finance/PaymentList'
import Statistics from './pages/statistics/Statistics'
import Messages from './pages/messages/Messages'
import EnterpriseProfile from './pages/profile/EnterpriseProfile'
import PolicyInfo from './pages/policy/PolicyInfo'
import ComplaintList from './pages/complaints/ComplaintList'
import ComplaintForm from './pages/complaints/ComplaintForm'
import ComplaintDetail from './pages/complaints/ComplaintDetail'
import ComplaintDashboard from './pages/complaints/ComplaintDashboard'
import ComplaintReportList from './pages/complaints/ComplaintReportList'
import ComplaintReportPreview from './pages/complaints/ComplaintReportPreview'
import ComplaintReportTemplateConfig from './pages/complaints/ComplaintReportTemplateConfig'
import OpinionList from './pages/opinions/OpinionList'
import OpinionForm from './pages/opinions/OpinionForm'
import OpinionDetail from './pages/opinions/OpinionDetail'
import OpinionAnalysisDashboard from './pages/opinions/OpinionAnalysisDashboard'
import WarningCenter from './pages/opinions/WarningCenter'
import OpinionReportList from './pages/opinions/OpinionReportList'
import SubsidyList from './pages/subsidy/SubsidyList'
import NewSubsidy from './pages/subsidy/NewSubsidy'
import SubsidyForm from './pages/subsidy/SubsidyForm'
import SubsidyDetail from './pages/subsidy/SubsidyDetail'
import SubsidyStatistics from './pages/subsidy/SubsidyStatistics'
import CoachMonitorDashboard from './pages/coach-monitor/CoachMonitorDashboard'
import VehicleList from './pages/coach-monitor/VehicleList'
import VehicleDetail from './pages/coach-monitor/VehicleDetail'
import TrackReplay from './pages/coach-monitor/TrackReplay'
import EventList from './pages/coach-monitor/EventList'
import EventDetail from './pages/coach-monitor/EventDetail'
import RuleManagement from './pages/coach-monitor/RuleManagement'
import TrainingPage from './pages/training/TrainingPage'
import TrainingBrowseList from './pages/training/TrainingBrowseList'
import TrainingDetail from './pages/training/TrainingDetail'
import TrainingForm from './pages/training/TrainingForm'
import TrainingCategories from './pages/training/TrainingCategories'
import AnnouncementPage from './pages/announcements/AnnouncementPage'
import AnnouncementDetail from './pages/announcements/AnnouncementDetail'
import AnnouncementForm from './pages/announcements/AnnouncementForm'
import AnnouncementCategories from './pages/announcements/AnnouncementCategories'
import AnnouncementBrowseList from './pages/announcements/AnnouncementBrowseList'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          {/* 引客入黔奖励管理模块：显隐由 REWARD_MODULE_ENABLED 控制，隐藏时入口统一重定向首页，页面代码全部保留 */}
          {REWARD_MODULE_ENABLED ? (
            <>
              <Route index element={<Dashboard />} />
              {/* 申报管理 */}
              <Route path="applications" element={<ApplicationList />} />
              <Route path="applications/new" element={<NewApplication />} />
              <Route path="applications/new/:category" element={<ApplicationForm mode="new" />} />
              <Route path="applications/:id" element={<ApplicationDetail />} />
              <Route path="applications/:id/edit" element={<ApplicationForm mode="edit" />} />
              {/* 企业资质档案 */}
              <Route path="profile" element={<EnterpriseProfile />} />
              {/* 政策信息 */}
              <Route path="policy" element={<PolicyInfo />} />
              {/* 审核管理 */}
              <Route path="audit/todo" element={<AuditList />} />
              <Route path="audit/all" element={<AuditList />} />
              {/* 资金管理 */}
              <Route path="finance/approval" element={<ApprovalList />} />
              <Route path="finance/payment" element={<PaymentList />} />
              {/* 数据统计 */}
              <Route path="statistics" element={<Statistics />} />
              {/* 消息中心 */}
              <Route path="messages" element={<Messages />} />
            </>
          ) : (
            <>
              {/* 奖励模块隐藏：原路由重定向到首页（首页再按角色落到第一个可用菜单） */}
              <Route index element={<HomeEntry />} />
              <Route path="applications/*" element={<Navigate to="/" replace />} />
              <Route path="profile" element={<Navigate to="/" replace />} />
              <Route path="policy" element={<Navigate to="/" replace />} />
              <Route path="audit/*" element={<Navigate to="/" replace />} />
              <Route path="finance/*" element={<Navigate to="/" replace />} />
              <Route path="statistics" element={<Navigate to="/" replace />} />
              <Route path="messages" element={<Navigate to="/" replace />} />
            </>
          )}
          {/* 投诉台账 */}
          <Route path="complaints" element={<ComplaintList />} />
          <Route path="complaints/new" element={<ComplaintForm mode="new" />} />
          <Route path="complaints/dashboard" element={<ComplaintDashboard />} />
      <Route path="complaints/reports" element={<ComplaintReportList />} />
      <Route path="complaints/reports/template-config" element={<ComplaintReportTemplateConfig />} />
      <Route path="complaints/reports/:id" element={<ComplaintReportPreview />} />
      <Route path="complaints/:id" element={<ComplaintDetail />} />
          <Route path="complaints/:id/edit" element={<ComplaintForm mode="edit" />} />
          {/* 舆情管理分析 */}
          <Route path="public-opinion" element={<OpinionList />} />
          <Route path="public-opinion/new" element={<OpinionForm mode="new" />} />
          <Route path="public-opinion/dashboard" element={<OpinionAnalysisDashboard />} />
          <Route path="public-opinion/warnings" element={<WarningCenter />} />
          <Route path="public-opinion/reports" element={<OpinionReportList />} />
          <Route path="public-opinion/:id" element={<OpinionDetail />} />
          <Route path="public-opinion/:id/edit" element={<OpinionForm mode="edit" />} />
          {/* 引客入黔补贴管理（简化版，无审核流程） */}
          <Route path="subsidy" element={<SubsidyList />} />
          <Route path="subsidy/new" element={<NewSubsidy />} />
          <Route path="subsidy/statistics" element={<SubsidyStatistics />} />
          <Route path="subsidy/:id" element={<SubsidyDetail />} />
          <Route path="subsidy/:id/edit" element={<SubsidyForm />} />
          {/* 旅游包车智慧监管 */}
          <Route path="coach-monitor" element={<CoachMonitorDashboard />} />
          <Route path="coach-monitor/vehicles" element={<VehicleList />} />
          <Route path="coach-monitor/vehicles/:id" element={<VehicleDetail />} />
          <Route path="coach-monitor/tracks" element={<TrackReplay />} />
          <Route path="coach-monitor/events" element={<EventList />} />
          <Route path="coach-monitor/events/:id" element={<EventDetail />} />
          <Route path="coach-monitor/rules" element={<RuleManagement />} />
          {/* 学习培训管理（/training 按角色分流：文旅厅管理列表 / 旅行社浏览列表） */}
          <Route path="training" element={<TrainingPage />} />
          {/* 学习资料浏览视图（旅行社主入口；文旅厅菜单「学习资料」同用此页） */}
          <Route path="training/library" element={<TrainingBrowseList />} />
          <Route path="training/categories" element={<TrainingCategories />} />
          <Route path="training/new" element={<TrainingForm mode="new" />} />
          <Route path="training/edit/:id" element={<TrainingForm mode="edit" />} />
          <Route path="training/:id" element={<TrainingDetail />} />
          {/* 公告发布管理（/announcements 按角色分流：文旅厅管理列表 / 旅行社接收列表；初/复审重定向首页）
              /announcements/inbox 为文旅厅侧的公告接收视图（复用接收列表，V1.3） */}
          <Route path="announcements" element={<AnnouncementPage />} />
          <Route path="announcements/inbox" element={<AnnouncementBrowseList />} />
          <Route path="announcements/categories" element={<AnnouncementCategories />} />
          <Route path="announcements/new" element={<AnnouncementForm mode="new" />} />
          <Route path="announcements/edit/:id" element={<AnnouncementForm mode="edit" />} />
          <Route path="announcements/:id" element={<AnnouncementDetail />} />
          {/* 兜底 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

// 首页入口：奖励模块隐藏时不再展示原工作台，改为跳转到当前角色第一个可用菜单；
// 初审/复审角色仅有奖励管理菜单，隐藏后无可用功能，展示提示页
function HomeEntry() {
  const { currentUser } = useStore()
  if (REWARD_MODULE_ENABLED) return <Dashboard />
  const target = getFirstAvailablePathOfRole(currentUser.role)
  if (target) return <Navigate to={target} replace />
  return (
    <Result
      status="info"
      title="当前角色暂无可用功能"
      subTitle={'"引客入黔奖励管理"模块已临时下线，可切换右上角用户体验其他角色功能。'}
    />
  )
}
