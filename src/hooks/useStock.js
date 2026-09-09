import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  deleteField,
  doc,
  getDoc,
  increment as fbIncrement,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { INITIAL_ITEMS, ZONES, makeId } from '../data/initialData'
import { BAR_ID, db } from '../lib/firebase'

const barRef = doc(db, 'bars', BAR_ID)

// Firestore guarda `items` como mapa ({ [itemId]: {...} }), no array, para
// poder hacer increments atómicos sobre el `current` de un item puntual
// (updateDoc(ref, { [`items.${id}.current`]: increment(1) })) sin tocar el
// resto del documento ni usar una transacción. Se convierte a array acá, en
// el borde del hook, así el resto de la app sigue viendo lo mismo que antes.
function itemsMapFromArray(items) {
  return Object.fromEntries(
    items.map(({ id, ...rest }) => [id, rest]),
  )
}

function itemsArrayFromMap(map) {
  return Object.entries(map || {}).map(([id, item]) => ({ id, ...item }))
}

function stamp(by) {
  return { at: Date.now(), by: by ?? null }
}

export function useStock() {
  const [zones, setZones] = useState(ZONES)
  const [items, setItems] = useState(INITIAL_ITEMS)
  const [pickQty, setPickQty] = useState({})
  const [runnerName, setRunnerNameState] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [shortages, setShortages] = useState([])

  // Firestore es la única fuente de verdad, en tiempo real (onSnapshot), no
  // localStorage. Cada mutación de más abajo escribe al documento y deja que
  // este mismo listener actualice el estado local — tanto para los cambios
  // propios como los que llegan de otro dispositivo — para no tener dos
  // fuentes de verdad compitiendo.
  useEffect(() => {
    let cancelled = false
    let unsubscribe = () => {}

    ;(async () => {
      const snap = await getDoc(barRef)
      if (!snap.exists()) {
        await setDoc(barRef, {
          zones: ZONES,
          items: itemsMapFromArray(INITIAL_ITEMS),
          pickQty: {},
          runnerName: '',
          lastUpdated: null,
          shortages: [],
        })
      }
      if (cancelled) return

      unsubscribe = onSnapshot(barRef, (docSnap) => {
        const data = docSnap.data()
        if (!data) return
        setZones(Array.isArray(data.zones) ? data.zones : ZONES)
        setItems(itemsArrayFromMap(data.items))
        setPickQty(data.pickQty || {})
        setRunnerNameState(data.runnerName || '')
        setLastUpdated(data.lastUpdated || null)
        setShortages(Array.isArray(data.shortages) ? data.shortages : [])
      })
    })()

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  const setRunnerName = useCallback((name) => {
    const trimmed = name.trim()
    updateDoc(barRef, { runnerName: trimmed })
  }, [])

  // Operaciones frecuentes sobre `current`: increment atómico de Firestore,
  // calculado a partir del delta deseado. `setFull`/`setEmpty` no son un
  // incremento fijo, así que el delta se calcula contra el `current` que ya
  // tenemos en el estado local (llega del propio onSnapshot).
  const applyDelta = useCallback(
    (id, delta) => {
      updateDoc(barRef, {
        [`items.${id}.current`]: fbIncrement(delta),
        lastUpdated: stamp(runnerName),
      })
    },
    [runnerName],
  )

  const increment = useCallback((id) => applyDelta(id, 1), [applyDelta])
  const decrement = useCallback((id) => applyDelta(id, -1), [applyDelta])

  const setFull = useCallback(
    (id) => {
      const item = items.find((i) => i.id === id)
      if (!item) return
      applyDelta(id, item.max - item.current)
    },
    [items, applyDelta],
  )

  const setEmptyItem = useCallback(
    (id) => {
      const item = items.find((i) => i.id === id)
      if (!item) return
      applyDelta(id, -item.current)
    },
    [items, applyDelta],
  )

  // Tocar el check = "voy a traer todo lo que falta". Vuelve a tocar para desmarcar.
  const toggleChecked = useCallback(
    (itemId, missingAmount) => {
      const current = pickQty[itemId]
      updateDoc(barRef, {
        [`pickQty.${itemId}`]: current > 0 ? deleteField() : missingAmount,
      })
    },
    [pickQty],
  )

  // Ajustar manualmente cuánto se pudo conseguir (menos que lo que falta = quiebre de depósito).
  const setPickQuantity = useCallback((itemId, qty, missingAmount) => {
    const clamped = Math.max(0, Math.min(qty, missingAmount))
    updateDoc(barRef, {
      [`pickQty.${itemId}`]: clamped <= 0 ? deleteField() : clamped,
    })
  }, [])

  const finalizeChecked = useCallback(() => {
    // Nota: se calcula todo de forma síncrona a partir de `items`/`pickQty`
    // (closure, alimentados por el último snapshot). El resultado se escribe
    // en un solo updateDoc con overwrite de los campos afectados —
    // `items.<id>.current` puntuales, `pickQty` entero y `shortages`
    // entero — sin transacción. Con un solo runner por turno (caso normal
    // hoy) esto no genera problemas reales; si en el futuro hay varios
    // runners tocando la app al mismo tiempo, esto debería reforzarse con
    // una transacción real.
    const newShortages = []
    const updates = {}

    for (const item of items) {
      const qty = pickQty[item.id]
      if (!(qty > 0)) continue
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
      updates[`items.${item.id}.current`] = item.current + applied
    }

    updates.pickQty = {}
    if (newShortages.length > 0) {
      updates.shortages = [...newShortages, ...shortages].slice(0, 30)
    }
    updates.lastUpdated = stamp(runnerName)

    updateDoc(barRef, updates)
  }, [items, pickQty, shortages, runnerName])

  // "Iniciar nueva reposición" no debe descartar lo que ya se marcó en la
  // carga en curso: aplica esos pickQty igual que "Finalizar carga" (sube el
  // stock de lo confirmado y registra quiebre en lo que haya quedado corto)
  // y recién ahí arranca una selección de picking vacía para la próxima
  // ronda. Lo que nunca se marcó queda con su faltante real, no se fuerza a
  // "lleno".
  const reset = useCallback(() => {
    finalizeChecked()
  }, [finalizeChecked])

  const dismissShortage = useCallback(
    (shortageId) => {
      updateDoc(barRef, { shortages: shortages.filter((s) => s.id !== shortageId) })
    },
    [shortages],
  )

  // Aplica los conteos confirmados de un escaneo por IA (foto de la zona) al
  // stock real. `counts` es { [itemId]: cantidadConfirmada } — ya pasó por la
  // revisión manual del runner en ScanReview, así que se aplica directo,
  // igual que setFull/setEmpty (overwrite de los `current` afectados, sin
  // transacción — misma nota que en finalizeChecked).
  const applyScanCounts = useCallback(
    (zoneId, counts) => {
      const updates = {}
      for (const item of items) {
        if (item.zoneId !== zoneId || !(item.id in counts)) continue
        updates[`items.${item.id}.current`] = Math.min(
          item.max,
          Math.max(0, Math.round(counts[item.id])),
        )
      }
      updates.lastUpdated = stamp(runnerName)
      updateDoc(barRef, updates)
    },
    [items, runnerName],
  )

  // --- Configuración: zonas y catálogo de productos ---
  // `zones` cambia con tan poca frecuencia que se sobrescribe entero.

  const addZone = useCallback(
    ({ name, subtitle, icon }) => {
      const id = makeId('zone')
      const nextZones = [
        ...zones,
        { id, name: name.trim(), subtitle: (subtitle || '').trim(), icon: (icon || '📦').trim() },
      ]
      updateDoc(barRef, { zones: nextZones, lastUpdated: stamp(runnerName) })
    },
    [zones, runnerName],
  )

  const updateZone = useCallback(
    (zoneId, patch) => {
      const nextZones = zones.map((zone) => (zone.id === zoneId ? { ...zone, ...patch } : zone))
      updateDoc(barRef, { zones: nextZones })
    },
    [zones],
  )

  const removeZone = useCallback(
    (zoneId) => {
      const nextZones = zones.filter((zone) => zone.id !== zoneId)
      const updates = { zones: nextZones }
      for (const item of items) {
        if (item.zoneId === zoneId) updates[`items.${item.id}`] = deleteField()
      }
      updateDoc(barRef, updates)
    },
    [zones, items],
  )

  const addProduct = useCallback(
    (zoneId, { name, max }) => {
      const id = makeId('item')
      const maxNum = Math.max(1, Math.round(Number(max)) || 1)
      updateDoc(barRef, {
        [`items.${id}`]: { zoneId, name: name.trim(), max: maxNum, current: maxNum },
        lastUpdated: stamp(runnerName),
      })
    },
    [runnerName],
  )

  const updateProduct = useCallback(
    (itemId, patch) => {
      const item = items.find((i) => i.id === itemId)
      if (!item) return
      const next = { ...item, ...patch }
      if (patch.max != null) next.current = Math.min(next.current, next.max)
      const { id: _id, ...rest } = next
      updateDoc(barRef, { [`items.${itemId}`]: rest })
    },
    [items],
  )

  const removeProduct = useCallback((itemId) => {
    updateDoc(barRef, { [`items.${itemId}`]: deleteField() })
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
    applyScanCounts,
    addZone,
    updateZone,
    removeZone,
    addProduct,
    updateProduct,
    removeProduct,
  }
}
