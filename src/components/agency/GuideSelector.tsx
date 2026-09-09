import { useMemo } from 'react'
import { Select, Typography } from 'antd'
import { MockGuides, CURRENT_AGENCY } from '../../mock/agency'
import { maskLicenseNo, maskPhone, type Guide } from '../../types/agency'

interface GuideSelectorProps {
  value?: string
  onChange?: (value: string, guide?: Guide) => void
  placeholder?: string
  disabled?: boolean
  style?: React.CSSProperties
}

/**
 * 导游选择器（公共组件）
 * 导游管理为既有功能（PRD §6.7 外部依赖）：本组件仅从导游库下拉搜索选用，
 * 展示姓名/性别/电话（脱敏）/导游证号（脱敏）
 */
export default function GuideSelector({ value, onChange, placeholder, disabled, style }: GuideSelectorProps) {
  const guides = useMemo(
    () => MockGuides.filter((g) => g.agencyId === CURRENT_AGENCY.id && g.status === 'enabled'),
    [],
  )

  const options = guides.map((g) => ({
    value: g.id,
    label: (
      <span>
        {g.name}（{g.gender === 'female' ? '女' : '男'}）
        <Typography.Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
          {maskPhone(g.phone)} · {maskLicenseNo(g.licenseNo)}
        </Typography.Text>
      </span>
    ),
    searchText: `${g.name} ${g.licenseNo}`,
  }))

  return (
    <Select
      showSearch
      allowClear
      value={value}
      onChange={(val) => onChange?.(val, guides.find((g) => g.id === val))}
      options={options}
      optionFilterProp="searchText"
      placeholder={placeholder ?? '搜索选择导游（姓名/证号）'}
      disabled={disabled}
      style={{ width: '100%', ...style }}
      notFoundContent="暂无可选导游（导游信息由既有导游管理功能维护）"
    />
  )
}
