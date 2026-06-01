import { Client } from '@notionhq/client'
import { NotionAPI } from 'notion-client'
import type { IncomingMessage, ServerResponse } from 'http'

// Initialize Notion client
function getClient(accessToken: string) {
  return new Client({
    auth: accessToken,
    notionVersion: '2022-11-12'
  })
}

// Fetch all pages and databases
async function fetchWorkspace(notion: Client) {
  const allPages: any[] = []
  const allDatabases: any[] = []

  // Search for all pages
  let cursor: string | undefined = undefined
  let hasMore = true

  while (hasMore) {
    const response: any = await notion.search({
      start_cursor: cursor,
      page_size: 100,
      filter: {
        value: 'page',
        property: 'object'
      }
    })

    for (const item of response.results) {
      if (item.object === 'page') {
        allPages.push(item)
      }
    }

    hasMore = response.has_more
    cursor = response.next_cursor || undefined
  }

  // Search for databases
  cursor = undefined
  hasMore = true

  while (hasMore) {
    const response: any = await notion.search({
      start_cursor: cursor,
      page_size: 100,
      filter: {
        value: 'database',
        property: 'object'
      }
    } as any)

    for (const item of response.results) {
      if (item.object === 'database') {
        allDatabases.push(item)
      }
    }

    hasMore = response.has_more
    cursor = response.next_cursor || undefined
  }

  const allIds = new Set([
    ...allPages.map(p => p.id),
    ...allDatabases.map(d => d.id)
  ])

  // Filter root/top-level items (parent is workspace/teamspace OR parent is not in our shared list)
  const isTopLevel = (item: any) => {
    if (!item.parent || item.parent.type === 'workspace' || item.parent.type === 'teamspace') {
      return true
    }
    let parentId = null
    if (item.parent.type === 'page_id') {
      parentId = item.parent.page_id
    } else if (item.parent.type === 'database_id') {
      parentId = item.parent.database_id
    }
    
    // If parent ID is not in our shared list, treat this as root for the integration
    return !parentId || !allIds.has(parentId)
  }

  const pages = allPages.filter(p => isTopLevel(p))
  const databases = allDatabases.filter(d => isTopLevel(d))

  return { pages, databases }
}

// Fetch block children recursively
async function fetchBlockChildren(notion: Client, blockId: string, depth = 0): Promise<any[]> {
  if (depth > 5) return [] // Limit recursion depth

  const blocks: any[] = []
  let cursor: string | undefined = undefined
  let hasMore = true

  while (hasMore) {
    try {
      const response: any = await notion.blocks.children.list({
        block_id: blockId,
        start_cursor: cursor,
        page_size: 100
      })

      for (const block of response.results) {
        blocks.push(block)

        // Recursively fetch children if block has them
        if (block.has_children) {
          block.children = await fetchBlockChildren(notion, block.id, depth + 1)
        }
      }

      hasMore = response.has_more
      cursor = response.next_cursor || undefined
    } catch (error) {
      console.error(`Error fetching children for ${blockId}:`, error)
      break
    }
  }

  return blocks
}

// Fetch database entries
async function fetchDatabaseEntries(notion: Client, databaseId: string): Promise<any[]> {
  const entries: any[] = []
  let cursor: string | undefined = undefined
  let hasMore = true

  while (hasMore) {
    try {
      const response: any = await (notion.databases as any).query({
        database_id: databaseId,
        start_cursor: cursor,
        page_size: 100
      })

      entries.push(...response.results)

      hasMore = response.has_more
      cursor = response.next_cursor || undefined
    } catch (error) {
      console.error(`Error fetching database ${databaseId}:`, error)
      break
    }
  }

  return entries
}

export default async function handler(req: IncomingMessage & { body?: any }, res: ServerResponse & { status: (code: number) => { json: (data: any) => void } }) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { accessToken, lastSyncTime, pageId, databaseId } = req.body || {}

    if (!accessToken) {
      return res.status(400).json({ error: 'Missing access token' })
    }

    const notion = getClient(accessToken)

    // Case 1: On-demand page recordMap fetch
    if (pageId) {
      try {
        const notionClient = new NotionAPI({
          authToken: accessToken
        })
        const recordMap = await notionClient.getPage(pageId)
        return res.status(200).json({ recordMap })
      } catch (error) {
        console.error(`Error fetching on-demand recordMap for page ${pageId}:`, error)
        return res.status(500).json({ error: 'Failed to fetch page recordMap' })
      }
    }

    // Case 2: On-demand database query fetch
    if (databaseId) {
      try {
        const entries = await fetchDatabaseEntries(notion, databaseId)
        return res.status(200).json({ entries })
      } catch (error) {
        console.error(`Error querying on-demand entries for database ${databaseId}:`, error)
        return res.status(500).json({ error: 'Failed to query database entries' })
      }
    }

    // Case 3: Workspace Skeleton Sync (instant!)
    const { pages, databases } = await fetchWorkspace(notion)

    return res.status(200).json({
      pages,
      databases,
      syncTime: new Date().toISOString()
    })
  } catch (error) {
    console.error('Sync error:', error)
    return res.status(500).json({ error: 'Sync failed' })
  }
}
