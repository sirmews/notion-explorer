const DB_NAME = 'notion-explorer'
const DB_VERSION = 1
const STORE_NAME = 'files'

let db = null
let root = null

// Initialize IndexedDB as fallback
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }
    request.onupgradeneeded = (event) => {
      const database = (event.target as any).result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME)
      }
    }
  })
}

// Get OPFS root
async function getRoot() {
  // Always return null to use IndexedDB as the primary, transparent, and debuggable storage engine
  return null
}

// Ensure parent directories exist
async function ensurePath(dir, pathParts) {
  let current = dir
  for (const part of pathParts) {
    try {
      current = await current.getDirectoryHandle(part)
    } catch {
      current = await current.getDirectoryHandle(part, { create: true })
    }
  }
  return current
}

// Get file handle from path
async function getFileHandle(path, create = false) {
  const root_ = await getRoot()
  if (!root_) return null

  const parts = path.split('/').filter(Boolean)
  const fileName = parts.pop()
  const dir = await ensurePath(root_, parts)
  return dir.getFileHandle(fileName, { create })
}

// Get directory handle from path
async function getDirHandle(path, create = false) {
  const root_ = await getRoot()
  if (!root_) return null

  const parts = path.split('/').filter(Boolean)
  return ensurePath(root_, parts)
}

// Read file from OPFS
export async function readFile(path) {
  const root_ = await getRoot()

  // Try OPFS first
  if (root_) {
    try {
      const handle = await getFileHandle(path)
      if (!handle) return null
      const file = await handle.getFile()
      const text = await file.text()
      return JSON.parse(text)
    } catch (e) {
      if (e.name === 'NotFoundError') return null
      throw e
    }
  }

  // Fallback to IndexedDB
  if (!db) await initDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.get(path)
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}

// Write file to OPFS
export async function writeFile(path, data) {
  const json = JSON.stringify(data, null, 2)
  const root_ = await getRoot()

  // Try OPFS first
  if (root_) {
    try {
      const handle = await getFileHandle(path, true)
      if (!handle) return false
      const writable = await handle.createWritable()
      await writable.write(json)
      await writable.close()
      return true
    } catch (e) {
      console.warn('OPFS write failed, trying IndexedDB:', e)
    }
  }

  // Fallback to IndexedDB
  if (!db) await initDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.put(data, path)
    request.onsuccess = () => resolve(true)
    request.onerror = () => reject(request.error)
  })
}

// List files in directory
export async function listDir(path = '') {
  const root_ = await getRoot()

  // Try OPFS first
  if (root_) {
    try {
      const dir = path ? await getDirHandle(path) : root_
      if (!dir) return []
      const entries = []
      for await (const [name, handle] of dir) {
        entries.push({
          name,
          kind: handle.kind // 'file' or 'directory'
        })
      }
      return entries
    } catch (e) {
      if (e.name === 'NotFoundError') return []
      throw e
    }
  }

  // Fallback to IndexedDB - list all keys with prefix
  if (!db) await initDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.getAllKeys()
    request.onsuccess = () => {
      const prefix = path ? `${path}/` : ''
      const keys = request.result.filter(k => k.startsWith(prefix))
      const entries = keys.map(k => {
        const relative = k.slice(prefix.length)
        const parts = relative.split('/')
        return {
          name: parts[0],
          kind: parts.length > 1 ? 'directory' : 'file'
        }
      })
      // Deduplicate
      const unique = [...new Map(entries.map(e => [e.name, e])).values()]
      resolve(unique)
    }
    request.onerror = () => reject(request.error)
  })
}

// Delete file
export async function deleteFile(path) {
  const root_ = await getRoot()

  if (root_) {
    try {
      const parts = path.split('/').filter(Boolean)
      const fileName = parts.pop()
      const dir = await ensurePath(root_, parts)
      await dir.removeEntry(fileName)
      return true
    } catch (e) {
      if (e.name === 'NotFoundError') return false
      throw e
    }
  }

  if (!db) await initDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.delete(path)
    request.onsuccess = () => resolve(true)
    request.onerror = () => reject(request.error)
  })
}

// Check if file exists
export async function exists(path) {
  const result = await readFile(path)
  return result !== null
}

// Get metadata (workspace info, sync state)
export async function getMetadata() {
  return readFile('/workspace.json')
}

// Set metadata
export async function setMetadata(data) {
  return writeFile('/workspace.json', data)
}

// Clear all data
export async function clearAll() {
  const root_ = await getRoot()

  if (root_) {
    try {
      for await (const [name] of root_) {
        await root_.removeEntry(name, { recursive: true })
      }
    } catch (e) {
      console.warn('Failed to clear OPFS:', e)
    }
  }

  if (!db) await initDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.clear()
    request.onsuccess = () => resolve(true)
    request.onerror = () => reject(request.error)
  })
}
