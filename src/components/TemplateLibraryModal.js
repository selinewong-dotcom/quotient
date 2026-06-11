import { store } from '../store/appStore.js'
import { createTracker } from '../firebase/firestore.js'
import { showToast } from '../utils/toast.js'
import { TEMPLATES } from '../utils/templates.js'
import { AddTrackerModal } from './AddTrackerModal.js'

export function TemplateLibraryModal(onClose) {
  const mode = store.get('mode') // 'work' or 'personal'
  const user = store.get('user')
  const templates = TEMPLATES[mode] || []
  let activeTab = 'all'

  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop'
  backdrop.innerHTML = `
    <div class="modal modal--wide" id="template-library-modal" role="dialog" aria-modal="true" aria-label="Template Library">
      <div class="modal__header">
        <div>
          <h2 class="modal__title">Template Library</h2>
          <p class="form-hint" style="margin-top:4px;">Browse curated configurations to immediately begin tracking.</p>
        </div>
        <button class="modal__close" id="modal-close" aria-label="Close">&#x2715;</button>
      </div>
      <div class="modal__body">
        
        <!-- Filter Tabs -->
        <div class="template-tabs" style="display:flex;gap:8px;overflow-x:auto;padding-bottom:12px;border-bottom:1px solid var(--border-default);margin-bottom:8px;">
          <button class="btn btn--sm btn--ghost tab-btn active" data-tab="all">All</button>
          <button class="btn btn--sm btn--ghost tab-btn" data-tab="hard_target">Hard Targets</button>
          <button class="btn btn--sm btn--ghost tab-btn" data-tab="milestone">Milestones</button>
          <button class="btn btn--sm btn--ghost tab-btn" data-tab="rolling_average">Rolling Averages</button>
          <button class="btn btn--sm btn--ghost tab-btn" data-tab="habit">Habits</button>
        </div>

        <!-- Templates Grid -->
        <div id="templates-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;max-height:50vh;overflow-y:auto;padding-right:4px;">
          <!-- Template Cards Rendered Dynamically -->
        </div>

      </div>
      <div class="modal__footer">
        <button class="btn btn--ghost" id="close-btn">Close</button>
      </div>
    </div>
  `

  function renderGrid() {
    const grid = backdrop.querySelector('#templates-grid')
    if (!grid) return
    grid.innerHTML = ''

    const filtered = templates.filter(t => {
      if (activeTab === 'all') return true
      return t.type === activeTab
    })

    if (!filtered.length) {
      grid.innerHTML = `
        <div style="grid-column:span 2;text-align:center;padding:var(--space-10) 0;color:var(--text-tertiary);">
          No templates found for this category.
        </div>
      `
      return
    }

    filtered.forEach(t => {
      const card = document.createElement('div')
      card.className = 'choice-card'
      card.style.cssText = 'padding:var(--space-5);gap:var(--space-3);height:100%;justify-content:space-between;cursor:default;'
      
      const typeBadge = t.type.replace(/_/g, ' ')
      
      let detailsHTML = ''
      if (t.type === 'hard_target') {
        detailsHTML = `<div style="font-size:var(--text-xs);color:var(--text-tertiary);font-family:monospace;margin-top:auto;">Target: ${t.targetValue} ${t.unit || ''}</div>`
      } else if (t.type === 'rolling_average') {
        detailsHTML = `<div style="font-size:var(--text-xs);color:var(--text-tertiary);font-family:monospace;margin-top:auto;">Window: ${t.windowDays}d (${t.unit || 'avg'})</div>`
      } else if (t.type === 'milestone') {
        detailsHTML = `<div style="font-size:var(--text-xs);color:var(--text-tertiary);font-family:monospace;margin-top:auto;">${(t.milestones || []).length} Milestones</div>`
      } else if (t.type === 'habit') {
        detailsHTML = `<div style="font-size:var(--text-xs);color:var(--text-tertiary);font-family:monospace;margin-top:auto;">Daily completion tracking</div>`
      }

      card.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:var(--space-2);height:100%;">
          <div style="display:flex;justify-content:between;align-items:center;width:100%;">
            <span class="badge" style="margin:0;text-transform:capitalize;">${typeBadge}</span>
          </div>
          <div class="choice-card__title" style="font-size:var(--text-base);margin-top:4px;">${esc(t.title)}</div>
          <div class="choice-card__desc" style="font-size:var(--text-xs);line-height:1.4;margin-bottom:var(--space-3);">${esc(t.description)}</div>
          ${detailsHTML}
        </div>
        
        <div style="display:flex;gap:8px;margin-top:var(--space-4);">
          <button class="btn btn--primary btn--sm add-direct-btn" style="flex:1;">+ Add</button>
          <button class="btn btn--ghost btn--sm customize-btn" style="flex:1;">Customize</button>
        </div>
      `

      const addDirectBtn = card.querySelector('.add-direct-btn')
      addDirectBtn.addEventListener('click', async () => {
        addDirectBtn.disabled = true
        addDirectBtn.innerHTML = '<span class="spinner spinner--sm"></span>'
        
        const data = {
          type: t.type,
          title: t.title,
          description: t.description,
          logs: [],
          ...(t.type === 'hard_target' && { currentValue: t.currentValue || 0, targetValue: t.targetValue, unit: t.unit || '', deadline: t.deadline || null }),
          ...(t.type === 'rolling_average' && { windowDays: t.windowDays, unit: t.unit || '' }),
          ...(t.type === 'milestone' && { milestones: t.milestones.map(m => ({ ...m, id: crypto.randomUUID() })) }),
        }

        try {
          await createTracker(user.uid, mode, data)
          showToast(`"${t.title}" added directly.`)
        } catch (err) {
          console.error(err)
          showToast('Error adding template.')
        } finally {
          addDirectBtn.disabled = false
          addDirectBtn.textContent = '+ Add'
        }
      })

      card.querySelector('.customize-btn').addEventListener('click', () => {
        cleanup()
        const modal = AddTrackerModal(null, null, t)
        document.body.appendChild(modal)
      })

      grid.appendChild(card)
    })
  }

  function setTab(tab) {
    activeTab = tab
    backdrop.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab)
    })
    renderGrid()
  }

  function cleanup() {
    backdrop.style.opacity = '0'
    backdrop.style.transition = 'opacity 0.2s'
    setTimeout(() => { backdrop.remove(); onClose?.() }, 200)
  }

  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) cleanup() })
  backdrop.querySelector('#modal-close').addEventListener('click', cleanup)
  backdrop.querySelector('#close-btn').addEventListener('click', cleanup)

  backdrop.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => setTab(btn.dataset.tab))
  })

  // Add template-specific styles locally
  const styleEl = document.createElement('style')
  styleEl.textContent = `
    .template-tabs .tab-btn.active {
      background: var(--text-primary) !important;
      color: var(--bg-primary) !important;
      border-color: var(--text-primary) !important;
    }
  `
  document.head.appendChild(styleEl)

  setTab('all')

  return backdrop
}

function esc(str) {
  if (!str) return ''
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
