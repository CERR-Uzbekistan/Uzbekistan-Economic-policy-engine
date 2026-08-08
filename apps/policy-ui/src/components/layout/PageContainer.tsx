import type { ReactNode } from 'react'

type PageContainerProps = {
  children: ReactNode
  className?: string
}

export function PageContainer({ children, className }: PageContainerProps) {
  const mergedClassName = className ? `page-container ${className}` : 'page-container'
  return <section className={mergedClassName}>{children}</section>
}
