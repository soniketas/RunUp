import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  INITIAL_ITEMS,
  STORAGE_KEY_CHECKED,
  STORAGE_KEY_ITEMS,
  STORAGE_KEY_LAST_UPDATED,
  STORAGE_KEY_RUNNER,
  STORAGE_KEY_SHORTAGES,
  STORAGE_KEY_ZONES,
  ZONES,
  makeId,
} from '../data/initialData'

function loadItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ITEMS)
    if (!raw) return INITIAL_ITEMS
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return INITIAL_ITEMS
    return parsed
  } catch {
    return INITIAL_ITEMS
  }
}

function loadZones() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ZONES)
    if (!raw) return ZONES
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return ZONES
    return parsed
  } catch {
    return ZONES
  }
}

// Cuánto de cada producto se confirmó juntar en el depósito para esta carga.
// Objeto { [itemId]: cantidad }. Puede ser menor a lo que falta si el
// depósito no tiene stock suficiente (reposición parcial).
function loadPickQty() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CHECKED)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      // formato viejo: array de ids marcados como "traído completo"
      return Object.fromEntries(parsed.map((id) => [id, Infinity]))
    }
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function loadLastUpdated() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LAST_UPDATED)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function loadShortages() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SHORTAGES)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function useStock() {
  const [zones, setZones] = useState(loadZones)
  const [items, setItems] = useState(loadItems)
  const [pickQty, setPickQty] = useState(loadPickQty)
  const [runnerName, setRunnerNameState] = useState(
    () => localStorage.getItem(STORAGE_KEY_RUNNER) || '',
  )
  const [lastUpdated, setLastUpdated] = useState(loadLastUpdated)
  const [shortages, setShortages] = useState(loadShortages)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ZONES, JSON.stringify(zones))
  }, [zones])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items))
  }, [items])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CHECKED, JSON.stringify(pickQty))
  }, [pickQty])

  useEffect(() => {
    if (lastUpdated) localStorage.setItem(STORAGE_KEY_LAST_UPDATED, JSON.stringify(lastUpdated))
  }, [lastUpdated])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SHORTAGES, JSON.stringify(shortages))
  }, [shortages])

  const setRunnerName = useCallback((name) => {
    const trimmed = name.trim()
    setRunnerNameState(trimmed)
    localStorage.setItem(STORAGE_KEY_RUNNER, trimmed)
  }, [])

  const touchUpdated = useCallback((by) => {
    setLastUpdated({ at: Date.now(), by: by ?? null })
  }, [])

  const updateItem = useCallback(
    (id, updater) => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item
          const nextCurrent = updater(item)
          return { ...item, current: Math.min(item.max, Math.max(0, nextCurrent)) }
        }),
      )
      touchUpdated(runnerName || null)
    },
    [touchUpdated, runnerName],
  )

  const increment = useCallback((id) => updateItem(id, (item) => item.current + 1), [updateItem])
  const decrement = useCallback((id) => updateItem(id, (item) => item.current - 1), [updateItem])
  const setFull = useCallback((id) => updateItem(id, (item) => item.max), [updateItem])
  const setEmptyItem = useCallback((id) => updateItem(id, () => 0), [updateItem])

  // Tocar el check = "voy a traer todo lo que falta". Vuelve a tocar para desmarcar.
  const toggleChecked = useCallback((itemId, missingAmount) => {
    setPickQty((prev) => {
      if (prev[itemId] > 0) {
        const { [itemId]: _drop, ...rest } = prev
        return rest
      }
      return { ...prev, [itemId]: missingAmount }
    })
  }, [])

  // Ajustar manualmente cuánto se pudo conseguir (menos que lo que falta = quiebre de depósito).
  const setPickQuantity = useCallback((itemId, qty, missingAmount) => {
    const clamped = Math.max(0, Math.min(qty, missingAmount))
    setPickQty((prev) => {
      if (clamped <= 0) {
        const { [itemId]: _drop, ...rest } = prev
        return rest
      }
      return { ...prev, [itemId]: clamped }
    })
  }, [])

  const finalizeChecked = useCallback(() => {
    // Nota: se calcula todo de forma síncrona a partir de `items` (closure),
    // en vez de usar la forma funcional de setItems — el updater de setState
    // se invoca en el re-render, no en el momento de la llamada, así que un
    // side-effect (armar newShortages) adentro de ese updater se pierde.
    const newShortages = []
    const nextItems = items.map((item) => {
      const qty = pickQty[item.id]
      if (!(qty > 0)) return item
      const missingAtPick = item.max - item.current
      const applied = Math.min(qty, missingAtPick)
      if (applied < missingAtPick) {
        newShortages.push({
          id: makeId('short'),
          itemId: item.id,
          name: item.name,
          zoneId: item.zoneId,
          requested: missingAtPick,
          brought: applied,
          at: Date.now(),
          by: runnerName || null,
        })
      }
      return { ...item, current: item.current + applied }
    })

    setItems(nextItems)
    if (newShortages.length > 0) {
      setShortages((prev) => [...newShortages, ...prev].slice(0, 30))
    }

    setPickQty({})
    touchUpdated(runnerName || null)
  }, [items, pickQty, runnerName, touchUpdated])

  // "Iniciar nueva reposición" no debe descartar lo que ya se marcó en la
  // carga en curso: aplica esos pickQty igual que "Finalizar carga" (sube el
  // stock de lo confirmado y registra quiebre en lo que haya quedado corto)
  // y recién ahí arranca una selección de picking vacía para la próxima
  // ronda. Lo que nunca se marcó queda con su faltante real, no se fuerza a
  // "lleno".
  const reset = useCallback(() => {
    finalizeChecked()
  }, [finalizeChecked])

  const dismissShortage = useCallback((shortageId) => {
    setShortages((prev) => prev.filter((s) => s.id !== shortageId))
  }, [])

  // --- Configuración: zonas y catálogo de productos ---

  const addZone = useCallback(
    ({ name, subtitle, icon }) => {
      const id = makeId('zone')
      setZones((prev) => [
        ...prev,
        { id, name: name.trim(), subtitle: (subtitle || '').trim(), icon: (icon || '📦').trim() },
      ])
      touchUpdated(runnerName || null)
    },
    [touchUpdated, runnerName],
  )

  const updateZone = useCallback((zoneId, patch) => {
    setZones((prev) => prev.map((zone) => (zone.id === zoneId ? { ...zone, ...patch } : zone)))
  }, [])

  const removeZone = useCallback((zoneId) => {
    setZones((prev) => prev.filter((zone) => zone.id !== zoneId))
    setItems((prev) => prev.filter((item) => item.zoneId !== zoneId))
  }, [])

  const addProduct = useCallback(
    (zoneId, { name, max }) => {
      const id = makeId('item')
      const maxNum = Math.max(1, Math.round(Number(max)) || 1)
      setItems((prev) => [...prev, { id, zoneId, name: name.trim(), max: maxNum, current: maxNum }])
      touchUpdated(runnerName || null)
    },
    [touchUpdated, runnerName],
  )

  const updateProduct = useCallback((itemId, patch) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item
        const next = { ...item, ...patch }
        if (patch.max != null) next.current = Math.min(next.current, next.max)
        return next
      }),
    )
  }, [])

  const removeProduct = useCallback((itemId) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId))
  }, [])

  const itemsByZone = useMemo(() => {
    const map = new Map(zones.map((zone) => [zone.id, []]))
    for (const item of items) {
      if (!map.has(item.zoneId)) map.set(item.zoneId, [])
      map.get(item.zoneId).push(item)
    }
    return map
  }, [items, zones])

  const pickingByZone = useMemo(() => {
    const groups = []
    for (const zone of zones) {
      const zoneItems = (itemsByZone.get(zone.id) ?? []).filter((item) => item.current < item.max)
      if (zoneItems.length === 0) continue
      groups.push({
        zoneId: zone.id,
        zoneName: zone.name,
        zoneIcon: zone.icon,
        items: zoneItems.map((item) => ({
          id: item.id,
          name: item.name,
          max: item.max,
          missing: item.max - item.current,
          pickQty: Math.min(pickQty[item.id] || 0, item.max - item.current),
        })),
      })
    }
    return groups
  }, [itemsByZone, zones, pickQty])

  const pendingCount = pickingByZone.reduce(
    (sum, group) => sum + group.items.filter((item) => !(item.pickQty > 0)).length,
    0,
  )

  const summary = useMemo(() => {
    const total = items.length
    const complete = items.filter((item) => item.current >= item.max).length
    return { total, complete, missing: total - complete }
  }, [items])

  const stockBreakdown = useMemo(() => {
    let complete = 0
    let low = 0
    let empty = 0
    for (const item of items) {
      if (item.current >= item.max) complete += 1
      else if (item.current <= 0) empty += 1
      else low += 1
    }
    return { complete, low, empty, total: items.length }
  }, [items])

  const missingByZone = useMemo(() => {
    return zones
      .map((zone) => {
        const zoneItems = itemsByZone.get(zone.id) ?? []
        const missing = zoneItems.reduce((sum, item) => sum + Math.max(0, item.max - item.current), 0)
        return { zoneId: zone.id, zoneName: zone.name, zoneIcon: zone.icon, missing }
      })
      .filter((zone) => zone.missing > 0)
  }, [itemsByZone, zones])

  return {
    zones,
    items,
    itemsByZone,
    increment,
    decrement,
    setFull,
    setEmpty: setEmptyItem,
    reset,
    pickingByZone,
    toggleChecked,
    setPickQuantity,
    finalizeChecked,
    pendingCount,
    summary,
    stockBreakdown,
    missingByZone,
    runnerName,
    setRunnerName,
    lastUpdated,
    shortages,
    dismissShortage,
    addZone,
    updateZone,
    removeZone,
    addProduct,
    updateProduct,
    removeProduct,
  }
}
