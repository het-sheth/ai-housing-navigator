import { createServer } from 'node:http'
import { Readable } from 'node:stream'
import { handleAssist } from './ai/intake.mjs'
import { handleProperty } from './property/live.mjs'
import { handleCandidates } from './property/candidates.mjs'
import { handleScreening } from './screening/run.mjs'
import { handleSources } from './sources/registry.mjs'
import { handleSourceQuery } from './sources/query.mjs'
import { getPublicConfig } from './account/config.mjs'

const host = '127.0.0.1'
const port = 5175

createServer(async (incoming, outgoing) => {
  try {
    const request = new Request(`http://${host}:${port}${incoming.url}`, {
      method: incoming.method,
      headers: incoming.headers,
      body: incoming.method === 'POST' ? Readable.toWeb(incoming) : undefined,
      duplex: incoming.method === 'POST' ? 'half' : undefined,
    })
    const pathname = new URL(request.url).pathname
    const response = pathname === '/api/property/candidates'
      ? await handleCandidates(request)
      : pathname === '/api/config'
        ? request.method === 'GET'
          ? Response.json(getPublicConfig(), { headers: { 'cache-control': 'no-store' } })
          : Response.json({ error: 'method_not_allowed' }, { status: 405, headers: { 'cache-control': 'no-store' } })
      : pathname.startsWith('/api/property/')
      ? await handleProperty(request)
      : pathname === '/api/screening/run'
        ? await handleScreening(request)
        : pathname === '/api/sources'
          ? handleSources(request)
          : pathname === '/api/sources/query'
            ? await handleSourceQuery(request)
            : pathname === '/api/assist'
              ? await handleAssist(request, { key: process.env.OPENROUTER_API_KEY, log: fields => process.stdout.write(`${JSON.stringify(fields)}\n`) })
              : Response.json({ error: 'not_found' }, { status: 404, headers: { 'cache-control': 'no-store' } })
    outgoing.writeHead(response.status, Object.fromEntries(response.headers))
    outgoing.end(Buffer.from(await response.arrayBuffer()))
  } catch {
    outgoing.writeHead(500, { 'content-type': 'application/json', 'cache-control': 'no-store' })
    outgoing.end(JSON.stringify({ error: 'server_error' }))
  }
}).listen(port, host, () => {
  process.stdout.write(`AI intake server listening on http://${host}:${port}\n`)
})
