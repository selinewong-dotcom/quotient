import { getLastNDays } from './date.js'

// ── Hard Target ───────────────────────────────────────────────
export function hardTargetPercent(tracker) {
  const { currentValue = 0, targetValue = 1 } = tracker
  return Math.min(100, Math.round((currentValue / targetValue) * 100))
}

// ── Milestone ─────────────────────────────────────────────────
export function milestonePercent(tracker) {
  const ms = tracker.milestones || []
  if (!ms.length) return 0
  const done = ms.filter(m => m.completed).length
  return Math.round((done / ms.length) * 100)
}

// ── Rolling Average ───────────────────────────────────────────
export function rollingAverage(tracker) {
  const logs = tracker.logs || []
  const window = tracker.windowDays || 7
  const days   = getLastNDays(window)
  const inWindow = logs.filter(l => days.includes(l.date))
  if (!inWindow.length) return 0
  const sum = inWindow.reduce((acc, l) => acc + (Number(l.value) || 0), 0)
  return parseFloat((sum / window).toFixed(2))
}

export function dailyTotals(tracker, nDays = 14) {
  const logs = tracker.logs || []
  const days  = getLastNDays(nDays)
  return days.map(day => {
    const dayLogs = logs.filter(l => l.date === day)
    return dayLogs.reduce((acc, l) => acc + (Number(l.value) || 0), 0)
  })
}

// ── Habit ─────────────────────────────────────────────────────
export function habitStreakAndRate(tracker) {
  const logs = tracker.logs || []
  const days  = getLastNDays(14)
  let streak = 0
  let completedDays = 0
  const todayStr = new Date().toISOString().split('T')[0]

  // Streak: count consecutive days backwards from today
  for (let i = days.length - 1; i >= 0; i--) {
    const log = logs.find(l => l.date === days[i])
    if (log && log.value === true) { streak++; completedDays++ }
    else if (days[i] === todayStr) continue  // Skip today if not logged yet
    else break
  }

  const rate = Math.round((completedDays / 14) * 100)
  return { streak, rate, completedDays }
}

export function habitDayValues(tracker, nDays = 14) {
  const logs = tracker.logs || []
  const days  = getLastNDays(nDays)
  return days.map(day => {
    const log = logs.find(l => l.date === day)
    return log ? log.value : null
  })
}

// ── Chart Data (normalized 0-1 for SVG sparkline) ────────────
export function normalizeForChart(values) {
  const nums = values.map(v => v === null || v === false ? 0 : v === true ? 1 : Number(v))
  const max  = Math.max(...nums, 1)
  return nums.map(v => v / max)
}

// ── Summary for PDF ───────────────────────────────────────────
export function trackerSummary(tracker) {
  switch (tracker.type) {
    case 'hard_target':
      return {
        metric: `${tracker.currentValue || 0} / ${tracker.targetValue || 0}`,
        percent: hardTargetPercent(tracker),
        label: 'completion',
      }
    case 'milestone':
      return {
        metric: `${milestonePercent(tracker)}%`,
        percent: milestonePercent(tracker),
        label: 'complete',
      }
    case 'rolling_average':
      return {
        metric: `${rollingAverage(tracker)}`,
        percent: null,
        label: `avg / day (${tracker.windowDays || 7}d)`,
      }
    case 'habit':
      const { streak, rate } = habitStreakAndRate(tracker)
      return {
        metric: `${streak}d streak`,
        percent: rate,
        label: '14-day completion rate',
      }
    default:
      return { metric: '—', percent: null, label: '' }
  }
}
