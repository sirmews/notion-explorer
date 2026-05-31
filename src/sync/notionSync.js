import { readFile, writeFile, getMetadata, setMetadata } from './opfs.js'
import { getStoredTokens } from '../auth/oauth.js'

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
      await savePage(page, data.pageBlocks[page.id] || [])
      syncProgress++
      if (onProgress) onProgress(syncProgress, syncTotal)
    }

    // Transform and save databases
    for (const db of data.databases) {
      await saveDatabase(db, data.databaseEntries[db.id] || [])
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
  return readFile(`/pages/${pageId}.json`)
}

// Load database data
export async function loadDatabase(databaseId) {
  return readFile(`/databases/${databaseId}.json`)
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
    if (prop.type === 'title') {
      return prop.title?.map(t => t.plain_text).join('') || 'Untitled'
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
