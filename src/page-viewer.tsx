import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { loadPage, loadFileSystem } from './sync/notionSync'
import { NotionRenderer } from 'react-notion-x'
import 'react-notion-x/styles.css'

function getPageId() {
  const params = new URLSearchParams(window.location.search)
  const queryId = params.get('id')
  if (queryId) return queryId

  const match = window.location.pathname.match(/\/page\/([a-zA-Z0-9-]+)/)
  return match ? match[1] : null
}

const PageViewerApp: React.FC = () => {
  const [page, setPage] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const pageId = getPageId()
    if (!pageId) {
      setError('No page ID provided')
      setLoading(false)
      return
    }

    async function loadData() {
      try {
        const pageData = await loadPage(pageId)
        if (!pageData) {
          setError('Page not found. Try syncing your workspace.')
          setLoading(false)
          return
        }

        setPage(pageData)
        document.title = `${pageData.title || 'Untitled'} — Notion Explorer`

        // Load file system and update breadcrumb
        const fs = await loadFileSystem()
        const breadcrumbEl = document.getElementById('breadcrumb')
        if (breadcrumbEl) {
          const parts = []
          let current = pageData
          while (current) {
            parts.unshift(current.title || 'Untitled')
            const parentId = current.parent?.page_id
            if (parentId && fs?.pages) {
              current = fs.pages.find((p: any) => p.id === parentId)
            } else {
              current = null
            }
          }
          breadcrumbEl.textContent = parts.join(' › ')
        }
      } catch (err) {
        console.error(err)
        setError('An error occurred while loading the page.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  if (error) {
    return <div className="loading">{error}</div>
  }

  if (!page) {
    return <div className="loading">Page not found</div>
  }

  return (
    <div style={{ padding: '20px 0' }}>
      {page.recordMap ? (
        <NotionRenderer recordMap={page.recordMap} fullPage={true} />
      ) : (
        <div className="loading">No content cached for this page.</div>
      )}
    </div>
  )
}

const container = document.getElementById('page-content')
if (container) {
  const root = createRoot(container)
  root.render(
    <React.StrictMode>
      <PageViewerApp />
    </React.StrictMode>
  )
}
export default PageViewerApp
