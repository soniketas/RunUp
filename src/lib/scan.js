// Cliente del feature de "escanear zona": redimensiona la foto en el propio
// dispositivo (para no mandar 4000x3000 por la red del bar), la manda a
// /api/count-stock, y devuelve los conteos ya emparejados con los items
// reales de la zona (por nombre exacto).

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
      (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo procesar la imagen'))),
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
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'))
    reader.readAsDataURL(blob)
  })
}

// products: items de la zona activa ([{ id, name, ... }])
// Devuelve: [{ itemId, name, detected }]
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
    throw new Error(result.error || 'No se pudo analizar la foto')
  }

  const byName = new Map(products.map((p) => [p.name, p]))
  return result.conteos
    .map(({ nombre, cantidad }) => {
      const product = byName.get(nombre)
      if (!product) return null
      return { itemId: product.id, name: nombre, detected: Math.max(0, Math.round(cantidad)) }
    })
    .filter(Boolean)
}
