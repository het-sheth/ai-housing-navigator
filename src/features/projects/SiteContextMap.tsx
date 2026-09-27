import { useEffect, useRef, useState } from 'react'
import * as L from 'leaflet'
import { parcel, sources } from '../../domain'
import { lanarkMapSnapshot } from './site-context-map-data'
import type { PropertyDetail } from './property-client'
import 'leaflet/dist/leaflet.css'

const overview: L.LatLngTuple = [40.445, -79.995]
const overviewZoom = 11
const parcelSource = sources.find(source => source.id === 'parcel')

export function SiteContextMap({ historical, detail, savedParcelId, selectedParcelId = null, loading, loadError, onLoadCurrentRecords }: { historical: boolean; detail: PropertyDetail | null; savedParcelId: string | null; selectedParcelId?: string | null; loading: boolean; loadError: string; onLoadCurrentRecords: () => void }) {
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
    <div className="gp-site-top"><span>Site map</span><span>{geometry ? 'County boundary' : historical ? 'Saved example' : savedParcelId ? 'Saved parcel' : selectedParcelId ? 'Selected candidate' : 'Region'}</span></div>
    <div className="gp-site-map-actions"><button type="button" onClick={showOverview}>Overview</button>{selected && <button type="button" onClick={showParcel}>View parcel</button>}</div>
    <div className="gp-site-map-wrap"><div ref={host} className="gp-site-map" data-testid="site-context-map" role="region" aria-label="Interactive OpenStreetMap view of Pittsburgh" />{tileError && <div className="gp-site-map-error" data-testid="site-map-tiles-error" role="status"><span>Map tiles could not load.</span><button type="button" onClick={retryTiles}>Retry map</button></div>}</div>
    {detail ? <div className="gp-map-context"><h3>{geometry ? 'Parcel boundary' : 'Boundary unavailable'}</h3><p>{geometry ? 'Mapped County parcel outline. Not a survey.' : 'The County did not return a usable outline. No boundary is drawn.'}</p>{loadError && <><p className="gp-error-message" role="alert">{loadError}{geometry && ' The map shows the last loaded boundary.'}</p><button className="gp-text-button" type="button" disabled={loading} onClick={onLoadCurrentRecords}>{loading ? 'Loading current records…' : 'Retry current records'}</button></>}<details className="gp-details"><summary>Map source</summary><p><a href={detail.boundary.sourceUrl} target="_blank" rel="noreferrer">Allegheny County parcel map ↗</a></p><p>Parcel {detail.parcelId}. Retrieved {detail.boundary.retrievedAt}. Dataset effective date unknown. Display coordinates {detail.boundary.displayCrs}.</p></details></div> : historical ? <div className="gp-map-context"><h3>Historical Lanark outline</h3><p>Saved research geometry. Not a current property match or survey.</p><details className="gp-details"><summary>Map source</summary><p><a href={parcelSource?.url} target="_blank" rel="noreferrer">County parcel boundary ↗</a></p><p>Parcel {parcel.id}. Retrieved September 26, 2026. Source version unknown. Displayed in {lanarkMapSnapshot.displayCrs} from {lanarkMapSnapshot.sourceCrs}.</p></details></div> : savedParcelId ? <div className="gp-map-context"><h3>Parcel {savedParcelId} saved</h3><p>The parcel ID is saved. Its boundary has not been loaded in this visit.</p>{loadError && <p className="gp-error-message" role="alert">{loadError}</p>}<button className="gp-text-button" type="button" disabled={loading} onClick={onLoadCurrentRecords}>{loading ? 'Loading current records…' : loadError ? 'Retry current records' : 'Load current records'}</button></div> : selectedParcelId ? <div className="gp-map-context"><h3>Candidate parcel {selectedParcelId} selected</h3><p>This assessment candidate is not yet confirmed by current County parcel records. No boundary is drawn.</p>{loadError && <p className="gp-error-message" role="alert">{loadError}</p>}<button className="gp-text-button" type="button" disabled={loading} onClick={onLoadCurrentRecords}>{loading ? 'Loading parcel records…' : loadError ? 'Retry parcel inspection' : 'Inspect parcel records'}</button></div> : <div className="gp-map-context"><h3>Allegheny County area</h3><p>Search and confirm a parcel to see its mapped boundary.</p></div>}
  </div>
}
