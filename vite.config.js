import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import syncHandler from './api/notion/sync.ts'

// Load .env manually for server-side
function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), '.env')
    const envContent = readFileSync(envPath, 'utf-8')
    const env = {}
    for (const line of envContent.split('\n')) {
      if (line.startsWith('#') || !line.includes('=')) continue
      const [key, ...valueParts] = line.split('=')
      env[key.trim()] = valueParts.join('=').trim()
    }
    return env
  } catch {
    return {}
  }
}

const env = loadEnv()

export default defineConfig({
  server: {
    port: 5173,
    open: true,
    // Custom middleware for token exchange
    proxy: {
      '/api/auth/notion/token': {
        target: 'http://localhost:5173',
        configure: (proxy, options) => {
          // We'll handle this with a custom middleware instead
        }
      }
    }
  },
  // Custom plugin to add token exchange endpoint
  plugins: [
    react(),
    {
      name: 'notion-token-exchange',
      configureServer(server) {
        server.middlewares.use('/api/auth/notion/token', async (req, res) => {
          if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Method not allowed' }))
            return
          }

          // Read body
          let body = ''
          for await (const chunk of req) {
            body += chunk
          }

          try {
            const { code, redirect_uri } = JSON.parse(body)
            const clientId = env.VITE_NOTION_CLIENT_ID
            const clientSecret = env.NOTION_CLIENT_SECRET

            if (!clientId || !clientSecret) {
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'Missing Notion credentials in .env' }))
              return
            }

            if (!code) {
              res.writeHead(400, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'Missing authorization code' }))
              return
            }

            // Exchange code for tokens
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
                redirect_uri: redirect_uri || `http://localhost:5173`
              })
            })

            const data = await response.json()

            if (!response.ok) {
              res.writeHead(response.status, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify(data))
              return
            }

            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({
              accessToken: data.access_token,
              refreshToken: data.refresh_token,
              botId: data.bot_id,
              workspaceId: data.workspace_id,
              workspaceName: data.workspace_name,
              workspaceIcon: data.workspace_icon,
              owner: data.owner
            }))
          } catch (error) {
            console.error('Token exchange error:', error)
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Token exchange failed' }))
          }
        })

        server.middlewares.use('/api/notion/sync', async (req, res) => {
          if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Method not allowed' }))
            return
          }

          // Read body
          let body = ''
          for await (const chunk of req) {
            body += chunk
          }

          try {
            const parsedBody = body ? JSON.parse(body) : {}
            req.body = parsedBody

            // Mock standard Vercel response helper methods status and json
            res.status = (statusCode) => {
              res.writeHead(statusCode, { 'Content-Type': 'application/json' })
              return {
                json: (data) => res.end(JSON.stringify(data))
              }
            }

            await syncHandler(req, res)
          } catch (error) {
            console.error('Local sync middleware error:', error)
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Sync failed' }))
          }
        })
      }
    }
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), 'index.html'),
        page: resolve(process.cwd(), 'page.html')
      }
    }
  }
})
