import { useMemo, useState } from 'react'
import { Input, Table, Tag } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import PageHeader, { PageContainer } from '../../../components/PageHeader'
import { useStore } from '../../../store'
import { CURRENT_AGENCY } from '../../../mock/agency'

/**
 * 设置中心 · 操作记录（PRD §5.8 / US-17）
 * 资质变更、商家维护、行程单提交/撤销、名单导出等关键操作均写入
 */
export default function OperationLogsPage() {
  const { agencyLogs } = useStore()
  const [keyword, setKeyword] = useState('')

  const filtered = useMemo(
    () =>
      agencyLogs.filter(
        (l) =>
          l.agencyId === CURRENT_AGENCY.id &&
          (!keyword || `${l.action}${l.target}${l.account}`.includes(keyword)),
      ),
    [agencyLogs, keyword],
  )

  const columns = [
    { title: '时间', dataIndex: 'createdAt', width: 170 },
    { title: '操作账号', dataIndex: 'account', width: 100 },
    {
      title: '操作类型',
      dataIndex: 'action',
      width: 130,
      render: (v: string) => <Tag color="blue">{v}</Tag>,
    },
    { title: '操作对象', dataIndex: 'target' },
    { title: '备注', dataIndex: 'detail', render: (v?: string) => v ?? '—' },
  ]

  return (
    <>
      <PageHeader title="操作记录" breadcrumb={[{ title: '设置中心' }, { title: '操作记录' }]}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="按操作类型 / 对象 / 账号搜索"
          style={{ width: 280, marginBottom: 16 }}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </PageHeader>
      <PageContainer>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={filtered}
          pagination={{ showTotal: (t) => `共 ${t} 条` }}
        />
      </PageContainer>
    </>
  )
}
