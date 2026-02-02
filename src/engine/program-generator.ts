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
 * conditions that meet the pain threshold.
 *
 * Two tiers:
 * - **Severe (painLevel >= 7):** exercises with that zone in their
 *   contraindications are excluded.
 * - **Moderate (painLevel >= 6):** exercises with that zone in their
 *   contraindications are excluded. This applies to ALL body zones.
 *
 * Pain levels 1-5 do NOT exclude exercises — the rehab integrator will
 * add appropriate warmup/cooldown for those zones instead. This avoids
 * stripping all compound movements from users with common issues like mild
 * knee tendinitis or elbow pain.
 */
export function filterExercisesByContraindications(
  exercises: Exercise[],
  conditions: HealthCondition[],
): Exercise[] {
  // Zones with severe pain (>= 7) — fully excluded
  const severeZones = new Set(
    conditions
      .filter((c) => c.isActive && c.painLevel >= 7)
      .map((c) => c.bodyZone),
  )

  // Zones with moderate pain (>= 6) — applies to ALL zones
  const moderateZones = new Set(
    conditions
      .filter((c) => c.isActive && c.painLevel >= 6)
      .map((c) => c.bodyZone),
  )

  // No painful zones → nothing to exclude
  if (severeZones.size === 0 && moderateZones.size === 0) return exercises

  return exercises.filter((exercise) => {
    const hasContraindication = exercise.contraindications.some(
      (zone) => severeZones.has(zone) || moderateZones.has(zone),
    )
    return !hasContraindication
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
// 4. Muscle-based exercise matching helpers
// ---------------------------------------------------------------------------

/** Exercises whose primaryMuscles include at least one of the given muscles */
function exercisesForMuscles(exercises: Exercise[], muscles: string[]): Exercise[] {
  return exercises.filter((e) =>
    e.primaryMuscles.some((m) => muscles.some((target) => m.toLowerCase().includes(target.toLowerCase()))),
  )
}

/** Find exercise by exact or partial name match (case-insensitive) */
function findByName(exercises: Exercise[], nameFragment: string): Exercise | undefined {
  const lower = nameFragment.toLowerCase()
  return (
    exercises.find((e) => e.name.toLowerCase() === lower) ??
    exercises.find((e) => e.name.toLowerCase().includes(lower))
  )
}

/** Pick the first exercise from a source that is not already used, add it to usedIds */
function pickOne(source: Exercise[], usedIds: Set<number>): Exercise | undefined {
  for (const ex of source) {
    const id = ex.id ?? 0
    if (usedIds.has(id)) continue
    usedIds.add(id)
    return ex
  }
  return undefined
}

/** Pick the first exercise matching name fragment, falling back to the source list */
function pickPreferred(
  nameFragment: string,
  fallbackSource: Exercise[],
  usedIds: Set<number>,
): Exercise | undefined {
  const preferred = findByName(fallbackSource, nameFragment)
  if (preferred) {
    const id = preferred.id ?? 0
    if (!usedIds.has(id)) {
      usedIds.add(id)
      return preferred
    }
  }
  return pickOne(fallbackSource, usedIds)
}

// ---------------------------------------------------------------------------
// 4c. Lower-back condition helper
// ---------------------------------------------------------------------------

/**
 * Returns true when the user has an active lower_back condition with
 * painLevel >= 6.  In that case SDT (soulevé de terre / deadlift) variants
 * are too aggravating and the program should substitute hip thrust as the
 * primary hip-hinge compound.
 */
function hasLowerBackPain(conditions: HealthCondition[]): boolean {
  return conditions.some(
    (c) => c.bodyZone === 'lower_back' && c.isActive && c.painLevel >= 6,
  )
}



// ---------------------------------------------------------------------------
// 4d. Session slot definition for structured session building
// ---------------------------------------------------------------------------

interface ExerciseSlot {
  /** Human-readable description of this slot */
  label: string
  /** Function that returns candidate exercises for this slot */
  candidates: (pool: Exercise[]) => Exercise[]
  /** Preferred exercise name fragment to try first */
  preferredName?: string
  /** Prescribed sets */
  sets: number
  /** Prescribed target reps */
  reps: number
  /** Rest in seconds */
  rest: number
}

function buildStructuredSession(
  name: string,
  order: number,
  slots: ExerciseSlot[],
  pool: Exercise[],
): ProgramSession {
  const usedIds = new Set<number>()
  const programExercises: ProgramExercise[] = []
  let exerciseOrder = 1

  for (const slot of slots) {
    const candidates = slot.candidates(pool).filter((e) => !usedIds.has(e.id ?? 0))
    let picked: Exercise | undefined
    if (slot.preferredName) {
      picked = pickPreferred(slot.preferredName, candidates, usedIds)
    } else {
      picked = pickOne(candidates, usedIds)
    }
    if (picked) {
      programExercises.push({
        exerciseId: picked.id ?? 0,
        order: exerciseOrder++,
        sets: slot.sets,
        targetReps: slot.reps,
        restSeconds: slot.rest,
        isRehab: picked.isRehab,
      })
    }
  }

  return { name, order, exercises: programExercises }
}

// ---------------------------------------------------------------------------
// 5. Build sessions per split type
// ---------------------------------------------------------------------------

function buildFullBodySessions(
  available: Exercise[],
  daysPerWeek: number,
  conditions: HealthCondition[] = [],
): ProgramSession[] {
  const nonRehab = available.filter((e) => !e.isRehab)

  // -----------------------------------------------------------------------
  // Categorize exercises by muscle group and movement pattern
  // -----------------------------------------------------------------------

  // Quad compounds
  const quadCompounds = nonRehab.filter(
    (e) => e.category === 'compound' && exercisesForMuscles([e], ['quadriceps']).length > 0,
  )

  // Horizontal push: pectoraux compound
  const horizontalPush = nonRehab.filter(
    (e) => e.category === 'compound' && exercisesForMuscles([e], ['pectoraux']).length > 0,
  )

  // Horizontal pull: dorsaux compound (rowing)
  const horizontalPull = nonRehab.filter(
    (e) => e.category === 'compound'
      && exercisesForMuscles([e], ['dorsaux', 'rhomboïdes']).length > 0
      && !e.name.toLowerCase().includes('pulldown')
      && !e.name.toLowerCase().includes('traction')
      && !e.name.toLowerCase().includes('pull-up'),
  )

  // Vertical push: deltoïdes compound
  const verticalPush = nonRehab.filter(
    (e) => e.category === 'compound' && exercisesForMuscles([e], ['deltoïdes']).length > 0,
  )

  // Vertical pull: lat pulldown or tractions
  const verticalPull = nonRehab.filter(
    (e) => e.category === 'compound'
      && (e.name.toLowerCase().includes('pulldown')
        || e.name.toLowerCase().includes('traction')
        || e.name.toLowerCase().includes('pull-up')
        || e.name.toLowerCase().includes('tirage vertical')),
  )

  // Leg curl
  const legCurls = nonRehab.filter(
    (e) => e.name.toLowerCase().includes('leg curl'),
  )

  // Leg extension
  const legExtensions = nonRehab.filter(
    (e) => e.name.toLowerCase().includes('leg extension'),
  )

  // Lateral raises
  const lateralRaises = nonRehab.filter(
    (e) => e.name.toLowerCase().includes('élévations latérales') || e.name.toLowerCase().includes('lateral raise'),
  )

  // Face pull (non-rehab)
  const facePulls = nonRehab.filter(
    (e) => e.name.toLowerCase().includes('face pull'),
  )

  // Core exercises
  const coreExercises = nonRehab.filter((e) => e.category === 'core')

  // Hip hinge: ischio-jambiers compound lower_body
  const hipHinges = nonRehab.filter(
    (e) => e.category === 'compound'
      && exercisesForMuscles([e], ['ischio-jambiers']).length > 0
      && e.tags.includes('lower_body'),
  )

  // Chest accessories: pectoraux isolation
  const chestAccessories = nonRehab.filter(
    (e) => (e.category === 'isolation') && exercisesForMuscles([e], ['pectoraux']).length > 0,
  )

  // Unilateral legs
  const unilateralLegs = nonRehab.filter(
    (e) => e.category === 'compound' && e.tags.includes('unilateral') && e.tags.includes('lower_body'),
  )

  // Hip thrust
  const hipThrusts = nonRehab.filter(
    (e) => e.name.toLowerCase().includes('hip thrust'),
  )

  // Unilateral pull
  const unilateralPull = nonRehab.filter(
    (e) => e.category === 'compound'
      && exercisesForMuscles([e], ['dorsaux', 'rhomboïdes']).length > 0
      && e.tags.includes('unilateral'),
  )

  // Biceps exercises
  const bicepsExercises = nonRehab.filter(
    (e) => exercisesForMuscles([e], ['biceps', 'brachial']).length > 0
      && (e.category === 'isolation'),
  )

  // -----------------------------------------------------------------------
  // Full Body A
  // -----------------------------------------------------------------------

  const fullBodyASlots: ExerciseSlot[] = [
    {
      label: 'Lower compound',
      candidates: () => quadCompounds,
      preferredName: 'leg press',
      sets: 4,
      reps: 10,
      rest: 150,
    },
    {
      label: 'Horizontal push',
      candidates: () => horizontalPush,
      preferredName: 'développé couché haltères',
      sets: 3,
      reps: 10,
      rest: 120,
    },
    {
      label: 'Horizontal pull',
      candidates: () => horizontalPull,
      preferredName: 'rowing',
      sets: 3,
      reps: 10,
      rest: 120,
    },
    {
      label: 'Leg curl',
      candidates: () => legCurls,
      preferredName: 'leg curl',
      sets: 3,
      reps: 12,
      rest: 90,
    },
    {
      label: 'Élévations latérales',
      candidates: () => lateralRaises,
      preferredName: 'élévations latérales',
      sets: 3,
      reps: 12,
      rest: 60,
    },
    {
      label: 'Face pull (posture)',
      candidates: () => facePulls,
      preferredName: 'face pull',
      sets: 3,
      reps: 15,
      rest: 60,
    },
    {
      label: 'Core exercise',
      candidates: () => coreExercises,
      preferredName: 'dead bug',
      sets: 3,
      reps: 10,
      rest: 60,
    },
  ]

  // -----------------------------------------------------------------------
  // Full Body B
  // -----------------------------------------------------------------------

  const avoidSDT = hasLowerBackPain(conditions)

  const fullBodyBSlots: ExerciseSlot[] = [
    {
      label: avoidSDT ? 'Hip thrust (primary compound)' : 'Hip hinge',
      candidates: () => avoidSDT ? [...hipThrusts, ...hipHinges] : hipHinges,
      preferredName: avoidSDT ? 'hip thrust' : 'sdt smith',
      sets: 4,
      reps: avoidSDT ? 10 : 8,
      rest: 150,
    },
    {
      label: 'Vertical push',
      candidates: () => verticalPush,
      preferredName: 'développé militaire',
      sets: 3,
      reps: 10,
      rest: 120,
    },
    {
      label: 'Vertical pull',
      candidates: () => verticalPull,
      preferredName: 'lat pulldown',
      sets: 3,
      reps: 10,
      rest: 120,
    },
    {
      label: 'Leg extension',
      candidates: () => legExtensions,
      preferredName: 'leg extension',
      sets: 3,
      reps: 12,
      rest: 90,
    },
    {
      label: 'Chest accessory',
      candidates: () => [...chestAccessories, ...horizontalPush],
      preferredName: 'pec',
      sets: 3,
      reps: 10,
      rest: 90,
    },
    {
      label: 'Face pull (posture)',
      candidates: () => facePulls,
      preferredName: 'face pull',
      sets: 3,
      reps: 15,
      rest: 60,
    },
    {
      label: 'Core exercise',
      candidates: () => coreExercises,
      preferredName: 'pallof',
      sets: 3,
      reps: 10,
      rest: 60,
    },
  ]

  // -----------------------------------------------------------------------
  // Full Body C (if 3 days)
  // -----------------------------------------------------------------------

  const fullBodyCSlots: ExerciseSlot[] = [
    {
      label: 'Unilateral legs',
      candidates: () => unilateralLegs,
      preferredName: 'fentes',
      sets: 3,
      reps: 12,
      rest: 120,
    },
    {
      label: 'Horizontal push',
      candidates: () => [...horizontalPush, ...chestAccessories],
      preferredName: 'pec press',
      sets: 3,
      reps: 10,
      rest: 120,
    },
    {
      label: 'Horizontal pull (unilateral)',
      candidates: () => [...unilateralPull, ...horizontalPull],
      preferredName: 'rowing haltère',
      sets: 3,
      reps: 10,
      rest: 90,
    },
    {
      label: 'Hip thrust',
      candidates: () => [...hipThrusts, ...hipHinges],
      preferredName: 'hip thrust',
      sets: 3,
      reps: 10,
      rest: 120,
    },
    {
      label: 'Élévations latérales',
      candidates: () => lateralRaises,
      preferredName: 'élévations latérales',
      sets: 3,
      reps: 12,
      rest: 60,
    },
    {
      label: 'Biceps',
      candidates: () => bicepsExercises,
      preferredName: 'curl',
      sets: 2,
      reps: 12,
      rest: 60,
    },
    {
      label: 'Face pull (posture)',
      candidates: () => facePulls,
      preferredName: 'face pull',
      sets: 3,
      reps: 15,
      rest: 60,
    },
  ]

  // -----------------------------------------------------------------------
  // Build sessions based on daysPerWeek (2 or 3)
  // -----------------------------------------------------------------------

  const sessions: ProgramSession[] = [
    buildStructuredSession('Full Body A', 1, fullBodyASlots, available),
    buildStructuredSession('Full Body B', 2, fullBodyBSlots, available),
  ]

  if (daysPerWeek >= 3) {
    sessions.push(
      buildStructuredSession('Full Body C', 3, fullBodyCSlots, available),
    )
  }

  return sessions
}

function buildUpperLowerSessions(
  available: Exercise[],
  conditions: HealthCondition[] = [],
): ProgramSession[] {
  const nonRehab = available.filter((e) => !e.isRehab)

  // -----------------------------------------------------------------------
  // Categorize exercises by muscle group and movement pattern
  // -----------------------------------------------------------------------

  // Quad-dominant compounds: primaryMuscles includes 'quadriceps'
  const quadCompounds = nonRehab.filter(
    (e) => e.category === 'compound' && exercisesForMuscles([e], ['quadriceps']).length > 0,
  )

  // Unilateral leg exercises (fentes, bulgare)
  const unilateralLegs = nonRehab.filter(
    (e) => e.category === 'compound' && e.tags.includes('unilateral') && e.tags.includes('lower_body'),
  )

  // Leg extension
  const legExtensions = nonRehab.filter(
    (e) => e.name.toLowerCase().includes('leg extension'),
  )

  // Leg curl
  const legCurls = nonRehab.filter(
    (e) => e.name.toLowerCase().includes('leg curl'),
  )

  // Calf exercises
  const calves = nonRehab.filter(
    (e) => exercisesForMuscles([e], ['gastrocnémiens', 'soléaire', 'mollets']).length > 0
      && e.tags.includes('calves'),
  )

  // Core exercises
  const coreExercises = nonRehab.filter((e) => e.category === 'core')

  // Hip hinge: primaryMuscles includes 'ischio-jambiers' AND category is 'compound'
  const hipHinges = nonRehab.filter(
    (e) => e.category === 'compound'
      && exercisesForMuscles([e], ['ischio-jambiers']).length > 0
      && e.tags.includes('lower_body'),
  )

  // Hip thrust: name includes 'hip thrust'
  const hipThrusts = nonRehab.filter(
    (e) => e.name.toLowerCase().includes('hip thrust'),
  )

  // Horizontal push: pectoraux compound
  const horizontalPush = nonRehab.filter(
    (e) => e.category === 'compound' && exercisesForMuscles([e], ['pectoraux']).length > 0,
  )

  // Vertical push: deltoïdes compound
  const verticalPush = nonRehab.filter(
    (e) => e.category === 'compound' && exercisesForMuscles([e], ['deltoïdes']).length > 0,
  )

  // Lateral raises
  const lateralRaises = nonRehab.filter(
    (e) => e.name.toLowerCase().includes('élévations latérales') || e.name.toLowerCase().includes('lateral raise'),
  )

  // Chest accessories: pectoraux isolation (pec deck, écartés, crossover)
  const chestAccessories = nonRehab.filter(
    (e) => (e.category === 'isolation') && exercisesForMuscles([e], ['pectoraux']).length > 0,
  )

  // Face pull (non-rehab version)
  const facePulls = nonRehab.filter(
    (e) => e.name.toLowerCase().includes('face pull'),
  )

  // Optional push exercises (pompes, triceps)
  const pushAccessories = nonRehab.filter(
    (e) => (e.category === 'isolation') && exercisesForMuscles([e], ['triceps']).length > 0,
  )

  // Horizontal pull: dorsaux compound (rowing)
  const horizontalPull = nonRehab.filter(
    (e) => e.category === 'compound'
      && exercisesForMuscles([e], ['dorsaux', 'rhomboïdes']).length > 0
      && !e.name.toLowerCase().includes('pulldown')
      && !e.name.toLowerCase().includes('traction')
      && !e.name.toLowerCase().includes('pull-up'),
  )

  // Unilateral pull (rowing unilatéral)
  const unilateralPull = nonRehab.filter(
    (e) => e.category === 'compound'
      && exercisesForMuscles([e], ['dorsaux', 'rhomboïdes']).length > 0
      && e.tags.includes('unilateral'),
  )

  // Vertical pull: lat pulldown or tractions
  const verticalPull = nonRehab.filter(
    (e) => e.category === 'compound'
      && (e.name.toLowerCase().includes('pulldown')
        || e.name.toLowerCase().includes('traction')
        || e.name.toLowerCase().includes('pull-up')
        || e.name.toLowerCase().includes('tirage vertical')),
  )

  // Biceps exercises
  const bicepsExercises = nonRehab.filter(
    (e) => exercisesForMuscles([e], ['biceps', 'brachial']).length > 0
      && (e.category === 'isolation'),
  )

  // Rear delt exercises: deltoïdes postérieurs (isolation or rehab band pull-apart, élévations latérales câble)
  const rearDeltExercises = nonRehab.filter(
    (e) => exercisesForMuscles([e], ['deltoïdes postérieurs']).length > 0
      && e.name.toLowerCase() !== 'face pull',
  )

  // Also consider rehab-category face pull and band pull-apart as rear delt fallbacks
  const rehabRearDelts = available.filter(
    (e) => e.isRehab && (e.name.toLowerCase().includes('band pull-apart') || e.name.toLowerCase().includes('face pull')),
  )

  // Lighter quad exercises for Lower 2 (e.g., pull-through, light press)
  const lighterQuad = nonRehab.filter(
    (e) => (e.name.toLowerCase().includes('pull-through')
      || (e.category === 'compound' && exercisesForMuscles([e], ['quadriceps']).length > 0)),
  )

  // -----------------------------------------------------------------------
  // Lower 1 — Quadriceps Focus
  // -----------------------------------------------------------------------

  const lower1Slots: ExerciseSlot[] = [
    {
      label: 'Compound quad-dominant',
      candidates: () => quadCompounds,
      preferredName: 'leg press',
      sets: 4,
      reps: 10,
      rest: 150,
    },
    {
      label: 'Unilateral leg',
      candidates: () => unilateralLegs,
      preferredName: 'fentes',
      sets: 3,
      reps: 12,
      rest: 90,
    },
    {
      label: 'Leg extension',
      candidates: () => legExtensions,
      preferredName: 'leg extension',
      sets: 3,
      reps: 12,
      rest: 90,
    },
    {
      label: 'Leg curl (balance)',
      candidates: () => legCurls,
      preferredName: 'leg curl',
      sets: 3,
      reps: 12,
      rest: 90,
    },
    {
      label: 'Calf exercise',
      candidates: () => calves,
      sets: 3,
      reps: 20,
      rest: 60,
    },
    {
      label: 'Core exercise',
      candidates: () => coreExercises,
      sets: 3,
      reps: 12,
      rest: 60,
    },
  ]

  // -----------------------------------------------------------------------
  // Upper 1 — Push Focus
  // -----------------------------------------------------------------------

  const upper1Slots: ExerciseSlot[] = [
    {
      label: 'Horizontal push',
      candidates: () => horizontalPush,
      preferredName: 'développé couché',
      sets: 4,
      reps: 10,
      rest: 120,
    },
    {
      label: 'Vertical push',
      candidates: () => verticalPush,
      preferredName: 'développé militaire',
      sets: 3,
      reps: 10,
      rest: 120,
    },
    {
      label: 'Élévations latérales',
      candidates: () => lateralRaises,
      preferredName: 'élévations latérales',
      sets: 3,
      reps: 12,
      rest: 90,
    },
    {
      label: 'Chest accessory',
      candidates: () => chestAccessories,
      sets: 3,
      reps: 12,
      rest: 90,
    },
    {
      label: 'Face pull (posture)',
      candidates: () => facePulls,
      preferredName: 'face pull',
      sets: 3,
      reps: 15,
      rest: 60,
    },
    {
      label: 'Push accessory (triceps)',
      candidates: () => pushAccessories,
      sets: 3,
      reps: 12,
      rest: 60,
    },
  ]

  // -----------------------------------------------------------------------
  // Lower 2 — Hamstring/Glute Focus
  // -----------------------------------------------------------------------

  const avoidSDT = hasLowerBackPain(conditions)

  const lower2Slots: ExerciseSlot[] = [
    {
      label: avoidSDT ? 'Hip thrust (primary compound)' : 'Hip hinge',
      candidates: () => avoidSDT ? [...hipThrusts, ...hipHinges] : hipHinges,
      preferredName: avoidSDT ? 'hip thrust' : 'sdt smith',
      sets: 4,
      reps: avoidSDT ? 10 : 8,
      rest: 150,
    },
    ...(avoidSDT ? [] : [{
      label: 'Hip thrust',
      candidates: () => hipThrusts,
      preferredName: 'hip thrust',
      sets: 4,
      reps: 10,
      rest: 120,
    } as ExerciseSlot]),
    {
      label: 'Leg curl',
      candidates: () => legCurls,
      preferredName: 'leg curl',
      sets: 3,
      reps: 12,
      rest: 90,
    },
    {
      label: 'Lighter quad / pull-through',
      candidates: () => lighterQuad,
      preferredName: 'pull-through',
      sets: 3,
      reps: 12,
      rest: 90,
    },
    {
      label: 'Calf exercise',
      candidates: () => calves,
      sets: 3,
      reps: 20,
      rest: 60,
    },
    {
      label: 'Core exercise (different from Lower 1)',
      candidates: () => coreExercises,
      sets: 3,
      reps: 10,
      rest: 60,
    },
  ]

  // -----------------------------------------------------------------------
  // Upper 2 — Pull Focus
  // -----------------------------------------------------------------------

  const upper2Slots: ExerciseSlot[] = [
    {
      label: 'Horizontal pull',
      candidates: () => horizontalPull,
      preferredName: 'rowing câble',
      sets: 4,
      reps: 10,
      rest: 120,
    },
    {
      label: 'Unilateral pull',
      candidates: () => unilateralPull,
      preferredName: 'unilatéral',
      sets: 3,
      reps: 10,
      rest: 90,
    },
    {
      label: 'Vertical pull',
      candidates: () => verticalPull,
      preferredName: 'lat pulldown',
      sets: 3,
      reps: 10,
      rest: 120,
    },
    {
      label: 'Face pull (posture)',
      candidates: () => facePulls,
      preferredName: 'face pull',
      sets: 3,
      reps: 12,
      rest: 60,
    },
    {
      label: 'Biceps exercise',
      candidates: () => bicepsExercises,
      preferredName: 'curl biceps',
      sets: 3,
      reps: 12,
      rest: 60,
    },
    {
      label: 'Rear delt exercise',
      candidates: () => [...rearDeltExercises, ...rehabRearDelts],
      preferredName: 'band pull-apart',
      sets: 3,
      reps: 20,
      rest: 60,
    },
  ]

  // -----------------------------------------------------------------------
  // Build the 4 sessions (order: Lower 1, Upper 1, Lower 2, Upper 2)
  // -----------------------------------------------------------------------

  const sessions: ProgramSession[] = [
    buildStructuredSession('Lower 1 — Quadriceps', 1, lower1Slots, available),
    buildStructuredSession('Upper 1 — Push', 2, upper1Slots, available),
    buildStructuredSession('Lower 2 — Hamstring / Glutes', 3, lower2Slots, available),
    buildStructuredSession('Upper 2 — Pull', 4, upper2Slots, available),
  ]

  return sessions
}

function buildPushPullLegsSessions(
  available: Exercise[],
  conditions: HealthCondition[] = [],
): ProgramSession[] {
  const nonRehab = available.filter((e) => !e.isRehab)

  // -----------------------------------------------------------------------
  // Categorize exercises by muscle group and movement pattern
  // -----------------------------------------------------------------------

  // Horizontal push: pectoraux compound
  const horizontalPush = nonRehab.filter(
    (e) => e.category === 'compound' && exercisesForMuscles([e], ['pectoraux']).length > 0,
  )

  // Vertical push: deltoïdes compound
  const verticalPush = nonRehab.filter(
    (e) => e.category === 'compound' && exercisesForMuscles([e], ['deltoïdes']).length > 0,
  )

  // Chest accessories: pectoraux isolation
  const chestAccessories = nonRehab.filter(
    (e) => (e.category === 'isolation') && exercisesForMuscles([e], ['pectoraux']).length > 0,
  )

  // Lateral raises
  const lateralRaises = nonRehab.filter(
    (e) => e.name.toLowerCase().includes('élévations latérales') || e.name.toLowerCase().includes('lateral raise'),
  )

  // Triceps exercises
  const tricepsExercises = nonRehab.filter(
    (e) => (e.category === 'isolation') && exercisesForMuscles([e], ['triceps']).length > 0,
  )

  // Face pull (non-rehab version)
  const facePulls = nonRehab.filter(
    (e) => e.name.toLowerCase().includes('face pull'),
  )

  // Horizontal pull: dorsaux compound (rowing, not pulldown/traction)
  const horizontalPull = nonRehab.filter(
    (e) => e.category === 'compound'
      && exercisesForMuscles([e], ['dorsaux', 'rhomboïdes']).length > 0
      && !e.name.toLowerCase().includes('pulldown')
      && !e.name.toLowerCase().includes('traction')
      && !e.name.toLowerCase().includes('pull-up'),
  )

  // Unilateral pull (rowing unilatéral)
  const unilateralPull = nonRehab.filter(
    (e) => e.category === 'compound'
      && exercisesForMuscles([e], ['dorsaux', 'rhomboïdes']).length > 0
      && e.tags.includes('unilateral'),
  )

  // Vertical pull: lat pulldown or tractions
  const verticalPull = nonRehab.filter(
    (e) => e.category === 'compound'
      && (e.name.toLowerCase().includes('pulldown')
        || e.name.toLowerCase().includes('traction')
        || e.name.toLowerCase().includes('pull-up')
        || e.name.toLowerCase().includes('tirage vertical')),
  )

  // Biceps exercises
  const bicepsExercises = nonRehab.filter(
    (e) => exercisesForMuscles([e], ['biceps', 'brachial']).length > 0
      && (e.category === 'isolation'),
  )

  // Rear delt exercises
  const rearDeltExercises = nonRehab.filter(
    (e) => exercisesForMuscles([e], ['deltoïdes postérieurs']).length > 0
      && e.name.toLowerCase() !== 'face pull',
  )

  // Also consider rehab-category band pull-apart as rear delt fallback
  const rehabRearDelts = available.filter(
    (e) => e.isRehab && (e.name.toLowerCase().includes('band pull-apart') || e.name.toLowerCase().includes('face pull')),
  )

  // Shrug exercises
  const shrugExercises = nonRehab.filter(
    (e) => e.name.toLowerCase().includes('shrug') || e.name.toLowerCase().includes('haussements'),
  )

  // Quad compounds
  const quadCompounds = nonRehab.filter(
    (e) => e.category === 'compound' && exercisesForMuscles([e], ['quadriceps']).length > 0,
  )

  // Unilateral legs
  const unilateralLegs = nonRehab.filter(
    (e) => e.category === 'compound' && e.tags.includes('unilateral') && e.tags.includes('lower_body'),
  )

  // Leg extension
  const legExtensions = nonRehab.filter(
    (e) => e.name.toLowerCase().includes('leg extension'),
  )

  // Leg curl
  const legCurls = nonRehab.filter(
    (e) => e.name.toLowerCase().includes('leg curl'),
  )

  // Calf exercises
  const calves = nonRehab.filter(
    (e) => exercisesForMuscles([e], ['gastrocnémiens', 'soléaire', 'mollets']).length > 0
      && e.tags.includes('calves'),
  )

  // Core exercises
  const coreExercises = nonRehab.filter((e) => e.category === 'core')

  // Hip hinge: ischio-jambiers compound lower_body
  const hipHinges = nonRehab.filter(
    (e) => e.category === 'compound'
      && exercisesForMuscles([e], ['ischio-jambiers']).length > 0
      && e.tags.includes('lower_body'),
  )

  // Hip thrust
  const hipThrusts = nonRehab.filter(
    (e) => e.name.toLowerCase().includes('hip thrust'),
  )

  // Lighter quad / pull-through for Legs B
  const lighterQuad = nonRehab.filter(
    (e) => (e.name.toLowerCase().includes('pull-through')
      || (e.category === 'compound' && exercisesForMuscles([e], ['quadriceps']).length > 0)),
  )

  // -----------------------------------------------------------------------
  // Push A — Horizontal push focus
  // -----------------------------------------------------------------------

  const pushASlots: ExerciseSlot[] = [
    {
      label: 'Horizontal push compound',
      candidates: () => horizontalPush,
      preferredName: 'développé couché haltères',
      sets: 4,
      reps: 10,
      rest: 120,
    },
    {
      label: 'Vertical push',
      candidates: () => verticalPush,
      preferredName: 'développé militaire',
      sets: 3,
      reps: 10,
      rest: 120,
    },
    {
      label: 'Chest accessory',
      candidates: () => [...chestAccessories, ...horizontalPush],
      preferredName: 'pec',
      sets: 3,
      reps: 12,
      rest: 90,
    },
    {
      label: 'Élévations latérales',
      candidates: () => lateralRaises,
      preferredName: 'élévations latérales',
      sets: 3,
      reps: 12,
      rest: 90,
    },
    {
      label: 'Triceps',
      candidates: () => tricepsExercises,
      preferredName: 'extension triceps poulie',
      sets: 3,
      reps: 12,
      rest: 60,
    },
    {
      label: 'Face pull (posture)',
      candidates: () => facePulls,
      preferredName: 'face pull',
      sets: 3,
      reps: 15,
      rest: 60,
    },
  ]

  // -----------------------------------------------------------------------
  // Push B — Vertical push focus
  // -----------------------------------------------------------------------

  const pushBSlots: ExerciseSlot[] = [
    {
      label: 'Vertical push compound',
      candidates: () => verticalPush,
      preferredName: 'développé militaire smith',
      sets: 4,
      reps: 10,
      rest: 120,
    },
    {
      label: 'Horizontal push',
      candidates: () => [...horizontalPush, ...chestAccessories],
      preferredName: 'développé couché smith',
      sets: 3,
      reps: 10,
      rest: 120,
    },
    {
      label: 'Élévations latérales câble',
      candidates: () => lateralRaises,
      preferredName: 'élévations latérales câble',
      sets: 3,
      reps: 12,
      rest: 90,
    },
    {
      label: 'Chest fly / accessory',
      candidates: () => [...chestAccessories, ...horizontalPush],
      preferredName: 'écartés',
      sets: 3,
      reps: 12,
      rest: 90,
    },
    {
      label: 'Triceps overhead',
      candidates: () => tricepsExercises,
      preferredName: 'overhead',
      sets: 3,
      reps: 12,
      rest: 60,
    },
    {
      label: 'Face pull (posture)',
      candidates: () => facePulls,
      preferredName: 'face pull',
      sets: 3,
      reps: 15,
      rest: 60,
    },
  ]

  // -----------------------------------------------------------------------
  // Pull A — Horizontal pull focus
  // -----------------------------------------------------------------------

  const pullASlots: ExerciseSlot[] = [
    {
      label: 'Horizontal pull',
      candidates: () => horizontalPull,
      preferredName: 'rowing câble',
      sets: 4,
      reps: 10,
      rest: 120,
    },
    {
      label: 'Vertical pull',
      candidates: () => verticalPull,
      preferredName: 'lat pulldown',
      sets: 3,
      reps: 10,
      rest: 120,
    },
    {
      label: 'Unilateral pull',
      candidates: () => [...unilateralPull, ...horizontalPull],
      preferredName: 'unilatéral',
      sets: 3,
      reps: 10,
      rest: 90,
    },
    {
      label: 'Face pull (posture)',
      candidates: () => facePulls,
      preferredName: 'face pull',
      sets: 3,
      reps: 12,
      rest: 60,
    },
    {
      label: 'Biceps',
      candidates: () => bicepsExercises,
      preferredName: 'curl biceps haltères',
      sets: 3,
      reps: 12,
      rest: 60,
    },
    {
      label: 'Rear delt',
      candidates: () => [...rearDeltExercises, ...rehabRearDelts, ...lateralRaises],
      preferredName: 'band pull-apart',
      sets: 3,
      reps: 20,
      rest: 60,
    },
  ]

  // -----------------------------------------------------------------------
  // Pull B — Vertical pull focus
  // -----------------------------------------------------------------------

  const pullBSlots: ExerciseSlot[] = [
    {
      label: 'Vertical pull',
      candidates: () => verticalPull,
      preferredName: 'lat pulldown',
      sets: 4,
      reps: 10,
      rest: 120,
    },
    {
      label: 'Horizontal pull',
      candidates: () => horizontalPull,
      preferredName: 'rowing machine',
      sets: 3,
      reps: 10,
      rest: 120,
    },
    {
      label: 'Unilateral pull',
      candidates: () => [...unilateralPull, ...horizontalPull],
      preferredName: 'rowing haltère',
      sets: 3,
      reps: 10,
      rest: 90,
    },
    {
      label: 'Face pull',
      candidates: () => facePulls,
      preferredName: 'face pull',
      sets: 3,
      reps: 12,
      rest: 60,
    },
    {
      label: 'Biceps curl marteau (elbow-friendly)',
      candidates: () => bicepsExercises,
      preferredName: 'curl marteau',
      sets: 3,
      reps: 12,
      rest: 60,
    },
    {
      label: 'Shrug',
      candidates: () => [...shrugExercises, ...horizontalPull],
      preferredName: 'shrug',
      sets: 3,
      reps: 12,
      rest: 60,
    },
  ]

  // -----------------------------------------------------------------------
  // Legs A — Quad Focus
  // -----------------------------------------------------------------------

  const legsASlots: ExerciseSlot[] = [
    {
      label: 'Quad compound',
      candidates: () => quadCompounds,
      preferredName: 'leg press',
      sets: 4,
      reps: 10,
      rest: 150,
    },
    {
      label: 'Unilateral legs',
      candidates: () => unilateralLegs,
      preferredName: 'fentes',
      sets: 3,
      reps: 12,
      rest: 90,
    },
    {
      label: 'Leg extension',
      candidates: () => legExtensions,
      preferredName: 'leg extension',
      sets: 3,
      reps: 12,
      rest: 90,
    },
    {
      label: 'Leg curl (balance)',
      candidates: () => legCurls,
      preferredName: 'leg curl',
      sets: 3,
      reps: 12,
      rest: 90,
    },
    {
      label: 'Calf exercise',
      candidates: () => calves,
      sets: 3,
      reps: 20,
      rest: 60,
    },
    {
      label: 'Core exercise',
      candidates: () => coreExercises,
      preferredName: 'dead bug',
      sets: 3,
      reps: 12,
      rest: 60,
    },
  ]

  // -----------------------------------------------------------------------
  // Legs B — Hamstring/Glute Focus
  // -----------------------------------------------------------------------

  const avoidSDT = hasLowerBackPain(conditions)

  const legsBSlots: ExerciseSlot[] = [
    {
      label: avoidSDT ? 'Hip thrust (primary compound)' : 'Hip hinge',
      candidates: () => avoidSDT ? [...hipThrusts, ...hipHinges] : hipHinges,
      preferredName: avoidSDT ? 'hip thrust' : 'sdt smith',
      sets: 4,
      reps: avoidSDT ? 10 : 8,
      rest: 150,
    },
    ...(avoidSDT ? [] : [{
      label: 'Hip thrust',
      candidates: () => hipThrusts,
      preferredName: 'hip thrust',
      sets: 4,
      reps: 10,
      rest: 120,
    } as ExerciseSlot]),
    {
      label: 'Leg curl',
      candidates: () => legCurls,
      preferredName: 'leg curl',
      sets: 3,
      reps: 12,
      rest: 90,
    },
    {
      label: 'Lighter quad / pull-through',
      candidates: () => lighterQuad,
      preferredName: 'pull-through',
      sets: 3,
      reps: 12,
      rest: 90,
    },
    {
      label: 'Calf exercise',
      candidates: () => calves,
      sets: 3,
      reps: 20,
      rest: 60,
    },
    {
      label: 'Core exercise',
      candidates: () => coreExercises,
      preferredName: 'planche',
      sets: 3,
      reps: 10,
      rest: 60,
    },
  ]

  // -----------------------------------------------------------------------
  // Build the 6 sessions
  // -----------------------------------------------------------------------

  return [
    buildStructuredSession('Push A', 1, pushASlots, available),
    buildStructuredSession('Pull A', 2, pullASlots, available),
    buildStructuredSession('Legs A — Quadriceps', 3, legsASlots, available),
    buildStructuredSession('Push B', 4, pushBSlots, available),
    buildStructuredSession('Pull B', 5, pullBSlots, available),
    buildStructuredSession('Legs B — Hamstring / Glutes', 6, legsBSlots, available),
  ]
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
  const afterContraindications = filterExercisesByContraindications(
    afterEquipment,
    input.conditions,
  )

  // Step 3 — exclude cardio exercises from strength training pool
  // Cardio exercises (bike, treadmill, elliptique) have primaryMuscles like
  // 'quadriceps' which causes them to be picked for strength slots.
  // They remain available for warmup/cooldown but not for the main program.
  const eligible = afterContraindications.filter(
    (e) => !e.tags.includes('cardio'),
  )

  // Step 5 — determine split
  const splitType = determineSplit(input.daysPerWeek)

  // Step 6 — build sessions
  let sessions: ProgramSession[]
  switch (splitType) {
    case 'full_body':
      sessions = buildFullBodySessions(eligible, input.daysPerWeek, input.conditions)
      break
    case 'upper_lower':
      sessions = buildUpperLowerSessions(eligible, input.conditions)
      break
    case 'push_pull_legs':
      sessions = buildPushPullLegsSessions(eligible, input.conditions)
      break
  }

  return {
    name: SPLIT_NAMES[splitType] ?? 'Programme',
    type: splitType,
    sessions,
  }
}
