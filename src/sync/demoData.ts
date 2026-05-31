import { writeFile, setMetadata } from './opfs'

export async function loadDemoWorkspace() {
  const syncTime = new Date().toISOString()

  // 1. Create File System Structure
  const fs = {
    pages: [
      {
        id: 'demo-welcome',
        title: 'Welcome to Notion Explorer 👋',
        icon: '👋',
        parent: null,
        hasChildren: false,
        createdTime: '2026-05-20T10:00:00.000Z',
        lastEditedTime: '2026-05-30T14:30:00.000Z'
      },
      {
        id: 'demo-architecture',
        title: 'Core Features & Architecture 🚀',
        icon: '🚀',
        parent: null,
        hasChildren: false,
        createdTime: '2026-05-21T09:15:00.000Z',
        lastEditedTime: '2026-05-29T11:20:00.000Z'
      }
    ],
    databases: [
      {
        id: 'demo-tasks-db',
        title: 'Sprint Tasks Tracker 📋',
        icon: '📋',
        parent: null,
        createdTime: '2026-05-18T08:00:00.000Z',
        lastEditedTime: '2026-05-31T09:00:00.000Z'
      }
    ]
  }

  await writeFile('/filesystem.json', fs)

  // 2. Create Welcome Page
  const welcomePage = {
    id: 'demo-welcome',
    type: 'page',
    title: 'Welcome to Notion Explorer 👋',
    icon: '👋',
    cover: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    parent: { type: 'workspace', workspace: true },
    createdTime: '2026-05-20T10:00:00.000Z',
    lastEditedTime: '2026-05-30T14:30:00.000Z',
    properties: {
      Name: {
        id: 'title',
        type: 'title',
        title: [{ type: 'text', text: { content: 'Welcome to Notion Explorer 👋' }, plain_text: 'Welcome to Notion Explorer 👋' }]
      },
      Status: {
        id: 'status',
        type: 'status',
        status: { id: 'done', name: 'Complete', color: 'green' }
      }
    },
    blocks: [
      {
        id: 'w-b1',
        type: 'heading_1',
        heading_1: {
          rich_text: [{ type: 'text', text: { content: 'Reimagining Notion as a File System' }, plain_text: 'Reimagining Notion as a File System' }]
        }
      },
      {
        id: 'w-b2',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            { type: 'text', text: { content: 'Notion Explorer is a local-first web application that visualizes your ' }, plain_text: 'Notion Explorer is a local-first web application that visualizes your ' },
            { type: 'text', text: { content: 'Notion workspace' }, annotations: { bold: true }, plain_text: 'Notion workspace' },
            { type: 'text', text: { content: ' as a classic desktop file system like macOS Finder or Windows Explorer.' }, plain_text: ' as a classic desktop file system like macOS Finder or Windows Explorer.' }
          ]
        }
      },
      {
        id: 'w-b3',
        type: 'callout',
        callout: {
          icon: { type: 'emoji', emoji: '💡' },
          color: 'blue_background',
          rich_text: [{ type: 'text', text: { content: 'Tip: Double-click any item in the file list to open it in a distractions-free full page viewer in a new tab!' }, plain_text: 'Tip: Double-click any item in the file list to open it in a distractions-free full page viewer in a new tab!' }]
        }
      },
      {
        id: 'w-b4',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: 'Core Tech Stack' }, plain_text: 'Core Tech Stack' }]
        }
      },
      {
        id: 'w-b5',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: 'This app is designed for maximum speed, leveraging modern browser APIs to provide desktop-grade performance.' }, plain_text: 'This app is designed for maximum speed, leveraging modern browser APIs to provide desktop-grade performance.' }]
        }
      },
      {
        id: 'w-b6',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            { type: 'text', text: { content: 'Vite' }, annotations: { bold: true }, plain_text: 'Vite' },
            { type: 'text', text: { content: ' for lightning-fast development, bundling, and hot module reloading.' }, plain_text: ' for lightning-fast development, bundling, and hot module reloading.' }
          ]
        }
      },
      {
        id: 'w-b7',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            { type: 'text', text: { content: 'Origin Private File System (OPFS)' }, annotations: { bold: true }, plain_text: 'Origin Private File System (OPFS)' },
            { type: 'text', text: { content: ' for storing and reading your workspace data locally at near-native disk speeds.' }, plain_text: ' for storing and reading your workspace data locally at near-native disk speeds.' }
          ]
        }
      },
      {
        id: 'w-b8',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            { type: 'text', text: { content: 'IndexedDB Fallback' }, annotations: { bold: true }, plain_text: 'IndexedDB Fallback' },
            { type: 'text', text: { content: ' ensures complete reliability on older browsers or environments where OPFS isn\'t supported.' }, plain_text: ' ensures complete reliability on older browsers or environments where OPFS isn\'t supported.' }
          ]
        }
      },
      {
        id: 'w-b9',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            { type: 'text', text: { content: 'Vanilla JavaScript' }, annotations: { bold: true }, plain_text: 'Vanilla JavaScript' },
            { type: 'text', text: { content: ' with no heavy frameworks (no React/Vue) to guarantee absolute minimal overhead and raw rendering speed.' }, plain_text: ' with no heavy frameworks (no React/Vue) to guarantee absolute minimal overhead and raw rendering speed.' }
          ]
        }
      },
      {
        id: 'w-b10',
        type: 'divider',
        divider: {}
      },
      {
        id: 'w-b11',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: 'Code Example' }, plain_text: 'Code Example' }]
        }
      },
      {
        id: 'w-b12',
        type: 'code',
        code: {
          language: 'javascript',
          rich_text: [{
            type: 'text',
            text: {
              content: `// Dynamic local cache loading with fallback\nimport { loadPage } from './sync/notionSync';\n\nasync function displayPreview(pageId) {\n  const cachedPage = await loadPage(pageId);\n  if (cachedPage) {\n    renderBlocks(cachedPage.blocks);\n  } else {\n    console.log('Loading from Notion API...');\n  }\n}`
            },
            plain_text: `// Dynamic local cache loading with fallback\nimport { loadPage } from './sync/notionSync';\n\nasync function displayPreview(pageId) {\n  const cachedPage = await loadPage(pageId);\n  if (cachedPage) {\n    renderBlocks(cachedPage.blocks);\n  } else {\n    console.log('Loading from Notion API...');\n  }\n}`
          }]
        }
      }
    ],
    url: 'https://notion.so/demo-welcome'
  }

  await writeFile('/pages/demo-welcome.json', welcomePage)

  // 3. Create Architecture Page
  const archPage = {
    id: 'demo-architecture',
    type: 'page',
    title: 'Core Features & Architecture 🚀',
    icon: '🚀',
    cover: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=1200&q=80',
    parent: { type: 'workspace', workspace: true },
    createdTime: '2026-05-21T09:15:00.000Z',
    lastEditedTime: '2026-05-29T11:20:00.000Z',
    properties: {
      Name: {
        id: 'title',
        type: 'title',
        title: [{ type: 'text', text: { content: 'Core Features & Architecture 🚀' }, plain_text: 'Core Features & Architecture 🚀' }]
      },
      Status: {
        id: 'status',
        type: 'status',
        status: { id: 'inprogress', name: 'In Progress', color: 'blue' }
      }
    },
    blocks: [
      {
        id: 'a-b1',
        type: 'heading_1',
        heading_1: {
          rich_text: [{ type: 'text', text: { content: 'How it Works Under the Hood' }, plain_text: 'How it Works Under the Hood' }]
        }
      },
      {
        id: 'a-b2',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: 'When you trigger a workspace synchronization, Notion Explorer executes a multi-step routine to optimize data structure and rendering efficiency:' }, plain_text: 'When you trigger a workspace synchronization, Notion Explorer executes a multi-step routine to optimize data structure and rendering efficiency:' }]
        }
      },
      {
        id: 'a-b3',
        type: 'quote',
        quote: {
          rich_text: [{ type: 'text', text: { content: 'By caching everything into a localized browser filesystem, page transitions and block previews are virtually instantaneous.' }, annotations: { italic: true }, plain_text: 'By caching everything into a localized browser filesystem, page transitions and block previews are virtually instantaneous.' }]
        }
      },
      {
        id: 'a-b4',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: 'Feature Implementation Checklist' }, plain_text: 'Feature Implementation Checklist' }]
        }
      },
      {
        id: 'a-b5',
        type: 'to_do',
        to_do: {
          checked: true,
          rich_text: [{ type: 'text', text: { content: 'macOS Finder-like triple panel layout (Sidebar, List, Preview)' }, plain_text: 'macOS Finder-like triple panel layout (Sidebar, List, Preview)' }]
        }
      },
      {
        id: 'a-b6',
        type: 'to_do',
        to_do: {
          checked: true,
          rich_text: [{ type: 'text', text: { content: 'Origin Private File System (OPFS) local storage integration' }, plain_text: 'Origin Private File System (OPFS) local storage integration' }]
        }
      },
      {
        id: 'a-b7',
        type: 'to_do',
        to_do: {
          checked: true,
          rich_text: [{ type: 'text', text: { content: 'IndexedDB robust fallback layer' }, plain_text: 'IndexedDB robust fallback layer' }]
        }
      },
      {
        id: 'a-b8',
        type: 'to_do',
        to_do: {
          checked: true,
          rich_text: [{ type: 'text', text: { content: 'Robust multi-type block render dispatcher (headings, lists, code, databases)' }, plain_text: 'Robust multi-type block render dispatcher (headings, lists, code, databases)' }]
        }
      },
      {
        id: 'a-b9',
        type: 'to_do',
        to_do: {
          checked: false,
          rich_text: [{ type: 'text', text: { content: 'Bidirectional sync (local page edits synced back to Notion)' }, plain_text: 'Bidirectional sync (local page edits synced back to Notion)' }]
        }
      },
      {
        id: 'a-b10',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: 'Child Database Component Embedding' }, plain_text: 'Child Database Component Embedding' }]
        }
      },
      {
        id: 'a-b11',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: 'Notion Explorer supports nesting child databases as interactive tables right inside your page viewer:' }, plain_text: 'Notion Explorer supports nesting child databases as interactive tables right inside your page viewer:' }]
        }
      },
      {
        id: 'a-b12',
        type: 'child_database',
        databaseId: 'demo-tasks-db',
        child_database: {
          title: 'Embedded Task Tracker'
        }
      }
    ],
    url: 'https://notion.so/demo-architecture'
  }

  await writeFile('/pages/demo-architecture.json', archPage)

  // 4. Create Tasks Database
  const tasksDatabase = {
    id: 'demo-tasks-db',
    type: 'database',
    title: 'Sprint Tasks Tracker 📋',
    icon: '📋',
    cover: 'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?auto=format&fit=crop&w=1200&q=80',
    description: [{ type: 'text', text: { content: 'Product backlog and feature implementation checklist for Notion Explorer.' }, plain_text: 'Product backlog and feature implementation checklist for Notion Explorer.' }],
    parent: { type: 'workspace', workspace: true },
    createdTime: '2026-05-18T08:00:00.000Z',
    lastEditedTime: '2026-05-31T09:00:00.000Z',
    properties: {
      Name: { id: 'title', name: 'Name', type: 'title', title: {} },
      Status: { id: 'status', name: 'Status', type: 'status', status: {} },
      Priority: { id: 'priority', name: 'Priority', type: 'select', select: {} },
      Assignee: { id: 'assignee', name: 'Assignee', type: 'people', people: {} }
    },
    entries: [
      {
        id: 'demo-entry-1',
        created_time: '2026-05-20T10:00:00.000Z',
        last_edited_time: '2026-05-31T09:00:00.000Z',
        properties: {
          Name: { type: 'title', text: 'Implement OPFS Sync Core' },
          Status: { type: 'status', text: 'Complete', color: 'green' },
          Priority: { type: 'select', text: 'High', color: 'red' },
          Assignee: { type: 'people', people: [{ name: 'Alice Smith' }] }
        }
      },
      {
        id: 'demo-entry-2',
        created_time: '2026-05-22T11:00:00.000Z',
        last_edited_time: '2026-05-30T15:00:00.000Z',
        properties: {
          Name: { type: 'title', text: 'Design Finder Column-style UI' },
          Status: { type: 'status', text: 'Complete', color: 'green' },
          Priority: { type: 'select', text: 'Medium', color: 'yellow' },
          Assignee: { type: 'people', people: [{ name: 'Bob Johnson' }] }
        }
      },
      {
        id: 'demo-entry-3',
        created_time: '2026-05-24T09:00:00.000Z',
        last_edited_time: '2026-05-31T11:00:00.000Z',
        properties: {
          Name: { type: 'title', text: 'Optimize Local Cache fallbacks' },
          Status: { type: 'status', text: 'In Progress', color: 'blue' },
          Priority: { type: 'select', text: 'High', color: 'red' },
          Assignee: { type: 'people', people: [{ name: 'Alice Smith' }] }
        }
      },
      {
        id: 'demo-entry-4',
        created_time: '2026-05-26T14:00:00.000Z',
        last_edited_time: '2026-05-28T16:00:00.000Z',
        properties: {
          Name: { type: 'title', text: 'Offline Page Previews' },
          Status: { type: 'status', text: 'Complete', color: 'green' },
          Priority: { type: 'select', text: 'Medium', color: 'yellow' },
          Assignee: { type: 'people', people: [{ name: 'Bob Johnson' }] }
        }
      },
      {
        id: 'demo-entry-5',
        created_time: '2026-05-28T10:00:00.000Z',
        last_edited_time: '2026-05-31T14:00:00.000Z',
        properties: {
          Name: { type: 'title', text: 'Vite Production Bundler Setup' },
          Status: { type: 'status', text: 'In Progress', color: 'blue' },
          Priority: { type: 'select', text: 'Low', color: 'gray' },
          Assignee: { type: 'people', people: [{ name: 'Alice Smith' }] }
        }
      }
    ],
    url: 'https://notion.so/demo-tasks-db'
  }

  await writeFile('/databases/demo-tasks-db.json', tasksDatabase)

  // 5. Update metadata
  await setMetadata({
    lastSyncTime: syncTime,
    pageIds: fs.pages.map(p => p.id),
    databaseIds: fs.databases.map(d => d.id),
    isDemo: true
  })

  return {
    success: true,
    pages: fs.pages.length,
    databases: fs.databases.length,
    syncTime
  }
}
