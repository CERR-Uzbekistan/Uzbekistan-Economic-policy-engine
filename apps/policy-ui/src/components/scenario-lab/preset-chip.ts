import type { KeyboardEventHandler } from 'react'

export function activatePresetChip(onPresetChange: (presetId: string) => void, presetId: string) {
  onPresetChange(presetId)
}

type PresetChipPresentation = {
  ariaPressed: boolean
  className: string
  onClick: () => void
  onKeyDown: KeyboardEventHandler<HTMLButtonElement>
}

export function buildPresetChipPresentation(
  selectedPresetId: string,
  presetId: string,
  onPresetChange: (presetId: string) => void,
): PresetChipPresentation {
  const isActive = selectedPresetId === presetId
  return {
    ariaPressed: isActive,
    className: `preset-chip ${isActive ? 'active' : ''}`.trim(),
    onClick: () => activatePresetChip(onPresetChange, presetId),
    onKeyDown: (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        activatePresetChip(onPresetChange, presetId)
      }
    },
  }
}
