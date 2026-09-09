import { useMemo, useState } from 'react'
import { App, Button, Form, Input, Modal, Select, Space, Table, Tag } from 'antd'
import { DownloadOutlined, EditOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import PageHeader, { PageContainer } from '../../../components/PageHeader'
import { useStore } from '../../../store'
import { CURRENT_AGENCY } from '../../../mock/agency'
import { AgencyAccountRoleLabels, type AgencyAccount } from '../../../types/agency'
import { nowStr } from '../../../utils'

/**
 * 设置中心 · 账号管理（PRD §5.8，🟡 要点级）
 * 子账号与主账号功能同权（V1.1 确认）
 */
export default function AccountsPage() {
  const { modal, message } = App.useApp()
  const { agencyAccounts, addAgencyAccount, updateAgencyAccount, deleteAgencyAccount } = useStore()
  const [keyword, setKeyword] = useState('')
  const [gender, setGender] = useState<string | undefined>()
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<AgencyAccount | null>(null)
  const [form] = Form.useForm()

  const filtered = useMemo(() => {
    return agencyAccounts.filter((a) => {
      if (keyword && !`${a.name}${a.username}${a.phone ?? ''}`.includes(keyword)) return false
      if (gender && a.gender !== gender) return false
      return true
    })
  }, [agencyAccounts, keyword, gender])

  const handleAdd = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ nationality: '中国', gender: 'male' })
    setEditOpen(true)
  }

  const handleEdit = (record: AgencyAccount) => {
    setEditing(record)
    form.setFieldsValue(record)
    setEditOpen(true)
  }

  const handleDelete = (record: AgencyAccount) => {
    if (record.role === 'owner') {
      message.warning('主账号不可删除')
      return
    }
    modal.confirm({
      title: '删除账号',
      content: `确认删除账号「${record.name}（${record.username}）」吗？删除后不可恢复。`,
      okType: 'danger',
      okText: '删除',
      cancelText: '取消',
      onOk: () => {
        deleteAgencyAccount(record.id)
        message.success('已删除账号')
      },
    })
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (editing) {
        updateAgencyAccount(editing.id, values)
        message.success('账号已更新')
      } else {
        addAgencyAccount({
          id: `A${Date.now()}`,
          ...values,
          role: 'staff',
          agencyId: CURRENT_AGENCY.id,
          status: 'enabled',
          createdAt: nowStr(),
        })
        message.success('已新增子账号（与主账号同权）')
      }
      setEditOpen(false)
    } catch {
      // 校验失败
    }
  }

  // 导出 CSV（演示环境替代 Excel）
  const handleExport = () => {
    const header = '账号,姓名,性别,手机号,证件号,出生日期,民族,政治面貌,邮箱,工号,角色'
    const rows = agencyAccounts.map((a) =>
      [
        a.username,
        a.name,
        a.gender === 'male' ? '男' : '女',
        a.phone ?? '',
        a.idNo ?? '',
        a.birthDate ?? '',
        a.ethnicity ?? '',
        a.politicalStatus ?? '',
        a.email ?? '',
        a.jobNo ?? '',
        AgencyAccountRoleLabels[a.role],
      ].join(','),
    )
    const blob = new Blob([`\uFEFF${[header, ...rows].join('\n')}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `账号列表_${dayjs().format('YYYYMMDD_HHmmss')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const columns = [
    { title: '序号', width: 60, render: (_: unknown, __: unknown, i: number) => i + 1 },
    { title: '账号', dataIndex: 'username' },
    { title: '姓名', dataIndex: 'name' },
    { title: '性别', dataIndex: 'gender', width: 70, render: (g?: string) => (g === 'male' ? '男' : '女') },
    { title: '年龄', width: 70, render: (_: unknown, r: AgencyAccount) =>
      r.birthDate ? dayjs().diff(dayjs(r.birthDate), 'year') : '—' },
    { title: '出生日期', dataIndex: 'birthDate', width: 110, render: (v?: string) => v ?? '—' },
    { title: '手机号码', dataIndex: 'phone', render: (v?: string) => v ?? '—' },
    { title: '电子邮箱', dataIndex: 'email', render: (v?: string) => v ?? '—' },
    {
      title: '角色',
      dataIndex: 'role',
      width: 90,
      render: (r: AgencyAccount['role']) => (
        <Tag color={r === 'owner' ? 'gold' : 'blue'}>{AgencyAccountRoleLabels[r]}</Tag>
      ),
    },
    {
      title: '操作',
      width: 150,
      render: (_: unknown, r: AgencyAccount) => (
        <Space>
          <a onClick={() => handleEdit(r)}>
            <EditOutlined /> 编辑
          </a>
          {r.role !== 'owner' && (
            <a style={{ color: '#ff4d4f' }} onClick={() => handleDelete(r)}>
              删除
            </a>
          )}
        </Space>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="账号管理"
        breadcrumb={[{ title: '设置中心' }, { title: '账号管理' }]}
        extra={
          <Space>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              导出 Excel
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新增
            </Button>
          </Space>
        }
      >
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="关键字（姓名/账号/手机）"
            style={{ width: 220 }}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <Select
            allowClear
            placeholder="性别"
            style={{ width: 100 }}
            value={gender}
            onChange={setGender}
            options={[
              { value: 'male', label: '男' },
              { value: 'female', label: '女' },
            ]}
          />
        </Space>
      </PageHeader>
      <PageContainer>
        <Table rowKey="id" columns={columns} dataSource={filtered} pagination={{ showTotal: (t) => `共 ${t} 条` }} />
      </PageContainer>

      <Modal
        title={editing ? '编辑账号' : '新增账号'}
        open={editOpen}
        onOk={handleSubmit}
        onCancel={() => setEditOpen(false)}
        okText="确定"
        cancelText="取消"
        width={640}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Space size="middle" style={{ display: 'flex' }} align="start">
            <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]} style={{ width: 280 }}>
              <Input maxLength={30} disabled={!!editing} />
            </Form.Item>
            <Form.Item
              name="password"
              label="密码"
              rules={editing ? [] : [{ required: true, message: '请输入密码' }]}
              style={{ width: 280 }}
            >
              <Input.Password placeholder={editing ? '不修改请留空' : '初始密码'} />
            </Form.Item>
          </Space>
          <Space size="middle" style={{ display: 'flex' }} align="start">
            <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]} style={{ width: 280 }}>
              <Input maxLength={20} />
            </Form.Item>
            <Form.Item name="nickname" label="昵称" style={{ width: 280 }}>
              <Input maxLength={20} />
            </Form.Item>
          </Space>
          <Space size="middle" style={{ display: 'flex' }} align="start">
            <Form.Item name="phone" label="手机号码" style={{ width: 280 }} rules={[{ pattern: /^1\d{10}$/, message: '手机号格式不正确' }]}>
              <Input maxLength={11} />
            </Form.Item>
            <Form.Item name="gender" label="性别" style={{ width: 280 }}>
              <Select
                options={[
                  { value: 'male', label: '男' },
                  { value: 'female', label: '女' },
                ]}
              />
            </Form.Item>
          </Space>
          <Space size="middle" style={{ display: 'flex' }} align="start">
            <Form.Item name="idNo" label="身份证号码" style={{ width: 280 }}>
              <Input maxLength={18} />
            </Form.Item>
            <Form.Item name="birthDate" label="出生日期" style={{ width: 280 }}>
              <Input placeholder="YYYY-MM-DD" />
            </Form.Item>
          </Space>
          <Space size="middle" style={{ display: 'flex' }} align="start">
            <Form.Item name="nationality" label="国籍" initialValue="中国" style={{ width: 130 }}>
              <Input />
            </Form.Item>
            <Form.Item name="ethnicity" label="民族" style={{ width: 130 }}>
              <Input placeholder="如：汉族" />
            </Form.Item>
            <Form.Item name="politicalStatus" label="政治面貌" style={{ width: 130 }}>
              <Input placeholder="如：群众" />
            </Form.Item>
          </Space>
          <Space size="middle" style={{ display: 'flex' }} align="start">
            <Form.Item name="email" label="电子邮箱" style={{ width: 280 }} rules={[{ type: 'email', message: '邮箱格式不正确' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="telephone" label="座机" style={{ width: 280 }}>
              <Input />
            </Form.Item>
          </Space>
          <Space size="middle" style={{ display: 'flex' }} align="start">
            <Form.Item name="jobNo" label="工号" style={{ width: 280 }}>
              <Input />
            </Form.Item>
            <Form.Item name="address" label="住址" style={{ width: 280 }}>
              <Input maxLength={100} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </>
  )
}
