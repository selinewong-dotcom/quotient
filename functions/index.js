/**
 * Quotient — Firebase Cloud Functions
 *
 * Requires Firebase Blaze (pay-as-you-go) plan to deploy.
 *
 * Deploy with:
 *   firebase deploy --only functions
 *
 * These functions provide server-side token generation and validation
 * for the 6-hour expiring share link feature.
 *
 * NOTE: The PWA already implements a client-side equivalent via Firestore
 * reads in src/firebase/firestore.js (createShareToken / getShareToken).
 * These Cloud Functions provide a hardened, server-enforced alternative
 * when deployed on Blaze plan.
 */

const { onRequest } = require('firebase-functions/v2/https')
const { initializeApp } = require('firebase-admin/app')
const { getFirestore, Timestamp } = require('firebase-admin/firestore')
const { v4: uuidv4 } = require('uuid')

initializeApp()
const db = getFirestore()

// ── CORS helper ────────────────────────────────────────────────
function setCORSHeaders(res, origin) {
  const allowed = ['http://localhost:5173', 'https://your-production-domain.com']
  if (allowed.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin)
  }
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

// ── createShareLink ────────────────────────────────────────────
/**
 * POST /createShareLink
 * Body: { uid: string, mode: 'work' | 'personal' }
 * Headers: { Authorization: 'Bearer <idToken>' }
 *
 * Returns: { token: string, expiresAt: ISO string }
 */
exports.createShareLink = onRequest({ region: 'us-central1' }, async (req, res) => {
  setCORSHeaders(res, req.headers.origin)
  if (req.method === 'OPTIONS') { res.status(204).send(''); return }
  if (req.method !== 'POST')    { res.status(405).json({ error: 'Method not allowed' }); return }

  try {
    // Verify Firebase ID token
    const { getAuth } = require('firebase-admin/auth')
    const authHeader = req.headers.authorization || ''
    const idToken    = authHeader.replace('Bearer ', '')
    if (!idToken) { res.status(401).json({ error: 'Unauthorized' }); return }

    const decoded = await getAuth().verifyIdToken(idToken)
    const { uid, mode } = req.body

    if (decoded.uid !== uid) { res.status(403).json({ error: 'Forbidden' }); return }
    if (!['work', 'personal'].includes(mode)) { res.status(400).json({ error: 'Invalid mode' }); return }

    const token     = uuidv4()
    const now       = new Date()
    const expiresAt = new Date(now.getTime() + 6 * 60 * 60 * 1000)  // +6 hours

    await db.collection('shared_links').doc(token).set({
      uid,
      mode,
      createdAt:  Timestamp.fromDate(now),
      expiresAt:  Timestamp.fromDate(expiresAt),
      isRevoked:  false,
    })

    res.status(200).json({ token, expiresAt: expiresAt.toISOString() })
  } catch (err) {
    console.error('createShareLink error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ── validateShareLink ──────────────────────────────────────────
/**
 * GET /validateShareLink?token=<token>
 *
 * Returns: { valid: bool, uid, mode, expiresAt } or { valid: false, reason }
 */
exports.validateShareLink = onRequest({ region: 'us-central1' }, async (req, res) => {
  setCORSHeaders(res, req.headers.origin)
  if (req.method === 'OPTIONS') { res.status(204).send(''); return }
  if (req.method !== 'GET')     { res.status(405).json({ error: 'Method not allowed' }); return }

  try {
    const { token } = req.query
    if (!token) { res.status(400).json({ valid: false, reason: 'No token provided' }); return }

    const snap = await db.collection('shared_links').doc(token).get()
    if (!snap.exists) { res.status(404).json({ valid: false, reason: 'Token not found' }); return }

    const link = snap.data()
    const now  = new Date()

    if (link.isRevoked) {
      res.status(200).json({ valid: false, reason: 'Link has been revoked' }); return
    }

    const expiresAt = link.expiresAt.toDate()
    if (now > expiresAt) {
      res.status(200).json({ valid: false, reason: 'Link has expired' }); return
    }

    res.status(200).json({
      valid:     true,
      uid:       link.uid,
      mode:      link.mode,
      expiresAt: expiresAt.toISOString(),
    })
  } catch (err) {
    console.error('validateShareLink error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ── cleanupExpiredLinks (scheduled) ───────────────────────────
/**
 * Runs daily to purge expired, non-revoked tokens.
 * Uncomment and deploy when on Blaze plan.
 *
 * const { onSchedule } = require('firebase-functions/v2/scheduler')
 * exports.cleanupExpiredLinks = onSchedule('every 24 hours', async () => {
 *   const cutoff = Timestamp.fromDate(new Date())
 *   const expired = await db.collection('shared_links')
 *     .where('expiresAt', '<', cutoff)
 *     .get()
 *   const batch = db.batch()
 *   expired.docs.forEach(d => batch.delete(d.ref))
 *   await batch.commit()
 * })
 */
