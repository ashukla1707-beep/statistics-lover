import type { LiveProvider, VideoProvider } from '../../types/domain'

/**
 * External services must remain adapters, not domain models.
 * The LMS speaks in terms of live sessions and recordings; providers are replaceable.
 */
export interface LiveClassAdapter {
  provider: LiveProvider
  getJoinUrl(sessionReference: string): Promise<string>
}

export interface VideoAdapter {
  provider: VideoProvider
  getPlaybackUrl(videoReference: string): Promise<string>
}
