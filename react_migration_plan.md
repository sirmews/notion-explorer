# Notion Explorer — React + TypeScript Migration Plan

This plan details the step-by-step transition of **Notion Explorer** from a manual DOM-manipulation Vanilla TypeScript setup to a structured, highly robust **React + TypeScript** architecture.

---

## 1. Architectural Motivation
*   **Deep Recursion:** Notion pages are trees of block objects (blocks nested within columns, lists, toggles, quotes, etc.). React's component model naturally and elegantly handles nested recursive rendering.
*   **Encapsulated Local State:** Sidebars, folders, toggles, search filters, and table sorting can manage their own decoupled states, keeping the main application file clean.
*   **Robust DOM Safety:** React's Virtual DOM escapes all strings automatically, completely eliminating XSS security risks.
*   **Dev Productivity:** Avoids manual, fragile string concatenation and manual event delegation (`document.addEventListener`).

---

## 2. Dependencies & Tooling Setup
We will update `package.json` and `vite.config.js` to support React:

### package.json Update
```json
"dependencies": {
  "@notionhq/client": "^5.22.0",
  "react": "^19.0.0",
  "react-dom": "^19.0.0"
},
"devDependencies": {
  "@types/react": "^19.0.8",
  "@types/react-dom": "^19.0.3",
  "@vitejs/plugin-react": "^4.3.4",
  "typescript": "^5.7.3",
  "vite": "^8.0.14"
}
```

### tsconfig.json Update
Add JSX support:
```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    ...
  }
}
```

### vite.config.js Update
Import and register `@vitejs/plugin-react`:
```javascript
import react from '@vitejs/plugin-react'
// ...
plugins: [
  react(),
  // ...
]
```

---

## 3. Directory & File Structure
We will refactor the `src/` directory to have clean, modular components:

```text
src/
├── api/
│   └── notion.ts
├── auth/
│   └── oauth.ts
├── components/
│   ├── BlockRenderer.tsx       # Recursive block render dispatcher
│   ├── ExplorerList.tsx        # File table/grid view
│   ├── PreviewPanel.tsx        # Selected item details & full block/database preview
│   └── SidebarTree.tsx         # Nested folder hierarchy tree
├── renderers/                  # Individual granular block renderers
│   ├── TextBlock.tsx           # Text types (paragraphs, headings, lists, quotes, callouts)
│   ├── MediaBlock.tsx          # Media types (images, videos, files, bookmarks)
│   ├── CodeBlock.tsx           # Monospace code and syntax highlighting
│   └── DatabaseView.tsx        # Inline database tables
├── sync/
│   ├── demoData.ts
│   ├── fallbackData.ts
│   ├── notionSync.ts
│   └── opfs.ts                 # IndexedDB storage interface
├── App.tsx                     # Main Shell layout (Sidebar, Main, Preview)
├── main.tsx                    # Root react mount point
├── page-viewer.tsx             # Single page reader mount point
├── style.css
└── page-viewer.css
```

---

## 4. Migration Execution Phases

### Phase 1: Environment & HTML Configuration
1.  Install packages: `npm install react react-dom` and `npm install -D @types/react @types/react-dom @vitejs/plugin-react`.
2.  Enable JSX in `tsconfig.json` (`"jsx": "react-jsx"`).
3.  Inject the React plugin into `vite.config.js`.
4.  Update `index.html` and `page.html` to point to `/src/main.tsx` and `/src/page-viewer.tsx`.

### Phase 2: Create Core State and App Shell
1.  Create `App.tsx` managing state:
    *   `allFileData`, `fileData` (filtered list).
    *   `selectedIndex`, `activeItem`.
    *   `searchQuery`.
    *   `layout` (List vs Grid).
    *   `navigationHistory`, `historyIndex` (Back/Forward).
    *   `isConnected` status.
2.  Port the Sidebar Tree render logic into modular React components (`<SidebarTree />` and `<SidebarItem />`).
3.  Implement draggable resizing cleanly in React using standard mouse state capture or a simple hook.

### Phase 3: Port File List and Views
1.  Port the Explorer list into `<ExplorerList />` supporting list-table and grid-card configurations based on the `layout` state.
2.  Filter automatically on `searchQuery` state change.

### Phase 4: Port Notion Block Renderers
1.  Rewrite text, media, code, and database renderers into standard, safe React components.
2.  Replace string concatenation inside `src/components/blockRenderer.ts` with a clean, declarative `<BlockRenderer blocks={blocks} />` component.

### Phase 5: Verification & Push
1.  Run `tsc` type-checking and `vite build` production compilation to ensure zero errors.
2.  Commit and push the beautiful new React codebase to GitHub!

---

## 5. Verification Plan
*   **Compile:** `npm run build` checks type completeness.
*   **Offline Experience:** Load the app and click **✨ Demo Mode** to confirm immediate rendering of pages, callouts, lists, and tables.
*   **Interactivity:** Confirm that dragging sidebar dividers, typing in the search box, navigating back/forward, and toggling list/grid layouts work smoothly.
