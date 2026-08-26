import { Navigate } from 'react-router-dom'
import { useStore } from '../../store'
import { isAnnouncementManagerRole } from '../../types/announcements'
import AnnouncementBrowseList from './AnnouncementBrowseList'
import AnnouncementManageList from './AnnouncementManageList'

/**
 * 公告模块路由入口：按角色分流（PRD §2）
 * - 终审审核员 / 系统管理员 → 公告管理列表（全部状态 + 操作）
 * - 旅行社 → 接收列表（仅定向给自己的已发布公告）
 * - 初/复审审核员不参与本模块，重定向首页
 */
export default function AnnouncementPage() {
  const { currentUser } = useStore()
  if (isAnnouncementManagerRole(currentUser.role)) {
    return <AnnouncementManageList />
  }
  if (currentUser.role === 'applicant') {
    return <AnnouncementBrowseList />
  }
  return <Navigate to="/" replace />
}
