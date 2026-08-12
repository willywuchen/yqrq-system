import { Breadcrumb } from 'antd'
import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  breadcrumb?: { title: string; path?: string }[]
  extra?: ReactNode
  children?: ReactNode
}

export default function PageHeader({ title, breadcrumb, extra, children }: PageHeaderProps) {
  return (
    <div
      style={{
        background: '#fff',
        padding: '16px 24px 0',
        borderBottom: '1px solid #f0f0f0',
      }}
    >
      {breadcrumb && (
        <Breadcrumb
          style={{ marginBottom: 8 }}
          items={breadcrumb.map((b) =>
            b.path ? { title: <Link to={b.path}>{b.title}</Link> } : { title: b.title },
          )}
        />
      )}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>{title}</h2>
        {extra && <div>{extra}</div>}
      </div>
      {children}
    </div>
  )
}

export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="page-container">{children}</div>
}
