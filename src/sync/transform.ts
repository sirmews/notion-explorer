import { getPageTitle, getPageIcon, getCoverUrl, PropertyTypes } from '../utils/notionTypes'

// Transform Notion page to our local format
export function transformPage(page) {
  return {
    id: page.id,
    type: 'page',
    title: getPageTitle(page),
    icon: getPageIcon(page),
    cover: getCoverUrl(page),
    properties: transformProperties(page.properties),
    parent: page.parent,
    createdTime: page.created_time,
    lastEditedTime: page.last_edited_time,
    lastEditedBy: page.last_edited_by,
    hasChildren: page.has_children || false,
    url: page.url
  }
}

// Transform Notion database to our local format
export function transformDatabase(db) {
  return {
    id: db.id,
    type: 'database',
    title: getPageTitle(db),
    icon: getPageIcon(db),
    cover: getCoverUrl(db),
    description: db.description?.map(t => t.plain_text).join('') || '',
    properties: transformDatabaseSchema(db.properties),
    parent: db.parent,
    createdTime: db.created_time,
    lastEditedTime: db.last_edited_time,
    url: db.url
  }
}

// Transform database entry (page in database)
export function transformDatabaseEntry(page, databaseSchema) {
  const entry: any = transformPage(page)
  entry.type = 'database_entry'
  entry.databaseId = page.parent?.database_id
  return entry
}

// Transform database property schema
export function transformDatabaseSchema(properties) {
  if (!properties) return {}
  const schema = {}
  for (const [key, prop] of Object.entries(properties)) {
    const p = prop as any
    schema[key] = {
      id: p.id,
      name: p.name,
      type: p.type,
      config: getPropertyConfig(prop)
    }
  }
  return schema
}

// Get property-specific configuration
function getPropertyConfig(prop) {
  switch (prop.type) {
    case PropertyTypes.SELECT:
      return { options: prop.select?.options || [] }
    case PropertyTypes.MULTI_SELECT:
      return { options: prop.multi_select?.options || [] }
    case PropertyTypes.FORMULA:
      return { expression: prop.formula?.expression }
    case PropertyTypes.RELATION:
      return { databaseId: prop.relation?.database_id }
    case PropertyTypes.ROLLUP:
      return {
        relationPropertyId: prop.rollup?.relation_property_id,
        rollupPropertyId: prop.rollup?.rollup_property_id,
        function: prop.rollup?.function
      }
    default:
      return null
  }
}

// Transform page properties
function transformProperties(properties) {
  if (!properties) return {}
  const result = {}
  for (const [key, prop] of Object.entries(properties)) {
    result[key] = transformPropertyValue(prop)
  }
  return result
}

// Transform a single property value
function transformPropertyValue(prop) {
  const value: any = {
    type: prop.type,
    id: prop.id
  }

  switch (prop.type) {
    case PropertyTypes.TITLE:
      value.text = Array.isArray(prop.title) ? prop.title.map(t => t.plain_text).join('') : ''
      value.richText = prop.title || []
      break
    case PropertyTypes.RICH_TEXT:
      value.text = prop.rich_text?.map(t => t.plain_text).join('') || ''
      value.richText = prop.rich_text || []
      break
    case PropertyTypes.NUMBER:
      value.number = prop.number
      value.format = prop.number?.format
      break
    case PropertyTypes.SELECT:
      value.text = prop.select?.name || ''
      value.color = prop.select?.color
      break
    case PropertyTypes.MULTI_SELECT:
      value.text = prop.multi_select?.map(s => s.name).join(', ') || ''
      value.items = prop.multi_select || []
      break
    case PropertyTypes.DATE:
      value.start = prop.date?.start
      value.end = prop.date?.end
      value.text = prop.date?.start || ''
      if (prop.date?.end) {
        value.text += ` → ${prop.date.end}`
      }
      break
    case PropertyTypes.CHECKBOX:
      value.checked = prop.checkbox || false
      value.text = prop.checkbox ? '✓' : '○'
      break
    case PropertyTypes.URL:
      value.url = prop.url
      value.text = prop.url || ''
      break
    case PropertyTypes.EMAIL:
      value.email = prop.email
      value.text = prop.email || ''
      break
    case PropertyTypes.PHONE:
      value.phone = prop.phone_number
      value.text = prop.phone_number || ''
      break
    case PropertyTypes.FILES:
      value.files = prop.files || []
      value.text = prop.files?.map(f => f.name || f.external?.url || f.file?.url).join(', ') || ''
      break
    case PropertyTypes.PEOPLE:
      value.people = prop.people || []
      value.text = prop.people?.map(p => p.name).join(', ') || ''
      break
    case PropertyTypes.RELATION:
      value.relation = prop.relation || []
      value.text = prop.relation?.map(r => r.id).join(', ') || ''
      break
    case PropertyTypes.ROLLUP:
      value.rollup = prop.rollup
      value.text = JSON.stringify(prop.rollup)
      break
    case PropertyTypes.FORMULA:
      value.formula = prop.formula
      value.text = JSON.stringify(prop.formula)
      break
    case PropertyTypes.STATUS:
      value.text = prop.status?.name || ''
      value.color = prop.status?.color
      break
    case PropertyTypes.CREATED_TIME:
      value.text = prop.created_time || ''
      break
    case PropertyTypes.CREATED_BY:
      value.text = prop.created_by?.name || ''
      break
    case PropertyTypes.LAST_EDITED_TIME:
      value.text = prop.last_edited_time || ''
      break
    case PropertyTypes.LAST_EDITED_BY:
      value.text = prop.last_edited_by?.name || ''
      break
    default:
      value.text = ''
  }

  return value
}

// Transform blocks
export function transformBlocks(blocks) {
  return blocks.map(block => transformBlock(block))
}

// Transform single block
export function transformBlock(block) {
  const result: any = {
    id: block.id,
    type: block.type,
    hasChildren: block.has_children || false,
    createdTime: block.created_time,
    lastEditedTime: block.last_edited_time
  }

  // Extract content based on block type
  const content = block[block.type]
  if (content) {
    result.richText = content.rich_text || []
    result.plainText = content.rich_text?.map(t => t.plain_text).join('') || ''
    result.color = content.color

    // Type-specific properties
    switch (block.type) {
      case 'to_do':
        result.checked = content.checked || false
        break
      case 'toggle':
        result.text = content.rich_text?.map(t => t.plain_text).join('') || ''
        break
      case 'code':
        result.language = content.language
        result.caption = content.caption
        break
      case 'image':
      case 'video':
      case 'file':
      case 'pdf':
        result.file = content
        break
      case 'bookmark':
        result.url = content.url
        result.caption = content.caption
        break
      case 'embed':
        result.url = content.url
        break
      case 'child_page':
        result.pageId = content.id
        result.title = content.title
        break
      case 'child_database':
        result.databaseId = content.id
        result.title = content.title
        break
      case 'table':
        result.tableWidth = content.table_width
        result.hasColumnHeader = content.has_column_header
        result.hasRowHeader = content.has_row_header
        break
      case 'column_list':
        break
      case 'column':
        break
    }
  }

  return result
}

// Build file system structure from pages
export function buildFileSystem(pages, databases) {
  const fs = {
    pages: {},
    databases: {},
    tree: []
  }

  // Index pages by ID
  for (const page of pages) {
    fs.pages[page.id] = page
  }

  // Index databases by ID
  for (const db of databases) {
    fs.databases[db.id] = db
  }

  // Build tree structure
  const topLevel = []
  for (const page of pages) {
    const parentId = page.parent?.page_id || page.parent?.database_id
    if (!parentId || !fs.pages[parentId]) {
      topLevel.push(page)
    }
  }

  fs.tree = buildTree(topLevel, pages, databases)
  return fs
}

// Build nested tree
function buildTree(pages, allPages, allDatabases) {
  return pages.map(page => {
    const node = {
      id: page.id,
      name: page.title,
      icon: page.icon,
      type: page.type === 'database' ? 'database' : 'page',
      children: []
    }

    // Find children (pages that have this page as parent)
    const children = allPages.filter(p => p.parent?.page_id === page.id)
    const childDatabases = allDatabases.filter(d => d.parent?.page_id === page.id)

    node.children = [
      ...buildTree(children, allPages, allDatabases),
      ...childDatabases.map(db => ({
        id: db.id,
        name: db.title,
        icon: db.icon,
        type: 'database',
        children: []
      }))
    ]

    return node
  })
}
