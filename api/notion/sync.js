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
    const { accessToken, lastSyncTime } = req.body

    if (!accessToken) {
      return res.status(400).json({ error: 'Missing access token' })
    }

    const notion = getClient(accessToken)

    // Fetch workspace
    const { pages, databases } = await fetchWorkspace(notion)

    // Fetch blocks for each page
    const pageBlocks = {}
    for (const page of pages) {
      try {
        const blocks = await fetchBlockChildren(notion, page.id)
        pageBlocks[page.id] = blocks
      } catch (error) {
        console.error(`Error fetching blocks for page ${page.id}:`, error)
        pageBlocks[page.id] = []
      }
    }

    // Fetch entries for each database
    const databaseEntries = {}
    for (const db of databases) {
      try {
        const entries = await fetchDatabaseEntries(notion, db.id)
        databaseEntries[db.id] = entries
      } catch (error) {
        console.error(`Error fetching entries for database ${db.id}:`, error)
        databaseEntries[db.id] = []
      }
    }

    return res.status(200).json({
      pages,
      databases,
      pageBlocks,
      databaseEntries,
      syncTime: new Date().toISOString()
    })
  } catch (error) {
    console.error('Sync error:', error)
    return res.status(500).json({ error: 'Sync failed' })
  }
}
