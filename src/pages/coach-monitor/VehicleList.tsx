import { useMemo, useState } from 'react'
import {
  Table,
  Form,
  Input,
  Select,
  Button,
  Space,
  Tag,
  Drawer,
  App,
} from 'antd'
import { PlusOutlined, SearchOutlined, ReloadOutlined, EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import { useStore } from '../../store'
import {
  VehicleStatusLabels,
  VehicleStatusColors,
  VehicleTypeLabels,
  RegionLevelLabels,
  type Vehicle,
  type VehicleStatus,
  type VehicleType,
  type RegionLevel,
} from '../../types/coach-monitor'
import { filterVehicles } from '../../utils/coach-monitor'
import { nowStr, genId } from '../../utils'

/**
 * 车辆档案列表
 * - CRUD + 权限过滤
 */
export default function VehicleList() {
  const navigate = useNavigate()
  const { modal, message } = App.useApp()
  const {
    coachRegionLevel,
    vehicles,
    addVehicle,
    updateVehicle,
    deleteVehicle,
  } = useStore()
  const [form] = Form.useForm()

  const [plateKeyword, setPlateKeyword] = useState('')
  const [agencyKeyword, setAgencyKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | undefined>()
  const [levelFilter, setLevelFilter] = useState<RegionLevel | undefined>()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Vehicle | null>(null)

  const visibleVehicles = useMemo(
    () => filterVehicles(vehicles, coachRegionLevel),
    [vehicles, coachRegionLevel],
  )

  const filtered = useMemo(() => {
    return visibleVehicles.filter((v) => {
      if (plateKeyword && !v.plateNo.includes(plateKeyword)) return false
      if (agencyKeyword && !(v.travelAgencyName || '').includes(agencyKeyword)) return false
      if (statusFilter && v.status !== statusFilter) return false
      if (levelFilter && v.regionLevel !== levelFilter) return false
      return true
    })
  }, [visibleVehicles, plateKeyword, agencyKeyword, statusFilter, levelFilter])

  const handleReset = () => {
    setPlateKeyword('')
    setAgencyKeyword('')
    setStatusFilter(undefined)
    setLevelFilter(undefined)
    form.resetFields()
  }

  const handleDelete = (record: Vehicle) => {
    modal.confirm({
      title: '删除车辆档案',
      content: `删除车辆档案将影响关联数据，确认删除「${record.plateNo}」吗？`,
      okType: 'danger',
      okText: '删除',
      cancelText: '取消',
      onOk: () => {
        deleteVehicle(record.vehicleId)
        message.success('已删除车辆档案')
      },
    })
  }

  const handleAdd = () => {
    setEditing(null)
    form.resetFields()
    setDrawerOpen(true)
  }

  const handleEdit = (record: Vehicle) => {
    setEditing(record)
    form.setFieldsValue({
      ...record,
    })
    setDrawerOpen(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (editing) {
        updateVehicle(editing.vehicleId, values)
        message.success('车辆档案已更新')
      } else {
        const newVehicle: Vehicle = {
          vehicleId: `V${dayjs().format('YYYYMMDD')}${genId('').slice(-6)}`,
          online: false,
          createTime: nowStr(),
          updateTime: nowStr(),
          ...values,
        }
        addVehicle(newVehicle)
        message.success('已新增车辆档案')
      }
      setDrawerOpen(false)
    } catch {
      // 校验失败
    }
  }

  const columns = [
    {
      title: '车牌号',
      dataIndex: 'plateNo',
      width: 110,
      fixed: 'left' as const,
      render: (v: string, r: Vehicle) => (
        <a onClick={() => navigate(`/coach-monitor/vehicles/${r.vehicleId}`)}>{v}</a>
      ),
    },
    {
      title: '车型',
      dataIndex: 'vehicleType',
      width: 80,
      render: (t: VehicleType) => VehicleTypeLabels[t],
    },
    { title: '核载', dataIndex: 'seatCount', width: 70 },
    {
      title: '所属旅行社',
      dataIndex: 'travelAgencyName',
      width: 200,
      ellipsis: true,
      render: (v: string) => v || '-',
    },
    { title: '车载终端', dataIndex: 'deviceId', width: 130, render: (v?: string) => v || '-' },
    {
      title: '监管层级',
      dataIndex: 'regionLevel',
      width: 80,
      render: (l: RegionLevel) => RegionLevelLabels[l],
    },
    { title: '所属区域', dataIndex: 'regionName', width: 200, ellipsis: true },
    {
      title: '在线',
      dataIndex: 'online',
      width: 70,
      render: (o?: boolean) =>
        o ? <Tag color="success">在线</Tag> : <Tag>离线</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (s: VehicleStatus) => (
        <Tag color={VehicleStatusColors[s]}>{VehicleStatusLabels[s]}</Tag>
      ),
    },
    { title: '更新时间', dataIndex: 'updateTime', width: 160 },
    {
      title: '操作',
      width: 220,
      fixed: 'right' as const,
      render: (_: unknown, r: Vehicle) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/coach-monitor/vehicles/${r.vehicleId}`)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(r)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(r)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="车辆档案"
        breadcrumb={[
          { title: '首页', path: '/' },
          { title: '旅游包车智慧监管', path: '/coach-monitor' },
          { title: '车辆档案' },
        ]}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增车辆
          </Button>
        }
      />
      <PageContainer>
        <div style={{ background: '#fff', padding: '16px 24px' }}>
          <Form form={form} layout="inline">
            <Form.Item name="plate">
              <Input
                placeholder="车牌号"
                value={plateKeyword}
                onChange={(e) => setPlateKeyword(e.target.value)}
                style={{ width: 160 }}
                prefix={<SearchOutlined />}
                allowClear
              />
            </Form.Item>
            <Form.Item name="agency">
              <Input
                placeholder="所属旅行社"
                value={agencyKeyword}
                onChange={(e) => setAgencyKeyword(e.target.value)}
                style={{ width: 200 }}
                allowClear
              />
            </Form.Item>
            <Form.Item name="status">
              <Select
                placeholder="车辆状态"
                value={statusFilter}
                onChange={setStatusFilter}
                allowClear
                style={{ width: 130 }}
                options={Object.entries(VehicleStatusLabels).map(([k, v]) => ({ value: k, label: v }))}
              />
            </Form.Item>
            <Form.Item name="level">
              <Select
                placeholder="监管层级"
                value={levelFilter}
                onChange={setLevelFilter}
                allowClear
                style={{ width: 130 }}
                options={Object.entries(RegionLevelLabels).map(([k, v]) => ({ value: k, label: v }))}
              />
            </Form.Item>
            <Form.Item>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                重置
              </Button>
            </Form.Item>
          </Form>
        </div>
        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="vehicleId"
          scroll={{ x: 1600 }}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `共 ${t} 条记录` }}
        />
      </PageContainer>

      <Drawer
        title={editing ? '编辑车辆档案' : '新增车辆档案'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={520}
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button type="primary" onClick={handleSubmit}>
              保存
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item name="plateNo" label="车牌号" rules={[{ required: true, message: '请输入车牌号' }]}>
            <Input placeholder="如：贵A·12345" />
          </Form.Item>
          <Form.Item name="vehicleType" label="车型" rules={[{ required: true, message: '请选择车型' }]}>
            <Select
              placeholder="请选择"
              options={Object.entries(VehicleTypeLabels).map(([k, v]) => ({ value: k, label: v }))}
            />
          </Form.Item>
          <Form.Item name="seatCount" label="核载人数" rules={[{ required: true, message: '请输入核载人数' }]}>
            <Input type="number" min={1} max={60} placeholder="如：47" />
          </Form.Item>
          <Form.Item name="travelAgencyId" label="所属旅行社ID" rules={[{ required: true }]}>
            <Input placeholder="如：TA001" />
          </Form.Item>
          <Form.Item name="travelAgencyName" label="所属旅行社名称">
            <Input placeholder="如：贵州阳光国际旅行社" />
          </Form.Item>
          <Form.Item name="deviceId" label="车载终端编号">
            <Input placeholder="如：DEV-A12345（对接后可自动填充）" />
          </Form.Item>
          <Form.Item name="regionLevel" label="监管层级" rules={[{ required: true }]}>
            <Select
              placeholder="请选择"
              options={Object.entries(RegionLevelLabels).map(([k, v]) => ({ value: k, label: v }))}
            />
          </Form.Item>
          <Form.Item name="regionCode" label="所属区域编码" rules={[{ required: true }]}>
            <Input placeholder="国标行政区码，如：520100" />
          </Form.Item>
          <Form.Item name="regionName" label="所属区域名称" rules={[{ required: true }]}>
            <Input placeholder="如：贵阳市" />
          </Form.Item>
          <Form.Item name="status" label="车辆状态" rules={[{ required: true }]}>
            <Select
              placeholder="请选择"
              options={Object.entries(VehicleStatusLabels).map(([k, v]) => ({ value: k, label: v }))}
            />
          </Form.Item>
        </Form>
      </Drawer>
    </>
  )
}
