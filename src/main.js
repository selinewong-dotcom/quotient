import './styles/global.css'
import './styles/components.css'

import { onAuthChanged } from './firebase/auth.js'
import { getUserProfile } from './firebase/firestore.js'
import { store } from './store/appStore.js'
import { AuthModal }    from './components/AuthModal.js'
import { Onboarding }   from './components/Onboarding.js'
import { NavBar }       from './components/NavBar.js'
import { DashboardPage } from './pages/Dashboard.js'
import { SharedViewPage } from './pages/SharedView.js'
import { SettingsPage }  from './pages/Settings.js'
import { isDemoMode }   from './utils/demo.js'

const appEl = document.getElementById('app')

// ── Loading Screen ─────────────────────────────────────────────
const loadingScreen = document.createElement('div')
loadingScreen.id = 'loading-screen'
loadingScreen.innerHTML = '<div class="loading-logo">Quotient</div>'
document.body.appendChild(loadingScreen)

function hideLoading() {
  loadingScreen.classList.add('hidden')
  setTimeout(() => loadingScreen.remove(), 400)
}

// ── Router ─────────────────────────────────────────────────────
let currentPage = null

async function navigate() {
  const hash = window.location.hash || '#/'

  // Public shared view — no auth required
  if (hash.startsWith('#/shared/')) {
    const token = hash.split('#/shared/')[1]
    if (!token) return renderError('Invalid link.')

    renderPublicShell()
    const page = await SharedViewPage(token)
    mountPage(page)
    return
  }

  // Demo mode bypass — skip auth + profile checks
  if (isDemoMode()) {
    renderAppShell()
    if (hash === '#/settings') mountPage(SettingsPage())
    else mountPage(DashboardPage())
    return
  }

  // Auth guard
  const user = store.get('user')
  if (!user) {
    renderAuth()
    return
  }

  // Check profile / onboarding
  const profile = store.get('profile')
  if (!profile) {
    renderOnboarding(user)
    return
  }

  // Main app routes
  renderAppShell()

  if (hash === '#/settings') {
    mountPage(SettingsPage())
  } else {
    mountPage(DashboardPage())
  }
}

// ── Shell renderers ────────────────────────────────────────────

function renderAuth() {
  appEl.innerHTML = ''
  currentPage?._destroy?.()
  currentPage = null
  appEl.appendChild(AuthModal())
}

function renderOnboarding(user) {
  appEl.innerHTML = ''
  currentPage?._destroy?.()
  currentPage = null

  const ob = Onboarding(user)
  appEl.appendChild(ob)

  // Watch profile — once set, navigate to dashboard
  const unsub = store.subscribe('profile', (profile) => {
    if (profile) { unsub(); navigate() }
  })
}

let navBar = null
function renderAppShell() {
  if (!navBar || !appEl.contains(navBar)) {
    appEl.innerHTML = ''
    navBar = NavBar()
    appEl.appendChild(navBar)
  }
}

function renderPublicShell() {
  appEl.innerHTML = ''
  navBar = null
  currentPage?._destroy?.()
  currentPage = null
}

const mainContent = document.createElement('main')
mainContent.style.cssText = 'flex:1;display:flex;flex-direction:column;'

function mountPage(page) {
  currentPage?._destroy?.()
  mainContent.innerHTML = ''
  mainContent.appendChild(page)
  currentPage = page

  if (!appEl.contains(mainContent)) {
    appEl.appendChild(mainContent)
  }
}

function renderError(msg) {
  appEl.innerHTML = `
    <div class="expired-state">
      <div style="font-size:var(--text-xl);color:var(--text-primary);">${msg}</div>
    </div>
  `
}

// ── Auth State ─────────────────────────────────────────────────
onAuthChanged(async (user) => {
  store.set('user', user)

  if (user) {
    try {
      const profile = await getUserProfile(user.uid)
      store.set('profile', profile)
    } catch (e) {
      console.warn('Could not fetch profile (Firebase not connected):', e.message)
      store.set('profile', null)
    }
  } else {
    store.set('profile', null)
    store.set('trackers', [])
  }

  store.set('loading', false)
  hideLoading()
  navigate()
})

// ── Hash-based routing ─────────────────────────────────────────
window.addEventListener('hashchange', navigate)

// ── Profile changes → re-navigate ──────────────────────────────
store.subscribe('profile', (profile) => {
  if (profile && store.get('user')) navigate()
})
