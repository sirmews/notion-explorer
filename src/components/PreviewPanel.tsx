import React, { useMemo } from 'react'
import { NotionRenderer } from 'react-notion-x'
import { DatabaseView } from '../renderers/DatabaseView'

interface PreviewPanelProps {
  previewWidth: number
  activeItem: any
  isPreviewLoading: boolean
  previewError: string | null
  loadedPreviewData: any
}

const formatDate = (d: string) => {
  if (!d) return '—'
  const date = new Date(d)
  if (isNaN(date.getTime())) return '—'
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
}

function getPreviewProps(data: any) {
  if (data.isStatic) {
    return data.props || []
  }
  const props = [
    { l: 'Created', v: formatDate(data.createdTime) },
    { l: 'Modified', v: formatDate(data.lastEditedTime) }
  ]
  if (data.type === 'page') {
    if (data.properties) {
      for (const [name, prop] of Object.entries(data.properties)) {
        const p = prop as any
        if (p.type === 'status' && p.status) {
          const color = p.status.color || 'gray'
          props.push({ l: name, v: `<span class="tag ${color}">${p.status.name}</span>` })
        } else if (p.type === 'select' && p.select) {
          const color = p.select.color || 'gray'
          props.push({ l: name, v: `<span class="tag ${color}">${p.select.name}</span>` })
        } else if (p.type === 'multi_select' && p.multi_select?.length > 0) {
          const tagsHtml = p.multi_select.map((sel: any) => `<span class="tag ${sel.color || 'gray'}">${sel.name}</span>`).join(' ')
          props.push({ l: name, v: tagsHtml })
        }
      }
    }
  } else if (data.type === 'database') {
    props.push({ l: 'Type', v: 'Database' })
    props.push({ l: 'Entries', v: `${data.entries?.length || 0} items` })
  }
  return props
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({
  previewWidth,
  activeItem,
  isPreviewLoading,
  previewError,
  loadedPreviewData
}) => {
  const previewProps = useMemo(() => {
    if (!loadedPreviewData) return []
    return getPreviewProps(loadedPreviewData)
  }, [loadedPreviewData])

  return (
    <div className="preview" id="preview" style={{ width: previewWidth }}>
      {!activeItem ? (
        <>
          <div className="preview-header">
            <div className="preview-cover img-1"></div>
            <div className="preview-icon">📄</div>
            <div className="preview-title">No Selection</div>
            <div className="preview-subtitle"></div>
          </div>
          <div className="preview-props"></div>
          <div className="preview-content">
            <div className="empty-state">
              <div className="icon">🔍</div>
              <div className="text">No results matching search</div>
            </div>
          </div>
        </>
      ) : isPreviewLoading ? (
        <>
          <div className="preview-header">
            <div className="preview-cover img-1"></div>
            <div className="preview-icon">{activeItem.icon || '📄'}</div>
            <div className="preview-title">{activeItem.name}</div>
            <div className="preview-subtitle">Loading...</div>
          </div>
          <div className="preview-props"></div>
          <div className="preview-content">
            <div style={{ padding: 20, color: 'var(--text-secondary)', textAlign: 'center' }}>
              Loading preview...
            </div>
          </div>
        </>
      ) : previewError ? (
        <>
          <div className="preview-header">
            <div className="preview-cover img-1"></div>
            <div className="preview-icon">⚠️</div>
            <div className="preview-title">{activeItem.name}</div>
            <div className="preview-subtitle">Error</div>
          </div>
          <div className="preview-props"></div>
          <div className="preview-content">
            <div className="empty-state" style={{ color: 'var(--system-red)' }}>
              {previewError}
            </div>
          </div>
        </>
      ) : loadedPreviewData ? (
        <>
          <div className="preview-header">
            {loadedPreviewData.cover && (loadedPreviewData.cover.startsWith('http://') || loadedPreviewData.cover.startsWith('https://')) ? (
              <div className="preview-cover" style={{ backgroundImage: `url(${loadedPreviewData.cover})` }}></div>
            ) : (
              <div className={`preview-cover ${loadedPreviewData.cover || 'img-1'}`}></div>
            )}
            <div className="preview-icon">{loadedPreviewData.icon || '📄'}</div>
            <div className="preview-title">{loadedPreviewData.name}</div>
            <div className="preview-subtitle">{loadedPreviewData.subtitle}</div>
          </div>
          
          <div className="preview-props">
            {previewProps.map((p: any, idx: number) => (
              <div className="preview-prop" key={idx}>
                <span className="preview-prop-label">{p.l}</span>
                <span className="preview-prop-value" dangerouslySetInnerHTML={{ __html: p.v }}></span>
              </div>
            ))}
          </div>

          <div className="preview-content">
            {loadedPreviewData.isStatic ? (
              <div dangerouslySetInnerHTML={{ __html: loadedPreviewData.content }}></div>
            ) : loadedPreviewData.type === 'page' ? (
              loadedPreviewData.recordMap ? (
                <NotionRenderer recordMap={loadedPreviewData.recordMap} fullPage={false} />
              ) : (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary)' }}>No content</div>
              )
            ) : (
              <DatabaseView database={loadedPreviewData.schema} entries={loadedPreviewData.entries} />
            )}
          </div>

          {loadedPreviewData.url && (
            <button 
              className="preview-action"
              onClick={() => window.open(loadedPreviewData.url, '_blank')}
            >
              Open in Notion
            </button>
          )}
        </>
      ) : null}
    </div>
  )
}

export default PreviewPanel
