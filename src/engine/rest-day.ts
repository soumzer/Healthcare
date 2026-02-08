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
  targetZone?: BodyZone // zone ciblée par cet exercice
  conditionName?: string // nom de la condition/protocole ciblé
}

export interface RestDayRoutine {
  exercises: RestDayExercise[]
  totalMinutes: number
  variant: RestDayVariant
  /** Routine SA fixe (si l'utilisateur a la spondylarthrite ankylosante) */
  saRoutine: RestDayExercise[] | null
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

const BASE_REHAB_EXERCISES = 5
const ACCENT_BONUS = 2 // extra slots for skip zone
const CONDITION_THRESHOLD = 4 // above this, scale up max exercises

// Spondylarthrite ankylosante protocol name (normalized for matching)
const SA_PROTOCOL_NAME_NORMALIZED = 'spondylarthrite ankylosante'

/**
 * Normalize string for matching: remove accents, lowercase, trim.
 */
function normalizeForMatching(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics (accents)
    .toLowerCase()
    .trim()
}

/**
 * Get equivalent zone for protocol matching (treats left/right as equivalent).
 * Protocols are typically defined for one side only (e.g., hip_right).
 */
function getEquivalentZones(zone: BodyZone): BodyZone[] {
  const equivalents: Record<string, BodyZone[]> = {
    hip_left: ['hip_left', 'hip_right'],
    hip_right: ['hip_right', 'hip_left'],
    knee_left: ['knee_left', 'knee_right'],
    knee_right: ['knee_right', 'knee_left'],
    ankle_left: ['ankle_left', 'ankle_right'],
    ankle_right: ['ankle_right', 'ankle_left'],
    shoulder_left: ['shoulder_left', 'shoulder_right'],
    shoulder_right: ['shoulder_right', 'shoulder_left'],
    elbow_left: ['elbow_left', 'elbow_right'],
    elbow_right: ['elbow_right', 'elbow_left'],
    wrist_left: ['wrist_left', 'wrist_right'],
    wrist_right: ['wrist_right', 'wrist_left'],
    foot_left: ['foot_left', 'foot_right'],
    foot_right: ['foot_right', 'foot_left'],
  }
  return equivalents[zone] ?? [zone]
}

/**
 * Generate a rest day routine based on active health conditions.
 *
 * Selects up to MAX_REHAB_EXERCISES from matching rehab protocols using rotation.
 * When accentZones are provided (from active PainReports), those zones are prioritised.
 *
 * Special case: Spondylarthrite ankylosante (SA)
 * - SA triggers a separate fixed routine (saRoutine)
 * - SA exercises are NOT included in the regular rehab pool
 * - Other conditions still get their rehab exercises
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

  // Check if user has Spondylarthrite ankylosante
  const hasSA = activeConditions.some(c => {
    const diagnosisNorm = c.diagnosis ? normalizeForMatching(c.diagnosis) : ''
    return diagnosisNorm === SA_PROTOCOL_NAME_NORMALIZED
  })

  // Generate SA routine if user has SA
  let saRoutine: RestDayExercise[] | null = null
  if (hasSA) {
    const saProtocol = rehabProtocols.find(
      p => normalizeForMatching(p.conditionName) === SA_PROTOCOL_NAME_NORMALIZED
    )
    if (saProtocol) {
      saRoutine = saProtocol.exercises.map(ex => ({
        name: ex.exerciseName,
        sets: ex.sets,
        reps: String(ex.reps),
        duration: estimateDuration(ex),
        intensity: ex.intensity,
        notes: ex.notes,
        isExternal: false,
        targetZone: saProtocol.targetZone,
        conditionName: saProtocol.conditionName,
      }))
    }
  }

  const exercises: RestDayExercise[] = []
  const seenNames = new Set<string>()

  // Exclude SA condition from regular rehab pool
  const nonSAConditions = activeConditions.filter(c => {
    const diagnosisNorm = c.diagnosis ? normalizeForMatching(c.diagnosis) : ''
    return diagnosisNorm !== SA_PROTOCOL_NAME_NORMALIZED
  })

  if (nonSAConditions.length > 0) {
    const allExercisesWithProtocol: Array<{ exercise: RehabExercise; protocolName: string; targetZone: BodyZone }> = []

    for (const condition of nonSAConditions) {
      // Match by protocolConditionName (stored in diagnosis) if available, else fallback to zone
      // Use normalized comparison to handle accent differences
      // Also try equivalent zones (left/right) since protocols may only exist for one side
      const diagnosisNorm = condition.diagnosis ? normalizeForMatching(condition.diagnosis) : ''
      const equivalentZones = getEquivalentZones(condition.bodyZone)

      let protocol = null
      if (diagnosisNorm) {
        // Try to match by diagnosis first
        for (const zone of equivalentZones) {
          protocol = rehabProtocols.find(p =>
            p.targetZone === zone &&
            normalizeForMatching(p.conditionName) === diagnosisNorm
          )
          if (protocol) break
        }
      }
      // Fallback to any protocol for equivalent zones
      if (!protocol) {
        for (const zone of equivalentZones) {
          protocol = rehabProtocols.find(p => p.targetZone === zone)
          if (protocol) break
        }
      }
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

    // Scale max exercises: 5 base, +1 per condition above 4, cap at 10
    const conditionBonus = Math.max(0, nonSAConditions.length - CONDITION_THRESHOLD)
    const baseMax = Math.min(BASE_REHAB_EXERCISES + conditionBonus, 10)
    const maxExercises = accentZones.length > 0 ? baseMax + ACCENT_BONUS : baseMax
    const selectedExercises = accentZones.length > 0
      ? selectRotatedExercisesWithAccent(allExercisesWithProtocol, accentZones, maxExercises)
      : selectRotatedExercises(allExercisesWithProtocol, maxExercises)

    for (const { exercise: ex, protocolName, targetZone } of selectedExercises) {
      exercises.push({
        name: ex.exerciseName,
        sets: ex.sets,
        reps: String(ex.reps),
        duration: estimateDuration(ex),
        intensity: ex.intensity,
        notes: ex.notes,
        isExternal: false,
        targetZone,
        conditionName: protocolName,
      })
    }
  }

  // Calculate total minutes (including SA routine if present)
  let totalMinutes = exercises.reduce((acc, ex) => {
    const mins = parseDuration(ex.duration)
    return acc + mins * ex.sets
  }, 0)

  if (saRoutine) {
    totalMinutes += saRoutine.reduce((acc, ex) => {
      const mins = parseDuration(ex.duration)
      return acc + mins * ex.sets
    }, 0)
  }

  return { exercises, totalMinutes: Math.round(totalMinutes), variant, saRoutine }
}

function estimateDuration(ex: RehabExercise): string {
  if (typeof ex.reps === 'string' && ex.reps.includes('s')) return ex.reps
  return '1 min'
}

function parseDuration(d: string): number {
  const dl = d.toLowerCase()
  if (dl.includes('min')) {
    const match = dl.match(/(\d+)/)
    return match ? parseInt(match[1]) : 2
  }
  if (dl.includes('s')) {
    const match = dl.match(/(\d+)/)
    return match ? parseInt(match[1]) / 60 : 0.5
  }
  // Bare number — assume seconds
  const match = dl.match(/(\d+)/)
  return match ? parseInt(match[1]) / 60 : 1
}
