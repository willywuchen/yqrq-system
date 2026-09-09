import { Button, Result } from 'antd'
import { useNavigate } from 'react-router-dom'
import PageHeader, { PageContainer } from '../../../components/PageHeader'

/**
 * 团行程管理 · 合同管理（菜单占位页）
 * 该功能已在既有系统开发完成，正式开发时在此接入即可，本次不开发
 */
export default function ContractPlaceholder() {
  const navigate = useNavigate()
  return (
    <>
      <PageHeader title="合同管理" breadcrumb={[{ title: '团行程管理' }, { title: '合同管理' }]} />
      <PageContainer>
        <Result
          status="info"
          title="合同管理功能接入准备中"
          subTitle="合同管理已在既有系统开发完成，正式开发时接入本平台即可，敬请期待。"
          extra={
            <Button type="primary" onClick={() => navigate('/agency/itineraries')}>
              返回团行程单
            </Button>
          }
        />
      </PageContainer>
    </>
  )
}
