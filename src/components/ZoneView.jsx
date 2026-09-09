import { useState } from 'react'
import ZoneTabs from './ZoneTabs'
import ProductItem from './ProductItem'
import ScanCapture from './ScanCapture'
import ScanReview from './ScanReview'

export default function ZoneView({
  zones,
  itemsByZone,
  increment,
  decrement,
  setFull,
  setEmpty,
  applyScanCounts,
}) {
  const [activeZoneId, setActiveZoneId] = useState(zones[0]?.id)
  const [scanResults, setScanResults] = useState(null)
  const activeZone = zones.find((z) => z.id === activeZoneId)
  const items = itemsByZone.get(activeZoneId) ?? []

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ZoneTabs zones={zones} activeZoneId={activeZoneId} onSelect={setActiveZoneId} />

      {activeZone && (
        <div className="flex items-start justify-between gap-2 px-5 pb-1">
          <p className="pt-1.5 text-xs text-muted">{activeZone.subtitle}</p>
          <ScanCapture zoneName={activeZone.name} products={items} onResults={setScanResults} />
        </div>
      )}

      <div className="flex-1 space-y-2 overflow-y-auto px-5 pb-32 pt-2">
        {items.map((item) => (
          <ProductItem
            key={item.id}
            item={item}
            onIncrement={increment}
            onDecrement={decrement}
            onFull={setFull}
            onEmpty={setEmpty}
          />
        ))}
      </div>

      {scanResults && activeZone && (
        <ScanReview
          zoneName={activeZone.name}
          results={scanResults}
          onCancel={() => setScanResults(null)}
          onConfirm={(counts) => {
            applyScanCounts(activeZoneId, counts)
            setScanResults(null)
          }}
        />
      )}
    </div>
  )
}
