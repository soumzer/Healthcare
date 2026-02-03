import type { HealthCondition, BodyZone } from '../db/types'
import { rehabProtocols, type RehabExercise } from '../data/rehab-protocols'
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

export function generateRestDayRoutine(
  conditions: HealthCondition[],
  variant: RestDayVariant = 'all',
): RestDayRoutine {
  const activeConditions = conditions.filter(c => c.isActive).filter(c => {
    if (variant === 'all') return true
    if (variant === 'upper') return UPPER_ZONES.has(c.bodyZone) || c.bodyZone === 'other'
    if (variant === 'lower') return LOWER_ZONES.has(c.bodyZone) || c.bodyZone === 'other'
    return true
  })
  const exercises: RestDayExercise[] = []

  // Collect all exercises from matched protocols with their protocol names
  const allExercisesWithProtocol: Array<{ exercise: RehabExercise; protocolName: string }> = []
  const seenNames = new Set<string>()

  for (const condition of activeConditions) {
    const protocol = rehabProtocols.find(p => p.targetZone === condition.bodyZone)
    if (!protocol) continue

    for (const ex of protocol.exercises) {
      // Avoid duplicates across protocols
      if (seenNames.has(ex.exerciseName)) continue
      seenNames.add(ex.exerciseName)
      allExercisesWithProtocol.push({ exercise: ex, protocolName: protocol.conditionName })
    }
  }

  // Use rotation system to select max 5 exercises intelligently
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

  // Always add external stretching as last item
  exercises.push({
    name: 'Étirements (programme externe)',
    sets: 1,
    reps: '-',
    duration: '10-15 min',
    intensity: '',
    notes: 'Tes vidéos d\'étirements habituelles',
    isExternal: true,
  })

  const totalMinutes = exercises.reduce((acc, ex) => {
    const mins = parseDuration(ex.duration)
    return acc + mins * (ex.isExternal ? 1 : ex.sets)
  }, 0)

  return { exercises, totalMinutes: Math.round(totalMinutes), variant }
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
