import { createContext } from 'react'

export type LanguageCode = 'en' | 'ru' | 'uz'

export type LanguageState = {
  language: LanguageCode
  setLanguage: (next: LanguageCode) => void
}

export const LanguageContext = createContext<LanguageState | undefined>(undefined)
