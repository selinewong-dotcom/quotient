// Minimalist SVG sparkline chart — pure vector, no canvas dependency
// Values should be normalized 0–1 array
export function SparklineChart(values, options = {}) {
  const {
    width   = '100%',
    height  = 56,
    color   = 'var(--line-chart)',
    dimColor= 'var(--line-chart-dim)',
    strokeW = 1.5,
    showDots= false,
    id      = '',
  } = options

  const pts = values.map((v, i) => {
    const x = (i / Math.max(values.length - 1, 1)) * 100
    const y = 100 - (v * 80 + 10) // 10% padding top/bottom
    return `${x.toFixed(2)},${y.toFixed(2)}`
  })

  const pathD = pts.length > 1
    ? `M ${pts.join(' L ')}`
    : ''

  // Fill: close path to bottom
  const fillD = pts.length > 1
    ? `M ${pts[0]} L ${pts.join(' L ')} L ${(values.length - 1) / Math.max(values.length - 1, 1) * 100},90 L 0,90 Z`
    : ''

  const dotsHtml = showDots ? pts.map(pt => {
    const [x, y] = pt.split(',')
    return `<circle cx="${x}%" cy="${y}%" r="2" fill="${color}" />`
  }).join('') : ''

  const svgId = id || `chart-${Math.random().toString(36).slice(2)}`

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 100 100')
  svg.setAttribute('preserveAspectRatio', 'none')
  svg.style.width   = typeof width  === 'number' ? `${width}px`  : width  // default '100%'
  svg.style.height  = typeof height === 'number' ? `${height}px` : height
  svg.style.display = 'block'
  svg.style.overflow = 'visible'
  svg.style.minWidth = '0' // prevents flex/grid blowout

  svg.innerHTML = `
    <defs>
      <linearGradient id="${svgId}-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stop-color="${color}" stop-opacity="0.15" />
        <stop offset="100%" stop-color="${color}" stop-opacity="0"    />
      </linearGradient>
    </defs>
    ${fillD ? `<path d="${fillD}" fill="url(#${svgId}-grad)" />` : ''}
    ${pathD ? `<polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="${strokeW}" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />` : ''}
    ${dotsHtml}
  `

  return svg
}

export function HabitGrid(dayValues, nDays = 14) {
  const days = ['S','M','T','W','T','F','S']
  const container = document.createElement('div')
  container.className = 'habit-checkin'
  container.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;'

  const today = new Date()

  dayValues.forEach((val, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (nDays - 1 - i))
    const isToday = i === nDays - 1
    const dayName = days[d.getDay()]

    const wrapper = document.createElement('div')
    wrapper.className = 'habit-day'

    const label = document.createElement('div')
    label.className = 'habit-day__label'
    label.textContent = dayName

    const dot = document.createElement('div')
    dot.className = `habit-day__dot${val === true ? ' done' : ''}${isToday ? ' today' : ''}`
    dot.title = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

    wrapper.appendChild(label)
    wrapper.appendChild(dot)
    container.appendChild(wrapper)
  })

  return container
}
