export const ZONES = [
  { id: 'refri1', name: 'Fridge 1', subtitle: 'Beers and energy drinks', icon: '🧊' },
  { id: 'refri2', name: 'Fridge 2', subtitle: 'Sodas and water', icon: '🥤' },
  { id: 'barra', name: 'Bar / Shelf', subtitle: 'Spirits and liquor', icon: '🥃' },
]

// The same product (same `name`) can repeat across multiple zones with its own
// ideal stock (max) and current count; the picking list sums them by name.
export const INITIAL_ITEMS = [
  { id: 'refri1-corona', zoneId: 'refri1', name: 'Corona Beer 330ml', max: 24, current: 10 },
  { id: 'refri1-stella', zoneId: 'refri1', name: 'Stella Artois Beer 330ml', max: 24, current: 24 },
  { id: 'refri1-heineken', zoneId: 'refri1', name: 'Heineken Beer 330ml', max: 24, current: 6 },
  { id: 'refri1-redbull', zoneId: 'refri1', name: 'Red Bull 250ml', max: 12, current: 12 },
  { id: 'refri1-speed', zoneId: 'refri1', name: 'Speed 250ml', max: 12, current: 3 },

  { id: 'refri2-corona', zoneId: 'refri2', name: 'Corona Beer 330ml', max: 12, current: 12 },
  { id: 'refri2-coca', zoneId: 'refri2', name: 'Coca-Cola 350ml', max: 24, current: 20 },
  { id: 'refri2-cocazero', zoneId: 'refri2', name: 'Coca-Cola Zero 350ml', max: 18, current: 18 },
  { id: 'refri2-sprite', zoneId: 'refri2', name: 'Sprite 350ml', max: 18, current: 9 },
  { id: 'refri2-tonica', zoneId: 'refri2', name: 'Tonic Water 350ml', max: 18, current: 18 },
  { id: 'refri2-agua', zoneId: 'refri2', name: 'Mineral Water 500ml', max: 24, current: 15 },

  { id: 'barra-vodka', zoneId: 'barra', name: 'Vodka Absolut 750ml', max: 6, current: 6 },
  { id: 'barra-gin', zoneId: 'barra', name: 'Gin Beefeater 750ml', max: 6, current: 2 },
  { id: 'barra-ron', zoneId: 'barra', name: 'Bacardí Rum 750ml', max: 6, current: 6 },
  { id: 'barra-whisky', zoneId: 'barra', name: 'Jack Daniel\'s Whiskey 750ml', max: 6, current: 0 },
  { id: 'barra-tequila', zoneId: 'barra', name: 'José Cuervo Tequila 750ml', max: 4, current: 4 },
  { id: 'barra-aperol', zoneId: 'barra', name: 'Aperol 750ml', max: 4, current: 1 },
]

export const STORAGE_KEY_ITEMS = 'barstock:items:v1'
export const STORAGE_KEY_CHECKED = 'barstock:checked:v1'
export const STORAGE_KEY_RUNNER = 'barstock:runner:v1'
export const STORAGE_KEY_LAST_UPDATED = 'barstock:lastUpdated:v1'
export const STORAGE_KEY_ZONES = 'barstock:zones:v1'
export const STORAGE_KEY_SHORTAGES = 'barstock:shortages:v1'

export function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}
