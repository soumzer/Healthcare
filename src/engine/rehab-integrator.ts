import type { HealthCondition, ProgramSession, BodyZone } from '../db/types'
import { rehabProtocols } from '../data/rehab-protocols'
import type { RehabProtocol, RehabExercise } from '../data/rehab-protocols'

// ---------------------------------------------------------------------------
// Output interfaces
// ---------------------------------------------------------------------------

export interface IntegratedSession {
  session: ProgramSession           // The main session (unchanged)
  warmupRehab: RehabExerciseInfo[]   // Rehab exercises for warmup
  activeWaitPool: RehabExerciseInfo[] // Rehab exercises for machine-occupied time
  cooldownRehab: RehabExerciseInfo[] // Rehab exercises for cooldown
}

export interface RehabExerciseInfo {
  exerciseName: string
  sets: number
  reps: string          // Can be "15" or "30 sec"
  intensity: string
  notes: string
  protocolName: string  // Which condition this is for
  priority: number      // Lower = higher priority
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_WARMUP = 8
const MAX_COOLDOWN = 5
const MAX_ACTIVE_WAIT = 8

// ---------------------------------------------------------------------------
// Zone mirroring helper
// ---------------------------------------------------------------------------

function mirrorZone(zone: BodyZone): BodyZone | null {
  const pairs: Record<string, string> = {
    shoulder_left: 'shoulder_right',
    shoulder_right: 'shoulder_left',
    elbow_left: 'elbow_right',
    elbow_right: 'elbow_left',
    wrist_left: 'wrist_right',
    wrist_right: 'wrist_left',
    hip_left: 'hip_right',
    hip_right: 'hip_left',
    knee_left: 'knee_right',
    knee_right: 'knee_left',
    ankle_left: 'ankle_right',
    ankle_right: 'ankle_left',
    foot_left: 'foot_right',
    foot_right: 'foot_left',
  }
  return (pairs[zone] as BodyZone) ?? null
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

/**
 * Injects rehab exercises into a workout session based on the user's active
 * health conditions and the rehab protocol placement rules.
 *
 * - warmup exercises are done before the session
 * - active_wait exercises are proposed during rest between sets
 * - cooldown exercises are done after the session
 * - rest_day exercises are skipped (handled by rest-day engine)
 *
 * Deduplication: if an exercise name already exists in the main session's
 * exercise list (by exerciseId name match is impossible without the catalog,
 * so we deduplicate within rehab lists by exerciseName), or has already been
 * added to any rehab list, it is skipped.
 *
 * Lists are sorted by protocol priority (lower = higher), then by the
 * exercise's order within the protocol.
 */
export function integrateRehab(
  session: ProgramSession,
  conditions: HealthCondition[],
  protocols?: RehabProtocol[],
): IntegratedSession {
  const allProtocols = protocols ?? rehabProtocols

  // 1. Filter to active conditions only
  const activeConditions = conditions.filter((c) => c.isActive)

  if (activeConditions.length === 0) {
    return {
      session,
      warmupRehab: [],
      activeWaitPool: [],
      cooldownRehab: [],
    }
  }

  // 2. For each active condition, find matching protocol by targetZone === condition.bodyZone
  //    If no exact match, try the mirrored zone (e.g. hip_left → hip_right)
  const matchedProtocols: RehabProtocol[] = []
  for (const condition of activeConditions) {
    let protocol = allProtocols.find((p) => p.targetZone === condition.bodyZone)
    if (!protocol) {
      const mirror = mirrorZone(condition.bodyZone)
      if (mirror) {
        protocol = allProtocols.find((p) => p.targetZone === mirror)
      }
    }
    if (protocol && !matchedProtocols.includes(protocol)) {
      matchedProtocols.push(protocol)
    }
  }

  // 3. Sort protocols by priority (lower number = higher priority)
  matchedProtocols.sort((a, b) => a.priority - b.priority)

  // Track already-added exercise names for deduplication
  const addedNames = new Set<string>()

  // Collect unsorted/uncapped exercises per placement
  const warmupAll: RehabExerciseInfo[] = []
  const activeWaitAll: RehabExerciseInfo[] = []
  const cooldownAll: RehabExerciseInfo[] = []

  // 4. For each protocol, iterate exercises and place them
  for (const protocol of matchedProtocols) {
    for (const exercise of protocol.exercises) {
      // Skip rest_day placement
      if (exercise.placement === 'rest_day') continue

      // Deduplication: skip if this exercise name was already added
      if (addedNames.has(exercise.exerciseName)) continue

      const info = toRehabExerciseInfo(exercise, protocol)

      addedNames.add(exercise.exerciseName)

      switch (exercise.placement) {
        case 'warmup':
          warmupAll.push(info)
          break
        case 'active_wait':
          activeWaitAll.push(info)
          break
        case 'cooldown':
          cooldownAll.push(info)
          break
      }
    }
  }

  // 5. Sort each list by priority, then by insertion order (already in protocol order)
  //    Since we iterate protocols sorted by priority and exercises in protocol order,
  //    the lists are already correctly ordered. But let's ensure stable sort by priority.
  const sortByPriority = (a: RehabExerciseInfo, b: RehabExerciseInfo) =>
    a.priority - b.priority

  warmupAll.sort(sortByPriority)
  activeWaitAll.sort(sortByPriority)
  cooldownAll.sort(sortByPriority)

  // 6. Cap warmupRehab to max 8, cooldownRehab to max 5
  const warmupRehab = warmupAll.slice(0, MAX_WARMUP)
  const cooldownRehab = cooldownAll.slice(0, MAX_COOLDOWN)

  // 7. Cap activeWaitPool to avoid overwhelming the user
  const activeWaitPool = activeWaitAll.slice(0, MAX_ACTIVE_WAIT)

  return {
    session,
    warmupRehab,
    activeWaitPool,
    cooldownRehab,
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toRehabExerciseInfo(
  exercise: RehabExercise,
  protocol: RehabProtocol,
): RehabExerciseInfo {
  return {
    exerciseName: exercise.exerciseName,
    sets: exercise.sets,
    reps: String(exercise.reps),
    intensity: exercise.intensity,
    notes: exercise.notes,
    protocolName: protocol.conditionName,
    priority: protocol.priority,
  }
}
