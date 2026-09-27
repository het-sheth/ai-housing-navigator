export function displayPropertyAddress(address: string | null | undefined, parcelId: string): string {
  const value = address?.trim() ?? ''
  if (!value) return `Parcel ${parcelId}`
  if (/^0\s+/.test(value)) return `${value.replace(/^0\s+/, '')} · Parcel ${parcelId}`
  return value
}
