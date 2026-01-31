import type {
  Exercise,
  Goal,
  HealthCondition,
  GymEquipment,
  AvailableWeight,
  ProgramSession,
  ProgramExercise,
} from '../db/types'

// ---------------------------------------------------------------------------
// Input / Output interfaces
// ---------------------------------------------------------------------------

export interface ProgramGeneratorInput {
  userId: number
  goals: Goal[]
  conditions: HealthCondition[]
  equipment: GymEquipment[]
  availableWeights: AvailableWeight[]
  daysPerWeek: number
  minutesPerSession: number
}

export interface GeneratedProgram {
  name: string
  type: 'upper_lower' | 'full_body' | 'push_pull_legs'
  sessions: ProgramSession[]
}

// ---------------------------------------------------------------------------
// 1. Filter exercises by equipment availability
// ---------------------------------------------------------------------------

/**
 * Returns exercises whose `equipmentNeeded` items are all present in the
 * available equipment list.
 *
 * - Bodyweight exercises (empty `equipmentNeeded`) always pass.
 * - Equipment is matched by comparing exercise equipment tags against the
 *   `name` field of available `GymEquipment` entries (only those with
 *   `isAvailable === true`).
 */
export function filterExercisesByEquipment(
  exercises: Exercise[],
  equipment: GymEquipment[],
): Exercise[] {
  const availableNames = new Set(
    equipment.filter((e) => e.isAvailable).map((e) => e.name),
  )

  return exercises.filter((exercise) => {
    // Bodyweight / no equipment → always included
    if (exercise.equipmentNeeded.length === 0) return true
    // Every required piece of equipment must be available
    return exercise.equipmentNeeded.every((tag) => availableNames.has(tag))
  })
}

// ---------------------------------------------------------------------------
// 2. Filter exercises by contraindications
// ---------------------------------------------------------------------------

/**
 * Excludes exercises whose `contraindications` overlap with active health
 * conditions that have `painLevel >= 3`.
 *
 * If a condition's `painLevel` is below 3 the zone is considered mild and the
 * exercise is still allowed.
 */
export function filterExercisesByContraindications(
  exercises: Exercise[],
  conditions: HealthCondition[],
): Exercise[] {
  const painfulZones = new Set(
    conditions
      .filter((c) => c.isActive && c.painLevel >= 3)
      .map((c) => c.bodyZone),
  )

  // No painful zones → nothing to exclude
  if (painfulZones.size === 0) return exercises

  return exercises.filter((exercise) => {
    // Keep exercises that have no overlap with painful zones
    return !exercise.contraindications.some((zone) => painfulZones.has(zone))
  })
}

// ---------------------------------------------------------------------------
// 3. Determine the split type based on training days per week
// ---------------------------------------------------------------------------

/**
 * - 2-3 days/week → full_body
 * - 4 days/week   → upper_lower
 * - 5-6 days/week → push_pull_legs
 */
export function determineSplit(
  daysPerWeek: number,
): 'full_body' | 'upper_lower' | 'push_pull_legs' {
  if (daysPerWeek <= 3) return 'full_body'
  if (daysPerWeek === 4) return 'upper_lower'
  return 'push_pull_legs'
}

// ---------------------------------------------------------------------------
// 4. Helper — pick exercises for a muscle group / tag set
// ---------------------------------------------------------------------------

function exercisesWithTag(exercises: Exercise[], tag: string): Exercise[] {
  return exercises.filter((e) => e.tags.includes(tag))
}

function pickUpTo(source: Exercise[], count: number, usedIds: Set<number>): Exercise[] {
  const picked: Exercise[] = []
  for (const ex of source) {
    if (picked.length >= count) break
    const id = ex.id ?? 0
    if (usedIds.has(id)) continue
    picked.push(ex)
    usedIds.add(id)
  }
  return picked
}

// ---------------------------------------------------------------------------
// 5. Build session helpers
// ---------------------------------------------------------------------------

function toProgramExercise(
  exercise: Exercise,
  order: number,
  opts?: { sets?: number; reps?: number; rest?: number },
): ProgramExercise {
  const isRehab = exercise.isRehab
  return {
    exerciseId: exercise.id ?? 0,
    order,
    sets: opts?.sets ?? (isRehab ? 3 : exercise.category === 'compound' ? 4 : 3),
    targetReps: opts?.reps ?? (isRehab ? 15 : exercise.category === 'compound' ? 8 : 12),
    restSeconds: opts?.rest ?? (isRehab ? 60 : exercise.category === 'compound' ? 120 : 90),
    isRehab,
  }
}

function buildSession(
  name: string,
  order: number,
  exercises: Exercise[],
): ProgramSession {
  return {
    name,
    order,
    exercises: exercises.map((ex, i) => toProgramExercise(ex, i + 1)),
  }
}

// ---------------------------------------------------------------------------
// 6. Build sessions per split type
// ---------------------------------------------------------------------------

function buildFullBodySessions(
  available: Exercise[],
  daysPerWeek: number,
): ProgramSession[] {
  const sessions: ProgramSession[] = []
  const nonRehab = available.filter((e) => !e.isRehab)
  const rehab = available.filter((e) => e.isRehab)

  for (let i = 0; i < daysPerWeek; i++) {
    const usedIds = new Set<number>()
    const sessionExercises: Exercise[] = []

    // Pick rehab exercises first (up to 2)
    sessionExercises.push(...pickUpTo(rehab, 2, usedIds))

    // 1 compound push (upper)
    sessionExercises.push(...pickUpTo(exercisesWithTag(nonRehab, 'push').filter((e) => e.tags.includes('upper_body')), 1, usedIds))
    // 1 compound pull (upper)
    sessionExercises.push(...pickUpTo(exercisesWithTag(nonRehab, 'pull').filter((e) => e.tags.includes('upper_body')), 1, usedIds))
    // 1 lower body compound
    sessionExercises.push(...pickUpTo(exercisesWithTag(nonRehab, 'lower_body').filter((e) => e.category === 'compound'), 1, usedIds))
    // 1 core
    sessionExercises.push(...pickUpTo(nonRehab.filter((e) => e.category === 'core'), 1, usedIds))

    sessions.push(buildSession(`Full Body ${String.fromCharCode(65 + i)}`, i + 1, sessionExercises))
  }

  return sessions
}

function buildUpperLowerSessions(
  available: Exercise[],
): ProgramSession[] {
  const nonRehab = available.filter((e) => !e.isRehab)
  const rehab = available.filter((e) => e.isRehab)
  const sessions: ProgramSession[] = []

  // Upper A
  {
    const usedIds = new Set<number>()
    const exercises: Exercise[] = []
    exercises.push(...pickUpTo(rehab, 2, usedIds))
    exercises.push(...pickUpTo(exercisesWithTag(nonRehab, 'push').filter((e) => e.tags.includes('upper_body') && e.category === 'compound'), 2, usedIds))
    exercises.push(...pickUpTo(exercisesWithTag(nonRehab, 'pull').filter((e) => e.tags.includes('upper_body') && e.category === 'compound'), 2, usedIds))
    exercises.push(...pickUpTo(exercisesWithTag(nonRehab, 'push').filter((e) => e.tags.includes('upper_body') && e.category === 'isolation'), 1, usedIds))
    exercises.push(...pickUpTo(exercisesWithTag(nonRehab, 'pull').filter((e) => e.tags.includes('upper_body') && e.category === 'isolation'), 1, usedIds))
    sessions.push(buildSession('Upper A', 1, exercises))
  }

  // Lower A
  {
    const usedIds = new Set<number>()
    const exercises: Exercise[] = []
    exercises.push(...pickUpTo(rehab, 2, usedIds))
    exercises.push(...pickUpTo(nonRehab.filter((e) => e.tags.includes('lower_body') && e.category === 'compound'), 3, usedIds))
    exercises.push(...pickUpTo(nonRehab.filter((e) => e.tags.includes('lower_body') && e.category === 'isolation'), 2, usedIds))
    exercises.push(...pickUpTo(nonRehab.filter((e) => e.category === 'core'), 1, usedIds))
    sessions.push(buildSession('Lower A', 2, exercises))
  }

  // Upper B
  {
    const usedIds = new Set<number>()
    const exercises: Exercise[] = []
    exercises.push(...pickUpTo(rehab, 2, usedIds))
    exercises.push(...pickUpTo(exercisesWithTag(nonRehab, 'push').filter((e) => e.tags.includes('upper_body') && e.category === 'compound'), 2, usedIds))
    exercises.push(...pickUpTo(exercisesWithTag(nonRehab, 'pull').filter((e) => e.tags.includes('upper_body') && e.category === 'compound'), 2, usedIds))
    exercises.push(...pickUpTo(exercisesWithTag(nonRehab, 'push').filter((e) => e.tags.includes('upper_body') && e.category === 'isolation'), 1, usedIds))
    exercises.push(...pickUpTo(exercisesWithTag(nonRehab, 'pull').filter((e) => e.tags.includes('upper_body') && e.category === 'isolation'), 1, usedIds))
    sessions.push(buildSession('Upper B', 3, exercises))
  }

  // Lower B
  {
    const usedIds = new Set<number>()
    const exercises: Exercise[] = []
    exercises.push(...pickUpTo(rehab, 2, usedIds))
    exercises.push(...pickUpTo(nonRehab.filter((e) => e.tags.includes('lower_body') && e.category === 'compound'), 3, usedIds))
    exercises.push(...pickUpTo(nonRehab.filter((e) => e.tags.includes('lower_body') && e.category === 'isolation'), 2, usedIds))
    exercises.push(...pickUpTo(nonRehab.filter((e) => e.category === 'core'), 1, usedIds))
    sessions.push(buildSession('Lower B', 4, exercises))
  }

  return sessions
}

function buildPushPullLegsSessions(
  available: Exercise[],
): ProgramSession[] {
  const nonRehab = available.filter((e) => !e.isRehab)
  const rehab = available.filter((e) => e.isRehab)
  const sessions: ProgramSession[] = []

  // Push
  {
    const usedIds = new Set<number>()
    const exercises: Exercise[] = []
    exercises.push(...pickUpTo(rehab, 1, usedIds))
    exercises.push(...pickUpTo(exercisesWithTag(nonRehab, 'push').filter((e) => e.tags.includes('upper_body') && e.category === 'compound'), 2, usedIds))
    exercises.push(...pickUpTo(exercisesWithTag(nonRehab, 'push').filter((e) => e.tags.includes('upper_body') && e.category === 'isolation'), 2, usedIds))
    exercises.push(...pickUpTo(nonRehab.filter((e) => e.category === 'core'), 1, usedIds))
    sessions.push(buildSession('Push', 1, exercises))
  }

  // Pull
  {
    const usedIds = new Set<number>()
    const exercises: Exercise[] = []
    exercises.push(...pickUpTo(rehab, 1, usedIds))
    exercises.push(...pickUpTo(exercisesWithTag(nonRehab, 'pull').filter((e) => e.tags.includes('upper_body') && e.category === 'compound'), 2, usedIds))
    exercises.push(...pickUpTo(exercisesWithTag(nonRehab, 'pull').filter((e) => e.tags.includes('upper_body') && e.category === 'isolation'), 2, usedIds))
    exercises.push(...pickUpTo(nonRehab.filter((e) => e.category === 'core'), 1, usedIds))
    sessions.push(buildSession('Pull', 2, exercises))
  }

  // Legs
  {
    const usedIds = new Set<number>()
    const exercises: Exercise[] = []
    exercises.push(...pickUpTo(rehab, 1, usedIds))
    exercises.push(...pickUpTo(nonRehab.filter((e) => e.tags.includes('lower_body') && e.category === 'compound'), 3, usedIds))
    exercises.push(...pickUpTo(nonRehab.filter((e) => e.tags.includes('lower_body') && e.category === 'isolation'), 2, usedIds))
    exercises.push(...pickUpTo(nonRehab.filter((e) => e.category === 'core'), 1, usedIds))
    sessions.push(buildSession('Legs', 3, exercises))
  }

  // For 6 days, duplicate the three sessions
  // Push B, Pull B, Legs B
  {
    const usedIds = new Set<number>()
    const exercises: Exercise[] = []
    exercises.push(...pickUpTo(rehab, 1, usedIds))
    exercises.push(...pickUpTo(exercisesWithTag(nonRehab, 'push').filter((e) => e.tags.includes('upper_body') && e.category === 'compound'), 2, usedIds))
    exercises.push(...pickUpTo(exercisesWithTag(nonRehab, 'push').filter((e) => e.tags.includes('upper_body') && e.category === 'isolation'), 2, usedIds))
    exercises.push(...pickUpTo(nonRehab.filter((e) => e.category === 'core'), 1, usedIds))
    sessions.push(buildSession('Push B', 4, exercises))
  }

  {
    const usedIds = new Set<number>()
    const exercises: Exercise[] = []
    exercises.push(...pickUpTo(rehab, 1, usedIds))
    exercises.push(...pickUpTo(exercisesWithTag(nonRehab, 'pull').filter((e) => e.tags.includes('upper_body') && e.category === 'compound'), 2, usedIds))
    exercises.push(...pickUpTo(exercisesWithTag(nonRehab, 'pull').filter((e) => e.tags.includes('upper_body') && e.category === 'isolation'), 2, usedIds))
    exercises.push(...pickUpTo(nonRehab.filter((e) => e.category === 'core'), 1, usedIds))
    sessions.push(buildSession('Pull B', 5, exercises))
  }

  {
    const usedIds = new Set<number>()
    const exercises: Exercise[] = []
    exercises.push(...pickUpTo(rehab, 1, usedIds))
    exercises.push(...pickUpTo(nonRehab.filter((e) => e.tags.includes('lower_body') && e.category === 'compound'), 3, usedIds))
    exercises.push(...pickUpTo(nonRehab.filter((e) => e.tags.includes('lower_body') && e.category === 'isolation'), 2, usedIds))
    exercises.push(...pickUpTo(nonRehab.filter((e) => e.category === 'core'), 1, usedIds))
    sessions.push(buildSession('Legs B', 6, exercises))
  }

  return sessions
}

// ---------------------------------------------------------------------------
// 7. Main orchestrator
// ---------------------------------------------------------------------------

const SPLIT_NAMES: Record<string, string> = {
  full_body: 'Programme Full Body',
  upper_lower: 'Programme Upper / Lower',
  push_pull_legs: 'Programme Push / Pull / Legs',
}

/**
 * Main entry point — generates a complete workout program structure.
 *
 * Does NOT persist anything to the database; the caller (e.g. onboarding
 * hook) is responsible for saving.
 */
export function generateProgram(
  input: ProgramGeneratorInput,
  exerciseCatalog: Exercise[],
): GeneratedProgram {
  // Step 1 — filter by available equipment
  const afterEquipment = filterExercisesByEquipment(
    exerciseCatalog,
    input.equipment,
  )

  // Step 2 — filter by contraindications
  const eligible = filterExercisesByContraindications(
    afterEquipment,
    input.conditions,
  )

  // Step 3 — determine split
  const splitType = determineSplit(input.daysPerWeek)

  // Step 4 — build sessions
  let sessions: ProgramSession[]
  switch (splitType) {
    case 'full_body':
      sessions = buildFullBodySessions(eligible, input.daysPerWeek)
      break
    case 'upper_lower':
      sessions = buildUpperLowerSessions(eligible)
      break
    case 'push_pull_legs':
      sessions = buildPushPullLegsSessions(eligible)
      break
  }

  return {
    name: SPLIT_NAMES[splitType] ?? 'Programme',
    type: splitType,
    sessions,
  }
}
