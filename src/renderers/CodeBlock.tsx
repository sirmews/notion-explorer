import React from 'react'
import { RichText } from './TextBlock'

// Language display names
const languageNames: Record<string, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  java: 'Java',
  c: 'C',
  cpp: 'C++',
  csharp: 'C#',
  go: 'Go',
  rust: 'Rust',
  ruby: 'Ruby',
  php: 'PHP',
  swift: 'Swift',
  kotlin: 'Kotlin',
  sql: 'SQL',
  html: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  json: 'JSON',
  yaml: 'YAML',
  markdown: 'Markdown',
  bash: 'Bash',
  shell: 'Shell',
  powershell: 'PowerShell',
  dockerfile: 'Dockerfile',
  nginx: 'Nginx',
  graphql: 'GraphQL',
  xml: 'XML',
  plaintext: 'Plain Text'
}

// Simple syntax highlighting (basic patterns)
const syntaxPatterns: Record<string, Array<{ pattern: RegExp; class: string }>> = {
  javascript: [
    { pattern: /(\/\/.*$)/gm, class: 'comment' },
    { pattern: /(\/\*[\s\S]*?\*\/)/g, class: 'comment' },
    { pattern: /('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)/g, class: 'string' },
    { pattern: /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|extends|import|export|from|default|async|await|try|catch|finally|throw|this|super|typeof|instanceof|in|of|void|delete|yield)\b/g, class: 'keyword' },
    { pattern: /\b(true|false|null|undefined|NaN|Infinity)\b/g, class: 'literal' },
    { pattern: /\b(\d+\.?\d*)\b/g, class: 'number' },
  ],
  python: [
    { pattern: /(#.*$)/gm, class: 'comment' },
    { pattern: /("""[\s\S]*?"""|'''[\s\S]*?''')/g, class: 'string' },
    { pattern: /('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/g, class: 'string' },
    { pattern: /\b(def|class|return|if|elif|else|for|while|break|continue|pass|import|from|as|with|try|except|finally|raise|yield|lambda|and|or|not|is|in|True|False|None|self|print)\b/g, class: 'keyword' },
    { pattern: /\b(\d+\.?\d*)\b/g, class: 'number' },
  ],
}

// Escape HTML helper
function escapeHtml(text: string): string {
  if (typeof document === 'undefined') {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// Apply basic syntax highlighting
function highlightSyntax(code: string, language: string): string {
  const patterns = syntaxPatterns[language]
  if (!patterns) return escapeHtml(code)

  let result = escapeHtml(code)

  // Simple highlighting
  for (const { pattern, class: className } of patterns) {
    result = result.replace(pattern, `<span class="syntax-${className}">$1</span>`)
  }

  return result
}

// Render code block as React component
export const CodeBlock: React.FC<{ block: any }> = ({ block }) => {
  const code = block.plainText || ''
  const language = block.language || 'plaintext'
  const hasCaption = !!block.caption && block.caption.length > 0
  const langDisplay = languageNames[language] || language

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
  }

  return (
    <div className="code-block">
      <div className="code-header">
        <span className="code-language">{langDisplay}</span>
        <button className="code-copy" onClick={handleCopy}>
          Copy
        </button>
      </div>
      <pre>
        <code
          className={`language-${language}`}
          dangerouslySetInnerHTML={{ __html: highlightSyntax(code, language) }}
        />
      </pre>
      {hasCaption && (
        <div className="code-caption">
          <RichText richText={block.caption} />
        </div>
      )}
    </div>
  )
}
