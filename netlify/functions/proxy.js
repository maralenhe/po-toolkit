export default async (req, context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-api-key, anthropic-version',
      }
    })
  }

  const url = new URL(req.url)
  const path = url.pathname.replace('/.netlify/functions/proxy', '')
  const target = `https://api.anthropic.com${path}`

  const body = req.method !== 'GET' ? await req.text() : undefined
  const apiKey = req.headers.get('x-api-key') || ''

  const resp = await fetch(target, {
    method: req.method,
    headers: {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'x-api-key': apiKey,
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body,
  })

  const data = await resp.text()
  return new Response(data, {
    status: resp.status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    }
  })
}

export const config = { path: '/api/*' }
