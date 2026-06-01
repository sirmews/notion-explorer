import React, { useState, useEffect, useMemo } from 'react'
import { isConnected as checkIsConnected, redirectToNotion, handleCallback, exchangeCode, clearTokens } from './auth/oauth'
import { syncWorkspace, loadFileSystem, loadPage, loadDatabase, isSynced } from './sync/notionSync'
import { loadDemoWorkspace } from './sync/demoData'
import { getMetadata, clearAll } from './sync/opfs'
import { loadFallbackHelper, renderFromFileSystemHelper, getSyncedPathHelper } from './utils/explorerHelpers'
import TitleBar from './components/TitleBar'
import Toolbar from './components/Toolbar'
import Sidebar from './components/Sidebar'
import PathBar from './components/PathBar'
import FileExplorer from './components/FileExplorer'
import PreviewPanel from './components/PreviewPanel'
import SettingsModal from './components/SettingsModal'

const App: React.FC = () => {
  const [isConnected, setIsConnected] = useState<boolean>(checkIsConnected())
  const [fileSystemData, setFileSystemData] = useState<any>(null)
  const [allFileData, setAllFileData] = useState<any[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number>(0)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [layout, setLayout] = useState<'list' | 'grid'>(() => (localStorage.getItem('layout') as 'list' | 'grid') || 'list')
  const [navigationHistory, setNavigationHistory] = useState<any[]>([])
  const [historyIndex, setHistoryIndex] = useState<number>(-1)
  const [sidebarWidth, setSidebarWidth] = useState<number>(240)
  const [previewWidth, setPreviewWidth] = useState<number>(320)
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false)
  const [isSyncing, setIsSyncing] = useState<boolean>(false)
  const [, setSyncProgress] = useState({ current: 0, total: 0 })
  const [isDemo, setIsDemo] = useState<boolean>(false)
  const [loadingDemo, setLoadingDemo] = useState<boolean>(false)
  const [loadedPreviewData, setLoadedPreviewData] = useState<any>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState({ x: 0, y: 0, show: false })
  const [isResizingLeft, setIsResizingLeft] = useState<boolean>(false)
  const [isResizingRight, setIsResizingRight] = useState<boolean>(false)

  const fileData = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return q ? allFileData.filter(i => (i.name?.toLowerCase().includes(q) || i.kind?.toLowerCase().includes(q) || i.tags?.some((t: any) => t?.text?.toLowerCase().includes(q)))) : allFileData
  }, [allFileData, searchQuery])

  const activeItem = useMemo(() => (selectedIndex >= 0 && selectedIndex < fileData.length) ? fileData[selectedIndex] : null, [fileData, selectedIndex])

  useEffect(() => { setSelectedIndex(0) }, [searchQuery])

  const loadLocalData = async () => {
    if (!(await isSynced())) {
      setIsDemo(false)
      loadFallbackHelper(setAllFileData, setSelectedIndex, setNavigationHistory, setHistoryIndex)
      return
    }
    setIsDemo((await getMetadata())?.isDemo || false)
    const fs = await loadFileSystem()
    if (fs) {
      setFileSystemData(fs)
      const items = renderFromFileSystemHelper(fs)
      setAllFileData(items)
      if (items.length > 0) {
        setSelectedIndex(0)
        setNavigationHistory([{ id: items[0].id, name: items[0].name }])
        setHistoryIndex(0)
      }
    }
  }

  useEffect(() => {
    const cb = handleCallback()
    if (cb?.code) {
      window.history.replaceState({}, document.title, window.location.origin + window.location.pathname)
      exchangeCode(cb.code).then(() => { setIsConnected(checkIsConnected()); triggerSync(true) }).catch(err => console.error(err))
    } else { loadLocalData() }
  }, [])

  const triggerSync = async (auto = false) => {
    if (!checkIsConnected()) { if (!auto) redirectToNotion(); return }
    setIsSyncing(true)
    try {
      await syncWorkspace((current, total) => setSyncProgress({ current, total }))
      await loadLocalData()
    } catch (err) { console.error(err) } finally { setIsSyncing(false) }
  }

  useEffect(() => {
    if (!activeItem) { setLoadedPreviewData(null); setIsPreviewLoading(false); setPreviewError(null); return }
    if (!activeItem.id) {
      setLoadedPreviewData({ isStatic: true, cover: activeItem.cover || null, icon: activeItem.icon || '📄', name: activeItem.name, subtitle: activeItem.subtitle || '', props: activeItem.props || [], content: activeItem.content || '' })
      setIsPreviewLoading(false); setPreviewError(null); return
    }
    let active = true
    const load = async () => {
      setIsPreviewLoading(true); setPreviewError(null); setLoadedPreviewData(null)
      try {
        if (activeItem.type === 'page') {
          const res = await loadPage(activeItem.id)
          if (!active) return
          if (res) setLoadedPreviewData({ isStatic: false, type: 'page', cover: res.cover || null, icon: res.icon || '📄', name: res.title || 'Untitled', subtitle: 'Notion Page', createdTime: res.createdTime, lastEditedTime: res.lastEditedTime, properties: res.properties, blocks: res.blocks || [], url: res.url })
          else setPreviewError('Page not found in local cache')
        } else {
          const res = await loadDatabase(activeItem.id)
          if (!active) return
          if (res) setLoadedPreviewData({ isStatic: false, type: 'database', cover: res.cover || null, icon: res.icon || '📋', name: res.title || 'Untitled', subtitle: 'Notion Database', createdTime: res.createdTime, lastEditedTime: res.lastEditedTime, entries: res.entries || [], schema: res, url: res.url })
          else setPreviewError('Database not found in local cache')
        }
      } catch { if (active) setPreviewError('Error loading preview content') } finally { if (active) setIsPreviewLoading(false) }
    }
    load()
    return () => { active = false }
  }, [activeItem])

  useEffect(() => {
    const handleFsUpdate = async () => {
      const fs = await loadFileSystem()
      if (fs) {
        setFileSystemData(fs)
        const items = renderFromFileSystemHelper(fs)
        setAllFileData(items)
        if (activeItem) {
          const idx = items.findIndex((f: any) => f.id === activeItem.id || f.name === activeItem.name)
          if (idx !== -1) setSelectedIndex(idx)
        }
      }
    }
    window.addEventListener('filesystem-updated', handleFsUpdate)
    return () => window.removeEventListener('filesystem-updated', handleFsUpdate)
  }, [activeItem])

  const selectItem = (item: any, pushHist = true) => {
    if (!item) return
    let idx = fileData.findIndex(f => f.id === item.id && f.name === item.name)
    if (idx === -1) { setSearchQuery(''); idx = allFileData.findIndex(f => f.id === item.id || f.name === item.name) }
    if (idx !== -1) setSelectedIndex(idx)
    if (pushHist) {
      let hist = navigationHistory
      if (historyIndex < navigationHistory.length - 1) hist = navigationHistory.slice(0, historyIndex + 1)
      const curr = hist[historyIndex]
      if (!(curr && curr.id === item.id && curr.name === item.name)) {
        const nextHist = [...hist, { id: item.id || null, name: item.name }]
        setNavigationHistory(nextHist)
        setHistoryIndex(nextHist.length - 1)
      }
    }
  }

  const selectItemByIndex = (idx: number, pushHist = true) => {
    if (idx >= 0 && idx < fileData.length) { setSelectedIndex(idx); if (pushHist) selectItem(fileData[idx], true) }
  }

  const findItem = (entry: any) => entry ? (entry.id ? allFileData.find(f => f.id === entry.id) : allFileData.find(f => f.name === entry.name)) : null

  const handleGoBack = () => { if (historyIndex > 0) { const i = historyIndex - 1; setHistoryIndex(i); const item = findItem(navigationHistory[i]); if (item) selectItem(item, false) } }
  const handleGoForward = () => { if (historyIndex < navigationHistory.length - 1) { const i = historyIndex + 1; setHistoryIndex(i); const item = findItem(navigationHistory[i]); if (item) selectItem(item, false) } }

  useEffect(() => {
    if (!isResizingLeft && !isResizingRight) return
    const move = (e: MouseEvent) => {
      if (isResizingLeft) setSidebarWidth(Math.max(150, Math.min(450, e.clientX)))
      else if (isResizingRight) setPreviewWidth(Math.max(200, Math.min(500, window.innerWidth - e.clientX)))
    }
    const up = () => { setIsResizingLeft(false); setIsResizingRight(false); document.body.style.userSelect = ''; document.body.style.webkitUserSelect = ''; document.body.style.cursor = '' }
    document.body.style.userSelect = 'none'; document.body.style.webkitUserSelect = 'none'; document.body.style.cursor = 'col-resize'
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up)
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
  }, [isResizingLeft, isResizingRight])

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (fileData.length === 0) return
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(p => Math.min(p + 1, fileData.length - 1)) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(p => Math.max(p - 1, 0)) }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [fileData])

  useEffect(() => { document.querySelector('.file-row.selected')?.scrollIntoView({ block: 'nearest' }) }, [selectedIndex])

  useEffect(() => {
    const close = () => setContextMenu(p => ({ ...p, show: false }))
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  const pathItems = useMemo(() => {
    if (!activeItem) return [{ name: 'Workspace', isRoot: true }]
    if (activeItem.id) return getSyncedPathHelper(activeItem, fileSystemData)
    const items: any[] = [{ name: 'Workspace', isRoot: true }]
    const parentName = (activeItem.subtitle && activeItem.subtitle.includes('·')) ? activeItem.subtitle.split('·')[0].trim() : ''
    if (parentName) items.push({ name: parentName })
    items.push({ name: activeItem.name, id: activeItem.id })
    return items
  }, [activeItem, fileSystemData])

  const handlePathItemClick = (pi: any) => {
    if (pi.name === 'Workspace') { if (allFileData.length > 0) selectItem(allFileData[0]) }
    else { const t = allFileData.find(f => f.id === pi.id || f.name === pi.name); if (t) selectItem(t) }
  }

  const handleLoadDemoWorkspace = async () => {
    setLoadingDemo(true)
    try { await loadDemoWorkspace(); setIsDemo(true); await loadLocalData() } catch (err) { console.error(err) } finally { setLoadingDemo(false) }
  }

  const handleNotionAction = async () => {
    if (isConnected) { clearTokens(); await clearAll(); setIsConnected(false); window.location.href = '/' }
    else redirectToNotion()
  }

  const handleClearCache = async () => {
    if (confirm("Clear local IndexedDB cache?")) { await clearAll(); setNavigationHistory([]); setHistoryIndex(-1); window.location.href = '/' }
  }

  const handleResetToDemo = async () => {
    if (confirm("Reset and load offline Demo Workspace?")) { await loadDemoWorkspace(); window.location.href = '/' }
  }

  return (
    <div className="window">
      <TitleBar />
      <Toolbar
        canGoBack={historyIndex > 0} canGoForward={historyIndex < navigationHistory.length - 1}
        onGoBack={handleGoBack} onGoForward={handleGoForward} layout={layout}
        onChangeLayout={(lay) => { setLayout(lay); localStorage.setItem('layout', lay) }}
        searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} isSyncing={isSyncing}
        loadingDemo={loadingDemo} isDemo={isDemo} isConnected={isConnected}
        onLoadDemoWorkspace={handleLoadDemoWorkspace} onTriggerSync={() => triggerSync(false)}
      />
      <PathBar pathItems={pathItems} onPathItemClick={handlePathItemClick} />
      <div className="body">
        <Sidebar
          sidebarWidth={sidebarWidth} fileSystemData={fileSystemData} allFileData={allFileData}
          activeItem={activeItem} onSelectItem={(item) => selectItem(item, true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
        <div className="resize-handle" id="resize-left" onMouseDown={() => setIsResizingLeft(true)}></div>
        <FileExplorer
          layout={layout} fileData={fileData} selectedIndex={selectedIndex}
          onSelectItemByIndex={selectItemByIndex}
          onRowContextMenu={(e, idx) => { e.preventDefault(); setSelectedIndex(idx); setContextMenu({ x: e.pageX, y: e.pageY, show: true }) }}
        />
        <div className="resize-handle" id="resize-right" onMouseDown={() => setIsResizingRight(true)}></div>
        <PreviewPanel
          previewWidth={previewWidth} activeItem={activeItem} isPreviewLoading={isPreviewLoading}
          previewError={previewError} loadedPreviewData={loadedPreviewData}
        />
      </div>
      <div className={`context-menu ${contextMenu.show ? 'show' : ''}`} id="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
        <div className="context-menu-item" onClick={() => activeItem?.id && window.open(`/page.html?id=${activeItem.id}`, '_blank')}>Open <span className="shortcut">⌘O</span></div>
        <div className="context-menu-item" onClick={() => activeItem?.id && window.open(`/page.html?id=${activeItem.id}`, '_blank')}>Open in New Tab <span className="shortcut">⌘⇧O</span></div>
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
      <SettingsModal
        isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} isConnected={isConnected}
        onNotionAction={handleNotionAction} onClearCache={handleClearCache} onResetToDemo={handleResetToDemo}
      />
    </div>
  )
}

export default App
