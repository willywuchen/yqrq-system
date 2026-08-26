import { useMemo, useState } from 'react'
import { Alert, Card, Col, Drawer, Empty, Input, Progress, Row, Space, Statistic, Table, Tabs, Tag, Typography } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { useStore } from '../../store'
import {
  countErpAgencies,
  getReadStats,
  regionLabel,
  targetShortText,
} from '../../mock/announcements'
import type { Announcement } from '../../types/announcements'
import { ForceReadTag, TargetTags, districtNameOf } from './shared'
import { MockAgencyAccounts } from '../../mock/announcements'

const { Text, Paragraph } = Typography

interface Props {
  open: boolean
  onClose: () => void
  announcement: Announcement | null
}

/**
 * 已读统计抽屉（PRD §5.5）：总体概览（动态口径）+ 已读/未读名单
 * - 强制公告已读口径：点击"我已阅读并知晓"
 * - 普通公告已读口径：打开详情页
 * - ERP 对象仅显示"待对接"占位（二期接口回传）
 */
export default function ReadStatsDrawer({ open, onClose, announcement }: Props) {
  const { announcementReads } = useStore()
  const [tab, setTab] = useState<'read' | 'unread'>('read')
  const [keyword, setKeyword] = useState('')

  const stats = useMemo(
    () => (announcement ? getReadStats(announcement, announcementReads) : null),
    [announcement, announcementReads],
  )

  // 列表搜索关闭后重置
  const handleClose = () => {
    setTab('read')
    setKeyword('')
    onClose()
  }

  if (!announcement || !stats) return null

  const filterByKeyword = <T extends { name: string; orgName: string }>(list: T[]) => {
    const kw = keyword.trim().toLowerCase()
    if (!kw) return list
    return list.filter(
      (x) => x.name.toLowerCase().includes(kw) || x.orgName.toLowerCase().includes(kw),
    )
  }

  const readList = filterByKeyword(stats.readList)
  const unreadList = filterByKeyword(stats.unreadList)

  const baseColumns = [
    { title: '账号名', dataIndex: 'name', width: 100 },
    {
      title: '类型',
      dataIndex: 'userType',
      width: 90,
      render: (t: 'dept' | 'agency') =>
        t === 'dept' ? <Tag color="geekblue">厅内账号</Tag> : <Tag color="green">旅行社</Tag>,
    },
    { title: '所属', dataIndex: 'orgName', ellipsis: true },
  ]

  const readColumns = [
    ...baseColumns,
    {
      title: '阅读确认时间',
      dataIndex: 'readTime',
      width: 170,
      render: (t: string) => <Text type="secondary">{t}</Text>,
    },
  ]

  const unreadColumns = [
    ...baseColumns,
    {
      title: '注册地',
      dataIndex: 'id',
      width: 200,
      render: (id: string) => {
        if (id.startsWith('dept-')) return <Text type="secondary">—</Text>
        const agency = MockAgencyAccounts.find((a) => a.id === id)
        return agency ? districtNameOf(agency.cityCode, agency.districtCode) : '—'
      },
    },
  ]

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      width={720}
      title={
        <Space size={8} wrap>
          <span>已读统计</span>
          {announcement.isForceRead && <ForceReadTag />}
        </Space>
      }
    >
      {/* 公告摘要信息 */}
      <Paragraph style={{ marginBottom: 4 }}>
        <Text strong>{announcement.title}</Text>
      </Paragraph>
      <Space size={16} wrap style={{ marginBottom: 4 }}>
        <Text type="secondary">发布时间：{announcement.publishTime || '未发布'}</Text>
        <Text type="secondary">发布区域：{regionLabel(announcement.region)}</Text>
      </Space>
      <Space size={8} wrap style={{ marginBottom: 16 }}>
        <Text type="secondary">发布对象：</Text>
        <TargetTags targets={announcement.targets} />
      </Space>

      {/* 总体概览（动态口径） */}
      <Row gutter={12} style={{ marginBottom: 8 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="目标账号数" value={stats.targets.length} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="已读" value={stats.readCount} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="未读" value={stats.unreadCount} valueStyle={{ color: '#ff4d4f' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="已读率" value={stats.readRate} suffix="%" />
          </Card>
        </Col>
      </Row>
      <Progress
        percent={stats.readRate}
        showInfo={false}
        strokeColor={announcement.isForceRead && stats.unreadCount > 0 ? '#ff4d4f' : '#52c41a'}
        style={{ marginBottom: 12 }}
      />
      {announcement.isForceRead && (
        <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
          已读口径：点击「我已阅读并知晓」确认（打开未确认不算已读）；目标账号数为动态口径，新增注册账号自动纳入。
        </Text>
      )}
      {announcement.targets.includes('erp') && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={`旅行社 ERP 系统接收情况需接口对接后统计（二期），当前共 ${countErpAgencies(announcement)} 家 ERP 在册旅行社待回传`}
        />
      )}

      {/* 名单 Tab */}
      <Tabs
        activeKey={tab}
        onChange={(k) => setTab(k as 'read' | 'unread')}
        items={[
          { key: 'read', label: `已读名单（${stats.readCount}）` },
          { key: 'unread', label: `未读名单（${stats.unreadCount}）` },
        ]}
      />
      <Input
        placeholder="搜索账号名/旅行社名称"
        prefix={<SearchOutlined />}
        allowClear
        maxLength={50}
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        style={{ width: 260, marginBottom: 12 }}
      />
      {tab === 'read' ? (
        <Table
          rowKey="id"
          size="small"
          columns={readColumns}
          dataSource={readList}
          pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条` }}
          locale={{ emptyText: <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        />
      ) : (
        <Table
          rowKey="id"
          size="small"
          columns={unreadColumns}
          dataSource={unreadList}
          pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条` }}
          locale={{
            emptyText: <Empty description="全部目标账号已完成阅读 🎉" image={Empty.PRESENTED_IMAGE_SIMPLE} />,
          }}
        />
      )}
      <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
        发布对象：{targetShortText(announcement.targets) || '—'}
      </Text>
    </Drawer>
  )
}
