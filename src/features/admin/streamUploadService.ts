import { requireSupabase } from '../../services/supabase/client'

const BASIC_UPLOAD_LIMIT_BYTES = 200 * 1024 * 1024
const TUS_CHUNK_BYTES = 50 * 1024 * 1024

export type StreamUploadStatus = {
  state: 'none' | 'uploading' | 'processing' | 'ready' | 'error'
  ready: boolean
  processingPct?: number | null
  error?: string | null
  videoId?: string
}

type UploadTarget = {
  protocol: 'basic' | 'tus'
  uploadURL: string
  videoId: string
}

type UploadOptions = {
  lectureId: string
  file: File
  maxDurationSeconds: number
  onProgress?: (percent: number) => void
}

async function authHeaders(includeJson = true) {
  const client = requireSupabase()
  const { data, error } = await client.auth.getSession()
  if (error) throw error
  const token = data.session?.access_token
  if (!token) throw new Error('Your session has expired. Sign in again before uploading.')
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` }
  if (includeJson) headers['Content-Type'] = 'application/json'
  return headers
}

async function readApiError(response: Response) {
  try {
    const payload = await response.json() as { error?: string }
    return payload.error || `Request failed (${response.status}).`
  } catch {
    return `Request failed (${response.status}).`
  }
}

async function createUploadTarget(options: UploadOptions): Promise<UploadTarget> {
  const endpoint = options.file.size > BASIC_UPLOAD_LIMIT_BYTES
    ? '/api/stream/tus-upload'
    : '/api/stream/direct-upload'

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({
      lectureId: options.lectureId,
      fileName: options.file.name,
      fileSize: options.file.size,
      maxDurationSeconds: options.maxDurationSeconds,
    }),
  })

  if (!response.ok) throw new Error(await readApiError(response))
  return response.json() as Promise<UploadTarget>
}

function uploadBasic(file: File, uploadURL: string, onProgress?: (percent: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', uploadURL)
    xhr.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable) return
      onProgress?.(Math.round((event.loaded / event.total) * 100))
    })
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100)
        resolve()
      } else {
        reject(new Error(`Cloudflare upload failed (${xhr.status}).`))
      }
    })
    xhr.addEventListener('error', () => reject(new Error('Network error while uploading the recording.')))
    xhr.addEventListener('abort', () => reject(new Error('Recording upload was cancelled.')))
    const formData = new FormData()
    formData.append('file', file)
    xhr.send(formData)
  })
}

async function patchTusChunk(uploadURL: string, chunk: Blob, offset: number) {
  let lastError: unknown = null
  for (const delay of [0, 1200, 3000, 6000]) {
    if (delay) await new Promise((resolve) => window.setTimeout(resolve, delay))
    try {
      const response = await fetch(uploadURL, {
        method: 'PATCH',
        headers: {
          'Tus-Resumable': '1.0.0',
          'Upload-Offset': String(offset),
          'Content-Type': 'application/offset+octet-stream',
        },
        body: chunk,
      })
      if (!response.ok) throw new Error(`Resumable upload failed (${response.status}).`)
      const next = Number(response.headers.get('Upload-Offset'))
      return Number.isFinite(next) ? next : offset + chunk.size
    } catch (error) {
      lastError = error
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Resumable upload failed.')
}

async function uploadTus(file: File, uploadURL: string, onProgress?: (percent: number) => void) {
  let offset = 0
  while (offset < file.size) {
    const end = Math.min(offset + TUS_CHUNK_BYTES, file.size)
    const chunk = file.slice(offset, end)
    offset = await patchTusChunk(uploadURL, chunk, offset)
    onProgress?.(Math.min(100, Math.round((offset / file.size) * 100)))
  }
}

export async function uploadLectureToStream(options: UploadOptions) {
  const target = await createUploadTarget(options)
  options.onProgress?.(0)
  if (target.protocol === 'tus') {
    await uploadTus(options.file, target.uploadURL, options.onProgress)
  } else {
    await uploadBasic(options.file, target.uploadURL, options.onProgress)
  }
  return target.videoId
}

export async function getStreamUploadStatus(lectureId: string): Promise<StreamUploadStatus> {
  const response = await fetch(`/api/stream/status?lectureId=${encodeURIComponent(lectureId)}`, {
    headers: await authHeaders(false),
  })
  if (!response.ok) throw new Error(await readApiError(response))
  return response.json() as Promise<StreamUploadStatus>
}

export async function waitForStreamReady(
  lectureId: string,
  onStatus?: (status: StreamUploadStatus) => void,
): Promise<StreamUploadStatus> {
  for (let attempt = 0; attempt < 150; attempt += 1) {
    const status = await getStreamUploadStatus(lectureId)
    onStatus?.(status)
    if (status.ready || status.state === 'error') return status
    await new Promise((resolve) => window.setTimeout(resolve, 4000))
  }
  return { state: 'processing', ready: false, error: 'Upload finished, but processing is taking longer than expected. You can leave this page and check again later.' }
}
