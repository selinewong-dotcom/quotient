import { store } from '../store/appStore.js'
import { logout } from '../firebase/auth.js'
import { updateUserProfile } from '../firebase/firestore.js'
import { showToast } from '../utils/toast.js'

export function SettingsPage() {
  const el = document.createElement('div')
  el.className = 'settings-page page-enter'

  function render() {
    const user    = store.get('user')
    const profile = store.get('profile')
    const theme   = store.get('theme')
    const mode    = store.get('mode')

    el.innerHTML = `
      <div class="container container--narrow">
        <div class="dashboard__header" style="margin-bottom:var(--space-8);">
          <div class="dashboard__heading">Settings</div>
        </div>

        <!-- Account -->
        <div class="section-label">Account</div>
        <div class="settings-section" style="margin-bottom:var(--space-6);">
          <div class="settings-row">
            <div class="settings-row__info">
              <div class="settings-row__label">${user?.displayName || 'Anonymous'}</div>
              <div class="settings-row__desc">${user?.email || ''}</div>
            </div>
            <div class="badge">${user?.emailVerified ? 'Verified' : 'Unverified'}</div>
          </div>
          <div class="settings-row">
            <div class="settings-row__info">
              <div class="settings-row__label">Sign Out</div>
              <div class="settings-row__desc">Sign out of your Quotient account.</div>
            </div>
            <button class="btn btn--ghost btn--sm" id="signout-btn">Sign Out</button>
          </div>
        </div>

        <!-- Appearance -->
        <div class="section-label">Appearance</div>
        <div class="settings-section" style="margin-bottom:var(--space-6);">
          <div class="settings-row">
            <div class="settings-row__info">
              <div class="settings-row__label">Theme</div>
              <div class="settings-row__desc">Switch between dark and light mode.</div>
            </div>
            <button class="btn btn--ghost btn--sm" id="theme-btn">
              ${theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
            </button>
          </div>
        </div>

        <!-- Mode Defaults -->
        <div class="section-label">Workspace</div>
        <div class="settings-section" style="margin-bottom:var(--space-6);">
          <div class="settings-row">
            <div class="settings-row__info">
              <div class="settings-row__label">Primary Mode</div>
              <div class="settings-row__desc">Your default mode on app launch.</div>
            </div>
            <div style="display:flex;gap:6px;">
              <button class="btn btn--sm ${mode === 'work' ? 'btn--primary' : 'btn--ghost'}" id="pm-work">Work</button>
              <button class="btn btn--sm ${mode === 'personal' ? 'btn--primary' : 'btn--ghost'}" id="pm-personal">Personal</button>
            </div>
          </div>
          <div class="settings-row">
            <div class="settings-row__info">
              <div class="settings-row__label">Auto Time-Gating</div>
              <div class="settings-row__desc">
                Automatically switch to Work mode 9 AM – 5 PM.
                <span style="color:var(--text-tertiary);"> — Coming in a future release</span>
              </div>
            </div>
            <div class="badge">Disabled</div>
          </div>
        </div>

        <!-- About -->
        <div class="section-label">About</div>
        <div class="settings-section">
          <div class="settings-row">
            <div class="settings-row__info">
              <div class="settings-row__label">Quotient</div>
              <div class="settings-row__desc">Proof of Work Engine · v1.0.0</div>
            </div>
          </div>
          <div class="settings-row">
            <div class="settings-row__info">
              <div class="settings-row__label">Data Isolation</div>
              <div class="settings-row__desc">Work and personal data are stored in separate Firestore collections. They never mix.</div>
            </div>
            <div class="badge">Active</div>
          </div>
        </div>

      </div>
    `

    el.querySelector('#signout-btn').addEventListener('click', async () => {
      await logout()
      showToast('Signed out.')
    })

    el.querySelector('#theme-btn').addEventListener('click', () => {
      const currentTheme = store.get('theme')
      store.set('theme', currentTheme === 'dark' ? 'light' : 'dark')
    })

    el.querySelector('#pm-work').addEventListener('click', async () => {
      store.set('mode', 'work')
      const u = store.get('user')
      if (u) await updateUserProfile(u.uid, { primaryMode: 'work' }).catch(() => {})
    })

    el.querySelector('#pm-personal').addEventListener('click', async () => {
      store.set('mode', 'personal')
      const u = store.get('user')
      if (u) await updateUserProfile(u.uid, { primaryMode: 'personal' }).catch(() => {})
    })
  }

  const unsub1 = store.subscribe('theme', render)
  const unsub2 = store.subscribe('mode',  render)

  render()

  el._destroy = () => { unsub1(); unsub2() }

  return el
}
