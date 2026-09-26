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

async function transact<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase()
  return new Promise<T>((resolve, reject) => {
    let transaction: IDBTransaction
    try {
      transaction = db.transaction(storeName, mode)
      const request = run(transaction.objectStore(storeName))
      transaction.oncomplete = () => {
        db.close()
        resolve(request.result)
      }
      transaction.onabort = () => {
        db.close()
        reject(new Error(`Draft storage did not complete: ${transaction.error?.message ?? request.error?.message ?? 'transaction aborted'}`))
      }
      transaction.onerror = () => {
        db.close()
        reject(new Error(`Draft storage failed: ${transaction.error?.message ?? request.error?.message ?? 'storage error'}`))
      }
    } catch (error) {
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

export async function saveDraft(draft: Draft): Promise<void> {
  const snapshot = validateDraft(draft)
  return enqueue(async () => {
    await transact('readwrite', store => store.put(snapshot, currentKey))
  })
}

export function clearDraft(): Promise<void> {
  return enqueue(async () => {
    await transact('readwrite', store => store.delete(currentKey))
  })
}
