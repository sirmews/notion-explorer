# Notion Explorer

A web app that reimagines the Notion user experience as a file system explorer — think macOS Finder or Windows Explorer, but for your Notion workspace.

## What is this?

Notion's block-based UI is powerful but can feel overwhelming at scale. Notion Explorer presents your pages, databases, and blocks in a familiar three-panel file manager layout:

- **Sidebar** — Hierarchical folder tree with expandable pages and databases
- **List view** — Sortable columns for Name, Kind, Date Modified, Tags, and Size
- **Preview panel** — Page content, properties, cover images, and metadata

## Concept Mapping

| Notion | File System |
|---|---|
| Workspace | Root volume |
| Page (with children) | Folder |
| Page (leaf) | File |
| Database | Special folder with metadata columns |
| Database entry | File with properties |
| Block | File content |

## Getting Started

Open `index.html` in any browser. No build tools, no dependencies.

```bash
open index.html
```

## Current State

This is a self-contained prototype with realistic sample data (8 pages, 2 databases, nested structure). It demonstrates the UI concept but currently runs on static data — no live Notion API connection yet.

## Roadmap

- [ ] Connect to Notion API for live data
- [ ] Real-time page editing
- [ ] Search across workspace
- [ ] Drag-and-drop page reorganization
- [ ] Dark mode support
- [ ] Mobile-responsive layout

## Tech Stack

- Pure HTML, CSS, JavaScript
- Zero dependencies
- System font stack for native desktop feel
