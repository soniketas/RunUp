const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export function IconGlass({ className }) {
  return (
    <svg {...base} className={className}>
      <path d="M4.5 4.5h15L12 13 4.5 4.5Z" />
      <path d="M12 13v6" />
      <path d="M8.5 19h7" />
    </svg>
  )
}

export function IconClipboard({ className }) {
  return (
    <svg {...base} className={className}>
      <rect x="5" y="4.5" width="14" height="16" rx="2" />
      <path d="M9 4.5V3.8a1.3 1.3 0 0 1 1.3-1.3h3.4A1.3 1.3 0 0 1 15 3.8v.7" />
      <path d="M8.5 10.5h7M8.5 14h7M8.5 17.5h4" />
    </svg>
  )
}

export function IconZones({ className }) {
  return (
    <svg {...base} className={className}>
      <rect x="4" y="4" width="7" height="7" rx="1.6" />
      <rect x="13" y="4" width="7" height="7" rx="1.6" />
      <rect x="4" y="13" width="7" height="7" rx="1.6" />
      <rect x="13" y="13" width="7" height="7" rx="1.6" />
    </svg>
  )
}

export function IconReset({ className }) {
  return (
    <svg {...base} strokeWidth={1.9} className={className}>
      <path d="M4.5 12a7.5 7.5 0 1 1 2.4 5.5" />
      <path d="M4.5 17v-4.3h4.3" />
    </svg>
  )
}

export function IconCheck({ className }) {
  return (
    <svg {...base} strokeWidth={2.4} className={className}>
      <path d="M5 12.5 9.5 17 19 6.5" />
    </svg>
  )
}

export function IconHome({ className }) {
  return (
    <svg {...base} className={className}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 9.8V19a1 1 0 0 0 1 1h3.5v-5.5h3V20H17a1 1 0 0 0 1-1V9.8" />
    </svg>
  )
}

export function IconPencil({ className }) {
  return (
    <svg {...base} className={className}>
      <path d="m14.5 5.5 4 4L8 20H4v-4Z" />
      <path d="m13 7 4 4" />
    </svg>
  )
}

export function IconTrash({ className }) {
  return (
    <svg {...base} className={className}>
      <path d="M5 7h14" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M7 7l1 12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-12" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  )
}

export function IconPlus({ className }) {
  return (
    <svg {...base} strokeWidth={2} className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function IconSettings({ className }) {
  return (
    <svg {...base} className={className}>
      <path d="M4 7h9M17 7h3" />
      <circle cx="14" cy="7" r="2.3" />
      <path d="M4 17h3M11 17h9" />
      <circle cx="8" cy="17" r="2.3" />
    </svg>
  )
}
