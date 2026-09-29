/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_ENV?: 'development' | 'staging' | 'production'
  readonly VITE_API_BASE_URL?: string
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_LIVE_PROVIDER?: string
  readonly VITE_VIDEO_PROVIDER?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
