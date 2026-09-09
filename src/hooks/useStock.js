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

// Firestore stores `items` as a map ({ [itemId]: {...} }), not an array, so
// that a single item's `current` can get an atomic increment
// (updateDoc(ref, { [`items.${id}.current`]: increment(1) })) without
// touching the rest of the document or using a transaction. It's converted
// to an array here, at the hook boundary, so the rest of the app keeps
// seeing the same shape as before.
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

  // Firestore is the single source of truth, live (onSnapshot), not
  // localStorage. Every mutation below writes to the document and lets this
  // same listener update local state, both for our own changes and ones
  // arriving from another device, so there aren't two competing sources of
  // truth.
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

  // Frequent operations on `current`: Firestore's atomic increment, computed
  // from the desired delta. `setFull`/`setEmpty` aren't a fixed increment, so
  // the delta is computed against the `current` we already have in local
  // state (which comes from onSnapshot itself).
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

  // Toggling the check on = "I'll bring everything that's missing." Toggle again to uncheck.
  const toggleChecked = useCallback(
    (itemId, missingAmount) => {
      const current = pickQty[itemId]
      updateDoc(barRef, {
        [`pickQty.${itemId}`]: current > 0 ? deleteField() : missingAmount,
      })
    },
    [pickQty],
  )

  // Manually adjust how much could actually be gathered (less than what's missing = deposit shortage).
  const setPickQuantity = useCallback((itemId, qty, missingAmount) => {
    const clamped = Math.max(0, Math.min(qty, missingAmount))
    updateDoc(barRef, {
      [`pickQty.${itemId}`]: clamped <= 0 ? deleteField() : clamped,
    })
  }, [])

  const finalizeChecked = useCallback(() => {
    // Note: everything is computed synchronously from `items`/`pickQty`
    // (closure, fed by the last snapshot). The result is written in a single
    // updateDoc that overwrites just the affected fields, individual
    // `items.<id>.current` paths, the whole `pickQty`, and the whole
    // `shortages`, without a transaction. With one runner per shift (today's
    // normal case) this causes no real problems; if multiple runners ever
    // use the app at the same time, this should be hardened with a real
    // transaction.
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

  // "Start new restock run" must not discard what's already checked in the
  // current run: it applies that pickQty the same way "Finish run" does
  // (raises confirmed stock and logs a shortage for anything that came up
  // short), and only then starts an empty picking selection for the next
  // round. Anything never checked keeps its real shortfall, it's not forced
  // to "full".
  const reset = useCallback(() => {
    finalizeChecked()
  }, [finalizeChecked])

  const dismissShortage = useCallback(
    (shortageId) => {
      updateDoc(barRef, { shortages: shortages.filter((s) => s.id !== shortageId) })
    },
    [shortages],
  )

  // Applies the confirmed counts from an AI scan (zone photo) to real stock.
  // `counts` is { [itemId]: confirmedQuantity }, already passed through the
  // runner's manual review in ScanReview, so it's applied directly, the same
  // way setFull/setEmpty are (overwrite of the affected `current` fields, no
  // transaction, same note as in finalizeChecked).
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

  // --- Settings: zones and product catalog ---
  // `zones` changes so infrequently that it's just overwritten wholesale.

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
