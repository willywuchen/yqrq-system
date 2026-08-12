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
          {/* 兜底 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
