import { store } from '../store/appStore.js'
import { subscribeTrackers } from '../firebase/firestore.js'
import { TrackerCard } from '../components/TrackerCard.js'
import { AddTrackerModal } from '../components/AddTrackerModal.js'
import { TemplateLibraryModal } from '../components/TemplateLibraryModal.js'
import { isDemoMode, getDemoTrackers, exitDemo } from '../utils/demo.js'
import { showToast } from '../utils/toast.js'

let unsubscribe = null

export function DashboardPage() {
  const el = document.createElement('div')
  el.className = 'dashboard page-enter'

  function render() {
    const mode     = store.get('mode')
    const trackers = store.get('trackers') || []
    const isDemo   = isDemoMode()

    el.innerHTML = `
      ${isDemo ? `
        <div class="demo-banner">
          <span class="demo-banner__label">Demo Mode</span>
          <span class="demo-banner__text">Exploring with sample data — no data is saved</span>
          <button class="btn btn--ghost btn--sm demo-exit-btn" id="exit-demo-btn">Exit Demo</button>
        </div>
      ` : ''}

      <div class="container">
        <div class="dashboard__header">
          <div class="dashboard__eyebrow">${mode === 'work' ? 'Work Efficiency' : 'Personal Development'}</div>
          <div class="dashboard__heading">${mode === 'work' ? 'Work' : 'Personal'}</div>
          <div class="dashboard__sub">
            ${trackers.length
              ? `${trackers.length} tracker${trackers.length !== 1 ? 's' : ''} · ${mode === 'work' ? 'Workplace accountability' : 'Personal development'}`
              : 'No trackers yet. Add your first one below.'}
          </div>
        </div>

        <div class="dashboard__toolbar">
          <div class="section-label">All Trackers</div>
          <div style="display:flex;gap:8px;align-items:center;">
            ${isDemo ? `<span class="badge" style="margin:0;">Interactive Demo</span>` : ''}
            <button class="btn btn--ghost btn--sm" id="browse-templates-btn">Browse Templates</button>
            <button class="btn btn--primary btn--sm" id="add-tracker-btn">+ New Tracker</button>
          </div>
        </div>

        ${trackers.length
          ? `<div class="tracker-grid stagger" id="tracker-grid"></div>`
          : `<div class="empty-state">
               <div class="empty-state__title">Nothing tracked yet</div>
               <div class="empty-state__sub">Add a Hard Target, Milestone, Rolling Average, or Habit to begin.</div>
               <div style="display:flex;gap:12px;margin-top:var(--space-4);justify-content:center;">
                 <button class="btn btn--ghost" id="browse-templates-empty-btn">Browse Templates</button>
                 <button class="btn btn--primary" id="add-tracker-empty-btn">+ New Tracker</button>
               </div>
             </div>`
        }
      </div>
    `

    // Mount tracker cards with stagger animation
    const grid = el.querySelector('#tracker-grid')
    if (grid) {
      trackers.forEach((tracker, i) => {
        const card = TrackerCard(tracker)
        card.style.animationDelay = `${i * 50}ms`
        card.classList.add('animate-fade-up')
        grid.appendChild(card)
      })
    }

    // Add tracker button
    const addBtn = el.querySelector('#add-tracker-btn') || el.querySelector('#add-tracker-empty-btn')
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const modal = AddTrackerModal()
        document.body.appendChild(modal)
      })
    }

    // Browse templates button
    const templatesBtn = el.querySelector('#browse-templates-btn') || el.querySelector('#browse-templates-empty-btn')
    if (templatesBtn) {
      templatesBtn.addEventListener('click', () => {
        const modal = TemplateLibraryModal()
        document.body.appendChild(modal)
      })
    }

    // Exit demo
    el.querySelector('#exit-demo-btn')?.addEventListener('click', () => {
      exitDemo()
      window.location.hash = '#/'
      window.location.reload()
    })
  }

  // Subscribe — skip for demo mode
  function startSubscription() {
    const user = store.get('user')
    const mode = store.get('mode')
    if (!user) return

    if (isDemoMode()) {
      // Load demo trackers for this mode
      store.set('trackers', getDemoTrackers(mode))
      return
    }

    if (unsubscribe) unsubscribe()
    unsubscribe = subscribeTrackers(user.uid, mode, (trackers) => {
      store.set('trackers', trackers)
    })
  }

  // Re-render + resubscribe when mode changes
  const unsubMode = store.subscribe('mode', () => {
    startSubscription()
    render()
  })

  const unsubTrackers = store.subscribe('trackers', render)

  startSubscription()
  render()

  el._destroy = () => {
    unsubMode()
    unsubTrackers()
    if (unsubscribe) { unsubscribe(); unsubscribe = null }
  }

  return el
}
