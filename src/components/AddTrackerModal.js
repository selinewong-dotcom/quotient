import { store } from '../store/appStore.js'
import { createTracker, updateTracker } from '../firebase/firestore.js'
import { showToast } from '../utils/toast.js'

const TRACKER_TYPES = [
  { value: 'hard_target',     label: 'Hard Target',      desc: 'Numeric value against a deadline.' },
  { value: 'milestone',       label: 'Project Milestone', desc: 'Checklist with % completion.' },
  { value: 'rolling_average', label: 'Rolling Average',   desc: 'Velocity chart over a time window.' },
  { value: 'habit',           label: 'Habit',             desc: 'Daily binary check-in.' },
]

export function AddTrackerModal(onClose, trackerToEdit = null, templateData = null) {
  const isEditMode = !!trackerToEdit
  let selectedType = trackerToEdit ? trackerToEdit.type : (templateData ? templateData.type : 'hard_target')
  let loading      = false
  
  // Initialize milestones
  let milestones = [{ id: crypto.randomUUID(), label: '', completed: false }]
  if (isEditMode && trackerToEdit.type === 'milestone') {
    milestones = trackerToEdit.milestones ? [...trackerToEdit.milestones] : []
  } else if (templateData && templateData.type === 'milestone') {
    milestones = templateData.milestones ? templateData.milestones.map(m => ({ ...m, id: crypto.randomUUID() })) : []
  }

  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop'
  backdrop.innerHTML = `
    <div class="modal modal--wide" id="add-tracker-modal" role="dialog" aria-modal="true" aria-label="${isEditMode ? 'Edit Tracker' : 'New Tracker'}">
      <div class="modal__header">
        <h2 class="modal__title">${isEditMode ? 'Edit Tracker' : 'New Tracker'}</h2>
        <button class="modal__close" id="modal-close" aria-label="Close">&#x2715;</button>
      </div>
      <div class="modal__body">

        <!-- Type selector -->
        ${isEditMode ? `
          <div class="form-group" style="padding:var(--space-3) 0; border-bottom:1px solid var(--border-default); margin-bottom:var(--space-2);">
            <label class="form-label">Type</label>
            <div style="font-size:var(--text-base);font-weight:var(--weight-semibold);text-transform:capitalize;color:var(--text-primary);">
              ${selectedType.replace(/_/g, ' ')}
            </div>
            <span class="form-hint" style="margin-top:2px;">Type cannot be changed after creation.</span>
          </div>
        ` : `
          <div class="form-group">
            <label class="form-label">Type</label>
            <div id="type-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
              ${TRACKER_TYPES.map(t => `
                <div class="choice-card" data-type="${t.value}" style="padding:var(--space-4) var(--space-4);gap:var(--space-2);">
                  <div class="choice-card__title" style="font-size:var(--text-base);">${t.label}</div>
                  <div class="choice-card__desc" style="font-size:var(--text-xs);">${t.desc}</div>
                </div>
              `).join('')}
            </div>
          </div>
        `}

        <!-- Common fields -->
        <div class="form-group">
          <label class="form-label" for="t-title">Title</label>
          <input id="t-title" type="text" class="form-input" 
            placeholder="e.g. Code reviews this sprint" 
            maxlength="80" 
            value="${trackerToEdit ? esc(trackerToEdit.title) : (templateData ? esc(templateData.title) : '')}" 
            required />
        </div>
        <div class="form-group">
          <label class="form-label" for="t-desc">Description <span style="color:var(--text-tertiary);">(optional)</span></label>
          <textarea id="t-desc" class="form-input form-textarea" placeholder="Context or notes..." rows="2">${trackerToEdit ? esc(trackerToEdit.description || '') : (templateData ? esc(templateData.description || '') : '')}</textarea>
        </div>

        <!-- Type-specific fields -->
        <div id="type-fields"></div>

      </div>
      <div class="modal__footer">
        <button class="btn btn--ghost" id="cancel-btn">Cancel</button>
        <button class="btn btn--primary" id="save-btn">${isEditMode ? 'Save Changes' : 'Add Tracker'}</button>
      </div>
    </div>
  `

  function renderTypeFields() {
    const area = backdrop.querySelector('#type-fields')
    switch (selectedType) {
      case 'hard_target': {
        const curVal = trackerToEdit ? (trackerToEdit.currentValue ?? 0) : (templateData ? (templateData.currentValue ?? 0) : 0)
        const trgVal = trackerToEdit ? (trackerToEdit.targetValue ?? 0) : (templateData ? (templateData.targetValue ?? 0) : '')
        const deadline = trackerToEdit ? (trackerToEdit.deadline ?? '') : (templateData ? (templateData.deadline ?? '') : '')
        const unit = trackerToEdit ? esc(trackerToEdit.unit || '') : (templateData ? esc(templateData.unit || '') : '')

        area.innerHTML = `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4);">
            <div class="form-group">
              <label class="form-label" for="t-current">Current Value</label>
              <input id="t-current" type="number" class="form-input" value="${curVal}" min="0" />
            </div>
            <div class="form-group">
              <label class="form-label" for="t-target">Target Value</label>
              <input id="t-target" type="number" class="form-input" placeholder="20" value="${trgVal}" min="1" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="t-deadline">Deadline <span style="color:var(--text-tertiary);">(optional)</span></label>
            <input id="t-deadline" type="date" class="form-input" value="${deadline}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="t-unit">Unit <span style="color:var(--text-tertiary);">(optional)</span></label>
            <input id="t-unit" type="text" class="form-input" placeholder="e.g. reviews, tickets, calls" maxlength="30" value="${unit}" />
          </div>
        `
        break
      }

      case 'milestone':
        area.innerHTML = `
          <div class="form-group">
            <label class="form-label">Milestones</label>
            <div id="ms-list" style="display:flex;flex-direction:column;gap:8px;"></div>
            <button class="btn btn--ghost btn--sm" id="add-ms-btn" style="margin-top:8px;align-self:flex-start;">+ Add Milestone</button>
          </div>
        `
        renderMilestoneList(area)
        area.querySelector('#add-ms-btn').addEventListener('click', () => {
          milestones.push({ id: crypto.randomUUID(), label: '', completed: false })
          renderMilestoneList(area)
        })
        break

      case 'rolling_average': {
        const win = trackerToEdit ? (trackerToEdit.windowDays ?? 7) : (templateData ? (templateData.windowDays ?? 7) : 7)
        const unit = trackerToEdit ? esc(trackerToEdit.unit || '') : (templateData ? esc(templateData.unit || '') : '')

        area.innerHTML = `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4);">
            <div class="form-group">
              <label class="form-label" for="t-window">Window (days)</label>
              <input id="t-window" type="number" class="form-input" value="${win}" min="1" max="90" />
            </div>
            <div class="form-group">
              <label class="form-label" for="t-unit">Unit</label>
              <input id="t-unit" type="text" class="form-input" placeholder="e.g. tickets" maxlength="30" value="${unit}" />
            </div>
          </div>
        `
        break
      }

      case 'habit':
        area.innerHTML = `
          <div class="form-hint" style="padding:var(--space-3) var(--space-4);background:var(--bg-tertiary);border-radius:var(--radius-md);border:1px solid var(--border-default);">
            A habit tracker logs a daily Yes/No check-in. You can mark completion from the card each day.
          </div>
        `
        break
    }
  }

  function renderMilestoneList(area) {
    const list = area.querySelector('#ms-list')
    if (!list) return
    list.innerHTML = ''
    milestones.forEach((ms, i) => {
      const row = document.createElement('div')
      row.style.cssText = 'display:flex;gap:8px;align-items:center;'
      row.innerHTML = `
        <input type="text" class="form-input" style="flex:1;" value="${esc(ms.label)}"
          placeholder="Milestone ${i + 1}" data-ms-id="${ms.id}" />
        ${milestones.length > 1
          ? `<button class="btn btn--icon btn--ghost btn--sm del-ms" data-ms-id="${ms.id}" title="Remove" style="flex-shrink:0;">&#x2715;</button>`
          : ''}
      `
      row.querySelector('input').addEventListener('input', (e) => {
        const m = milestones.find(m => m.id === ms.id)
        if (m) m.label = e.target.value
      })
      const delBtn = row.querySelector('.del-ms')
      if (delBtn) {
        delBtn.addEventListener('click', () => {
          milestones = milestones.filter(m => m.id !== ms.id)
          renderMilestoneList(area)
        })
      }
      list.appendChild(row)
    })
  }

  function setType(type) {
    selectedType = type
    backdrop.querySelectorAll('[data-type]').forEach(card => {
      card.classList.toggle('selected', card.dataset.type === type)
    })
    renderTypeFields()
  }

  async function handleSave() {
    const title = backdrop.querySelector('#t-title').value.trim()
    const desc  = backdrop.querySelector('#t-desc').value.trim()
    if (!title) { showToast('Please enter a title.'); return }

    const user = store.get('user')
    const mode = store.get('mode')

    const base = { type: selectedType, title, description: desc }
    if (!isEditMode) {
      base.logs = []
    }

    let data = { ...base }
    switch (selectedType) {
      case 'hard_target':
        data.currentValue = parseFloat(backdrop.querySelector('#t-current')?.value) || 0
        data.targetValue  = parseFloat(backdrop.querySelector('#t-target')?.value)  || 0
        data.deadline     = backdrop.querySelector('#t-deadline')?.value || null
        data.unit         = backdrop.querySelector('#t-unit')?.value.trim() || ''
        break
      case 'milestone':
        data.milestones = milestones.filter(m => m.label.trim())
        if (!data.milestones.length) { showToast('Add at least one milestone.'); return }
        break
      case 'rolling_average':
        data.windowDays = parseInt(backdrop.querySelector('#t-window')?.value) || 7
        data.unit       = backdrop.querySelector('#t-unit')?.value.trim() || ''
        break
      case 'habit':
        break
    }

    loading = true
    const saveBtn = backdrop.querySelector('#save-btn')
    saveBtn.disabled  = true
    saveBtn.innerHTML = '<span class="spinner spinner--sm"></span>'

    try {
      if (isEditMode) {
        await updateTracker(user.uid, mode, trackerToEdit.id, data)
        showToast('Tracker updated.')
      } else {
        await createTracker(user.uid, mode, data)
        showToast('Tracker added.')
      }
      cleanup()
    } catch (e) {
      console.error(e)
      showToast(isEditMode ? 'Error updating tracker.' : 'Error creating tracker.')
      loading = false
      saveBtn.disabled  = false
      saveBtn.textContent = isEditMode ? 'Save Changes' : 'Add Tracker'
    }
  }

  function cleanup() {
    backdrop.style.opacity = '0'
    backdrop.style.transition = 'opacity 0.2s'
    setTimeout(() => { backdrop.remove(); onClose?.() }, 200)
  }

  // Wire up events
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) cleanup() })
  backdrop.querySelector('#modal-close').addEventListener('click', cleanup)
  backdrop.querySelector('#cancel-btn').addEventListener('click', cleanup)
  backdrop.querySelector('#save-btn').addEventListener('click', handleSave)

  if (!isEditMode) {
    backdrop.querySelectorAll('[data-type]').forEach(card => {
      card.addEventListener('click', () => setType(card.dataset.type))
    })
    setType(selectedType)
  } else {
    renderTypeFields()
  }

  return backdrop
}

function esc(str) {
  if (!str) return ''
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
