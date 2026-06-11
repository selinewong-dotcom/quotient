import {
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, query, orderBy, onSnapshot,
  serverTimestamp, Timestamp, addDoc,
} from 'firebase/firestore'
import { db } from './config.js'
import { store } from '../store/appStore.js'

function updateDemoStore(mode, updateFn) {
  const current = store.get('trackers') || []
  const updated = updateFn(current)
  store.set('trackers', updated)
  if (mode === 'work') {
    store._workTrackers = updated
  } else {
    store._personalTrackers = updated
  }
}

// ── User Profile ─────────────────────────────────────────────
export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? snap.data() : null
}

export async function createUserProfile(uid, data) {
  await setDoc(doc(db, 'users', uid), {
    ...data,
    createdAt: serverTimestamp(),
  }, { merge: true })
}

export async function updateUserProfile(uid, data) {
  await updateDoc(doc(db, 'users', uid), data)
}

// ── Tracker Collection Helpers ───────────────────────────────
function trackersCol(uid, mode) {
  const col = mode === 'work' ? 'work_trackers' : 'personal_trackers'
  return collection(db, col, uid, 'trackers')
}

function trackerDoc(uid, mode, trackerId) {
  const col = mode === 'work' ? 'work_trackers' : 'personal_trackers'
  return doc(db, col, uid, 'trackers', trackerId)
}

// ── Live Listener ─────────────────────────────────────────────
export function subscribeTrackers(uid, mode, callback) {
  const q = query(trackersCol(uid, mode), orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snap) => {
    const trackers = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    callback(trackers)
  })
}

// ── CRUD ──────────────────────────────────────────────────────
export async function createTracker(uid, mode, data) {
  if (store._demoMode) {
    const id = crypto.randomUUID()
    const newTracker = {
      id,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    updateDemoStore(mode, current => [newTracker, ...current])
    return id
  }

  const ref = await addDoc(trackersCol(uid, mode), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateTracker(uid, mode, trackerId, data) {
  if (store._demoMode) {
    updateDemoStore(mode, current => current.map(t => {
      if (t.id !== trackerId) return t
      return { ...t, ...data, updatedAt: new Date() }
    }))
    return
  }

  await updateDoc(trackerDoc(uid, mode, trackerId), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteTracker(uid, mode, trackerId) {
  if (store._demoMode) {
    updateDemoStore(mode, current => current.filter(t => t.id !== trackerId))
    return
  }

  await deleteDoc(trackerDoc(uid, mode, trackerId))
}

// ── Log Progress ──────────────────────────────────────────────
export async function logProgress(uid, mode, trackerId, logEntry) {
  if (store._demoMode) {
    const today = new Date().toISOString().split('T')[0]
    updateDemoStore(mode, current => current.map(t => {
      if (t.id !== trackerId) return t
      const logs = [...(t.logs || [])]
      if (t.type === 'habit') {
        const idx = logs.findIndex(l => l.date === today)
        if (idx >= 0) { logs[idx] = { date: today, value: logEntry.value } }
        else { logs.push({ date: today, value: logEntry.value }) }
        return { ...t, logs, updatedAt: new Date() }
      } else if (t.type === 'rolling_average') {
        logs.push({ date: today, value: logEntry.value, ts: Date.now() })
        return { ...t, logs, updatedAt: new Date() }
      } else if (t.type === 'hard_target') {
        return { ...t, currentValue: logEntry.value, updatedAt: new Date() }
      }
      return t
    }))
    return
  }

  const ref = trackerDoc(uid, mode, trackerId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  const data = snap.data()
  const logs = data.logs || []
  const today = new Date().toISOString().split('T')[0]

  if (data.type === 'habit') {
    // Replace today's entry if exists
    const idx = logs.findIndex(l => l.date === today)
    if (idx >= 0) { logs[idx] = { date: today, value: logEntry.value }
    } else { logs.push({ date: today, value: logEntry.value }) }
    await updateDoc(ref, { logs, updatedAt: serverTimestamp() })
  } else if (data.type === 'rolling_average') {
    logs.push({ date: today, value: logEntry.value, ts: Date.now() })
    await updateDoc(ref, { logs, updatedAt: serverTimestamp() })
  } else if (data.type === 'hard_target') {
    await updateDoc(ref, { currentValue: logEntry.value, updatedAt: serverTimestamp() })
  }
}

// ── Milestone Toggle ──────────────────────────────────────────
export async function toggleMilestone(uid, mode, trackerId, milestoneId) {
  if (store._demoMode) {
    updateDemoStore(mode, current => current.map(t => {
      if (t.id !== trackerId) return t
      const milestones = (t.milestones || []).map(m => {
        if (m.id !== milestoneId) return m
        return { ...m, completed: !m.completed, completedAt: !m.completed ? new Date().toISOString() : null }
      })
      return { ...t, milestones, updatedAt: new Date() }
    }))
    return
  }

  const ref = trackerDoc(uid, mode, trackerId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  const milestones = (snap.data().milestones || []).map(m => {
    if (m.id !== milestoneId) return m
    return { ...m, completed: !m.completed, completedAt: !m.completed ? new Date().toISOString() : null }
  })
  await updateDoc(ref, { milestones, updatedAt: serverTimestamp() })
}

// ── Shared Links ──────────────────────────────────────────────
export async function createShareToken(uid, mode) {
  const token = crypto.randomUUID()
  const now   = new Date()
  const expiresAt = new Date(now.getTime() + 6 * 60 * 60 * 1000)
  await setDoc(doc(db, 'shared_links', token), {
    uid,
    mode,
    createdAt: Timestamp.fromDate(now),
    expiresAt: Timestamp.fromDate(expiresAt),
    isRevoked: false,
  })
  return token
}

export async function getShareToken(token) {
  const snap = await getDoc(doc(db, 'shared_links', token))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

export async function revokeShareToken(token) {
  await updateDoc(doc(db, 'shared_links', token), { isRevoked: true })
}

export async function getTrackersSnapshot(uid, mode) {
  const { getDocs } = await import('firebase/firestore')
  const q = query(trackersCol(uid, mode), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}
