import React from 'react'

const CellValue: React.FC<{ prop: any }> = ({ prop }) => {
  if (!prop) return null

  switch (prop.type) {
    case 'title':
      return <span className="cell-title">{prop.text || ''}</span>
    case 'rich_text':
      return <span className="cell-text">{prop.text || ''}</span>
    case 'number':
      return <span className="cell-number">{prop.number ?? ''}</span>
    case 'select':
      return prop.text ? (
        <span className="cell-select" style={{ background: `var(--notion-${prop.color}-background)` }}>
          {prop.text}
        </span>
      ) : null
    case 'multi_select':
      return (
        <>
          {prop.items?.map((item: any, idx: number) => (
            <span key={idx} className="cell-select" style={{ background: `var(--notion-${item.color}-background)`, marginRight: '4px' }}>
              {item.name}
            </span>
          ))}
        </>
      )
    case 'date':
      return <span className="cell-date">{prop.text || ''}</span>
    case 'checkbox':
      return <span className="cell-checkbox">{prop.checked ? '✓' : '○'}</span>
    case 'url':
      return prop.url ? (
        <a href={prop.url} target="_blank" rel="noopener noreferrer" className="cell-url">
          {prop.url}
        </a>
      ) : null
    case 'email':
      return prop.email ? (
        <a href={`mailto:${prop.email}`} className="cell-email">
          {prop.email}
        </a>
      ) : null
    case 'phone_number':
      return <span className="cell-phone">{prop.phone || ''}</span>
    case 'status':
      return prop.text ? (
        <span className="cell-status" style={{ background: `var(--notion-${prop.color}-background)` }}>
          {prop.text}
        </span>
      ) : null
    case 'people':
      return (
        <>
          {prop.people?.map((p: any, idx: number) => (
            <span key={idx} className="cell-person">
              {p.name || 'Unknown'}
              {idx < prop.people.length - 1 ? ', ' : ''}
            </span>
          ))}
        </>
      )
    default:
      return <span className="cell-text">{prop.text || ''}</span>
  }
}

interface DatabaseViewProps {
  database: any
  entries?: any[]
}

export const DatabaseView: React.FC<DatabaseViewProps> = ({ database, entries = [] }) => {
  if (!database || !database.properties) {
    return <div className="database-empty">No database schema</div>
  }

  const props = Object.entries(database.properties)
  if (props.length === 0) {
    return <div className="database-empty">No properties</div>
  }

  // Filter to displayable properties
  const displayProps = props.filter(([_, prop]) => {
    const p = prop as any
    const type = p.type
    return !['files', 'relation', 'rollup', 'created_time', 'created_by', 'last_edited_time', 'last_edited_by'].includes(type)
  }).slice(0, 6) // Limit to 6 columns

  return (
    <div className="database-view">
      <table className="database-table">
        <thead>
          <tr>
            {displayProps.map(([key, prop]) => (
              <th key={key} className="database-header">
                {(prop as any).name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 ? (
            <tr>
              <td colSpan={displayProps.length} className="database-empty-row">
                No entries
              </td>
            </tr>
          ) : (
            entries.map((entry) => (
              <tr key={entry.id} className="database-row" data-page-id={entry.id}>
                {displayProps.map(([key]) => (
                  <td key={key} className="database-cell">
                    <CellValue prop={entry.properties?.[key]} />
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
