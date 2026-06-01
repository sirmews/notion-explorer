import React from 'react'

interface PathBarProps {
  pathItems: any[]
  onPathItemClick: (item: any) => void
}

export const PathBar: React.FC<PathBarProps> = ({ pathItems, onPathItemClick }) => {
  return (
    <div className="pathbar">
      {pathItems.map((pi: any, idx: number) => {
        const isLast = idx === pathItems.length - 1
        return (
          <React.Fragment key={idx}>
            {idx > 0 && <span className="pathbar-sep">›</span>}
            <span 
              className={`pathbar-item ${isLast ? 'current' : ''}`}
              onClick={() => onPathItemClick(pi)}
            >
              {pi.name}
            </span>
          </React.Fragment>
        )
      })}
    </div>
  )
}

export default PathBar
