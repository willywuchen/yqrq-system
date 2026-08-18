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
  App,
  Tooltip,
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  DeleteOutlined,
  EyeOutlined,
  EditOutlined,
  DownloadOutlined,
  DashboardOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import { useStore } from '../../store'
import {
  OpinionDataSourceLabels,
  OpinionDataSourceColors,
  OpinionSentimentLabels,
  OpinionSentimentColors,
  OpinionRiskLevelLabels,
  OpinionRiskLevelColors,
  OpinionHandleStatusLabels,
  OpinionHandleStatusColors,
  TourismCategoryLabels,
  GUIZHOU_CITIES,
  type PublicOpinion,
  type OpinionDataSource,
  type OpinionSentiment,
  type OpinionRiskLevel,
  type OpinionHandleStatus,
  type TourismCategory,
} from '../../types'

const { RangePicker } = DatePicker

export default function OpinionList() {
  const navigate = useNavigate()
  const { modal, message } = App.useApp()
  const { publicOpinions, deleteOpinion, currentUser } = useStore()
  const [form] = Form.useForm()

  // 查询条件
  const [keyword, setKeyword] = useState('')
  const [authorLocation, setAuthorLocation] = useState<string | undefined>()
  const [dataSource, setDataSource] = useState<OpinionDataSource | undefined>()
  const [tourismCategory, setTourismCategory] = useState<TourismCategory | undefined>()
  const [sentiment, setSentiment] = useState<OpinionSentiment | undefined>()
  const [riskLevel, setRiskLevel] = useState<OpinionRiskLevel | undefined>()
  const [handleStatus, setHandleStatus] = useState<OpinionHandleStatus | undefined>()
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null)

  const filtered = useMemo(() => {
    return publicOpinions.filter((o) => {
      if (keyword) {
        const kw = keyword.toLowerCase()
        const inTitle = o.title.toLowerCase().includes(kw)
        const inId = o.id.toLowerCase().includes(kw)
        const inAuthor = o.author.toLowerCase().includes(kw)
        const inContent = o.content.toLowerCase().includes(kw)
        const inUrl = o.sourceUrl.toLowerCase().includes(kw)
        if (!inTitle && !inId && !inAuthor && !inContent && !inUrl) return false
      }
      if (authorLocation && o.authorLocation !== authorLocation) return false
      if (dataSource && o.dataSource !== dataSource) return false
      if (tourismCategory && o.tourismCategory !== tourismCategory) return false
      if (sentiment && o.sentiment !== sentiment) return false
      if (riskLevel && o.riskLevel !== riskLevel) return false
      if (handleStatus && o.handleStatus !== handleStatus) return false
      if (dateRange && dateRange[0] && dateRange[1]) {
        const t = dayjs(o.publishTime)
        if (t.isBefore(dateRange[0], 'day') || t.isAfter(dateRange[1], 'day')) return false
      }
      return true
    })
  }, [
    publicOpinions,
    keyword,
    authorLocation,
    dataSource,
    tourismCategory,
    sentiment,
    riskLevel,
    handleStatus,
    dateRange,
  ])

  const handleReset = () => {
    setKeyword('')
    setAuthorLocation(undefined)
    setDataSource(undefined)
    setTourismCategory(undefined)
    setSentiment(undefined)
    setRiskLevel(undefined)
    setHandleStatus(undefined)
    setDateRange(null)
    form.resetFields()
  }

  const handleDelete = (record: PublicOpinion) => {
    modal.confirm({
      title: '确认删除',
      content: `确定要删除舆情「${record.title}」（${record.id}）吗？此操作不可恢复。`,
      okType: 'danger',
      okText: '删除',
      cancelText: '取消',
      onOk: () => {
        deleteOpinion(record.id)
        message.success('已删除舆情记录')
      },
    })
  }

  const handleExport = () => {
    if (filtered.length === 0) {
      message.warning('当前没有可导出的数据')
      return
    }
    const headers = [
      '舆情编号',
      '标题',
      '作者',
      '作者定位地',
      '关键字',
      '来源网站',
      '原地址',
      '数据来源',
      '旅游类别',
      '情感倾向',
      '风险等级',
      '风险指数',
      '处置状态',
      '发布时间',
      '创建人',
      '创建时间',
    ]
    const rows = filtered.map((o) => [
      o.id,
      o.title,
      o.author,
      o.authorLocation,
      (o.keywords || []).join('|'),
      o.sourceWebsite,
      o.sourceUrl,
      OpinionDataSourceLabels[o.dataSource],
      TourismCategoryLabels[o.tourismCategory],
      OpinionSentimentLabels[o.sentiment],
      OpinionRiskLevelLabels[o.riskLevel],
      o.riskScore ?? '',
      OpinionHandleStatusLabels[o.handleStatus],
      o.publishTime,
      o.createdBy,
      o.createTime,
    ])
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `舆情台账_${dayjs().format('YYYYMMDD_HHmmss')}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    message.success(`已导出 ${filtered.length} 条记录`)
  }

  const columns = [
    {
      title: '舆情编号',
      dataIndex: 'id',
      width: 170,
      fixed: 'left' as const,
      render: (id: string) => (
        <a onClick={() => navigate(`/public-opinion/${id}`)}>{id}</a>
      ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      width: 240,
      ellipsis: true,
      render: (v: string) => v || '-',
    },
    {
      title: '作者',
      dataIndex: 'author',
      width: 160,
      ellipsis: true,
      render: (v: string) => v || '-',
    },
    {
      title: '定位地',
      dataIndex: 'authorLocation',
      width: 130,
      render: (v: string) => <Tag>{v || '-'}</Tag>,
    },
    {
      title: '数据来源',
      dataIndex: 'dataSource',
      width: 110,
      render: (v: OpinionDataSource) => (
        <Tag color={OpinionDataSourceColors[v]}>{OpinionDataSourceLabels[v]}</Tag>
      ),
    },
    {
      title: '旅游类别',
      dataIndex: 'tourismCategory',
      width: 110,
      render: (c: TourismCategory) => TourismCategoryLabels[c] || '-',
    },
    {
      title: '情感',
      dataIndex: 'sentiment',
      width: 80,
      render: (s: OpinionSentiment) => (
        <Tag color={OpinionSentimentColors[s]}>{OpinionSentimentLabels[s]}</Tag>
      ),
    },
    {
      title: '风险',
      dataIndex: 'riskLevel',
      width: 90,
      render: (r: OpinionRiskLevel) => (
        <Tag color={OpinionRiskLevelColors[r]}>{OpinionRiskLevelLabels[r]}</Tag>
      ),
    },
    {
      title: '处置',
      dataIndex: 'handleStatus',
      width: 100,
      render: (s: OpinionHandleStatus) => (
        <Tag color={OpinionHandleStatusColors[s]}>{OpinionHandleStatusLabels[s]}</Tag>
      ),
    },
    {
      title: '发布时间',
      dataIndex: 'publishTime',
      width: 150,
      render: (v: string) => v || '-',
    },
    {
      title: '操作',
      width: 220,
      fixed: 'right' as const,
      render: (_: unknown, r: PublicOpinion) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/public-opinion/${r.id}`)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/public-opinion/${r.id}/edit`)}
          >
            编辑
          </Button>
          <Tooltip title="删除">
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(r)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="舆情台账"
        breadcrumb={[{ title: '首页', path: '/' }, { title: '舆情管理' }, { title: '舆情台账' }]}
        extra={
          <Space>
            <Button icon={<DashboardOutlined />} onClick={() => navigate('/public-opinion/dashboard')}>
              舆情分析
            </Button>
            <Button icon={<WarningOutlined />} onClick={() => navigate('/public-opinion/warnings')}>
              风险预警
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/public-opinion/new')}>
              新增舆情
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
            <Form.Item name="keyword">
              <Input
                placeholder="标题/作者/内容/URL"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                style={{ width: 240 }}
                prefix={<SearchOutlined />}
                allowClear
              />
            </Form.Item>
            <Form.Item name="authorLocation">
              <Select
                placeholder="作者定位地"
                value={authorLocation}
                onChange={setAuthorLocation}
                allowClear
                style={{ width: 180 }}
                options={GUIZHOU_CITIES.map((c) => ({ value: c, label: c }))}
              />
            </Form.Item>
            <Form.Item name="dataSource">
              <Select
                placeholder="数据来源"
                value={dataSource}
                onChange={setDataSource}
                allowClear
                style={{ width: 140 }}
                options={Object.entries(OpinionDataSourceLabels).map(([k, v]) => ({ value: k, label: v }))}
              />
            </Form.Item>
            <Form.Item name="tourismCategory">
              <Select
                placeholder="旅游类别"
                value={tourismCategory}
                onChange={setTourismCategory}
                allowClear
                style={{ width: 150 }}
                options={Object.entries(TourismCategoryLabels).map(([k, v]) => ({ value: k, label: v }))}
              />
            </Form.Item>
            <Form.Item name="sentiment">
              <Select
                placeholder="情感倾向"
                value={sentiment}
                onChange={setSentiment}
                allowClear
                style={{ width: 120 }}
                options={Object.entries(OpinionSentimentLabels).map(([k, v]) => ({ value: k, label: v }))}
              />
            </Form.Item>
            <Form.Item name="riskLevel">
              <Select
                placeholder="风险等级"
                value={riskLevel}
                onChange={setRiskLevel}
                allowClear
                style={{ width: 120 }}
                options={Object.entries(OpinionRiskLevelLabels).map(([k, v]) => ({ value: k, label: v }))}
              />
            </Form.Item>
            <Form.Item name="handleStatus">
              <Select
                placeholder="处置状态"
                value={handleStatus}
                onChange={setHandleStatus}
                allowClear
                style={{ width: 120 }}
                options={Object.entries(OpinionHandleStatusLabels).map(([k, v]) => ({ value: k, label: v }))}
              />
            </Form.Item>
            <Form.Item name="dateRange">
              <RangePicker
                value={dateRange as any}
                onChange={(v) => setDateRange(v as any)}
                placeholder={['发布开始', '发布结束']}
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
          scroll={{ x: 1700 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条记录`,
          }}
        />
      </PageContainer>
    </>
  )
}
