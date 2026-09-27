import { validateDraft, type Draft } from './contracts'

const databaseName = 'housing-navigator-drafts'
const storeName = 'drafts'
const currentKey = 'current'
let queue: Promise<unknown> = Promise.resolve()

function enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const result = queue.then(operation)
  queue = result.catch(() => undefined)
  return result
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new Error('Browser draft storage is unavailable. Keep this page open and export your work.'))
      return
    }
    let settled = false
    const request = indexedDB.open(databaseName, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(storeName)) request.result.createObjectStore(storeName)
    }
    request.onblocked = () => {
      settled = true
      reject(new Error('Draft storage is blocked by another open page. Close the other page and retry.'))
    }
    request.onerror = () => {
      settled = true
      reject(new Error(`Draft storage could not open: ${request.error?.message ?? 'unknown storage error'}`))
    }
    request.onsuccess = () => {
      const db = request.result
      if (settled) {
        db.close()
        return
      }
      db.onversionchange = () => db.close()
      settled = true
      resolve(db)
    }
  })
}

async function transact<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>, signal?: AbortSignal): Promise<T> {
  const db = await openDatabase()
  if (signal?.aborted) { db.close(); signal.throwIfAborted() }
  return new Promise<T>((resolve, reject) => {
    let activeTransaction: IDBTransaction | undefined
    const abort = () => { try { activeTransaction?.abort() } catch { return } }
    try {
      const transaction = db.transaction(storeName, mode)
      activeTransaction = transaction
      const request = run(transaction.objectStore(storeName))
      transaction.oncomplete = () => {
        signal?.removeEventListener('abort', abort)
        db.close()
        resolve(request.result)
      }
      transaction.onabort = () => {
        signal?.removeEventListener('abort', abort)
        db.close()
        reject(signal?.aborted ? signal.reason : new Error(`Draft storage did not complete: ${transaction.error?.message ?? request.error?.message ?? 'transaction aborted'}`))
      }
      transaction.onerror = () => {
        signal?.removeEventListener('abort', abort)
        db.close()
        reject(new Error(`Draft storage failed: ${transaction.error?.message ?? request.error?.message ?? 'storage error'}`))
      }
      signal?.addEventListener('abort', abort, { once: true })
      if (signal?.aborted) abort()
    } catch (error) {
      signal?.removeEventListener('abort', abort)
      abort()
      db.close()
      reject(error)
    }
  })
}

export function loadDraft(): Promise<Draft | null> {
  return enqueue(async () => {
    const value: unknown = await transact('readonly', store => store.get(currentKey))
    return value === undefined ? null : validateDraft(value)
  })
}

export async function saveDraft(draft: Draft, signal?: AbortSignal): Promise<void> {
  const snapshot = validateDraft(draft)
  return enqueue(async () => {
    signal?.throwIfAborted()
    await transact('readwrite', store => store.put(snapshot, currentKey), signal)
  })
}

export function clearDraft(): Promise<void> {
  return enqueue(async () => {
    await transact('readwrite', store => store.delete(currentKey))
  })
}

export function startNewDraft(current: Draft, next: Draft, signal?: AbortSignal): Promise<void> {
  const previous = validateDraft(current)
  const fresh = validateDraft(next)
  return enqueue(async () => {
    signal?.throwIfAborted()
    const db = await openDatabase()
    if (signal?.aborted) { db.close(); signal.throwIfAborted() }
    await new Promise<void>((resolve, reject) => {
      let activeTransaction: IDBTransaction | undefined
      const abort = () => { try { activeTransaction?.abort() } catch { return } }
      try {
        const transaction = db.transaction(storeName, 'readwrite')
        activeTransaction = transaction
        const store = transaction.objectStore(storeName)
        store.put(previous, `archive:${previous.id}`)
        store.put(fresh, currentKey)
        transaction.oncomplete = () => { signal?.removeEventListener('abort', abort); db.close(); resolve() }
        transaction.onabort = () => { signal?.removeEventListener('abort', abort); db.close(); reject(signal?.aborted ? signal.reason : new Error('Could not preserve the previous draft.')) }
        transaction.onerror = () => { signal?.removeEventListener('abort', abort); db.close(); reject(new Error('Could not preserve the previous draft.')) }
        signal?.addEventListener('abort', abort, { once: true })
        if (signal?.aborted) abort()
      } catch (error) {
        signal?.removeEventListener('abort', abort)
        abort()
        db.close()
        reject(error)
      }
    })
  })
}

export function listArchivedDrafts(): Promise<{ drafts: Draft[]; invalidCount: number }> {
  return enqueue(async () => {
    const db = await openDatabase()
    return new Promise<{ drafts: Draft[]; invalidCount: number }>((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const keys = store.getAllKeys()
      const values = store.getAll()
      transaction.oncomplete = () => {
        db.close()
        const drafts: Draft[] = []
        let invalidCount = 0
        values.result.forEach((value, index) => {
          if (!String(keys.result[index]).startsWith('archive:')) return
          try { drafts.push(validateDraft(value)) } catch { invalidCount += 1 }
        })
        resolve({ drafts: drafts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), invalidCount })
      }
      transaction.onabort = () => { db.close(); reject(new Error('Could not read saved projects.')) }
      transaction.onerror = () => { db.close(); reject(new Error('Could not read saved projects.')) }
    })
  })
}

export function restoreArchivedDraft(current: Draft, archived: Draft): Promise<void> {
  const previous = validateDraft(current)
  const restored = validateDraft(archived)
  return enqueue(async () => {
    const db = await openDatabase()
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      store.put(previous, `archive:${previous.id}`)
      store.put(restored, currentKey)
      transaction.oncomplete = () => { db.close(); resolve() }
      transaction.onabort = () => { db.close(); reject(new Error('Could not restore the saved project.')) }
      transaction.onerror = () => { db.close(); reject(new Error('Could not restore the saved project.')) }
    })
  })
}
