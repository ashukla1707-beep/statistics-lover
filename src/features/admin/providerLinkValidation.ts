import type { DeliveryActionKind, DeliveryProvider } from './deliveryAdminService'

function googleDriveFileId(url: URL): string | null {
  const pathMatch = url.pathname.match(/^\/file\/d\/([^/?#]+)/)
  if (pathMatch?.[1]) return pathMatch[1]

  if (url.pathname === '/open' || url.pathname === '/uc') {
    return url.searchParams.get('id')
  }

  return null
}

export function normalizeDeliveryProviderReference(
  provider: DeliveryProvider,
  rawReference: string,
): string {
  const reference = rawReference.trim()

  let url: URL
  try {
    url = new URL(reference)
  } catch {
    return reference
  }

  if (provider !== 'google_drive' || url.hostname.toLowerCase() !== 'drive.google.com') {
    return reference
  }

  const fileId = googleDriveFileId(url)
  if (!fileId) return reference

  return `https://drive.google.com/file/d/${fileId}/preview`
}

export function validateDeliveryProviderReference(
  actionKind: DeliveryActionKind,
  provider: DeliveryProvider,
  rawReference: string,
): string | null {
  const reference = rawReference.trim()

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
    const host = url.hostname.toLowerCase()
    const allowed = host === 'videodelivery.net'
      || host.endsWith('.videodelivery.net')
      || host === 'cloudflarestream.com'
      || host.endsWith('.cloudflarestream.com')
    if (!allowed) return 'Cloudflare Stream links must use videodelivery.net or cloudflarestream.com.'
  }

  return null
}
