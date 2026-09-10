import { useRef, useState } from 'react'
import { scanZone } from '../lib/scan'

// Button that triggers the phone's native camera (capture="environment"),
// sends the photo off to be analyzed, and hands back results already matched
// to the zone's real products via onResults. It never touches real stock
// state itself, that's decided by whoever confirms in ScanReview.
export default function ScanCapture({ zoneName, products, onResults }) {
  const inputRef = useRef(null)
  const [status, setStatus] = useState('idle') // idle | loading | error
  const [error, setError] = useState(null)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setStatus('loading')
    setError(null)
    try {
      const results = await scanZone({ file, zoneName, products })
      setStatus('idle')
      onResults(results)
    } catch (err) {
      setStatus('error')
      setError(err.message || 'Could not analyze the photo')
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        className="hidden"
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={status === 'loading'}
        className="flex flex-shrink-0 items-center gap-1.5 rounded-xl bg-surface px-3 py-1.5 text-xs font-bold text-ink shadow-sm ring-1 ring-black/5 active:bg-track disabled:opacity-50"
      >
        {status === 'loading' ? 'Analyzing…' : '📷 Scan'}
      </button>
      {error && <p className="max-w-40 text-right text-[11px] font-semibold text-[#f1413a]">{error}</p>}
    </div>
  )
}
