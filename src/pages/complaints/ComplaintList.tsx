import { useMemo, useState } from 'react'
import {
  Table,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Space,
  Tag,
  Modal,
  App,
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  DeleteOutlined,
  EyeOutlined,
  EditOutlined,
  DownloadOutlined,
  ImportOutlined,
  DashboardOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import { useStore } from '../../store'
import {
  ComplaintStatusLabels,
  ComplaintStatusColors,
  ComplaintMethodLabels,
  TourismCategoryLabels,
  ReplyStatusLabels,
  GUIZHOU_CITIES,
  type ComplaintStatus,
  type ComplaintMethod,
  type TourismCategory,
  type ReplyStatus,
  type Complaint,
} from '../../types'

const { RangePicker } = DatePicker

// 回复状态颜色映射
const ReplyStatusColors: Record<ReplyStatus, string> = {
  none: 'default',
  replied: 'cyan',
  closed: 'success',
}

export default function ComplaintList() {
  const navigate = useNavigate()
  const { modal, message } = App.useApp()
  const { complaints, deleteComplaint } = useStore()
  const [form] = Form.useForm()

  // 查询条件
  const [titleKeyword, setTitleKeyword] = useState('')
  const [city, setCity] = useState<string | undefined>()
  const [complaintMethod, setComplaintMethod] = useState<ComplaintMethod | undefined>()
  const [tourismCategory, setTourismCategory] = useState<TourismCategory | undefined>()
  const [status, setStatus] = useState<ComplaintStatus | undefined>()
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null)
  const [complainantKeyword, setComplainantKeyword] = useState('')
  const [respondentKeyword, setRespondentKeyword] = useState('')

  // 导入弹窗占位
  const [importOpen, setImportOpen] = useState(false)

  const filtered = useMemo(() => {
    return complaints.filter((c) => {
      if (titleKeyword) {
        const kw = titleKeyword.toLowerCase()
        if (
          !c.title.toLowerCase().includes(kw) &&
          !c.id.toLowerCase().includes(kw)
        )
          return false
      }
      if (city && c.city !== city) return false
      if (complaintMethod && c.complaintMethod !== complaintMethod) return false
      if (tourismCategory && c.tourismCategory !== tourismCategory) return false
      if (status && c.status !== status) return false
      if (dateRange && dateRange[0] && dateRange[1]) {
        const t = dayjs(c.complaintTime)
        if (t.isBefore(dateRange[0], 'day') || t.isAfter(dateRange[1], 'day')) return false
      }
      if (complainantKeyword) {
        const kw = complainantKeyword.toLowerCase()
        if (
          !c.complainant.name.toLowerCase().includes(kw) &&
          !(c.complainant.phone || '').toLowerCase().includes(kw)
        )
          return false
      }
      if (respondentKeyword) {
        const kw = respondentKeyword.toLowerCase()
        if (!c.respondent.name.toLowerCase().includes(kw)) return false
      }
      return true
    })
  }, [
    complaints,
    titleKeyword,
    city,
    complaintMethod,
    tourismCategory,
    status,
    dateRange,
    complainantKeyword,
    respondentKeyword,
  ])

  const handleReset = () => {
    setTitleKeyword('')
    setCity(undefined)
    setComplaintMethod(undefined)
    setTourismCategory(undefined)
    setStatus(undefined)
    setDateRange(null)
    setComplainantKeyword('')
    setRespondentKeyword('')
    form.resetFields()
  }

  const handleDelete = (record: Complaint) => {
    modal.confirm({
      title: '确认删除',
      content: `确定要删除投诉记录「${record.title}」（${record.id}）吗？此操作不可恢复。`,
      okType: 'danger',
      okText: '删除',
      cancelText: '取消',
      onOk: () => {
        deleteComplaint(record.id)
        message.success('已删除投诉记录')
      },
    })
  }

  const handleExport = () => {
    if (filtered.length === 0) {
      message.warning('当前没有可导出的数据')
      return
    }
    const headers = [
      '投诉编号',
      '标题',
      '省',
      '市',
      '区县',
      '投诉方式',
      '文旅类别',
      '投诉时间',
      '投诉人',
      '投诉人电话',
      '被投诉人',
      '被投诉人电话',
      '状态',
      '回复状态',
      '回复时间',
      '创建人',
      '创建时间',
    ]
    const rows = filtered.map((c) => [
      c.id,
      c.title,
      c.province,
      c.city,
      c.district || '',
      ComplaintMethodLabels[c.complaintMethod],
      TourismCategoryLabels[c.tourismCategory],
      c.complaintTime,
      c.complainant.name,
      c.complainant.phone || '',
      c.respondent.name,
      c.respondent.phone || '',
      ComplaintStatusLabels[c.status],
      ReplyStatusLabels[c.replyStatus],
      c.replyTime || '',
      c.createdBy,
      c.createTime,
    ])
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    // 添加 BOM 以便 Excel 正确识别 UTF-8 编码
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `投诉台账_${dayjs().format('YYYYMMDD_HHmmss')}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    message.success(`已导出 ${filtered.length} 条记录`)
  }

  const columns = [
    {
      title: '投诉编号',
      dataIndex: 'id',
      width: 160,
      fixed: 'left' as const,
      render: (id: string) => <a onClick={() => navigate(`/complaints/${id}`)}>{id}</a>,
    },
    {
      title: '标题',
      dataIndex: 'title',
      width: 220,
      ellipsis: true,
      render: (v: string) => v || '-',
    },
    {
      title: '区域',
      width: 200,
      ellipsis: true,
      render: (_: unknown, r: Complaint) =>
        [r.province, r.city, r.district].filter(Boolean).join(' / ') || '-',
    },
    {
      title: '投诉方式',
      dataIndex: 'complaintMethod',
      width: 120,
      render: (m: ComplaintMethod) => <Tag>{ComplaintMethodLabels[m]}</Tag>,
    },
    {
      title: '文旅类别',
      dataIndex: 'tourismCategory',
      width: 120,
      render: (c: TourismCategory) => TourismCategoryLabels[c] || '-',
    },
    {
      title: '投诉时间',
      dataIndex: 'complaintTime',
      width: 120,
      render: (v: string) => v || '-',
    },
    {
      title: '被投诉人',
      dataIndex: 'respondent',
      width: 180,
      ellipsis: true,
      render: (r: Complaint['respondent']) => r?.name || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (s: ComplaintStatus) => (
        <Tag color={ComplaintStatusColors[s]}>{ComplaintStatusLabels[s]}</Tag>
      ),
    },
    {
      title: '回复状态',
      dataIndex: 'replyStatus',
      width: 100,
      render: (s: ReplyStatus) => <Tag color={ReplyStatusColors[s]}>{ReplyStatusLabels[s]}</Tag>,
    },
    {
      title: '创建人',
      dataIndex: 'createdBy',
      width: 100,
      render: (v: string) => v || '-',
    },
    {
      title: '操作',
      width: 200,
      fixed: 'right' as const,
      render: (_: unknown, r: Complaint) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/complaints/${r.id}`)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/complaints/${r.id}/edit`)}
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
        title="投诉台账"
        breadcrumb={[{ title: '首页', path: '/' }, { title: '投诉台账' }]}
        extra={
          <Space>
            <Button icon={<DashboardOutlined />} onClick={() => navigate('/complaints/dashboard')}>
              数据看板
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/complaints/new')}>
              新增投诉
            </Button>
            <Button icon={<ImportOutlined />} onClick={() => setImportOpen(true)}>
              导入
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              导出
            </Button>
          </Space>
        }
      />
      <PageContainer>
        <div className="page-toolbar" style={{ background: '#fff', padding: '16px 24px' }}>
          <Form form={form} layout="inline" onValuesChange={() => {}}>
            <Form.Item name="title">
              <Input
                placeholder="标题/投诉编号"
                value={titleKeyword}
                onChange={(e) => setTitleKeyword(e.target.value)}
                style={{ width: 220 }}
                prefix={<SearchOutlined />}
                allowClear
              />
            </Form.Item>
            <Form.Item name="city">
              <Select
                placeholder="所在市州"
                value={city}
                onChange={setCity}
                allowClear
                style={{ width: 180 }}
                options={GUIZHOU_CITIES.map((c) => ({ value: c, label: c }))}
              />
            </Form.Item>
            <Form.Item name="complaintMethod">
              <Select
                placeholder="投诉方式"
                value={complaintMethod}
                onChange={setComplaintMethod}
                allowClear
                style={{ width: 150 }}
                options={Object.entries(ComplaintMethodLabels).map(([k, v]) => ({ value: k, label: v }))}
              />
            </Form.Item>
            <Form.Item name="tourismCategory">
              <Select
                placeholder="文旅类别"
                value={tourismCategory}
                onChange={setTourismCategory}
                allowClear
                style={{ width: 160 }}
                options={Object.entries(TourismCategoryLabels).map(([k, v]) => ({ value: k, label: v }))}
              />
            </Form.Item>
            <Form.Item name="status">
              <Select
                placeholder="办理状态"
                value={status}
                onChange={setStatus}
                allowClear
                style={{ width: 150 }}
                options={Object.entries(ComplaintStatusLabels).map(([k, v]) => ({ value: k, label: v }))}
              />
            </Form.Item>
            <Form.Item name="dateRange">
              <RangePicker
                value={dateRange as any}
                onChange={(v) => setDateRange(v as any)}
                placeholder={['投诉开始', '投诉结束']}
              />
            </Form.Item>
            <Form.Item name="complainant">
              <Input
                placeholder="投诉人姓名/电话"
                value={complainantKeyword}
                onChange={(e) => setComplainantKeyword(e.target.value)}
                style={{ width: 200 }}
                allowClear
              />
            </Form.Item>
            <Form.Item name="respondent">
              <Input
                placeholder="被投诉人名称"
                value={respondentKeyword}
                onChange={(e) => setRespondentKeyword(e.target.value)}
                style={{ width: 200 }}
                allowClear
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
          rowKey="id"
          scroll={{ x: 1800 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条记录`,
          }}
        />
      </PageContainer>

      <Modal
        title="导入投诉数据"
        open={importOpen}
        onCancel={() => setImportOpen(false)}
        onOk={() => {
          message.info('导入功能开发中')
          setImportOpen(false)
        }}
        okText="开始导入"
        cancelText="取消"
      >
        <p style={{ color: '#666' }}>导入功能占位，后续将支持 Excel/CSV 批量导入投诉台账数据。</p>
      </Modal>
    </>
  )
}
