function gaugeColor(pct) {
  if (pct >= 100) return '#10b981'
  if (pct >= 50) return '#f3894d'
  return '#f1413a'
}

export default function ProductItem({ item, onIncrement, onDecrement, onFull, onEmpty }) {
  const missing = item.max - item.current
  const isComplete = missing <= 0
  const pct = item.max > 0 ? Math.min(100, Math.round((item.current / item.max) * 100)) : 0

  return (
    <div className="rounded-2xl bg-surface px-3 py-2.5 shadow-sm ring-1 ring-black/5">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-bold text-ink">{item.name}</span>
        <span className="flex-shrink-0 font-mono text-xs font-semibold text-muted">Max {item.max}</span>
      </div>

      <div className="mt-2 flex items-center gap-3">
        <button
          onClick={() => onDecrement(item.id)}
          disabled={item.current === 0}
          aria-label={`Restar ${item.name}`}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-page text-xl font-bold text-ink active:bg-track disabled:opacity-30"
        >
          −
        </button>

        <div className="flex-1 text-center font-display text-3xl font-extrabold tabular-nums text-ink">
          {item.current}
        </div>

        <button
          onClick={() => onIncrement(item.id)}
          disabled={item.current === item.max}
          aria-label={`Sumar ${item.name}`}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-accent text-xl font-bold text-white active:bg-accent/90 disabled:opacity-30"
        >
          +
        </button>
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <span
          className="flex-shrink-0 text-xs font-bold"
          style={{ color: isComplete ? '#10b981' : gaugeColor(pct) }}
        >
          {isComplete ? 'Completo' : `Faltan ${missing}`}
        </span>

        <div className="h-1 min-w-6 flex-1 overflow-hidden rounded-full bg-page">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${pct}%`, backgroundColor: gaugeColor(pct) }}
          />
        </div>

        <button
          onClick={() => onEmpty(item.id)}
          className="flex-shrink-0 text-xs font-semibold text-muted active:text-ink"
        >
          Vacío
        </button>
        <button
          onClick={() => onFull(item.id)}
          className="flex-shrink-0 text-xs font-semibold text-muted active:text-ink"
        >
          Lleno
        </button>
      </div>
    </div>
  )
}
