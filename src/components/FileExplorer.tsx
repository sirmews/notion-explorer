import React from 'react'

interface FileExplorerProps {
  layout: 'list' | 'grid'
  fileData: any[]
  selectedIndex: number
  onSelectItemByIndex: (idx: number, pushHistory?: boolean) => void
  onRowContextMenu: (e: React.MouseEvent, idx: number) => void
}

const formatDate = (d: string) => {
  if (!d) return '—'
  const date = new Date(d)
  if (isNaN(date.getTime())) return '—'
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  layout,
  fileData,
  selectedIndex,
  onSelectItemByIndex,
  onRowContextMenu
}) => {
  return (
    <div className="main">
      {layout !== 'grid' && (
        <div className="column-headers">
          <div className="col-header col-name">Name <span className="sort-arrow">▼</span></div>
          <div className="col-header col-kind">Kind</div>
          <div className="col-header col-date">Date Modified</div>
          <div className="col-header col-tags">Tags</div>
          <div className="col-header col-size">Size</div>
        </div>
      )}

      <div className={`file-list ${layout === 'grid' ? 'grid-view' : ''}`} id="file-list">
        {fileData.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🔍</div>
            <div className="text">No results found</div>
          </div>
        ) : (
          fileData.map((f: any, idx: number) => {
            const isSelected = idx === selectedIndex
            return (
              <div 
                key={f.id || f.name}
                className={`file-row ${isSelected ? 'selected' : ''}`}
                data-index={idx}
                onClick={() => onSelectItemByIndex(idx, true)}
                onDoubleClick={() => {
                  if (f.id) {
                    window.open(`/page.html?id=${f.id}`, '_blank')
                  }
                }}
                onContextMenu={(e) => onRowContextMenu(e, idx)}
              >
                <div className="file-cell name-cell">
                  <span className="file-icon">{f.icon}</span>
                  <span className="file-name">{f.name}</span>
                </div>
                <div className="file-cell kind-cell">{f.kind}</div>
                <div className="file-cell date-cell">{formatDate(f.date)}</div>
                <div className="file-cell tags-cell">
                  {f.tags?.map((t: any, tidx: number) => (
                    <span key={tidx} className={`tag ${t.color}`}>{t.text}</span>
                  ))}
                </div>
                <div className="file-cell size-cell">{f.size}</div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default FileExplorer
