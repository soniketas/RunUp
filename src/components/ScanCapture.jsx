import { useRef, useState } from 'react'
import { scanZone } from '../lib/scan'

// Botón que dispara la cámara nativa del teléfono (capture="environment"),
// manda la foto a analizar, y entrega los resultados ya emparejados con los
// productos de la zona vía onResults. No toca el estado real de stock —
// eso lo decide quien confirma en ScanReview.
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
      setError(err.message || 'No se pudo analizar la foto')
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
        {status === 'loading' ? 'Analizando…' : '📷 Escanear'}
      </button>
      {error && <p className="max-w-40 text-right text-[11px] font-semibold text-[#f1413a]">{error}</p>}
    </div>
  )
}
