import { fallbackData } from '../sync/fallbackData'

export const loadFallbackHelper = (
  setAllFileData: (data: any[]) => void,
  setSelectedIndex: (idx: number) => void,
  setNavigationHistory: (hist: any[]) => void,
  setHistoryIndex: (idx: number) => void
) => {
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

export const renderFromFileSystemHelper = (fs: any) => {
  return [
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
}

export const getSyncedPathHelper = (item: any, fileSystemData: any) => {
  const path = []
  let current = item
  const visited = new Set()

  while (current) {
    if (current.id) {
      if (visited.has(current.id)) break
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
