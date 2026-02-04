import type { Exercise } from '../db/types'

export interface RehabExerciseInfo {
  exerciseName: string
  sets: number
  reps: string
  intensity: string
  notes: string
  protocolName: string
  priority: number
  alternatives: string[]
}

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface FillerInput {
  activeWaitPool: RehabExerciseInfo[]  // Rehab exercises for active wait
  nextExerciseMuscles: string[]        // Muscles used by the NEXT main exercise (to avoid fatiguing)
  completedFillers: string[]           // Names of fillers already done in this session
  allExercises?: Exercise[]            // Full catalog for generic mobility fallback
}

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
// Main function (legacy)
// ---------------------------------------------------------------------------

/**
 * Suggests a filler exercise to do while a machine is occupied.
 *
 * Priority order:
 * 1. Pick from `activeWaitPool` — rehab exercise not in completedFillers,
 *    whose muscles don't conflict with the next main exercise.
 * 2. If pool exhausted, pick a mobility/stretching exercise from the general
 *    catalog that doesn't fatigue next exercise muscles.
 * 3. If everything done, cycle back to activeWaitPool (re-propose).
 * 4. Return null only if absolutely nothing is available.
 */
export function suggestFiller(input: FillerInput): FillerSuggestion | null {
  const { activeWaitPool, nextExerciseMuscles, completedFillers, allExercises } = input

  // Priority 1: Pick from active wait pool (not yet completed, no muscle conflict)
  const poolCandidate = activeWaitPool.find(
    (ex) =>
      !completedFillers.includes(ex.exerciseName) &&
      !hasMuscleConflict(ex.exerciseName, nextExerciseMuscles, activeWaitPool),
  )
  if (poolCandidate) {
    return toFillerSuggestion(poolCandidate, true)
  }

  // Priority 2: General mobility/stretching fallback from catalog
  if (allExercises && allExercises.length > 0) {
    const mobilityCandidate = allExercises.find(
      (ex) =>
        (ex.category === 'mobility' || (ex.category === 'core' && ex.tags.includes('rehab_compatible'))) &&
        !completedFillers.includes(ex.name) &&
        !hasMuscleConflictFromPrimary(ex.primaryMuscles, nextExerciseMuscles),
    )
    if (mobilityCandidate) {
      return toMobilityFillerSuggestion(mobilityCandidate)
    }
  }

  // Priority 3: Cycle back to pool (allow already-completed exercises)
  const cycleCandidate = activeWaitPool.find(
    (ex) => !hasMuscleConflict(ex.exerciseName, nextExerciseMuscles, activeWaitPool),
  )
  if (cycleCandidate) {
    return toFillerSuggestion(cycleCandidate, true)
  }

  // Priority 3b: If even with conflicts there are pool exercises, suggest one anyway
  if (activeWaitPool.length > 0) {
    return toFillerSuggestion(activeWaitPool[0], true)
  }

  // Nothing available at all
  return null
}

// ---------------------------------------------------------------------------
// Muscle conflict detection
// ---------------------------------------------------------------------------

/**
 * Determines if a rehab exercise from the pool conflicts with the next main
 * exercise's target muscles.
 *
 * Rules:
 * - If next exercise targets upper body muscles (pectoraux, epaules, etc.),
 *   don't suggest upper body rehab.
 * - If next exercise targets lower body muscles (quadriceps, ischio-jambiers, etc.),
 *   don't suggest lower body rehab.
 * - Core exercises are generally safe (they don't fatigue main movements).
 * - Rehab exercises are by definition light, so conflict is about perception.
 */
function hasMuscleConflict(
  rehabExerciseName: string,
  nextMuscles: string[],
  pool: RehabExerciseInfo[],
): boolean {
  if (nextMuscles.length === 0) return false

  // Find the exercise info in the pool to get its name (we use name-based heuristic)
  const rehabInfo = pool.find((p) => p.exerciseName === rehabExerciseName)
  if (!rehabInfo) return false

  const rehabMuscleCategory = classifyExercise(rehabExerciseName)
  const nextMuscleCategory = classifyMuscles(nextMuscles)

  // Core rehab is always safe
  if (rehabMuscleCategory === 'core') return false

  // Conflict only if same body region
  if (rehabMuscleCategory === 'upper' && nextMuscleCategory === 'upper') return true
  if (rehabMuscleCategory === 'lower' && nextMuscleCategory === 'lower') return true

  return false
}

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
 * Classify an exercise by name into upper/lower/core body category.
 * Uses known rehab exercise name patterns.
 */
function classifyExercise(exerciseName: string): 'upper' | 'lower' | 'core' {
  const lower = exerciseName.toLowerCase()

  // Core exercises
  if (
    lower.includes('dead bug') ||
    lower.includes('bird dog') ||
    lower.includes('pallof') ||
    lower.includes('planche') ||
    lower.includes('plank') ||
    lower.includes('cat-cow') ||
    lower.includes('chat-vache') ||
    lower.includes('child') ||
    lower.includes('nerve flossing') ||
    lower.includes('chin tuck') ||
    lower.includes('rétraction cervicale')
  ) {
    return 'core'
  }

  // Lower body exercises
  if (
    lower.includes('squat') ||
    lower.includes('spanish') ||
    lower.includes('leg extension') ||
    lower.includes('short foot') ||
    lower.includes('pied court') ||
    lower.includes('towel curl') ||
    lower.includes('cheville') ||
    lower.includes('ankle') ||
    lower.includes('pont fessier') ||
    lower.includes('glute bridge') ||
    lower.includes('piriforme') ||
    lower.includes('mollet')
  ) {
    return 'lower'
  }

  // Upper body exercises
  if (
    lower.includes('tyler') ||
    lower.includes('curl poignet') ||
    lower.includes('fléchisseurs du poignet') ||
    lower.includes('wall angel') ||
    lower.includes('band pull') ||
    lower.includes('face pull') ||
    lower.includes('rotation externe') ||
    lower.includes('pectoral') ||
    lower.includes('doorway')
  ) {
    return 'upper'
  }

  // Default to core (safest assumption for rehab)
  return 'core'
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
// Duration estimation
// ---------------------------------------------------------------------------

/**
 * Estimates the duration of a rehab exercise in human-readable form.
 *
 * For rehab exercises:
 * - If reps contains "s" or "sec", parse seconds per set
 * - Otherwise, assume ~45 seconds per set (including rest)
 * - Add ~30 seconds rest between sets
 *
 * For mobility exercises: 2-3 minutes per exercise
 */
function estimateDuration(sets: number, reps: string): string {
  let totalSeconds: number

  if (/\d+\s*s/.test(reps)) {
    // Time-based reps (e.g., "45 sec", "30s")
    const match = reps.match(/(\d+)\s*s/)
    const secsPerSet = match ? parseInt(match[1], 10) : 45
    const restBetweenSets = 30
    totalSeconds = sets * secsPerSet + (sets - 1) * restBetweenSets
  } else {
    // Rep-based (e.g., "15")
    const secsPerSet = 45 // avg time to complete a set of rehab reps
    const restBetweenSets = 30
    totalSeconds = sets * secsPerSet + (sets - 1) * restBetweenSets
  }

  const minutes = Math.round(totalSeconds / 60)
  if (minutes < 1) return '1 min'
  return `${minutes} min`
}

function estimateMobilityDuration(): string {
  return '2 min'
}

// ---------------------------------------------------------------------------
// Conversion helpers
// ---------------------------------------------------------------------------

function toFillerSuggestion(info: RehabExerciseInfo, isRehab: boolean): FillerSuggestion {
  return {
    name: info.exerciseName,
    sets: info.sets,
    reps: info.reps,
    duration: estimateDuration(info.sets, info.reps),
    notes: info.notes,
    isRehab,
  }
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
