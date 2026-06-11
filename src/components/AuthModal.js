import { store } from '../store/appStore.js'
import { signInWithGoogle, signUpWithEmail, signInWithEmail } from '../firebase/auth.js'
import { showToast } from '../utils/toast.js'
import { activateDemo } from '../utils/demo.js'

export function AuthModal() {
  let tab = 'signin'
  let loading = false

  const el = document.createElement('div')
  el.className = 'auth-page'

  el.innerHTML = `
    <!-- Ambient background orbs -->
    <div class="auth-orbs" aria-hidden="true">
      <div class="auth-orb auth-orb--1"></div>
      <div class="auth-orb auth-orb--2"></div>
      <div class="auth-orb auth-orb--3"></div>
    </div>

    <!-- Left: Hero panel -->
    <div class="auth-hero" aria-hidden="true">
      <div class="auth-hero__inner">
        <div class="auth-hero__wordmark">Quotient</div>
        <div class="auth-hero__tagline">Proof of Work Engine</div>
        <div class="auth-hero__desc">
          Metric-driven progress tracking for workplace accountability
          and personal development. Strict data isolation. Zero noise.
        </div>
        <div class="auth-hero__stats">
          <div class="auth-stat">
            <div class="auth-stat__num">4</div>
            <div class="auth-stat__label">Tracker Modes</div>
          </div>
          <div class="auth-stat__divider"></div>
          <div class="auth-stat">
            <div class="auth-stat__num">2</div>
            <div class="auth-stat__label">Isolated Workspaces</div>
          </div>
          <div class="auth-stat__divider"></div>
          <div class="auth-stat">
            <div class="auth-stat__num">6h</div>
            <div class="auth-stat__label">Expiring Share Links</div>
          </div>
        </div>
        <div class="auth-hero__demo">
          <button id="demo-btn" class="auth-demo-btn" type="button">
            Explore Demo
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <span class="auth-demo-note">No account required</span>
        </div>
      </div>
    </div>

    <!-- Right: Auth form -->
    <div class="auth-panel">
      <div class="auth-card" role="main">
        <div class="auth-card__header">
          <div class="auth-brand">Quotient</div>
          <div class="auth-tagline">Sign in to continue</div>
        </div>

        <button id="google-btn" class="google-btn" type="button">
          <svg width="18" height="18" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <path d="M44.5 20H24v8.5h11.8C34.7 33.9 29.8 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.8 20-21 0-1.4-.1-2.7-.5-4z" fill="#FFC107"/>
            <path d="M6.3 14.7l7 5.1C15 16.1 19.2 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3 16.3 3 9.7 7.9 6.3 14.7z" fill="#FF3D00"/>
            <path d="M24 45c5.5 0 10.5-1.9 14.4-5.1l-6.7-5.5C29.6 36.2 26.9 37 24 37c-5.8 0-10.7-3.9-12.2-9.2L4.8 33.2C8.1 40.2 15.4 45 24 45z" fill="#4CAF50"/>
            <path d="M44.5 20H24v8.5h11.8c-.8 2.6-2.6 4.8-5 6.1l6.7 5.5C41.6 36.2 45 30.7 45 24c0-1.4-.1-2.7-.5-4z" fill="#1976D2"/>
          </svg>
          Continue with Google
        </button>

        <div class="auth-divider"><span>or</span></div>

        <div class="auth-tabs" role="tablist">
          <button id="tab-signin" class="auth-tab active" role="tab" aria-selected="true">Sign In</button>
          <button id="tab-signup" class="auth-tab" role="tab" aria-selected="false">Create Account</button>
        </div>

        <form id="auth-form" novalidate>
          <div id="name-group" class="form-group" style="display:none;">
            <label class="form-label" for="auth-name">Full Name</label>
            <input id="auth-name" type="text" class="form-input" placeholder="Your name" autocomplete="name" />
          </div>
          <div class="form-group">
            <label class="form-label" for="auth-email">Email</label>
            <input id="auth-email" type="email" class="form-input" placeholder="you@example.com" autocomplete="email" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="auth-password">Password</label>
            <input id="auth-password" type="password" class="form-input" placeholder="••••••••" autocomplete="current-password" required />
          </div>
          <div id="auth-error" class="form-error" style="display:none;" role="alert"></div>
          <button id="auth-submit" type="submit" class="btn btn--primary" style="width:100%;margin-top:4px;">
            Sign In
          </button>
        </form>

        <p class="auth-footer-note">
          By continuing, you agree to Quotient's secure, isolated data handling.
          Work and personal data never mix.
        </p>
      </div>
    </div>
  `

  function setTab(t) {
    tab = t
    const nameGroup = el.querySelector('#name-group')
    const submitBtn = el.querySelector('#auth-submit')
    const signinTab = el.querySelector('#tab-signin')
    const signupTab = el.querySelector('#tab-signup')
    const pwInput   = el.querySelector('#auth-password')
    const tagline   = el.querySelector('.auth-tagline')

    if (t === 'signup') {
      nameGroup.style.display = ''
      submitBtn.textContent   = 'Create Account'
      tagline.textContent     = 'Create your account'
      signinTab.classList.remove('active')
      signinTab.setAttribute('aria-selected', 'false')
      signupTab.classList.add('active')
      signupTab.setAttribute('aria-selected', 'true')
      pwInput.setAttribute('autocomplete', 'new-password')
    } else {
      nameGroup.style.display = 'none'
      submitBtn.textContent   = 'Sign In'
      tagline.textContent     = 'Sign in to continue'
      signupTab.classList.remove('active')
      signupTab.setAttribute('aria-selected', 'false')
      signinTab.classList.add('active')
      signinTab.setAttribute('aria-selected', 'true')
      pwInput.setAttribute('autocomplete', 'current-password')
    }
    showError('')
  }

  function showError(msg) {
    const errEl = el.querySelector('#auth-error')
    errEl.textContent    = msg
    errEl.style.display  = msg ? '' : 'none'
  }

  function setLoading(state) {
    loading = state
    const btn  = el.querySelector('#auth-submit')
    const gBtn = el.querySelector('#google-btn')
    btn.disabled  = state
    gBtn.disabled = state
    if (state) {
      btn.innerHTML = '<span class="spinner spinner--sm"></span>'
    } else {
      btn.textContent = tab === 'signup' ? 'Create Account' : 'Sign In'
    }
  }

  el.querySelector('#tab-signin').addEventListener('click', () => setTab('signin'))
  el.querySelector('#tab-signup').addEventListener('click', () => setTab('signup'))

  el.querySelector('#google-btn').addEventListener('click', async () => {
    try { setLoading(true); await signInWithGoogle() }
    catch (e) { showError(humanizeError(e.code)); setLoading(false) }
  })

  el.querySelector('#auth-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    showError('')
    const email    = el.querySelector('#auth-email').value.trim()
    const password = el.querySelector('#auth-password').value
    const name     = el.querySelector('#auth-name')?.value.trim() || ''
    try {
      setLoading(true)
      if (tab === 'signup') {
        await signUpWithEmail(email, password, name)
        showToast('Account created. Check your email to verify.')
      } else {
        await signInWithEmail(email, password)
      }
    } catch (e) { showError(humanizeError(e.code)); setLoading(false) }
  })

  // Demo mode
  el.querySelector('#demo-btn')?.addEventListener('click', () => {
    activateDemo()
    window.location.hash = '#/'
  })

  setTab('signin')
  return el
}

function humanizeError(code) {
  const map = {
    'auth/email-already-in-use':  'This email is already registered.',
    'auth/invalid-email':         'Please enter a valid email address.',
    'auth/weak-password':         'Password must be at least 6 characters.',
    'auth/user-not-found':        'No account found with this email.',
    'auth/wrong-password':        'Incorrect password.',
    'auth/invalid-credential':    'Incorrect email or password.',
    'auth/too-many-requests':     'Too many attempts. Please try again later.',
    'auth/popup-closed-by-user':  'Sign-in cancelled.',
    'auth/network-request-failed':'Network error. Check your connection.',
  }
  return map[code] || 'Something went wrong. Please try again.'
}
