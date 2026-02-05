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

// Core foundation exercises — always included if user has lower_back or knee conditions
const CORE_FOUNDATION: RestDayExercise[] = [
  {
    name: 'Dead bug',
    sets: 3,
    reps: '8 par côté',
    duration: '1 min',
    intensity: 'light',
    notes: 'Dos plaqué au sol. Stabilisation du core profond.',
    isExternal: false,
  },
  {
    name: 'Pallof press',
    sets: 3,
    reps: '10 par côté',
    duration: '1 min',
    intensity: 'light',
    notes: 'Anti-rotation. Résister à la traction de la bande/câble.',
    isExternal: false,
  },
]

// Posture foundation exercises — always included if user has upper_back condition
const POSTURE_FOUNDATION: RestDayExercise[] = [
  {
    name: 'Chin tucks',
    sets: 3,
    reps: '10',
    duration: '1 min',
    intensity: 'very_light',
    notes: 'Rentrer le menton (double menton). Tenir 5s. Corrige la tête en avant.',
    isExternal: false,
  },
  {
    name: 'Band pull-apart',
    sets: 3,
    reps: '15',
    duration: '1 min',
    intensity: 'light',
    notes: 'Écarter la bande en serrant les omoplates. Renforce le haut du dos.',
    isExternal: false,
  },
]

// Zones that trigger core foundation
const CORE_TRIGGER_ZONES: ReadonlySet<BodyZone> = new Set([
  'lower_back', 'knee_left', 'knee_right', 'hip_left', 'hip_right',
])

// Zones that trigger posture foundation
const POSTURE_TRIGGER_ZONES: ReadonlySet<BodyZone> = new Set([
  'upper_back', 'neck', 'shoulder_left', 'shoulder_right',
])

/**
 * Generate a rest day routine based on active health conditions.
 *
 * Foundation blocks (always included, not rotated):
 * - Core block (dead bug, pallof) if user has lower_back, knee, or hip conditions
 * - Posture block (chin tucks, band pull-apart) if user has upper_back, neck, or shoulder conditions
 *
 * Then selects up to MAX_REHAB_EXERCISES from matching rehab protocols using rotation.
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

  // Check if user needs core and/or posture foundation
  const allZones = activeConditions.map(c => c.bodyZone)
  const needsCore = allZones.some(z => CORE_TRIGGER_ZONES.has(z))
  const needsPosture = allZones.some(z => POSTURE_TRIGGER_ZONES.has(z))

  // Add foundation blocks first (always present, not rotated)
  if (needsCore && (variant === 'all' || variant === 'lower')) {
    for (const ex of CORE_FOUNDATION) {
      exercises.push(ex)
      seenNames.add(ex.name)
    }
  }

  if (needsPosture && (variant === 'all' || variant === 'upper')) {
    for (const ex of POSTURE_FOUNDATION) {
      exercises.push(ex)
      seenNames.add(ex.name)
    }
  }

  // Calculate remaining slots for condition-specific exercises
  const remainingSlots = Math.max(0, MAX_REHAB_EXERCISES - exercises.length)

  if (activeConditions.length > 0 && remainingSlots > 0) {
    const allExercisesWithProtocol: Array<{ exercise: RehabExercise; protocolName: string; targetZone: BodyZone }> = []

    for (const condition of activeConditions) {
      const protocol = rehabProtocols.find(p => p.targetZone === condition.bodyZone)
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
      ? selectRotatedExercisesWithAccent(allExercisesWithProtocol, accentZones, remainingSlots)
      : selectRotatedExercises(allExercisesWithProtocol, remainingSlots)

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
