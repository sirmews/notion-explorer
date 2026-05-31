import { Client } from '@notionhq/client'

// Initialize Notion client
function getClient(accessToken) {
  return new Client({
    auth: accessToken,
    notionVersion: '2022-06-28'
  })
}

// Fetch all pages and databases
async function fetchWorkspace(notion) {
  const pages = []
  const databases = []

  // Search for all pages and databases
  let cursor = undefined
  let hasMore = true

  while (hasMore) {
    const response = await notion.search({
      start_cursor: cursor,
      page_size: 100,
      filter: {
        value: 'page',
        property: 'object'
      }
    })

    for (const item of response.results) {
      if (item.object === 'page') {
        pages.push(item)
      }
    }

    hasMore = response.has_more
    cursor = response.next_cursor
  }

  // Search for databases
  cursor = undefined
  hasMore = true

  while (hasMore) {
    const response = await notion.search({
      start_cursor: cursor,
      page_size: 100,
      filter: {
        value: 'database',
        property: 'object'
      }
    })

    for (const item of response.results) {
      if (item.object === 'database') {
        databases.push(item)
      }
    }

    hasMore = response.has_more
    cursor = response.next_cursor
  }

  return { pages, databases }
}

// Fetch block children recursively
async function fetchBlockChildren(notion, blockId, depth = 0) {
  if (depth > 5) return [] // Limit recursion depth

  const blocks = []
  let cursor = undefined
  let hasMore = true

  while (hasMore) {
    try {
      const response = await notion.blocks.children.list({
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
      cursor = response.next_cursor
    } catch (error) {
      console.error(`Error fetching children for ${blockId}:`, error)
      break
    }
  }

  return blocks
}

// Fetch database entries
async function fetchDatabaseEntries(notion, databaseId) {
  const entries = []
  let cursor = undefined
  let hasMore = true

  while (hasMore) {
    try {
      const response = await notion.databases.query({
        database_id: databaseId,
        start_cursor: cursor,
        page_size: 100
      })

      entries.push(...response.results)

      hasMore = response.has_more
      cursor = response.next_cursor
    } catch (error) {
      console.error(`Error fetching database ${databaseId}:`, error)
      break
    }
  }

  return entries
}

// Main sync handler
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { accessToken, lastSyncTime, pageId, databaseId } = req.body

    if (!accessToken) {
      return res.status(400).json({ error: 'Missing access token' })
    }

    const notion = getClient(accessToken)

    // Case 1: On-demand page blocks fetch
    if (pageId) {
      try {
        const blocks = await fetchBlockChildren(notion, pageId)
        return res.status(200).json({ blocks })
      } catch (error) {
        console.error(`Error fetching on-demand blocks for page ${pageId}:`, error)
        return res.status(500).json({ error: 'Failed to fetch page blocks' })
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
