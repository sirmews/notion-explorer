import { getStoredTokens, clearTokens } from '../auth/oauth'

const NOTION_API_BASE = 'https://api.notion.com/v1'
const NOTION_VERSION = '2022-11-12'

async function notionFetch(endpoint, options: any = {}) {
  const tokens = getStoredTokens()
  if (!tokens?.accessToken) {
    throw new Error('Not connected to Notion')
  }

  const response = await fetch(`${NOTION_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${tokens.accessToken}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
      ...options.headers
    }
  })

  if (response.status === 401) {
    clearTokens()
    throw new Error('Token expired')
  }

  if (!response.ok) {
    throw new Error(`Notion API error: ${response.status}`)
  }

  return response.json()
}

export async function searchPages(query = '') {
  const body = query
    ? { query, filter: { value: 'page', property: 'object' } }
    : { filter: { value: 'page', property: 'object' } }

  return notionFetch('/search', {
    method: 'POST',
    body: JSON.stringify(body)
  })
}

export async function getPage(pageId) {
  return notionFetch(`/pages/${pageId}`)
}

export async function getBlockChildren(blockId) {
  return notionFetch(`/blocks/${blockId}/children`)
}

export async function getDatabase(databaseId) {
  return notionFetch(`/databases/${databaseId}`)
}

export async function queryDatabase(databaseId, filter = {}) {
  return notionFetch(`/databases/${databaseId}/query`, {
    method: 'POST',
    body: JSON.stringify({ filter })
  })
}

export async function getCurrentUser() {
  return notionFetch('/users/me')
}

export async function getWorkspace() {
  const user = await getCurrentUser()
  return {
    name: user.name || user.bot?.owner?.type || 'Notion Workspace',
    avatar: user.avatar_url,
    id: user.id
  }
}
