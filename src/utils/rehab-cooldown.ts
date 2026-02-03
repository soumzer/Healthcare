/**
 * Rehab routine cooldown management
 * Prevents users from spamming rehab routines by enforcing a 12-hour cooldown
 */

const STORAGE_KEY = 'last_rehab_completed_at'
export const REHAB_COOLDOWN_HOURS = 12

// Safe localStorage helpers (handle private browsing / storage full)
function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

/**
 * Record that a rehab routine was just completed
 */
export function recordRehabCompletion(): void {
  safeSetItem(STORAGE_KEY, new Date().toISOString())
}

/**
 * Get the timestamp of the last rehab completion
 */
export function getLastRehabCompletedAt(): Date | null {
  const stored = safeGetItem(STORAGE_KEY)
  if (!stored) return null
  const date = new Date(stored)
  return isNaN(date.getTime()) ? null : date
}

/**
 * Check if the rehab routine is currently available (cooldown has passed)
 */
export function isRehabAvailable(): boolean {
  const lastCompleted = getLastRehabCompletedAt()
  if (!lastCompleted) return true

  const hoursSince = (Date.now() - lastCompleted.getTime()) / (1000 * 60 * 60)
  return hoursSince >= REHAB_COOLDOWN_HOURS
}

/**
 * Get remaining cooldown time in hours (rounded up)
 * Returns 0 if cooldown has passed
 */
export function getRemainingCooldownHours(): number {
  const lastCompleted = getLastRehabCompletedAt()
  if (!lastCompleted) return 0

  const hoursSince = (Date.now() - lastCompleted.getTime()) / (1000 * 60 * 60)
  if (hoursSince >= REHAB_COOLDOWN_HOURS) return 0

  return Math.ceil(REHAB_COOLDOWN_HOURS - hoursSince)
}

/**
 * Get a formatted string for the remaining cooldown time
 * e.g., "Disponible dans 8h"
 */
export function getRemainingCooldownText(): string | null {
  const remaining = getRemainingCooldownHours()
  if (remaining <= 0) return null
  return `Disponible dans ${remaining}h`
}
