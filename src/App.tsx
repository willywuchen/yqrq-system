import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './components/MainLayout'
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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
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
          {/* 投诉台账 */}
          <Route path="complaints" element={<ComplaintList />} />
          <Route path="complaints/new" element={<ComplaintForm mode="new" />} />
          <Route path="complaints/dashboard" element={<ComplaintDashboard />} />
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
          {/* 兜底 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
