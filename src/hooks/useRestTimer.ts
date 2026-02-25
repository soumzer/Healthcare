import { useState, useRef, useCallback, useEffect } from 'react'

// Shared AudioContext — created on first user gesture (start), reused for timer sounds.
// iOS Safari suspends AudioContext created outside a user gesture, so we create it
// inside start() and keep it alive for the timer end sound.
let sharedAudioCtx: AudioContext | null = null

function ensureAudioContext(): AudioContext | null {
  try {
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioContext()
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume()
    }
    return sharedAudioCtx
  } catch { return null }
}

function playTimerSound() {
  const ctx = ensureAudioContext()
  if (!ctx) return
  try {
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(880, ctx.currentTime)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start()
    oscillator.stop(ctx.currentTime + 0.3)
  } catch { /* ignore */ }
}

function vibrate(pattern: number[]) {
  try { navigator.vibrate?.(pattern) } catch { /* ignore */ }
}

export interface UseRestTimerReturn {
  remaining: number
  isRunning: boolean
  endTime: number | null
  start: () => void
  pause: () => void
  reset: () => void
  formatTime: () => string
}

export function useRestTimer(restSeconds: number, initialEndTime?: number | null): UseRestTimerReturn {
  const [remaining, setRemaining] = useState(() => {
    if (initialEndTime) {
      const left = Math.max(0, Math.ceil((initialEndTime - Date.now()) / 1000))
      return left > 0 ? left : restSeconds
    }
    return restSeconds
  })
  const [isRunning, setIsRunning] = useState(() => {
    if (initialEndTime) {
      return initialEndTime > Date.now()
    }
    return false
  })
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const endTimeRef = useRef<number | null>(initialEndTime && initialEndTime > Date.now() ? initialEndTime : null)

  // Auto-start interval if restored with a running timer
  useEffect(() => {
    if (endTimeRef.current && endTimeRef.current > Date.now() && !intervalRef.current) {
      const end = endTimeRef.current
      intervalRef.current = setInterval(() => {
        const left = Math.max(0, Math.ceil((end - Date.now()) / 1000))
        setRemaining(left)
        if (left <= 0) {
          clearInterval(intervalRef.current!)
          intervalRef.current = null
          endTimeRef.current = null
          setIsRunning(false)
          playTimerSound()
          vibrate([200, 100, 200])
        }
      }, 250)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    endTimeRef.current = null
    setIsRunning(false)
  }, [])

  const start = useCallback(() => {
    // Unlock AudioContext on user gesture (required for iOS Safari)
    ensureAudioContext()

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
        playTimerSound()
        vibrate([200, 100, 200])
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

  // When app comes back to foreground, catch expired timer and notify
  const firedRef = useRef(false)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      if (!endTimeRef.current || firedRef.current) return
      if (Date.now() >= endTimeRef.current) {
        // Timer expired while backgrounded — notify now
        firedRef.current = true
        setRemaining(0)
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
        endTimeRef.current = null
        setIsRunning(false)
        playTimerSound()
        vibrate([200, 100, 200])
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  // Reset firedRef when timer starts
  useEffect(() => {
    if (isRunning) firedRef.current = false
  }, [isRunning])

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

  return { remaining, isRunning, endTime: endTimeRef.current, start, pause, reset, formatTime }
}
