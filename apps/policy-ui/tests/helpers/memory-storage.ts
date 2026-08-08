type StorageEntry = [string, string]

class MemoryStorage {
  private readonly entries = new Map<string, string>()

  get length(): number {
    return this.entries.size
  }

  clear() {
    this.entries.clear()
  }

  getItem(key: string): string | null {
    return this.entries.has(key) ? this.entries.get(key) ?? null : null
  }

  key(index: number): string | null {
    if (index < 0 || index >= this.entries.size) {
      return null
    }
    return Array.from(this.entries.keys())[index] ?? null
  }

  removeItem(key: string) {
    this.entries.delete(key)
  }

  setItem(key: string, value: string) {
    this.entries.set(key, value)
  }

  snapshot(): StorageEntry[] {
    return Array.from(this.entries.entries())
  }
}

export function installMemoryStorage() {
  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const storage = new MemoryStorage()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    writable: true,
    value: storage,
  })
  return {
    storage,
    restore() {
      if (originalDescriptor) {
        Object.defineProperty(globalThis, 'localStorage', originalDescriptor)
        return
      }
      Reflect.deleteProperty(globalThis, 'localStorage')
    },
  }
}
