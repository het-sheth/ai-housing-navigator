import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { SourceObservations } from './SourceObservations'

it('exposes supplementary finding provenance without claiming rubric completion', () => {
  const html = renderToStaticMarkup(<SourceObservations observations={[{ id: 'mapped-landslide', status: 'mapped_flag', coverage: 'mapped_intersection_only', sourceUrl: 'https://example.com/landslide', sourceDate: null, retrievedAt: '2026-09-27T18:00:00Z', count: 1, summary: 'One mapped landslide feature intersects the parcel.' }]} />)
  expect(html).toContain('Mapped landslide')
  expect(html).toContain('mapped flag')
  expect(html).toContain('One mapped landslide feature')
  expect(html).toContain('https://example.com/landslide')
  expect(html).toContain('2026-09-27T18:00:00Z')
  expect(html).toContain('Source date: Unknown')
  expect(html).toContain('do not complete rubric checks')
})
