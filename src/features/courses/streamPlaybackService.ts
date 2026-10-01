import { requireSupabase } from '../../services/supabase/client'

export async function resolveStreamPlayback(batchId: string, lectureId: string) {
  const client = requireSupabase()
  const { data, error } = await client.auth.getSession()
  if (error) throw error
  const token = data.session?.access_token
  if (!token) throw new Error('Your session has expired. Sign in again to continue watching.')

  const response = await fetch('/api/stream/playback', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ batchId, lectureId }),
  })

  if (!response.ok) {
    let message = `Playback could not be opened (${response.status}).`
    try {
      const body = await response.json() as { error?: string }
      if (body.error) message = body.error
    } catch {
      // Keep the status-based fallback message.
    }
    throw new Error(message)
  }

  const body = await response.json() as { iframeUrl?: string }
  if (!body.iframeUrl) throw new Error('Cloudflare did not return a playback URL.')
  return body.iframeUrl
}
