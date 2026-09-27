import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDraft, type Draft } from './contracts'
import { clearDraft, loadDraft, saveDraft, startNewDraft } from './draft-store'

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

  it('does not replace a draft when restore is canceled before delayed storage opens', async () => {
    const entries = new Map<string, Draft>()
    const current = createDraft()
    const cloud = createDraft()
    entries.set('current', current)
    let request: { result: unknown; onsuccess?: () => void } | undefined
    let transactions = 0
    vi.stubGlobal('indexedDB', {
      open: () => {
        request = { result: {
          close: () => {},
          transaction: () => {
            transactions += 1
            const transaction = {
              objectStore: () => ({ put: (draft: Draft, key: string) => entries.set(key, draft) }),
              oncomplete: undefined as undefined | (() => void),
            }
            queueMicrotask(() => transaction.oncomplete?.())
            return transaction
          },
        } }
        return request
      },
    })
    const controller = new AbortController()
    const restoring = startNewDraft(current, cloud, controller.signal)
    await Promise.resolve()
    controller.abort()
    request?.onsuccess?.()
    await expect(restoring).rejects.toMatchObject({ name: 'AbortError' })
    expect(transactions).toBe(0)
    expect(entries.get('current')).toEqual(current)
    expect(entries.size).toBe(1)
  })

  it('aborts an in-flight restore transaction before replacing device work', async () => {
    const entries = new Map<string, Draft>()
    const staged = new Map<string, Draft>()
    const current = createDraft()
    const cloud = createDraft()
    entries.set('current', current)
    let request: { result: unknown; onsuccess?: () => void } | undefined
    let transaction: { onabort?: () => void; abort: () => void } | undefined
    vi.stubGlobal('indexedDB', {
      open: () => {
        request = { result: {
          close: () => {},
          transaction: () => {
            transaction = {
              onabort: undefined,
              abort: () => { staged.clear(); queueMicrotask(() => transaction?.onabort?.()) },
              objectStore: () => ({ put: (draft: Draft, key: string) => staged.set(key, draft) }),
            } as typeof transaction
            return transaction
          },
        } }
        return request
      },
    })
    const controller = new AbortController()
    const restoring = startNewDraft(current, cloud, controller.signal)
    await Promise.resolve()
    request?.onsuccess?.()
    await Promise.resolve()
    expect(transaction).toBeDefined()
    expect(staged.size).toBe(2)
    controller.abort()
    await expect(restoring).rejects.toMatchObject({ name: 'AbortError' })
    expect(entries.get('current')).toEqual(current)
    expect(staged.size).toBe(0)
  })

  it('does not create a current draft when an empty-device restore is canceled during storage open', async () => {
    const entries = new Map<string, Draft>()
    const cloud = createDraft()
    let request: { result: unknown; onsuccess?: () => void } | undefined
    let transactions = 0
    vi.stubGlobal('indexedDB', {
      open: () => {
        request = { result: {
          close: () => {},
          transaction: () => {
            transactions += 1
            return {
              objectStore: () => ({ put: (draft: Draft, key: string) => entries.set(key, draft) }),
            }
          },
        } }
        return request
      },
    })
    const controller = new AbortController()
    const restoring = saveDraft(cloud, controller.signal)
    await Promise.resolve()
    controller.abort()
    request?.onsuccess?.()
    await expect(restoring).rejects.toMatchObject({ name: 'AbortError' })
    expect(transactions).toBe(0)
    expect(entries.size).toBe(0)
  })

  it('aborts an archive transaction when a write throws before all requests are queued', async () => {
    const staged = new Map<string, Draft>()
    const current = createDraft()
    const cloud = createDraft()
    let request: { result: unknown; onsuccess?: () => void } | undefined
    let aborted = false
    vi.stubGlobal('indexedDB', {
      open: () => {
        request = { result: {
          close: () => {},
          transaction: () => ({
            objectStore: () => ({ put: (draft: Draft, key: string) => {
              if (key === 'current') throw new Error('synthetic request failure')
              staged.set(key, draft)
            } }),
            abort: () => { aborted = true; staged.clear() },
          }),
        } }
        return request
      },
    })
    const restoring = startNewDraft(current, cloud)
    await Promise.resolve()
    request?.onsuccess?.()
    await expect(restoring).rejects.toThrow('synthetic request failure')
    expect(aborted).toBe(true)
    expect(staged.size).toBe(0)
  })
})
