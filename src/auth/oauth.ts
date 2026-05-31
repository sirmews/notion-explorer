const NOTION_AUTH_URL = 'https://api.notion.com/v1/oauth/authorize'
const NOTION_TOKEN_URL = 'https://api.notion.com/v1/oauth/token'

const STORAGE_KEY = 'notion_tokens'

export function getStoredTokens() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function storeTokens(tokens) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens))
}

export function clearTokens() {
  localStorage.removeItem(STORAGE_KEY)
}

export function isConnected() {
  const tokens = getStoredTokens()
  return tokens?.accessToken != null
}

export function buildAuthUrl() {
  const clientId = import.meta.env.VITE_NOTION_CLIENT_ID
  const redirectUri = import.meta.env.VITE_NOTION_REDIRECT_URI || window.location.origin

  if (!clientId) {
    console.error('Missing VITE_NOTION_CLIENT_ID env variable')
    return null
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    owner: 'user'
  })

  return `${NOTION_AUTH_URL}?${params.toString()}`
}

export function redirectToNotion() {
  const url = buildAuthUrl()
  if (url) {
    window.location.href = url
  }
}

export async function exchangeCode(code) {
  // Token exchange requires client_secret, which can't be exposed in the browser.
  // This needs to go through a server-side proxy.
  // For now, we'll POST to our own API route.
  const redirectUri = import.meta.env.VITE_NOTION_REDIRECT_URI || window.location.origin

  const response = await fetch('/api/auth/notion/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirect_uri: redirectUri })
  })

  if (!response.ok) {
    throw new Error('Token exchange failed')
  }

  const tokens = await response.json()
  storeTokens(tokens)
  return tokens
}

export function handleCallback() {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  const error = params.get('error')

  if (error) {
    console.error('OAuth error:', error)
    return { error }
  }

  if (code) {
    // Clean the URL
    window.history.replaceState({}, '', window.location.pathname)
    return { code }
  }

  return null
}
