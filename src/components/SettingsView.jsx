import { useState } from 'react'
import { IconPencil, IconPlus, IconSettings, IconTrash } from './icons'

// Nota: sin ancho aquí a propósito — Tailwind resuelve conflictos de utilidades
// por orden de la hoja de estilos, no por orden en className, así que el ancho
// (w-full / flex-1 / w-16) se define en cada input según su contexto.
const inputClass =
  'rounded-xl bg-page px-3 py-2 text-sm font-semibold text-ink outline-none ring-1 ring-transparent focus:ring-accent'

export default function SettingsView({
  zones,
  itemsByZone,
  addZone,
  updateZone,
  removeZone,
  addProduct,
  updateProduct,
  removeProduct,
}) {
  const [zoneForm, setZoneForm] = useState(null)
  const [productForm, setProductForm] = useState(null)

  const startEditZone = (zone) => {
    setProductForm(null)
    setZoneForm({ mode: 'edit', zoneId: zone.id, name: zone.name, subtitle: zone.subtitle, icon: zone.icon })
  }

  const startAddZone = () => {
    setProductForm(null)
    setZoneForm({ mode: 'new', name: '', subtitle: '', icon: '📦' })
  }

  const saveZoneForm = () => {
    if (!zoneForm.name.trim()) return
    if (zoneForm.mode === 'new') {
      addZone({ name: zoneForm.name, subtitle: zoneForm.subtitle, icon: zoneForm.icon })
    } else {
      updateZone(zoneForm.zoneId, {
        name: zoneForm.name.trim(),
        subtitle: zoneForm.subtitle.trim(),
        icon: (zoneForm.icon || '📦').trim(),
      })
    }
    setZoneForm(null)
  }

  const handleRemoveZone = (zone, productCount) => {
    const confirmMsg =
      productCount > 0
        ? `¿Eliminar "${zone.name}" y sus ${productCount} productos? Esta acción no se puede deshacer.`
        : `¿Eliminar "${zone.name}"?`
    if (window.confirm(confirmMsg)) removeZone(zone.id)
  }

  const startEditProduct = (zoneId, item) => {
    setZoneForm(null)
    setProductForm({ mode: 'edit', zoneId, itemId: item.id, name: item.name, max: String(item.max) })
  }

  const startAddProduct = (zoneId) => {
    setZoneForm(null)
    setProductForm({ mode: 'new', zoneId, name: '', max: '' })
  }

  const saveProductForm = () => {
    const maxNum = Number(productForm.max)
    if (!productForm.name.trim() || !maxNum || maxNum < 1) return
    if (productForm.mode === 'new') {
      addProduct(productForm.zoneId, { name: productForm.name, max: maxNum })
    } else {
      updateProduct(productForm.itemId, { name: productForm.name.trim(), max: Math.round(maxNum) })
    }
    setProductForm(null)
  }

  const handleRemoveProduct = (item) => {
    if (window.confirm(`¿Eliminar "${item.name}" de esta zona?`)) removeProduct(item.id)
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 pb-32 pt-[calc(env(safe-area-inset-top)+16px)]">
      <div className="flex items-center gap-1.5">
        <IconSettings className="h-4 w-4 text-accent" />
        <span className="text-[13px] font-bold text-ink">Configuración</span>
      </div>

      <h1 className="mt-3 font-display text-[26px] font-extrabold leading-none tracking-tight text-ink">
        Zonas y catálogo
      </h1>
      <p className="mt-1.5 text-xs text-muted">
        Definí qué neveras existen y qué productos van en cada una.
      </p>

      <div className="mt-5 space-y-3">
        {zones.map((zone) => {
          const products = itemsByZone.get(zone.id) ?? []
          const isEditingZone = zoneForm?.mode === 'edit' && zoneForm.zoneId === zone.id

          return (
            <div key={zone.id} className="rounded-2xl bg-surface p-3 shadow-sm ring-1 ring-black/5">
              {isEditingZone ? (
                <ZoneForm form={zoneForm} setForm={setZoneForm} onSave={saveZoneForm} onCancel={() => setZoneForm(null)} />
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex-shrink-0 text-lg">{zone.icon}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-ink">{zone.name}</p>
                      <p className="truncate text-xs text-muted">
                        {zone.subtitle || 'Sin descripción'} · {products.length}{' '}
                        {products.length === 1 ? 'producto' : 'productos'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-1">
                    <IconButton label={`Editar ${zone.name}`} onClick={() => startEditZone(zone)}>
                      <IconPencil className="h-3.5 w-3.5" />
                    </IconButton>
                    <IconButton
                      label={`Eliminar ${zone.name}`}
                      tone="danger"
                      onClick={() => handleRemoveZone(zone, products.length)}
                    >
                      <IconTrash className="h-3.5 w-3.5" />
                    </IconButton>
                  </div>
                </div>
              )}

              <div className="mt-3 space-y-1.5 border-t border-track pt-2.5">
                {products.map((item) => {
                  const isEditingProduct = productForm?.mode === 'edit' && productForm.itemId === item.id
                  if (isEditingProduct) {
                    return (
                      <ProductForm
                        key={item.id}
                        form={productForm}
                        setForm={setProductForm}
                        onSave={saveProductForm}
                        onCancel={() => setProductForm(null)}
                      />
                    )
                  }
                  return (
                    <div key={item.id} className="flex items-center justify-between gap-2 rounded-xl px-1 py-1">
                      <span className="truncate text-[13px] font-semibold text-ink">{item.name}</span>
                      <div className="flex flex-shrink-0 items-center gap-1.5">
                        <span className="font-mono text-[11px] font-bold text-muted">Max {item.max}</span>
                        <IconButton label={`Editar ${item.name}`} onClick={() => startEditProduct(zone.id, item)}>
                          <IconPencil className="h-3 w-3" />
                        </IconButton>
                        <IconButton label={`Eliminar ${item.name}`} tone="danger" onClick={() => handleRemoveProduct(item)}>
                          <IconTrash className="h-3 w-3" />
                        </IconButton>
                      </div>
                    </div>
                  )
                })}

                {productForm?.mode === 'new' && productForm.zoneId === zone.id ? (
                  <ProductForm
                    form={productForm}
                    setForm={setProductForm}
                    onSave={saveProductForm}
                    onCancel={() => setProductForm(null)}
                  />
                ) : (
                  <button
                    onClick={() => startAddProduct(zone.id)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2 font-mono text-[11px] font-bold text-accent active:bg-page"
                  >
                    <IconPlus className="h-3 w-3" />
                    AGREGAR PRODUCTO
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-3">
        {zoneForm?.mode === 'new' ? (
          <div className="rounded-2xl bg-surface p-3 shadow-sm ring-1 ring-black/5">
            <ZoneForm form={zoneForm} setForm={setZoneForm} onSave={saveZoneForm} onCancel={() => setZoneForm(null)} />
          </div>
        ) : (
          <button
            onClick={startAddZone}
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-surface py-3.5 font-mono text-xs font-bold text-accent shadow-sm ring-1 ring-black/5 active:bg-page"
          >
            <IconPlus className="h-3.5 w-3.5" />
            AGREGAR ZONA / NEVERA
          </button>
        )}
      </div>
    </div>
  )
}

function IconButton({ children, onClick, label, tone = 'default' }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full active:bg-page ${
        tone === 'danger' ? 'text-accent' : 'text-muted'
      }`}
    >
      {children}
    </button>
  )
}

function ZoneForm({ form, setForm, onSave, onCancel }) {
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={form.icon}
          onChange={(e) => setForm({ ...form, icon: e.target.value })}
          maxLength={4}
          placeholder="📦"
          className={`${inputClass} w-14 flex-shrink-0 text-center text-lg`}
        />
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Nombre de la zona"
          autoFocus
          className={`${inputClass} min-w-0 flex-1`}
        />
      </div>
      <input
        value={form.subtitle}
        onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
        placeholder="Descripción (ej: Cervezas y energizantes)"
        className={`${inputClass} w-full`}
      />
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 rounded-xl bg-page py-2 font-mono text-xs font-bold text-muted active:bg-track"
        >
          CANCELAR
        </button>
        <button
          onClick={onSave}
          disabled={!form.name.trim()}
          className="flex-1 rounded-xl bg-accent py-2 font-mono text-xs font-bold text-white active:bg-accent/90 disabled:opacity-40"
        >
          GUARDAR
        </button>
      </div>
    </div>
  )
}

function ProductForm({ form, setForm, onSave, onCancel }) {
  return (
    <div className="space-y-2 rounded-xl bg-page p-2">
      <div className="flex gap-2">
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Nombre del producto"
          autoFocus
          className={`${inputClass} min-w-0 flex-1 bg-surface`}
        />
        <input
          value={form.max}
          onChange={(e) => setForm({ ...form, max: e.target.value })}
          placeholder="Max"
          type="number"
          inputMode="numeric"
          min="1"
          className={`${inputClass} w-16 flex-shrink-0 bg-surface text-center`}
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 rounded-xl bg-surface py-1.5 font-mono text-[11px] font-bold text-muted active:bg-track"
        >
          CANCELAR
        </button>
        <button
          onClick={onSave}
          disabled={!form.name.trim() || !Number(form.max)}
          className="flex-1 rounded-xl bg-accent py-1.5 font-mono text-[11px] font-bold text-white active:bg-accent/90 disabled:opacity-40"
        >
          GUARDAR
        </button>
      </div>
    </div>
  )
}
