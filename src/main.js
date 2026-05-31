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
      type: 'page'
    })),
    ...fs.databases.map(d => ({
      id: d.id,
      name: d.title,
      icon: d.icon,
      kind: 'Database',
      date: d.lastEditedTime || d.createdTime || '',
      tags: [{text: 'Database', color: 'blue'}],
      size: '',
      type: 'database'
    }))
  ]

  // Update master copy and render
  allFileData = [...allItems]
  const query = searchInput ? searchInput.value : ''
  filterAndRender(query)
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
  } else {
    selectedIndex = -1;
  }
  
  renderList();
  renderPreview(fileData[selectedIndex]);
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
      selectedIndex = parseInt(row.dataset.index);
      renderList();
      renderPreview(fileData[selectedIndex]);
    });
    row.addEventListener('dblclick', () => {
      selectedIndex = parseInt(row.dataset.index);
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

// Select first item by default
selectedIndex = 0;
renderList();
renderPreview(fileData[0]);

// Context menu
const contextMenu = document.getElementById('context-menu');
fileList.addEventListener('contextmenu', e => {
  e.preventDefault();
  const row = e.target.closest('.file-row');
  if (row) {
    selectedIndex = parseInt(row.dataset.index);
    renderList();
    renderPreview(fileData[selectedIndex]);
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
    selectedIndex = Math.min(selectedIndex + 1, fileData.length - 1);
    renderList();
    renderPreview(fileData[selectedIndex]);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    selectedIndex = Math.max(selectedIndex - 1, 0);
    renderList();
    renderPreview(fileData[selectedIndex]);
  }
});

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

// Initialize and load local data on load
await loadLocalData()
