import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { I18nextProvider } from 'react-i18next'
import i18n from '../i18n'
import { LanguageContext, type LanguageCode } from './language-context'

function normalizeLanguageCode(value: string | undefined): LanguageCode {
  if (value === 'ru' || value?.startsWith('ru-')) {
    return 'ru'
  }
  if (value === 'uz' || value?.startsWith('uz-')) {
    return 'uz'
  }
  return 'en'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(() =>
    normalizeLanguageCode(i18n.resolvedLanguage ?? i18n.language),
  )

  useEffect(() => {
    const applyLanguage = (nextLanguage: string) => {
      const normalized = normalizeLanguageCode(nextLanguage)
      setLanguageState(normalized)
      document.documentElement.lang = normalized
    }

    applyLanguage(i18n.resolvedLanguage ?? i18n.language)
    i18n.on('languageChanged', applyLanguage)

    return () => {
      i18n.off('languageChanged', applyLanguage)
    }
  }, [])

  const value = useMemo(
    () => ({
      language,
      setLanguage: (next: LanguageCode) => {
        void i18n.changeLanguage(next)
      },
    }),
    [language],
  )

  return (
    <I18nextProvider i18n={i18n}>
      <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
    </I18nextProvider>
  )
}
