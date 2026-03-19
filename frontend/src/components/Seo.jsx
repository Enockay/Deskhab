import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const DEFAULT_SITE_NAME = 'DesktopHab'
const DEFAULT_TITLE = 'DesktopHab | SmartCalender for macOS, Windows and Linux'
const DEFAULT_DESCRIPTION =
  'DesktopHab builds productivity desktop apps. SmartCalender helps teams plan meetings, tasks, and reminders across macOS, Windows, and Linux.'
const DEFAULT_IMAGE = 'https://www.deskhab.com/favicon.svg'
const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://www.deskhab.com'

function upsertMeta(key, attr, content) {
  let node = document.head.querySelector(`meta[${key}="${attr}"]`)
  if (!node) {
    node = document.createElement('meta')
    node.setAttribute(key, attr)
    document.head.appendChild(node)
  }
  node.setAttribute('content', content)
}

function upsertLink(rel, href) {
  let node = document.head.querySelector(`link[rel="${rel}"]`)
  if (!node) {
    node = document.createElement('link')
    node.setAttribute('rel', rel)
    document.head.appendChild(node)
  }
  node.setAttribute('href', href)
}

function upsertJsonLd(id, value) {
  let node = document.head.querySelector(`script[data-seo-id="${id}"]`)
  if (!node) {
    node = document.createElement('script')
    node.setAttribute('type', 'application/ld+json')
    node.setAttribute('data-seo-id', id)
    document.head.appendChild(node)
  }
  node.textContent = JSON.stringify(value)
}

export default function Seo({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  canonicalPath,
  image = DEFAULT_IMAGE,
  type = 'website',
  noindex = false,
  jsonLd,
}) {
  const location = useLocation()

  useEffect(() => {
    const path = canonicalPath || `${location.pathname}${location.search || ''}`
    const canonicalUrl = new URL(path, SITE_URL).toString()
    const fullTitle = title.includes('DesktopHab') ? title : `${title} | DesktopHab`

    document.title = fullTitle

    upsertMeta('name', 'description', description)
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow')
    upsertMeta('property', 'og:site_name', DEFAULT_SITE_NAME)
    upsertMeta('property', 'og:type', type)
    upsertMeta('property', 'og:title', fullTitle)
    upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:url', canonicalUrl)
    upsertMeta('property', 'og:image', image)
    upsertMeta('name', 'twitter:card', 'summary_large_image')
    upsertMeta('name', 'twitter:title', fullTitle)
    upsertMeta('name', 'twitter:description', description)
    upsertMeta('name', 'twitter:image', image)

    upsertLink('canonical', canonicalUrl)

    if (jsonLd) {
      upsertJsonLd('page', jsonLd)
    }
  }, [canonicalPath, description, image, jsonLd, location.pathname, location.search, noindex, title, type])

  return null
}

