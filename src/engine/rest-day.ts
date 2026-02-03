import type { HealthCondition, BodyZone, Goal } from '../db/types'
import { rehabProtocols, type RehabExercise } from '../data/rehab-protocols'
import { generalMobilityExercises, generalPostureExercises } from '../data/general-routines'
import { selectRotatedExercises } from '../utils/rehab-rotation'

export interface RestDayExercise {
  name: string
  sets: number
  reps: string
  duration: string // e.g. "2 min", "30s"
  intensity: string
  notes: string
  isExternal: boolean // true = "programme externe" (user's own stretching videos)
}

export interface RestDayRoutine {
  exercises: RestDayExercise[]
  totalMinutes: number
  variant: RestDayVariant
}

export type RestDayVariant = 'upper' | 'lower' | 'all'

const UPPER_ZONES: ReadonlySet<BodyZone> = new Set([
  'neck', 'shoulder_left', 'shoulder_right',
  'elbow_left', 'elbow_right',
  'wrist_left', 'wrist_right',
  'upper_back',
])

const LOWER_ZONES: ReadonlySet<BodyZone> = new Set([
  'lower_back',
  'hip_left', 'hip_right',
  'knee_left', 'knee_right',
  'ankle_left', 'ankle_right',
  'foot_left', 'foot_right',
])

// Maximum exercises per rest day routine (excluding external stretching)
const MAX_REHAB_EXERCISES = 5
// Maximum general exercises when combining with rehab
const MAX_GENERAL_EXERCISES = 3
// Maximum general exercises when no rehab (standalone mobility/posture)
const MAX_GENERAL_EXERCISES_STANDALONE = 5

export interface GenerateRestDayOptions {
  conditions: HealthCondition[]
  goals?: Goal[]
  variant?: RestDayVariant
}

/**
 * Generate a rest day routine based on conditions and goals.
 *
 * Logic:
 * - If user has conditions → include rehab exercises (up to MAX_REHAB_EXERCISES)
 * - If user has mobility goal (no conditions) → include general mobility exercises
 * - If user has posture goal (no conditions) → include general posture exercises
 * - If user has BOTH conditions AND mobility/posture goals → combine rehab + general (limited)
 */
export function generateRestDayRoutine(
  conditionsOrOptions: HealthCondition[] | GenerateRestDayOptions,
  variant: RestDayVariant = 'all',
): RestDayRoutine {
  // Support both old signature (conditions, variant) and new signature (options)
  const options: GenerateRestDayOptions = Array.isArray(conditionsOrOptions)
    ? { conditions: conditionsOrOptions, variant }
    : conditionsOrOptions

  const conditions = options.conditions
  const goals = options.goals ?? []
  const routineVariant = options.variant ?? variant

  const activeConditions = conditions.filter(c => c.isActive).filter(c => {
    if (routineVariant === 'all') return true
    if (routineVariant === 'upper') return UPPER_ZONES.has(c.bodyZone)
    if (routineVariant === 'lower') return LOWER_ZONES.has(c.bodyZone)
    return true
  })

  const exercises: RestDayExercise[] = []
  const seenNames = new Set<string>()

  const hasConditions = activeConditions.length > 0
  const hasMobilityGoal = goals.includes('mobility')
  const hasPostureGoal = goals.includes('posture')

  // -------------------------------------------------------------------------
  // 1. Add rehab exercises from conditions (if any)
  // -------------------------------------------------------------------------
  if (hasConditions) {
    const allExercisesWithProtocol: Array<{ exercise: RehabExercise; protocolName: string }> = []

    for (const condition of activeConditions) {
      const protocol = rehabProtocols.find(p => p.targetZone === condition.bodyZone)
      if (!protocol) continue

      for (const ex of protocol.exercises) {
        if (seenNames.has(ex.exerciseName)) continue
        seenNames.add(ex.exerciseName)
        allExercisesWithProtocol.push({ exercise: ex, protocolName: protocol.conditionName })
      }
    }

    const selectedExercises = selectRotatedExercises(allExercisesWithProtocol, MAX_REHAB_EXERCISES)

    for (const ex of selectedExercises) {
      exercises.push({
        name: ex.exerciseName,
        sets: ex.sets,
        reps: String(ex.reps),
        duration: estimateDuration(ex),
        intensity: ex.intensity,
        notes: ex.notes,
        isExternal: false,
      })
    }
  }

  // -------------------------------------------------------------------------
  // 2. Add general mobility/posture exercises based on goals
  // -------------------------------------------------------------------------
  const generalExercises: RehabExercise[] = []

  if (hasMobilityGoal) {
    generalExercises.push(...generalMobilityExercises)
  }

  if (hasPostureGoal) {
    generalExercises.push(...generalPostureExercises)
  }

  if (generalExercises.length > 0) {
    // Determine max general exercises based on whether we have rehab
    const maxGeneral = hasConditions ? MAX_GENERAL_EXERCISES : MAX_GENERAL_EXERCISES_STANDALONE

    // Filter out duplicates (some exercises might overlap between mobility/posture or with rehab)
    const uniqueGeneral = generalExercises.filter(ex => !seenNames.has(ex.exerciseName))

    // Select exercises (could use rotation, but for simplicity take first N for now)
    // In future, could implement rotation for general exercises too
    const selectedGeneral = uniqueGeneral.slice(0, maxGeneral)

    for (const ex of selectedGeneral) {
      seenNames.add(ex.exerciseName)
      exercises.push({
        name: ex.exerciseName,
        sets: ex.sets,
        reps: String(ex.reps),
        duration: estimateDuration(ex),
        intensity: ex.intensity,
        notes: ex.notes,
        isExternal: false,
      })
    }
  }

  const totalMinutes = exercises.reduce((acc, ex) => {
    const mins = parseDuration(ex.duration)
    return acc + mins * ex.sets
  }, 0)

  return { exercises, totalMinutes: Math.round(totalMinutes), variant: routineVariant }
}

function estimateDuration(ex: RehabExercise): string {
  if (typeof ex.reps === 'string' && ex.reps.includes('s')) return ex.reps
  return '1 min'
}

function parseDuration(d: string): number {
  // Check for seconds first (e.g., "30 sec", "15s")
  if (d.includes('s') && !d.includes('min')) {
    const match = d.match(/(\d+)/)
    return match ? parseInt(match[1]) / 60 : 0.5
  }
  // Check for minutes (e.g., "10 min", "10-15 min")
  if (d.includes('min')) {
    const match = d.match(/(\d+)/)
    return match ? parseInt(match[1]) : 2
  }
  // Plain number — assume minutes
  const match = d.match(/(\d+)/)
  return match ? parseInt(match[1]) : 1
}
