import { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { SavedScenarioRecord } from '../../state/scenarioStore'

type SavedScenarioModalProps = {
  isOpen: boolean
  onClose: () => void
  savedScenarios: SavedScenarioRecord[]
  onLoadScenario: (scenarioId: string) => void
  onDeleteScenario: (scenarioId: string) => void
}

function formatSavedAt(isoTimestamp: string, locale: string): string {
  const parsed = Date.parse(isoTimestamp)
  if (!Number.isFinite(parsed)) {
    return isoTimestamp
  }
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(parsed))
}

// Prompt §4.4 + §3.5: focus-trapped modal picker for saved scenarios. Replaces
// the inline saved-scenarios list in AssumptionsPanel so the left column stays
// focused on assumption editing.
export function SavedScenarioModal({
  isOpen,
  onClose,
  savedScenarios,
  onLoadScenario,
  onDeleteScenario,
}: SavedScenarioModalProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? 'en'
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null

    const focusFirstFocusable = () => {
      const dialog = dialogRef.current
      if (!dialog) return
      const focusable = dialog.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      focusable?.focus()
    }

    const raf = window.requestAnimationFrame(focusFirstFocusable)
    return () => {
      window.cancelAnimationFrame(raf)
      previouslyFocusedRef.current?.focus()
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      return
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key !== 'Tab') {
        return
      }
      const dialog = dialogRef.current
      if (!dialog) return
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  const items = useMemo(() => savedScenarios, [savedScenarios])

  if (!isOpen) {
    return null
  }

  return (
    <div
      className="scenario-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        ref={dialogRef}
        className="scenario-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="saved-scenario-modal-title"
      >
        <div className="scenario-modal__head">
          <h3 id="saved-scenario-modal-title">{t('scenarioLab.saved.title')}</h3>
          <button type="button" className="btn-ghost" onClick={onClose} aria-label={t('buttons.close')}>
            {t('buttons.close')}
          </button>
        </div>
        {items.length === 0 ? (
          <p className="empty-state">{t('scenarioLab.saved.empty')}</p>
        ) : (
          <ul className="scenario-modal__list">
            {items.map((record) => (
              <li key={record.scenario_id} className="scenario-modal__item">
                <div className="scenario-modal__item-body">
                  <strong>{record.scenario_name}</strong>
                  <span>{formatSavedAt(record.stored_at, locale)}</span>
                </div>
                <div className="scenario-modal__item-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      onLoadScenario(record.scenario_id)
                      onClose()
                    }}
                  >
                    {t('scenarioLab.saved.load')}
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => onDeleteScenario(record.scenario_id)}
                  >
                    {t('scenarioLab.saved.delete')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
