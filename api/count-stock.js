// Vercel Serverless Function (Node runtime, auto-detectada desde /api).
// Recibe una foto de una zona + la lista de productos esperados en ella,
// y le pide a un modelo de visión que cuente cuántas unidades de cada
// producto son visibles. La API key vive solo acá (variable de entorno de
// Vercel), nunca llega al cliente.
//
// Configuración requerida en el proyecto de Vercel:
//   ANTHROPIC_API_KEY   -> tu API key de console.anthropic.com
//   ANTHROPIC_MODEL      -> opcional, default abajo. Confirmá el id de modelo
//                            con soporte de visión vigente en
//                            https://docs.claude.com/en/docs/about-claude/models
//                            antes de depender de esto en producción.

const DEFAULT_MODEL = 'claude-sonnet-4-5'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const { image, mediaType, zoneName, products } = req.body || {}

  if (!image || !Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ error: 'Faltan datos: se requieren image y products' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY no está configurada en Vercel' })
  }

  const productNames = products.map((p) => p.name).filter(Boolean)

  const tool = {
    name: 'reportar_conteo',
    description: 'Reporta cuántas unidades de cada producto esperado son visibles en la foto.',
    input_schema: {
      type: 'object',
      properties: {
        conteos: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              nombre: {
                type: 'string',
                description: 'Nombre exacto del producto, tal como aparece en la lista dada',
              },
              cantidad: {
                type: 'integer',
                minimum: 0,
                description: 'Unidades de ese producto visibles en la foto',
              },
            },
            required: ['nombre', 'cantidad'],
          },
        },
      },
      required: ['conteos'],
    },
  }

  const prompt = `Esta es una foto de la zona "${zoneName}" de un bar.

Lista de productos esperados en esta zona (usá EXACTAMENTE estos nombres, no inventes otros ni los traduzcas):
${productNames.map((n) => `- ${n}`).join('\n')}

Contá cuántas botellas/latas/unidades de cada producto de la lista son visibles en la imagen. Si un producto de la lista no aparece en la foto, reportalo con cantidad 0. Ignorá productos que no estén en la lista. Si hay dudas por oclusión, ángulo o etiquetas parcialmente tapadas, dá tu mejor estimación de lo visible — no la cantidad ideal ni la que "debería" haber.`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
        max_tokens: 1024,
        tools: [tool],
        tool_choice: { type: 'tool', name: 'reportar_conteo' },
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: image },
              },
              { type: 'text', text: prompt },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      const detail = await response.text()
      return res.status(502).json({ error: 'El modelo de visión devolvió un error', detail })
    }

    const data = await response.json()
    const toolUse = data.content?.find((block) => block.type === 'tool_use')
    const conteos = toolUse?.input?.conteos

    if (!Array.isArray(conteos)) {
      return res.status(502).json({ error: 'La respuesta del modelo no tenía el formato esperado' })
    }

    return res.status(200).json({ conteos })
  } catch (err) {
    return res.status(500).json({ error: 'No se pudo contactar al modelo de visión', detail: String(err) })
  }
}
