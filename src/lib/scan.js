// Client side of the "scan zone" feature: resizes the photo on-device (so we
// don't send a 4000x3000 image over the bar's wifi), sends it to
// /api/count-stock, and returns the counts already matched to the zone's
// real items (by exact name).

async function resizeImage(file, maxDim = 1280, quality = 0.75) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not process the image'))),
      'image/jpeg',
      quality,
    )
  })
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const [header, data] = String(reader.result).split(',')
      const mediaType = header.match(/data:(.*);base64/)?.[1] || blob.type || 'image/jpeg'
      resolve({ data, mediaType })
    }
    reader.onerror = () => reject(new Error('Could not read the image'))
    reader.readAsDataURL(blob)
  })
}

// products: items in the active zone ([{ id, name, ... }])
// Returns: [{ itemId, name, detected }]
export async function scanZone({ file, zoneName, products }) {
  const resized = await resizeImage(file)
  const { data, mediaType } = await blobToBase64(resized)

  const response = await fetch('/api/count-stock', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      image: data,
      mediaType,
      zoneName,
      products: products.map((p) => ({ id: p.id, name: p.name })),
    }),
  })

  const result = await response.json()
  if (!response.ok) {
    throw new Error(result.error || 'Could not analyze the photo')
  }

  const byName = new Map(products.map((p) => [p.name, p]))
  return result.counts
    .map(({ name, quantity }) => {
      const product = byName.get(name)
      if (!product) return null
      return { itemId: product.id, name, detected: Math.max(0, Math.round(quantity)) }
    })
    .filter(Boolean)
}
