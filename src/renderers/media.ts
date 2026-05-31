import { renderRichText } from './text'

// Get file URL from Notion file object
function getFileUrl(fileObj) {
  if (!fileObj) return null
  if (fileObj.type === 'external') {
    return fileObj.external?.url
  }
  if (fileObj.type === 'file') {
    return fileObj.file?.url
  }
  return null
}

// Get file name
function getFileName(fileObj) {
  if (!fileObj) return 'file'
  return fileObj.name || 'file'
}

// Render image
export function renderImage(block) {
  const url = getFileUrl(block.file)
  const caption = block.file?.caption ? renderRichText(block.file.caption) : ''

  if (!url) return '<div class="media-placeholder">Image</div>'

  return `
    <figure class="media-block image">
      <img src="${escapeAttr(url)}" alt="${caption || 'Image'}" loading="lazy">
      ${caption ? `<figcaption>${caption}</figcaption>` : ''}
    </figure>
  `
}

// Render video
export function renderVideo(block) {
  const url = getFileUrl(block.file)
  const caption = block.file?.caption ? renderRichText(block.file.caption) : ''

  if (!url) return '<div class="media-placeholder">Video</div>'

  // Handle YouTube embeds
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const videoId = extractYouTubeId(url)
    if (videoId) {
      return `
        <figure class="media-block video">
          <div class="video-embed">
            <iframe src="https://www.youtube.com/embed/${videoId}" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen></iframe>
          </div>
          ${caption ? `<figcaption>${caption}</figcaption>` : ''}
        </figure>
      `
    }
  }

  // Handle Vimeo
  if (url.includes('vimeo.com')) {
    const vimeoId = extractVimeoId(url)
    if (vimeoId) {
      return `
        <figure class="media-block video">
          <div class="video-embed">
            <iframe src="https://player.vimeo.com/video/${vimeoId}" 
                    frameborder="0" 
                    allow="autoplay; fullscreen; picture-in-picture" 
                    allowfullscreen></iframe>
          </div>
          ${caption ? `<figcaption>${caption}</figcaption>` : ''}
        </figure>
      `
    }
  }

  // Generic video
  return `
    <figure class="media-block video">
      <video controls>
        <source src="${escapeAttr(url)}">
        Your browser does not support the video tag.
      </video>
      ${caption ? `<figcaption>${caption}</figcaption>` : ''}
    </figure>
  `
}

// Render file
export function renderFile(block) {
  const url = getFileUrl(block.file)
  const name = getFileName(block.file)

  if (!url) return '<div class="media-placeholder">File</div>'

  return `
    <div class="media-block file">
      <a href="${escapeAttr(url)}" target="_blank" rel="noopener" class="file-link">
        <span class="file-icon">📎</span>
        <span class="file-name">${escapeHtml(name)}</span>
      </a>
    </div>
  `
}

// Render PDF
export function renderPDF(block) {
  const url = getFileUrl(block.file)
  const name = getFileName(block.file)

  if (!url) return '<div class="media-placeholder">PDF</div>'

  return `
    <div class="media-block pdf">
      <a href="${escapeAttr(url)}" target="_blank" rel="noopener" class="file-link">
        <span class="file-icon">📄</span>
        <span class="file-name">${escapeHtml(name)}</span>
      </a>
    </div>
  `
}

// Render bookmark
export function renderBookmark(block) {
  const url = block.url
  if (!url) return ''

  const caption = block.caption ? renderRichText(block.caption) : url
  const hostname = new URL(url).hostname

  return `
    <a href="${escapeAttr(url)}" target="_blank" rel="noopener" class="bookmark-block">
      <div class="bookmark-info">
        <div class="bookmark-url">${escapeHtml(hostname)}</div>
        <div class="bookmark-title">${escapeHtml(caption)}</div>
      </div>
    </a>
  `
}

// Render embed
export function renderEmbed(block) {
  const url = block.url
  if (!url) return ''

  return `
    <div class="media-block embed">
      <iframe src="${escapeAttr(url)}" frameborder="0" allowfullscreen></iframe>
    </div>
  `
}

// Render link preview
export function renderLinkPreview(block) {
  const url = block.url
  if (!url) return ''

  return `
    <a href="${escapeAttr(url)}" target="_blank" rel="noopener" class="link-preview">
      ${escapeHtml(url)}
    </a>
  `
}

// Helper: Extract YouTube video ID
function extractYouTubeId(url) {
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtube\.com\/embed\/([^?]+)/,
    /youtu\.be\/([^?]+)/
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

// Helper: Extract Vimeo video ID
function extractVimeoId(url) {
  const match = url.match(/vimeo\.com\/(\d+)/)
  return match ? match[1] : null
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// Escape attribute
function escapeAttr(text) {
  return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}
