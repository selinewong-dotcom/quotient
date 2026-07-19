// ── Demo Mode — mock data & auth bypass ───────────────────────
// Activated by clicking "Explore Demo" on the auth screen.
// Injects realistic mock trackers into the store so the full
// dashboard, Evidence Engine, and Settings are all explorable
// without a Firebase connection.

import { store } from '../store/appStore.js'
import { getLastNDays } from './date.js'

const DEMO_USER = {
  uid:           'demo-user',
  displayName:   'Alex Morgan',
  email:         'alex@quotient.app',
  photoURL:      null,
  emailVerified: true,
  isDemo:        true,
}

const DEMO_PROFILE = {
  primaryMode: 'work',
  displayName: 'Alex Morgan',
  email:       'alex@quotient.app',
  createdAt:   new Date(),
}

function makeLogs(n, max = 8, min = 2) {
  return getLastNDays(n).map(date => ({
    date,
    value: Math.floor(Math.random() * (max - min + 1)) + min,
  }))
}

function makeHabitLogs(n, rate = 0.78) {
  return getLastNDays(n).map(date => ({
    date,
    value: Math.random() < rate,
  }))
}

const WORK_TRACKERS = [
  {
    id:           'wt-1',
    type:         'hard_target',
    title:        'Code Reviews This Sprint',
    description:  'Complete all assigned pull request reviews before Friday.',
    currentValue: 14,
    targetValue:  20,
    deadline:     (() => { const d = new Date(); d.setDate(d.getDate() + 3); return d.toISOString().split('T')[0] })(),
    unit:         'reviews',
    logs:         [],
    createdAt:    new Date(Date.now() - 7 * 86400000),
  },
  {
    id:           'wt-2',
    type:         'milestone',
    title:        'Q3 Platform Migration',
    description:  'Migrate legacy API endpoints to the new GraphQL gateway.',
    milestones: [
      { id: 'm1', label: 'Audit existing REST endpoints',        completed: true,  completedAt: '2026-05-20' },
      { id: 'm2', label: 'Design GraphQL schema',                completed: true,  completedAt: '2026-05-28' },
      { id: 'm3', label: 'Implement resolvers for core entities', completed: true,  completedAt: '2026-06-01' },
      { id: 'm4', label: 'Write integration test suite',         completed: false, completedAt: null },
      { id: 'm5', label: 'Deploy to staging + stakeholder sign-off', completed: false, completedAt: null },
      { id: 'm6', label: 'Production cutover',                   completed: false, completedAt: null },
    ],
    logs:         [],
    createdAt:    new Date(Date.now() - 21 * 86400000),
  },
  {
    id:          'wt-3',
    type:        'rolling_average',
    title:       'Support Tickets Closed',
    description: '7-day rolling average of closed support tickets per day.',
    windowDays:  7,
    unit:        'tickets',
    logs:        makeLogs(28, 9, 3),
    createdAt:   new Date(Date.now() - 28 * 86400000),
  },
  {
    id:          'wt-4',
    type:        'habit',
    title:       'Daily Standup Attendance',
    description: 'Show up on time and contribute to the daily standup.',
    logs:        makeHabitLogs(14, 0.92),
    createdAt:   new Date(Date.now() - 14 * 86400000),
  },
]

const PERSONAL_TRACKERS = [
  {
    id:           'pt-1',
    type:         'hard_target',
    title:        'Books Read This Year',
    description:  'Working through the annual reading list.',
    currentValue: 11,
    targetValue:  24,
    deadline:     `${new Date().getFullYear()}-12-31`,
    unit:         'books',
    logs:         [],
    createdAt:    new Date(Date.now() - 60 * 86400000),
  },
  {
    id:          'pt-2',
    type:        'habit',
    title:       'Morning Run',
    description: '5K before 8am — minimum 4 days per week.',
    logs:        makeHabitLogs(14, 0.64),
    createdAt:   new Date(Date.now() - 30 * 86400000),
  },
  {
    id:          'pt-3',
    type:        'rolling_average',
    title:       'Sleep Duration',
    description: '7-day rolling average of sleep in hours.',
    windowDays:  7,
    unit:        'hrs',
    logs:        makeLogs(14, 8, 5),
    createdAt:   new Date(Date.now() - 30 * 86400000),
  },
  {
    id:          'pt-4',
    type:        'milestone',
    title:       'Learn Spanish — B1 Level',
    description: 'Structured milestones toward conversational fluency.',
    milestones: [
      { id: 'pm1', label: 'Complete A1 Duolingo course',      completed: true,  completedAt: '2026-03-10' },
      { id: 'pm2', label: 'Finish 500 Anki vocabulary cards', completed: true,  completedAt: '2026-04-22' },
      { id: 'pm3', label: 'Complete A2 grammar workbook',     completed: true,  completedAt: '2026-05-15' },
      { id: 'pm4', label: 'First 1-hour conversation session', completed: false, completedAt: null },
      { id: 'pm5', label: 'Pass online B1 mock exam',         completed: false, completedAt: null },
    ],
    logs:      [],
    createdAt: new Date(Date.now() - 90 * 86400000),
  },
]

const LANGUAGE_TRACKERS = [
  {
    id:           'lt-1',
    type:         'hard_target',
    title:        'Active Immersion Hours',
    description:  'Structured language study hours toward conversational fluency.',
    currentValue: 34,
    targetValue:  100,
    deadline:     (() => { const d = new Date(); d.setMonth(d.getMonth() + 3); return d.toISOString().split('T')[0] })(),
    unit:         'hours',
    logs:         makeLogs(21, 5, 1),
    createdAt:    new Date(Date.now() - 60 * 86400000),
  },
  {
    id:           'lt-2',
    type:         'milestone',
    title:        'Core Syllabus / Textbook Roadmap',
    description:  'Structured progression through language course material.',
    milestones: [
      { id: 'lm1', label: 'Complete Unit 1: Phonetics & Alphabet',          completed: true,  completedAt: '2026-05-10' },
      { id: 'lm2', label: 'Finish Unit 2: Basic Greetings & Courtesies',   completed: true,  completedAt: '2026-05-20' },
      { id: 'lm3', label: 'Master Unit 3: Present Tense Conjugation',      completed: true,  completedAt: '2026-06-01' },
      { id: 'lm4', label: 'Complete Unit 4: Present Perfect & Past Tense', completed: false, completedAt: null },
      { id: 'lm5', label: 'Pass Unit 5 Proficiency Checkpoint',            completed: false, completedAt: null },
    ],
    logs:         [],
    createdAt:    new Date(Date.now() - 90 * 86400000),
  },
  {
    id:          'lt-3',
    type:        'rolling_average',
    title:       'Daily Vocabulary Cards Cleared',
    description: 'Rolling 7-day average of vocabulary cards studied.',
    windowDays:  7,
    unit:        'cards',
    logs:        makeLogs(21, 45, 15),
    createdAt:   new Date(Date.now() - 60 * 86400000),
  },
  {
    id:          'lt-4',
    type:        'habit',
    title:       'Daily Target-Language Media Intake',
    description: 'Daily engagement with native media: podcasts, films, news.',
    logs:        makeHabitLogs(14, 0.82),
    createdAt:   new Date(Date.now() - 30 * 86400000),
  },
]

export function activateDemo() {
  store.set('user',     DEMO_USER)
  store.set('profile',  DEMO_PROFILE)
  store.set('mode',     'work')
  store.set('trackers', WORK_TRACKERS)
  store.set('loading',  false)

  // Override mode switching to use mock data
  store._demoMode = true
  store._workTrackers     = WORK_TRACKERS
  store._personalTrackers = PERSONAL_TRACKERS
  store._languageTrackers = LANGUAGE_TRACKERS

  // Force the dashboard to re-render so the demo banner appears immediately.
  store.notify('trackers')
  store.notify('mode')
}

export function getDemoTrackers(mode) {
  if (mode === 'work') return WORK_TRACKERS
  if (mode === 'personal') return PERSONAL_TRACKERS
  if (mode === 'language') return LANGUAGE_TRACKERS
  return []
}

export function isDemoMode() {
  return store._demoMode === true
}

export function exitDemo() {
  store._demoMode = false
  store._workTrackers = null
  store._personalTrackers = null
  store.set('user',     null)
  store.set('profile',  null)
  store.set('trackers', [])
}
