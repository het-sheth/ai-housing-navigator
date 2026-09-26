import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDraft, type Draft } from './contracts'
import { clearDraft, loadDraft, saveDraft } from './draft-store'

afterEach(() => vi.unstubAllGlobals())

describe('draft storage failures', () => {
  it('reports unavailable browser storage instead of claiming an empty or saved draft', async () => {
    vi.stubGlobal('indexedDB', undefined)
    await expect(loadDraft()).rejects.toThrow(/storage.*unavailable/i)
    await expect(saveDraft(createDraft())).rejects.toThrow(/storage.*unavailable/i)
    await expect(clearDraft()).rejects.toThrow(/storage.*unavailable/i)
  })

  it('rejects incompatible draft content before touching browser storage', async () => {
    vi.stubGlobal('indexedDB', undefined)
    await expect(saveDraft({ ...createDraft(), schemaVersion: 2 } as unknown as Draft)).rejects.toThrow(/version/i)
  })

  it('allows a later storage operation to run after a rejected write', async () => {
    vi.stubGlobal('indexedDB', undefined)
    await expect(saveDraft({ ...createDraft(), existingHomes: -1 })).rejects.toThrow(/home counts/i)
    await expect(loadDraft()).rejects.toThrow(/storage.*unavailable/i)
  })
})
