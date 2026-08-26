import { useEffect, useMemo, useState } from 'react'
import { App, Button, Empty, Form, Input, InputNumber, Modal, Space, Table, Tag, Tooltip, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { Navigate } from 'react-router-dom'
import PageHeader, { PageContainer } from '../../components/PageHeader'
import { useStore } from '../../store'
import { genId, nowStr } from '../../utils'
import {
  isTrainingManagerRole,
  TRAINING_CATEGORY_LIMIT,
  TrainingCategoryStatusLabels,
  type TrainingCategory,
} from '../../types/training'

const { Text } = Typography

/**
 * 资料分类管理（PRD §5.1）
 * 新增/编辑/排序/启停；有资料的分类不可删除（删除保护）
 */
export default function TrainingCategories() {
  const { modal, message } = App.useApp()
  const {
    trainingCategories,
    trainingMaterials,
    addTrainingCategory,
    updateTrainingCategory,
    deleteTrainingCategory,
    currentUser,
  } = useStore()
  const [form] = Form.useForm()

  const isManager = isTrainingManagerRole(currentUser.role)
  const [editing, setEditing] = useState<TrainingCategory | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    if (!isManager) message.warning('无权限访问该页面')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const sorted = useMemo(
    () => [...trainingCategories].sort((a, b) => a.sort - b.sort || a.createTime.localeCompare(b.createTime)),
    [trainingCategories],
  )

  const materialCount = (id: string) => trainingMaterials.filter((m) => m.categoryId === id).length

  if (!isManager) return <Navigate to="/training" replace />

  // 名称校验：2-20 字，不可与现有分类重名（含已停用，PRD §5.1 边界条件）
  const validateName = async (_rule: unknown, value: string) => {
    const name = (value || '').trim()
    if (name.length < 2 || name.length > 20) {
      throw new Error('分类名称为 2-20 个字')
    }
    const dup = trainingCategories.some((c) => c.name === name && c.id !== editing?.id)
    if (dup) throw new Error('分类名称已存在')
  }

  const openCreate = () => {
    if (trainingCategories.length >= TRAINING_CATEGORY_LIMIT) return
    setEditing(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (cat: TrainingCategory) => {
    setEditing(cat)
    form.setFieldsValue({ name: cat.name, sort: cat.sort })
    setModalOpen(true)
  }

  const handleSave = async () => {
    try {
      await form.validateFields()
    } catch {
      return
    }
    const values = form.getFieldsValue()
    const name = (values.name as string).trim()
    if (editing) {
      updateTrainingCategory(editing.id, { name, sort: values.sort })
    } else {
      addTrainingCategory({
        id: genId('cat'),
        name,
        sort: values.sort,
        status: 'enabled',
        createTime: nowStr(),
      })
    }
    message.success('分类已保存')
    setModalOpen(false)
  }

  const handleToggleStatus = (cat: TrainingCategory) => {
    if (cat.status === 'enabled') {
      modal.confirm({
        title: '停用确认',
        content: '停用后，新建资料不可再选择该分类；已有资料保留展示。确认停用？',
        okText: '确认停用',
        cancelText: '取消',
        onOk: () => {
          updateTrainingCategory(cat.id, { status: 'disabled' })
          message.success('分类已停用')
        },
      })
    } else {
      updateTrainingCategory(cat.id, { status: 'enabled' })
      message.success('分类已启用')
    }
  }

  const handleDelete = (cat: TrainingCategory) => {
    modal.confirm({
      title: '删除确认',
      content: `确认删除分类「${cat.name}」？删除后不可恢复。`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        deleteTrainingCategory(cat.id)
        message.success('分类已删除')
      },
    })
  }

  const columns = [
    { title: '排序', dataIndex: 'sort', width: 80 },
    {
      title: '分类名称',
      dataIndex: 'name',
      render: (name: string, cat: TrainingCategory) => (
        <Text delete={cat.status === 'disabled'} style={cat.status === 'disabled' ? { color: '#999' } : undefined}>
          {name}
        </Text>
      ),
    },
    {
      title: '资料数',
      dataIndex: 'id',
      width: 100,
      render: (id: string) => {
        const count = materialCount(id)
        return count > 0 ? <Tag color="blue">{count}</Tag> : <Text type="secondary">0</Text>
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (s: TrainingCategory['status']) => (
        <Tag color={s === 'enabled' ? 'success' : 'default'}>{TrainingCategoryStatusLabels[s]}</Tag>
      ),
    },
    { title: '创建时间', dataIndex: 'createTime', width: 180 },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: unknown, cat: TrainingCategory) => {
        const count = materialCount(cat.id)
        return (
          <Space size={0}>
            <Button type="link" size="small" onClick={() => openEdit(cat)}>
              编辑
            </Button>
            <Button type="link" size="small" onClick={() => handleToggleStatus(cat)}>
              {cat.status === 'enabled' ? '停用' : '启用'}
            </Button>
            {/* 删除保护：分类下存在任意状态资料时不可删除（PRD §5.1） */}
            {count === 0 ? (
              <Button type="link" size="small" danger onClick={() => handleDelete(cat)}>
                删除
              </Button>
            ) : (
              <Tooltip title="该分类下已有资料，不可删除，可停用">
                <Button type="link" size="small" disabled>
                  删除
                </Button>
              </Tooltip>
            )}
          </Space>
        )
      },
    },
  ]

  const reachLimit = trainingCategories.length >= TRAINING_CATEGORY_LIMIT

  return (
    <>
      <PageHeader
        title="分类管理"
        breadcrumb={[{ title: '首页', path: '/' }, { title: '文库管理' }, { title: '分类管理' }]}
        extra={
          <Tooltip title={reachLimit ? `分类数量已达上限（${TRAINING_CATEGORY_LIMIT} 个）` : ''}>
            <Button type="primary" icon={<PlusOutlined />} disabled={reachLimit} onClick={openCreate}>
              新增分类
            </Button>
          </Tooltip>
        }
      />
      <PageContainer>
        <Table
          rowKey="id"
          size="middle"
          columns={columns}
          dataSource={sorted}
          pagination={false}
          locale={{
            emptyText: (
              <Empty
                description="暂无分类，点击右上角新增"
                style={{ padding: '32px 0' }}
              />
            ),
          }}
        />
      </PageContainer>

      <Modal
        title={editing ? '编辑分类' : '新增分类'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText="保 存"
        cancelText="取 消"
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={{ sort: 99 }}>
          <Form.Item name="name" label="分类名称" rules={[{ validator: validateName }]}>
            <Input maxLength={20} placeholder="如：政策法规" />
          </Form.Item>
          <Form.Item
            name="sort"
            label="排序值"
            rules={[{ required: true, message: '请输入排序值' }]}
            extra="0-999，数字越小越靠前"
          >
            <InputNumber min={0} max={999} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
