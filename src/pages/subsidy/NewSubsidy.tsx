import { useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Row,
  Select,
  Space,
  Tag,
  App,
  Typography,
} from 'antd'
import {
  ArrowLeftOutlined,
  TeamOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import { useStore } from '../../store'
import { MockTeamPresets, type TeamPreset, buildSubsidyFromTeamPreset } from '../../mock/data'
import { genId, nowStr } from '../../utils'

const { Text } = Typography

export default function NewSubsidy() {
  const navigate = useNavigate()
  const { currentUser, addSubsidyApplication, appendSubsidyLog, subsidyApplications } = useStore()
  const { message } = App.useApp()

  const [selectedDispatchNo, setSelectedDispatchNo] = useState<string | undefined>(undefined)

  // 已申报过的团信息（按 dispatchNo 唯一性校验）
  const claimedDispatchNos = useMemo(() => {
    return new Set(subsidyApplications.map((a) => a.teamPresetSnapshot.dispatchNo))
  }, [subsidyApplications])

  const selectedTeam = useMemo(
    () => MockTeamPresets.find((t) => t.dispatchNo === selectedDispatchNo) || null,
    [selectedDispatchNo],
  )

  // 下拉选项
  const teamOptions = useMemo(() => {
    return MockTeamPresets.map((t) => {
      const claimed = claimedDispatchNos.has(t.dispatchNo)
      const sourcePlaces = Array.from(new Set(t.tourists.map((tu) => tu.sourcePlace || tu.nationality).filter(Boolean)))
      return {
        value: t.dispatchNo,
        label: (
          <Space>
            <span>{t.teamName}</span>
            <Tag color="blue" style={{ margin: 0 }}>{t.dispatchNo}</Tag>
            <span style={{ color: '#999', fontSize: 12 }}>
              {t.travelStart} · {t.stayDays}天 · {t.teamSize}人 · {sourcePlaces.join('、') || '-'}
            </span>
            {claimed && <Tag color="default" style={{ margin: 0 }}>已申报</Tag>}
          </Space>
        ),
        disabled: claimed,
      }
    })
  }, [claimedDispatchNos])

  const handleConfirmAndFetch = () => {
    if (!selectedTeam) return
    // 生成新申报记录
    const newId = genId('SUB')
    const app = buildSubsidyFromTeamPreset(selectedTeam, {
      id: newId,
      applicationNo: newId,
      createdBy: currentUser.name,
      createdByOrg: currentUser.org || '',
    })
    addSubsidyApplication(app)
    appendSubsidyLog({
      id: `sol-create-${newId}-${Date.now()}`,
      applicationId: newId,
      operator: currentUser.name,
      operatorRole: currentUser.role,
      action: 'create',
      comment: `从团信息[${selectedTeam.teamName}]拉取创建`,
      time: nowStr(),
    })
    message.success(`已从团信息「${selectedTeam.teamName}」拉取并创建申报记录`)
    navigate(`/subsidy/${newId}/edit`)
  }

  return (
    <>
      <PageHeader
        title="新建补贴申报"
        breadcrumb={[
          { title: '首页', path: '/' },
          { title: '引客入黔补贴管理', path: '/subsidy' },
          { title: '新建申报' },
        ]}
        extra={
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/subsidy')}>
            返回列表
          </Button>
        }
      />
      <PageContainer>
        <div style={{ padding: 16 }}>
          <Alert
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
            message="操作说明"
            description="请选择一条已填报的团信息，系统将自动拉取该团的全部信息并填充至补贴申报表。已申报过的团信息不可重复选择。"
            style={{ marginBottom: 16 }}
          />

          {MockTeamPresets.length === 0 ? (
            <Card>
              <Empty description="暂无可用的团信息，请先完成团信息填报" />
            </Card>
          ) : (
            <Card
              title={
                <Space>
                  <ThunderboltOutlined />
                  <span>选择团信息（共 {MockTeamPresets.length} 条）</span>
                </Space>
              }
            >
              <Select
                placeholder="请选择团信息（支持搜索团名称、团队编号、客源地）"
                showSearch
                allowClear
                style={{ width: '100%' }}
                value={selectedDispatchNo}
                onChange={(v) => setSelectedDispatchNo(v)}
                options={teamOptions}
                optionFilterProp="label"
                filterOption={(input, option) => {
                  // 兼容自定义label节点搜索
                  const t = MockTeamPresets.find((x) => x.dispatchNo === option?.value)
                  if (!t) return false
                  const sp = Array.from(new Set(t.tourists.map((tu) => tu.sourcePlace || tu.nationality).filter(Boolean)))
                  const kw = input.toLowerCase()
                  return (
                    t.teamName.toLowerCase().includes(kw) ||
                    t.dispatchNo.toLowerCase().includes(kw) ||
                    t.travelStart.toLowerCase().includes(kw) ||
                    sp.join('、').toLowerCase().includes(kw) ||
                    t.travelDesc.toLowerCase().includes(kw)
                  )
                }}
              />
              <div style={{ marginTop: 8, color: '#999', fontSize: 12 }}>
                提示：下拉框中已申报的团信息会显示「已申报」标签并禁用选择。
              </div>
            </Card>
          )}

          {/* 选中团信息预览 */}
          {selectedTeam && (
            <Card
              title={
                <Space>
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  <span>已选团信息预览（拉取后将自动填充至申报表）</span>
                </Space>
              }
              style={{ marginTop: 16 }}
            >
              <Descriptions bordered column={3} size="small">
                <Descriptions.Item label="团名称" span={2}>
                  {selectedTeam.teamName}
                </Descriptions.Item>
                <Descriptions.Item label="团队编号">{selectedTeam.dispatchNo}</Descriptions.Item>
                <Descriptions.Item label="出团日期">
                  <Space>
                    <CalendarOutlined />
                    {selectedTeam.travelStart} ~ {selectedTeam.travelEnd}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="行程天数">{selectedTeam.stayDays}天</Descriptions.Item>
                <Descriptions.Item label="团队人数">
                  <Space>
                    <TeamOutlined />
                    {selectedTeam.teamSize}人（入境 {selectedTeam.inboundTourists}人）
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="客源地" span={3}>
                  <Space>
                    <EnvironmentOutlined />
                    {Array.from(new Set(selectedTeam.tourists.map((t) => t.sourcePlace || t.nationality).filter(Boolean))).join('、')}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="旅游路线" span={3}>
                  {selectedTeam.travelDesc}
                </Descriptions.Item>
                <Descriptions.Item label="景区" span={3}>
                  <Space wrap>
                    {selectedTeam.scenics.map((s) => (
                      <Tag key={s.key} color={s.level === '5A' ? 'magenta' : s.level === '4A' ? 'purple' : 'default'}>
                        {s.name}
                      </Tag>
                    ))}
                    {selectedTeam.scenics.length === 0 && <Text type="secondary">无景区</Text>}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="住宿酒店" span={3}>
                  <Space wrap>
                    {selectedTeam.accommodations.map((a, i) => (
                      <Tag key={a.key} color="blue">
                        第{i + 1}晚：{a.hotelName}
                      </Tag>
                    ))}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="导游/司机" span={3}>
                  <Space wrap>
                    {selectedTeam.guideDrivers.map((g) => (
                      <Tag key={g.key} color={g.type === 'guide' ? 'cyan' : 'gold'}>
                        {g.type === 'guide' ? '导游' : '司机'}：{g.name}
                        {g.licenseNo ? `（${g.licenseNo}）` : ''}
                      </Tag>
                    ))}
                  </Space>
                </Descriptions.Item>
              </Descriptions>

              <Row style={{ marginTop: 16 }} justify="end">
                <Space>
                  <Button onClick={() => setSelectedDispatchNo(undefined)}>取消选择</Button>
                  <Button
                    type="primary"
                    icon={<ThunderboltOutlined />}
                    onClick={handleConfirmAndFetch}
                  >
                    确认并拉取
                  </Button>
                </Space>
              </Row>
            </Card>
          )}
        </div>
      </PageContainer>
    </>
  )
}
