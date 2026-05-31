import React from 'react'
import { BlockTypes } from '../utils/notionTypes'
import { TextComponents, RichText } from '../renderers/TextBlock'
import {
  ImageBlock,
  VideoBlock,
  FileBlock,
  PDFBlock,
  BookmarkBlock,
  EmbedBlock,
  LinkPreviewBlock
} from '../renderers/MediaBlock'
import { CodeBlock } from '../renderers/CodeBlock'

// Component to render a single block's actual content
function renderBlockContent(block: any): React.ReactNode {
  // Text components map
  const TextComponent = TextComponents[block.type]
  if (TextComponent) {
    if (block.type === BlockTypes.TOGGLE) {
      return (
        <TextComponent block={block}>
          {block.children && block.children.length > 0 && (
            <BlockRenderer blocks={block.children} />
          )}
        </TextComponent>
      )
    }
    return <TextComponent block={block} />
  }

  // Media components & others
  switch (block.type) {
    case BlockTypes.IMAGE:
      return <ImageBlock block={block} />
    case BlockTypes.VIDEO:
      return <VideoBlock block={block} />
    case BlockTypes.FILE:
      return <FileBlock block={block} />
    case BlockTypes.PDF:
      return <PDFBlock block={block} />
    case BlockTypes.BOOKMARK:
      return <BookmarkBlock block={block} />
    case BlockTypes.EMBED:
      return <EmbedBlock block={block} />
    case BlockTypes.LINK_PREVIEW:
      return <LinkPreviewBlock block={block} />
    case BlockTypes.CODE:
      return <CodeBlock block={block} />
    case BlockTypes.TABLE:
      return (
        <div className="table-wrapper">
          <table className="database-table">
            <tbody>
              {block.children && block.children.length > 0 && (
                <BlockRenderer blocks={block.children} />
              )}
            </tbody>
          </table>
        </div>
      )
    case BlockTypes.TABLE_ROW:
      return (
        <tr>
          {block.cells?.map((cell: any, idx: number) => (
            <td key={idx}>
              <RichText richText={cell} />
            </td>
          ))}
        </tr>
      )
    case BlockTypes.COLUMN_LIST:
      return (
        <div className="column-list">
          {block.children && block.children.length > 0 && (
            <BlockRenderer blocks={block.children} />
          )}
        </div>
      )
    case BlockTypes.COLUMN:
      return (
        <div className="column">
          {block.children && block.children.length > 0 && (
            <BlockRenderer blocks={block.children} />
          )}
        </div>
      )
    case BlockTypes.SYNCED_BLOCK:
      return block.children && block.children.length > 0 ? (
        <BlockRenderer blocks={block.children} />
      ) : null
    case BlockTypes.BREADCRUMB:
      return null
    default:
      console.warn(`No renderer for block type: ${block.type}`)
      return null
  }
}

// Single block container
const SingleBlock: React.FC<{ block: any }> = ({ block }) => {
  const blockClass = `block block-${block.type}`
  const content = renderBlockContent(block)

  if (!content) return null

  return (
    <div className={blockClass} data-block-id={block.id}>
      {content}
    </div>
  )
}

interface BlockRendererProps {
  blocks: any[]
}

// Recursive list-grouping block renderer
export const BlockRenderer: React.FC<BlockRendererProps> = ({ blocks }) => {
  if (!blocks || blocks.length === 0) {
    return <div className="empty-state">No content</div>
  }

  const renderedElements: React.ReactNode[] = []
  let currentList: { type: 'ul' | 'ol'; items: any[] } | null = null

  const flushList = (key: string | number) => {
    if (currentList) {
      const ListTag = currentList.type
      renderedElements.push(
        <ListTag key={`list-${key}`}>
          {currentList.items.map((item, idx) => (
            <SingleBlock key={item.id || idx} block={item} />
          ))}
        </ListTag>
      )
      currentList = null
    }
  }

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    const isListItem =
      block.type === BlockTypes.BULLETED_LIST ||
      block.type === BlockTypes.NUMBERED_LIST
    const currentListType =
      block.type === BlockTypes.BULLETED_LIST ? 'ul' : 'ol'

    if (isListItem) {
      if (!currentList) {
        currentList = { type: currentListType, items: [block] }
      } else if (currentList.type !== currentListType) {
        flushList(i)
        currentList = { type: currentListType, items: [block] }
      } else {
        currentList.items.push(block)
      }
    } else {
      flushList(i)
      renderedElements.push(<SingleBlock key={block.id || i} block={block} />)
    }
  }

  flushList('final')

  return <>{renderedElements}</>
}

// Render page content container (for full page view)
export const PageContent: React.FC<{ page: any; blocks: any[] }> = ({ page, blocks }) => {
  const cover = page.cover ? (
    <div className="page-cover">
      <img src={page.cover} alt="Cover" />
    </div>
  ) : null

  const icon = page.icon ? <div className="page-icon">{page.icon}</div> : null
  const title = page.title || 'Untitled'

  return (
    <>
      {cover}
      <div className="page-content">
        <header className="page-header">
          {icon}
          <h1>{title}</h1>
        </header>
        <div className="page-blocks">
          <BlockRenderer blocks={blocks} />
        </div>
      </div>
    </>
  )
}
export default BlockRenderer
