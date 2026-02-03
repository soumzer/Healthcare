/**
 * Rehab Exercise Dosage/Rotation System
 *
 * Limits each rehab routine to max 5 exercises with intelligent rotation.
 * Prioritizes exercises based on:
 * 1. Priority level (warmup/nerve flossing = high, stretches = medium, foam rolling = low)
 * 2. Time since last done (exercises not done recently are prioritized)
 *
 * Ensures at least one warmup/priority-1 exercise is included.
 */

import type { RehabExercise } from '../data/rehab-protocols'

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface RehabExerciseWithMeta {
  exercise: RehabExercise
  protocolName: string
  priority: number // 1 = high (warmup, nerve flossing), 2 = medium (stretches, strengthening), 3 = low (foam rolling, massage)
  lastDoneAt: number | null // timestamp
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'rehab_exercise_history'
const DEFAULT_MAX_COUNT = 5

// Priority assignment based on exercise characteristics
const HIGH_PRIORITY_KEYWORDS = [
  'warmup',
  'nerve floss',
  'nerve glid',
  'isométrique',
  'mckenzie',
  'dead bug',
  'bird dog',
  'chin tuck',
  'spanish squat',
]

const LOW_PRIORITY_KEYWORDS = [
  'foam roll',
  'massage',
  'balle',
  'auto-massage',
]

// ---------------------------------------------------------------------------
// Storage functions
// ---------------------------------------------------------------------------

/**
 * Get exercise history from localStorage
 * Returns a map of exerciseName -> last done timestamp
 */
export function getRehabExerciseHistory(): Record<string, number> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return {}
    return JSON.parse(stored) as Record<string, number>
  } catch {
    return {}
  }
}

/**
 * Record that exercises were completed
 * Updates localStorage with current timestamp for each exercise
 */
export function recordRehabExercisesDone(exerciseNames: string[]): void {
  const history = getRehabExerciseHistory()
  const now = Date.now()

  for (const name of exerciseNames) {
    history[name] = now
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
  } catch {
    // Ignore storage errors
  }
}

// ---------------------------------------------------------------------------
// Priority calculation
// ---------------------------------------------------------------------------

/**
 * Assign priority to an exercise based on its name and type
 * 1 = high (warmup, nerve flossing, key therapeutic)
 * 2 = medium (stretches, strengthening)
 * 3 = low (foam rolling, massage)
 */
export function assignPriority(exercise: RehabExercise): number {
  const nameLower = exercise.exerciseName.toLowerCase()
  const notesLower = exercise.notes.toLowerCase()
  const combined = `${nameLower} ${notesLower}`

  // Check for high priority keywords
  for (const keyword of HIGH_PRIORITY_KEYWORDS) {
    if (combined.includes(keyword)) {
      return 1
    }
  }

  // Check for low priority keywords
  for (const keyword of LOW_PRIORITY_KEYWORDS) {
    if (combined.includes(keyword)) {
      return 3
    }
  }

  // Default: medium priority for stretches, strengthening, etc.
  return 2
}

// ---------------------------------------------------------------------------
// Selection algorithm
// ---------------------------------------------------------------------------

/**
 * Select the next set of exercises for the routine
 *
 * Algorithm:
 * 1. Enrich exercises with priority and last-done timestamps
 * 2. Sort by: lastDoneAt ASC (null = never done = first), then priority ASC
 * 3. Ensure at least 1 priority-1 exercise is included
 * 4. Take top N exercises (default 5)
 */
export function selectRehabExercises(
  allExercises: RehabExerciseWithMeta[],
  maxCount: number = DEFAULT_MAX_COUNT
): RehabExercise[] {
  if (allExercises.length === 0) return []
  if (allExercises.length <= maxCount) {
    return allExercises.map(e => e.exercise)
  }

  // Sort by: lastDoneAt ASC (null first), then priority ASC
  const sorted = [...allExercises].sort((a, b) => {
    // Null lastDoneAt = never done = highest priority
    const aTime = a.lastDoneAt ?? 0
    const bTime = b.lastDoneAt ?? 0

    // Primary sort: by last done time (oldest first)
    if (aTime !== bTime) {
      return aTime - bTime
    }

    // Secondary sort: by priority (1 before 2 before 3)
    return a.priority - b.priority
  })

  // Take top maxCount
  const selected = sorted.slice(0, maxCount)

  // Ensure at least 1 priority-1 exercise is included
  const hasPriority1 = selected.some(e => e.priority === 1)
  if (!hasPriority1) {
    // Find a priority-1 exercise from the remaining pool
    const priority1Exercise = sorted.slice(maxCount).find(e => e.priority === 1)
    if (priority1Exercise) {
      // Replace the last (lowest priority) selected exercise
      selected[maxCount - 1] = priority1Exercise
    }
  }

  return selected.map(e => e.exercise)
}

/**
 * Helper to enrich exercises with metadata for selection
 * Takes raw exercises from a protocol and adds priority + history
 */
export function enrichExercisesWithMeta(
  exercises: RehabExercise[],
  protocolName: string
): RehabExerciseWithMeta[] {
  const history = getRehabExerciseHistory()

  return exercises.map(exercise => ({
    exercise,
    protocolName,
    priority: assignPriority(exercise),
    lastDoneAt: history[exercise.exerciseName] ?? null,
  }))
}

/**
 * Main entry point for rest day routine
 * Takes all exercises from matched protocols and selects the best subset
 */
export function selectRotatedExercises(
  allExercisesWithProtocol: Array<{ exercise: RehabExercise; protocolName: string }>,
  maxCount: number = DEFAULT_MAX_COUNT
): RehabExercise[] {
  const history = getRehabExerciseHistory()

  const enriched: RehabExerciseWithMeta[] = allExercisesWithProtocol.map(({ exercise, protocolName }) => ({
    exercise,
    protocolName,
    priority: assignPriority(exercise),
    lastDoneAt: history[exercise.exerciseName] ?? null,
  }))

  return selectRehabExercises(enriched, maxCount)
}
