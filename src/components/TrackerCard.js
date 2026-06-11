import { store } from '../store/appStore.js'
import {
  hardTargetPercent, milestonePercent, rollingAverage,
  habitStreakAndRate, habitDayValues, dailyTotals,
  normalizeForChart,
} from '../utils/metrics.js'
import { deadlineLabel, formatDate, today } from '../utils/date.js'
import { SparklineChart, HabitGrid } from './Charts.js'
import {
  deleteTracker, logProgress, toggleMilestone, updateTracker,
} from '../firebase/firestore.js'
import { showToast } from '../utils/toast.js'
import { AddTrackerModal } from './AddTrackerModal.js'

export function TrackerCard(tracker) {
  const user = store.get('user')
  const mode = store.get('mode')

  const el = document.createElement('div')
  el.className = 'tracker-card'
  el.dataset.id = tracker.id

  el.innerHTML = buildCardHTML(tracker)
  mountCardBehavior(el, tracker, user, mode)

  return el
}

// ── HTML builders ─────────────────────────────────────────────

function buildCardHTML(tracker) {
  const typeBadge = tracker.type.replace(/_/g, ' ')

  return `
    <div class="tracker-card__header">
      <div class="tracker-card__title-group">
        <div class="tracker-card__title">${esc(tracker.title)}</div>
        ${tracker.description ? `<div class="tracker-card__description">${esc(tracker.description)}</div>` : ''}
      </div>
      <div class="tracker-card__menu dropdown">
        <button class="btn btn--icon btn--ghost btn--sm card-menu-btn" title="Options">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="8" cy="3" r="1.2"/>
            <circle cx="8" cy="8" r="1.2"/>
            <circle cx="8" cy="13" r="1.2"/>
          </svg>
        </button>
      </div>
    </div>

    <div class="badge">${typeBadge}</div>

    <div class="card-metric-area">
      ${buildMetricHTML(tracker)}
    </div>

    <div class="card-action-area">
      ${buildActionHTML(tracker)}
    </div>
  `
}

function buildMetricHTML(tracker) {
  switch (tracker.type) {
    case 'hard_target': {
      const pct      = hardTargetPercent(tracker)
      const deadline = tracker.deadline ? deadlineLabel(tracker.deadline) : null
      const chartVals = normalizeForChart(
        Array.from({ length: 14 }, (_, i) =>
          i < 13 ? (tracker.currentValue || 0) * (i / 13) : (tracker.currentValue || 0)
        )
      )
      return `
        <div class="tracker-card__metric">
          <div class="tracker-card__value">${tracker.currentValue ?? 0}</div>
          <div class="tracker-card__unit">/ ${tracker.targetValue ?? 0}</div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
          <div class="progress-bar progress-bar--thick" style="flex:1;">
            <div class="progress-bar__fill" style="width:${pct}%;"></div>
          </div>
          <span style="font-size:var(--text-xs);color:var(--text-tertiary);font-variant-numeric:tabular-nums;">${pct}%</span>
        </div>
        ${deadline ? `<div class="deadline-pill ${deadline.urgency === 'overdue' ? 'deadline-pill--overdue' : ''}"><span class="deadline-dot ${deadline.urgency}"></span>${deadline.text}</div>` : ''}
        <div class="chart-container" id="chart-area"></div>
      `
    }
    case 'milestone': {
      const pct = milestonePercent(tracker)
      const ms  = (tracker.milestones || []).slice(0, 5)
      return `
        <div class="tracker-card__metric">
          <div class="tracker-card__value">${pct}</div>
          <div class="tracker-card__unit">%</div>
        </div>
        <div class="progress-bar progress-bar--thick">
          <div class="progress-bar__fill" style="width:${pct}%;"></div>
        </div>
        <div class="milestone-list" id="milestone-list">
          ${ms.map(m => `
            <div class="milestone-item" data-mid="${m.id}">
              <div class="milestone-check ${m.completed ? 'checked' : ''}"></div>
              <div class="milestone-label ${m.completed ? 'done' : ''}">${esc(m.label)}</div>
            </div>
          `).join('')}
          ${(tracker.milestones || []).length > 5
            ? `<div style="font-size:var(--text-xs);color:var(--text-tertiary);margin-top:4px;">+${(tracker.milestones.length - 5)} more</div>`
            : ''}
        </div>
      `
    }
    case 'rolling_average': {
      const avg    = rollingAverage(tracker)
      const totals = dailyTotals(tracker, 14)
      const norm   = normalizeForChart(totals)
      return `
        <div class="tracker-card__metric">
          <div class="tracker-card__value">${avg}</div>
          <div class="tracker-card__unit">${esc(tracker.unit || 'avg')}</div>
        </div>
        <div style="font-size:var(--text-xs);color:var(--text-tertiary);">
          ${tracker.windowDays || 7}-day rolling average
        </div>
        <div class="chart-container" id="chart-area"></div>
      `
    }
    case 'habit': {
      const { streak, rate } = habitStreakAndRate(tracker)
      const dayVals = habitDayValues(tracker, 14)
      return `
        <div class="tracker-card__metric">
          <div class="tracker-card__value">${streak}</div>
          <div class="tracker-card__unit">day streak</div>
        </div>
        <div style="font-size:var(--text-xs);color:var(--text-tertiary);">${rate}% completion last 14 days</div>
        <div id="habit-grid-area"></div>
      `
    }
    default: return ''
  }
}

function buildActionHTML(tracker) {
  switch (tracker.type) {
    case 'hard_target':
      return `
        <div class="quick-log">
          <input type="number" class="quick-log__input" id="log-val"
            value="${tracker.currentValue ?? 0}" min="0" max="${tracker.targetValue || 9999}"
            title="Current value" />
          <button class="btn btn--ghost btn--sm" id="log-btn">Update</button>
        </div>
      `
    case 'rolling_average':
      return `
        <div class="quick-log">
          <input type="number" class="quick-log__input" id="log-val"
            placeholder="0" min="0" title="Today's value" />
          <button class="btn btn--ghost btn--sm" id="log-btn">Log Today</button>
        </div>
      `
    case 'habit': {
      const todayLog = (tracker.logs || []).find(l => l.date === today())
      const checked  = todayLog?.value === true
      return `
        <button class="btn ${checked ? 'btn--primary' : 'btn--ghost'} btn--sm" id="habit-btn" style="width:100%;">
          ${checked ? 'Completed Today' : 'Mark Complete'}
        </button>
      `
    }
    case 'milestone':
      return `<div style="font-size:var(--text-xs);color:var(--text-tertiary);">Click milestones above to toggle</div>`
    default: return ''
  }
}

// ── Behavior ──────────────────────────────────────────────────

function mountCardBehavior(el, tracker, user, mode) {
  // Mount chart
  const chartArea = el.querySelector('#chart-area')
  if (chartArea) {
    let vals
    if (tracker.type === 'hard_target') {
      const pct = hardTargetPercent(tracker) / 100
      vals = normalizeForChart(Array.from({ length: 14 }, (_, i) => (i / 13) * pct))
    } else if (tracker.type === 'rolling_average') {
      vals = normalizeForChart(dailyTotals(tracker, 14))
    }
    if (vals) chartArea.appendChild(SparklineChart(vals, { height: 56 }))
  }

  // Mount habit grid
  const habitGrid = el.querySelector('#habit-grid-area')
  if (habitGrid) {
    habitGrid.appendChild(HabitGrid(habitDayValues(tracker, 14), 14))
  }

  // Quick-log (hard_target / rolling_average)
  const logBtn = el.querySelector('#log-btn')
  if (logBtn) {
    logBtn.addEventListener('click', async () => {
      const val = parseFloat(el.querySelector('#log-val').value)
      if (isNaN(val)) return
      logBtn.disabled = true
      logBtn.innerHTML = '<span class="spinner spinner--sm"></span>'
      try {
        await logProgress(user.uid, mode, tracker.id, { value: val })
        showToast('Progress logged.')
      } catch (e) {
        showToast('Error saving.')
      } finally {
        logBtn.disabled = false
        logBtn.textContent = tracker.type === 'hard_target' ? 'Update' : 'Log Today'
      }
    })
  }

  // Habit toggle
  const habitBtn = el.querySelector('#habit-btn')
  if (habitBtn) {
    habitBtn.addEventListener('click', async () => {
      const todayLog = (tracker.logs || []).find(l => l.date === today())
      const newVal   = todayLog?.value !== true
      habitBtn.disabled = true
      try {
        await logProgress(user.uid, mode, tracker.id, { value: newVal })
        showToast(newVal ? 'Completed.' : 'Unmarked.')
      } catch (e) {
        showToast('Error saving.')
      } finally {
        habitBtn.disabled = false
      }
    })
  }

  // Milestone toggles
  el.querySelectorAll('.milestone-item').forEach(item => {
    item.addEventListener('click', async () => {
      const mid = item.dataset.mid
      try {
        await toggleMilestone(user.uid, mode, tracker.id, mid)
      } catch (e) {
        showToast('Error updating milestone.')
      }
    })
  })

  // Card menu (3-dot)
  const menuBtn = el.querySelector('.card-menu-btn')
  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    showCardMenu(el, tracker, user, mode)
  })
}

function showCardMenu(cardEl, tracker, user, mode) {
  const existing = document.querySelector('.card-dropdown')
  if (existing) { existing.remove(); return }

  const rect = cardEl.querySelector('.card-menu-btn').getBoundingClientRect()
  const menu = document.createElement('div')
  menu.className = 'dropdown__menu card-dropdown'
  menu.style.cssText = `position:fixed;top:${rect.bottom + 4}px;right:${window.innerWidth - rect.right}px;`
  menu.innerHTML = `
    <button class="dropdown__item" id="dm-edit">Edit Tracker</button>
    <button class="dropdown__item" id="dm-delete">Delete Tracker</button>
  `

  menu.querySelector('#dm-edit').addEventListener('click', () => {
    menu.remove()
    const modal = AddTrackerModal(null, tracker)
    document.body.appendChild(modal)
  })

  menu.querySelector('#dm-delete').addEventListener('click', async () => {
    menu.remove()
    if (!confirm(`Delete "${tracker.title}"? This cannot be undone.`)) return
    try {
      await deleteTracker(user.uid, mode, tracker.id)
      showToast('Tracker deleted.')
    } catch (e) {
      showToast('Error deleting tracker.')
    }
  })

  document.body.appendChild(menu)
  const dismiss = (e) => {
    if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('click', dismiss) }
  }
  setTimeout(() => document.addEventListener('click', dismiss), 0)
}

function esc(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
