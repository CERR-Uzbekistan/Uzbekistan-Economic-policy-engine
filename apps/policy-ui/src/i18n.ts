import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import enCommon from './locales/en/common.json'
import ruCommon from './locales/ru/common.json'
import uzCommon from './locales/uz/common.json'

// TODO: native speaker review — Uzbek shell strings added for the React UI that were not
// present in the legacy prototype dictionary should be reviewed by a native speaker.
void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon },
      ru: { common: ruCommon },
      uz: { common: uzCommon },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'ru', 'uz'],
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    defaultNS: 'common',
    ns: ['common'],
    interpolation: {
      escapeValue: false,
    },
    returnNull: false,
    returnEmptyString: false,
    detection: {
      order: ['querystring', 'localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupQuerystring: 'lang',
    },
    react: {
      useSuspense: false,
    },
  })

export default i18n
