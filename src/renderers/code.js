import { renderRichText } from './text.js'

// Language display names
const languageNames = {
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
const syntaxPatterns = {
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
  // Add more languages as needed
}

// Apply basic syntax highlighting
function highlightSyntax(code, language) {
  const patterns = syntaxPatterns[language]
  if (!patterns) return escapeHtml(code)

  let result = escapeHtml(code)

  // Simple highlighting - in production, use a proper library like Prism.js
  for (const { pattern, class: className } of patterns) {
    result = result.replace(pattern, `<span class="syntax-${className}">$1</span>`)
  }

  return result
}

// Render code block
export function renderCode(block) {
  const code = block.plainText || ''
  const language = block.language || 'plaintext'
  const caption = block.caption ? renderRichText(block.caption) : ''
  const langDisplay = languageNames[language] || language

  return `
    <div class="code-block">
      <div class="code-header">
        <span class="code-language">${escapeHtml(langDisplay)}</span>
        <button class="code-copy" onclick="navigator.clipboard.writeText(this.closest('.code-block').querySelector('code').textContent)">Copy</button>
      </div>
      <pre><code class="language-${escapeHtml(language)}">${highlightSyntax(code, language)}</code></pre>
      ${caption ? `<div class="code-caption">${caption}</div>` : ''}
    </div>
  `
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}
