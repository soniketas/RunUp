import { IconClipboard, IconGlass } from './icons'

export default function Header({ title, subtitle, pendingCount, summary, tone = 'yellow' }) {
  const pct = summary && summary.total > 0 ? Math.round((summary.complete / summary.total) * 100) : 0
  const isGreen = tone === 'green'
  const toneClass = isGreen ? 'bg-accent' : 'bg-block-yellow'
  const textClass = isGreen ? 'text-white' : 'text-ink'
  const mutedTextClass = isGreen ? 'text-white/70' : 'text-ink/60'

  return (
    <header className={`rounded-b-[28px] ${toneClass} px-5 pt-[calc(env(safe-area-inset-top)+16px)] pb-5`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <IconGlass className={`h-4 w-4 ${textClass}`} />
          <span className={`text-[13px] font-bold ${textClass}`}>{title}</span>
          <span className={`text-[13px] ${mutedTextClass}`}>· {subtitle}</span>
        </div>

        <div className="flex items-center gap-1 rounded-full bg-surface px-2.5 py-1.5 font-mono text-xs font-bold text-ink">
          <IconClipboard className="h-3.5 w-3.5 text-accent" />
          {pendingCount}
        </div>
      </div>

      {summary && (
        <div className="mt-4">
          <div className="flex items-end justify-between gap-3">
            {summary.missing > 0 ? (
              <p className={`font-display text-[28px] font-extrabold leading-none tracking-tight ${textClass}`}>
                {summary.missing}
                <span className={`ml-1.5 font-sans text-[15px] font-bold ${mutedTextClass}`}>to restock</span>
              </p>
            ) : (
              <p className={`font-display text-[28px] font-extrabold leading-none tracking-tight ${isGreen ? 'text-white' : 'text-emerald-700'}`}>
                All set
              </p>
            )}
            <p className={`pb-1 font-mono text-xs font-semibold ${mutedTextClass}`}>
              {summary.complete}/{summary.total} complete
            </p>
          </div>

          <div className={`mt-2.5 h-1.5 w-full overflow-hidden rounded-full ${isGreen ? 'bg-white/20' : 'bg-ink/15'}`}>
            <div
              className={`h-full rounded-full transition-all duration-500 ${isGreen ? 'bg-white' : 'bg-ink'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
    </header>
  )
}
