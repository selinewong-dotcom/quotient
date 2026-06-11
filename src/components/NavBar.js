import { store } from '../store/appStore.js'
import { logout } from '../firebase/auth.js'
import { showToast } from '../utils/toast.js'
import { ExportPanel } from './ExportPanel.js'

export function NavBar() {
  const el = document.createElement('nav')
  el.className = 'navbar'

  function render() {
    const mode  = store.get('mode')
    const theme = store.get('theme')
    const user  = store.get('user')

    el.innerHTML = `
      <div class="navbar__brand" id="nav-brand">Quotient</div>

      <div class="navbar__center">
        <button
          class="navbar__mode-btn ${mode === 'work' ? 'active' : ''}"
          id="mode-work"
          title="Work mode"
        >Work</button>
        <button
          class="navbar__mode-btn ${mode === 'personal' ? 'active' : ''}"
          id="mode-personal"
          title="Personal mode"
        >Personal</button>
      </div>

      <div class="navbar__actions">
        <button class="theme-toggle" id="theme-toggle">
          ${theme === 'dark' ? 'Light' : 'Dark'}
        </button>
        <button class="btn btn--ghost btn--sm hide-mobile" id="nav-export">Export</button>
        <div class="user-avatar" id="user-avatar" title="${user?.email || ''}">
          ${user?.photoURL
            ? `<img src="${user.photoURL}" alt="avatar" />`
            : (user?.displayName?.[0] || user?.email?.[0] || 'U').toUpperCase()
          }
        </div>
      </div>
    `

    // Mode toggle
    el.querySelector('#mode-work').addEventListener('click', () => {
      store.set('mode', 'work')
    })
    el.querySelector('#mode-personal').addEventListener('click', () => {
      store.set('mode', 'personal')
    })

    // Theme toggle
    el.querySelector('#theme-toggle').addEventListener('click', () => {
      store.set('theme', theme === 'dark' ? 'light' : 'dark')
    })

    // Export panel
    el.querySelector('#nav-export')?.addEventListener('click', () => {
      const panel = ExportPanel()
      document.body.appendChild(panel)
    })

    // Avatar dropdown
    el.querySelector('#user-avatar').addEventListener('click', (e) => {
      e.stopPropagation()
      toggleUserMenu(el.querySelector('#user-avatar'))
    })

    // Brand → dashboard
    el.querySelector('#nav-brand').addEventListener('click', () => {
      window.location.hash = '#/'
    })
  }

  function toggleUserMenu(anchor) {
    const existing = document.querySelector('.user-dropdown')
    if (existing) { existing.remove(); return }

    const menu = document.createElement('div')
    menu.className = 'dropdown__menu user-dropdown'
    menu.style.cssText = 'position:fixed;top:52px;right:var(--space-6);'
    menu.innerHTML = `
      <button class="dropdown__item" id="dd-export">Export Data</button>
      <button class="dropdown__item" id="dd-settings">Settings</button>
      <button class="dropdown__item dropdown__item--danger" id="dd-signout">Sign Out</button>
    `

    menu.querySelector('#dd-export').addEventListener('click', () => {
      menu.remove()
      const panel = ExportPanel()
      document.body.appendChild(panel)
    })

    menu.querySelector('#dd-settings').addEventListener('click', () => {
      menu.remove()
      window.location.hash = '#/settings'
    })

    menu.querySelector('#dd-signout').addEventListener('click', async () => {
      menu.remove()
      await logout()
      showToast('Signed out.')
    })

    document.body.appendChild(menu)
    const dismiss = (e) => {
      if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('click', dismiss) }
    }
    setTimeout(() => document.addEventListener('click', dismiss), 0)
  }

  render()

  // Re-render on state changes
  store.subscribe('mode',  render)
  store.subscribe('theme', render)
  store.subscribe('user',  render)

  return el
}
