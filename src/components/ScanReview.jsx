import { useState } from 'react'

// Post-scan review screen: never applies the AI's count directly to stock.
// The runner sees what was detected, adjusts it if needed (occlusion,
// miscounts, etc.), and only then confirms.
export default function ScanReview({ zoneName, results, onConfirm, onCancel }) {
  const [counts, setCounts] = useState(() => Object.fromEntries(results.map((r) => [r.itemId, r.detected])))

  const adjust = (itemId, delta) => {
    setCounts((prev) => ({ ...prev, [itemId]: Math.max(0, (prev[itemId] ?? 0) + delta) }))
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-page">
      <div className="flex items-center justify-between px-5 pt-5">
        <div>
          <h2 className="font-display text-lg font-extrabold text-ink">Review count</h2>
          <p className="text-xs text-muted">{zoneName}</p>
        </div>
        <button onClick={onCancel} className="text-sm font-semibold text-muted active:text-ink">
          Cancel
        </button>
      </div>

      <p className="px-5 py-2 text-xs text-muted">
        This is what the AI detected in the photo. Adjust anything that needs it before confirming, nothing is
        saved yet.
      </p>

      <div className="flex-1 space-y-2 overflow-y-auto px-5 pb-4">
        {results.length === 0 && (
          <p className="pt-6 text-center text-sm text-muted">No known product was detected in the photo.</p>
        )}
        {results.map((r) => (
          <div
            key={r.itemId}
            className="flex items-center justify-between rounded-2xl bg-surface px-3 py-2.5 shadow-sm ring-1 ring-black/5"
          >
            <span className="truncate text-sm font-bold text-ink">{r.name}</span>
            <div className="flex flex-shrink-0 items-center gap-3">
              <button
                onClick={() => adjust(r.itemId, -1)}
                aria-label={`Decrease ${r.name}`}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-page text-lg font-bold text-ink active:bg-track"
              >
                −
              </button>
              <span className="w-6 text-center font-display text-xl font-extrabold tabular-nums text-ink">
                {counts[r.itemId]}
              </span>
              <button
                onClick={() => adjust(r.itemId, 1)}
                aria-label={`Increase ${r.name}`}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-lg font-bold text-white active:bg-accent/90"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="px-5 pb-6 pt-2">
        <button
          onClick={() => onConfirm(counts)}
          disabled={results.length === 0}
          className="w-full rounded-2xl bg-accent py-3.5 text-center font-display text-base font-extrabold text-white active:bg-accent/90 disabled:opacity-40"
        >
          Confirm and update stock
        </button>
      </div>
    </div>
  )
}
