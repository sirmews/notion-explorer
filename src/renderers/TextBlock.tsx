import React from 'react'
import { BlockTypes } from '../utils/notionTypes'

// Helper: Get background color CSS
function getBgColor(color: string) {
  const colors: Record<string, string> = {
    gray_background: 'rgba(120,119,116,0.07)',
    brown_background: 'rgba(147,114,100,0.07)',
    orange_background: 'rgba(217,115,13,0.07)',
    yellow_background: 'rgba(223,171,1,0.07)',
    green_background: 'rgba(77,171,154,0.07)',
    blue_background: 'rgba(82,156,202,0.07)',
    purple_background: 'rgba(144,101,176,0.07)',
    pink_background: 'rgba(193,76,138,0.07)',
    red_background: 'rgba(225,98,89,0.07)'
  }
  return colors[color] || 'transparent'
}

// Render rich text with annotations as React children
export const RichText: React.FC<{ richText: any[] }> = ({ richText }) => {
  if (!richText || richText.length === 0) return null

  return (
    <>
      {richText.map((text, idx) => {
        let content: React.ReactNode = text.plain_text

        // Apply annotations
        if (text.annotations) {
          const a = text.annotations
          if (a.code) content = <code>{content}</code>
          if (a.bold) content = <strong>{content}</strong>
          if (a.italic) content = <em>{content}</em>
          if (a.underline) content = <u>{content}</u>
          if (a.strikethrough) content = <s>{content}</s>
          if (a.color && a.color !== 'default') {
            content = <span style={{ color: `var(--notion-${a.color})` }}>{content}</span>
          }
        }

        // Add links
        if (text.href) {
          content = (
            <a href={text.href} target="_blank" rel="noopener noreferrer">
              {content}
            </a>
          )
        }

        return <React.Fragment key={idx}>{content}</React.Fragment>
      })}
    </>
  )
}

// Render paragraph
export const ParagraphBlock: React.FC<{ block: any }> = ({ block }) => {
  if (!block.richText || block.richText.length === 0) {
    return <p><br /></p>
  }
  return (
    <p>
      <RichText richText={block.richText} />
    </p>
  )
}

// Render heading
export const HeadingBlock: React.FC<{ block: any }> = ({ block }) => {
  const level = block.type === BlockTypes.HEADING_1 ? 1 :
                block.type === BlockTypes.HEADING_2 ? 2 : 3
  if (level === 1) {
    return (
      <h1>
        <RichText richText={block.richText} />
      </h1>
    )
  } else if (level === 2) {
    return (
      <h2>
        <RichText richText={block.richText} />
      </h2>
    )
  } else {
    return (
      <h3>
        <RichText richText={block.richText} />
      </h3>
    )
  }
}

// Render bulleted list item
export const BulletedListBlock: React.FC<{ block: any }> = ({ block }) => {
  return (
    <li className="bulleted">
      <RichText richText={block.richText} />
    </li>
  )
}

// Render numbered list item
export const NumberedListBlock: React.FC<{ block: any }> = ({ block }) => {
  return (
    <li className="numbered">
      <RichText richText={block.richText} />
    </li>
  )
}

// Render to-do item
export const ToDoBlock: React.FC<{ block: any }> = ({ block }) => {
  const checked = !!block.checked
  return (
    <div className="todo-item">
      <input type="checkbox" checked={checked} readOnly disabled />
      <span className={checked ? 'done' : ''}>
        <RichText richText={block.richText} />
      </span>
    </div>
  )
}

// Render toggle block
export const ToggleBlock: React.FC<{ block: any; children?: React.ReactNode }> = ({ block, children }) => {
  return (
    <details className="toggle-block">
      <summary>
        <RichText richText={block.richText} />
      </summary>
      <div className="toggle-content">
        {children}
      </div>
    </details>
  )
}

// Render quote block
export const QuoteBlock: React.FC<{ block: any }> = ({ block }) => {
  return (
    <blockquote>
      <RichText richText={block.richText} />
    </blockquote>
  )
}

// Render callout block
export const CalloutBlock: React.FC<{ block: any }> = ({ block }) => {
  const icon = block.icon?.type === 'emoji' ? block.icon.emoji : '💡'
  const bgColor = getBgColor(block.color)
  return (
    <div className="callout" style={{ background: bgColor }}>
      <span className="callout-icon">{icon}</span>
      <div className="callout-content">
        <RichText richText={block.richText} />
      </div>
    </div>
  )
}

// Render divider block
export const DividerBlock: React.FC = () => {
  return <hr />
}

// Render child page reference
export const ChildPageBlock: React.FC<{ block: any }> = ({ block }) => {
  const title = block.title || 'Untitled'
  return (
    <a href={`/page/${block.pageId}`} className="child-page-link">
      <span className="icon">📄</span>
      <span className="title">{title}</span>
    </a>
  )
}

// Render child database reference
export const ChildDatabaseBlock: React.FC<{ block: any }> = ({ block }) => {
  const title = block.title || 'Untitled Database'
  return (
    <a href={`/page/${block.databaseId}`} className="child-page-link database">
      <span className="icon">🗄️</span>
      <span className="title">{title}</span>
    </a>
  )
}

// Component mapping for text blocks
export const TextComponents: Record<string, React.FC<{ block: any; children?: React.ReactNode }>> = {
  [BlockTypes.PARAGRAPH]: ParagraphBlock,
  [BlockTypes.HEADING_1]: HeadingBlock,
  [BlockTypes.HEADING_2]: HeadingBlock,
  [BlockTypes.HEADING_3]: HeadingBlock,
  [BlockTypes.BULLETED_LIST]: BulletedListBlock,
  [BlockTypes.NUMBERED_LIST]: NumberedListBlock,
  [BlockTypes.TO_DO]: ToDoBlock,
  [BlockTypes.TOGGLE]: ToggleBlock,
  [BlockTypes.QUOTE]: QuoteBlock,
  [BlockTypes.CALLOUT]: CalloutBlock,
  [BlockTypes.DIVIDER]: DividerBlock,
  [BlockTypes.CHILD_PAGE]: ChildPageBlock,
  [BlockTypes.CHILD_DATABASE]: ChildDatabaseBlock
}
