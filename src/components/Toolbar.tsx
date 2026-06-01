import React from 'react'

interface ToolbarProps {
  canGoBack: boolean
  canGoForward: boolean
  onGoBack: () => void
  onGoForward: () => void
  layout: 'list' | 'grid'
  onChangeLayout: (layout: 'list' | 'grid') => void
  searchQuery: string
  onSearchQueryChange: (query: string) => void
  isSyncing: boolean
  loadingDemo: boolean
  isDemo: boolean
  isConnected: boolean
  onLoadDemoWorkspace: () => void
  onTriggerSync: () => void
}

export const Toolbar: React.FC<ToolbarProps> = ({
  canGoBack,
  canGoForward,
  onGoBack,
  onGoForward,
  layout,
  onChangeLayout,
  searchQuery,
  onSearchQueryChange,
  isSyncing,
  loadingDemo,
  isDemo,
  isConnected,
  onLoadDemoWorkspace,
  onTriggerSync
}) => {
  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button 
          className={`toolbar-btn ${!canGoBack ? 'disabled' : ''}`} 
          title="Back"
          disabled={!canGoBack}
          style={{ opacity: canGoBack ? 1 : 0.4, pointerEvents: canGoBack ? 'auto' : 'none' }}
          onClick={onGoBack}
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
          onClick={onGoForward}
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
          onClick={() => onChangeLayout('list')}
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
          onClick={() => onChangeLayout('grid')}
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
          onChange={(e) => onSearchQueryChange(e.target.value)}
        />
      </div>
      <div className="toolbar-sep"></div>
      <button 
        className={`toolbar-btn notion-btn ${isSyncing ? 'syncing' : ''}`} 
        id="demo-mode" 
        title="Load Demo Workspace (Local Offline Mode)"
        onClick={onLoadDemoWorkspace}
        disabled={loadingDemo}
      >
        <span>{loadingDemo ? 'Loading...' : isDemo ? '✨ Loaded Demo' : '✨ Demo Mode'}</span>
      </button>
      <button 
        className={`toolbar-btn notion-btn ${isConnected ? 'connected' : ''} ${isSyncing ? 'syncing' : ''}`} 
        id="notion-connect" 
        title={isConnected ? 'Sync with Notion' : 'Connect to Notion'}
        onClick={onTriggerSync}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M2 2h5l1 1h6v10H2V2z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M5 9h6M5 11.5h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
        <span className="notion-btn-label">
          {isSyncing ? 'Syncing...' : isConnected ? 'Sync' : 'Connect'}
        </span>
      </button>
    </div>
  )
}

export default Toolbar
