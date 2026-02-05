import type { HealthCondition, BodyZone } from '../db/types'
import { rehabProtocols, type RehabExercise } from '../data/rehab-protocols'
import { selectRotatedExercises, selectRotatedExercisesWithAccent } from '../utils/rehab-rotation'

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

const MAX_REHAB_EXERCISES = 5

/**
 * Generate a rest day routine based on active health conditions.
 *
 * Selects up to MAX_REHAB_EXERCISES from matching rehab protocols using rotation.
 * When accentZones are provided (from active PainReports), those zones are prioritised.
 */
export function generateRestDayRoutine(
  conditions: HealthCondition[],
  variant: RestDayVariant = 'all',
  accentZones: BodyZone[] = [],
): RestDayRoutine {
  const activeConditions = conditions.filter(c => c.isActive).filter(c => {
    if (variant === 'all') return true
    if (variant === 'upper') return UPPER_ZONES.has(c.bodyZone)
    if (variant === 'lower') return LOWER_ZONES.has(c.bodyZone)
    return true
  })

  const exercises: RestDayExercise[] = []
  const seenNames = new Set<string>()

  if (activeConditions.length > 0) {
    const allExercisesWithProtocol: Array<{ exercise: RehabExercise; protocolName: string; targetZone: BodyZone }> = []

    for (const condition of activeConditions) {
      // Match by protocolConditionName (stored in diagnosis) if available, else fallback to zone
      const protocol = condition.diagnosis
        ? rehabProtocols.find(p => p.targetZone === condition.bodyZone && p.conditionName === condition.diagnosis)
          ?? rehabProtocols.find(p => p.targetZone === condition.bodyZone)
        : rehabProtocols.find(p => p.targetZone === condition.bodyZone)
      if (!protocol) continue

      for (const ex of protocol.exercises) {
        if (seenNames.has(ex.exerciseName)) continue
        seenNames.add(ex.exerciseName)
        allExercisesWithProtocol.push({
          exercise: ex,
          protocolName: protocol.conditionName,
          targetZone: protocol.targetZone,
        })
      }
    }

    const selectedExercises = accentZones.length > 0
      ? selectRotatedExercisesWithAccent(allExercisesWithProtocol, accentZones, MAX_REHAB_EXERCISES)
      : selectRotatedExercises(allExercisesWithProtocol, MAX_REHAB_EXERCISES)

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

  const totalMinutes = exercises.reduce((acc, ex) => {
    const mins = parseDuration(ex.duration)
    return acc + mins * ex.sets
  }, 0)

  return { exercises, totalMinutes: Math.round(totalMinutes), variant }
}

function estimateDuration(ex: RehabExercise): string {
  if (typeof ex.reps === 'string' && ex.reps.includes('s')) return ex.reps
  return '1 min'
}

function parseDuration(d: string): number {
  if (d.includes('s') && !d.includes('min')) {
    const match = d.match(/(\d+)/)
    return match ? parseInt(match[1]) / 60 : 0.5
  }
  if (d.includes('min')) {
    const match = d.match(/(\d+)/)
    return match ? parseInt(match[1]) : 2
  }
  const match = d.match(/(\d+)/)
  return match ? parseInt(match[1]) : 1
}
