import { inflateRawSync } from 'node:zlib'

function uint16(bytes, offset) { return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(offset, true) }
function uint32(bytes, offset) { return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, true) }

function crc32(bytes) {
  let value = 0xffffffff
  for (const byte of bytes) {
    value ^= byte
    for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0)
  }
  return (value ^ 0xffffffff) >>> 0
}

async function exactRange(url, start, end, archiveSize, version, fetcher) {
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || end >= archiveSize) throw Error('invalid_zip_range')
  const expected = end - start + 1
  const headers = { Range: `bytes=${start}-${end}` }
  if (version.etag || version.lastModified) headers['If-Range'] = version.etag ?? version.lastModified
  const response = await fetcher(url, { headers, signal: AbortSignal.timeout(12000) })
  if (response.status !== 206 || response.headers.get('content-range') !== `bytes ${start}-${end}/${archiveSize}` || version.etag && response.headers.get('etag') !== version.etag || version.lastModified && response.headers.get('last-modified') !== version.lastModified || !response.body) throw Error('zip_range_not_honored')
  const reader = response.body.getReader()
  const chunks = []
  let size = 0
  while (true) {
    const part = await reader.read()
    if (part.done) break
    size += part.value.byteLength
    if (size > expected) { await reader.cancel(); throw Error('zip_range_oversize') }
    chunks.push(part.value)
  }
  if (size !== expected) throw Error('zip_range_truncated')
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  return bytes
}

function directoryLocation(tail, archiveSize) {
  let end = -1
  for (let index = tail.length - 22; index >= 0; index--) {
    if (uint32(tail, index) === 0x06054b50 && index + 22 + uint16(tail, index + 20) === tail.length) { end = index; break }
  }
  if (end < 0 || uint16(tail, end + 4) !== 0 || uint16(tail, end + 6) !== 0 || uint16(tail, end + 8) !== uint16(tail, end + 10) || uint16(tail, end + 10) === 0xffff) throw Error('unsupported_zip_directory')
  const size = uint32(tail, end + 12)
  const offset = uint32(tail, end + 16)
  const absoluteEnd = archiveSize - tail.length + end
  if (size === 0xffffffff || offset === 0xffffffff || offset + size !== absoluteEnd) throw Error('unsupported_zip_directory')
  return { size, offset, count: uint16(tail, end + 10) }
}

function parseDirectory(bytes, count, archiveSize) {
  const entries = new Map()
  let offset = 0
  for (let index = 0; index < count; index++) {
    if (offset + 46 > bytes.length || uint32(bytes, offset) !== 0x02014b50) throw Error('invalid_zip_directory')
    const flags = uint16(bytes, offset + 8)
    const method = uint16(bytes, offset + 10)
    const checksum = uint32(bytes, offset + 16)
    const compressed = uint32(bytes, offset + 20)
    const inflated = uint32(bytes, offset + 24)
    const nameSize = uint16(bytes, offset + 28)
    const extraSize = uint16(bytes, offset + 30)
    const commentSize = uint16(bytes, offset + 32)
    const disk = uint16(bytes, offset + 34)
    const external = uint32(bytes, offset + 38)
    const localOffset = uint32(bytes, offset + 42)
    const next = offset + 46 + nameSize + extraSize + commentSize
    if (next > bytes.length || compressed === 0xffffffff || inflated === 0xffffffff || localOffset === 0xffffffff || disk !== 0 || flags & 1 || (external >>> 16 & 0xf000) === 0xa000) throw Error('unsupported_zip_entry')
    const name = new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(offset + 46, offset + 46 + nameSize))
    if (!name || name.startsWith('/') || name.includes('\\') || name.includes('\0') || name.split('/').some(part => part === '.' || part === '..') || entries.has(name) || localOffset >= archiveSize) throw Error('unsafe_zip_entry')
    entries.set(name, { flags, method, checksum, compressed, inflated, localOffset })
    offset = next
  }
  if (offset !== bytes.length) throw Error('invalid_zip_directory')
  return entries
}

export async function readZipEntries(url, exactNames, { fetcher = fetch, maxArchiveBytes = 64_000_000, maxDirectoryBytes = 262_144, maxCompressedBytes = 262_144, maxInflatedBytes = 2_000_000 } = {}) {
  if (!url.startsWith('https://') || !Array.isArray(exactNames) || !exactNames.length || exactNames.length > 5 || new Set(exactNames).size !== exactNames.length || exactNames.some(name => typeof name !== 'string' || !/^[A-Za-z0-9 _./()-]{1,200}$/.test(name) || name.startsWith('/') || name.split('/').some(part => !part || part === '.' || part === '..'))) throw Error('invalid_zip_request')
  const response = await fetcher(url, { method: 'HEAD', signal: AbortSignal.timeout(12000) })
  const archiveSize = Number(response.headers.get('content-length'))
  if (!response.ok || !Number.isSafeInteger(archiveSize) || archiveSize < 22 || archiveSize > maxArchiveBytes || !/bytes/i.test(response.headers.get('accept-ranges') ?? '')) throw Error('zip_archive_unbounded')
  const version = { etag: response.headers.get('etag'), lastModified: response.headers.get('last-modified') }
  const tailStart = Math.max(0, archiveSize - 65_557)
  const tail = await exactRange(url, tailStart, archiveSize - 1, archiveSize, version, fetcher)
  const location = directoryLocation(tail, archiveSize)
  if (location.size > maxDirectoryBytes) throw Error('zip_directory_too_large')
  const directory = location.offset >= tailStart ? tail.subarray(location.offset - tailStart, location.offset - tailStart + location.size) : await exactRange(url, location.offset, location.offset + location.size - 1, archiveSize, version, fetcher)
  if (directory.length !== location.size) throw Error('invalid_zip_directory')
  const index = parseDirectory(directory, location.count, archiveSize)
  const entries = new Map()
  for (const name of exactNames) {
    const entry = index.get(name)
    if (!entry || ![0, 8].includes(entry.method) || entry.compressed > maxCompressedBytes || entry.inflated > maxInflatedBytes || entry.localOffset + 30 >= location.offset) throw Error('zip_entry_unavailable')
    const header = await exactRange(url, entry.localOffset, entry.localOffset + 29, archiveSize, version, fetcher)
    if (uint32(header, 0) !== 0x04034b50 || uint16(header, 6) !== entry.flags || uint16(header, 8) !== entry.method) throw Error('invalid_zip_local_header')
    const nameSize = uint16(header, 26)
    const extraSize = uint16(header, 28)
    const dataStart = entry.localOffset + 30 + nameSize + extraSize
    if (dataStart + entry.compressed > location.offset || !entry.compressed) throw Error('invalid_zip_local_header')
    const localName = await exactRange(url, entry.localOffset + 30, entry.localOffset + 29 + nameSize, archiveSize, version, fetcher)
    if (new TextDecoder('utf-8', { fatal: true }).decode(localName) !== name) throw Error('invalid_zip_local_header')
    const compressed = await exactRange(url, dataStart, dataStart + entry.compressed - 1, archiveSize, version, fetcher)
    const plain = entry.method === 0 ? compressed : inflateRawSync(Buffer.from(compressed), { maxOutputLength: maxInflatedBytes })
    if (plain.length !== entry.inflated || crc32(plain) !== entry.checksum) throw Error('zip_entry_integrity_error')
    entries.set(name, plain)
  }
  return { entries, archiveSize, lastModified: response.headers.get('last-modified') }
}
