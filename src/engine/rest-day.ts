import type { HealthCondition, BodyZone } from '../db/types'
import { rehabProtocols, type RehabExercise } from '../data/rehab-protocols'

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

  // For each active condition, find matching rehab protocol
  // Pick exercises with placement 'rest_day' or 'cooldown'
  for (const condition of activeConditions) {
    const protocol = rehabProtocols.find(p => p.targetZone === condition.bodyZone)
    if (!protocol) continue

    for (const ex of protocol.exercises) {
      // Include ALL rehab exercises — rest days are the guarantee that rehab gets done
      // even if the user never waits for machines during sessions
      // Avoid duplicates
      if (exercises.find(e => e.name === ex.exerciseName)) continue
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
  if (d.includes('15')) return 12
  if (d.includes('10')) return 10
  if (d.includes('min')) {
    const match = d.match(/(\d+)/)
    return match ? parseInt(match[1]) : 2
  }
  if (d.includes('s')) {
    const match = d.match(/(\d+)/)
    return match ? parseInt(match[1]) / 60 : 0.5
  }
  return 1
}
