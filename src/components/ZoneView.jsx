import { useState } from 'react'
import ZoneTabs from './ZoneTabs'
import ProductItem from './ProductItem'

export default function ZoneView({ zones, itemsByZone, increment, decrement, setFull, setEmpty }) {
  const [activeZoneId, setActiveZoneId] = useState(zones[0]?.id)
  const activeZone = zones.find((z) => z.id === activeZoneId)
  const items = itemsByZone.get(activeZoneId) ?? []

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ZoneTabs zones={zones} activeZoneId={activeZoneId} onSelect={setActiveZoneId} />

      {activeZone && (
        <p className="px-5 pb-1 text-xs text-muted">{activeZone.subtitle}</p>
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
    </div>
  )
}
