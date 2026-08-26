import { useState } from 'react'
import { Input } from 'antd'
import type { InputProps } from 'antd'

interface MaskedInputProps extends Omit<InputProps, 'value' | 'onChange'> {
  value?: string
  onChange?: (value: string) => void
  /** 脱敏函数：非聚焦状态下展示脱敏值 */
  mask: (value: string) => string
}

/**
 * 敏感信息输入框（如手机号、证件号）：
 * 非聚焦/禁用时展示脱敏值，聚焦编辑时展示明文，编辑后仍以明文存储、失焦恢复脱敏展示。
 */
export default function MaskedInput({ value, onChange, mask, ...rest }: MaskedInputProps) {
  const [focused, setFocused] = useState(false)
  const showRaw = focused || !value
  return (
    <Input
      {...rest}
      value={showRaw ? value : mask(value)}
      onFocus={(e) => {
        setFocused(true)
        rest.onFocus?.(e)
      }}
      onBlur={(e) => {
        setFocused(false)
        rest.onBlur?.(e)
      }}
      onChange={(e) => onChange?.(e.target.value)}
    />
  )
}
