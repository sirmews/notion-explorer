import React, { useState, useEffect } from 'react'

// Recursive Node Component for Synced Data
interface SidebarSyncedNodeProps {
  item: any
  allFileData: any[]
  getChildren: (parentId: string) => any[]
  activeItem: any
  onSelectItem: (item: any) => void
}

const SidebarSyncedNode: React.FC<SidebarSyncedNodeProps> = ({ item, allFileData, getChildren, activeItem, onSelectItem }) => {
  const children = getChildren(item.id)
  const hasChildren = children.length > 0
  const [isOpen, setIsOpen] = useState(false)

  // Automatically expand parent nodes if their child is selected
  useEffect(() => {
    if (activeItem && activeItem.id !== item.id) {
      let current = activeItem
      const visited = new Set()
      while (current) {
        if (current.id) {
          if (visited.has(current.id)) break
          visited.add(current.id)
        }
        let parentId = null
        if (current.parent) {
          if (current.parent.type === 'page_id') parentId = current.parent.page_id
          else if (current.parent.type === 'database_id') parentId = current.parent.database_id
        }
        if (parentId === item.id) {
          setIsOpen(true)
          break
        }
        current = allFileData.find(f => f.id === parentId)
      }
    }
  }, [activeItem, item.id, allFileData])

  const icon = item.icon || '📄'
  const name = item.name || 'Untitled'
  const isActive = activeItem && activeItem.id === item.id

  const handleItemClick = (e: React.MouseEvent) => {
    onSelectItem(item)
  }

  const handleChevronClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsOpen(!isOpen)
  }

  return (
    <div className="sidebar-node-container">
      <div 
        className={`sidebar-item ${isActive ? 'active' : ''}`}
        onClick={handleItemClick}
      >
        <span 
          className={`chevron ${isOpen ? 'open' : ''}`} 
          style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
          onClick={handleChevronClick}
        >
          ▶
        </span>
        <span className="icon">{icon}</span>
        <span className="label">{name}</span>
      </div>
      {hasChildren && isOpen && (
        <div className="sidebar-children">
          {children.map(child => (
            <SidebarSyncedNode 
              key={child.id}
              item={child}
              allFileData={allFileData}
              getChildren={getChildren}
              activeItem={activeItem}
              onSelectItem={onSelectItem}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Recursive Node Component for Static Fallback Data
interface SidebarFallbackNodeProps {
  node: any
  allFileData: any[]
  activeItem: any
  onSelectItem: (item: any) => void
}

const SidebarFallbackNode: React.FC<SidebarFallbackNodeProps> = ({ node, allFileData, activeItem, onSelectItem }) => {
  const [isOpen, setIsOpen] = useState(false)

  // Automatically expand folders if their child is selected
  useEffect(() => {
    if (activeItem && node.isFolder) {
      const isDescendant = (n: any): boolean => {
        if (!n.children) return false
        return n.children.some((child: any) => {
          if (child.name === activeItem.name) return true
          return isDescendant(child)
        })
      }
      if (isDescendant(node)) {
        setIsOpen(true)
      }
    }
  }, [activeItem, node])

  if (node.isFolder) {
    const icon = node.icon || '📁'
    
    const handleFolderClick = () => {
      setIsOpen(!isOpen)
    }

    return (
      <div className="sidebar-node-container">
        <div className="sidebar-item folder" onClick={handleFolderClick}>
          <span className={`chevron ${isOpen ? 'open' : ''}`}>▶</span>
          <span className="icon">{icon}</span>
          <span className="label">{node.name}</span>
        </div>
        {isOpen && node.children && (
          <div className="sidebar-children">
            {node.children.map((child: any, idx: number) => (
              <SidebarFallbackNode 
                key={idx}
                node={child}
                allFileData={allFileData}
                activeItem={activeItem}
                onSelectItem={onSelectItem}
              />
            ))}
          </div>
        )}
      </div>
    )
  } else {
    const backingItem = allFileData.find(f => f.name === node.name)
    const icon = backingItem ? (backingItem.icon || '📄') : '📄'
    const isActive = activeItem && activeItem.name === node.name

    const handleItemClick = () => {
      if (backingItem) {
        onSelectItem(backingItem)
      }
    }

    return (
      <div 
        className={`sidebar-item ${isActive ? 'active' : ''}`}
        onClick={handleItemClick}
      >
        <span className="chevron" style={{ visibility: 'hidden' }}>▶</span>
        <span className="icon">{icon}</span>
        <span className="label">{node.name}</span>
      </div>
    )
  }
}

// Fallback Tree Definition
const fallbackTree = [
  {
    name: 'Projects',
    icon: '📁',
    isFolder: true,
    children: [
      {
        name: 'Design System',
        icon: '📁',
        isFolder: true,
        children: [
          { name: 'Colors' },
          { name: 'Typography' },
          { name: 'Components' },
          { name: 'Brand Guidelines' },
          { name: 'Icon Set' }
        ]
      }
    ]
  },
  {
    name: 'Databases',
    icon: '📁',
    isFolder: true,
    children: [
      { name: 'Roadmap' },
      { name: 'Contacts' }
    ]
  },
  { name: 'Sprint Retrospective' }
]

// Main Sidebar Tree Component
interface SidebarTreeProps {
  fileSystemData: any
  allFileData: any[]
  activeItem: any
  onSelectItem: (item: any) => void
}

export const SidebarTree: React.FC<SidebarTreeProps> = ({ fileSystemData, allFileData, activeItem, onSelectItem }) => {
  const isSyncedData = fileSystemData && (fileSystemData.pages?.length > 0 || fileSystemData.databases?.length > 0)

  if (isSyncedData) {
    const allIds = new Set([
      ...(fileSystemData.pages?.map((p: any) => p.id) || []),
      ...(fileSystemData.databases?.map((d: any) => d.id) || [])
    ])

    const isRootLevel = (item: any) => {
      if (!item.parent || item.parent.type === 'workspace') {
        return true
      }
      let parentId = null
      if (item.parent.type === 'page_id') {
        parentId = item.parent.page_id
      } else if (item.parent.type === 'database_id') {
        parentId = item.parent.database_id
      }
      if (parentId && !allIds.has(parentId)) {
        return true
      }
      return false
    }

    const getChildren = (parentId: string) => {
      return allFileData.filter((f: any) => {
        if (!f.parent) return false
        let pid = null
        if (f.parent.type === 'page_id') pid = f.parent.page_id
        else if (f.parent.type === 'database_id') pid = f.parent.database_id
        return pid === parentId
      })
    }

    const roots = allFileData.filter(item => isRootLevel(item))

    return (
      <div className="sidebar-section-tree">
        {roots.map(root => (
          <SidebarSyncedNode 
            key={root.id}
            item={root}
            allFileData={allFileData}
            getChildren={getChildren}
            activeItem={activeItem}
            onSelectItem={onSelectItem}
          />
        ))}
      </div>
    )
  }

  // Fallback tree
  return (
    <div className="sidebar-section-tree">
      {fallbackTree.map((node, idx) => (
        <SidebarFallbackNode 
          key={idx}
          node={node}
          allFileData={allFileData}
          activeItem={activeItem}
          onSelectItem={onSelectItem}
        />
      ))}
    </div>
  )
}

interface SidebarProps {
  sidebarWidth: number
  fileSystemData: any
  allFileData: any[]
  activeItem: any
  onSelectItem: (item: any) => void
  onOpenSettings: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({
  sidebarWidth,
  fileSystemData,
  allFileData,
  activeItem,
  onSelectItem,
  onOpenSettings
}) => {
  return (
    <div className="sidebar" style={{ width: sidebarWidth }}>
      <div className="sidebar-scroll">
        <div className="sidebar-section">
          <div className="sidebar-label">Favorites</div>
          <div className="sidebar-item" data-page="inbox">
            <span className="icon">📥</span><span className="label">Inbox</span>
          </div>
          <div className="sidebar-item" data-page="daily">
            <span className="icon">📝</span><span className="label">Daily Notes</span>
          </div>
          <div className="sidebar-item" data-page="reading">
            <span className="icon">📚</span><span className="label">Reading List</span>
          </div>
        </div>
        <div className="sidebar-section" id="workspace-section">
          <div className="sidebar-label">Workspace</div>
          <SidebarTree 
            fileSystemData={fileSystemData}
            allFileData={allFileData}
            activeItem={activeItem}
            onSelectItem={onSelectItem}
          />
        </div>
      </div>
      <div className="sidebar-bottom">
        <div className="sidebar-item" data-page="settings" onClick={onOpenSettings}>
          <span className="icon">⚙️</span><span className="label">Settings</span>
        </div>
        <div className="sidebar-item" data-page="trash">
          <span className="icon">🗑️</span><span className="label">Trash</span>
        </div>
      </div>
    </div>
  )
}

export default Sidebar
