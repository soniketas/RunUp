import { IconClipboard, IconHome, IconReset, IconSettings, IconZones } from './icons'

export default function BottomNav({ view, onChange, pendingCount, onReset }) {
  const handleReset = () => {
    const confirmed = window.confirm(
      "Start a new restock run? This applies what you already checked off in the current run (raises restocked stock and logs a shortage for anything that came up short) and starts a fresh, empty list. Anything you never checked stays as missing.",
    )
    if (confirmed) onReset()
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-10 flex items-center justify-center gap-3 px-5 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-2">
      <nav className="flex items-center gap-1 rounded-full bg-ink px-2 py-2 shadow-lg shadow-black/20">
        <NavButton
          icon={<IconHome className="h-5 w-5" />}
          isActive={view === 'home'}
          onClick={() => onChange('home')}
        />
        <NavButton
          icon={<IconZones className="h-5 w-5" />}
          isActive={view === 'zones'}
          onClick={() => onChange('zones')}
        />
        <NavButton
          icon={<IconClipboard className="h-5 w-5" />}
          isActive={view === 'picking'}
          onClick={() => onChange('picking')}
          badge={pendingCount > 0 ? pendingCount : null}
        />
        <NavButton
          icon={<IconSettings className="h-5 w-5" />}
          isActive={view === 'settings'}
          onClick={() => onChange('settings')}
        />
      </nav>

      <button
        onClick={handleReset}
        aria-label="New restock run"
        className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/30 active:bg-accent/90"
      >
        <IconReset className="h-6 w-6" />
      </button>
    </div>
  )
}

function NavButton({ icon, isActive, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full transition-colors ${
        isActive ? 'bg-white text-ink' : 'text-white/60'
      }`}
    >
      {icon}
      {badge != null && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white ring-2 ring-ink">
          {badge}
        </span>
      )}
    </button>
  )
}
