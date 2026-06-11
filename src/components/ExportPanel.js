import { store } from '../store/appStore.js'
import { generatePDF } from '../utils/pdf.js'
import { createShareToken } from '../firebase/firestore.js'
import { showToast } from '../utils/toast.js'
import { formatTTL } from '../utils/date.js'

export function ExportPanel(onClose) {
  let generatingPDF   = false
  let generatingLink  = false
  let shareToken      = null
  let shareExpiresAt  = null

  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop'
  backdrop.innerHTML = `
    <div class="modal modal--wide" role="dialog" aria-modal="true" aria-label="Export">
      <div class="modal__header">
        <h2 class="modal__title">Evidence Engine</h2>
        <button class="modal__close" id="exp-close" aria-label="Close">&#x2715;</button>
      </div>
      <div class="modal__body">

        <div style="font-size:var(--text-sm);color:var(--text-tertiary);margin-bottom:var(--space-2);">
          Export your <strong id="exp-mode-label" style="color:var(--text-primary);"></strong> performance data
          for stakeholder review or sharing.
        </div>

        <div class="export-section">
          <!-- Method A: Executive PDF -->
          <div class="export-option">
            <div class="export-option__title">Executive PDF</div>
            <div class="export-option__desc">
              A structured, dark-mode performance report with metric summaries,
              completion percentages, and minimalist sparkline charts.
            </div>
            <button class="btn btn--primary btn--sm" id="pdf-btn" style="margin-top:auto;">
              Generate PDF
            </button>
          </div>

          <!-- Method C: Expiring Live Link -->
          <div class="export-option">
            <div class="export-option__title">Expiring Live Link</div>
            <div class="export-option__desc">
              A secure, read-only public link to your dashboard. Expires automatically
              6 hours after generation.
            </div>
            <button class="btn btn--ghost btn--sm" id="link-btn" style="margin-top:auto;">
              Generate Link
            </button>
          </div>
        </div>

        <div id="link-result" style="display:none;">
          <div style="font-size:var(--text-xs);font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-tertiary);margin-bottom:var(--space-2);">Live Link</div>
          <div class="share-link-box">
            <span class="share-link-box__url" id="share-url"></span>
            <button class="btn btn--ghost btn--sm" id="copy-link-btn">Copy</button>
          </div>
          <div class="share-link-ttl" id="share-ttl"></div>
          <button class="btn btn--text btn--sm" id="revoke-btn" style="margin-top:var(--space-2);color:var(--danger);">Revoke Link</button>
        </div>

      </div>
      <div class="modal__footer">
        <button class="btn btn--ghost" id="exp-done">Done</button>
      </div>
    </div>
  `

  const user = store.get('user')
  const mode = store.get('mode')
  backdrop.querySelector('#exp-mode-label').textContent = mode.toUpperCase()

  function cleanup() {
    backdrop.style.opacity = '0'
    backdrop.style.transition = 'opacity 0.2s'
    setTimeout(() => { backdrop.remove(); onClose?.() }, 200)
  }

  backdrop.addEventListener('click', e => { if (e.target === backdrop) cleanup() })
  backdrop.querySelector('#exp-close').addEventListener('click', cleanup)
  backdrop.querySelector('#exp-done').addEventListener('click', cleanup)

  // ── PDF Generation ────────────────────────────────────────────
  backdrop.querySelector('#pdf-btn').addEventListener('click', async () => {
    if (generatingPDF) return
    const trackers = store.get('trackers')
    if (!trackers?.length) { showToast('No trackers to export.'); return }

    generatingPDF = true
    const btn = backdrop.querySelector('#pdf-btn')
    btn.disabled  = true
    btn.innerHTML = '<span class="spinner spinner--sm"></span> Generating...'

    try {
      await generatePDF(user, mode, trackers)
      showToast('PDF downloaded.')
    } catch (e) {
      console.error(e)
      showToast('Error generating PDF.')
    } finally {
      generatingPDF = false
      btn.disabled  = false
      btn.textContent = 'Generate PDF'
    }
  })

  // ── Live Link Generation ──────────────────────────────────────
  backdrop.querySelector('#link-btn').addEventListener('click', async () => {
    if (generatingLink) return
    const trackers = store.get('trackers')
    if (!trackers?.length) { showToast('No trackers to share.'); return }

    generatingLink = true
    const btn = backdrop.querySelector('#link-btn')
    btn.disabled  = true
    btn.innerHTML = '<span class="spinner spinner--sm"></span>'

    try {
      shareToken    = await createShareToken(user.uid, mode)
      shareExpiresAt = new Date(Date.now() + 6 * 3600 * 1000)

      const url = `${window.location.origin}${window.location.pathname}#/shared/${shareToken}`
      backdrop.querySelector('#share-url').textContent = url
      backdrop.querySelector('#share-ttl').textContent = formatTTL({ toDate: () => shareExpiresAt })
      backdrop.querySelector('#link-result').style.display = ''

      showToast('Link generated. Expires in 6 hours.')
    } catch (e) {
      console.error(e)
      showToast('Error generating link.')
    } finally {
      generatingLink = false
      btn.disabled   = false
      btn.textContent = 'Regenerate'
    }
  })

  // ── Copy link ─────────────────────────────────────────────────
  backdrop.querySelector('#copy-link-btn').addEventListener('click', () => {
    const url = backdrop.querySelector('#share-url').textContent
    navigator.clipboard.writeText(url).then(() => showToast('Copied to clipboard.'))
  })

  // ── Revoke ────────────────────────────────────────────────────
  backdrop.querySelector('#revoke-btn').addEventListener('click', async () => {
    if (!shareToken) return
    const { revokeShareToken } = await import('../firebase/firestore.js')
    await revokeShareToken(shareToken)
    backdrop.querySelector('#link-result').style.display = 'none'
    shareToken = null
    backdrop.querySelector('#link-btn').textContent = 'Generate Link'
    showToast('Link revoked.')
  })

  return backdrop
}
