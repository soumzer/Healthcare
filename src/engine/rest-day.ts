import type { HealthCondition } from '../db/types'
import { rehabProtocols, type RehabExercise } from '../data/rehab-protocols'

export interface RestDayExercise {
  name: string
  sets: number
  reps: string
  duration: string // e.g. "2 min", "30s"
  notes: string
  isExternal: boolean // true = "programme externe" (user's own stretching videos)
}

export interface RestDayRoutine {
  exercises: RestDayExercise[]
  totalMinutes: number
}

export function generateRestDayRoutine(conditions: HealthCondition[]): RestDayRoutine {
  const activeConditions = conditions.filter(c => c.isActive)
  const exercises: RestDayExercise[] = []

  // For each active condition, find matching rehab protocol
  // Pick exercises with placement 'rest_day' or 'cooldown'
  for (const condition of activeConditions) {
    const protocol = rehabProtocols.find(p => p.targetZone === condition.bodyZone)
    if (!protocol) continue

    for (const ex of protocol.exercises) {
      if (ex.placement === 'rest_day' || ex.placement === 'cooldown') {
        // Avoid duplicates
        if (!exercises.find(e => e.name === ex.exerciseName)) {
          exercises.push({
            name: ex.exerciseName,
            sets: ex.sets,
            reps: String(ex.reps),
            duration: estimateDuration(ex),
            notes: ex.notes,
            isExternal: false,
          })
        }
      }
    }
  }

  // Always add external stretching as last item
  exercises.push({
    name: 'Étirements (programme externe)',
    sets: 1,
    reps: '-',
    duration: '10-15 min',
    notes: 'Tes vidéos d\'étirements habituelles',
    isExternal: true,
  })

  const totalMinutes = exercises.reduce((acc, ex) => {
    const mins = parseDuration(ex.duration)
    return acc + mins * (ex.isExternal ? 1 : ex.sets)
  }, 0)

  return { exercises, totalMinutes: Math.min(totalMinutes, 20) }
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
