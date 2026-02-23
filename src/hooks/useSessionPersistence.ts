import { useRef, useCallback } from 'react'
import { db } from '../db'
import type { ActiveSessionState } from '../db/types'

const DEBOUNCE_MS = 500
const MAX_AGE_MS = 12 * 60 * 60 * 1000 // 12 hours

export function useSessionPersistence() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const saveSessionState = useCallback((state: Omit<ActiveSessionState, 'id' | 'updatedAt'>) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      db.activeSession.put({ ...state, id: 1, updatedAt: new Date() }).catch(console.error)
    }, DEBOUNCE_MS)
  }, [])

  const saveSessionStateImmediate = useCallback(async (state: Omit<ActiveSessionState, 'id' | 'updatedAt'>) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    await db.activeSession.put({ ...state, id: 1, updatedAt: new Date() })
  }, [])

  const loadSessionState = useCallback(async (
    programId: number,
    sessionIndex: number,
  ): Promise<ActiveSessionState | null> => {
    const row = await db.activeSession.get(1)
    if (!row) return null

    // Check same session
    if (row.programId !== programId || row.sessionIndex !== sessionIndex) return null

    // Check not expired
    const updatedAt = row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt)
    if (Date.now() - updatedAt.getTime() > MAX_AGE_MS) {
      await db.activeSession.delete(1)
      return null
    }

    return row
  }, [])

  const clearSessionState = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    await db.activeSession.delete(1)
  }, [])

  return { saveSessionState, saveSessionStateImmediate, loadSessionState, clearSessionState }
}
