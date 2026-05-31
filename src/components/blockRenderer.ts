import { BlockTypes } from '../utils/notionTypes'
import { textRenderers, renderRichText } from '../renderers/text'
import { renderImage, renderVideo, renderFile, renderPDF, renderBookmark, renderEmbed, renderLinkPreview } from '../renderers/media'
import { renderCode } from '../renderers/code'
import { renderDatabase } from '../renderers/database'

// Main block renderer
export function renderBlocks(blocks) {
  if (!blocks || blocks.length === 0) {
    return '<div class="empty-state">No content</div>'
  }

  let html = ''
  let inList = false
  let listType = null

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    const nextBlock = blocks[i + 1]

    // Handle list grouping
    const isListItem = block.type === BlockTypes.BULLETED_LIST || block.type === BlockTypes.NUMBERED_LIST
    const currentListType = block.type === BlockTypes.BULLETED_LIST ? 'ul' : 'ol'

    if (isListItem) {
      if (!inList) {
        html += `<${currentListType}>`
        inList = true
        listType = currentListType
      } else if (listType !== currentListType) {
        html += `</${listType}>`
        html += `<${currentListType}>`
        listType = currentListType
      }
      html += renderBlock(block)
    } else {
      if (inList) {
        html += `</${listType}>`
        inList = false
        listType = null
      }
      html += renderBlock(block)
    }
  }

  // Close any open list
  if (inList) {
    html += `</${listType}>`
  }

  return html
}

// Render single block
function renderBlock(block) {
  const renderer = getRenderer(block.type)
  if (!renderer) {
    console.warn(`No renderer for block type: ${block.type}`)
    return ''
  }

  try {
    let html = renderer(block)

    // Handle column layout
    if (block.type === BlockTypes.COLUMN_LIST) {
      html = `<div class="column-list">${html}</div>`
    } else if (block.type === BlockTypes.COLUMN) {
      html = `<div class="column">${html}</div>`
    }

    // Handle table
    if (block.type === BlockTypes.TABLE) {
      html = `<div class="table-wrapper">${html}</div>`
    }

    return `<div class="block block-${block.type}" data-block-id="${block.id}">${html}</div>`
  } catch (e) {
    console.error(`Error rendering block ${block.id}:`, e)
    return ''
  }
}

// Get renderer for block type
function getRenderer(type) {
  // Text renderers
  if (textRenderers[type]) {
    return textRenderers[type]
  }

  // Media renderers
  switch (type) {
    case BlockTypes.IMAGE:
      return renderImage
    case BlockTypes.VIDEO:
      return renderVideo
    case BlockTypes.FILE:
      return renderFile
    case BlockTypes.PDF:
      return renderPDF
    case BlockTypes.BOOKMARK:
      return renderBookmark
    case BlockTypes.EMBED:
      return renderEmbed
    case BlockTypes.LINK_PREVIEW:
      return renderLinkPreview
    case BlockTypes.CODE:
      return renderCode
    case BlockTypes.TABLE:
      return renderTable
    case BlockTypes.TABLE_ROW:
      return renderTableRow
    case BlockTypes.COLUMN_LIST:
      return renderColumnList
    case BlockTypes.COLUMN:
      return renderColumn
    case BlockTypes.SYNCED_BLOCK:
      return renderSyncedBlock
    case BlockTypes.BREADCRUMB:
      return () => '' // Breadcrumb is handled separately
    default:
      return null
  }
}

// Render table
function renderTable(block) {
  // Tables are rendered with their children (table_row blocks)
  return '' // Content is in children
}

// Render table row
function renderTableRow(block) {
  if (!block.cells) return ''
  const cells = block.cells.map(cell => {
    const content = renderRichText(cell)
    return `<td>${content}</td>`
  }).join('')
  return `<tr>${cells}</tr>`
}

// Render column list
function renderColumnList(block) {
  return '' // Content is in children
}

// Render column
function renderColumn(block) {
  return '' // Content is in children
}

// Render synced block
function renderSyncedBlock(block) {
  return '' // Synced block content is fetched separately
}

// Render page content (for full page view)
export function renderPageContent(page, blocks) {
  const cover = page.cover
    ? `<div class="page-cover"><img src="${escapeAttr(page.cover)}" alt="Cover"></div>`
    : ''

  const icon = page.icon
    ? `<div class="page-icon">${page.icon}</div>`
    : ''

  const title = page.title || 'Untitled'

  return `
    ${cover}
    <div class="page-content">
      <header class="page-header">
        ${icon}
        <h1>${escapeHtml(title)}</h1>
      </header>
      <div class="page-blocks">
        ${renderBlocks(blocks)}
      </div>
    </div>
  `
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
