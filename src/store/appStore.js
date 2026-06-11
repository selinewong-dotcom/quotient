// ============================================================
// QUOTIENT — Reactive App Store
// Lightweight Observer pattern — no external state library
// ============================================================

const _state = {
  user:     null,         // Firebase auth user object
  profile:  null,         // Firestore user profile
  mode:     localStorage.getItem('qMode') || 'work',  // 'work' | 'personal'
  trackers: [],           // Live-synced trackers for current mode
  theme:    localStorage.getItem('qTheme') || 'dark',
  loading:  true,         // Global auth loading state
  // ── Time-gating (placeholder — disabled) ──────────────────
  timeGatingEnabled:  false,
  timeGatingSchedule: { workStart: '09:00', workEnd: '17:00' },
}

const _listeners = new Map()

function subscribe(key, fn) {
  if (!_listeners.has(key)) _listeners.set(key, new Set())
  _listeners.get(key).add(fn)
  return () => _listeners.get(key).delete(fn)
}

function notify(key) {
  if (_listeners.has(key)) {
    _listeners.get(key).forEach(fn => fn(_state[key]))
  }
}

function set(key, value) {
  _state[key] = value
  notify(key)

  // Side-effects
  if (key === 'theme') {
    document.documentElement.setAttribute('data-theme', value)
    localStorage.setItem('qTheme', value)
  }
  if (key === 'mode') {
    localStorage.setItem('qMode', value)
  }
}

function get(key) {
  return _state[key]
}

function getState() {
  return { ..._state }
}

export const store = { subscribe, set, get, getState, notify }

// Apply theme immediately on load
document.documentElement.setAttribute('data-theme', _state.theme)
