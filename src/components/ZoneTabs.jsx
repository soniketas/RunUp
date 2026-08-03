import { ZONE_SEGMENT_COLORS } from '../lib/zoneColors'

export default function ZoneTabs({ zones, activeZoneId, onSelect }) {
  return (
    <div className="flex gap-1 overflow-x-auto px-5 pb-2 pt-1">
      {zones.map((zone, i) => {
        const isActive = zone.id === activeZoneId
        return (
          <button
            key={zone.id}
            onClick={() => onSelect(zone.id)}
            className={`flex flex-shrink-0 min-h-11 items-center rounded-full px-4 text-sm font-semibold transition-all ${
              isActive
                ? 'bg-surface text-ink shadow-sm ring-1 ring-black/5'
                : 'text-muted'
            }`}
          >
            {isActive && (
              <span
                className="mr-1.5 h-2 w-2 flex-shrink-0 rounded-full ring-1 ring-ink/20"
                style={{ backgroundColor: ZONE_SEGMENT_COLORS[i % ZONE_SEGMENT_COLORS.length] }}
              />
            )}
            <span className="mr-1.5">{zone.icon}</span>
            {zone.name}
          </button>
        )
      })}
    </div>
  )
}
