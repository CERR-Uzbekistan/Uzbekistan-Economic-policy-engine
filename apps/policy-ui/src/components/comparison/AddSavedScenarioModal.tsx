import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { SavedScenarioRecord } from '../../state/scenarioStore.js'

type AddSavedScenarioModalProps = {
  isOpen: boolean
  savedScenarios: SavedScenarioRecord[]
  activeScenarioIds: string[]
  maxSelectable: number
  onClose: () => void
  onAddSelected: (scenarioIds: string[]) => void
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

export function AddSavedScenarioModal({
  isOpen,
  savedScenarios,
  activeScenarioIds,
  maxSelectable,
  onClose,
  onAddSelected,
}: AddSavedScenarioModalProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? 'en'
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)
  const activeScenarioIdSet = useMemo(() => new Set(activeScenarioIds), [activeScenarioIds])
  const [checkedIds, setCheckedIds] = useState<string[]>([])

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
        setCheckedIds([])
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

  if (!isOpen) {
    return null
  }

  function closeModal() {
    setCheckedIds([])
    onClose()
  }

  function handleToggle(scenarioId: string, checked: boolean) {
    setCheckedIds((current) => {
      if (checked) {
        return Array.from(new Set([...current, scenarioId])).slice(0, maxSelectable)
      }
      return current.filter((id) => id !== scenarioId)
    })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (checkedIds.length === 0) {
      return
    }
    onAddSelected(checkedIds)
    closeModal()
  }

  return (
    <div
      className="comparison-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          closeModal()
        }
      }}
    >
      <div
        ref={dialogRef}
        className="comparison-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="comparison-saved-modal-title"
      >
        <form onSubmit={handleSubmit}>
          <div className="comparison-modal__head">
            <h3 id="comparison-saved-modal-title">{t('comparison.savedModal.title')}</h3>
            <button type="button" className="btn-ghost" onClick={closeModal} aria-label={t('buttons.close')}>
              {t('buttons.close')}
            </button>
          </div>

          {savedScenarios.length === 0 ? (
            <p className="empty-state">{t('comparison.selector.savedEmpty')}</p>
          ) : (
            <ul className="comparison-modal__list">
              {savedScenarios.map((record) => {
                const isActive = activeScenarioIdSet.has(record.scenario_id)
                const isChecked = checkedIds.includes(record.scenario_id)
                const isSelectionCapped = !isChecked && checkedIds.length >= maxSelectable
                const inputId = `comparison-saved-${record.scenario_id}`
                return (
                  <li key={record.scenario_id} className="comparison-modal__item">
                    <label className="comparison-modal__option" htmlFor={inputId}>
                      <input
                        id={inputId}
                        type="checkbox"
                        checked={isChecked}
                        disabled={isActive || isSelectionCapped}
                        onChange={(event) => handleToggle(record.scenario_id, event.target.checked)}
                      />
                      <span className="comparison-modal__item-body">
                        <strong>{record.scenario_name}</strong>
                        <span>
                          {t(`comparison.selector.scenarioType.${record.scenario_type}`)} ·{' '}
                          {formatSavedAt(record.stored_at, locale)}
                        </span>
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="comparison-modal__actions">
            <button type="button" className="btn-ghost" onClick={closeModal}>
              {t('buttons.cancel')}
            </button>
            <button type="submit" className="btn-secondary" disabled={checkedIds.length === 0}>
              {t('comparison.savedModal.addSelected')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
