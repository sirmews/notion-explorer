import type { IncomingMessage, ServerResponse } from 'http'

export default async function handler(req: IncomingMessage & { body?: any }, res: ServerResponse & { status: (code: number) => { json: (data: any) => void } }) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { code, redirect_uri } = req.body || {}

  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' })
  }

  const clientId = process.env.NOTION_CLIENT_ID || process.env.VITE_NOTION_CLIENT_ID
  const clientSecret = process.env.NOTION_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'Missing Notion credentials' })
  }

  try {
    const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

    const response = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${encoded}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri
      })
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(response.status).json(data)
    }

    return res.status(200).json({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      botId: data.bot_id,
      workspaceId: data.workspace_id,
      workspaceName: data.workspace_name,
      workspaceIcon: data.workspace_icon,
      owner: data.owner
    })
  } catch (error) {
    console.error('Token exchange error:', error)
    return res.status(500).json({ error: 'Token exchange failed' })
  }
}
