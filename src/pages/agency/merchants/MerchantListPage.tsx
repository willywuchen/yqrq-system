import { useMemo, useState } from 'react'
import { App, Button, Cascader, Col, Form, Input, InputNumber, Modal, Radio, Row, Select, Space, Table, Tag, Upload } from 'antd'
import { DeleteOutlined, EditOutlined, EnvironmentOutlined, FileImageOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import PageHeader, { PageContainer } from '../../../components/PageHeader'
import { useStore } from '../../../store'
import { CURRENT_AGENCY } from '../../../mock/agency'
import { GUIZHOU_REGION_OPTIONS, pathToRegion, regionToPath } from '../../../components/agency/regions'
import {
  BusinessStatusLabels,
  levelOptionsOfType,
  ORG_NATURE_OPTIONS,
  type Merchant,
  type MerchantType,
} from '../../../types/agency'
import { nowStr } from '../../../utils'

/** 上传表单值 ⇄ 文件名互转（演示环境仅记录文件名，正式开发对接对象存储） */
function toFileList(url?: string) {
  return url ? [{ uid: url, name: url, status: 'done' as const }] : []
}
function fileListOf(value: unknown): string | undefined {
  const list = Array.isArray(value) ? value : (value as { fileList?: { name: string }[] } | null)?.fileList
  return list?.length ? list[0].name : undefined
}

const uploadProps = {
  listType: 'picture-card' as const,
  maxCount: 1,
  beforeUpload: () => false,
  accept: 'image/*',
}

interface MerchantListPageProps {
  type: MerchantType
}

/**
 * 产品管理 · 商家管理（按类型拆分为五个独立菜单，共用本页面）
 * 列表仅展示本社创建的商家（选择器为全平台共享池）；新增/编辑/列表字段按各类型附件字段设计，
 * 不含电子印章相关内容（公章授权书模板/上传、电子章）
 */
export default function MerchantListPage({ type }: MerchantListPageProps) {
  const { modal, message } = App.useApp()
  const { agencyMerchants, agencyItineraries, addAgencyMerchant, updateAgencyMerchant, deleteAgencyMerchant, appendAgencyLog } = useStore()
  const [nameKeyword, setNameKeyword] = useState('')
  const [levelFilter, setLevelFilter] = useState<string | undefined>()
  const [regionPath, setRegionPath] = useState<string[] | undefined>()
  const [contactKeyword, setContactKeyword] = useState('')
  const [phoneKeyword, setPhoneKeyword] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<Merchant | null>(null)
  const [form] = Form.useForm()

  const levelOptions = levelOptionsOfType(type)
  const isScenic = type === 'scenic'
  const isHomestay = type === 'homestay'
  // 页面标题按类型：景区景点/购物店/酒店住宿/餐饮服务/民宿
  const title = { scenic: '景区景点', shop: '购物店', hotel: '酒店住宿', restaurant: '餐饮服务', homestay: '民宿' }[type]
  const levelLabel = type === 'scenic' ? '景区级别' : type === 'hotel' ? '酒店星级' : '等级'

  const filtered = useMemo(
    () =>
      agencyMerchants
        .filter((m) => m.type === type && m.createdByAgency === CURRENT_AGENCY.id)
        .filter((m) => {
          if (nameKeyword && !`${m.name}${m.shortName ?? ''}`.includes(nameKeyword)) return false
          if (levelFilter && m.level !== levelFilter) return false
          // 所属区域按省/市/县前缀匹配（可只选到省或市）
          if (regionPath?.length) {
            const keys = ['province', 'city', 'district'] as const
            for (let i = 0; i < regionPath.length; i++) {
              if (m.region[keys[i]] !== regionPath[i]) return false
            }
          }
          if (contactKeyword && !(m.contact ?? '').includes(contactKeyword)) return false
          if (phoneKeyword && !(m.phone ?? '').includes(phoneKeyword)) return false
          return true
        }),
    [agencyMerchants, type, nameKeyword, levelFilter, regionPath, contactKeyword, phoneKeyword],
  )

  const handleReset = () => {
    setNameKeyword('')
    setLevelFilter(undefined)
    setRegionPath(undefined)
    setContactKeyword('')
    setPhoneKeyword('')
  }

  // 被行程单引用过的商家不可删除
  const isReferenced = (m: Merchant) => agencyItineraries.some((it) => it.dayPlans.some((d) => Object.values(d).includes(m.id)))

  const handleDelete = (record: Merchant) => {
    if (isReferenced(record)) {
      message.warning('该商家已被行程单引用，不可删除')
      return
    }
    modal.confirm({
      title: `删除${title}`,
      icon: <DeleteOutlined />,
      content: `确认删除「${record.name}」吗？删除后不可恢复。`,
      okType: 'danger',
      okText: '删除',
      cancelText: '取消',
      onOk: () => {
        deleteAgencyMerchant(record.id)
        appendAgencyLog({
          id: `L${Date.now()}`,
          agencyId: CURRENT_AGENCY.id,
          account: '李明',
          action: `删除${title}`,
          target: record.name,
          createdAt: nowStr(),
        })
        message.success(`已删除${title}`)
      },
    })
  }

  const openEdit = (record: Merchant | null) => {
    setEditing(record)
    if (record) {
      form.setFieldsValue({
        ...record,
        region: regionToPath(record.region),
        legalPersonId: toFileList(record.legalPersonIdUrl),
        businessLicense: toFileList(record.businessLicenseUrl),
      })
    } else {
      form.resetFields()
      form.setFieldsValue({
        businessStatus: 'operating',
        ...(levelOptions ? { level: levelOptions[0] } : {}),
      })
    }
    setEditOpen(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const base: Partial<Merchant> = {
        name: values.name,
        region: pathToRegion(values.region),
        address: values.address,
        contact: values.contact || undefined,
        phone: values.phone || undefined,
        shortName: values.shortName,
        orgNature: values.orgNature,
        legalPerson: values.legalPerson,
        legalPersonPhone: values.legalPersonPhone,
        legalPersonIdNo: values.legalPersonIdNo,
        creditCode: values.creditCode,
        licenseNo: values.licenseNo,
        legalPersonIdUrl: fileListOf(values.legalPersonId),
        businessLicenseUrl: fileListOf(values.businessLicense),
        businessScope: values.businessScope,
        businessStatus: values.businessStatus ?? 'operating',
        level: values.level,
        remark: undefined,
      }
      if (isScenic) {
        base.areaSqKm = values.areaSqKm
        base.dailyMaxLoad = values.dailyMaxLoad
        base.instantMaxLoad = values.instantMaxLoad
        base.spaceLoad = values.spaceLoad
        base.ecoLoad = values.ecoLoad
      }
      if (editing) {
        updateAgencyMerchant(editing.id, base)
        appendAgencyLog({
          id: `L${Date.now()}`,
          agencyId: CURRENT_AGENCY.id,
          account: '李明',
          action: `编辑${title}`,
          target: values.name,
          createdAt: nowStr(),
        })
        message.success(`${title}信息已更新`)
      } else {
        addAgencyMerchant({
          id: `M${Date.now()}`,
          type,
          status: 'enabled',
          createdByAgency: CURRENT_AGENCY.id,
          createdByAgencyName: CURRENT_AGENCY.name,
          createdByAccount: '李明',
          createdAt: nowStr(),
          ...base,
        } as Merchant)
        appendAgencyLog({
          id: `L${Date.now()}`,
          agencyId: CURRENT_AGENCY.id,
          account: '李明',
          action: `新增${title}`,
          target: values.name,
          detail: `类型：${title}`,
          createdAt: nowStr(),
        })
        message.success(`已新增${title}（入池后全平台选择器可选）`)
      }
      setEditOpen(false)
    } catch {
      // 校验失败
    }
  }

  const columns = [
    { title: '序号', width: 60, render: (_: unknown, __: unknown, i: number) => i + 1 },
    { title: isHomestay ? '名称' : '企业名称', dataIndex: 'name' },
    ...(isHomestay
      ? []
      : [{ title: '简称', dataIndex: 'shortName', width: 110, render: (v?: string) => v ?? '—' }]),
    ...(levelOptions
      ? [{ title: levelLabel, dataIndex: 'level', width: 100, render: (v?: string) => (v ? <Tag color="blue">{v}</Tag> : '—') }]
      : []),
    {
      title: '所属区域',
      dataIndex: 'region',
      width: 200,
      render: (_: unknown, r: Merchant) => `${r.region.city}/${r.region.district}`,
    },
    ...(isHomestay
      ? []
      : [
          { title: '联系人', dataIndex: 'contact', width: 110, render: (v?: string) => v ?? '—' },
          { title: '联系人电话', dataIndex: 'phone', width: 130, render: (v?: string) => v ?? '—' },
          {
            title: '营业状态',
            dataIndex: 'businessStatus',
            width: 90,
            render: (v?: Merchant['businessStatus']) =>
              v ? <Tag color={v === 'operating' ? 'green' : 'default'}>{BusinessStatusLabels[v]}</Tag> : '—',
          },
        ]),
    { title: '创建时间', dataIndex: 'createdAt', width: 150 },
    {
      title: '操作',
      width: 130,
      fixed: 'right' as const,
      render: (_: unknown, r: Merchant) => (
        <Space>
          <a onClick={() => openEdit(r)}>
            <EditOutlined /> 编辑
          </a>
          <a style={{ color: '#ff4d4f' }} onClick={() => handleDelete(r)}>
            删除
          </a>
        </Space>
      ),
    },
  ]

  const rule = (msg: string) => [{ required: true, message: msg }]

  return (
    <>
      <PageHeader
        title={title}
        breadcrumb={[{ title: '产品管理' }, { title: title }]}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openEdit(null)}>
            新增
          </Button>
        }
      >
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder={isHomestay ? '名称' : '企业名称/简称'}
            style={{ width: 180 }}
            value={nameKeyword}
            onChange={(e) => setNameKeyword(e.target.value)}
          />
          <Cascader
            options={GUIZHOU_REGION_OPTIONS}
            changeOnSelect
            placeholder="所属区域"
            style={{ width: 180 }}
            value={regionPath}
            onChange={(v) => setRegionPath(v as string[] | undefined)}
          />
          {levelOptions && (
            <Select
              allowClear
              placeholder={levelLabel}
              style={{ width: 120 }}
              value={levelFilter}
              onChange={setLevelFilter}
              options={levelOptions.map((v) => ({ value: v, label: v }))}
            />
          )}
          <Input
            allowClear
            placeholder="联系人"
            style={{ width: 130 }}
            value={contactKeyword}
            onChange={(e) => setContactKeyword(e.target.value)}
          />
          <Input
            allowClear
            placeholder="联系人电话"
            style={{ width: 140 }}
            value={phoneKeyword}
            onChange={(e) => setPhoneKeyword(e.target.value)}
          />
          <Button onClick={handleReset}>重置</Button>
        </Space>
      </PageHeader>
      <PageContainer>
        <Table rowKey="id" columns={columns} dataSource={filtered} scroll={{ x: 1100 }} pagination={{ showTotal: (t) => `共 ${t} 条` }} />
      </PageContainer>

      <Modal
        title={editing ? `编辑${title}` : `新增${title}`}
        open={editOpen}
        width={1080}
        onCancel={() => setEditOpen(false)}
        footer={
          <Space>
            <Button icon={<DeleteOutlined />} onClick={() => setEditOpen(false)}>
              取消
            </Button>
            <Button type="primary" onClick={handleSubmit}>
              确定
            </Button>
          </Space>
        }
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ maxHeight: '68vh', overflowY: 'auto', paddingRight: 8 }}>
          {isHomestay ? (
            // 民宿：名称 / 所属区域 / 等级
            <Row gutter={24}>
              <Col span={16}>
                <Form.Item name="name" label="名称" rules={rule('请输入名称')}>
                  <Input maxLength={60} allowClear placeholder="请输入名称" />
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item name="region" label="所属区域" rules={rule('请选择所属区域')}>
                  <Cascader options={GUIZHOU_REGION_OPTIONS} placeholder="请选择" />
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item name="level" label="等级">
                  <Select options={levelOptions!.map((v) => ({ value: v, label: v }))} allowClear />
                </Form.Item>
              </Col>
            </Row>
          ) : (
            <>
              <Row gutter={24}>
                <Col span={8}>
                  <Form.Item name="name" label="企业名称" rules={rule('请输入企业名称')}>
                    <Input maxLength={60} allowClear placeholder="请输入企业名称" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="shortName" label="简称" rules={rule('请输入简称')}>
                    <Input maxLength={30} allowClear placeholder="请输入简称" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="orgNature" label="企业性质" rules={rule('请选择企业性质')}>
                    <Select options={ORG_NATURE_OPTIONS.map((v) => ({ value: v, label: v }))} placeholder="请选择企业性质" allowClear />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={24}>
                {levelOptions && (
                  <Col span={8}>
                    <Form.Item name="level" label={levelLabel}>
                      <Select options={levelOptions.map((v) => ({ value: v, label: v }))} allowClear placeholder="请选择" />
                    </Form.Item>
                  </Col>
                )}
                <Col span={8}>
                  <Form.Item name="legalPerson" label="法人" rules={type === 'scenic' || type === 'hotel' ? rule('请输入法人') : undefined}>
                    <Input maxLength={20} allowClear placeholder="请输入法人" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="legalPersonPhone" label="法人电话" rules={rule('请输入法人电话')}>
                    <Input maxLength={20} allowClear placeholder="请输入法人电话" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={24}>
                <Col span={8}>
                  <Form.Item name="legalPersonIdNo" label="法人身份证" rules={rule('请输入法人身份证号')}>
                    <Input maxLength={18} allowClear placeholder="请输入法人身份证" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="creditCode"
                    label="统一社会信用代码"
                    rules={[
                      ...rule('请输入统一社会信用代码'),
                      { pattern: /^[0-9A-HJ-NPQRTUWXY]{18}$/, message: '应为 18 位统一社会信用代码' },
                    ]}
                  >
                    <Input maxLength={18} allowClear placeholder="请输入统一社会信用代码" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="licenseNo" label="经营许可证编号">
                    <Input maxLength={30} allowClear placeholder="请输入经营许可证编号" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={24}>
                <Col span={8}>
                  <Form.Item name="region" label="所属区域" rules={rule('请选择所属区域至区/县')}>
                    <Cascader options={GUIZHOU_REGION_OPTIONS} placeholder="请选择" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="legalPersonId" label="法人身份证照片" valuePropName="fileList" getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}>
                    <Upload {...uploadProps}>
                      <div>
                        <FileImageOutlined />
                        <div style={{ marginTop: 8 }}>图片上传</div>
                      </div>
                    </Upload>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="businessLicense" label="营业执照照片" valuePropName="fileList" getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}>
                    <Upload {...uploadProps}>
                      <div>
                        <FileImageOutlined />
                        <div style={{ marginTop: 8 }}>图片上传</div>
                      </div>
                    </Upload>
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={24}>
                <Col span={8}>
                  <Form.Item name="address" label="详细地址">
                    <Input maxLength={100} allowClear placeholder="请输入详细地址" suffix={<EnvironmentOutlined style={{ color: '#bbb' }} />} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="businessScope" label="经营范围">
                    <Input.TextArea rows={1} maxLength={200} placeholder="请输入经营范围" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="businessStatus" label="营业状态">
                    <Radio.Group
                      options={(Object.keys(BusinessStatusLabels) as (keyof typeof BusinessStatusLabels)[]).map((v) => ({
                        value: v,
                        label: BusinessStatusLabels[v],
                      }))}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item name="contact" label="联系人名字" rules={rule('请输入联系人名字')}>
                    <Input maxLength={20} allowClear placeholder="请输入联系人名字" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="phone" label="联系人电话" rules={rule('请输入联系人电话')}>
                    <Input maxLength={20} allowClear placeholder="请输入联系人电话" />
                  </Form.Item>
                </Col>
              </Row>
              {isScenic && (
                <>
                  <Row gutter={24}>
                    <Col span={8}>
                      <Form.Item name="areaSqKm" label="景区范围（平方公里）">
                        <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="请输入景区范围（平方公里）" />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item name="dailyMaxLoad" label="日最大承载量（万）">
                        <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="请输入日最大承载量（万）" />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item name="instantMaxLoad" label="瞬间最大承载量（万）">
                        <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="请输入瞬间最大承载量（万）" />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={24}>
                    <Col span={12}>
                      <Form.Item name="spaceLoad" label="空间承载量（万）">
                        <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="请输入空间承载量（万）" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="ecoLoad" label="生态承载量（万）">
                        <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="请输入生态承载量（万）" />
                      </Form.Item>
                    </Col>
                  </Row>
                </>
              )}
            </>
          )}
        </Form>
      </Modal>
    </>
  )
}
