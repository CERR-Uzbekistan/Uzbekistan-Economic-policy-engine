/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OVERVIEW_DATA_MODE?: 'mock' | 'live'
  readonly VITE_OVERVIEW_API_URL?: string
  readonly VITE_OVERVIEW_TIMEOUT_MS?: string
  readonly VITE_SCENARIO_LAB_DATA_MODE?: 'mock' | 'live'
  readonly VITE_SCENARIO_LAB_API_URL?: string
  readonly VITE_SCENARIO_LAB_TIMEOUT_MS?: string
  readonly VITE_COMPARISON_DATA_MODE?: 'mock' | 'live'
  readonly VITE_COMPARISON_API_URL?: string
  readonly VITE_COMPARISON_TIMEOUT_MS?: string
  readonly VITE_MODEL_EXPLORER_DATA_MODE?: 'mock' | 'live'
  readonly VITE_MODEL_EXPLORER_API_URL?: string
  readonly VITE_MODEL_EXPLORER_TIMEOUT_MS?: string
  readonly VITE_QPM_DATA_URL?: string
  readonly VITE_QPM_TIMEOUT_MS?: string
  readonly VITE_DFM_DATA_URL?: string
  readonly VITE_DFM_TIMEOUT_MS?: string
  readonly VITE_IO_DATA_URL?: string
  readonly VITE_IO_TIMEOUT_MS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

