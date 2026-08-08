import type { LanguageCode } from '../../state/language-context'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../state/useLanguage'

const OPTIONS: { value: LanguageCode; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'ru', label: 'RU' },
  { value: 'uz', label: 'UZ' },
]

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()
  const { t } = useTranslation()

  return (
    <label className="language-switcher">
      <span className="language-switcher__label">{t('languageSwitcher.label')}</span>
      <select
        value={language}
        onChange={(event) => setLanguage(event.target.value as LanguageCode)}
        aria-label={t('languageSwitcher.ariaLabel')}
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
