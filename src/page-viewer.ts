import { loadPage, loadDatabase, loadFileSystem } from './sync/notionSync'
import { renderBlocks } from './components/blockRenderer'
import { renderDatabase } from './renderers/database'

// Get page ID from URL
function getPageId() {
  const params = new URLSearchParams(window.location.search)
  return params.get('id')
}

// Update breadcrumb
function updateBreadcrumb(page, fs) {
  const breadcrumb = document.getElementById('breadcrumb')
  if (!breadcrumb) return

  const parts = []
  let current = page

  // Build path from parent chain
  while (current) {
    parts.unshift(current.title || 'Untitled')
    const parentId = current.parent?.page_id
    if (parentId && fs?.pages) {
      current = fs.pages.find(p => p.id === parentId)
    } else {
      current = null
    }
  }

  breadcrumb.textContent = parts.join(' › ')
}

// Render page content
async function renderPage(pageId) {
  const content = document.getElementById('page-content')
  if (!content) return

  // Load page data
  const page = await loadPage(pageId)
  if (!page) {
    content.innerHTML = '<div class="loading">Page not found. Try syncing your workspace.</div>'
    return
  }

  // Update title
  document.title = `${page.title} — Notion Explorer`

  // Load file system for breadcrumb
  const fs = await loadFileSystem()
  updateBreadcrumb(page, fs)

  // Build HTML
  let html = ''

  // Cover image
  if (page.cover) {
    html += `<div class="page-cover"><img src="${escapeAttr(page.cover)}" alt="Cover"></div>`
  }

  // Header
  html += '<header class="page-header">'
  if (page.icon) {
    html += `<div class="page-icon">${page.icon}</div>`
  }
  html += `<h1>${escapeHtml(page.title || 'Untitled')}</h1>`
  html += '</header>'

  // Blocks
  if (page.blocks && page.blocks.length > 0) {
    html += '<div class="page-blocks">'
    html += renderBlocks(page.blocks)
    html += '</div>'
  } else {
    html += '<div class="empty-state">This page has no content.</div>'
  }

  content.innerHTML = html

  // Load child databases
  await loadChildDatabases(page.blocks)
}

// Load and render child databases
async function loadChildDatabases(blocks) {
  if (!blocks) return

  for (const block of blocks) {
    if (block.type === 'child_database' && block.databaseId) {
      const db = await loadDatabase(block.databaseId)
      if (db) {
        const placeholder = document.querySelector(`[data-block-id="${block.id}"] .database-placeholder`)
        if (placeholder) {
          placeholder.outerHTML = renderDatabase(db, db.entries || [])
        }
      }
    }

    // Recurse into children
    if (block.children) {
      await loadChildDatabases(block.children)
    }
  }
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// Escape attribute
function escapeAttr(text) {
  return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

// Initialize
async function init() {
  const pageId = getPageId()
  if (!pageId) {
    document.getElementById('page-content').innerHTML = '<div class="loading">No page ID provided</div>'
    return
  }

  await renderPage(pageId)
}

init()
