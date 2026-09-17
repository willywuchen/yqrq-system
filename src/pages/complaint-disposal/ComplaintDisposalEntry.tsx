// /complaint-disposal 按角色分流：
// 市州文旅局（city_bureau）/ 区县文旅局（district_bureau）→ 处置工作台；省级账号（文旅厅/系统管理员）→ 全省投诉列表
import { useStore } from '../../store'
import CityDisposalWorkbench from './CityDisposalWorkbench'
import ProvinceComplaintList from './ProvinceComplaintList'

export default function ComplaintDisposalEntry() {
  const currentUser = useStore((s) => s.currentUser)
  if (currentUser.role === 'city_bureau' || currentUser.role === 'district_bureau') {
    return <CityDisposalWorkbench />
  }
  return <ProvinceComplaintList />
}
