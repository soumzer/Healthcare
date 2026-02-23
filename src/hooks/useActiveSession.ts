import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { ActiveSessionState } from '../db/types'

const MAX_AGE_MS = 12 * 60 * 60 * 1000 // 12 hours

export function useActiveSession(): ActiveSessionState | null {
  const row = useLiveQuery(() => db.activeSession.get(1))

  if (!row) return null

  const updatedAt = row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt)
  if (Date.now() - updatedAt.getTime() > MAX_AGE_MS) return null

  return row
}
