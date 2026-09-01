import { useStore } from '../../store'
import { isTrainingManagerRole } from '../../types/training'
import TrainingBrowseList from './TrainingBrowseList'
import TrainingManageList from './TrainingManageList'

/**
 * 学习培训路由入口：按角色分流
 * - 文旅厅 / 系统管理员 → 资料管理列表（全部状态 + 操作）
 * - 旅行社 → 学习资料浏览列表（仅已发布，PRD §2.2 / §2.3）
 */
export default function TrainingPage() {
  const { currentUser } = useStore()
  if (isTrainingManagerRole(currentUser.role)) {
    return <TrainingManageList />
  }
  return <TrainingBrowseList />
}
