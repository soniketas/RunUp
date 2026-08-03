export function formatRelativeTime(timestamp) {
  if (!timestamp) return null
  const diffMs = Date.now() - timestamp
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'Justo ahora'
  if (diffMin < 60) return `Hace ${diffMin} min`

  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `Hace ${diffH} h`

  const diffDays = Math.floor(diffH / 24)
  if (diffDays === 1) return 'Ayer'
  return `Hace ${diffDays} días`
}

// 'fresh' <30min, 'stale' <4h, 'old' beyond, 'none' never updated
export function freshnessLevel(timestamp) {
  if (!timestamp) return 'none'
  const diffMin = (Date.now() - timestamp) / 60000
  if (diffMin < 30) return 'fresh'
  if (diffMin < 240) return 'stale'
  return 'old'
}
