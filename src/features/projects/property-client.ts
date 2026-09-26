export type PropertyCandidate = { parcelId: string; address: string; city: string | null; municipality: string | null; zip: string | null }
export type PropertySearch = { status: 'candidates' | 'no_match' | 'invalid_query' | 'error'; candidates: PropertyCandidate[]; truncated: boolean; retrievedAt: string; sourceUrl: string; sourceDate: string | null }
export type PropertyObservation = { status: 'available' | 'unavailable' | 'error'; sourceDate: string | null; retrievedAt: string; sourceUrl: string }
export type ParcelGeometry = { type: 'Polygon'; coordinates: number[][][] } | { type: 'MultiPolygon'; coordinates: number[][][][] }
export type PropertyDetail = {
  parcelId: string
  assessment: PropertyObservation & { record: (PropertyCandidate & { classification: string | null; useDescription: string | null; lotAreaSqFt: number | null; yearBuilt: number | null }) | null }
  boundary: PropertyObservation & { geometry: ParcelGeometry | null; sourceCrs: string; displayCrs: string; modifiedOn: string | null }
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { signal })
  if (!response.ok) throw new Error('source_unavailable')
  return response.json() as Promise<T>
}

export function searchProperty(query: string, signal?: AbortSignal) {
  return getJson<PropertySearch>(`/api/property/search?q=${encodeURIComponent(query)}`, signal)
}

export function loadProperty(parcelId: string, signal?: AbortSignal) {
  return getJson<PropertyDetail>(`/api/property/parcel?pin=${encodeURIComponent(parcelId)}`, signal)
}
