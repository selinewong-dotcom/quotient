import { store } from '../store/appStore.js'
import { createTracker, subscribeTrackers } from '../firebase/firestore.js'
import { TrackerCard } from '../components/TrackerCard.js'
import { AddTrackerModal } from '../components/AddTrackerModal.js'
import { TemplateLibraryModal } from '../components/TemplateLibraryModal.js'
import { isDemoMode, getDemoTrackers, exitDemo } from '../utils/demo.js'
import { TEMPLATES } from '../utils/templates.js'
import { showToast } from '../utils/toast.js'

let unsubscribe = null

export function DashboardPage() {
  const el = document.createElement('div')
  el.className = 'dashboard page-enter'
  let templatePromptShown = false

  function buildLanguageTrackerPayload(template) {
    const payload = {
      type: template.type,
      title: template.title,
      description: template.description,
      logs: [],
    }

    if (template.type === 'hard_target') {
      payload.currentValue = template.currentValue ?? 0
      payload.targetValue = template.targetValue ?? 0
      payload.unit = template.unit || ''
      payload.deadline = template.deadline || null
    } else if (template.type === 'milestone') {
      payload.milestones = (template.milestones || []).map(m => ({ ...m, id: crypto.randomUUID() }))
    } else if (template.type === 'rolling_average') {
      payload.windowDays = template.windowDays ?? 7
      payload.unit = template.unit || ''
    }

    return payload
  }

  function maybeShowLanguageTemplatePrompt() {
    const mode = store.get('mode')
    const trackers = store.get('trackers') || []
    if (mode !== 'personal' || templatePromptShown || trackers.length > 0) return

    templatePromptShown = true

    const backdrop = document.createElement('div')
    backdrop.className = 'modal-backdrop'
    backdrop.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-label="Language Layout">
        <div class="modal__header">
          <h2 class="modal__title">Language Learning Setup</h2>
        </div>
        <div class="modal__body">
          <p style="color:var(--text-secondary);margin-bottom:var(--space-4);">[ Language Layout ]</p>
          <div style="display:flex;flex-direction:column;gap:var(--space-3);">
            <div class="choice-card" id="template-full" style="cursor:pointer;padding:var(--space-4);">
              <div class="choice-card__title">Load Full Language Dashboard</div>
              <div class="choice-card__desc" style="font-size:var(--text-xs);">
                Fill the workspace with four ready-to-edit language trackers for immersion hours, syllabus progress, vocabulary velocity, and media intake.
              </div>
            </div>
            <div class="choice-card" id="template-custom" style="cursor:pointer;padding:var(--space-4);">
              <div class="choice-card__title">Browse Individual Presets</div>
              <div class="choice-card__desc" style="font-size:var(--text-xs);">
                Keep the current workspace intact and add single language tracking modules from the preset library.
              </div>
            </div>
          </div>
        </div>
        <div class="modal__footer">
          <button class="btn btn--ghost" id="template-skip">Skip</button>
          <button class="btn btn--primary" id="template-confirm" disabled>Proceed</button>
        </div>
      </div>
    `

    let selectedTemplate = null

    backdrop.querySelectorAll('.choice-card').forEach(card => {
      card.addEventListener('click', () => {
        backdrop.querySelectorAll('.choice-card').forEach(c => c.classList.remove('selected'))
        card.classList.add('selected')
        selectedTemplate = card.id === 'template-full' ? 'full' : 'custom'
        backdrop.querySelector('#template-confirm').disabled = false
      })
    })

    backdrop.querySelector('#template-skip').addEventListener('click', () => {
      backdrop.remove()
      showToast('Personal mode ready.')
    })

    backdrop.querySelector('#template-confirm').addEventListener('click', async () => {
      if (!selectedTemplate) return

      const user = store.get('user')

      if (selectedTemplate === 'full') {
        try {
          const payloads = TEMPLATES.language.map(buildLanguageTrackerPayload)
          if (user) {
            await Promise.all(payloads.map(payload => createTracker(user.uid, 'personal', payload)))
          } else {
            store.set('trackers', payloads)
          }
          showToast('Language dashboard initialized.')
        } catch (err) {
          console.error(err)
          showToast('Error initializing language dashboard.')
        }
      } else {
        const modal = AddTrackerModal(() => {})
        document.body.appendChild(modal)
        showToast('Use presets to add language trackers.')
      }

      backdrop.remove()
    })

    document.body.appendChild(backdrop)
  }

  function render() {
    const mode     = store.get('mode')
    const trackers = store.get('trackers') || []
    const isDemo   = isDemoMode()

    el.innerHTML = `
      <div class="container">
        ${isDemo ? `
          <div class="demo-banner">
            <span class="demo-banner__label">Demo Mode</span>
            <span class="demo-banner__text">Exploring with sample data — no data is saved</span>
            <button class="btn btn--ghost btn--sm demo-exit-btn" id="exit-demo-btn">Exit Demo</button>
          </div>
        ` : ''}
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

    maybeShowLanguageTemplatePrompt()

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
  const unsubDemo = store.subscribe('user', () => {
    if (isDemoMode()) render()
  })

  startSubscription()
  render()

  el._destroy = () => {
    unsubMode()
    unsubTrackers()
    unsubDemo()
    if (unsubscribe) { unsubscribe(); unsubscribe = null }
  }

  return el
}
