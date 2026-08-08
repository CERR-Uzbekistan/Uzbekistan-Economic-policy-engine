type AttributionBadgeProps = {
  modelId: string
  active?: boolean
  title?: string
}

export function AttributionBadge({ modelId, active = false, title }: AttributionBadgeProps) {
  const normalizedModelId = modelId.trim().toUpperCase()
  const className = active ? 'attribution-badge attribution-badge--active' : 'attribution-badge'

  return (
    <span className={className} title={title}>
      {normalizedModelId}
    </span>
  )
}
