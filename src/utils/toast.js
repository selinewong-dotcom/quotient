// ── Toast utility ─────────────────────────────────────────────
let container = null

function getContainer() {
  if (!container) {
    container = document.createElement('div')
    container.id = 'toast-container'
    document.body.appendChild(container)
  }
  return container
}

export function showToast(message, duration = 3000) {
  const c    = getContainer()
  const toast = document.createElement('div')
  toast.className = 'toast'
  toast.textContent = message
  c.appendChild(toast)
  setTimeout(() => {
    toast.classList.add('fade-out')
    toast.addEventListener('animationend', () => toast.remove(), { once: true })
  }, duration)
}
