type AssetsBinding = {
  fetch(request: Request): Promise<Response>
}

type StreamVideoDetails = {
  readyToStream: boolean
  preview?: string
  hlsPlaybackUrl?: string
  status?: {
    state?: string
    pctComplete?: string
    errorReasonText?: string
  }
}

type StreamVideoHandle = {
  details(): Promise<StreamVideoDetails>
  generateToken(): Promise<string>
}

type StreamBinding = {
  createDirectUpload(input: {
    maxDurationSeconds: number
    creator?: string
    meta?: Record<string, string>
    requireSignedURLs?: boolean
  }): Promise<{ uploadURL: string; id?: string; uid?: string }>
  video(id: string): StreamVideoHandle
}

type Env = {
  ASSETS: AssetsBinding
  STREAM: StreamBinding
  SUPABASE_URL: string
  SUPABASE_PUBLISHABLE_KEY: string
  CLOUDFLARE_ACCOUNT_ID?: string
  CLOUDFLARE_STREAM_API_TOKEN?: string
}

type AuthUser = { id: string }
type UserRole = { role: string }
type StreamAssetRow = {
  lecture_id: string
  video_id: string
  file_name: string | null
  upload_state: string
  ready_to_stream: boolean
  processing_pct: number | null
  error_message: string | null
}

type DeliveryActionRow = {
  lecture_id: string
  action_kind: string
  provider: string
  action_url: string
  label: string
}

const STAFF_ROLES = new Set(['content_manager', 'admin', 'owner'])
const BASIC_UPLOAD_LIMIT_BYTES = 200 * 1024 * 1024

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

function cleanError(error: unknown) {
  if (error instanceof Error) return error.message
  return 'Unexpected server error.'
}

function bearerToken(request: Request) {
  const authorization = request.headers.get('authorization') ?? ''
  const match = authorization.match(/^Bearer\s+(.+)$/i)
  return match?.[1] ?? null
}

async function supabaseFetch(env: Env, path: string, token: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  headers.set('apikey', env.SUPABASE_PUBLISHABLE_KEY)
  headers.set('authorization', `Bearer ${token}`)
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json')
  return fetch(`${env.SUPABASE_URL}${path}`, { ...init, headers })
}

async function authenticate(request: Request, env: Env): Promise<{ token: string; user: AuthUser }> {
  const token = bearerToken(request)
  if (!token) throw new Response('Missing authorization.', { status: 401 })

  const response = await supabaseFetch(env, '/auth/v1/user', token)
  if (!response.ok) throw new Response('Invalid session.', { status: 401 })

  const user = await response.json() as AuthUser
  if (!user.id) throw new Response('Invalid session.', { status: 401 })
  return { token, user }
}

async function authenticateStaff(request: Request, env: Env) {
  const auth = await authenticate(request, env)
  const response = await supabaseFetch(
    env,
    `/rest/v1/user_roles?select=role&user_id=eq.${encodeURIComponent(auth.user.id)}`,
    auth.token,
  )
  if (!response.ok) throw new Response('Unable to verify role.', { status: 403 })
  const roles = await response.json() as UserRole[]
  if (!roles.some((item) => STAFF_ROLES.has(item.role))) {
    throw new Response('Staff access required.', { status: 403 })
  }
  return auth
}

async function upsertStreamAsset(
  env: Env,
  token: string,
  row: Partial<StreamAssetRow> & Pick<StreamAssetRow, 'lecture_id' | 'video_id'>,
) {
  const response = await supabaseFetch(
    env,
    '/rest/v1/lecture_stream_assets?on_conflict=lecture_id',
    token,
    {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(row),
    },
  )
  if (!response.ok) throw new Error(`Could not save Stream upload state (${response.status}).`)
}

async function loadStreamAsset(env: Env, token: string, lectureId: string) {
  const response = await supabaseFetch(
    env,
    `/rest/v1/lecture_stream_assets?select=lecture_id,video_id,file_name,upload_state,ready_to_stream,processing_pct,error_message&lecture_id=eq.${encodeURIComponent(lectureId)}&limit=1`,
    token,
  )
  if (!response.ok) throw new Error(`Could not load Stream upload state (${response.status}).`)
  const rows = await response.json() as StreamAssetRow[]
  return rows[0] ?? null
}

async function promoteReadyAsset(env: Env, token: string, lectureId: string, videoId: string) {
  const response = await supabaseFetch(
    env,
    '/rest/v1/lecture_delivery_sources?on_conflict=lecture_id,action_kind',
    token,
    {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        lecture_id: lectureId,
        action_kind: 'watch',
        provider: 'cloudflare_stream',
        provider_reference: `stream://${videoId}`,
        label: 'Watch recording',
      }),
    },
  )
  if (!response.ok) throw new Error(`Could not activate student playback (${response.status}).`)
}

function parseStreamId(reference: string) {
  if (reference.startsWith('stream://')) return reference.slice('stream://'.length)
  try {
    const url = new URL(reference)
    const part = url.pathname.split('/').filter(Boolean)[0]
    return part || null
  } catch {
    return null
  }
}

function base64(value: string) {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

async function handleDirectUpload(request: Request, env: Env) {
  const { token, user } = await authenticateStaff(request, env)
  const body = await request.json() as {
    lectureId?: string
    fileName?: string
    fileSize?: number
    maxDurationSeconds?: number
  }

  const lectureId = body.lectureId?.trim() ?? ''
  const fileName = body.fileName?.trim().slice(0, 240) || 'lecture-recording'
  const fileSize = Number(body.fileSize ?? 0)
  const maxDurationSeconds = Math.min(Math.max(Number(body.maxDurationSeconds ?? 3600), 60), 36000)
  if (!lectureId) return json({ error: 'Lecture is required.' }, 400)
  if (!Number.isFinite(fileSize) || fileSize <= 0) return json({ error: 'File size is required.' }, 400)
  if (fileSize > BASIC_UPLOAD_LIMIT_BYTES) {
    return json({
      error: 'This file needs resumable upload.',
      resumableRequired: true,
      basicLimitBytes: BASIC_UPLOAD_LIMIT_BYTES,
    }, 413)
  }

  const directUpload = await env.STREAM.createDirectUpload({
    maxDurationSeconds,
    creator: user.id,
    meta: { lecture_id: lectureId, name: fileName },
    requireSignedURLs: true,
  })
  const videoId = directUpload.id ?? directUpload.uid
  if (!videoId || !directUpload.uploadURL) throw new Error('Cloudflare did not return an upload target.')

  await upsertStreamAsset(env, token, {
    lecture_id: lectureId,
    video_id: videoId,
    file_name: fileName,
    upload_state: 'uploading',
    ready_to_stream: false,
    processing_pct: 0,
    error_message: null,
  })

  return json({ protocol: 'basic', uploadURL: directUpload.uploadURL, videoId })
}

async function handleTusUpload(request: Request, env: Env) {
  const { token, user } = await authenticateStaff(request, env)
  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_STREAM_API_TOKEN) {
    return json({
      error: 'Large-video resumable upload needs one-time Cloudflare Stream API credentials on this Worker.',
      setupRequired: true,
    }, 501)
  }

  const body = await request.json() as {
    lectureId?: string
    fileName?: string
    fileSize?: number
    maxDurationSeconds?: number
  }
  const lectureId = body.lectureId?.trim() ?? ''
  const fileName = body.fileName?.trim().slice(0, 240) || 'lecture-recording'
  const fileSize = Number(body.fileSize ?? 0)
  const maxDurationSeconds = Math.min(Math.max(Number(body.maxDurationSeconds ?? 3600), 60), 36000)
  if (!lectureId) return json({ error: 'Lecture is required.' }, 400)
  if (!Number.isFinite(fileSize) || fileSize <= 0) return json({ error: 'File size is required.' }, 400)

  const metadata = [
    `name ${base64(fileName)}`,
    'requiresignedurls',
    `maxdurationseconds ${base64(String(maxDurationSeconds))}`,
  ].join(',')

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/stream?direct_user=true`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.CLOUDFLARE_STREAM_API_TOKEN}`,
        'Tus-Resumable': '1.0.0',
        'Upload-Length': String(fileSize),
        'Upload-Creator': user.id,
        'Upload-Metadata': metadata,
      },
    },
  )

  if (!response.ok) {
    const text = await response.text()
    return json({ error: `Cloudflare could not start resumable upload: ${text.slice(0, 300)}` }, 502)
  }

  const uploadURL = response.headers.get('location')
  const videoId = response.headers.get('stream-media-id')
  if (!uploadURL || !videoId) throw new Error('Cloudflare did not return a resumable upload target.')

  await upsertStreamAsset(env, token, {
    lecture_id: lectureId,
    video_id: videoId,
    file_name: fileName,
    upload_state: 'uploading',
    ready_to_stream: false,
    processing_pct: 0,
    error_message: null,
  })

  return json({ protocol: 'tus', uploadURL, videoId })
}

async function handleStatus(request: Request, env: Env) {
  const { token } = await authenticateStaff(request, env)
  const lectureId = new URL(request.url).searchParams.get('lectureId')?.trim() ?? ''
  if (!lectureId) return json({ error: 'Lecture is required.' }, 400)

  const asset = await loadStreamAsset(env, token, lectureId)
  if (!asset) return json({ state: 'none', ready: false })

  let details: StreamVideoDetails
  try {
    details = await env.STREAM.video(asset.video_id).details()
  } catch (error) {
    return json({ state: asset.upload_state, ready: asset.ready_to_stream, error: cleanError(error) })
  }

  const state = details.readyToStream ? 'ready' : details.status?.state === 'error' ? 'error' : 'processing'
  const pct = Number.parseFloat(details.status?.pctComplete ?? '')
  const processingPct = Number.isFinite(pct) ? Math.min(Math.max(pct, 0), 100) : null
  const errorMessage = state === 'error' ? (details.status?.errorReasonText || 'Cloudflare could not process this video.') : null

  await upsertStreamAsset(env, token, {
    lecture_id: lectureId,
    video_id: asset.video_id,
    file_name: asset.file_name,
    upload_state: state,
    ready_to_stream: details.readyToStream,
    processing_pct: processingPct,
    error_message: errorMessage,
  })

  if (details.readyToStream) await promoteReadyAsset(env, token, lectureId, asset.video_id)

  return json({
    state,
    ready: details.readyToStream,
    processingPct,
    error: errorMessage,
    videoId: asset.video_id,
  })
}

async function handlePlayback(request: Request, env: Env) {
  const { token } = await authenticate(request, env)
  const body = await request.json() as { batchId?: string; lectureId?: string }
  const batchId = body.batchId?.trim() ?? ''
  const lectureId = body.lectureId?.trim() ?? ''
  if (!batchId || !lectureId) return json({ error: 'Batch and lecture are required.' }, 400)

  const response = await supabaseFetch(env, '/rest/v1/rpc/get_batch_delivery_actions', token, {
    method: 'POST',
    body: JSON.stringify({ target_batch: batchId }),
  })
  if (!response.ok) return json({ error: 'Playback access could not be verified.' }, 403)

  const actions = await response.json() as DeliveryActionRow[]
  const action = actions.find((item) =>
    item.lecture_id === lectureId
    && item.action_kind === 'watch'
    && item.provider === 'cloudflare_stream',
  )
  if (!action) return json({ error: 'This recording is not available for your account.' }, 403)

  const videoId = parseStreamId(action.action_url)
  if (!videoId) return json({ error: 'Invalid Stream reference.' }, 500)

  const video = env.STREAM.video(videoId)
  const details = await video.details()
  if (!details.readyToStream) return json({ error: 'This recording is still processing.', processing: true }, 409)

  const tokenValue = await video.generateToken()
  const originSource = details.preview || details.hlsPlaybackUrl
  if (!originSource) return json({ error: 'Cloudflare playback origin is unavailable.' }, 500)
  const origin = new URL(originSource).origin

  return json({ iframeUrl: `${origin}/${tokenValue}/iframe` })
}

async function route(request: Request, env: Env) {
  const url = new URL(request.url)
  try {
    if (url.pathname === '/api/stream/direct-upload' && request.method === 'POST') {
      return await handleDirectUpload(request, env)
    }
    if (url.pathname === '/api/stream/tus-upload' && request.method === 'POST') {
      return await handleTusUpload(request, env)
    }
    if (url.pathname === '/api/stream/status' && request.method === 'GET') {
      return await handleStatus(request, env)
    }
    if (url.pathname === '/api/stream/playback' && request.method === 'POST') {
      return await handlePlayback(request, env)
    }
    if (url.pathname.startsWith('/api/')) return json({ error: 'Not found.' }, 404)
    return env.ASSETS.fetch(request)
  } catch (error) {
    if (error instanceof Response) return error
    return json({ error: cleanError(error) }, 500)
  }
}

export default {
  fetch: route,
}
