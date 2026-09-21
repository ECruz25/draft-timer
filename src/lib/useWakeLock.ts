import { useEffect, useState } from 'react'

/** Keeps the screen on while `active` (iOS 16.4+, Android Chrome, desktop). Re-acquires after tab switches. */
export function useWakeLock(active: boolean) {
  const [held, setHeld] = useState(false)
  const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator

  useEffect(() => {
    if (!active || !supported) return
    let sentinel: WakeLockSentinel | undefined
    let cancelled = false

    const acquire = async () => {
      if (document.visibilityState !== 'visible' || (sentinel && !sentinel.released)) return
      try {
        sentinel = await navigator.wakeLock.request('screen')
        if (cancelled) {
          void sentinel.release()
          return
        }
        setHeld(true)
        sentinel.addEventListener('release', () => setHeld(false))
      } catch {
        setHeld(false)
      }
    }

    void acquire()
    document.addEventListener('visibilitychange', acquire)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', acquire)
      void sentinel?.release()
      setHeld(false)
    }
  }, [active, supported])

  return { supported, held }
}
