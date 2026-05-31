// Notion block types
export const BlockTypes = {
  PARAGRAPH: 'paragraph',
  HEADING_1: 'heading_1',
  HEADING_2: 'heading_2',
  HEADING_3: 'heading_3',
  BULLETED_LIST: 'bulleted_list_item',
  NUMBERED_LIST: 'numbered_list_item',
  TO_DO: 'to_do',
  TOGGLE: 'toggle',
  QUOTE: 'quote',
  CALLOUT: 'callout',
  DIVIDER: 'divider',
  CODE: 'code',
  IMAGE: 'image',
  VIDEO: 'video',
  FILE: 'file',
  PDF: 'pdf',
  BOOKMARK: 'bookmark',
  EMBED: 'embed',
  LINK_PREVIEW: 'link_preview',
  CHILD_PAGE: 'child_page',
  CHILD_DATABASE: 'child_database',
  COLUMN_LIST: 'column_list',
  COLUMN: 'column',
  TABLE: 'table',
  TABLE_ROW: 'table_row',
  SYNCED_BLOCK: 'synced_block',
  BREADCRUMB: 'breadcrumb',
  TEMPLATE: 'template',
  EQUATION: 'equation',
  AUDIO: 'audio',
  TABLE_OF_CONTENTS: 'table_of_contents',
  LINK_TO_PAGE: 'link_to_page'
}

// Rich text annotation styles
export const Annotations = {
  BOLD: 'bold',
  ITALIC: 'italic',
  UNDERLINE: 'underline',
  STRIKETHROUGH: 'strikethrough',
  CODE: 'code',
  COLOR: 'color'
}

// Colors available in Notion
export const Colors = {
  DEFAULT: 'default',
  GRAY: 'gray',
  BROWN: 'brown',
  ORANGE: 'orange',
  YELLOW: 'yellow',
  GREEN: 'green',
  BLUE: 'blue',
  PURPLE: 'purple',
  PINK: 'pink',
  RED: 'red',
  DEFAULT_BACKGROUND: 'default_background',
  GRAY_BACKGROUND: 'gray_background',
  BROWN_BACKGROUND: 'brown_background',
  ORANGE_BACKGROUND: 'orange_background',
  YELLOW_BACKGROUND: 'yellow_background',
  GREEN_BACKGROUND: 'green_background',
  BLUE_BACKGROUND: 'blue_background',
  PURPLE_BACKGROUND: 'purple_background',
  PINK_BACKGROUND: 'pink_background',
  RED_BACKGROUND: 'red_background'
}

// File types for external files
export const FileTypes = {
  EXTERNAL: 'external',
  FILE: 'file'
}

// Database property types
export const PropertyTypes = {
  TITLE: 'title',
  RICH_TEXT: 'rich_text',
  NUMBER: 'number',
  SELECT: 'select',
  MULTI_SELECT: 'multi_select',
  DATE: 'date',
  CHECKBOX: 'checkbox',
  URL: 'url',
  EMAIL: 'email',
  PHONE: 'phone_number',
  FILES: 'files',
  RELATION: 'relation',
  ROLLUP: 'rollup',
  FORMULA: 'formula',
  STATUS: 'status',
  PEOPLE: 'people',
  CREATED_TIME: 'created_time',
  CREATED_BY: 'created_by',
  LAST_EDITED_TIME: 'last_edited_time',
  LAST_EDITED_BY: 'last_edited_by',
  UNIQUE_ID: 'unique_id'
}

// Page property icons for file system metaphor
export const PageKindIcons = {
  page: '📄',
  database: '🗄️',
  database_entry: '📋'
}

// Map Notion emoji icons to our format
export function getPageIcon(page) {
  if (page.icon?.type === 'emoji') {
    return page.icon.emoji
  }
  if (page.icon?.type === 'file') {
    return '🖼️'
  }
  return '📄'
}

// Get page title from properties
export function getPageTitle(item: any): string {
  if (item.object === 'database' && Array.isArray(item.title)) {
    return item.title.map((t: any) => t.plain_text).join('') || 'Untitled'
  }
  if (item.properties) {
    for (const prop of Object.values(item.properties) as any[]) {
      if (prop.type === 'title' && Array.isArray(prop.title)) {
        return prop.title.map((t: any) => t.plain_text).join('') || 'Untitled'
      }
    }
  }
  return 'Untitled'
}

// Get cover image URL
export function getCoverUrl(page) {
  if (page.cover?.type === 'external') {
    return page.cover.external.url
  }
  if (page.cover?.type === 'file') {
    return page.cover.file.url
  }
  return null
}

// Get icon as string
export function getIconString(icon) {
  if (!icon) return null
  if (icon.type === 'emoji') return icon.emoji
  if (icon.type === 'file') return '🖼️'
  return null
}
