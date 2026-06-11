import jsPDF from 'jspdf'
import { trackerSummary, normalizeForChart, dailyTotals, habitDayValues } from './metrics.js'
import { formatDate } from './date.js'

const DARK  = [18, 18, 18]
const WHITE = [255, 255, 255]
const GREY1 = [160, 160, 160]
const GREY2 = [80, 80, 80]
const BORDER= [44, 44, 44]
const PAGE_W = 210
const PAGE_H = 297
const MARGIN = 20
const CONTENT_W = PAGE_W - MARGIN * 2

// Draw minimalist sparkline as PDF vector path
function drawSparkline(doc, x, y, w, h, values, color = WHITE) {
  const pts = values
    .map((v, i) => [x + (i / (values.length - 1)) * w, y + h - v * h])
    .filter(p => isFinite(p[0]) && isFinite(p[1]))

  if (pts.length < 2) return

  // Fill area under line
  doc.setDrawColor(...color)
  doc.setFillColor(color[0], color[1], color[2])
  doc.setGState(new doc.GState({ opacity: 0.08 }))
  doc.moveTo(pts[0][0], y + h)
  pts.forEach(([px, py]) => doc.lineTo(px, py))
  doc.lineTo(pts[pts.length - 1][0], y + h)
  doc.fill()

  // Draw line
  doc.setGState(new doc.GState({ opacity: 0.9 }))
  doc.setLineWidth(0.5)
  doc.setDrawColor(...color)
  doc.moveTo(pts[0][0], pts[0][1])
  pts.slice(1).forEach(([px, py]) => doc.lineTo(px, py))
  doc.stroke()
}

function drawProgressBar(doc, x, y, w, percent, bg = BORDER, fg = WHITE) {
  const h = 1.5
  doc.setFillColor(...bg)
  doc.roundedRect(x, y, w, h, h / 2, h / 2, 'F')
  if (percent > 0) {
    doc.setFillColor(...fg)
    doc.roundedRect(x, y, w * (percent / 100), h, h / 2, h / 2, 'F')
  }
}

export async function generatePDF(user, mode, trackers) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = MARGIN

  // ── Background ──────────────────────────────────────────────
  doc.setFillColor(...DARK)
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F')

  // ── Header ───────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(...WHITE)
  doc.text('Quotient', MARGIN, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...GREY2)
  doc.text('PROOF OF WORK ENGINE', MARGIN, y + 6)

  // Mode badge (top right)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...GREY1)
  const modeLabel = mode.toUpperCase()
  doc.text(modeLabel, PAGE_W - MARGIN, y, { align: 'right' })

  y += 12

  // ── Divider ──────────────────────────────────────────────────
  doc.setDrawColor(...BORDER)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, y, PAGE_W - MARGIN, y)
  y += 6

  // ── Report metadata ──────────────────────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GREY1)
  const dateStr = formatDate(new Date().toISOString())
  doc.text(`${user.displayName || user.email}  ·  Generated ${dateStr}`, MARGIN, y)
  y += 12

  // ── Summary Table ────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...GREY2)
  doc.text('TRACKER', MARGIN, y)
  doc.text('TYPE', MARGIN + 70, y)
  doc.text('METRIC', MARGIN + 110, y)
  doc.text('COMPLETION', MARGIN + 150, y)
  y += 3

  doc.setDrawColor(...BORDER)
  doc.setLineWidth(0.2)
  doc.line(MARGIN, y, PAGE_W - MARGIN, y)
  y += 5

  for (const tracker of trackers) {
    if (y > PAGE_H - 30) { doc.addPage(); y = MARGIN; doc.setFillColor(...DARK); doc.rect(0, 0, PAGE_W, PAGE_H, 'F') }
    const s = trackerSummary(tracker)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...WHITE)
    doc.text(tracker.title.substring(0, 30), MARGIN, y)
    doc.setTextColor(...GREY1)
    doc.setFontSize(8)
    doc.text(tracker.type.replace('_', ' '), MARGIN + 70, y)
    doc.text(s.metric, MARGIN + 110, y)
    if (s.percent !== null) {
      doc.text(`${s.percent}%`, MARGIN + 150, y)
      drawProgressBar(doc, MARGIN + 160, y - 2.5, 28, s.percent)
    } else {
      doc.text('—', MARGIN + 150, y)
    }
    y += 7
  }

  y += 4
  doc.setDrawColor(...BORDER)
  doc.line(MARGIN, y, PAGE_W - MARGIN, y)
  y += 12

  // ── Per-Tracker Detail Sections ──────────────────────────────
  for (const tracker of trackers) {
    if (y > PAGE_H - 55) {
      doc.addPage(); y = MARGIN
      doc.setFillColor(...DARK); doc.rect(0, 0, PAGE_W, PAGE_H, 'F')
    }

    // Section header
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...WHITE)
    doc.text(tracker.title, MARGIN, y)

    const typeBadge = tracker.type.replace(/_/g, ' ').toUpperCase()
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...GREY2)
    doc.text(typeBadge, PAGE_W - MARGIN, y, { align: 'right' })
    y += 5

    if (tracker.description) {
      doc.setFontSize(8)
      doc.setTextColor(...GREY1)
      const lines = doc.splitTextToSize(tracker.description, CONTENT_W)
      doc.text(lines, MARGIN, y)
      y += lines.length * 4
    }
    y += 3

    // Sparkline chart
    const chartH = 18
    const chartW = CONTENT_W

    let chartValues = []
    if (tracker.type === 'hard_target') {
      const pct = trackerSummary(tracker).percent / 100
      chartValues = Array(14).fill(0).map((_, i) => (i / 13) * pct)
    } else if (tracker.type === 'rolling_average') {
      chartValues = dailyTotals(tracker, 14)
    } else if (tracker.type === 'habit') {
      chartValues = habitDayValues(tracker, 14).map(v => v === true ? 1 : 0)
    } else if (tracker.type === 'milestone') {
      const pct = trackerSummary(tracker).percent / 100
      chartValues = Array(14).fill(pct)
    }

    const { normalizeForChart: norm } = await import('./metrics.js')
    const normalized = norm(chartValues)

    // Chart bg
    doc.setFillColor(...BORDER)
    doc.roundedRect(MARGIN, y, chartW, chartH, 1, 1, 'F')
    drawSparkline(doc, MARGIN + 2, y + 2, chartW - 4, chartH - 4, normalized)
    y += chartH + 6

    // Key metric
    const s = trackerSummary(tracker)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.setTextColor(...WHITE)
    doc.text(s.metric, MARGIN, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...GREY2)
    doc.text(s.label.toUpperCase(), MARGIN, y)
    y += 8

    if (s.percent !== null) {
      drawProgressBar(doc, MARGIN, y, CONTENT_W, s.percent)
      y += 5
      doc.setFontSize(8)
      doc.setTextColor(...GREY1)
      doc.text(`${s.percent}% complete`, MARGIN, y)
      y += 4
    }

    y += 4
    doc.setDrawColor(...BORDER)
    doc.setLineWidth(0.2)
    doc.line(MARGIN, y, PAGE_W - MARGIN, y)
    y += 10
  }

  // ── Footer ────────────────────────────────────────────────────
  if (y > PAGE_H - 20) { doc.addPage(); doc.setFillColor(...DARK); doc.rect(0, 0, PAGE_W, PAGE_H, 'F') }
  doc.setFontSize(7)
  doc.setTextColor(...GREY2)
  doc.text('Generated by Quotient — Proof of Work Engine', MARGIN, PAGE_H - 10)
  doc.text(new Date().toISOString(), PAGE_W - MARGIN, PAGE_H - 10, { align: 'right' })

  const filename = `quotient-${mode}-report-${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(filename)
}
