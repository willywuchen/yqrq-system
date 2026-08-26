import { useEffect, useMemo, useState } from 'react'
import { App, Button, Empty, Form, Input, InputNumber, Modal, Space, Table, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { Navigate } from 'react-router-dom'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import { useStore } from '../../store'
import { genId, nowStr } from '../../utils'
import {
  ANNOUNCEMENT_LIMITS,
  AnnouncementCategoryStatusLabels,
  isAnnouncementManagerRole,
  type AnnouncementCategory,
} from '../../types/announcements'

/**
 * 公告分类管理（PRD §5.1）
 * 新增/编辑/排序/启停；有公告的分类不可删除（删除保护）
 */
export default function AnnouncementCategories() {
  const { modal, message } = App.useApp()
  const {
    announcementCategories,
    announcements,
    addAnnouncementCategory,
    updateAnnouncementCategory,
    deleteAnnouncementCategory,
    currentUser,
  } = useStore()
  const [form] = Form.useForm()

  const isManager = isAnnouncementManagerRole(currentUser.role)
  const [editing, setEditing] = useState<AnnouncementCategory | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    if (!isManager) message.warning('无权限访问该页面')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const sorted = useMemo(
    () =>
      [...announcementCategories].sort(
        (a, b) => a.sort - b.sort || a.createTime.localeCompare(b.createTime),
      ),
    [announcementCategories],
  )

  const announcementCount = (id: string) =>
    announcements.filter((a) => a.categoryId === id).length

  if (!isManager) return <Navigate to="/announcements" replace />

  // 名称校验：2-20 字，不可与现有分类重名（含已停用，PRD §5.1 边界条件）
  const validateName = async (_rule: unknown, value: string) => {
    const name = (value || '').trim()
    if (name.length < 2 || name.length > 20) {
      throw new Error('分类名称为 2-20 个字')
    }
    const dup = announcementCategories.some((c) => c.name === name && c.id !== editing?.id)
    if (dup) throw new Error('分类名称已存在')
  }

  const openCreate = () => {
    if (announcementCategories.length >= ANNOUNCEMENT_LIMITS.categoryLimit) {
      message.warning(`分类数量已达上限（${ANNOUNCEMENT_LIMITS.categoryLimit} 个）`)
      return
    }
    setEditing(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (cat: AnnouncementCategory) => {
    setEditing(cat)
    form.setFieldsValue({ name: cat.name, sort: cat.sort })
    setModalOpen(true)
  }

  const handleSave = async () => {
    let values
    try {
      values = await form.validateFields()
    } catch {
      return
    }
    const name = values.name.trim()
    if (editing) {
      updateAnnouncementCategory(editing.id, { name, sort: values.sort })
    } else {
      addAnnouncementCategory({
        id: genId('anc_cat'),
        name,
        sort: values.sort,
        status: 'enabled',
        createTime: nowStr(),
      })
    }
    message.success('分类已保存')
    setModalOpen(false)
  }

  const handleDisable = (cat: AnnouncementCategory) => {
    modal.confirm({
      title: '停用确认',
      content: '停用后，新建公告不可再选择该分类；已有公告保留展示。确认停用？',
      okText: '确认停用',
      cancelText: '取消',
      onOk: () => {
        updateAnnouncementCategory(cat.id, { status: 'disabled' })
        message.success('分类已停用')
      },
    })
  }

  const handleEnable = (cat: AnnouncementCategory) => {
    updateAnnouncementCategory(cat.id, { status: 'enabled' })
    message.success('分类已启用')
  }

  const handleDelete = (cat: AnnouncementCategory) => {
    modal.confirm({
      title: '删除确认',
      icon: null,
      content: `删除后不可恢复，确认删除分类「${cat.name}」？`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        deleteAnnouncementCategory(cat.id)
        message.success('分类已删除')
      },
    })
  }

  const columns = [
    { title: '分类名称', dataIndex: 'name' },
    { title: '排序值', dataIndex: 'sort', width: 100 },
    {
      title: '公告数',
      dataIndex: 'count',
      width: 100,
      render: (_: unknown, cat: AnnouncementCategory) => announcementCount(cat.id),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (s: AnnouncementCategory['status']) => (
        <Tag color={s === 'enabled' ? 'success' : 'default'}>
          {AnnouncementCategoryStatusLabels[s]}
        </Tag>
      ),
    },
    { title: '创建时间', dataIndex: 'createTime', width: 170 },
    {
      title: '操作',
      key: 'action',
      width: 220,
      render: (_: unknown, cat: AnnouncementCategory) => (
        <Space size={0}>
          <Button type="link" size="small" onClick={() => openEdit(cat)}>
            编辑
          </Button>
          {cat.status === 'enabled' ? (
            <Button type="link" size="small" onClick={() => handleDisable(cat)}>
              停用
            </Button>
          ) : (
            <Button type="link" size="small" onClick={() => handleEnable(cat)}>
              启用
            </Button>
          )}
          {/* 删除保护：有公告（含草稿）的分类不可删（PRD §5.1） */}
          {announcementCount(cat.id) === 0 && (
            <Button type="link" size="small" danger onClick={() => handleDelete(cat)}>
              删除
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="分类管理"
        breadcrumb={[{ title: '首页', path: '/' }, { title: '公告发布管理' }, { title: '分类管理' }]}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新增分类
          </Button>
        }
      />
      <PageContainer>
        <Table
          rowKey="id"
          size="middle"
          columns={columns}
          dataSource={sorted}
          pagination={false}
          style={{ background: '#fff', padding: 16, borderRadius: 6 }}
          locale={{
            emptyText: (
              <Empty description="暂无分类，点击右上角新增" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ),
          }}
        />
      </PageContainer>

      <Modal
        title={editing ? '编辑分类' : '新增分类'}
        open={modalOpen}
        okText="保 存"
        cancelText="取 消"
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
      >
        <Form form={form} layout="vertical" initialValues={{ sort: 99 }}>
          <Form.Item
            name="name"
            label="分类名称"
            rules={[{ required: true, message: '请输入分类名称' }, { validator: validateName }]}
          >
            <Input maxLength={20} placeholder="2-20 个字，如：通知公告" />
          </Form.Item>
          <Form.Item
            name="sort"
            label="排序值"
            rules={[{ required: true, message: '请输入排序值' }]}
            help="0-999，数字越小越靠前"
          >
            <InputNumber min={0} max={999} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
