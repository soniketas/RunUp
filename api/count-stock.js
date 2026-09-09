// Vercel Serverless Function (Node runtime, auto-detected from /api).
// Takes a photo of a zone + the list of products expected in it, and asks a
// vision model to count how many units of each product are visible. The API
// key lives only here (a Vercel environment variable), it never reaches the
// client.
//
// Required configuration in the Vercel project:
//   ANTHROPIC_API_KEY   -> your API key from console.anthropic.com
//   ANTHROPIC_MODEL      -> optional, defaults below. Confirm the current
//                            vision-capable model id at
//                            https://docs.claude.com/en/docs/about-claude/models
//                            before relying on this in production.

const DEFAULT_MODEL = 'claude-sonnet-4-5'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { image, mediaType, zoneName, products } = req.body || {}

  if (!image || !Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ error: 'Missing data: image and products are required' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured in Vercel' })
  }

  const productNames = products.map((p) => p.name).filter(Boolean)

  const tool = {
    name: 'report_count',
    description: 'Reports how many units of each expected product are visible in the photo.',
    input_schema: {
      type: 'object',
      properties: {
        counts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Exact product name, as it appears in the given list',
              },
              quantity: {
                type: 'integer',
                minimum: 0,
                description: 'Units of that product visible in the photo',
              },
            },
            required: ['name', 'quantity'],
          },
        },
      },
      required: ['counts'],
    },
  }

  const prompt = `This is a photo of the "${zoneName}" zone in a bar.

List of products expected in this zone (use EXACTLY these names, don't invent others or translate them):
${productNames.map((n) => `- ${n}`).join('\n')}

Count how many bottles/cans/units of each product on the list are visible in the image. If a product from the list doesn't appear in the photo, report it with quantity 0. Ignore products that aren't on the list. If there's doubt due to occlusion, angle, or partially covered labels, give your best estimate of what's visible, not the ideal quantity or what "should" be there.`

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
        tool_choice: { type: 'tool', name: 'report_count' },
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
      return res.status(502).json({ error: 'The vision model returned an error', detail })
    }

    const data = await response.json()
    const toolUse = data.content?.find((block) => block.type === 'tool_use')
    const counts = toolUse?.input?.counts

    if (!Array.isArray(counts)) {
      return res.status(502).json({ error: "The model's response wasn't in the expected format" })
    }

    return res.status(200).json({ counts })
  } catch (err) {
    return res.status(500).json({ error: 'Could not reach the vision model', detail: String(err) })
  }
}
