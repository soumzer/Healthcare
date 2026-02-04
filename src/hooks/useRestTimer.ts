import { useState, useRef, useCallback, useEffect } from 'react'

export interface UseRestTimerReturn {
  remaining: number
  isRunning: boolean
  start: () => void
  pause: () => void
  reset: () => void
  formatTime: () => string
}

export function useRestTimer(restSeconds: number): UseRestTimerReturn {
  const [remaining, setRemaining] = useState(restSeconds)
  const [isRunning, setIsRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const endTimeRef = useRef<number | null>(null)

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    endTimeRef.current = null
    setIsRunning(false)
  }, [])

  const start = useCallback(() => {
    // Use wall-clock based timer for accuracy (survives tab suspension)
    const end = Date.now() + remaining * 1000
    endTimeRef.current = end
    setIsRunning(true)

    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      const left = Math.max(0, Math.ceil((end - Date.now()) / 1000))
      setRemaining(left)
      if (left <= 0) {
        clearInterval(intervalRef.current!)
        intervalRef.current = null
        endTimeRef.current = null
        setIsRunning(false)

        // Vibrate + sound notification
        try {
          if (navigator.vibrate) navigator.vibrate([200, 100, 200])
        } catch { /* ignore */ }
      }
    }, 250)
  }, [remaining])

  const pause = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    // Freeze remaining at current value
    if (endTimeRef.current) {
      const left = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000))
      setRemaining(left)
    }
    endTimeRef.current = null
    setIsRunning(false)
  }, [])

  const reset = useCallback(() => {
    stop()
    setRemaining(restSeconds)
  }, [stop, restSeconds])

  // Reset remaining when restSeconds prop changes
  useEffect(() => {
    if (!isRunning) {
      setRemaining(restSeconds)
    }
  }, [restSeconds, isRunning])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const formatTime = useCallback(() => {
    const mins = Math.floor(remaining / 60)
    const secs = remaining % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [remaining])

  return { remaining, isRunning, start, pause, reset, formatTime }
}
