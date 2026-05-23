export function getRovingTabIndexForKey(key: string, currentIndex: number, tabCount: number): number | null {
  if (tabCount <= 0 || currentIndex < 0) return null

  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return (currentIndex + 1) % tabCount
    case 'ArrowLeft':
    case 'ArrowUp':
      return (currentIndex - 1 + tabCount) % tabCount
    case 'Home':
      return 0
    case 'End':
      return tabCount - 1
    default:
      return null
  }
}

export function focusElementById(elementId: string): void {
  if (typeof document === 'undefined') return

  const focusElement = () => document.getElementById(elementId)?.focus()
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(focusElement)
    return
  }
  focusElement()
}
