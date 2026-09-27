import { describe, expect, it, vi } from 'vitest'
import { deflateRawSync } from 'node:zlib'
import { readZipEntries } from './zip-range.mjs'

function crc32(bytes: Uint8Array) {
  let value = 0xffffffff
  for (const byte of bytes) {
    value ^= byte
    for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0)
  }
  return (value ^ 0xffffffff) >>> 0
}

function archive(files: Record<string, string>) {
  const locals: Buffer[] = []
  const centrals: Buffer[] = []
  let offset = 0
  for (const [name, text] of Object.entries(files)) {
    const fileName = Buffer.from(name)
    const plain = Buffer.from(text)
    const compressed = deflateRawSync(plain)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(8, 8)
    local.writeUInt32LE(crc32(plain), 14)
    local.writeUInt32LE(compressed.length, 18)
    local.writeUInt32LE(plain.length, 22)
    local.writeUInt16LE(fileName.length, 26)
    locals.push(local, fileName, compressed)
    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(8, 10)
    central.writeUInt32LE(crc32(plain), 16)
    central.writeUInt32LE(compressed.length, 20)
    central.writeUInt32LE(plain.length, 24)
    central.writeUInt16LE(fileName.length, 28)
    central.writeUInt32LE(offset, 42)
    centrals.push(central, fileName)
    offset += local.length + fileName.length + compressed.length
  }
  const directory = Buffer.concat(centrals)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(Object.keys(files).length, 8)
  end.writeUInt16LE(Object.keys(files).length, 10)
  end.writeUInt32LE(directory.length, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, directory, end])
}

function source(bytes: Buffer, truncate = false) {
  const fetcher = vi.fn(async (_url: string, options: RequestInit) => {
    if (options.method === 'HEAD') return new Response(null, { headers: { 'content-length': String(bytes.length), 'accept-ranges': 'bytes', etag: '"stable"' } })
    const range = String((options.headers as Record<string, string>).Range).match(/^bytes=(\d+)-(\d+)$/)
    if (!range) throw Error('missing range')
    const start = Number(range[1])
    const end = Number(range[2])
    const payload = bytes.subarray(start, end + 1)
    return new Response(truncate ? payload.subarray(0, Math.max(0, payload.length - 1)) : payload, { status: 206, headers: { 'content-range': `bytes ${start}-${end}/${bytes.length}`, etag: '"stable"' } })
  })
  return fetcher
}

describe('bounded ZIP range reader', () => {
  it('reads only exact named GTFS entries from a larger archive', async () => {
    const bytes = archive({ 'routes.txt': 'route_id,route_short_name\n1,16\n', 'stops.txt': 'stop_id,stop_name\n100,Main\n', 'shapes.txt': 'unused' })
    const fetcher = source(bytes)
    const result = await readZipEntries('https://www.rideprt.org/developerresources/GTFS.zip', ['routes.txt', 'stops.txt'], { fetcher })
    expect(new TextDecoder().decode(result.entries.get('routes.txt'))).toContain('1,16')
    expect(new TextDecoder().decode(result.entries.get('stops.txt'))).toContain('100,Main')
    expect(result.entries.has('shapes.txt')).toBe(false)
    expect(fetcher.mock.calls.every(([url]) => String(url).startsWith('https://www.rideprt.org/'))).toBe(true)
  })

  it('rejects a truncated range even if its header claims complete content', async () => {
    const bytes = archive({ 'stops.txt': 'stop_id\n100\n' })
    await expect(readZipEntries('https://www.rideprt.org/developerresources/GTFS.zip', ['stops.txt'], { fetcher: source(bytes, true) })).rejects.toThrow()
  })

  it('caps decompressed entry output', async () => {
    const bytes = archive({ 'stops.txt': 'A'.repeat(100_000) })
    await expect(readZipEntries('https://www.rideprt.org/developerresources/GTFS.zip', ['stops.txt'], { fetcher: source(bytes), maxInflatedBytes: 1024 })).rejects.toThrow()
  })

  it('accepts a safe named CSV for other public data archives', async () => {
    const bytes = archive({ 'County Data.csv': 'county,value\n42003,1\n' })
    const result = await readZipEntries('https://example.org/public.zip', ['County Data.csv'], { fetcher: source(bytes) })
    expect(new TextDecoder().decode(result.entries.get('County Data.csv'))).toContain('42003,1')
  })

  it('rejects a local header whose name differs from the central directory', async () => {
    const bytes = archive({ 'stops.txt': 'stop_id\n100\n' })
    bytes[30] = 'X'.charCodeAt(0)
    await expect(readZipEntries('https://example.org/public.zip', ['stops.txt'], { fetcher: source(bytes) })).rejects.toThrow()
  })

  it('rejects a changed archive ETag even when Last-Modified is unchanged', async () => {
    const bytes = archive({ 'stops.txt': 'stop_id\n100\n' })
    const ordinary = source(bytes)
    const fetcher = async (url: string, options: RequestInit) => {
      const response = await ordinary(url, options)
      const headers = new Headers(response.headers)
      headers.set('last-modified', 'Sat, 26 Sep 2026 04:00:53 GMT')
      headers.set('etag', options.method === 'HEAD' ? '"original"' : '"changed"')
      return new Response(response.body, { status: response.status, headers })
    }
    await expect(readZipEntries('https://example.org/public.zip', ['stops.txt'], { fetcher })).rejects.toThrow()
  })
})
