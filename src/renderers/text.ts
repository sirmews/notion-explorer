import { BlockTypes } from '../utils/notionTypes'

// Render rich text with annotations
export function renderRichText(richTextArray) {
  if (!richTextArray || richTextArray.length === 0) return ''

  return richTextArray.map(text => {
    let content = escapeHtml(text.plain_text)

    // Apply annotations
    if (text.annotations) {
      const a = text.annotations
      if (a.code) content = `<code>${content}</code>`
      if (a.bold) content = `<strong>${content}</strong>`
      if (a.italic) content = `<em>${content}</em>`
      if (a.underline) content = `<u>${content}</u>`
      if (a.strikethrough) content = `<s>${content}</s>`
      if (a.color && a.color !== 'default') {
        content = `<span style="color:var(--notion-${a.color})">${content}</span>`
      }
    }

    // Add links
    if (text.href) {
      content = `<a href="${escapeHtml(text.href)}" target="_blank" rel="noopener">${content}</a>`
    }

    return content
  }).join('')
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// Get color CSS variable
function getColorVar(color) {
  const colors = {
    gray: '#787774',
    brown: '#937264',
    orange: '#d9730d',
    yellow: '#dfab01',
    green: '#4dab9a',
    blue: '#529cca',
    purple: '#9065b0',
    pink: '#c14c8a',
    red: '#e16259'
  }
  return colors[color] || 'inherit'
}

// Get background color CSS
function getBgColor(color) {
  const colors = {
    gray_background: 'rgba(120,119,116,0.07)',
    brown_background: 'rgba(147,114,100,0.07)',
    orange_background: 'rgba(217,115,13,0.07)',
    yellow_background: 'rgba(223,171,1,0.07)',
    green_background: 'rgba(77,171,154,0.07)',
    blue_background: 'rgba(82,156,202,0.07)',
    purple_background: 'rgba(144,101,176,0.07)',
    pink_background: 'rgba(193,76,138,0.07)',
    red_background: 'rgba(225,98,89,0.07)'
  }
  return colors[color] || 'transparent'
}

// Render paragraph
export function renderParagraph(block) {
  const content = renderRichText(block.richText)
  if (!content) return '<p><br></p>'
  return `<p>${content}</p>`
}

// Render heading
export function renderHeading(block) {
  const level = block.type === 'heading_1' ? 1 :
                block.type === 'heading_2' ? 2 : 3
  const content = renderRichText(block.richText)
  const tag = `h${level}`
  return `<${tag}>${content}</${tag}>`
}

// Render bulleted list
export function renderBulletedList(block) {
  const content = renderRichText(block.richText)
  return `<li class="bulleted">${content}</li>`
}

// Render numbered list
export function renderNumberedList(block) {
  const content = renderRichText(block.richText)
  return `<li class="numbered">${content}</li>`
}

// Render to-do
export function renderToDo(block) {
  const content = renderRichText(block.richText)
  const checked = block.checked ? 'checked' : ''
  return `
    <div class="todo-item">
      <input type="checkbox" ${checked} disabled>
      <span class="${checked ? 'done' : ''}">${content}</span>
    </div>
  `
}

// Render toggle
export function renderToggle(block) {
  const content = renderRichText(block.richText)
  return `
    <details class="toggle-block">
      <summary>${content}</summary>
      <div class="toggle-content"></div>
    </details>
  `
}

// Render quote
export function renderQuote(block) {
  const content = renderRichText(block.richText)
  return `<blockquote>${content}</blockquote>`
}

// Render callout
export function renderCallout(block) {
  const content = renderRichText(block.richText)
  const icon = block.icon?.type === 'emoji' ? block.icon.emoji : '💡'
  const bgColor = getBgColor(block.color)
  return `
    <div class="callout" style="background:${bgColor}">
      <span class="callout-icon">${icon}</span>
      <div class="callout-content">${content}</div>
    </div>
  `
}

// Render divider
export function renderDivider() {
  return '<hr>'
}

// Render child page reference
export function renderChildPage(block) {
  const title = block.title || 'Untitled'
  return `
    <a href="/page/${block.pageId}" class="child-page-link">
      <span class="icon">📄</span>
      <span class="title">${escapeHtml(title)}</span>
    </a>
  `
}

// Render child database reference
export function renderChildDatabase(block) {
  const title = block.title || 'Untitled Database'
  return `
    <a href="/page/${block.databaseId}" class="child-page-link database">
      <span class="icon">🗄️</span>
      <span class="title">${escapeHtml(title)}</span>
    </a>
  `
}

// Export all renderers
export const textRenderers = {
  [BlockTypes.PARAGRAPH]: renderParagraph,
  [BlockTypes.HEADING_1]: renderHeading,
  [BlockTypes.HEADING_2]: renderHeading,
  [BlockTypes.HEADING_3]: renderHeading,
  [BlockTypes.BULLETED_LIST]: renderBulletedList,
  [BlockTypes.NUMBERED_LIST]: renderNumberedList,
  [BlockTypes.TO_DO]: renderToDo,
  [BlockTypes.TOGGLE]: renderToggle,
  [BlockTypes.QUOTE]: renderQuote,
  [BlockTypes.CALLOUT]: renderCallout,
  [BlockTypes.DIVIDER]: renderDivider,
  [BlockTypes.CHILD_PAGE]: renderChildPage,
  [BlockTypes.CHILD_DATABASE]: renderChildDatabase
}
