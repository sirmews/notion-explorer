import React, { useState, useEffect, useMemo, useRef } from 'react'
import { isConnected as checkIsConnected, redirectToNotion, handleCallback, exchangeCode, clearTokens } from './auth/oauth'
import { syncWorkspace, loadFileSystem, loadPage, loadDatabase, isSynced } from './sync/notionSync'
import { BlockRenderer } from './components/BlockRenderer'
import { DatabaseView } from './renderers/DatabaseView'
import { loadDemoWorkspace } from './sync/demoData'
import { getMetadata, clearAll } from './sync/opfs'
import { fallbackData } from './sync/fallbackData'

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

const SidebarTree: React.FC<SidebarTreeProps> = ({ fileSystemData, allFileData, activeItem, onSelectItem }) => {
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

// Format date helper
const formatDate = (d: string) => {
  if (!d) return '—'
  const date = new Date(d)
  if (isNaN(date.getTime())) return '—'
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
}

// App Component
const App: React.FC = () => {
  // ─── States ───
  const [isConnected, setIsConnected] = useState<boolean>(checkIsConnected())
  const [fileSystemData, setFileSystemData] = useState<any>(null)
  const [allFileData, setAllFileData] = useState<any[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number>(0)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [layout, setLayout] = useState<'list' | 'grid'>(() => {
    return (localStorage.getItem('layout') as 'list' | 'grid') || 'list'
  })
  const [navigationHistory, setNavigationHistory] = useState<any[]>([])
  const [historyIndex, setHistoryIndex] = useState<number>(-1)
  const [sidebarWidth, setSidebarWidth] = useState<number>(240)
  const [previewWidth, setPreviewWidth] = useState<number>(320)
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false)

  // Sync / Demo Statuses
  const [isSyncing, setIsSyncing] = useState<boolean>(false)
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 })
  const [isDemo, setIsDemo] = useState<boolean>(false)
  const [loadingDemo, setLoadingDemo] = useState<boolean>(false)

  // Preview Data State
  const [loadedPreviewData, setLoadedPreviewData] = useState<any>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, show: boolean }>({ x: 0, y: 0, show: false })

  // Draggables Resizers Refs
  const [isResizingLeft, setIsResizingLeft] = useState<boolean>(false)
  const [isResizingRight, setIsResizingRight] = useState<boolean>(false)

  // ─── Computed States ───
  const fileData = useMemo(() => {
    const normalizedQuery = searchQuery.toLowerCase().trim()
    if (!normalizedQuery) {
      return allFileData
    }
    return allFileData.filter((item: any) => {
      const matchesName = item.name ? item.name.toLowerCase().includes(normalizedQuery) : false
      const matchesKind = item.kind ? item.kind.toLowerCase().includes(normalizedQuery) : false
      const matchesTags = item.tags ? item.tags.some((t: any) => t && t.text && t.text.toLowerCase().includes(normalizedQuery)) : false
      return matchesName || matchesKind || matchesTags
    })
  }, [allFileData, searchQuery])

  const activeItem = useMemo(() => {
    if (selectedIndex >= 0 && selectedIndex < fileData.length) {
      return fileData[selectedIndex]
    }
    return null
  }, [fileData, selectedIndex])

  // Reset selectedIndex when search query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [searchQuery])

  // ─── Data Initialization ───
  const loadLocalData = async () => {
    const synced = await isSynced()
    if (!synced) {
      console.log('No synced data found, loading static fallback')
      setIsDemo(false)
      loadFallback()
      return
    }

    const meta = await getMetadata()
    setIsDemo(meta?.isDemo || false)

    const fs = await loadFileSystem()
    if (fs) {
      setFileSystemData(fs)
      renderFromFileSystem(fs)
    }
  }

  const loadFallback = () => {
    const initialAll = fallbackData.map((f: any) => ({
      id: f.id || null,
      name: f.name,
      icon: f.icon || '📄',
      kind: f.kind || 'Page',
      date: f.date || '',
      tags: f.tags || [],
      size: f.size || '',
      type: f.kind?.toLowerCase() || 'page',
      parent: f.parent || null,
      cover: f.cover || null,
      subtitle: f.subtitle || '',
      props: f.props || [],
      content: f.content || ''
    }))
    setAllFileData(initialAll)
    setSelectedIndex(0)
    setNavigationHistory([{ id: null, name: initialAll[0].name }])
    setHistoryIndex(0)
  }

  const renderFromFileSystem = (fs: any) => {
    const allItems = [
      ...fs.pages.map((p: any) => ({
        id: p.id,
        name: p.title,
        icon: p.icon,
        kind: 'Page',
        date: p.lastEditedTime || p.createdTime || '',
        tags: [],
        size: '',
        type: 'page',
        parent: p.parent
      })),
      ...fs.databases.map((d: any) => ({
        id: d.id,
        name: d.title,
        icon: d.icon,
        kind: 'Database',
        date: d.lastEditedTime || d.createdTime || '',
        tags: [{ text: 'Database', color: 'blue' }],
        size: '',
        type: 'database',
        parent: d.parent
      }))
    ]

    setAllFileData(allItems)
    if (allItems.length > 0) {
      setSelectedIndex(0)
      setNavigationHistory([{ id: allItems[0].id, name: allItems[0].name }])
      setHistoryIndex(0)
    }
  }

  // Handle OAuth and mount initialization
  useEffect(() => {
    const callbackResult = handleCallback()
    if (callbackResult?.code) {
      window.history.replaceState({}, document.title, window.location.origin + window.location.pathname)
      exchangeCode(callbackResult.code)
        .then(() => {
          setIsConnected(checkIsConnected())
          triggerSync(true)
        })
        .catch(err => console.error('Token exchange failed:', err))
    } else {
      loadLocalData()
    }
  }, [])

  // ─── Sync Workspace ───
  const triggerSync = async (isAutoSync = false) => {
    if (!checkIsConnected()) {
      if (!isAutoSync) {
        redirectToNotion()
      }
      return
    }

    setIsSyncing(true)
    setSyncProgress({ current: 0, total: 0 })
    try {
      const result = await syncWorkspace((progress, total) => {
        setSyncProgress({ current: progress, total })
      })
      console.log('Sync complete:', result)
      await loadLocalData()
    } catch (err) {
      console.error('Sync failed:', err)
    } finally {
      setIsSyncing(false)
    }
  }

  // ─── Load Preview Content ───
  useEffect(() => {
    if (!activeItem) {
      setLoadedPreviewData(null)
      setIsPreviewLoading(false)
      setPreviewError(null)
      return
    }

    if (!activeItem.id) {
      // Static fallback data
      setLoadedPreviewData({
        isStatic: true,
        cover: activeItem.cover || null,
        icon: activeItem.icon || '📄',
        name: activeItem.name,
        subtitle: activeItem.subtitle || '',
        props: activeItem.props || [],
        content: activeItem.content || ''
      })
      setIsPreviewLoading(false)
      setPreviewError(null)
      return
    }

    let active = true
    const loadContent = async () => {
      setIsPreviewLoading(true)
      setPreviewError(null)
      setLoadedPreviewData(null)
      try {
        if (activeItem.type === 'page') {
          const pageData = await loadPage(activeItem.id)
          if (!active) return
          if (pageData) {
            setLoadedPreviewData({
              isStatic: false,
              type: 'page',
              cover: pageData.cover || null,
              icon: pageData.icon || '📄',
              name: pageData.title || 'Untitled',
              subtitle: 'Notion Page',
              createdTime: pageData.createdTime,
              lastEditedTime: pageData.lastEditedTime,
              properties: pageData.properties,
              blocks: pageData.blocks || [],
              url: pageData.url
            })
          } else {
            setPreviewError('Page not found in local cache')
          }
        } else {
          const dbData = await loadDatabase(activeItem.id)
          if (!active) return
          if (dbData) {
            setLoadedPreviewData({
              isStatic: false,
              type: 'database',
              cover: dbData.cover || null,
              icon: dbData.icon || '📋',
              name: dbData.title || 'Untitled',
              subtitle: 'Notion Database',
              createdTime: dbData.createdTime,
              lastEditedTime: dbData.lastEditedTime,
              entries: dbData.entries || [],
              schema: dbData,
              url: dbData.url
            })
          } else {
            setPreviewError('Database not found in local cache')
          }
        }
      } catch (err) {
        console.error('Error loading preview:', err)
        if (active) {
          setPreviewError('Error loading preview content')
        }
      } finally {
        if (active) {
          setIsPreviewLoading(false)
        }
      }
    }

    loadContent()

    return () => {
      active = false
    }
  }, [activeItem])

  // ─── Listen to Filesystem Updates ───
  useEffect(() => {
    const handleFsUpdate = async () => {
      console.log('Local filesystem updated with on-demand child nodes. Refreshing view...')
      const fs = await loadFileSystem()
      if (fs) {
        setFileSystemData(fs)
        const currentActive = activeItem
        
        const allItems = [
          ...fs.pages.map((p: any) => ({
            id: p.id,
            name: p.title,
            icon: p.icon,
            kind: 'Page',
            date: p.lastEditedTime || p.createdTime || '',
            tags: [],
            size: '',
            type: 'page',
            parent: p.parent
          })),
          ...fs.databases.map((d: any) => ({
            id: d.id,
            name: d.title,
            icon: d.icon,
            kind: 'Database',
            date: d.lastEditedTime || d.createdTime || '',
            tags: [{ text: 'Database', color: 'blue' }],
            size: '',
            type: 'database',
            parent: d.parent
          }))
        ]
        
        setAllFileData(allItems)
        
        if (currentActive) {
          const matchedIdx = allItems.findIndex((f: any) => f.id === currentActive.id || f.name === currentActive.name)
          if (matchedIdx !== -1) {
            setSelectedIndex(matchedIdx)
          }
        }
      }
    }

    window.addEventListener('filesystem-updated', handleFsUpdate)
    return () => {
      window.removeEventListener('filesystem-updated', handleFsUpdate)
    }
  }, [activeItem])

  // ─── History Stack Navigation ───
  const selectItem = (item: any, pushHistory = true) => {
    if (!item) return

    let index = fileData.findIndex(f => f.id === item.id && f.name === item.name)

    if (index === -1) {
      setSearchQuery('')
      index = allFileData.findIndex(f => f.id === item.id || f.name === item.name)
    }

    if (index !== -1) {
      setSelectedIndex(index)
    }

    if (pushHistory) {
      pushToHistory(item)
    }
  }

  const selectItemByIndex = (index: number, pushHistory = true) => {
    if (index < 0 || index >= fileData.length) return
    setSelectedIndex(index)
    const item = fileData[index]

    if (pushHistory) {
      pushToHistory(item)
    }
  }

  const pushToHistory = (item: any) => {
    if (!item) return

    let newHistory = navigationHistory
    if (historyIndex < navigationHistory.length - 1) {
      newHistory = navigationHistory.slice(0, historyIndex + 1)
    }

    const currentEntry = newHistory[historyIndex]
    const itemIdentifier = { id: item.id || null, name: item.name }
    if (currentEntry && currentEntry.id === itemIdentifier.id && currentEntry.name === itemIdentifier.name) {
      return
    }

    const updated = [...newHistory, itemIdentifier]
    setNavigationHistory(updated)
    setHistoryIndex(updated.length - 1)
  }

  const findItemFromHistoryEntry = (entry: any) => {
    if (!entry) return null
    if (entry.id) {
      return allFileData.find(f => f.id === entry.id)
    }
    return allFileData.find(f => f.name === entry.name)
  }

  const handleGoBack = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1
      const targetEntry = navigationHistory[prevIndex]
      const item = findItemFromHistoryEntry(targetEntry)
      setHistoryIndex(prevIndex)
      if (item) {
        selectItem(item, false)
      }
    }
  }

  const handleGoForward = () => {
    if (historyIndex < navigationHistory.length - 1) {
      const nextIndex = historyIndex + 1
      const targetEntry = navigationHistory[nextIndex]
      const item = findItemFromHistoryEntry(targetEntry)
      setHistoryIndex(nextIndex)
      if (item) {
        selectItem(item, false)
      }
    }
  }

  // ─── Resizing Drag Logic ───
  useEffect(() => {
    if (!isResizingLeft && !isResizingRight) return

    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingLeft) {
        let newWidth = e.clientX
        if (newWidth < 150) newWidth = 150
        if (newWidth > 450) newWidth = 450
        setSidebarWidth(newWidth)
      } else if (isResizingRight) {
        let newWidth = window.innerWidth - e.clientX
        if (newWidth < 200) newWidth = 200
        if (newWidth > 500) newWidth = 500
        setPreviewWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      setIsResizingLeft(false)
      setIsResizingRight(false)
      document.body.style.userSelect = ''
      document.body.style.webkitUserSelect = ''
      document.body.style.cursor = ''
    }

    document.body.style.userSelect = 'none'
    document.body.style.webkitUserSelect = 'none'
    document.body.style.cursor = 'col-resize'

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizingLeft, isResizingRight])

  // ─── Keydown Navigation ───
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (fileData.length === 0) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, fileData.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [fileData])

  // Auto Scroll selected row into view
  useEffect(() => {
    const selectedRow = document.querySelector('.file-row.selected')
    if (selectedRow) {
      selectedRow.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  // Context Menu Helpers
  const handleRowContextMenu = (e: React.MouseEvent, idx: number) => {
    e.preventDefault()
    setSelectedIndex(idx)
    setContextMenu({
      x: e.pageX,
      y: e.pageY,
      show: true
    })
  }

  useEffect(() => {
    const closeMenu = () => {
      setContextMenu(prev => ({ ...prev, show: false }))
    }
    window.addEventListener('click', closeMenu)
    return () => window.removeEventListener('click', closeMenu)
  }, [])

  // ─── Path Bar Computed Items ───
  const getSyncedPath = (item: any) => {
    const path = []
    let current = item
    const visited = new Set()

    while (current) {
      if (current.id) {
        if (visited.has(current.id)) {
          break
        }
        visited.add(current.id)
      }

      path.push(current)

      let parentId = null
      if (current.parent) {
        if (current.parent.type === 'page_id') {
          parentId = current.parent.page_id
        } else if (current.parent.type === 'database_id') {
          parentId = current.parent.database_id
        }
      }

      if (parentId && fileSystemData) {
        const parentPage = fileSystemData.pages?.find((p: any) => p.id === parentId)
        const parentDb = fileSystemData.databases?.find((d: any) => d.id === parentId)
        const parentItem = parentPage || parentDb

        if (parentItem) {
          current = {
            id: parentItem.id,
            name: parentItem.title || parentItem.name,
            parent: parentItem.parent
          }
        } else {
          current = null
        }
      } else {
        current = null
      }
    }

    path.reverse()
    return [{ name: 'Workspace', isRoot: true }, ...path]
  }

  const pathItems = useMemo(() => {
    if (!activeItem) {
      return [{ name: 'Workspace', isRoot: true }]
    }

    if (activeItem.id) {
      return getSyncedPath(activeItem)
    } else {
      const items: any[] = [{ name: 'Workspace', isRoot: true }]
      let parentName = ''
      if (activeItem.subtitle && activeItem.subtitle.includes('·')) {
        const parts = activeItem.subtitle.split('·')
        parentName = parts[0].trim()
      }
      if (parentName) {
        items.push({ name: parentName })
      }
      items.push({ name: activeItem.name, id: activeItem.id })
      return items
    }
  }, [activeItem, fileSystemData])

  const handlePathItemClick = (pi: any) => {
    if (pi.name === 'Workspace') {
      if (allFileData.length > 0) {
        selectItem(allFileData[0])
      }
      return
    }

    let targetItem = null
    if (pi.id) {
      targetItem = allFileData.find(f => f.id === pi.id)
    }
    if (!targetItem && pi.name) {
      targetItem = allFileData.find(f => f.name === pi.name)
    }

    if (targetItem) {
      selectItem(targetItem)
    }
  }

  // ─── Demo Loader from Toolbar ───
  const handleLoadDemoWorkspace = async () => {
    setLoadingDemo(true)
    try {
      await loadDemoWorkspace()
      setIsDemo(true)
      await loadLocalData()
    } catch (err) {
      console.error('Failed to load demo workspace:', err)
    } finally {
      setLoadingDemo(false)
    }
  }

  // ─── Settings Handlers ───
  const handleNotionAction = async () => {
    if (isConnected) {
      clearTokens()
      await clearAll()
      setIsConnected(false)
      window.location.href = '/'
    } else {
      redirectToNotion()
    }
  }

  const handleClearCache = async () => {
    if (confirm("Are you sure you want to clear the local IndexedDB cache? This will reset all synced Notion files.")) {
      await clearAll()
      setNavigationHistory([])
      setHistoryIndex(-1)
      window.location.href = '/'
    }
  }

  const handleResetToDemo = async () => {
    if (confirm("Reset local storage and load the offline Demo Workspace data?")) {
      await loadDemoWorkspace()
      window.location.href = '/'
    }
  }

  // ─── Preview Content Render Helper ───
  const previewProps = useMemo(() => {
    if (!loadedPreviewData) return []
    return getPreviewProps(loadedPreviewData)
  }, [loadedPreviewData])

  const getPreviewProps = (data: any) => {
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

  const canGoBack = historyIndex > 0
  const canGoForward = historyIndex < navigationHistory.length - 1

  return (
    <div className="window">
      {/* Title Bar */}
      <div className="titlebar">
        <div className="traffic-lights">
          <div className="traffic-light close"></div>
          <div className="traffic-light minimize"></div>
          <div className="traffic-light maximize"></div>
        </div>
        <div className="titlebar-title">Notion Explorer</div>
        <div className="titlebar-spacer"></div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-group">
          <button 
            className={`toolbar-btn ${!canGoBack ? 'disabled' : ''}`} 
            title="Back"
            disabled={!canGoBack}
            style={{ opacity: canGoBack ? 1 : 0.4, pointerEvents: canGoBack ? 'auto' : 'none' }}
            onClick={handleGoBack}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button 
            className={`toolbar-btn ${!canGoForward ? 'disabled' : ''}`} 
            title="Forward"
            disabled={!canGoForward}
            style={{ opacity: canGoForward ? 1 : 0.4, pointerEvents: canGoForward ? 'auto' : 'none' }}
            onClick={handleGoForward}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <div className="toolbar-sep"></div>
        <div className="toolbar-group">
          <button 
            className={`toolbar-btn ${layout === 'list' ? 'active' : ''}`} 
            title="List View"
            onClick={() => { setLayout('list'); localStorage.setItem('layout', 'list'); }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M2 3h12M2 6.5h12M2 10h12M2 13.5h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          <button className="toolbar-btn" title="Column View" disabled style={{ opacity: 0.3 }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M2 2v12M7 2v12M12 2v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          <button 
            className={`toolbar-btn ${layout === 'grid' ? 'active' : ''}`} 
            title="Grid View"
            onClick={() => { setLayout('grid'); localStorage.setItem('layout', 'grid'); }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
              <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
              <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
              <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
            </svg>
          </button>
        </div>
        <div className="toolbar-sep"></div>
        <button className="toolbar-btn" title="New Page" style={{ fontSize: 16 }} disabled>+</button>
        <div className="search-box">
          <svg viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <input 
            type="text" 
            placeholder="Search" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="toolbar-sep"></div>
        <button 
          className={`toolbar-btn notion-btn ${isSyncing ? 'syncing' : ''}`} 
          id="demo-mode" 
          title="Load Demo Workspace (Local Offline Mode)"
          onClick={handleLoadDemoWorkspace}
          disabled={loadingDemo}
        >
          <span>{loadingDemo ? 'Loading...' : isDemo ? '✨ Loaded Demo' : '✨ Demo Mode'}</span>
        </button>
        <button 
          className={`toolbar-btn notion-btn ${isConnected ? 'connected' : ''} ${isSyncing ? 'syncing' : ''}`} 
          id="notion-connect" 
          title={isConnected ? 'Sync with Notion' : 'Connect to Notion'}
          onClick={() => triggerSync(false)}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M2 2h5l1 1h6v10H2V2z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M5 9h6M5 11.5h4" stroke="currentColor" stroke-width="1.2" strokeLinecap="round"/>
          </svg>
          <span className="notion-btn-label">
            {isSyncing ? 'Syncing...' : isConnected ? 'Sync' : 'Connect'}
          </span>
        </button>
      </div>

      {/* Path Bar */}
      <div className="pathbar">
        {pathItems.map((pi: any, idx: number) => {
          const isLast = idx === pathItems.length - 1
          return (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="pathbar-sep">›</span>}
              <span 
                className={`pathbar-item ${isLast ? 'current' : ''}`}
                onClick={() => handlePathItemClick(pi)}
              >
                {pi.name}
              </span>
            </React.Fragment>
          )
        })}
      </div>

      {/* Body */}
      <div className="body">
        {/* Sidebar */}
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
                onSelectItem={(item) => selectItem(item, true)}
              />
            </div>
          </div>
          <div className="sidebar-bottom">
            <div className="sidebar-item" data-page="settings" onClick={() => setIsSettingsOpen(true)}>
              <span className="icon">⚙️</span><span className="label">Settings</span>
            </div>
            <div className="sidebar-item" data-page="trash">
              <span className="icon">🗑️</span><span className="label">Trash</span>
            </div>
          </div>
        </div>

        {/* Left Resize Handle */}
        <div 
          className="resize-handle" 
          id="resize-left"
          onMouseDown={() => setIsResizingLeft(true)}
        ></div>

        {/* Main Content Explorer */}
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
                    onClick={() => selectItemByIndex(idx, true)}
                    onDoubleClick={() => {
                      if (f.id) {
                        window.open(`/page.html?id=${f.id}`, '_blank')
                      }
                    }}
                    onContextMenu={(e) => handleRowContextMenu(e, idx)}
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

        {/* Right Resize Handle */}
        <div 
          className="resize-handle" 
          id="resize-right"
          onMouseDown={() => setIsResizingRight(true)}
        ></div>

        {/* Preview Panel */}
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
                  <BlockRenderer blocks={loadedPreviewData.blocks} />
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
      </div>

      {/* Context Menu */}
      <div 
        className={`context-menu ${contextMenu.show ? 'show' : ''}`} 
        id="context-menu"
        style={{ left: contextMenu.x, top: contextMenu.y }}
      >
        <div 
          className="context-menu-item"
          onClick={() => {
            if (activeItem?.id) {
              window.open(`/page.html?id=${activeItem.id}`, '_blank')
            }
          }}
        >
          Open <span className="shortcut">⌘O</span>
        </div>
        <div 
          className="context-menu-item"
          onClick={() => {
            if (activeItem?.id) {
              window.open(`/page.html?id=${activeItem.id}`, '_blank')
            }
          }}
        >
          Open in New Tab <span className="shortcut">⌘⇧O</span>
        </div>
        <div className="context-menu-sep"></div>
        <div className="context-menu-item">Rename <span className="shortcut">Enter</span></div>
        <div className="context-menu-item">Duplicate <span className="shortcut">⌘D</span></div>
        <div className="context-menu-item">Move to… <span className="shortcut">⌘⇧M</span></div>
        <div className="context-menu-sep"></div>
        <div className="context-menu-item">Add to Favorites <span className="shortcut">⌘⇧F</span></div>
        <div className="context-menu-item">Copy Link <span className="shortcut">⌘L</span></div>
        <div className="context-menu-sep"></div>
        <div className="context-menu-item" style={{ color: '#dc2626' }}>Move to Trash <span className="shortcut">⌫</span></div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="modal-overlay" id="settings-modal" onClick={() => setIsSettingsOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Settings</span>
              <button className="modal-close" id="close-settings" onClick={() => setIsSettingsOpen(false)}>&times;</button>
            </div>
            <div className="modal-body">
              {/* Section: Notion Connection */}
              <div className="settings-section">
                <h3>Notion Connection</h3>
                <div className="connection-card">
                  <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`} id="notion-status">
                    <span className="status-dot"></span>
                    <span className="status-text">{isConnected ? 'Connected' : 'Disconnected'}</span>
                  </div>
                  <p className="settings-desc" id="notion-details">
                    {isConnected 
                      ? 'Successfully connected to your Notion workspace.' 
                      : 'Connect your Notion workspace to sync and view your pages live.'
                    }
                  </p>
                  <button 
                    className={`settings-btn ${isConnected ? 'dest-btn' : ''}`} 
                    id="notion-action-btn"
                    onClick={handleNotionAction}
                  >
                    {isConnected ? 'Disconnect' : 'Connect'}
                  </button>
                </div>
              </div>

              {/* Section: Cache Management */}
              <div className="settings-section">
                <h3>Local Cache</h3>
                <p className="settings-desc">Your Notion data is cached locally in IndexedDB for offline access and rapid navigation.</p>
                <div className="settings-actions">
                  <button className="settings-btn dest-btn" id="clear-cache-btn" onClick={handleClearCache}>Clear Local Cache</button>
                  <button className="settings-btn" id="load-demo-btn" onClick={handleResetToDemo}>Reset to Demo Data</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
