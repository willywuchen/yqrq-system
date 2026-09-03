import { useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Row,
  Space,
  Table,
  Tag,
  Tabs,
  Typography,
  Divider,
  Statistic,
} from 'antd'
import {
  ArrowLeftOutlined,
  EditOutlined,
  ExportOutlined,
  InfoCircleOutlined,
  TeamOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  HomeOutlined,
  GiftOutlined,
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import SubsidyExport from '../../components/subsidy/SubsidyExport'
import { useStore } from '../../store'
import {
  SubsidyStatusColors,
  SubsidyStatusLabels,
  SubsidyRewardMajorColors,
  SubsidyRewardMajorLabels,
  getDeclaredRewardMajors,
  type RewardMajor,
} from '../../types'
import { formatMoney, maskIdNumber, maskPhone } from '../../utils'

const { Text } = Typography

export default function SubsidyDetail() {
  const navigate = useNavigate()
  const params = useParams()
  const id = params.id
  const { subsidyApplications, currentUser } = useStore()
  const [exportOpen, setExportOpen] = useState(false)

  const app = subsidyApplications.find((a) => a.id === id)

  if (!app) {
    return (
      <PageContainer>
        <Card style={{ margin: 16 }}>
          <Alert type="warning" message="未找到申报记录" showIcon />
          <Button style={{ marginTop: 16 }} onClick={() => navigate('/subsidy')}>
            返回列表
          </Button>
        </Card>
      </PageContainer>
    )
  }

  const isApplicant = currentUser.role === 'applicant'
  const canEdit = isApplicant

  const s = app.teamPresetSnapshot
  const bi = app.teamBaseInfo

  // 申报奖励项（三大奖项互斥）：只展示旅行社提交时有数据的奖励项；
  // 三类均未填写金额时（草稿）回退为全部展示
  const declaredMajors = getDeclaredRewardMajors(app)
  const showMajor = (m: RewardMajor) => declaredMajors.length === 0 || declaredMajors.includes(m)

  // 表格列定义（只读）
  const receptionColumns = [
    { title: '申请项目', dataIndex: 'project', width: 300 },
    {
      title: '申请奖励金额（元）',
      dataIndex: 'amount',
      width: 160,
      align: 'right' as const,
      render: (v: number) => formatMoney(v || 0),
    },
    { title: '申请团队人数', dataIndex: 'teamSize', width: 140, align: 'center' as const },
  ]

  const specialColumns = receptionColumns

  const cultureColumns = [
    { title: '申请项目', dataIndex: 'project', width: 160 },
    {
      title: '申请金额（元）',
      dataIndex: 'amount',
      width: 130,
      align: 'right' as const,
      render: (v: number) => formatMoney(v || 0),
    },
    { title: '参加或组织活动名称', dataIndex: 'activityName' },
    { title: '地点', dataIndex: 'location', width: 160 },
    { title: '派遣/接待人数', dataIndex: 'participants', width: 130, align: 'center' as const },
  ]

  const touristColumns = [
    { title: '序号', key: 'idx', width: 60, render: (_: unknown, __: any, i: number) => i + 1, align: 'center' as const },
    { title: '姓名', dataIndex: 'name', width: 140 },
    {
      title: '证件类型',
      dataIndex: 'idType',
      width: 110,
      align: 'center' as const,
      render: (v: string) => {
        const m: Record<string, string> = {
          passport: '护照',
          id_card: '身份证',
          hk_macao_pass: '港澳通行证',
          tw_pass: '台湾通行证',
          temp_entry_permit: '临时入境许可证',
        }
        return m[v] || v
      },
    },
    { title: '证件号码', dataIndex: 'idNumber', width: 160, render: (v: string) => maskIdNumber(v) || '-' },
    { title: '国籍/地区', dataIndex: 'nationality', width: 110, align: 'center' as const },
    { title: '客源地', dataIndex: 'sourcePlace', width: 120 },
    { title: '手机号', dataIndex: 'phone', width: 130, render: (v?: string) => (v ? maskPhone(v) : '-') },
  ]

  // 行程信息列（只读）：按日展示景区与酒店安排（多行文本）
  const itineraryColumns = [
    { title: '序号', key: 'idx', width: 60, render: (_: unknown, __: any, i: number) => i + 1, align: 'center' as const },
    { title: '日期', dataIndex: 'date', width: 150 },
    {
      title: '行程安排（景区、酒店）',
      dataIndex: 'content',
      render: (v: string) => <div style={{ whiteSpace: 'pre-line' }}>{v || '-'}</div>,
    },
  ]

  return (
    <>
      <PageHeader
        title={`申报详情 - ${app.applicationNo}`}
        breadcrumb={[
          { title: '首页', path: '/' },
          { title: '引客入黔补贴管理', path: '/subsidy' },
          { title: '详情' },
        ]}
        extra={
          <Space>
            <Tag color={SubsidyStatusColors[app.status]} style={{ margin: 0 }}>
              {SubsidyStatusLabels[app.status]}
            </Tag>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/subsidy')}>
              返回列表
            </Button>
            {canEdit && (
              <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/subsidy/${app.id}/edit`)}>
                编辑
              </Button>
            )}
            {isApplicant && (
              <Button icon={<ExportOutlined />} onClick={() => setExportOpen(true)}>
                下载申报表
              </Button>
            )}
          </Space>
        }
      >
        <Alert
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          message={
            <Space wrap>
              <span><HomeOutlined /> 申报单位：{app.createdByOrg}</span>
              <Divider type="vertical" />
              <span><TeamOutlined /> 团名称：{s.teamName}</span>
              <Divider type="vertical" />
              <span>
                <GiftOutlined /> 申报奖励项：
                {declaredMajors.length ? (
                  declaredMajors.map((m) => (
                    <Tag key={m} color={SubsidyRewardMajorColors[m]} style={{ marginInlineEnd: 0 }}>
                      {SubsidyRewardMajorLabels[m]}
                    </Tag>
                  ))
                ) : (
                  '未填写'
                )}
              </span>
              <Divider type="vertical" />
              <span><CalendarOutlined /> 出团日期：{s.travelStart}</span>
            </Space>
          }
          style={{ marginBottom: 16 }}
        />
      </PageHeader>
      <PageContainer>
        <div style={{ padding: 16 }}>
          {/* 金额汇总（奖励项互斥，只展示有数据的奖励项；三类均未填写时全部展示） */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            {showMajor('team_reception') && (
              <Col span={declaredMajors.length ? 12 : 6}>
                <Card size="small">
                  <Statistic
                    title={SubsidyRewardMajorLabels.team_reception}
                    value={app.teamReceptionRows.reduce((s, r) => s + r.amount, 0)}
                    precision={2}
                    prefix="¥"
                  />
                </Card>
              </Col>
            )}
            {showMajor('special_tourism') && (
              <Col span={declaredMajors.length ? 12 : 6}>
                <Card size="small">
                  <Statistic
                    title={SubsidyRewardMajorLabels.special_tourism}
                    value={app.specialTourismRows.reduce((s, r) => s + r.amount, 0)}
                    precision={2}
                    prefix="¥"
                  />
                </Card>
              </Col>
            )}
            {showMajor('culture_promotion') && (
              <Col span={declaredMajors.length ? 12 : 6}>
                <Card size="small">
                  <Statistic
                    title={SubsidyRewardMajorLabels.culture_promotion}
                    value={app.culturePromotionRows.reduce((s, r) => s + r.amount, 0)}
                    precision={2}
                    prefix="¥"
                  />
                </Card>
              </Col>
            )}
            <Col span={declaredMajors.length ? 12 : 6}>
              <Card size="small">
                <Statistic
                  title="申请奖励合计"
                  value={app.totalAmount}
                  precision={2}
                  prefix="¥"
                  valueStyle={{ color: '#cf1322', fontWeight: 700 }}
                />
              </Card>
            </Col>
          </Row>

          <Tabs
            defaultActiveKey="block-a"
            items={[
              {
                key: 'block-a',
                label: '申报单位基本信息',
                children: (
                  <Card bordered={false}>
                    <Descriptions bordered column={3} size="small">
                      <Descriptions.Item label="单位名称">{app.unitName}</Descriptions.Item>
                      <Descriptions.Item label="法定代表人">{app.legalRepresentative || '-'}</Descriptions.Item>
                      <Descriptions.Item label="经办人">
                        <Space>
                          {app.operator || '-'}
                          <Tag color="blue" style={{ fontSize: 11 }}>来源：团信息</Tag>
                        </Space>
                      </Descriptions.Item>
                      <Descriptions.Item label="联系电话">{app.contactPhone || '-'}</Descriptions.Item>
                      <Descriptions.Item label="银行账户-户名">{app.bankAccount?.accountName || '-'}</Descriptions.Item>
                      <Descriptions.Item label="银行账户-开户行">{app.bankAccount?.bankName || '-'}</Descriptions.Item>
                      <Descriptions.Item label="银行账户-账号" span={3}>{app.bankAccount?.accountNo || '-'}</Descriptions.Item>
                    </Descriptions>
                  </Card>
                ),
              },
              {
                key: 'block-d',
                label: '团队基本信息',
                children: (
                  <Card bordered={false}>
                    <Descriptions bordered column={2} size="small">
                      <Descriptions.Item label="团队编号">
                        <Space>
                          {bi.teamNo || '-'}
                          <Tag color="blue" style={{ fontSize: 11 }}>团信息</Tag>
                        </Space>
                      </Descriptions.Item>
                      <Descriptions.Item label="游客来源地">
                        <Space>
                          {bi.sourcePlace || '-'}
                          <Tag color="blue" style={{ fontSize: 11 }}>团信息</Tag>
                        </Space>
                      </Descriptions.Item>
                      <Descriptions.Item label="在黔时间">
                        {bi.travelStartDate} 至 {bi.travelEndDate}
                      </Descriptions.Item>
                      <Descriptions.Item label="总晚数 / 总天数">
                        {bi.nights || 0}晚 / {bi.days || 0}天
                      </Descriptions.Item>
                      <Descriptions.Item label="省外组团社名称" span={2}>
                        {bi.outboundTourOrgName || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="团队住宿信息（按晚）" span={2}>
                        <Space wrap>
                          {(bi.hotelFirst5Nights || []).map((h, i) => (
                            <Tag key={i} color="blue">
                              第{i + 1}晚：{h || '-'}
                              {bi.hotelStar ? `（${bi.hotelStar}）` : ''}
                            </Tag>
                          ))}
                          {!bi.hotelFirst5Nights?.length && <Text type="secondary">无</Text>}
                        </Space>
                      </Descriptions.Item>
                      <Descriptions.Item label="酒店星级">{bi.hotelStar || '-'}</Descriptions.Item>
                      <Descriptions.Item label="租用客车">
                        {bi.vehicleCount || 0}辆（车号：{(bi.vehicleNos || []).join('、') || '-'}）
                      </Descriptions.Item>
                      <Descriptions.Item label="4A+景区数量" span={2}>
                        {bi.scenicCount4APlus || 0}个
                      </Descriptions.Item>
                      <Descriptions.Item label="4A+景区名称" span={2}>
                        <Space wrap>
                          {(bi.scenicNames4APlus || []).map((n, i) => (
                            <Tag key={i} color="purple">{n}</Tag>
                          ))}
                          {!bi.scenicNames4APlus?.length && <Text type="secondary">无</Text>}
                        </Space>
                      </Descriptions.Item>
                    </Descriptions>

                    <Divider orientation="left">团信息原始快照</Divider>
                    <Descriptions bordered column={2} size="small">
                      <Descriptions.Item label="团名称">{s.teamName}</Descriptions.Item>
                      <Descriptions.Item label="行程单号">{s.dispatchNo}</Descriptions.Item>
                      <Descriptions.Item label="行程起止">
                        {s.travelStart} ~ {s.travelEnd}
                      </Descriptions.Item>
                      <Descriptions.Item label="行程天数">{s.stayDays}天</Descriptions.Item>
                      <Descriptions.Item label="团队人数">{s.teamSize}人（入境 {s.inboundTourists}人）</Descriptions.Item>
                      <Descriptions.Item label="航班号">{s.flightNo || '-'}</Descriptions.Item>
                      <Descriptions.Item label="旅游路线" span={2}>
                        <Space>
                          <EnvironmentOutlined />
                          {s.travelDesc}
                        </Space>
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                ),
              },
              // 行程信息（按日记录景区与酒店，只读展示）
              {
                key: 'itinerary',
                label: '行程信息',
                children: (
                  <Card bordered={false}>
                    <Table
                      rowKey="key"
                      dataSource={app.itineraryRows || []}
                      columns={itineraryColumns}
                      pagination={false}
                      size="small"
                      locale={{ emptyText: '暂无行程信息' }}
                    />
                  </Card>
                ),
              },
              ...(showMajor('team_reception')
                ? [
                    {
                      key: 'block-b',
                      label: SubsidyRewardMajorLabels.team_reception,
                      children: (
                        <Card bordered={false}>
                          <Table
                            rowKey="key"
                            dataSource={app.teamReceptionRows}
                            columns={receptionColumns}
                            pagination={false}
                            size="small"
                            summary={(data) => {
                              const totalAmt = data.reduce((s, r: any) => s + (Number(r.amount) || 0), 0)
                              const totalPpl = data.reduce((s, r: any) => s + (Number(r.teamSize) || 0), 0)
                              return (
                                <Table.Summary.Row>
                                  <Table.Summary.Cell index={0}><Text strong>合计</Text></Table.Summary.Cell>
                                  <Table.Summary.Cell index={1}>
                                    <Text strong style={{ color: '#cf1322' }}>{formatMoney(totalAmt)}</Text>
                                  </Table.Summary.Cell>
                                  <Table.Summary.Cell index={2}><Text strong>{totalPpl}人</Text></Table.Summary.Cell>
                                </Table.Summary.Row>
                              )
                            }}
                          />
                        </Card>
                      ),
                    },
                  ]
                : []),
              ...(showMajor('special_tourism')
                ? [
                    {
                      key: 'block-c',
                      label: SubsidyRewardMajorLabels.special_tourism,
                      children: (
                        <Card bordered={false}>
                          <Table
                            rowKey="key"
                            dataSource={app.specialTourismRows}
                            columns={specialColumns}
                            pagination={false}
                            size="small"
                            summary={(data) => {
                              const totalAmt = data.reduce((s, r: any) => s + (Number(r.amount) || 0), 0)
                              const totalPpl = data.reduce((s, r: any) => s + (Number(r.teamSize) || 0), 0)
                              return (
                                <Table.Summary.Row>
                                  <Table.Summary.Cell index={0}><Text strong>合计</Text></Table.Summary.Cell>
                                  <Table.Summary.Cell index={1}>
                                    <Text strong style={{ color: '#cf1322' }}>{formatMoney(totalAmt)}</Text>
                                  </Table.Summary.Cell>
                                  <Table.Summary.Cell index={2}><Text strong>{totalPpl}人</Text></Table.Summary.Cell>
                                </Table.Summary.Row>
                              )
                            }}
                          />
                        </Card>
                      ),
                    },
                  ]
                : []),
              ...(showMajor('culture_promotion')
                ? [
                    {
                      key: 'block-e',
                      label: SubsidyRewardMajorLabels.culture_promotion,
                      children: (
                        <Card bordered={false}>
                          <Table
                            rowKey="key"
                            dataSource={app.culturePromotionRows}
                            columns={cultureColumns}
                            pagination={false}
                            size="small"
                            scroll={{ x: 900 }}
                            summary={(data) => {
                              const totalAmt = data.reduce((s, r: any) => s + (Number(r.amount) || 0), 0)
                              const totalPpl = data.reduce((s, r: any) => s + (Number(r.participants) || 0), 0)
                              return (
                                <Table.Summary.Row>
                                  <Table.Summary.Cell index={0}><Text strong>合计</Text></Table.Summary.Cell>
                                  <Table.Summary.Cell index={1}>
                                    <Text strong style={{ color: '#cf1322' }}>{formatMoney(totalAmt)}</Text>
                                  </Table.Summary.Cell>
                                  <Table.Summary.Cell index={2}>-</Table.Summary.Cell>
                                  <Table.Summary.Cell index={3}>-</Table.Summary.Cell>
                                  <Table.Summary.Cell index={4}><Text strong>{totalPpl}人</Text></Table.Summary.Cell>
                                </Table.Summary.Row>
                              )
                            }}
                          />
                        </Card>
                      ),
                    },
                  ]
                : []),
              {
                key: 'tourists',
                label: '游客名单',
                children: (
                  <Card bordered={false}>
                    <Table
                      rowKey="key"
                      dataSource={s.tourists}
                      columns={touristColumns}
                      pagination={false}
                      size="small"
                      scroll={{ x: 900 }}
                    />
                  </Card>
                ),
              },
            ]}
          />

          {/* 底部操作栏 */}
          <Card bordered={false} style={{ marginTop: 16 }}>
            <Row justify="space-between" align="middle">
              <Col>
                <Space>
                  <Tag color={SubsidyStatusColors[app.status]}>
                    {SubsidyStatusLabels[app.status]}
                  </Tag>
                  <Text type="secondary">
                    创建于 {app.createTime}
                    {app.submitTime ? ` · 提交于 ${app.submitTime}` : ''}
                  </Text>
                </Space>
              </Col>
              <Col>
                <Space>
                  <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/subsidy')}>
                    返回列表
                  </Button>
                  {canEdit && (
                    <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/subsidy/${app.id}/edit`)}>
                      编辑
                    </Button>
                  )}
                  {isApplicant && (
                    <Button icon={<ExportOutlined />} onClick={() => setExportOpen(true)}>
                      下载申报表
                    </Button>
                  )}
                </Space>
              </Col>
            </Row>
          </Card>
        </div>
      </PageContainer>

      {isApplicant && (
        <SubsidyExport open={exportOpen} onClose={() => setExportOpen(false)} applicationId={app.id} />
      )}
    </>
  )
}
