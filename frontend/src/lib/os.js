export function detectPlatform() {
  if (typeof navigator === 'undefined') return 'other'

  const ua = navigator.userAgent || navigator.vendor || window.opera || ''
  const uaLower = ua.toLowerCase()

  if (uaLower.includes('windows')) return 'windows'
  if (uaLower.includes('macintosh') || uaLower.includes('mac os x')) return 'macos'
  if (uaLower.includes('linux')) return 'linux'

  return 'other'
}

