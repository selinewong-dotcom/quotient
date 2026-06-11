// ── Date helpers ─────────────────────────────────────────────
export function today() {
  return new Date().toISOString().split('T')[0]
}

export function daysFromNow(targetDate) {
  const now    = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(targetDate)
  target.setHours(0, 0, 0, 0)
  return Math.round((target - now) / (1000 * 60 * 60 * 24))
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDateShort(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function getLast14Days() {
  const days = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().split('T')[0])
  }
  return days
}

export function getLastNDays(n) {
  const days = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().split('T')[0])
  }
  return days
}

export function deadlineLabel(deadlineStr) {
  if (!deadlineStr) return null
  const days = daysFromNow(deadlineStr)
  if (days < 0)  return { text: `${Math.abs(days)}d overdue`, urgency: 'overdue' }
  if (days === 0)return { text: 'Due today',               urgency: 'urgent' }
  if (days <= 3) return { text: `${days}d left`,           urgency: 'urgent' }
  return             { text: `${days}d left`,           urgency: 'normal' }
}

export function formatTTL(expiresAt) {
  if (!expiresAt) return ''
  const expDate = expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt)
  const now     = new Date()
  const diffMs  = expDate - now
  if (diffMs <= 0) return 'Expired'
  const hrs  = Math.floor(diffMs / 3600000)
  const mins = Math.floor((diffMs % 3600000) / 60000)
  if (hrs > 0) return `Expires in ${hrs}h ${mins}m`
  return `Expires in ${mins}m`
}
