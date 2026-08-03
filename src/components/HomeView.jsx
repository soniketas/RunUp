import { IconClipboard, IconGlass, IconPencil, IconZones } from './icons'
import { formatRelativeTime, freshnessLevel } from '../lib/time'
import { ZONE_SEGMENT_COLORS as SEGMENT_COLORS } from '../lib/zoneColors'

export default function HomeView({
  summary,
  stockBreakdown,
  missingByZone,
  runnerName,
  setRunnerName,
  lastUpdated,
  pendingCount,
  shortages,
  dismissShortage,
  onNavigate,
}) {
  const handleEditRunner = () => {
    const next = window.prompt('¿Quién está de turno?', runnerName || '')
    if (next !== null) setRunnerName(next)
  }

  const relative = formatRelativeTime(lastUpdated?.at)
  const freshness = freshnessLevel(lastUpdated?.at)
  const totalMissingUnits = missingByZone.reduce((sum, z) => sum + z.missing, 0)

  return (
    <div className="flex-1 overflow-y-auto px-5 pb-32 pt-[calc(env(safe-area-inset-top)+16px)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <IconGlass className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-bold text-ink">Bar Stock</span>
        </div>

        <button
          onClick={handleEditRunner}
          className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs font-bold text-ink shadow-sm ring-1 ring-black/5"
        >
          {runnerName || 'Asignar responsable'}
          <IconPencil className="h-3 w-3 text-muted" />
        </button>
      </div>

      <h1 className="mt-4 font-display text-[32px] font-extrabold leading-none tracking-tight text-ink" style={{ textWrap: 'balance' }}>
        Turno de hoy
      </h1>

      <div className="mt-4">
        <p className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wide text-muted">
          Última actualización
          <FreshnessDots level={freshness} />
        </p>
        <p className="mt-1 font-display text-xl font-bold text-ink">
          {lastUpdated ? relative : 'Sin registros aún'}
          {lastUpdated?.by && (
            <span className="ml-1.5 font-sans text-sm font-semibold text-muted">
              · por {lastUpdated.by}
            </span>
          )}
        </p>
      </div>

      <StockCard stockBreakdown={stockBreakdown} />
      <ZoneDonutCard missingByZone={missingByZone} totalMissingUnits={totalMissingUnits} />
      {shortages.length > 0 && (
        <ShortagesCard shortages={shortages} onDismiss={dismissShortage} />
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          onClick={() => onNavigate('zones')}
          className="flex items-center justify-between rounded-2xl bg-ink px-4 py-3.5 active:bg-ink/90"
        >
          <span className="font-display text-sm font-bold text-white">Ver zonas</span>
          <IconZones className="h-4 w-4 text-white/70" />
        </button>
        <button
          onClick={() => onNavigate('picking')}
          className="flex items-center justify-between rounded-2xl bg-surface px-4 py-3.5 shadow-sm ring-1 ring-black/5 active:bg-page"
        >
          <span className="font-display text-sm font-bold text-ink">Lista de carga</span>
          {pendingCount > 0 ? (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-white">
              {pendingCount}
            </span>
          ) : (
            <IconClipboard className="h-4 w-4 text-muted" />
          )}
        </button>
      </div>

      <p className="mt-4 text-center text-xs text-muted">
        {summary.complete}/{summary.total} productos completos en todas las zonas
      </p>
    </div>
  )
}

function FreshnessDots({ level }) {
  const order = ['fresh', 'stale', 'old']
  const colors = { fresh: '#10b981', stale: '#f3894d', old: '#9a9184' }
  return (
    <span className="ml-0.5 inline-flex items-center gap-1">
      {order.map((lvl) => (
        <span
          key={lvl}
          className="h-1.5 w-1.5 rounded-full"
          style={{
            backgroundColor: level === lvl ? colors[lvl] : 'transparent',
            border: level === lvl ? 'none' : '1.5px solid var(--color-track)',
          }}
        />
      ))}
    </span>
  )
}

function StockCard({ stockBreakdown }) {
  const categories = [
    { key: 'empty', label: 'Vacío', count: stockBreakdown.empty, style: patternDots },
    { key: 'low', label: 'Bajo', count: stockBreakdown.low, style: patternStripes },
    { key: 'complete', label: 'Completo', count: stockBreakdown.complete, style: patternSolid },
  ]
  const maxCount = Math.max(stockBreakdown.complete, stockBreakdown.low, stockBreakdown.empty, 1)
  const rowHeight = 120
  const maxBarHeight = 88

  return (
    <div className="mt-4 rounded-3xl bg-block-yellow p-4">
      <p className="font-mono text-[11px] font-bold uppercase tracking-wide text-ink/60">
        Estado del stock
      </p>

      <div className="mt-3 flex items-end gap-3" style={{ height: rowHeight }}>
        {categories.map((cat) => {
          const barHeight = Math.max(6, Math.round((cat.count / maxCount) * maxBarHeight))
          return (
            <div
              key={cat.key}
              className="flex flex-1 flex-col items-center justify-end gap-1.5"
              style={{ height: rowHeight }}
            >
              <span className="font-display text-lg font-extrabold text-ink">{cat.count}</span>
              <div className="w-full rounded-t-lg" style={{ height: barHeight, ...cat.style }} />
            </div>
          )
        })}
      </div>

      <div className="mt-2 flex gap-3">
        {categories.map((cat) => (
          <span
            key={cat.key}
            className="flex-1 text-center font-mono text-[10px] font-bold uppercase tracking-wide text-ink/60"
          >
            {cat.label}
          </span>
        ))}
      </div>
    </div>
  )
}

function ZoneDonutCard({ missingByZone, totalMissingUnits }) {
  if (missingByZone.length === 0) {
    return (
      <div className="mt-4 flex items-center gap-3 rounded-3xl bg-block-orange p-4">
        <span className="font-display text-2xl font-extrabold text-ink">0</span>
        <span className="font-mono text-[11px] font-bold uppercase tracking-wide text-ink/70">
          Nada por reponer — todas las zonas al máximo
        </span>
      </div>
    )
  }

  let cursor = 0
  const stops = missingByZone.map((zone, i) => {
    const pct = (zone.missing / totalMissingUnits) * 100
    const start = cursor
    cursor += pct
    return `${SEGMENT_COLORS[i % SEGMENT_COLORS.length]} ${start}% ${cursor}%`
  })
  const gradient = `conic-gradient(${stops.join(', ')})`

  return (
    <div className="mt-4 rounded-3xl bg-block-orange p-4">
      <p className="font-mono text-[11px] font-bold uppercase tracking-wide text-ink/70">
        Por reponer, por zona
      </p>

      <div className="mt-3 flex items-center gap-4">
        <div className="relative h-24 w-24 flex-shrink-0">
          <div className="h-24 w-24 rounded-full" style={{ background: gradient }} />
          <div className="absolute inset-2.5 rounded-full bg-block-orange" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-full bg-block-yellow px-2.5 py-1">
              <span className="font-display text-base font-extrabold text-ink">
                {totalMissingUnits}
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-1.5">
          {missingByZone.map((zone, i) => (
            <div key={zone.zoneId} className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 flex-shrink-0 rounded-full ring-1 ring-ink/20"
                style={{ backgroundColor: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }}
              />
              <span className="flex-1 truncate text-xs font-semibold text-ink">
                {zone.zoneIcon} {zone.zoneName}
              </span>
              <span className="flex-shrink-0 font-mono text-xs font-bold text-ink/70">
                {zone.missing}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ShortagesCard({ shortages, onDismiss }) {
  return (
    <div className="mt-4 rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-black/5">
      <p className="font-mono text-[11px] font-bold uppercase tracking-wide text-accent">
        Quiebres de depósito · {shortages.length}
      </p>
      <p className="mt-0.5 text-xs text-muted">No se pudo reponer todo lo que faltaba en estas cargas.</p>

      <div className="mt-3 space-y-2">
        {shortages.map((s) => (
          <div key={s.id} className="flex items-center gap-2 rounded-2xl bg-accent-soft px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-ink">{s.name}</p>
              <p className="mt-0.5 font-mono text-[11px] font-semibold text-accent">
                Llegaron {s.brought} de {s.requested} · {formatRelativeTime(s.at)}
                {s.by && ` · ${s.by}`}
              </p>
            </div>
            <button
              onClick={() => onDismiss(s.id)}
              aria-label={`Descartar aviso de ${s.name}`}
              className="flex-shrink-0 rounded-full px-2 py-1 text-xs font-bold text-accent active:bg-white/40"
            >
              OK
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

const patternSolid = { backgroundColor: 'var(--color-ink)' }
const patternStripes = {
  backgroundColor: 'rgba(24,22,17,0.22)',
  backgroundImage:
    'repeating-linear-gradient(135deg, rgba(24,22,17,0.9) 0px, rgba(24,22,17,0.9) 3px, transparent 3px, transparent 7px)',
}
const patternDots = {
  backgroundColor: 'rgba(24,22,17,0.12)',
  backgroundImage: 'radial-gradient(rgba(24,22,17,0.85) 1.4px, transparent 1.4px)',
  backgroundSize: '8px 8px',
}
