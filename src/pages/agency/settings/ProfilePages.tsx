import PageHeader, { PageContainer } from '../../../components/PageHeader'
import { PersonalProfileSection } from './Profiles'

/** 设置中心 · 个人资料（PRD §2.3，🟡） */
export function PersonalProfilePage() {
  return (
    <>
      <PageHeader title="个人资料" breadcrumb={[{ title: '设置中心' }, { title: '个人资料' }]} />
      <PageContainer>
        <PersonalProfileSection />
      </PageContainer>
    </>
  )
}
