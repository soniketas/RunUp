import { useEffect, useState } from 'react'
import { IconCheck } from './icons'
import { ZONE_SEGMENT_COLORS } from '../lib/zoneColors'

export default function PickingView({ pickingByZone, toggleChecked, setPickQuantity, onFinalize }) {
  const totalItems = pickingByZone.reduce((sum, g) => sum + g.items.length, 0)

  if (totalItems === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-32 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface shadow-sm ring-1 ring-black/5">
          <IconCheck className="h-7 w-7 text-emerald-500" />
        </div>
        <p className="mt-4 text-lg font-bold text-ink">All done</p>
        <p className="mt-1 text-sm text-muted">Nothing left to restock in any zone.</p>
      </div>
    )
  }

  const checkedCount = pickingByZone.reduce(
    (sum, g) => sum + g.items.filter((item) => item.pickQty > 0).length,
    0,
  )
  const shortfallCount = pickingByZone.reduce(
    (sum, g) => sum + g.items.filter((item) => item.pickQty > 0 && item.pickQty < item.missing).length,
    0,
  )

  const handleFinalize = () => {
    const msg =
      shortfallCount > 0
        ? `You're about to update ${checkedCount} products. ${shortfallCount} of them will stay incomplete because the deposit didn't have enough, and will be logged as a shortage. Confirm?`
        : `Did you already restock these ${checkedCount} products in their fridges? They'll be marked complete.`
    if (window.confirm(msg)) onFinalize()
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div className={`flex-1 space-y-4 overflow-y-auto px-5 pt-3 ${checkedCount > 0 ? 'pb-40' : 'pb-32'}`}>
        <p className="text-xs text-muted">
          Organized by fridge. Check off each product, and if the deposit doesn't have everything, adjust the
          quantity you actually got.
        </p>

        {pickingByZone.map((group, i) => {
          const pendingInZone = group.items.filter((item) => !(item.pickQty > 0)).length
          return (
            <div key={group.zoneId}>
              <div className="flex items-center gap-1.5 pb-1.5">
                <span
                  className="h-2.5 w-2.5 flex-shrink-0 rounded-full ring-1 ring-ink/20"
                  style={{ backgroundColor: ZONE_SEGMENT_COLORS[i % ZONE_SEGMENT_COLORS.length] }}
                />
                <span className="text-sm">{group.zoneIcon}</span>
                <span className="font-mono text-[11px] font-bold uppercase tracking-wide text-muted">
                  {group.zoneName}
                </span>
                {pendingInZone > 0 && (
                  <span className="font-mono text-[11px] font-semibold text-accent">
                    · {pendingInZone} left to bring
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {group.items.map((item) => (
                  <PickingRow
                    key={item.id}
                    item={item}
                    onToggle={() => toggleChecked(item.id, item.missing)}
                    onQtyChange={(qty) => setPickQuantity(item.id, qty, item.missing)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {checkedCount > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+96px)] z-10 px-5">
          <button
            onClick={handleFinalize}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-block-orange py-3.5 text-sm font-bold text-ink shadow-lg shadow-black/10 active:bg-block-orange/90"
          >
            <IconCheck className="h-4 w-4 text-ink" />
            Finish run · update {checkedCount} {checkedCount === 1 ? 'product' : 'products'}
            {shortfallCount > 0 && ` (${shortfallCount} incomplete)`}
          </button>
        </div>
      )}
    </div>
  )
}

function PickingRow({ item, onToggle, onQtyChange }) {
  const isChecked = item.pickQty > 0
  const isShort = isChecked && item.pickQty < item.missing

  // Local state for the input's text: clearing the field to retype it passes
  // through "" — that's not confirmed as a real quantity (we don't want it to
  // uncheck the product or make the input disappear mid-edit), but every
  // valid value IS confirmed instantly (not only on blur): if the user types
  // "10" and taps "Finish run" without the input losing focus first (typical
  // on mobile with the virtual keyboard), the run still needs to reflect the
  // number already typed.
  const [draft, setDraft] = useState(String(item.pickQty))

  useEffect(() => {
    setDraft(String(item.pickQty))
  }, [item.pickQty])

  const handleChange = (e) => {
    const raw = e.target.value
    setDraft(raw)
    const n = Number(raw)
    if (raw !== '' && Number.isFinite(n) && n > 0) {
      onQtyChange(n)
    }
  }

  const handleBlur = () => {
    const n = Number(draft)
    if (!(Number.isFinite(n) && n > 0)) {
      setDraft(String(item.pickQty))
    }
  }

  return (
    <div
      className={`flex items-center gap-2.5 rounded-2xl p-3 shadow-sm ring-1 transition-colors ${
        isShort
          ? 'bg-accent-soft ring-accent/30'
          : isChecked
            ? 'bg-page opacity-70 ring-black/5'
            : 'bg-surface ring-black/5'
      }`}
    >
      <button
        onClick={onToggle}
        aria-label={isChecked ? `Uncheck ${item.name}` : `Check ${item.name}`}
        className="flex flex-1 items-center gap-2.5 text-left"
      >
        <span
          className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg border-2 ${
            isChecked ? 'border-accent bg-accent text-white' : 'border-track text-transparent'
          }`}
        >
          <IconCheck className="h-3.5 w-3.5" />
        </span>
        <span className="flex-1">
          <span
            className={`block text-sm font-bold ${
              isChecked && !isShort ? 'text-muted line-through' : 'text-ink'
            }`}
          >
            {item.name}
          </span>
          {isShort && (
            <span className="mt-0.5 block font-mono text-[10px] font-bold uppercase tracking-wide text-accent">
              Deposit shortage
            </span>
          )}
        </span>
      </button>

      {isChecked ? (
        <div className="flex flex-shrink-0 items-center gap-1">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={item.missing}
            value={draft}
            onChange={handleChange}
            onFocus={(e) => e.target.select()}
            onBlur={handleBlur}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            className="w-12 rounded-lg bg-surface px-1 py-1 text-center font-mono text-sm font-bold text-ink outline-none ring-1 ring-transparent focus:ring-accent"
          />
          <span className="font-mono text-xs font-semibold text-muted">/ {item.missing}</span>
        </div>
      ) : (
        <span className="flex-shrink-0 font-mono text-xs font-semibold text-muted">{item.missing} missing</span>
      )}
    </div>
  )
}
