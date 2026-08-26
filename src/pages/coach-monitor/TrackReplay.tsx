import { useMemo, useState } from 'react'
import { Card, Select, Form, DatePicker, Button, Empty, Tag, Row, Col, Statistic } from 'antd'
import { EnvironmentOutlined, ReloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import TrackMap from '../../components/coach-monitor/TrackMap'
import { useStore } from '../../store'
import { RegionLevelLabels } from '../../types/coach-monitor'
import { filterVehicles } from '../../utils/coach-monitor'

const { RangePicker } = DatePicker

/**
 * 轨迹回放页
 * - 选择车辆 + 时间范围
 * - 展示车辆轨迹点
 */
export default function TrackReplay() {
  const {
    coachRegionLevel,
    vehicles,
    tracks,
  } = useStore()

  const visibleVehicles = useMemo(
    () => filterVehicles(vehicles, coachRegionLevel),
    [vehicles, coachRegionLevel],
  )

  const [vehicleId, setVehicleId] = useState<string | undefined>(
    visibleVehicles[0]?.vehicleId,
  )
  const [dateRange, setDateRange] = useState<
    [dayjs.Dayjs | null, dayjs.Dayjs | null] | null
  >(null)

  const selectedVehicle = vehicles.find((v) => v.vehicleId === vehicleId)

  const filteredTracks = useMemo(() => {
    let list = tracks.filter((t) => t.vehicleId === vehicleId)
    if (dateRange && dateRange[0] && dateRange[1]) {
      list = list.filter((t) => {
        const day = dayjs(t.timestamp)
        return !day.isBefore(dateRange[0], 'day') && !day.isAfter(dateRange[1], 'day')
      })
    }
    return list
  }, [tracks, vehicleId, dateRange])

  const handleReset = () => {
    setVehicleId(visibleVehicles[0]?.vehicleId)
    setDateRange(null)
  }

  return (
    <>
      <PageHeader
        title="轨迹回放"
        breadcrumb={[
          { title: '首页', path: '/' },
          { title: '旅游包车智慧监管', path: '/coach-monitor' },
          { title: '轨迹回放' },
        ]}
        extra={
          <Tag color="blue">
            当前监管层级：{RegionLevelLabels[coachRegionLevel]}
          </Tag>
        }
      />
      <PageContainer>
        <div style={{ padding: 16 }}>
          <Card size="small" style={{ marginBottom: 16 }}>
            <Form layout="inline">
              <Form.Item label="选择车辆">
                <Select
                  placeholder="请选择车辆"
                  value={vehicleId}
                  onChange={setVehicleId}
                  style={{ width: 280 }}
                  showSearch
                  optionFilterProp="label"
                  options={visibleVehicles.map((v) => ({
                    value: v.vehicleId,
                    label: `${v.plateNo}（${v.travelAgencyName || '-'}）`,
                  }))}
                />
              </Form.Item>
              <Form.Item label="时间范围">
                <RangePicker
                  value={dateRange as any}
                  onChange={(v) => setDateRange(v as any)}
                  placeholder={['开始日期', '结束日期']}
                />
              </Form.Item>
              <Form.Item>
                <Button icon={<ReloadOutlined />} onClick={handleReset}>
                  重置
                </Button>
              </Form.Item>
            </Form>
          </Card>

          {selectedVehicle ? (
            <Row gutter={[16, 16]}>
              <Col xs={24} md={6}>
                <Card size="small" title="车辆信息">
                  <Statistic
                    title="车牌号"
                    value={selectedVehicle.plateNo}
                    prefix={<EnvironmentOutlined />}
                  />
                  <div style={{ marginTop: 12 }}>
                    <p style={{ margin: '4px 0' }}>
                      旅行社：{selectedVehicle.travelAgencyName || '-'}
                    </p>
                    <p style={{ margin: '4px 0' }}>
                      所属区域：{selectedVehicle.regionName}
                    </p>
                    <p style={{ margin: '4px 0' }}>
                      轨迹点数：
                      <Tag color="blue">{filteredTracks.length}</Tag>
                    </p>
                  </div>
                </Card>
              </Col>
              <Col xs={24} md={18}>
                {filteredTracks.length > 0 ? (
                  <TrackMap vehicle={selectedVehicle} points={filteredTracks} />
                ) : (
                  <Card>
                    <Empty description="所选时段无轨迹数据" />
                  </Card>
                )}
              </Col>
            </Row>
          ) : (
            <Card>
              <Empty description="请选择车辆查看轨迹" />
            </Card>
          )}
        </div>
      </PageContainer>
    </>
  )
}
