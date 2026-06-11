import { store } from '../store/appStore.js'
import { createUserProfile, getUserProfile } from '../firebase/firestore.js'
import { showToast } from '../utils/toast.js'

export function Onboarding(user) {
  let selected = null
  let loading  = false

  const el = document.createElement('div')
  el.className = 'onboarding'
  el.innerHTML = `
    <div class="onboarding__inner">
      <div class="onboarding__eyebrow">Welcome to Quotient</div>
      <h1 class="onboarding__heading">What are you tracking?</h1>
      <p class="onboarding__sub">
        Choose your primary focus. Quotient maintains strict data isolation
        between modes — you can always switch later.
      </p>

      <div class="onboarding__choices">
        <div class="choice-card" id="choice-work" data-mode="work">
          <div class="choice-card__label">Mode A</div>
          <div class="choice-card__title">Work Efficiency</div>
          <div class="choice-card__desc">
            Hard targets against deadlines, project milestones, rolling velocity metrics,
            and evidence exports for stakeholder reviews.
          </div>
        </div>
        <div class="choice-card" id="choice-personal" data-mode="personal">
          <div class="choice-card__label">Mode B</div>
          <div class="choice-card__title">Personal Development</div>
          <div class="choice-card__desc">
            Habit streaks, personal milestones, and long-form rolling averages
            for growth-focused self-improvement.
          </div>
        </div>
      </div>

      <button id="onboard-btn" class="btn btn--primary btn--lg" style="width:100%;opacity:0.35;" disabled>
        Continue
      </button>
      <p style="font-size:var(--text-xs);color:var(--text-tertiary);margin-top:var(--space-4);">
        Your primary mode is used as the default on launch.
        Both modes are always available from the top navigation.
      </p>
    </div>
  `

  const btn = el.querySelector('#onboard-btn')

  el.querySelectorAll('.choice-card').forEach(card => {
    card.addEventListener('click', () => {
      el.querySelectorAll('.choice-card').forEach(c => c.classList.remove('selected'))
      card.classList.add('selected')
      selected = card.dataset.mode
      btn.disabled = false
      btn.style.opacity = '1'
    })
  })

  btn.addEventListener('click', async () => {
    if (!selected || loading) return
    loading = true
    btn.innerHTML = '<span class="spinner spinner--sm"></span>'
    btn.disabled  = true

    try {
      await createUserProfile(user.uid, {
        primaryMode:  selected,
        displayName:  user.displayName || '',
        email:        user.email,
      })
      store.set('mode', selected)
      store.set('profile', await getUserProfile(user.uid))
      showToast('Welcome to Quotient.')
    } catch (e) {
      console.error(e)
      showToast('Error saving preference. Please try again.')
      loading = false
      btn.innerHTML = 'Continue'
      btn.disabled  = false
    }
  })

  return el
}
