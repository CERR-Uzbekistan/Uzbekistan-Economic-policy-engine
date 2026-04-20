import { useSyncExternalStore } from 'react'

export type PageFreshness = {
  ageInDays: number
}

type Subscriber = () => void

let currentFreshness: PageFreshness | null = null
const subscribers = new Set<Subscriber>()

function emit() {
  for (const subscriber of subscribers) {
    subscriber()
  }
}

export function setPageFreshness(nextFreshness: PageFreshness | null) {
  currentFreshness = nextFreshness
  emit()
}

export function getPageFreshness() {
  return currentFreshness
}

export function subscribePageFreshness(subscriber: Subscriber) {
  subscribers.add(subscriber)
  return () => {
    subscribers.delete(subscriber)
  }
}

export function usePageFreshness() {
  return useSyncExternalStore(subscribePageFreshness, getPageFreshness, () => null)
}
