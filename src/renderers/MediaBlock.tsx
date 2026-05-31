import React from 'react'
import { RichText } from './TextBlock'

// Get file URL from Notion file object
function getFileUrl(fileObj: any) {
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
function getFileName(fileObj: any) {
  if (!fileObj) return 'file'
  return fileObj.name || 'file'
}

// Helper: Extract YouTube video ID
function extractYouTubeId(url: string) {
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
function extractVimeoId(url: string) {
  const match = url.match(/vimeo\.com\/(\d+)/)
  return match ? match[1] : null
}

// Render image
export const ImageBlock: React.FC<{ block: any }> = ({ block }) => {
  const url = getFileUrl(block.file)
  const hasCaption = !!block.file?.caption && block.file.caption.length > 0

  if (!url) return <div className="media-placeholder">Image</div>

  return (
    <figure className="media-block image">
      <img src={url} alt="Image" loading="lazy" />
      {hasCaption && (
        <figcaption>
          <RichText richText={block.file.caption} />
        </figcaption>
      )}
    </figure>
  )
}

// Render video
export const VideoBlock: React.FC<{ block: any }> = ({ block }) => {
  const url = getFileUrl(block.file)
  const hasCaption = !!block.file?.caption && block.file.caption.length > 0

  if (!url) return <div className="media-placeholder">Video</div>

  // Handle YouTube embeds
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const videoId = extractYouTubeId(url)
    if (videoId) {
      return (
        <figure className="media-block video">
          <div className="video-embed">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="YouTube video"
            ></iframe>
          </div>
          {hasCaption && (
            <figcaption>
              <RichText richText={block.file.caption} />
            </figcaption>
          )}
        </figure>
      )
    }
  }

  // Handle Vimeo
  if (url.includes('vimeo.com')) {
    const vimeoId = extractVimeoId(url)
    if (vimeoId) {
      return (
        <figure className="media-block video">
          <div className="video-embed">
            <iframe
              src={`https://player.vimeo.com/video/${vimeoId}`}
              frameBorder="0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title="Vimeo video"
            ></iframe>
          </div>
          {hasCaption && (
            <figcaption>
              <RichText richText={block.file.caption} />
            </figcaption>
          )}
        </figure>
      )
    }
  }

  // Generic video
  return (
    <figure className="media-block video">
      <video controls>
        <source src={url} />
        Your browser does not support the video tag.
      </video>
      {hasCaption && (
        <figcaption>
          <RichText richText={block.file.caption} />
        </figcaption>
      )}
    </figure>
  )
}

// Render file
export const FileBlock: React.FC<{ block: any }> = ({ block }) => {
  const url = getFileUrl(block.file)
  const name = getFileName(block.file)

  if (!url) return <div className="media-placeholder">File</div>

  return (
    <div className="media-block file">
      <a href={url} target="_blank" rel="noopener noreferrer" className="file-link">
        <span className="file-icon">📎</span>
        <span className="file-name">{name}</span>
      </a>
    </div>
  )
}

// Render PDF
export const PDFBlock: React.FC<{ block: any }> = ({ block }) => {
  const url = getFileUrl(block.file)
  const name = getFileName(block.file)

  if (!url) return <div className="media-placeholder">PDF</div>

  return (
    <div className="media-block pdf">
      <a href={url} target="_blank" rel="noopener noreferrer" className="file-link">
        <span className="file-icon">📄</span>
        <span className="file-name">{name}</span>
      </a>
    </div>
  )
}

// Render bookmark
export const BookmarkBlock: React.FC<{ block: any }> = ({ block }) => {
  const url = block.url
  if (!url) return null

  const hasCaption = !!block.caption && block.caption.length > 0
  let hostname = url
  try {
    hostname = new URL(url).hostname
  } catch (e) {
    // ignore invalid URLs
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="bookmark-block">
      <div className="bookmark-info">
        <div className="bookmark-url">{hostname}</div>
        <div className="bookmark-title">
          {hasCaption ? <RichText richText={block.caption} /> : url}
        </div>
      </div>
    </a>
  )
}

// Render embed
export const EmbedBlock: React.FC<{ block: any }> = ({ block }) => {
  const url = block.url
  if (!url) return null

  return (
    <div className="media-block embed">
      <iframe src={url} frameBorder="0" allowFullScreen title="Embed Content"></iframe>
    </div>
  )
}

// Render link preview
export const LinkPreviewBlock: React.FC<{ block: any }> = ({ block }) => {
  const url = block.url
  if (!url) return null

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="link-preview">
      {url}
    </a>
  )
}
