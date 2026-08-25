import { createServer } from 'node:http'

import type { HealthResponse } from '@kiasucode/shared'

const port = Number(process.env.PORT ?? 3001)

const server = createServer((request, response) => {
  if (request.method === 'GET' && request.url === '/health') {
    const payload: HealthResponse = {
      status: 'ok',
      service: 'kiasucode-backend',
      timestamp: new Date().toISOString(),
    }

    response.writeHead(200, { 'content-type': 'application/json' })
    response.end(JSON.stringify(payload))
    return
  }

  response.writeHead(404, { 'content-type': 'application/json' })
  response.end(JSON.stringify({ error: 'Not found' }))
})

server.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`)
})
