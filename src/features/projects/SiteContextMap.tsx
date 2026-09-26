import { useEffect, useRef, useState } from 'react'
import * as L from 'leaflet'
import { parcel, sources } from '../../domain'
import { lanarkMapSnapshot } from './site-context-map-data'
import type { PropertyDetail } from './property-client'
import 'leaflet/dist/leaflet.css'

const overview: L.LatLngTuple = [40.445, -79.995]
const overviewZoom = 11
const parcelSource = sources.find(source => source.id === 'parcel')

export function SiteContextMap({ historical, detail }: { historical: boolean; detail: PropertyDetail | null }) {
  const host = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const tiles = useRef<L.TileLayer | null>(null)
  const boundary = useRef<L.FeatureGroup | null>(null)
  const [tileError, setTileError] = useState(false)
  const geometry = detail?.boundary.status === 'available' ? detail.boundary.geometry : null
  const selected = Boolean(geometry || historical && !detail)

  useEffect(() => {
    if (!host.current) return
    const instance = L.map(host.current, { center: overview, zoom: overviewZoom, minZoom: 9, maxZoom: 19, zoomControl: false })
    map.current = instance
    L.control.zoom({ position: 'bottomright' }).addTo(instance)
    const layer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>', maxZoom: 19,
    })
    tiles.current = layer
    layer.on('tileerror', () => setTileError(true))
    layer.addTo(instance)
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => instance.invalidateSize({ pan: false }))
    observer?.observe(host.current)
    const frame = window.requestAnimationFrame(() => instance.invalidateSize({ pan: false }))
    return () => { window.cancelAnimationFrame(frame); observer?.disconnect(); layer.off(); instance.remove(); map.current = null; tiles.current = null; boundary.current = null }
  }, [])

  useEffect(() => {
    const instance = map.current
    if (!instance) return
    boundary.current?.remove()
    boundary.current = null
    if (!selected) { instance.setView(overview, overviewZoom, { animate: false }); return }
    const style = { color: '#604613', weight: 3, fillColor: '#efb83c', fillOpacity: 0.4, className: 'gp-map-parcel' }
    const shape = geometry ? L.geoJSON(geometry as Parameters<typeof L.geoJSON>[0], { style }) : L.polygon(lanarkMapSnapshot.ringLatLng.map(([lat, lng]): L.LatLngTuple => [lat, lng]), style)
    const group = L.featureGroup([shape])
    const labelBoundary = () => group.eachLayer(child => {
      if (child instanceof L.GeoJSON) child.eachLayer(path => { if (path instanceof L.Path) { path.getElement()?.setAttribute('data-testid', 'site-map-parcel-boundary'); path.getElement()?.setAttribute('aria-label', 'Live Allegheny County parcel boundary, not a survey') } })
      else if (child instanceof L.Path) { child.getElement()?.setAttribute('data-testid', 'site-map-parcel-boundary'); child.getElement()?.setAttribute('aria-label', 'Historical Allegheny County parcel boundary, not a survey') }
    })
    group.on('add', labelBoundary)
    group.addTo(instance)
    labelBoundary()
    boundary.current = group
    instance.fitBounds(group.getBounds().pad(4), { maxZoom: 18, animate: false })
  }, [selected, geometry])

  const showOverview = () => map.current?.setView(overview, overviewZoom, { animate: false })
  const showParcel = () => { if (boundary.current) map.current?.fitBounds(boundary.current.getBounds().pad(4), { maxZoom: 18, animate: false }) }
  const retryTiles = () => { setTileError(false); tiles.current?.redraw() }

  return <div className={`gp-site ${selected ? 'is-selected' : ''}`}>
    <div className="gp-site-top"><span>Site context</span><span>{geometry ? 'Live parcel context' : historical ? 'Historical example' : 'Pittsburgh overview'}</span></div>
    <div className="gp-site-map-actions"><button type="button" onClick={showOverview}>Overview</button>{selected && <button type="button" onClick={showParcel}>View parcel</button>}</div>
    <div className="gp-site-map-wrap"><div ref={host} className="gp-site-map" data-testid="site-context-map" role="region" aria-label="Interactive OpenStreetMap view of Pittsburgh" />{tileError && <div className="gp-site-map-error" data-testid="site-map-tiles-error" role="status"><span>Map tiles could not load.</span><button type="button" onClick={retryTiles}>Retry map</button></div>}</div>
    {detail ? <><h3>{detail.assessment.record?.address || `Parcel ${detail.parcelId}`}</h3><p>{detail.assessment.record?.municipality || 'Municipality unverified'}</p><div className="gp-site-facts"><span>Parcel ID<strong>{detail.parcelId}</strong></span><span>Boundary<strong>{detail.boundary.status}</strong></span></div><small>{geometry ? <>County <a href={detail.boundary.sourceUrl} target="_blank" rel="noreferrer">parcel boundary</a>, retrieved {detail.boundary.retrievedAt}. Dataset effective date unavailable. Displayed in {detail.boundary.displayCrs}. Not a survey.</> : 'County parcel boundary unavailable. No outline is drawn.'}</small></> : historical ? <><h3>1623 Lanark Street</h3><p>Historical research example · Fineview</p><div className="gp-site-facts"><span>Parcel ID<strong>{parcel.id}</strong></span><span>Recorded lot area<strong>1,657 sq ft</strong></span></div><small><a href={parcelSource?.url} target="_blank" rel="noreferrer">Allegheny County parcel boundary</a>, retrieved September 26, 2026. Historical snapshot; source version unverified. Projected from {lanarkMapSnapshot.sourceCrs} to {lanarkMapSnapshot.displayCrs}. Not a survey.</small></> : <><h3>Regional orientation</h3><p>Pittsburgh area within Allegheny County. Search for an address or parcel ID to identify a site.</p><small>Map tiles show regional context until you confirm a parcel. No parcel boundary is drawn from an unconfirmed search.</small></>}
  </div>
}
