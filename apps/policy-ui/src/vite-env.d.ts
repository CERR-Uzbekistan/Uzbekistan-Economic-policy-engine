/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OVERVIEW_DATA_MODE?: 'mock' | 'live'
  readonly VITE_OVERVIEW_API_URL?: string
  readonly VITE_OVERVIEW_TIMEOUT_MS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

