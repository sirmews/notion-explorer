import { readFile, writeFile, getMetadata, setMetadata } from './opfs'
import { getStoredTokens } from '../auth/oauth'

// Sync status
let syncInProgress = false
let syncProgress = 0
let syncTotal = 0

// Get sync status
export function getSyncStatus() {
  return {
    inProgress: syncInProgress,
    progress: syncProgress,
    total: syncTotal,
    percentage: syncTotal > 0 ? Math.round((syncProgress / syncTotal) * 100) : 0
  }
}

// Main sync function
export async function syncWorkspace(onProgress = null) {
  if (syncInProgress) {
    throw new Error('Sync already in progress')
  }

  const tokens = getStoredTokens()
  if (!tokens?.accessToken) {
    throw new Error('Not connected to Notion')
  }

  syncInProgress = true
  syncProgress = 0
  syncTotal = 0

  try {
    // Get current metadata
    const metadata = await getMetadata() || {}
    const lastSyncTime = metadata.lastSyncTime

    // Call sync endpoint
    const response = await fetch('/api/notion/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessToken: tokens.accessToken,
        lastSyncTime
      })
    })

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status}`)
    }

    const data = await response.json()

    // Update progress tracking
    syncTotal = data.pages.length + data.databases.length
    syncProgress = 0

    // Transform and save pages
    for (const page of data.pages) {
      await savePage(page, [])
      syncProgress++
      if (onProgress) onProgress(syncProgress, syncTotal)
    }

    // Transform and save databases
    for (const db of data.databases) {
      await saveDatabase(db, [])
      syncProgress++
      if (onProgress) onProgress(syncProgress, syncTotal)
    }

    // Save file system structure
    await saveFileSystem(data.pages, data.databases)

    // Update metadata
    await setMetadata({
      ...metadata,
      lastSyncTime: data.syncTime,
      pageIds: data.pages.map(p => p.id),
      databaseIds: data.databases.map(d => d.id)
    })

    return {
      success: true,
      pages: data.pages.length,
      databases: data.databases.length,
      syncTime: data.syncTime
    }
  } finally {
    syncInProgress = false
  }
}

// Save page to OPFS
async function savePage(page, blocks) {
  const pageData = {
    id: page.id,
    type: 'page',
    title: getPageTitle(page),
    icon: getPageIcon(page),
    cover: getCoverUrl(page),
    properties: page.properties,
    parent: page.parent,
    createdTime: page.created_time,
    lastEditedTime: page.last_edited_time,
    blocks: blocks,
    url: page.url
  }

  await writeFile(`/pages/${page.id}.json`, pageData)
}

// Save database to OPFS
async function saveDatabase(db, entries) {
  const dbData = {
    id: db.id,
    type: 'database',
    title: getPageTitle(db),
    icon: getPageIcon(db),
    cover: getCoverUrl(db),
    description: db.description,
    properties: db.properties,
    parent: db.parent,
    createdTime: db.created_time,
    lastEditedTime: db.last_edited_time,
    entries: entries.map(entry => ({
      id: entry.id,
      properties: entry.properties,
      createdTime: entry.created_time,
      lastEditedTime: entry.last_edited_time
    })),
    url: db.url
  }

  await writeFile(`/databases/${db.id}.json`, dbData)
}

// Save file system structure
async function saveFileSystem(pages, databases) {
  const fs = {
    pages: pages.map(p => ({
      id: p.id,
      title: getPageTitle(p),
      icon: getPageIcon(p),
      parent: p.parent,
      hasChildren: p.has_children,
      createdTime: p.created_time,
      lastEditedTime: p.last_edited_time
    })),
    databases: databases.map(d => ({
      id: d.id,
      title: getPageTitle(d),
      icon: getPageIcon(d),
      parent: d.parent,
      createdTime: d.created_time,
      lastEditedTime: d.last_edited_time
    }))
  }

  await writeFile('/filesystem.json', fs)
}

// Load file system structure
export async function loadFileSystem() {
  return readFile('/filesystem.json')
}

// Load page data
export async function loadPage(pageId) {
  const pageData = await readFile(`/pages/${pageId}.json`)
  if (!pageData) return null

  // If page blocks list is empty and it's NOT a demo page, fetch blocks on-demand!
  const isDemo = pageId.startsWith('demo-')
  if ((!pageData.blocks || pageData.blocks.length === 0) && !isDemo) {
    console.log(`Lazy loading blocks on-demand for page: ${pageId}`)
    const tokens = getStoredTokens()
    if (tokens?.accessToken) {
      try {
        const response = await fetch('/api/notion/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accessToken: tokens.accessToken,
            pageId: pageId
          })
        })
        if (response.ok) {
          const result = await response.json()
          if (result.blocks) {
            pageData.blocks = result.blocks
            // Cache back to local storage
            await writeFile(`/pages/${pageId}.json`, pageData)
          }
        }
      } catch (err) {
        console.error(`On-demand blocks load failed for page ${pageId}:`, err)
      }
    }
  }

  return pageData
}

// Load database data
export async function loadDatabase(databaseId) {
  const dbData = await readFile(`/databases/${databaseId}.json`)
  if (!dbData) return null

  // If database entries is empty and it's NOT a demo db, fetch entries on-demand!
  const isDemo = databaseId.startsWith('demo-')
  if ((!dbData.entries || dbData.entries.length === 0) && !isDemo) {
    console.log(`Lazy querying entries on-demand for database: ${databaseId}`)
    const tokens = getStoredTokens()
    if (tokens?.accessToken) {
      try {
        const response = await fetch('/api/notion/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accessToken: tokens.accessToken,
            databaseId: databaseId
          })
        })
        if (response.ok) {
          const result = await response.json()
          if (result.entries) {
            dbData.entries = result.entries
            // Cache back to local storage
            await writeFile(`/databases/${databaseId}.json`, dbData)
          }
        }
      } catch (err) {
        console.error(`On-demand entries load failed for database ${databaseId}:`, err)
      }
    }
  }

  return dbData
}

// Check if workspace is synced
export async function isSynced() {
  const metadata = await getMetadata()
  return metadata?.lastSyncTime != null
}

// Get last sync time
export async function getLastSyncTime() {
  const metadata = await getMetadata()
  return metadata?.lastSyncTime
}

// Helper functions
function getPageTitle(page) {
  if (!page.properties) return 'Untitled'
  for (const [key, prop] of Object.entries(page.properties)) {
    const p = prop as any
    if (p.type === 'title') {
      return p.title?.map(t => t.plain_text).join('') || 'Untitled'
    }
  }
  return 'Untitled'
}

function getPageIcon(page) {
  if (page.icon?.type === 'emoji') return page.icon.emoji
  if (page.icon?.type === 'file') return '🖼️'
  return '📄'
}

function getCoverUrl(page) {
  if (page.cover?.type === 'external') return page.cover.external.url
  if (page.cover?.type === 'file') return page.cover.file.url
  return null
}
