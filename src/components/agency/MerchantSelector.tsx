import { useMemo, useState } from 'react'
import { Select, Modal, Form, Input, App, Tag, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useStore } from '../../store'
import { CURRENT_AGENCY } from '../../mock/agency'
import { MerchantTypeLabels, type Merchant, type MerchantType } from '../../types/agency'
import { nowStr } from '../../utils'

interface MerchantSelectorProps {
  type: MerchantType
  value?: string | string[]
  onChange?: (value: string | string[], merchant?: Merchant | Merchant[]) => void
  multiple?: boolean
  placeholder?: string
  disabled?: boolean
  style?: React.CSSProperties
  /** 下拉选项中是否展示"他社维护"标签（默认展示；产品线路行程安排中不展示） */
  showOtherAgencyTag?: boolean
}

/**
 * 商家池选择器（公共组件，线路产品与行程单共用，PRD §10.2）
 * - 全池共享：含他社创建的商家（选择器可见可选，不可编辑）
 * - 检索无结果时可快捷新增商家入池（名称+类型+县判重，存在则直接选用）
 */
export default function MerchantSelector({
  type,
  value,
  onChange,
  multiple = false,
  placeholder,
  disabled,
  style,
  showOtherAgencyTag = true,
}: MerchantSelectorProps) {
  const { message } = App.useApp()
  const { agencyMerchants, addAgencyMerchant, appendAgencyLog } = useStore()
  const [quickOpen, setQuickOpen] = useState(false)
  const [form] = Form.useForm()

  const enabled = useMemo(
    () => agencyMerchants.filter((m) => m.type === type && m.status === 'enabled'),
    [agencyMerchants, type],
  )

  const options = enabled.map((m) => ({
    value: m.id,
    label: (
      <span>
        {m.name}
        <Typography.Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
          {m.region.city === '贵阳市' ? m.region.city : m.region.city.replace(/(市|苗族侗族自治州|布依族苗族自治州)$/, '')}
          {m.contact ? ` ·${m.contact}` : ''}{m.phone ? ` ${m.phone}` : ''}
        </Typography.Text>
        {showOtherAgencyTag && m.createdByAgency !== CURRENT_AGENCY.id && (
          <Tag style={{ marginLeft: 8 }} color="cyan">
            他社维护
          </Tag>
        )}
      </span>
    ),
    searchText: `${m.name} ${m.region.city} ${m.region.district} ${m.contact ?? ''}`,
  }))

  const handleChange = (val: string | string[]) => {
    if (!onChange) return
    if (multiple) {
      const list = enabled.filter((m) => (val as string[]).includes(m.id))
      onChange(val, list)
    } else {
      const found = enabled.find((m) => m.id === val)
      onChange(val, found)
    }
  }

  // 快捷新增：名称+类型+所在县判重（跨社），存在则直接选用（PRD §5.3）
  const handleQuickAdd = async () => {
    try {
      const values = await form.validateFields()
      const dup = agencyMerchants.find(
        (m) =>
          m.type === type &&
          m.name === values.name &&
          m.region.district === values.district,
      )
      if (dup) {
        message.info('该商家已存在，可直接选用')
        if (!multiple) handleChange(dup.id)
        else handleChange([...((value as string[]) ?? []), dup.id])
        setQuickOpen(false)
        form.resetFields()
        return
      }
      const merchant: Merchant = {
        id: `M${Date.now()}`,
        name: values.name,
        type,
        region: { province: '贵州省', city: values.city, district: values.district },
        contact: values.contact,
        phone: values.phone,
        status: 'enabled',
        createdByAgency: CURRENT_AGENCY.id,
        createdByAgencyName: CURRENT_AGENCY.name,
        createdByAccount: '李明',
        createdAt: nowStr(),
      }
      addAgencyMerchant(merchant)
      appendAgencyLog({
        id: `L${Date.now()}`,
        agencyId: CURRENT_AGENCY.id,
        account: '李明',
        action: '新增商家入池',
        target: merchant.name,
        detail: `类型：${MerchantTypeLabels[type]}（选择器快捷新增）`,
        createdAt: nowStr(),
      })
      message.success('已入池，填报时全平台旅行社可选')
      if (!multiple) handleChange(merchant.id)
      else handleChange([...((value as string[]) ?? []), merchant.id])
      setQuickOpen(false)
      form.resetFields()
    } catch {
      // 校验失败
    }
  }

  return (
    <>
      <Select
        mode={multiple ? 'multiple' : undefined}
        showSearch
        allowClear
        value={value}
        onChange={handleChange}
        options={options}
        optionFilterProp="searchText"
        placeholder={placeholder ?? `选择${MerchantTypeLabels[type]}（可搜索）`}
        disabled={disabled}
        style={{ width: '100%', ...style }}
        notFoundContent={
          <a onClick={() => setQuickOpen(true)}>
            <PlusOutlined /> 暂无该{MerchantTypeLabels[type]}，点击新增商家入池
          </a>
        }
        dropdownRender={(menu) => (
          <>
            {menu}
            <div style={{ borderTop: '1px solid #f0f0f0', padding: '4px 8px' }}>
              <a onClick={() => setQuickOpen(true)}>
                <PlusOutlined /> 新增商家（入池后全平台可选）
              </a>
            </div>
          </>
        )}
      />
      <Modal
        title={`快捷新增${MerchantTypeLabels[type]}`}
        open={quickOpen}
        onOk={handleQuickAdd}
        onCancel={() => setQuickOpen(false)}
        okText="保存并选用"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="商家名称" rules={[{ required: true, message: '请输入商家名称' }]}>
            <Input placeholder={`如：XX${MerchantTypeLabels[type]}`} maxLength={50} />
          </Form.Item>
          <Form.Item name="city" label="所在市州" initialValue="贵阳市" rules={[{ required: true }]}>
            <Input placeholder="所在市州" />
          </Form.Item>
          <Form.Item name="district" label="所在区县" rules={[{ required: true, message: '请输入所在区县' }]}>
            <Input placeholder="所在区县" />
          </Form.Item>
          <Form.Item name="contact" label="联系人" rules={[{ required: true, message: '请输入联系人' }]}>
            <Input placeholder="联系人" maxLength={20} />
          </Form.Item>
          <Form.Item
            name="phone"
            label="联系电话"
            rules={[{ required: true, message: '请输入联系电话' }]}
          >
            <Input placeholder="手机号或座机" maxLength={20} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
