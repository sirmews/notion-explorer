import { renderRichText } from './text.js'

// Render database as a table view
export function renderDatabase(database, entries = []) {
  if (!database || !database.properties) {
    return '<div class="database-empty">No database schema</div>'
  }

  const props = Object.entries(database.properties)
  if (props.length === 0) {
    return '<div class="database-empty">No properties</div>'
  }

  // Filter to displayable properties
  const displayProps = props.filter(([key, prop]) => {
    const type = prop.type
    return !['files', 'relation', 'rollup', 'created_time', 'created_by', 'last_edited_time', 'last_edited_by'].includes(type)
  }).slice(0, 6) // Limit to 6 columns

  return `
    <div class="database-view">
      <table class="database-table">
        <thead>
          <tr>
            ${displayProps.map(([key, prop]) => `
              <th class="database-header">${escapeHtml(prop.name)}</th>
            `).join('')}
          </tr>
        </thead>
        <tbody>
          ${entries.length === 0 ? `
            <tr>
              <td colspan="${displayProps.length}" class="database-empty-row">No entries</td>
            </tr>
          ` : entries.map(entry => `
            <tr class="database-row" data-page-id="${entry.id}">
              ${displayProps.map(([key, prop]) => `
                <td class="database-cell">
                  ${renderCellValue(entry.properties?.[key])}
                </td>
              `).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `
}

// Render cell value based on property type
function renderCellValue(prop) {
  if (!prop) return ''

  switch (prop.type) {
    case 'title':
      return `<span class="cell-title">${escapeHtml(prop.text || '')}</span>`
    case 'rich_text':
      return `<span class="cell-text">${escapeHtml(prop.text || '')}</span>`
    case 'number':
      return `<span class="cell-number">${prop.number ?? ''}</span>`
    case 'select':
      return prop.text ? `<span class="cell-select" style="background:var(--notion-${prop.color}-background)">${escapeHtml(prop.text)}</span>` : ''
    case 'multi_select':
      return prop.items?.map(item => 
        `<span class="cell-select" style="background:var(--notion-${item.color}-background)">${escapeHtml(item.name)}</span>`
      ).join(' ') || ''
    case 'date':
      return `<span class="cell-date">${escapeHtml(prop.text || '')}</span>`
    case 'checkbox':
      return `<span class="cell-checkbox">${prop.checked ? '✓' : '○'}</span>`
    case 'url':
      return prop.url ? `<a href="${escapeAttr(prop.url)}" target="_blank" class="cell-url">${escapeHtml(prop.url)}</a>` : ''
    case 'email':
      return prop.email ? `<a href="mailto:${escapeAttr(prop.email)}" class="cell-email">${escapeHtml(prop.email)}</a>` : ''
    case 'phone_number':
      return `<span class="cell-phone">${escapeHtml(prop.phone || '')}</span>`
    case 'status':
      return prop.text ? `<span class="cell-status" style="background:var(--notion-${prop.color}-background)">${escapeHtml(prop.text)}</span>` : ''
    case 'people':
      return prop.people?.map(p => 
        `<span class="cell-person">${escapeHtml(p.name || 'Unknown')}</span>`
      ).join(', ') || ''
    default:
      return `<span class="cell-text">${escapeHtml(prop.text || '')}</span>`
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
