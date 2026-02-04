import type { Exercise } from '../db/types'

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface FillerSuggestion {
  name: string
  sets: number
  reps: string
  duration: string      // Estimated time (e.g., "2 min")
  notes: string
  isRehab: boolean      // true if from rehab protocol
}

// ---------------------------------------------------------------------------
// Muscle group mappings for conflict detection
// ---------------------------------------------------------------------------

/** Upper body muscles — if next exercise targets these, avoid upper body rehab */
const UPPER_BODY_MUSCLES = [
  'pectoraux', 'pectoraux supérieurs', 'pectoraux inférieurs',
  'deltoïdes', 'deltoïdes antérieurs', 'deltoïdes latéraux', 'deltoïdes postérieurs',
  'épaules',
  'dorsaux', 'rhomboïdes', 'trapèzes', 'trapèzes supérieurs', 'trapèzes moyens', 'trapèzes moyens et inférieurs',
  'biceps', 'triceps', 'brachial', 'brachioradial', 'avant-bras',
  'fléchisseurs du poignet',
  'infraépineux', 'petit rond', 'rotateurs externes', 'deltoïde postérieur',
  'grand rond',
]

/** Lower body muscles — if next exercise targets these, avoid lower body rehab */
const LOWER_BODY_MUSCLES = [
  'quadriceps',
  'ischio-jambiers',
  'fessiers', 'moyen fessier', 'petit fessier',
  'gastrocnémiens', 'soléaire', 'mollets',
  'muscles intrinsèques du pied', 'court fléchisseur des orteils', 'fléchisseurs des orteils',
  'tibial antérieur', 'tibial postérieur',
  'piriforme', 'fessiers profonds',
]

/** Core muscles — generally safe to suggest, low conflict */
const CORE_MUSCLES = [
  'transverse abdominal', 'rectus abdominis', 'rectus abdominis inférieur',
  'obliques', 'carré des lombes',
  'érecteurs du rachis',
  'fléchisseurs profonds du cou', 'sous-occipitaux',
  'core',
  'nerf sciatique',
]

// ---------------------------------------------------------------------------
// New simplified API for notebook session flow
// ---------------------------------------------------------------------------

/**
 * Suggests filler exercises from the exercise catalog (mobility/cooldown).
 * Simpler API for the new notebook session flow.
 */
export function suggestFillerFromCatalog(input: {
  sessionMuscles: string[]
  completedFillers: string[]
  exerciseCatalog: Exercise[]
  count?: number  // default 3
}): FillerSuggestion[] {
  const { sessionMuscles, completedFillers, exerciseCatalog, count = 3 } = input

  const candidates = exerciseCatalog.filter(ex =>
    (ex.category === 'mobility' || ex.tags.includes('cooldown')) &&
    !completedFillers.includes(ex.name) &&
    !hasMuscleConflictFromPrimary(ex.primaryMuscles, sessionMuscles)
  )

  return candidates.slice(0, count).map(toMobilityFillerSuggestion)
}

// ---------------------------------------------------------------------------
// Muscle conflict detection
// ---------------------------------------------------------------------------

/**
 * Checks if a generic exercise's primary muscles conflict with the next
 * main exercise's muscles.
 */
function hasMuscleConflictFromPrimary(
  exerciseMuscles: string[],
  nextMuscles: string[],
): boolean {
  if (nextMuscles.length === 0 || exerciseMuscles.length === 0) return false

  const exerciseCategory = classifyMuscles(exerciseMuscles)
  const nextCategory = classifyMuscles(nextMuscles)

  // Core is always safe
  if (exerciseCategory === 'core') return false

  return exerciseCategory === nextCategory
}

/**
 * Classify a muscle list into upper/lower/core body category.
 */
function classifyMuscles(muscles: string[]): 'upper' | 'lower' | 'core' {
  let upperCount = 0
  let lowerCount = 0
  let coreCount = 0

  for (const m of muscles) {
    const ml = m.toLowerCase()
    if (UPPER_BODY_MUSCLES.some((u) => ml.includes(u.toLowerCase()))) upperCount++
    else if (LOWER_BODY_MUSCLES.some((l) => ml.includes(l.toLowerCase()))) lowerCount++
    else if (CORE_MUSCLES.some((c) => ml.includes(c.toLowerCase()))) coreCount++
  }

  if (coreCount > 0 && upperCount === 0 && lowerCount === 0) return 'core'
  if (upperCount >= lowerCount) return upperCount > 0 ? 'upper' : 'core'
  return 'lower'
}

// ---------------------------------------------------------------------------
// Conversion helpers
// ---------------------------------------------------------------------------

function estimateMobilityDuration(): string {
  return '2 min'
}

function toMobilityFillerSuggestion(exercise: Exercise): FillerSuggestion {
  return {
    name: exercise.name,
    sets: 1,
    reps: '30 sec',
    duration: estimateMobilityDuration(),
    notes: exercise.instructions,
    isRehab: false,
  }
}
