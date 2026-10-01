import type { DeliveryActionKind, DeliveryProvider } from './deliveryAdminService'

function googleDriveFileId(url: URL): string | null {
  const pathMatch = url.pathname.match(/^\/file\/d\/([^/?#]+)/)
  if (pathMatch?.[1]) return pathMatch[1]

  if (url.pathname === '/open' || url.pathname === '/uc') {
    return url.searchParams.get('id')
  }

  return null
}

function isCloudflareStreamHost(hostname: string) {
  const host = hostname.toLowerCase()
  return host === 'videodelivery.net'
    || host.endsWith('.videodelivery.net')
    || host === 'cloudflarestream.com'
    || host.endsWith('.cloudflarestream.com')
}

function cloudflareStreamVideoId(url: URL): string | null {
  if (!isCloudflareStreamHost(url.hostname)) return null
  const segments = url.pathname.split('/').filter(Boolean)
  if (segments.length === 0) return null
  return segments[0]
}

function isInternalStreamReference(reference: string) {
  return /^stream:\/\/[A-Za-z0-9_-]+$/.test(reference)
}

export function normalizeDeliveryProviderReference(
  provider: DeliveryProvider,
  rawReference: string,
): string {
  const reference = rawReference.trim()
  if (provider === 'cloudflare_stream' && isInternalStreamReference(reference)) return reference

  let url: URL
  try {
    url = new URL(reference)
  } catch {
    return reference
  }

  if (provider === 'google_drive' && url.hostname.toLowerCase() === 'drive.google.com') {
    const fileId = googleDriveFileId(url)
    if (!fileId) return reference
    return `https://drive.google.com/file/d/${fileId}/preview`
  }

  if (provider === 'cloudflare_stream' && isCloudflareStreamHost(url.hostname)) {
    const videoId = cloudflareStreamVideoId(url)
    if (!videoId) return reference
    return `${url.origin}/${videoId}/iframe`
  }

  return reference
}

export function validateDeliveryProviderReference(
  actionKind: DeliveryActionKind,
  provider: DeliveryProvider,
  rawReference: string,
): string | null {
  const reference = rawReference.trim()

  if (provider === 'cloudflare_stream' && isInternalStreamReference(reference)) {
    return actionKind === 'watch' ? null : 'Cloudflare Stream can only be used for recording access.'
  }

  let url: URL
  try {
    url = new URL(reference)
  } catch {
    return 'Enter a valid HTTPS link.'
  }

  if (url.protocol !== 'https:') return 'Provider links must use HTTPS.'

  if (provider === 'google_meet') {
    if (actionKind !== 'join') return 'Google Meet can only be used for live-class access.'
    if (url.hostname !== 'meet.google.com') return 'Google Meet links must use meet.google.com.'
  }

  if (provider === 'google_drive') {
    if (actionKind !== 'watch') return 'Google Drive can only be used for recording access.'
    if (url.hostname !== 'drive.google.com') return 'Google Drive recording links must use drive.google.com.'
    if (!googleDriveFileId(url)) return 'Use a Google Drive file link, not a folder or general Drive page.'
  }

  if (provider === 'cloudflare_stream') {
    if (actionKind !== 'watch') return 'Cloudflare Stream can only be used for recording access.'
    if (!isCloudflareStreamHost(url.hostname)) return 'Cloudflare Stream links must use videodelivery.net or cloudflarestream.com.'
    if (!cloudflareStreamVideoId(url)) return 'Use a Cloudflare Stream player link containing a video ID.'
  }

  return null
}
