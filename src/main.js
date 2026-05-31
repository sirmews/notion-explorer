import './style.css'
import { isConnected, redirectToNotion, handleCallback, exchangeCode } from './auth/oauth.js'
import { syncWorkspace, loadFileSystem, loadPage, loadDatabase, isSynced, getSyncStatus } from './sync/notionSync.js'
import { renderBlocks } from './components/blockRenderer.js'
import { renderDatabase } from './renderers/database.js'
import { loadDemoWorkspace } from './sync/demoData.js'
import { getMetadata } from './sync/opfs.js'

// Handle OAuth callback
const callbackResult = handleCallback()
if (callbackResult?.code) {
  // Clean URL immediately to prevent loops or re-runs
  window.history.replaceState({}, document.title, window.location.origin + window.location.pathname)
  
  exchangeCode(callbackResult.code)
    .then(() => {
      updateNotionButton()
      // Trigger initial sync after connecting (safe sync without redirect)
      handleSync(true)
    })
    .catch(err => console.error('Token exchange failed:', err))
}

// Notion connect/sync button
const notionBtn = document.getElementById('notion-connect')

function updateNotionButton() {
  if (!notionBtn) return
  const label = notionBtn.querySelector('.notion-btn-label')
  if (isConnected()) {
    notionBtn.classList.add('connected')
    if (label) label.textContent = 'Sync'
    notionBtn.title = 'Sync with Notion'
  } else {
    notionBtn.classList.remove('connected')
    if (label) label.textContent = 'Connect'
    notionBtn.title = 'Connect to Notion'
  }
}

// Handle sync
async function handleSync(isAutoSync = false) {
  if (!isConnected()) {
    if (!isAutoSync) {
      redirectToNotion()
    }
    return
  }

  const label = notionBtn?.querySelector('.notion-btn-label')
  if (label) label.textContent = 'Syncing...'
  notionBtn?.classList.add('syncing')

  try {
    const result = await syncWorkspace((progress, total) => {
      console.log(`Sync progress: ${progress}/${total}`)
    })
    console.log('Sync complete:', result)
    // Reload file system data
    await loadLocalData()
  } catch (err) {
    console.error('Sync failed:', err)
  } finally {
    if (label) label.textContent = 'Sync'
    notionBtn?.classList.remove('syncing')
  }
}

// Demo mode button
const demoBtn = document.getElementById('demo-mode')

async function handleLoadDemo() {
  const span = demoBtn?.querySelector('span')
  if (span) span.textContent = 'Loading...'
  demoBtn?.classList.add('syncing')

  try {
    const result = await loadDemoWorkspace()
    console.log('Demo workspace loaded:', result)
    if (span) span.textContent = '✨ Loaded Demo'
    // Reload file system data
    await loadLocalData()
  } catch (err) {
    console.error('Failed to load demo workspace:', err)
    if (span) span.textContent = 'Demo Failed'
  } finally {
    demoBtn?.classList.remove('syncing')
  }
}

demoBtn?.addEventListener('click', () => handleLoadDemo())

function updateDemoButton(isDemo) {
  const span = demoBtn?.querySelector('span')
  if (span) {
    span.textContent = isDemo ? '✨ Loaded Demo' : '✨ Demo Mode'
  }
}

notionBtn?.addEventListener('click', () => handleSync())

updateNotionButton()

// File system data
let fileSystemData = null
let allFileData = []
let searchInput = null

// Navigation history
let navigationHistory = []
let historyIndex = -1

function resetHistory() {
  navigationHistory = []
  historyIndex = -1
}

// Breadcrumbs pathbar helper for synced items
function getSyncedPath(item) {
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

    path.unshift(current)

    let parentId = null
    if (current.parent) {
      if (current.parent.type === 'page_id') {
        parentId = current.parent.page_id
      } else if (current.parent.type === 'database_id') {
        parentId = current.parent.database_id
      }
    }

    if (parentId && fileSystemData) {
      const parentPage = fileSystemData.pages.find(p => p.id === parentId)
      const parentDb = fileSystemData.databases.find(d => d.id === parentId)
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

  path.unshift({ name: 'Workspace', isRoot: true })
  return path
}

// Update the dynamic path bar
function updatePathBar(item) {
  const pathbar = document.querySelector('.pathbar')
  if (!pathbar) return

  let pathItems = []

  if (item) {
    if (item.id) {
      pathItems = getSyncedPath(item)
    } else {
      pathItems.push({ name: 'Workspace', isRoot: true })
      let parentName = ''
      if (item.subtitle && item.subtitle.includes('·')) {
        const parts = item.subtitle.split('·')
        parentName = parts[0].trim()
      }
      if (parentName) {
        pathItems.push({ name: parentName })
      }
      pathItems.push({ name: item.name, id: item.id })
    }
  } else {
    pathItems.push({ name: 'Workspace', isRoot: true })
  }

  pathbar.innerHTML = pathItems.map((pi, idx) => {
    const isLast = idx === pathItems.length - 1
    const classes = ['pathbar-item']
    if (isLast) classes.push('current')
    return `<span class="${classes.join(' ')}" data-id="${pi.id || ''}" data-name="${pi.name || ''}">${pi.name}</span>`
  }).join('<span class="pathbar-sep">›</span>')

  pathbar.querySelectorAll('.pathbar-item').forEach(span => {
    span.addEventListener('click', () => {
      const id = span.getAttribute('data-id')
      const name = span.getAttribute('data-name')
      if (name === 'Workspace') {
        if (allFileData.length > 0) {
          selectItem(allFileData[0])
        }
        return
      }

      let targetItem = null
      if (id) {
        targetItem = allFileData.find(f => f.id === id)
      }
      if (!targetItem && name) {
        targetItem = allFileData.find(f => f.name === name)
      }

      if (targetItem) {
        selectItem(targetItem)
      }
    })
  })
}

// History stack logic
function pushToHistory(item) {
  if (!item) return

  if (historyIndex < navigationHistory.length - 1) {
    navigationHistory = navigationHistory.slice(0, historyIndex + 1)
  }

  const currentEntry = navigationHistory[historyIndex]
  const itemIdentifier = { id: item.id || null, name: item.name }
  if (currentEntry && currentEntry.id === itemIdentifier.id && currentEntry.name === itemIdentifier.name) {
    return
  }

  navigationHistory.push(itemIdentifier)
  historyIndex = navigationHistory.length - 1

  updateNavigationButtons()
}

function updateNavigationButtons() {
  const backBtn = document.querySelector('[title="Back"]')
  const forwardBtn = document.querySelector('[title="Forward"]')

  if (backBtn) {
    const canGoBack = historyIndex > 0
    if (canGoBack) {
      backBtn.removeAttribute('disabled')
      backBtn.classList.remove('disabled')
      backBtn.style.opacity = '1'
      backBtn.style.pointerEvents = 'auto'
    } else {
      backBtn.setAttribute('disabled', 'true')
      backBtn.classList.add('disabled')
      backBtn.style.opacity = '0.4'
      backBtn.style.pointerEvents = 'none'
    }
  }

  if (forwardBtn) {
    const canGoForward = historyIndex < navigationHistory.length - 1
    if (canGoForward) {
      forwardBtn.removeAttribute('disabled')
      forwardBtn.classList.remove('disabled')
      forwardBtn.style.opacity = '1'
      forwardBtn.style.pointerEvents = 'auto'
    } else {
      forwardBtn.setAttribute('disabled', 'true')
      forwardBtn.classList.add('disabled')
      forwardBtn.style.opacity = '0.4'
      forwardBtn.style.pointerEvents = 'none'
    }
  }
}

function findItemFromHistoryEntry(entry) {
  if (!entry) return null
  if (entry.id) {
    return allFileData.find(f => f.id === entry.id)
  }
  return allFileData.find(f => f.name === entry.name)
}

function selectItem(item, pushHistory = true) {
  if (!item) return

  let index = fileData.indexOf(item)

  if (index === -1) {
    if (searchInput) {
      searchInput.value = ''
    }
    fileData.length = 0
    fileData.push(...allFileData)
    index = fileData.indexOf(item)
  }

  if (index !== -1) {
    selectedIndex = index
    renderList()
    renderPreview(item)
    updatePathBar(item)

    const selectedRow = fileList.querySelector(`.file-row[data-index="${selectedIndex}"]`)
    if (selectedRow) {
      selectedRow.scrollIntoView({ block: 'nearest' })
    }
  } else {
    renderPreview(item)
    updatePathBar(item)
  }

  if (pushHistory) {
    pushToHistory(item)
  }

  updateSidebarSelection(item)
}

function selectItemByIndex(index, pushHistory = true) {
  if (index < 0 || index >= fileData.length) return
  selectedIndex = index
  const item = fileData[selectedIndex]

  renderList()
  renderPreview(item)
  updatePathBar(item)

  if (pushHistory) {
    pushToHistory(item)
  }

  updateSidebarSelection(item)
}

// Load data from OPFS
async function loadLocalData() {
  const synced = await isSynced()
  if (!synced) {
    console.log('No synced data found')
    updateDemoButton(false)
    return
  }

  const meta = await getMetadata()
  updateDemoButton(meta?.isDemo || false)

  fileSystemData = await loadFileSystem()
  if (fileSystemData) {
    renderFromFileSystem(fileSystemData)
  }
}

// Render from file system data
function renderFromFileSystem(fs) {
  // Reset history navigation stack when loading a new filesystem structure
  resetHistory()

  // Build flat list for file view
  const allItems = [
    ...fs.pages.map(p => ({
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
    ...fs.databases.map(d => ({
      id: d.id,
      name: d.title,
      icon: d.icon,
      kind: 'Database',
      date: d.lastEditedTime || d.createdTime || '',
      tags: [{text: 'Database', color: 'blue'}],
      size: '',
      type: 'database',
      parent: d.parent
    }))
  ]

  // Update master copy and render
  allFileData = [...allItems]
  renderSidebarTree()
  const query = searchInput ? searchInput.value : ''
  filterAndRender(query)
}

function updateSidebarSelection(item) {
  // Remove active from all sidebar items in the entire sidebar
  document.querySelectorAll('.sidebar-item').forEach(el => {
    el.classList.remove('active')
  })

  if (!item) return

  // Find the sidebar item corresponding to this item inside workspaceSection
  const workspaceSection = document.getElementById('workspace-section')
  if (!workspaceSection) return

  let el = null
  if (item.id) {
    el = workspaceSection.querySelector(`.sidebar-item[data-id="${item.id}"]`)
  }
  if (!el && item.name) {
    el = workspaceSection.querySelector(`.sidebar-item[data-name="${item.name}"]`)
  }

  if (el) {
    el.classList.add('active')
    
    // Expand parents
    let parent = el.parentElement
    while (parent && parent !== workspaceSection) {
      if (parent.classList.contains('sidebar-children')) {
        parent.style.display = ''
        const folderEl = parent.previousElementSibling
        if (folderEl && folderEl.classList.contains('sidebar-item')) {
          const chevron = folderEl.querySelector('.chevron')
          if (chevron) {
            chevron.classList.add('open')
          }
        }
      }
      parent = parent.parentElement
    }
  }
}

function renderSidebarTree() {
  const workspaceSection = document.getElementById('workspace-section')
  if (!workspaceSection) return

  workspaceSection.innerHTML = '<div class="sidebar-label">Workspace</div>'

  const isSyncedData = fileSystemData && (fileSystemData.pages?.length > 0 || fileSystemData.databases?.length > 0)

  if (isSyncedData) {
    // Synced data from OPFS
    const allIds = new Set([
      ...fileSystemData.pages.map(p => p.id),
      ...fileSystemData.databases.map(d => d.id)
    ])

    const isRootLevel = (item) => {
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

    const getChildren = (parentId) => {
      return allFileData.filter(f => {
        if (!f.parent) return false
        let pid = null
        if (f.parent.type === 'page_id') pid = f.parent.page_id
        else if (f.parent.type === 'database_id') pid = f.parent.database_id
        return pid === parentId
      })
    }

    const renderedIds = new Set()

    const buildSyncedNode = (item) => {
      if (renderedIds.has(item.id)) return ''
      renderedIds.add(item.id)

      const children = getChildren(item.id)
      const hasChildren = children.length > 0

      let chevronHtml = ''
      if (hasChildren) {
        chevronHtml = `<span class="chevron">▶</span>`
      } else {
        chevronHtml = `<span class="chevron" style="visibility: hidden;">▶</span>`
      }

      const icon = item.icon || '📄'
      const name = item.name || 'Untitled'

      let html = `
        <div class="sidebar-item" data-id="${item.id}">
          ${chevronHtml}
          <span class="icon">${icon}</span>
          <span class="label">${name}</span>
        </div>
      `

      if (hasChildren) {
        const childrenHtml = children.map(child => buildSyncedNode(child)).join('')
        html += `
          <div class="sidebar-children" style="display: none;">
            ${childrenHtml}
          </div>
        `
      }

      return html
    }

    const roots = allFileData.filter(item => isRootLevel(item))
    const treeHtml = roots.map(root => buildSyncedNode(root)).join('')
    
    const treeContainer = document.createElement('div')
    treeContainer.innerHTML = treeHtml
    workspaceSection.appendChild(treeContainer)

  } else {
    // Static fallback data
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

    const buildFallbackNode = (node) => {
      if (node.isFolder) {
        const chevronHtml = `<span class="chevron">▶</span>`
        const icon = node.icon || '📁'
        const childrenHtml = node.children.map(child => buildFallbackNode(child)).join('')

        return `
          <div class="sidebar-item folder" data-folder-name="${node.name}">
            ${chevronHtml}
            <span class="icon">${icon}</span>
            <span class="label">${node.name}</span>
          </div>
          <div class="sidebar-children" style="display: none;">
            ${childrenHtml}
          </div>
        `
      } else {
        const backingItem = allFileData.find(f => f.name === node.name)
        const icon = backingItem ? (backingItem.icon || '📄') : '📄'
        const id = backingItem ? (backingItem.id || '') : ''

        return `
          <div class="sidebar-item" data-name="${node.name}" data-id="${id}">
            <span class="chevron" style="visibility: hidden;">▶</span>
            <span class="icon">${icon}</span>
            <span class="label">${node.name}</span>
          </div>
        `
      }
    }

    const treeHtml = fallbackTree.map(node => buildFallbackNode(node)).join('')
    
    const treeContainer = document.createElement('div')
    treeContainer.innerHTML = treeHtml
    workspaceSection.appendChild(treeContainer)
  }

  // Connect events
  const toggleChildren = (itemEl) => {
    const chevron = itemEl.querySelector('.chevron')
    if (chevron) {
      chevron.classList.toggle('open')
    }
    const children = itemEl.nextElementSibling
    if (children && children.classList.contains('sidebar-children')) {
      children.style.display = children.style.display === 'none' ? '' : 'none'
    }
  }

  const sidebarItems = workspaceSection.querySelectorAll('.sidebar-item')
  sidebarItems.forEach(itemEl => {
    itemEl.addEventListener('click', (e) => {
      const isChevron = e.target.classList.contains('chevron')
      if (isChevron) {
        e.stopPropagation()
        toggleChildren(itemEl)
        return
      }

      const isFolder = itemEl.classList.contains('folder')
      if (isFolder) {
        toggleChildren(itemEl)
        return
      }

      const id = itemEl.getAttribute('data-id')
      const name = itemEl.getAttribute('data-name')

      let targetItem = null
      if (id) {
        targetItem = allFileData.find(f => f.id === id)
      } else if (name) {
        targetItem = allFileData.find(f => f.name === name)
      }

      if (targetItem) {
        selectItem(targetItem)
      }
    })
  })

  // Set active selection highlight
  const selectedItem = selectedIndex !== -1 ? fileData[selectedIndex] : null
  if (selectedItem) {
    updateSidebarSelection(selectedItem)
  }
}

// Fallback sample data
const fileData = [
  { name:"Colors", icon:"🎨", kind:"Page", date:"2026-05-20", tags:[{text:"Design",color:"purple"}], size:"2.4 KB", cover:"img-3", subtitle:"Design System · Page",
    props:[{l:"Created",v:"Jan 8, 2026"},{l:"Modified",v:"May 20, 2026"},{l:"Status",v:'<span class="tag green">Complete</span>'}],
    content:`<div class="preview-block h2">Color Palette</div>
<div class="preview-block">Our design system uses a semantic color palette organized by purpose rather than hue. Each color maps to a specific meaning in the UI.</div>
<div class="preview-block h2">Core Colors</div>
<div class="preview-block bullet">Primary: #007AFF (interactive elements)</div>
<div class="preview-block bullet">Success: #34C759 (positive states)</div>
<div class="preview-block bullet">Warning: #FF9500 (caution states)</div>
<div class="preview-block bullet">Danger: #FF3B30 (destructive actions)</div>
<div class="preview-block">Dark mode variants are generated automatically using HSL color shifts. Contrast ratios meet WCAG AA standards.</div>`
  },
  { name:"Typography", icon:"🔤", kind:"Page", date:"2026-05-18", tags:[{text:"Design",color:"purple"}], size:"1.8 KB", cover:"img-5", subtitle:"Design System · Page",
    props:[{l:"Created",v:"Jan 10, 2026"},{l:"Modified",v:"May 18, 2026"},{l:"Status",v:'<span class="tag green">Complete</span>'}],
    content:`<div class="preview-block h2">Type Scale</div>
<div class="preview-block">We use a modular type scale based on a 1.25 ratio. All sizes are defined as CSS custom properties for easy theming.</div>
<div class="preview-block h2">Font Stack</div>
<div class="preview-block code">--font-sans: -apple-system, BlinkMacSystemFont,
  "SF Pro Text", "Segoe UI", sans-serif;
--font-mono: "SF Mono", "Menlo", "Consolas",
  monospace;</div>
<div class="preview-block">Headings use SF Pro Display for tighter tracking at large sizes. Body text uses SF Pro Text optimized for reading.</div>`
  },
  { name:"Components", icon:"🧩", kind:"Page", date:"2026-05-28", tags:[{text:"Design",color:"purple"},{text:"UI",color:"blue"}], size:"3.1 KB", cover:"img-2", subtitle:"Design System · Page",
    props:[{l:"Created",v:"Mar 12, 2026"},{l:"Modified",v:"May 28, 2026"},{l:"Status",v:'<span class="tag green">In Progress</span>'}],
    content:`<div class="preview-block h2">Component Library</div>
<div class="preview-block">A comprehensive set of reusable UI components for our design system. Each component includes variants, states, and documentation.</div>
<div class="preview-block h2">Status</div>
<div class="preview-block todo done">Buttons — complete</div>
<div class="preview-block todo done">Inputs — complete</div>
<div class="preview-block todo">Modals — in progress</div>
<div class="preview-block todo">Navigation — not started</div>
<div class="preview-block todo">Data tables — not started</div>
<div class="preview-block h2">Usage</div>
<div class="preview-block code">import { Button } from '@design/ui';

&lt;Button variant="primary"&gt;
  Click me
&lt;/Button&gt;</div>`
  },
  { name:"Brand Guidelines", icon:"📐", kind:"Page", date:"2026-04-15", tags:[{text:"Design",color:"purple"},{text:"Brand",color:"orange"}], size:"4.7 KB", cover:"img-4", subtitle:"Design System · Page",
    props:[{l:"Created",v:"Feb 2, 2026"},{l:"Modified",v:"Apr 15, 2026"},{l:"Status",v:'<span class="tag blue">Review</span>'}],
    content:`<div class="preview-block h2">Brand Voice</div>
<div class="preview-block">Our brand speaks with clarity and confidence. We are technical but approachable, precise but not cold.</div>
<div class="preview-block h2">Logo Usage</div>
<div class="preview-block">The logo should always have a minimum clear space of 1.5x the icon height. Never stretch, rotate, or apply effects to the logo.</div>
<div class="preview-block bullet">Primary: Full color on light backgrounds</div>
<div class="preview-block bullet">Reversed: White on dark backgrounds</div>
<div class="preview-block bullet">Monochrome: Single color for restricted palettes</div>`
  },
  { name:"Icon Set", icon:"✨", kind:"Page", date:"2026-03-22", tags:[{text:"Design",color:"purple"}], size:"1.2 KB", cover:"img-6", subtitle:"Design System · Page",
    props:[{l:"Created",v:"Mar 1, 2026"},{l:"Modified",v:"Mar 22, 2026"},{l:"Status",v:'<span class="tag green">Complete</span>'}],
    content:`<div class="preview-block h2">Icon Library</div>
<div class="preview-block">48 custom icons designed at 24×24 grid. All icons use 1.5px stroke weight with rounded caps and joins.</div>
<div class="preview-block h2">Categories</div>
<div class="preview-block bullet">Navigation (12 icons)</div>
<div class="preview-block bullet">Actions (16 icons)</div>
<div class="preview-block bullet">Objects (12 icons)</div>
<div class="preview-block bullet">Status (8 icons)</div>`
  },
  { name:"Roadmap", icon:"🗺️", kind:"Database", date:"2026-05-25", tags:[{text:"Planning",color:"green"},{text:"Q2 2026",color:"blue"}], size:"8.3 KB", cover:"img-5", subtitle:"Database · Roadmap",
    props:[{l:"Created",v:"Jan 1, 2026"},{l:"Modified",v:"May 25, 2026"},{l:"Type",v:"Database"},{l:"Entries",v:"24 items"}],
    content:`<div class="preview-block h2">Q2 2026 Roadmap</div>
<div class="preview-block">Product roadmap tracking all major initiatives for the quarter. Updated weekly in sprint planning.</div>
<div class="preview-block h2">In Progress</div>
<div class="preview-block todo done">Design system v2 launch</div>
<div class="preview-block todo">Mobile app beta release</div>
<div class="preview-block todo">API rate limiting</div>
<div class="preview-block h2">Up Next</div>
<div class="preview-block todo">SSO integration</div>
<div class="preview-block todo">Webhook system</div>`
  },
  { name:"Contacts", icon:"👥", kind:"Database", date:"2026-05-10", tags:[{text:"People",color:"green"}], size:"12.1 KB", cover:"img-4", subtitle:"Database · Contacts",
    props:[{l:"Created",v:"Dec 15, 2025"},{l:"Modified",v:"May 10, 2026"},{l:"Type",v:"Database"},{l:"Entries",v:"156 contacts"}],
    content:`<div class="preview-block h2">Team Directory</div>
<div class="preview-block">Company-wide contact database with roles, departments, and communication preferences.</div>
<div class="preview-block h2">Departments</div>
<div class="preview-block bullet">Engineering — 42 people</div>
<div class="preview-block bullet">Design — 12 people</div>
<div class="preview-block bullet">Product — 8 people</div>
<div class="preview-block bullet">Marketing — 18 people</div>
<div class="preview-block bullet">Operations — 14 people</div>`
  },
  { name:"Sprint Retrospective", icon:"🔄", kind:"Page", date:"2026-05-22", tags:[{text:"Meeting",color:"yellow"},{text:"Team",color:"green"}], size:"1.5 KB", cover:"img-7", subtitle:"Page",
    props:[{l:"Created",v:"May 22, 2026"},{l:"Modified",v:"May 22, 2026"},{l:"Status",v:'<span class="tag green">Done</span>'}],
    content:`<div class="preview-block h2">Sprint 14 Retrospective</div>
<div class="preview-block h2">What went well</div>
<div class="preview-block bullet">Shipped design system tokens on schedule</div>
<div class="preview-block bullet">Cross-team collaboration improved significantly</div>
<div class="preview-block bullet">Zero P0 incidents this sprint</div>
<div class="preview-block h2">What to improve</div>
<div class="preview-block bullet">Reduce context switching between projects</div>
<div class="preview-block bullet">Better async communication for remote team members</div>`
  },
];

const fileList = document.getElementById('file-list');
const preview = document.getElementById('preview');
let selectedIndex = -1;

allFileData = [...fileData];
searchInput = document.querySelector('.search-box input');

function filterAndRender(query = '') {
  const normalizedQuery = query.toLowerCase().trim();
  
  let filtered;
  if (!normalizedQuery) {
    filtered = [...allFileData];
  } else {
    filtered = allFileData.filter(item => {
      const matchesName = item.name ? item.name.toLowerCase().includes(normalizedQuery) : false;
      const matchesKind = item.kind ? item.kind.toLowerCase().includes(normalizedQuery) : false;
      const matchesTags = item.tags ? item.tags.some(t => t && t.text && t.text.toLowerCase().includes(normalizedQuery)) : false;
      return matchesName || matchesKind || matchesTags;
    });
  }
  
  // Update active fileData array in place
  fileData.length = 0;
  fileData.push(...filtered);
  
  if (fileData.length > 0) {
    selectedIndex = 0;
    renderList();
    renderPreview(fileData[selectedIndex]);
    updatePathBar(fileData[selectedIndex]);
    if (navigationHistory.length === 0) {
      pushToHistory(fileData[selectedIndex]);
    }
    updateSidebarSelection(fileData[selectedIndex]);
  } else {
    selectedIndex = -1;
    renderList();
    renderPreview(null);
    updatePathBar(null);
    updateSidebarSelection(null);
  }
  updateNavigationButtons();
}

if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    filterAndRender(e.target.value);
  });
}

function formatDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function renderList() {
  if (fileData.length === 0) {
    fileList.innerHTML = `
      <div class="empty-state">
        <div class="icon">🔍</div>
        <div class="text">No results found</div>
      </div>
    `;
    return;
  }

  fileList.innerHTML = fileData.map((f, i) => `
    <div class="file-row${i === selectedIndex ? ' selected' : ''}" data-index="${i}">
      <div class="file-cell name-cell">
        <span class="file-icon">${f.icon}</span>
        <span class="file-name">${f.name}</span>
      </div>
      <div class="file-cell kind-cell">${f.kind}</div>
      <div class="file-cell date-cell">${formatDate(f.date)}</div>
      <div class="file-cell tags-cell">${f.tags.map(t => `<span class="tag ${t.color}">${t.text}</span>`).join('')}</div>
      <div class="file-cell size-cell">${f.size}</div>
    </div>
  `).join('');

  document.querySelectorAll('.file-row').forEach(row => {
    row.addEventListener('click', () => {
      const idx = parseInt(row.dataset.index);
      selectItemByIndex(idx, true);
    });
    row.addEventListener('dblclick', () => {
      const idx = parseInt(row.dataset.index);
      selectItemByIndex(idx, true);
      const item = fileData[selectedIndex];
      // Open page in new tab
      if (item && item.id) {
        window.open(`/page.html?id=${item.id}`, '_blank');
      }
    });
  });
}

async function renderPreview(item) {
  if (!item) {
    const coverEl = preview.querySelector('.preview-cover');
    if (coverEl) {
      coverEl.style.backgroundImage = '';
      coverEl.className = 'preview-cover img-1';
    }
    const iconEl = preview.querySelector('.preview-icon');
    if (iconEl) iconEl.textContent = '📄';
    const titleEl = preview.querySelector('.preview-title');
    if (titleEl) titleEl.textContent = 'No Selection';
    const subtitleEl = preview.querySelector('.preview-subtitle');
    if (subtitleEl) subtitleEl.textContent = '';
    const propsEl = preview.querySelector('.preview-props');
    if (propsEl) propsEl.innerHTML = '';
    const contentEl = preview.querySelector('.preview-content');
    if (contentEl) {
      contentEl.innerHTML = `
        <div class="empty-state">
          <div class="icon">🔍</div>
          <div class="text">No results matching search</div>
        </div>
      `;
    }
    const actionBtn = preview.querySelector('.preview-action');
    if (actionBtn) actionBtn.style.display = 'none';
    return;
  }

  const actionBtn = preview.querySelector('.preview-action');
  if (actionBtn) actionBtn.style.display = '';

  // Set cover background if item has an external or file url cover, otherwise fallback to class
  const coverEl = preview.querySelector('.preview-cover');
  if (item.cover && (item.cover.startsWith('http://') || item.cover.startsWith('https://'))) {
    coverEl.className = 'preview-cover';
    coverEl.style.backgroundImage = `url(${item.cover})`;
  } else {
    coverEl.style.backgroundImage = '';
    coverEl.className = 'preview-cover ' + (item.cover || 'img-1');
  }

  preview.querySelector('.preview-icon').textContent = item.icon || '📄';
  preview.querySelector('.preview-title').textContent = item.name;

  const subtitleEl = preview.querySelector('.preview-subtitle');
  const propsEl = preview.querySelector('.preview-props');
  const contentEl = preview.querySelector('.preview-content');

  if (item.id) {
    // This is a synced item from OPFS
    subtitleEl.textContent = item.type === 'page' ? 'Notion Page' : 'Notion Database';
    propsEl.innerHTML = '<div style="padding: 10px; color: var(--text-secondary);">Loading properties...</div>';
    contentEl.innerHTML = '<div style="padding: 20px; color: var(--text-secondary); text-align: center;">Loading preview...</div>';

    try {
      if (item.type === 'page') {
        const pageData = await loadPage(item.id);
        if (pageData) {
          // Add standard system properties
          const props = [
            { l: 'Created', v: formatDate(pageData.createdTime) },
            { l: 'Modified', v: formatDate(pageData.lastEditedTime) }
          ];

          // Set cover if the page has one
          if (pageData.cover) {
            coverEl.className = 'preview-cover';
            coverEl.style.backgroundImage = `url(${pageData.cover})`;
          }

          // Read page properties
          if (pageData.properties) {
            for (const [name, prop] of Object.entries(pageData.properties)) {
              if (prop.type === 'status' && prop.status) {
                const color = prop.status.color || 'gray';
                props.push({ l: name, v: `<span class="tag ${color}">${prop.status.name}</span>` });
              } else if (prop.type === 'select' && prop.select) {
                const color = prop.select.color || 'gray';
                props.push({ l: name, v: `<span class="tag ${color}">${prop.select.name}</span>` });
              } else if (prop.type === 'multi_select' && prop.multi_select?.length > 0) {
                const tagsHtml = prop.multi_select.map(sel => `<span class="tag ${sel.color || 'gray'}">${sel.name}</span>`).join(' ');
                props.push({ l: name, v: tagsHtml });
              }
            }
          }

          propsEl.innerHTML = props.map(p => `
            <div class="preview-prop">
              <span class="preview-prop-label">${p.l}</span>
              <span class="preview-prop-value">${p.v}</span>
            </div>
          `).join('');

          // Render blocks using the imported renderBlocks
          contentEl.innerHTML = renderBlocks(pageData.blocks || []);
        } else {
          propsEl.innerHTML = '';
          contentEl.innerHTML = '<div class="empty-state">Page not found in local cache</div>';
        }
      } else {
        // Database
        const dbData = await loadDatabase(item.id);
        if (dbData) {
          const props = [
            { l: 'Created', v: formatDate(dbData.createdTime) },
            { l: 'Modified', v: formatDate(dbData.lastEditedTime) },
            { l: 'Type', v: 'Database' },
            { l: 'Entries', v: `${dbData.entries?.length || 0} items` }
          ];

          if (dbData.cover) {
            coverEl.className = 'preview-cover';
            coverEl.style.backgroundImage = `url(${dbData.cover})`;
          }

          propsEl.innerHTML = props.map(p => `
            <div class="preview-prop">
              <span class="preview-prop-label">${p.l}</span>
              <span class="preview-prop-value">${p.v}</span>
            </div>
          `).join('');

          // Render database table
          contentEl.innerHTML = renderDatabase(dbData, dbData.entries || []);
        } else {
          propsEl.innerHTML = '';
          contentEl.innerHTML = '<div class="empty-state">Database not found in local cache</div>';
        }
      }
    } catch (e) {
      console.error('Error rendering preview:', e);
      propsEl.innerHTML = '<div style="color: var(--system-red);">Error loading properties</div>';
      contentEl.innerHTML = '<div style="color: var(--system-red);">Error loading preview content</div>';
    }
  } else {
    // Static fallback sample data
    subtitleEl.textContent = item.subtitle || '';
    propsEl.innerHTML = item.props.map(p => `
      <div class="preview-prop">
        <span class="preview-prop-label">${p.l}</span>
        <span class="preview-prop-value">${p.v}</span>
      </div>
    `).join('');
    contentEl.innerHTML = item.content;
  }
}

// Render the initial workspace sidebar tree
renderSidebarTree();

// Select first item by default
if (fileData.length > 0) {
  selectItemByIndex(0, true);
} else {
  updatePathBar(null);
  updateNavigationButtons();
}

// Context menu
const contextMenu = document.getElementById('context-menu');
fileList.addEventListener('contextmenu', e => {
  e.preventDefault();
  const row = e.target.closest('.file-row');
  if (row) {
    const idx = parseInt(row.dataset.index);
    selectItemByIndex(idx, true);
  }
  contextMenu.style.left = e.pageX + 'px';
  contextMenu.style.top = e.pageY + 'px';
  contextMenu.classList.add('show');
});
document.addEventListener('click', () => contextMenu.classList.remove('show'));

// Keyboard navigation
document.addEventListener('keydown', e => {
  if (fileData.length === 0) return;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    const nextIdx = Math.min(selectedIndex + 1, fileData.length - 1);
    selectItemByIndex(nextIdx, true);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    const prevIdx = Math.max(selectedIndex - 1, 0);
    selectItemByIndex(prevIdx, true);
  }
});

// Back/Forward button event listeners
const backBtn = document.querySelector('[title="Back"]');
if (backBtn) {
  backBtn.addEventListener('click', () => {
    if (historyIndex > 0) {
      historyIndex--;
      const targetEntry = navigationHistory[historyIndex];
      const item = findItemFromHistoryEntry(targetEntry);
      if (item) {
        selectItem(item, false);
      } else {
        updateNavigationButtons();
      }
    }
  });
}

const forwardBtn = document.querySelector('[title="Forward"]');
if (forwardBtn) {
  forwardBtn.addEventListener('click', () => {
    if (historyIndex < navigationHistory.length - 1) {
      historyIndex++;
      const targetEntry = navigationHistory[historyIndex];
      const item = findItemFromHistoryEntry(targetEntry);
      if (item) {
        selectItem(item, false);
      } else {
        updateNavigationButtons();
      }
    }
  });
}

// Sidebar active state
document.querySelectorAll('.sidebar-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
  });
});

// Sidebar chevron toggle
document.querySelectorAll('.sidebar-item .chevron').forEach(chevron => {
  chevron.parentElement.addEventListener('click', e => {
    chevron.classList.toggle('open');
    const children = chevron.closest('.sidebar-item')?.nextElementSibling;
    if (children && children.classList.contains('sidebar-children')) {
      children.style.display = children.style.display === 'none' ? '' : 'none';
    }
  });
});

// Draggable Sidebars / Resizers
const resizeLeft = document.getElementById('resize-left');
const resizeRight = document.getElementById('resize-right');
const sidebar = document.querySelector('.sidebar');
const previewPanel = document.querySelector('.preview');

if (resizeLeft && sidebar) {
  resizeLeft.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const startWidth = sidebar.getBoundingClientRect().width;
    const startX = e.clientX;
    
    // Add visual feedback and block text selection during drag
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    document.body.style.cursor = 'col-resize';
    
    const onMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      let newWidth = startWidth + deltaX;
      if (newWidth < 150) newWidth = 150;
      if (newWidth > 450) newWidth = 450;
      sidebar.style.width = `${newWidth}px`;
    };
    
    const onMouseUp = () => {
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
}

if (resizeRight && previewPanel) {
  resizeRight.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const startWidth = previewPanel.getBoundingClientRect().width;
    const startX = e.clientX;
    
    // Add visual feedback and block text selection during drag
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    document.body.style.cursor = 'col-resize';
    
    const onMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      let newWidth = startWidth - deltaX;
      if (newWidth < 200) newWidth = 200;
      if (newWidth > 500) newWidth = 500;
      previewPanel.style.width = `${newWidth}px`;
    };
    
    const onMouseUp = () => {
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
}

// Layout View Toggle Logic (Phase 4)
const listViewBtn = document.querySelector('[title="List View"]');
const gridViewBtn = document.querySelector('[title="Grid View"]');

function applyLayout(layout) {
  if (layout === 'grid') {
    if (gridViewBtn) gridViewBtn.classList.add('active');
    if (listViewBtn) listViewBtn.classList.remove('active');
    if (fileList) fileList.classList.add('grid-view');
  } else {
    if (listViewBtn) listViewBtn.classList.add('active');
    if (gridViewBtn) gridViewBtn.classList.remove('active');
    if (fileList) fileList.classList.remove('grid-view');
  }
}

if (gridViewBtn) {
  gridViewBtn.addEventListener('click', () => {
    applyLayout('grid');
    localStorage.setItem('layout', 'grid');
  });
}

if (listViewBtn) {
  listViewBtn.addEventListener('click', () => {
    applyLayout('list');
    localStorage.setItem('layout', 'list');
  });
}

// Initial layout apply on startup
const savedLayout = localStorage.getItem('layout') || 'list';
applyLayout(savedLayout);

// Initialize and load local data on load
await loadLocalData()
