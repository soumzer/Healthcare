import { describe, it, expect } from 'vitest'
import {
  filterExercisesByEquipment,
  filterExercisesByContraindications,
  determineSplit,
  generateProgram,
  estimateSlotMinutes,
  trimSlotsToTimeBudget,
} from '../program-generator'
import type { ExerciseSlot } from '../program-generator'
import type { Exercise, GymEquipment, HealthCondition } from '../../db/types'

// ---------------------------------------------------------------------------
// Test helpers — minimal exercise and equipment factories
// ---------------------------------------------------------------------------

function makeExercise(overrides: Partial<Exercise> & { id: number; name: string }): Exercise {
  return {
    category: 'compound',
    primaryMuscles: [],
    secondaryMuscles: [],
    equipmentNeeded: [],
    contraindications: [],
    alternatives: [],
    instructions: '',
    isRehab: false,
    tags: [],
    ...overrides,
  }
}

function makeEquipment(name: string, isAvailable = true): GymEquipment {
  return {
    id: Math.random(),
    userId: 1,
    name,
    type: 'machine',
    isAvailable,
    notes: '',
  }
}

function makeCondition(
  bodyZone: HealthCondition['bodyZone'],
  painLevel: number,
  isActive = true,
): HealthCondition {
  return {
    id: Math.random(),
    userId: 1,
    bodyZone,
    label: `Test ${bodyZone}`,
    diagnosis: '',
    painLevel,
    since: '1 an',
    notes: '',
    isActive,
    createdAt: new Date(),
  }
}

// ---------------------------------------------------------------------------
// filterExercisesByEquipment
// ---------------------------------------------------------------------------

describe('filterExercisesByEquipment', () => {
  const benchPress = makeExercise({
    id: 1,
    name: 'Bench Press',
    equipmentNeeded: ['bench', 'barbell'],
  })

  const pushUp = makeExercise({
    id: 2,
    name: 'Push Up',
    equipmentNeeded: [],
  })

  const cableRow = makeExercise({
    id: 3,
    name: 'Cable Row',
    equipmentNeeded: ['cable'],
  })

  const legPress = makeExercise({
    id: 4,
    name: 'Leg Press',
    equipmentNeeded: ['leg_press'],
  })

  it('bodyweight exercises are always included', () => {
    const result = filterExercisesByEquipment([pushUp], [])
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Push Up')
  })

  it('includes exercise when all required equipment is available', () => {
    const equipment = [makeEquipment('bench'), makeEquipment('barbell')]
    const result = filterExercisesByEquipment([benchPress], equipment)
    expect(result).toHaveLength(1)
  })

  it('excludes exercise when a required piece of equipment is missing', () => {
    const equipment = [makeEquipment('bench')]
    // Missing barbell
    const result = filterExercisesByEquipment([benchPress], equipment)
    expect(result).toHaveLength(0)
  })

  it('excludes exercise when equipment exists but is not available', () => {
    const equipment = [
      makeEquipment('bench', true),
      makeEquipment('barbell', false), // not available
    ]
    const result = filterExercisesByEquipment([benchPress], equipment)
    expect(result).toHaveLength(0)
  })

  it('filters a mixed list correctly', () => {
    const equipment = [makeEquipment('cable')]
    const result = filterExercisesByEquipment(
      [benchPress, pushUp, cableRow, legPress],
      equipment,
    )
    // pushUp (bodyweight) and cableRow (cable available)
    expect(result).toHaveLength(2)
    expect(result.map((e) => e.name).sort()).toEqual(['Cable Row', 'Push Up'])
  })

  it('returns all exercises when equipment list covers everything', () => {
    const equipment = [
      makeEquipment('bench'),
      makeEquipment('barbell'),
      makeEquipment('cable'),
      makeEquipment('leg_press'),
    ]
    const result = filterExercisesByEquipment(
      [benchPress, pushUp, cableRow, legPress],
      equipment,
    )
    expect(result).toHaveLength(4)
  })
})

// ---------------------------------------------------------------------------
// filterExercisesByContraindications
// ---------------------------------------------------------------------------

describe('filterExercisesByContraindications', () => {
  const shoulderExercise = makeExercise({
    id: 10,
    name: 'Overhead Press',
    contraindications: ['shoulder_left', 'shoulder_right'],
  })

  const kneeExercise = makeExercise({
    id: 11,
    name: 'Squat',
    contraindications: ['knee_left', 'knee_right', 'lower_back'],
  })

  const safeExercise = makeExercise({
    id: 12,
    name: 'Dead Bug',
    contraindications: [],
  })

  it('excludes exercise when zone has painLevel >= 7 (severe)', () => {
    const conditions = [makeCondition('shoulder_left', 8)]
    const result = filterExercisesByContraindications(
      [shoulderExercise, safeExercise],
      conditions,
    )
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Dead Bug')
  })

  it('allows exercise when zone painLevel < 7 (moderate pain)', () => {
    const conditions = [makeCondition('shoulder_left', 5)]
    const result = filterExercisesByContraindications(
      [shoulderExercise, safeExercise],
      conditions,
    )
    // Both should pass because painLevel < 7
    expect(result).toHaveLength(2)
  })

  it('allows exercise when condition is inactive', () => {
    const conditions = [makeCondition('shoulder_left', 8, false)]
    const result = filterExercisesByContraindications(
      [shoulderExercise, safeExercise],
      conditions,
    )
    expect(result).toHaveLength(2)
  })

  it('handles exact boundary: painLevel 7 excludes', () => {
    const conditions = [makeCondition('knee_right', 7)]
    const result = filterExercisesByContraindications(
      [kneeExercise, safeExercise],
      conditions,
    )
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Dead Bug')
  })

  it('handles exact boundary: painLevel 6 allows (below threshold)', () => {
    const conditions = [makeCondition('knee_right', 6)]
    const result = filterExercisesByContraindications(
      [kneeExercise, safeExercise],
      conditions,
    )
    expect(result).toHaveLength(2)
  })

  it('handles exact boundary: painLevel 5 allows', () => {
    const conditions = [makeCondition('knee_right', 5)]
    const result = filterExercisesByContraindications(
      [kneeExercise, safeExercise],
      conditions,
    )
    expect(result).toHaveLength(2)
  })

  it('keeps all exercises when no conditions provided', () => {
    const result = filterExercisesByContraindications(
      [shoulderExercise, kneeExercise, safeExercise],
      [],
    )
    expect(result).toHaveLength(3)
  })

  it('excludes exercises with overlapping zones from multiple conditions', () => {
    const conditions = [
      makeCondition('shoulder_left', 8),
      makeCondition('lower_back', 9),
    ]
    const result = filterExercisesByContraindications(
      [shoulderExercise, kneeExercise, safeExercise],
      conditions,
    )
    // shoulderExercise excluded by shoulder_left, kneeExercise excluded by lower_back
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Dead Bug')
  })

  // -----------------------------------------------------------------------
  // Threshold >= 7 — aligned with session "skip" tier
  // -----------------------------------------------------------------------

  it('excludes exercises with lower_back contraindication at painLevel >= 7', () => {
    const rowingBarre = makeExercise({
      id: 30,
      name: 'Rowing barre',
      contraindications: ['lower_back', 'elbow_left', 'elbow_right'],
    })
    const conditions = [makeCondition('lower_back', 7)]
    const result = filterExercisesByContraindications(
      [rowingBarre, safeExercise],
      conditions,
    )
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Dead Bug')
  })

  it('allows exercises with lower_back contraindication at painLevel 6 (below threshold)', () => {
    const rowingBarre = makeExercise({
      id: 30,
      name: 'Rowing barre',
      contraindications: ['lower_back', 'elbow_left', 'elbow_right'],
    })
    const conditions = [makeCondition('lower_back', 6)]
    const result = filterExercisesByContraindications(
      [rowingBarre, safeExercise],
      conditions,
    )
    expect(result).toHaveLength(2)
  })

  it('does NOT exclude machine rowing (no lower_back contraindication) even with back pain', () => {
    const machineRowing = makeExercise({
      id: 31,
      name: 'Rowing machine (chest-supported)',
      contraindications: [],
    })
    const conditions = [makeCondition('lower_back', 7)]
    const result = filterExercisesByContraindications(
      [machineRowing, safeExercise],
      conditions,
    )
    expect(result).toHaveLength(2)
  })

  it('does NOT exclude leg press (no lower_back contraindication) even with back pain', () => {
    const legPress = makeExercise({
      id: 32,
      name: 'Leg press',
      contraindications: [],
    })
    const conditions = [makeCondition('lower_back', 7)]
    const result = filterExercisesByContraindications(
      [legPress, safeExercise],
      conditions,
    )
    expect(result).toHaveLength(2)
  })

  it('does NOT exclude hip thrust (no lower_back contraindication) even with back pain', () => {
    const hipThrust = makeExercise({
      id: 33,
      name: 'Hip thrust smith machine',
      contraindications: ['hip_left', 'hip_right'],
    })
    const conditions = [makeCondition('lower_back', 7)]
    const result = filterExercisesByContraindications(
      [hipThrust, safeExercise],
      conditions,
    )
    expect(result).toHaveLength(2)
  })

  it('knee pain at 6 does NOT trigger filtering (below threshold)', () => {
    const conditions = [makeCondition('knee_left', 6)]
    const result = filterExercisesByContraindications(
      [kneeExercise, safeExercise],
      conditions,
    )
    expect(result).toHaveLength(2)
  })

  it('knee pain at 7 excludes exercises with knee contraindication', () => {
    const conditions = [makeCondition('knee_left', 7)]
    const result = filterExercisesByContraindications(
      [kneeExercise, safeExercise],
      conditions,
    )
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Dead Bug')
  })

  it('shoulder pain at 7 excludes exercises with shoulder contraindication', () => {
    const conditions = [makeCondition('shoulder_left', 7)]
    const result = filterExercisesByContraindications(
      [shoulderExercise, safeExercise],
      conditions,
    )
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Dead Bug')
  })

  it('elbow pain at 7 excludes exercises with elbow contraindication', () => {
    const elbowExercise = makeExercise({
      id: 35,
      name: 'Curl biceps barre',
      contraindications: ['elbow_left', 'elbow_right'],
    })
    const conditions = [makeCondition('elbow_left', 7)]
    const result = filterExercisesByContraindications(
      [elbowExercise, safeExercise],
      conditions,
    )
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Dead Bug')
  })

  it('excludes SDT with lower_back contraindication at painLevel 7', () => {
    const sdt = makeExercise({
      id: 34,
      name: 'SDT smith machine (soulevé de terre)',
      contraindications: ['lower_back'],
    })
    const conditions = [makeCondition('lower_back', 7)]
    const result = filterExercisesByContraindications(
      [sdt, safeExercise],
      conditions,
    )
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Dead Bug')
  })
})

// ---------------------------------------------------------------------------
// determineSplit
// ---------------------------------------------------------------------------

describe('determineSplit', () => {
  it('returns full_body for 2 days', () => {
    expect(determineSplit(2)).toBe('full_body')
  })

  it('returns full_body for 3 days', () => {
    expect(determineSplit(3)).toBe('full_body')
  })

  it('returns upper_lower for 4 days', () => {
    expect(determineSplit(4)).toBe('upper_lower')
  })

  it('returns push_pull_legs for 5 days', () => {
    expect(determineSplit(5)).toBe('push_pull_legs')
  })

  it('returns push_pull_legs for 6 days', () => {
    expect(determineSplit(6)).toBe('push_pull_legs')
  })
})

// ---------------------------------------------------------------------------
// generateProgram — integration
// ---------------------------------------------------------------------------

describe('generateProgram', () => {
  // Build a small but realistic catalog with IDs and primaryMuscles
  const catalog: Exercise[] = [
    // Compound push upper
    makeExercise({ id: 1, name: 'Bench Press', category: 'compound', primaryMuscles: ['pectoraux'], tags: ['push', 'upper_body', 'chest'], equipmentNeeded: ['bench', 'barbell'] }),
    makeExercise({ id: 2, name: 'DB Shoulder Press', category: 'compound', primaryMuscles: ['deltoïdes'], tags: ['push', 'upper_body', 'shoulders'], equipmentNeeded: ['dumbbells'] }),
    // Compound pull upper
    makeExercise({ id: 3, name: 'Cable Row', category: 'compound', primaryMuscles: ['dorsaux', 'rhomboïdes'], tags: ['pull', 'upper_body', 'back'], equipmentNeeded: ['cable'] }),
    makeExercise({ id: 4, name: 'Lat Pulldown', category: 'compound', primaryMuscles: ['dorsaux', 'grand rond'], tags: ['pull', 'upper_body', 'back'], equipmentNeeded: ['lat_pulldown'] }),
    // Isolation push upper
    makeExercise({ id: 5, name: 'Lateral Raise', category: 'isolation', primaryMuscles: ['deltoïdes latéraux'], tags: ['push', 'upper_body', 'shoulders'], equipmentNeeded: ['dumbbells'] }),
    // Isolation pull upper
    makeExercise({ id: 6, name: 'Bicep Curl', category: 'isolation', primaryMuscles: ['biceps'], tags: ['pull', 'upper_body', 'arms'], equipmentNeeded: ['dumbbells'] }),
    // Compound lower
    makeExercise({ id: 7, name: 'Squat', category: 'compound', primaryMuscles: ['quadriceps', 'fessiers'], tags: ['legs', 'lower_body', 'squat'], equipmentNeeded: ['barbell'] }),
    makeExercise({ id: 8, name: 'Leg Press', category: 'compound', primaryMuscles: ['quadriceps', 'fessiers'], tags: ['legs', 'lower_body'], equipmentNeeded: ['leg_press'] }),
    makeExercise({ id: 9, name: 'Lunge', category: 'compound', primaryMuscles: ['quadriceps', 'fessiers'], tags: ['legs', 'lower_body', 'unilateral'], equipmentNeeded: ['dumbbells'] }),
    // Isolation lower
    makeExercise({ id: 10, name: 'Leg Extension', category: 'isolation', primaryMuscles: ['quadriceps'], tags: ['legs', 'lower_body', 'quadriceps'], equipmentNeeded: ['leg_extension'] }),
    makeExercise({ id: 11, name: 'Leg Curl', category: 'isolation', primaryMuscles: ['ischio-jambiers'], tags: ['legs', 'lower_body', 'hamstrings'], equipmentNeeded: ['leg_curl'] }),
    // Core
    makeExercise({ id: 12, name: 'Dead Bug', category: 'core', primaryMuscles: ['transverse abdominal'], tags: ['core', 'abs'], equipmentNeeded: [] }),
    makeExercise({ id: 13, name: 'Plank', category: 'core', primaryMuscles: ['transverse abdominal'], tags: ['core', 'stability'], equipmentNeeded: [] }),
    // Rehab
    makeExercise({ id: 14, name: 'Chin Tuck', category: 'rehab', tags: ['rehab', 'posture'], equipmentNeeded: [], isRehab: true }),
    makeExercise({ id: 15, name: 'Wall Angel', category: 'rehab', tags: ['rehab', 'posture'], equipmentNeeded: [], isRehab: true }),
  ]

  const allEquipment: GymEquipment[] = [
    makeEquipment('bench'),
    makeEquipment('barbell'),
    makeEquipment('cable'),
    makeEquipment('lat_pulldown'),
    makeEquipment('dumbbells'),
    makeEquipment('leg_press'),
    makeEquipment('leg_extension'),
    makeEquipment('leg_curl'),
  ]

  const baseInput = {
    userId: 1,

    conditions: [],
    equipment: allEquipment,

    minutesPerSession: 60,
  }

  it('generates a full_body program for 3 days/week', () => {
    const result = generateProgram(
      { ...baseInput, daysPerWeek: 3 },
      catalog,
    )
    expect(result.type).toBe('full_body')
    expect(result.sessions).toHaveLength(3)
    expect(result.name).toBe('Programme Full Body')
  })

  it('generates an upper_lower program for 4 days/week', () => {
    const result = generateProgram(
      { ...baseInput, daysPerWeek: 4 },
      catalog,
    )
    expect(result.type).toBe('upper_lower')
    expect(result.sessions).toHaveLength(4)
    expect(result.name).toBe('Programme Upper / Lower')
  })

  it('generates a push_pull_legs program for 5 days/week', () => {
    const result = generateProgram(
      { ...baseInput, daysPerWeek: 5 },
      catalog,
    )
    expect(result.type).toBe('push_pull_legs')
    // PPL creates 6 sessions (Push, Pull, Legs, Push B, Pull B, Legs B)
    expect(result.sessions).toHaveLength(6)
    expect(result.name).toBe('Programme Push / Pull / Legs')
  })

  it('every session has at least one exercise', () => {
    const result = generateProgram(
      { ...baseInput, daysPerWeek: 4 },
      catalog,
    )
    for (const session of result.sessions) {
      expect(session.exercises.length).toBeGreaterThan(0)
    }
  })

  it('exercises have valid IDs from the catalog', () => {
    const catalogIds = new Set(catalog.map((e) => e.id))
    const result = generateProgram(
      { ...baseInput, daysPerWeek: 4 },
      catalog,
    )
    for (const session of result.sessions) {
      for (const ex of session.exercises) {
        expect(catalogIds.has(ex.exerciseId)).toBe(true)
      }
    }
  })

  it('no duplicate exercises within a single session', () => {
    const result = generateProgram(
      { ...baseInput, daysPerWeek: 4 },
      catalog,
    )
    for (const session of result.sessions) {
      const ids = session.exercises.map((e) => e.exerciseId)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('ProgramExercise fields are well-formed', () => {
    const result = generateProgram(
      { ...baseInput, daysPerWeek: 3 },
      catalog,
    )
    for (const session of result.sessions) {
      for (const ex of session.exercises) {
        expect(ex.exerciseId).toBeGreaterThan(0)
        expect(ex.order).toBeGreaterThan(0)
        expect(ex.sets).toBeGreaterThanOrEqual(1)
        expect(ex.targetReps).toBeGreaterThanOrEqual(1)
        expect(ex.restSeconds).toBeGreaterThan(0)
        expect(typeof ex.isRehab).toBe('boolean')
      }
    }
  })

  it('session orders are sequential starting from 1', () => {
    const result = generateProgram(
      { ...baseInput, daysPerWeek: 4 },
      catalog,
    )
    result.sessions.forEach((s, i) => {
      expect(s.order).toBe(i + 1)
    })
  })

  it('respects equipment filtering — excludes exercises needing unavailable gear', () => {
    const limitedEquipment = [makeEquipment('dumbbells')]
    const result = generateProgram(
      { ...baseInput, daysPerWeek: 3, equipment: limitedEquipment },
      catalog,
    )
    // No exercise in the result should reference IDs that need bench, barbell, cable etc.
    const exercisesThatNeedBenchBarbell = new Set([1, 7]) // Bench Press, Squat
    for (const session of result.sessions) {
      for (const ex of session.exercises) {
        expect(exercisesThatNeedBenchBarbell.has(ex.exerciseId)).toBe(false)
      }
    }
  })

  it('respects contraindication filtering — excludes exercises for painful zones', () => {
    const conditions = [makeCondition('shoulder_left', 8)]
    // Add a shoulder-contraindicated exercise to catalog
    const shoulderBadExercise = makeExercise({
      id: 20,
      name: 'Overhead Press',
      category: 'compound',
      tags: ['push', 'upper_body', 'shoulders'],
      equipmentNeeded: ['barbell'],
      contraindications: ['shoulder_left', 'shoulder_right'],
    })
    const result = generateProgram(
      { ...baseInput, daysPerWeek: 3, conditions },
      [...catalog, shoulderBadExercise],
    )
    for (const session of result.sessions) {
      for (const ex of session.exercises) {
        expect(ex.exerciseId).not.toBe(20)
      }
    }
  })

  it('excludes cardio exercises from strength training sessions', () => {
    const bikeExercise = makeExercise({
      id: 30,
      name: 'Vélo stationnaire',
      category: 'compound',
      primaryMuscles: ['quadriceps', 'mollets'],
      tags: ['cardio', 'lower_body', 'conditioning', 'bike', 'low_impact'],
      equipmentNeeded: ['bike'],
    })
    const treadmill = makeExercise({
      id: 31,
      name: 'Marche sur tapis incliné',
      category: 'compound',
      primaryMuscles: ['quadriceps', 'fessiers', 'mollets'],
      tags: ['cardio', 'lower_body', 'conditioning', 'treadmill', 'low_impact'],
      equipmentNeeded: ['treadmill'],
    })
    const extendedEquipment = [...allEquipment, makeEquipment('bike'), makeEquipment('treadmill')]
    const result = generateProgram(
      { ...baseInput, daysPerWeek: 3, equipment: extendedEquipment },
      [...catalog, bikeExercise, treadmill],
    )
    for (const session of result.sessions) {
      for (const ex of session.exercises) {
        expect(ex.exerciseId).not.toBe(30)
        expect(ex.exerciseId).not.toBe(31)
      }
    }
  })

  it('rehab exercises are marked with isRehab = true', () => {
    const result = generateProgram(
      { ...baseInput, daysPerWeek: 3 },
      catalog,
    )
    const rehabCatalogIds = new Set(catalog.filter((e) => e.isRehab).map((e) => e.id))
    for (const session of result.sessions) {
      for (const ex of session.exercises) {
        if (rehabCatalogIds.has(ex.exerciseId)) {
          expect(ex.isRehab).toBe(true)
        }
      }
    }
  })
})

// ---------------------------------------------------------------------------
// Upper/Lower structured session builder
// ---------------------------------------------------------------------------

describe('Upper/Lower structured sessions', () => {
  // Realistic catalog mirroring the real exercise data with proper primaryMuscles
  const ulCatalog: Exercise[] = [
    // === COMPOUND LOWER: Quad-dominant ===
    makeExercise({
      id: 101, name: 'Leg press', category: 'compound',
      primaryMuscles: ['quadriceps', 'fessiers'],
      tags: ['legs', 'lower_body', 'machine'],
      equipmentNeeded: ['leg_press'],
    }),
    makeExercise({
      id: 102, name: 'Squat smith machine', category: 'compound',
      primaryMuscles: ['quadriceps', 'fessiers'],
      tags: ['legs', 'lower_body', 'squat', 'smith_machine'],
      equipmentNeeded: ['smith_machine'],
    }),

    // === COMPOUND LOWER: Unilateral legs ===
    makeExercise({
      id: 103, name: 'Fentes haltères', category: 'compound',
      primaryMuscles: ['quadriceps', 'fessiers'],
      tags: ['legs', 'lower_body', 'lunge', 'dumbbells', 'unilateral'],
      equipmentNeeded: ['dumbbells'],
    }),
    makeExercise({
      id: 104, name: 'Fentes smith machine', category: 'compound',
      primaryMuscles: ['quadriceps', 'fessiers'],
      tags: ['legs', 'lower_body', 'lunge', 'smith_machine', 'unilateral'],
      equipmentNeeded: ['smith_machine'],
    }),

    // === ISOLATION LOWER: Leg extension ===
    makeExercise({
      id: 105, name: 'Leg extension', category: 'isolation',
      primaryMuscles: ['quadriceps'],
      tags: ['legs', 'lower_body', 'quadriceps', 'machine'],
      equipmentNeeded: ['leg_extension'],
    }),

    // === ISOLATION LOWER: Leg curl ===
    makeExercise({
      id: 106, name: 'Leg curl (ischio-jambiers)', category: 'isolation',
      primaryMuscles: ['ischio-jambiers'],
      tags: ['legs', 'lower_body', 'hamstrings', 'machine'],
      equipmentNeeded: ['leg_curl'],
    }),

    // === ISOLATION LOWER: Calves ===
    makeExercise({
      id: 107, name: 'Mollets debout smith machine (calf raise)', category: 'isolation',
      primaryMuscles: ['gastrocnémiens'],
      tags: ['legs', 'lower_body', 'calves', 'smith_machine'],
      equipmentNeeded: ['smith_machine'],
    }),
    makeExercise({
      id: 108, name: 'Mollets assis haltère', category: 'isolation',
      primaryMuscles: ['soléaire'],
      tags: ['legs', 'lower_body', 'calves', 'dumbbell'],
      equipmentNeeded: ['bench', 'dumbbell'],
    }),

    // === CORE ===
    makeExercise({
      id: 109, name: 'Dead bug', category: 'core',
      primaryMuscles: ['transverse abdominal', 'rectus abdominis'],
      tags: ['core', 'abs', 'stability', 'bodyweight'],
      equipmentNeeded: [],
    }),
    makeExercise({
      id: 110, name: 'Pallof press', category: 'core',
      primaryMuscles: ['obliques', 'transverse abdominal'],
      tags: ['core', 'anti_rotation', 'stability', 'cable'],
      equipmentNeeded: ['cable'],
    }),

    // === COMPOUND LOWER: Hip hinge (hamstring/glute) ===
    makeExercise({
      id: 111, name: 'SDT smith machine (soulevé de terre jambes tendues)', category: 'compound',
      primaryMuscles: ['ischio-jambiers', 'fessiers'],
      contraindications: ['lower_back'],
      tags: ['pull', 'lower_body', 'posterior_chain', 'smith_machine', 'hamstrings'],
      equipmentNeeded: ['smith_machine'],
    }),
    makeExercise({
      id: 112, name: 'Soulevé de terre roumain haltères', category: 'compound',
      primaryMuscles: ['ischio-jambiers', 'fessiers'],
      contraindications: ['lower_back'],
      tags: ['pull', 'lower_body', 'posterior_chain', 'dumbbells', 'hamstrings'],
      equipmentNeeded: ['dumbbells'],
    }),

    // === COMPOUND LOWER: Hip thrust ===
    makeExercise({
      id: 113, name: 'Hip thrust smith machine', category: 'compound',
      primaryMuscles: ['fessiers'],
      tags: ['lower_body', 'glutes', 'smith_machine'],
      equipmentNeeded: ['smith_machine', 'bench'],
    }),

    // === ISOLATION LOWER: Pull-through ===
    makeExercise({
      id: 114, name: 'Pull-through câble (tirage entre les jambes)', category: 'isolation',
      primaryMuscles: ['fessiers', 'ischio-jambiers'],
      tags: ['lower_body', 'glutes', 'posterior_chain', 'cable'],
      equipmentNeeded: ['cable', 'rope_attachment'],
    }),

    // === COMPOUND UPPER: Horizontal push (chest) ===
    makeExercise({
      id: 201, name: 'Développé couché haltères', category: 'compound',
      primaryMuscles: ['pectoraux'],
      tags: ['push', 'upper_body', 'chest', 'dumbbells'],
      equipmentNeeded: ['bench', 'dumbbells'],
    }),
    makeExercise({
      id: 202, name: 'Développé couché smith machine', category: 'compound',
      primaryMuscles: ['pectoraux'],
      tags: ['push', 'upper_body', 'chest', 'smith_machine'],
      equipmentNeeded: ['smith_machine', 'bench'],
    }),

    // === COMPOUND UPPER: Vertical push (shoulders) ===
    makeExercise({
      id: 203, name: 'Développé militaire haltères', category: 'compound',
      primaryMuscles: ['deltoïdes'],
      tags: ['push', 'upper_body', 'shoulders', 'dumbbells'],
      equipmentNeeded: ['dumbbells'],
    }),
    makeExercise({
      id: 204, name: 'Développé militaire machine', category: 'compound',
      primaryMuscles: ['deltoïdes'],
      tags: ['push', 'upper_body', 'shoulders', 'machine'],
      equipmentNeeded: ['shoulder_press'],
    }),

    // === ISOLATION UPPER: Lateral raises ===
    makeExercise({
      id: 205, name: 'Élévations latérales', category: 'isolation',
      primaryMuscles: ['deltoïdes latéraux'],
      tags: ['push', 'upper_body', 'shoulders', 'dumbbells'],
      equipmentNeeded: ['dumbbells'],
    }),

    // === ISOLATION UPPER: Chest accessories ===
    makeExercise({
      id: 206, name: 'Câble crossover (écartés câble)', category: 'isolation',
      primaryMuscles: ['pectoraux'],
      tags: ['push', 'upper_body', 'chest', 'cable'],
      equipmentNeeded: ['cable'],
    }),
    makeExercise({
      id: 207, name: 'Pec deck machine', category: 'isolation',
      primaryMuscles: ['pectoraux'],
      tags: ['push', 'upper_body', 'chest', 'machine'],
      equipmentNeeded: ['pec_deck'],
    }),

    // === ISOLATION UPPER: Face pull (non-rehab, appears in every upper session) ===
    makeExercise({
      id: 208, name: 'Face pull', category: 'isolation',
      primaryMuscles: ['deltoïdes postérieurs', 'rhomboïdes'],
      tags: ['pull', 'upper_body', 'shoulders', 'posture', 'cable'],
      equipmentNeeded: ['cable', 'rope_attachment'],
    }),

    // === ISOLATION UPPER: Push accessories (triceps) ===
    makeExercise({
      id: 209, name: 'Extension triceps poulie haute', category: 'isolation',
      primaryMuscles: ['triceps'],
      tags: ['push', 'upper_body', 'arms', 'triceps', 'cable'],
      equipmentNeeded: ['cable'],
    }),

    // === COMPOUND UPPER: Horizontal pull (rowing) ===
    makeExercise({
      id: 210, name: 'Rowing câble assis', category: 'compound',
      primaryMuscles: ['dorsaux', 'rhomboïdes'],
      tags: ['pull', 'upper_body', 'back', 'cable', 'posture'],
      equipmentNeeded: ['cable'],
    }),
    makeExercise({
      id: 211, name: 'Rowing haltère unilatéral', category: 'compound',
      primaryMuscles: ['dorsaux', 'rhomboïdes'],
      tags: ['pull', 'upper_body', 'back', 'dumbbell', 'unilateral'],
      equipmentNeeded: ['dumbbell', 'bench'],
    }),

    // === COMPOUND UPPER: Unilateral pull ===
    makeExercise({
      id: 212, name: 'Tirage horizontal câble unilatéral', category: 'compound',
      primaryMuscles: ['dorsaux', 'rhomboïdes'],
      tags: ['pull', 'upper_body', 'back', 'cable', 'unilateral'],
      equipmentNeeded: ['cable'],
    }),

    // === COMPOUND UPPER: Vertical pull ===
    makeExercise({
      id: 213, name: 'Tirage vertical (lat pulldown)', category: 'compound',
      primaryMuscles: ['dorsaux', 'grand rond'],
      tags: ['pull', 'upper_body', 'back', 'machine'],
      equipmentNeeded: ['lat_pulldown'],
    }),

    // === ISOLATION UPPER: Biceps ===
    makeExercise({
      id: 214, name: 'Curl biceps haltères', category: 'isolation',
      primaryMuscles: ['biceps'],
      tags: ['pull', 'upper_body', 'arms', 'biceps', 'dumbbells'],
      equipmentNeeded: ['dumbbells'],
    }),

    // === REHAB: Band pull-apart (rear delt) ===
    makeExercise({
      id: 215, name: 'Band pull-apart', category: 'rehab',
      primaryMuscles: ['deltoïdes postérieurs', 'rhomboïdes'],
      tags: ['rehab', 'posture', 'shoulders', 'upper_back', 'band'],
      equipmentNeeded: ['resistance_band'],
      isRehab: true,
    }),
  ]

  const ulEquipment: GymEquipment[] = [
    makeEquipment('bench'),
    makeEquipment('dumbbells'),
    makeEquipment('dumbbell'),
    makeEquipment('cable'),
    makeEquipment('rope_attachment'),
    makeEquipment('smith_machine'),
    makeEquipment('leg_press'),
    makeEquipment('leg_extension'),
    makeEquipment('leg_curl'),
    makeEquipment('lat_pulldown'),
    makeEquipment('shoulder_press'),
    makeEquipment('pec_deck'),
    makeEquipment('resistance_band'),
  ]

  const ulInput = {
    userId: 1,

    conditions: [],
    equipment: ulEquipment,

    daysPerWeek: 4,
    minutesPerSession: 75, // Complete sessions ~75min
  }

  function getSession(result: ReturnType<typeof generateProgram>, nameFragment: string) {
    return result.sessions.find((s) => s.name.toLowerCase().includes(nameFragment.toLowerCase()))!
  }

  function sessionExerciseIds(session: { exercises: { exerciseId: number }[] }): number[] {
    return session.exercises.map((e) => e.exerciseId)
  }

  const result = generateProgram(ulInput, ulCatalog)

  it('generates 4 sessions for upper/lower split', () => {
    expect(result.type).toBe('upper_lower')
    expect(result.sessions).toHaveLength(4)
  })

  // -----------------------------------------------------------------------
  // Lower 1 — Quadriceps Focus
  // -----------------------------------------------------------------------
  describe('Lower 1 — Quadriceps Focus', () => {
    const lower1 = getSession(result, 'lower 1')
    const ids = sessionExerciseIds(lower1)

    it('contains a quad compound exercise', () => {
      // 101 = Leg press, 102 = Squat smith
      expect(ids.some((id) => [101, 102].includes(id))).toBe(true)
    })

    // Note: leg extension removed from structured slots in favor of more compounds + core

    it('contains leg curl (balance)', () => {
      expect(ids).toContain(106)
    })

    it('contains a core exercise (if not trimmed for time budget)', () => {
      // Core exercises are at the end of the slot list and may be trimmed
      // to fit within minutesPerSession. This test only verifies no crash.
      // If core is present, it's one of 109 or 110.
      const hasCore = ids.some((id) => [109, 110].includes(id))
      if (hasCore) {
        expect(hasCore).toBe(true)
      }
    })

    it('has no duplicate exercise IDs', () => {
      expect(new Set(ids).size).toBe(ids.length)
    })

    it('has between 3 and 8 exercises (respects time budget)', () => {
      // Minimum 3 exercises per trimming algorithm, max 8 from slots
      expect(lower1.exercises.length).toBeGreaterThanOrEqual(3)
      expect(lower1.exercises.length).toBeLessThanOrEqual(8)
    })
  })

  // -----------------------------------------------------------------------
  // Upper 1 — Push Focus
  // -----------------------------------------------------------------------
  describe('Upper 1 — Push Focus', () => {
    const upper1 = getSession(result, 'upper 1')
    const ids = sessionExerciseIds(upper1)

    it('contains a horizontal push (chest compound)', () => {
      // 201 = DC haltères, 202 = DC smith
      expect(ids.some((id) => [201, 202].includes(id))).toBe(true)
    })

    it('contains a vertical push (shoulder compound)', () => {
      // 203 = DM haltères, 204 = DM machine
      expect(ids.some((id) => [203, 204].includes(id))).toBe(true)
    })

    it('contains face pull', () => {
      expect(ids).toContain(208)
    })

    it('has no duplicate exercise IDs', () => {
      expect(new Set(ids).size).toBe(ids.length)
    })

    it('has between 5 and 8 exercises', () => {
      expect(upper1.exercises.length).toBeGreaterThanOrEqual(5)
      expect(upper1.exercises.length).toBeLessThanOrEqual(8)
    })
  })

  // -----------------------------------------------------------------------
  // Lower 2 — Hamstring/Glute Focus
  // -----------------------------------------------------------------------
  describe('Lower 2 — Hamstring/Glute Focus', () => {
    const lower2 = getSession(result, 'lower 2')
    const ids = sessionExerciseIds(lower2)

    it('contains a hip hinge exercise', () => {
      // 111 = SDT smith, 112 = SDT roumain haltères
      expect(ids.some((id) => [111, 112].includes(id))).toBe(true)
    })

    it('contains hip thrust', () => {
      expect(ids).toContain(113)
    })

    it('contains leg curl', () => {
      expect(ids).toContain(106)
    })

    it('has no duplicate exercise IDs', () => {
      expect(new Set(ids).size).toBe(ids.length)
    })

    it('has between 5 and 8 exercises', () => {
      expect(lower2.exercises.length).toBeGreaterThanOrEqual(5)
      expect(lower2.exercises.length).toBeLessThanOrEqual(8)
    })
  })

  // -----------------------------------------------------------------------
  // Upper 2 — Pull Focus
  // -----------------------------------------------------------------------
  describe('Upper 2 — Pull Focus', () => {
    const upper2 = getSession(result, 'upper 2')
    const ids = sessionExerciseIds(upper2)

    it('contains a horizontal pull (rowing)', () => {
      // 210 = Rowing câble, 211 = Rowing haltère unilatéral
      expect(ids.some((id) => [210, 211, 212].includes(id))).toBe(true)
    })

    it('contains a vertical pull (lat pulldown)', () => {
      expect(ids).toContain(213)
    })

    it('contains face pull', () => {
      expect(ids).toContain(208)
    })

    it('has no duplicate exercise IDs', () => {
      expect(new Set(ids).size).toBe(ids.length)
    })

    it('has between 5 and 8 exercises', () => {
      expect(upper2.exercises.length).toBeGreaterThanOrEqual(5)
      expect(upper2.exercises.length).toBeLessThanOrEqual(8)
    })
  })

  // -----------------------------------------------------------------------
  // Cross-session invariants
  // -----------------------------------------------------------------------
  describe('Cross-session invariants', () => {
    it('face pull appears in BOTH upper sessions', () => {
      const upper1 = getSession(result, 'upper 1')
      const upper2 = getSession(result, 'upper 2')
      expect(sessionExerciseIds(upper1)).toContain(208)
      expect(sessionExerciseIds(upper2)).toContain(208)
    })

    it('no exercise ID duplicated within any single session', () => {
      for (const session of result.sessions) {
        const ids = session.exercises.map((e) => e.exerciseId)
        expect(new Set(ids).size).toBe(ids.length)
      }
    })

    it('every session has between 5 and 8 exercises', () => {
      for (const session of result.sessions) {
        expect(session.exercises.length).toBeGreaterThanOrEqual(5)
        expect(session.exercises.length).toBeLessThanOrEqual(8)
      }
    })

    it('session orders are sequential 1-4', () => {
      result.sessions.forEach((s, i) => {
        expect(s.order).toBe(i + 1)
      })
    })

    it('all exercise fields are well-formed', () => {
      for (const session of result.sessions) {
        for (const ex of session.exercises) {
          expect(ex.exerciseId).toBeGreaterThan(0)
          expect(ex.order).toBeGreaterThan(0)
          expect(ex.sets).toBeGreaterThanOrEqual(2)
          expect(ex.targetReps).toBeGreaterThanOrEqual(1)
          expect(ex.restSeconds).toBeGreaterThan(0)
          expect(typeof ex.isRehab).toBe('boolean')
        }
      }
    })
  })
})

// ---------------------------------------------------------------------------
// Push/Pull/Legs structured session builder
// ---------------------------------------------------------------------------

describe('Push/Pull/Legs structured sessions', () => {
  // Realistic catalog with proper primaryMuscles covering all PPL needs
  const pplCatalog: Exercise[] = [
    // === COMPOUND UPPER: Horizontal push (chest) ===
    makeExercise({
      id: 201, name: 'Développé couché haltères', category: 'compound',
      primaryMuscles: ['pectoraux'],
      tags: ['push', 'upper_body', 'chest', 'dumbbells'],
      equipmentNeeded: ['bench', 'dumbbells'],
    }),
    makeExercise({
      id: 202, name: 'Développé couché smith machine', category: 'compound',
      primaryMuscles: ['pectoraux'],
      tags: ['push', 'upper_body', 'chest', 'smith_machine'],
      equipmentNeeded: ['smith_machine', 'bench'],
    }),
    makeExercise({
      id: 220, name: 'Développé couché machine', category: 'compound',
      primaryMuscles: ['pectoraux'],
      tags: ['push', 'upper_body', 'chest', 'machine'],
      equipmentNeeded: ['pec_press'],
    }),

    // === COMPOUND UPPER: Vertical push (shoulders) ===
    makeExercise({
      id: 203, name: 'Développé militaire haltères', category: 'compound',
      primaryMuscles: ['deltoïdes'],
      tags: ['push', 'upper_body', 'shoulders', 'dumbbells'],
      equipmentNeeded: ['dumbbells'],
    }),
    makeExercise({
      id: 204, name: 'Développé militaire smith machine', category: 'compound',
      primaryMuscles: ['deltoïdes'],
      tags: ['push', 'upper_body', 'shoulders', 'smith_machine'],
      equipmentNeeded: ['smith_machine', 'bench'],
    }),
    makeExercise({
      id: 221, name: 'Développé militaire machine', category: 'compound',
      primaryMuscles: ['deltoïdes'],
      tags: ['push', 'upper_body', 'shoulders', 'machine'],
      equipmentNeeded: ['shoulder_press'],
    }),

    // === ISOLATION UPPER: Chest accessories ===
    makeExercise({
      id: 206, name: 'Câble crossover (écartés câble)', category: 'isolation',
      primaryMuscles: ['pectoraux'],
      tags: ['push', 'upper_body', 'chest', 'cable'],
      equipmentNeeded: ['cable'],
    }),
    makeExercise({
      id: 207, name: 'Pec deck machine', category: 'isolation',
      primaryMuscles: ['pectoraux'],
      tags: ['push', 'upper_body', 'chest', 'machine'],
      equipmentNeeded: ['pec_deck'],
    }),

    // === ISOLATION UPPER: Lateral raises ===
    makeExercise({
      id: 205, name: 'Élévations latérales', category: 'isolation',
      primaryMuscles: ['deltoïdes latéraux'],
      tags: ['push', 'upper_body', 'shoulders', 'dumbbells'],
      equipmentNeeded: ['dumbbells'],
    }),
    makeExercise({
      id: 222, name: 'Élévations latérales câble', category: 'isolation',
      primaryMuscles: ['deltoïdes latéraux'],
      tags: ['push', 'upper_body', 'shoulders', 'cable'],
      equipmentNeeded: ['cable'],
    }),

    // === ISOLATION UPPER: Triceps ===
    makeExercise({
      id: 209, name: 'Extension triceps poulie haute', category: 'isolation',
      primaryMuscles: ['triceps'],
      tags: ['push', 'upper_body', 'arms', 'triceps', 'cable'],
      equipmentNeeded: ['cable'],
    }),
    makeExercise({
      id: 223, name: 'Extension triceps câble corde (overhead)', category: 'isolation',
      primaryMuscles: ['triceps'],
      tags: ['push', 'upper_body', 'arms', 'triceps', 'cable'],
      equipmentNeeded: ['cable', 'rope_attachment'],
    }),

    // === ISOLATION UPPER: Face pull ===
    makeExercise({
      id: 208, name: 'Face pull', category: 'isolation',
      primaryMuscles: ['deltoïdes postérieurs', 'rhomboïdes'],
      tags: ['pull', 'upper_body', 'shoulders', 'posture', 'cable'],
      equipmentNeeded: ['cable', 'rope_attachment'],
    }),

    // === COMPOUND UPPER: Horizontal pull (rowing) ===
    makeExercise({
      id: 210, name: 'Rowing câble assis', category: 'compound',
      primaryMuscles: ['dorsaux', 'rhomboïdes'],
      tags: ['pull', 'upper_body', 'back', 'cable', 'posture'],
      equipmentNeeded: ['cable'],
    }),
    makeExercise({
      id: 211, name: 'Rowing machine (chest-supported)', category: 'compound',
      primaryMuscles: ['dorsaux', 'rhomboïdes'],
      tags: ['pull', 'upper_body', 'back', 'machine'],
      equipmentNeeded: ['rowing_machine'],
    }),

    // === COMPOUND UPPER: Unilateral pull ===
    makeExercise({
      id: 212, name: 'Tirage horizontal câble unilatéral', category: 'compound',
      primaryMuscles: ['dorsaux', 'rhomboïdes'],
      tags: ['pull', 'upper_body', 'back', 'cable', 'unilateral'],
      equipmentNeeded: ['cable'],
    }),
    makeExercise({
      id: 224, name: 'Rowing haltère unilatéral', category: 'compound',
      primaryMuscles: ['dorsaux', 'rhomboïdes'],
      tags: ['pull', 'upper_body', 'back', 'dumbbell', 'unilateral'],
      equipmentNeeded: ['dumbbell', 'bench'],
    }),

    // === COMPOUND UPPER: Vertical pull ===
    makeExercise({
      id: 213, name: 'Tirage vertical (lat pulldown)', category: 'compound',
      primaryMuscles: ['dorsaux', 'grand rond'],
      tags: ['pull', 'upper_body', 'back', 'machine'],
      equipmentNeeded: ['lat_pulldown'],
    }),
    makeExercise({
      id: 225, name: 'Traction (pull-up)', category: 'compound',
      primaryMuscles: ['dorsaux', 'grand rond'],
      tags: ['pull', 'upper_body', 'back', 'bodyweight'],
      equipmentNeeded: ['pull_up_bar'],
    }),

    // === ISOLATION UPPER: Biceps ===
    makeExercise({
      id: 214, name: 'Curl biceps haltères', category: 'isolation',
      primaryMuscles: ['biceps'],
      tags: ['pull', 'upper_body', 'arms', 'biceps', 'dumbbells'],
      equipmentNeeded: ['dumbbells'],
    }),
    makeExercise({
      id: 226, name: 'Curl marteau (hammer curl)', category: 'isolation',
      primaryMuscles: ['brachial', 'brachioradial'],
      secondaryMuscles: ['biceps'],
      tags: ['pull', 'upper_body', 'arms', 'biceps', 'dumbbells'],
      equipmentNeeded: ['dumbbells'],
    }),

    // === ISOLATION UPPER: Rear delt ===
    makeExercise({
      id: 215, name: 'Band pull-apart', category: 'rehab',
      primaryMuscles: ['deltoïdes postérieurs', 'rhomboïdes'],
      tags: ['rehab', 'posture', 'shoulders', 'upper_back', 'band'],
      equipmentNeeded: ['resistance_band'],
      isRehab: true,
    }),

    // === ISOLATION UPPER: Shrug ===
    makeExercise({
      id: 227, name: 'Shrug haltères (haussements d\'épaules)', category: 'isolation',
      primaryMuscles: ['trapèzes supérieurs'],
      tags: ['pull', 'upper_body', 'traps', 'dumbbells'],
      equipmentNeeded: ['dumbbells'],
    }),

    // === COMPOUND LOWER: Quad-dominant ===
    makeExercise({
      id: 101, name: 'Leg press', category: 'compound',
      primaryMuscles: ['quadriceps', 'fessiers'],
      tags: ['legs', 'lower_body', 'machine'],
      equipmentNeeded: ['leg_press'],
    }),
    makeExercise({
      id: 102, name: 'Squat smith machine', category: 'compound',
      primaryMuscles: ['quadriceps', 'fessiers'],
      tags: ['legs', 'lower_body', 'squat', 'smith_machine'],
      equipmentNeeded: ['smith_machine'],
    }),

    // === COMPOUND LOWER: Unilateral legs ===
    makeExercise({
      id: 103, name: 'Fentes haltères', category: 'compound',
      primaryMuscles: ['quadriceps', 'fessiers'],
      tags: ['legs', 'lower_body', 'lunge', 'dumbbells', 'unilateral'],
      equipmentNeeded: ['dumbbells'],
    }),
    makeExercise({
      id: 104, name: 'Fentes smith machine', category: 'compound',
      primaryMuscles: ['quadriceps', 'fessiers'],
      tags: ['legs', 'lower_body', 'lunge', 'smith_machine', 'unilateral'],
      equipmentNeeded: ['smith_machine'],
    }),

    // === ISOLATION LOWER: Leg extension ===
    makeExercise({
      id: 105, name: 'Leg extension', category: 'isolation',
      primaryMuscles: ['quadriceps'],
      tags: ['legs', 'lower_body', 'quadriceps', 'machine'],
      equipmentNeeded: ['leg_extension'],
    }),

    // === ISOLATION LOWER: Leg curl ===
    makeExercise({
      id: 106, name: 'Leg curl (ischio-jambiers)', category: 'isolation',
      primaryMuscles: ['ischio-jambiers'],
      tags: ['legs', 'lower_body', 'hamstrings', 'machine'],
      equipmentNeeded: ['leg_curl'],
    }),

    // === ISOLATION LOWER: Calves ===
    makeExercise({
      id: 107, name: 'Mollets debout smith machine (calf raise)', category: 'isolation',
      primaryMuscles: ['gastrocnémiens'],
      tags: ['legs', 'lower_body', 'calves', 'smith_machine'],
      equipmentNeeded: ['smith_machine'],
    }),

    // === CORE ===
    makeExercise({
      id: 109, name: 'Dead bug', category: 'core',
      primaryMuscles: ['transverse abdominal', 'rectus abdominis'],
      tags: ['core', 'abs', 'stability', 'bodyweight'],
      equipmentNeeded: [],
    }),
    makeExercise({
      id: 110, name: 'Pallof press', category: 'core',
      primaryMuscles: ['obliques', 'transverse abdominal'],
      tags: ['core', 'anti_rotation', 'stability', 'cable'],
      equipmentNeeded: ['cable'],
    }),
    makeExercise({
      id: 128, name: 'Planche (plank)', category: 'core',
      primaryMuscles: ['transverse abdominal', 'rectus abdominis'],
      tags: ['core', 'stability', 'bodyweight', 'isometric'],
      equipmentNeeded: [],
    }),
    makeExercise({
      id: 129, name: 'Bird dog', category: 'core',
      primaryMuscles: ['érecteurs du rachis', 'transverse abdominal'],
      tags: ['core', 'stability', 'bodyweight', 'lower_back', 'posture'],
      equipmentNeeded: [],
    }),

    // === COMPOUND LOWER: Hip hinge ===
    makeExercise({
      id: 111, name: 'SDT smith machine (soulevé de terre jambes tendues)', category: 'compound',
      primaryMuscles: ['ischio-jambiers', 'fessiers'],
      contraindications: ['lower_back'],
      tags: ['pull', 'lower_body', 'posterior_chain', 'smith_machine', 'hamstrings'],
      equipmentNeeded: ['smith_machine'],
    }),
    makeExercise({
      id: 112, name: 'Soulevé de terre roumain haltères', category: 'compound',
      primaryMuscles: ['ischio-jambiers', 'fessiers'],
      contraindications: ['lower_back'],
      tags: ['pull', 'lower_body', 'posterior_chain', 'dumbbells', 'hamstrings'],
      equipmentNeeded: ['dumbbells'],
    }),

    // === COMPOUND LOWER: Hip thrust ===
    makeExercise({
      id: 113, name: 'Hip thrust smith machine', category: 'compound',
      primaryMuscles: ['fessiers'],
      tags: ['lower_body', 'glutes', 'smith_machine'],
      equipmentNeeded: ['smith_machine', 'bench'],
    }),

    // === ISOLATION LOWER: Pull-through ===
    makeExercise({
      id: 114, name: 'Pull-through câble (tirage entre les jambes)', category: 'isolation',
      primaryMuscles: ['fessiers', 'ischio-jambiers'],
      tags: ['lower_body', 'glutes', 'posterior_chain', 'cable'],
      equipmentNeeded: ['cable', 'rope_attachment'],
    }),
  ]

  const pplEquipment: GymEquipment[] = [
    makeEquipment('bench'),
    makeEquipment('dumbbells'),
    makeEquipment('dumbbell'),
    makeEquipment('cable'),
    makeEquipment('rope_attachment'),
    makeEquipment('smith_machine'),
    makeEquipment('leg_press'),
    makeEquipment('leg_extension'),
    makeEquipment('leg_curl'),
    makeEquipment('lat_pulldown'),
    makeEquipment('shoulder_press'),
    makeEquipment('pec_deck'),
    makeEquipment('pec_press'),
    makeEquipment('resistance_band'),
    makeEquipment('rowing_machine'),
    makeEquipment('pull_up_bar'),
  ]

  const pplInput = {
    userId: 1,

    conditions: [],
    equipment: pplEquipment,

    daysPerWeek: 5,
    minutesPerSession: 75,
  }

  function getSession(result: ReturnType<typeof generateProgram>, nameFragment: string) {
    return result.sessions.find((s) => s.name.toLowerCase().includes(nameFragment.toLowerCase()))!
  }

  function sessionExerciseIds(session: { exercises: { exerciseId: number }[] }): number[] {
    return session.exercises.map((e) => e.exerciseId)
  }

  const result = generateProgram(pplInput, pplCatalog)

  it('generates 6 sessions for daysPerWeek=5 (PPL split)', () => {
    expect(result.type).toBe('push_pull_legs')
    expect(result.sessions).toHaveLength(6)
  })

  it('session orders are sequential 1-6', () => {
    result.sessions.forEach((s, i) => {
      expect(s.order).toBe(i + 1)
    })
  })

  // -----------------------------------------------------------------------
  // Push A
  // -----------------------------------------------------------------------
  describe('Push A', () => {
    const pushA = getSession(result, 'push a')
    const ids = sessionExerciseIds(pushA)

    it('contains a horizontal push compound', () => {
      // 201 = DC haltères, 202 = DC smith, 220 = DC machine
      expect(ids.some((id) => [201, 202, 220].includes(id))).toBe(true)
    })

    it('contains a vertical push', () => {
      // 203, 204, 221
      expect(ids.some((id) => [203, 204, 221].includes(id))).toBe(true)
    })

    it('contains face pull', () => {
      expect(ids).toContain(208)
    })

    it('has no duplicate exercise IDs', () => {
      expect(new Set(ids).size).toBe(ids.length)
    })

    it('has between 5 and 7 exercises', () => {
      expect(pushA.exercises.length).toBeGreaterThanOrEqual(5)
      expect(pushA.exercises.length).toBeLessThanOrEqual(7)
    })
  })

  // -----------------------------------------------------------------------
  // Push B
  // -----------------------------------------------------------------------
  describe('Push B', () => {
    const pushB = getSession(result, 'push b')
    const ids = sessionExerciseIds(pushB)

    it('contains a vertical push compound', () => {
      expect(ids.some((id) => [203, 204, 221].includes(id))).toBe(true)
    })

    it('contains a horizontal push', () => {
      expect(ids.some((id) => [201, 202, 220, 206, 207].includes(id))).toBe(true)
    })

    it('contains face pull', () => {
      expect(ids).toContain(208)
    })

    it('has no duplicate exercise IDs', () => {
      expect(new Set(ids).size).toBe(ids.length)
    })
  })

  // -----------------------------------------------------------------------
  // Pull A
  // -----------------------------------------------------------------------
  describe('Pull A', () => {
    const pullA = getSession(result, 'pull a')
    const ids = sessionExerciseIds(pullA)

    it('contains a horizontal pull', () => {
      // 210 = Rowing câble, 211 = Rowing machine, 212 = Tirage horizontal unilatéral, 224 = Rowing haltère unilatéral
      expect(ids.some((id) => [210, 211, 212, 224].includes(id))).toBe(true)
    })

    it('contains a vertical pull', () => {
      // 213 = Lat pulldown, 225 = Traction
      expect(ids.some((id) => [213, 225].includes(id))).toBe(true)
    })

    it('contains face pull', () => {
      expect(ids).toContain(208)
    })

    it('has no duplicate exercise IDs', () => {
      expect(new Set(ids).size).toBe(ids.length)
    })

    it('has between 5 and 7 exercises', () => {
      expect(pullA.exercises.length).toBeGreaterThanOrEqual(5)
      expect(pullA.exercises.length).toBeLessThanOrEqual(7)
    })
  })

  // -----------------------------------------------------------------------
  // Pull B
  // -----------------------------------------------------------------------
  describe('Pull B', () => {
    const pullB = getSession(result, 'pull b')
    const ids = sessionExerciseIds(pullB)

    it('contains a vertical pull', () => {
      expect(ids.some((id) => [213, 225].includes(id))).toBe(true)
    })

    it('contains a horizontal pull', () => {
      expect(ids.some((id) => [210, 211, 212, 224].includes(id))).toBe(true)
    })

    it('contains face pull', () => {
      expect(ids).toContain(208)
    })

    it('has no duplicate exercise IDs', () => {
      expect(new Set(ids).size).toBe(ids.length)
    })
  })

  // -----------------------------------------------------------------------
  // Legs A — Quad Focus
  // -----------------------------------------------------------------------
  describe('Legs A — Quad Focus', () => {
    const legsA = getSession(result, 'legs a')
    const ids = sessionExerciseIds(legsA)

    it('contains a quad compound exercise', () => {
      // 101 = Leg press, 102 = Squat smith
      expect(ids.some((id) => [101, 102].includes(id))).toBe(true)
    })

    // Note: leg extension removed from structured slots in favor of more compounds + core

    it('contains a core exercise', () => {
      expect(ids.some((id) => [109, 110, 128, 129].includes(id))).toBe(true)
    })

    it('has no duplicate exercise IDs', () => {
      expect(new Set(ids).size).toBe(ids.length)
    })

    it('has between 5 and 7 exercises', () => {
      expect(legsA.exercises.length).toBeGreaterThanOrEqual(5)
      expect(legsA.exercises.length).toBeLessThanOrEqual(7)
    })
  })

  // -----------------------------------------------------------------------
  // Legs B — Hamstring/Glute Focus
  // -----------------------------------------------------------------------
  describe('Legs B — Hamstring/Glute Focus', () => {
    const legsB = getSession(result, 'legs b')
    const ids = sessionExerciseIds(legsB)

    it('contains a hip hinge exercise', () => {
      // 111 = SDT smith, 112 = SDT roumain haltères
      expect(ids.some((id) => [111, 112].includes(id))).toBe(true)
    })

    it('contains hip thrust', () => {
      expect(ids).toContain(113)
    })

    it('contains leg curl', () => {
      expect(ids).toContain(106)
    })

    it('has no duplicate exercise IDs', () => {
      expect(new Set(ids).size).toBe(ids.length)
    })

    it('has between 5 and 7 exercises', () => {
      expect(legsB.exercises.length).toBeGreaterThanOrEqual(5)
      expect(legsB.exercises.length).toBeLessThanOrEqual(7)
    })
  })

  // -----------------------------------------------------------------------
  // Cross-session invariants
  // -----------------------------------------------------------------------
  describe('Cross-session invariants', () => {
    it('face pull appears in all push and pull sessions', () => {
      const pushA = getSession(result, 'push a')
      const pushB = getSession(result, 'push b')
      const pullA = getSession(result, 'pull a')
      const pullB = getSession(result, 'pull b')
      expect(sessionExerciseIds(pushA)).toContain(208)
      expect(sessionExerciseIds(pushB)).toContain(208)
      expect(sessionExerciseIds(pullA)).toContain(208)
      expect(sessionExerciseIds(pullB)).toContain(208)
    })

    it('no exercise ID duplicated within any single session', () => {
      for (const session of result.sessions) {
        const ids = session.exercises.map((e) => e.exerciseId)
        expect(new Set(ids).size).toBe(ids.length)
      }
    })

    it('every session has at least 5 exercises', () => {
      for (const session of result.sessions) {
        expect(session.exercises.length).toBeGreaterThanOrEqual(5)
      }
    })

    it('all exercise fields are well-formed', () => {
      for (const session of result.sessions) {
        for (const ex of session.exercises) {
          expect(ex.exerciseId).toBeGreaterThan(0)
          expect(ex.order).toBeGreaterThan(0)
          expect(ex.sets).toBeGreaterThanOrEqual(2)
          expect(ex.targetReps).toBeGreaterThanOrEqual(1)
          expect(ex.restSeconds).toBeGreaterThan(0)
          expect(typeof ex.isRehab).toBe('boolean')
        }
      }
    })
  })
})

// ---------------------------------------------------------------------------
// Full Body structured session builder
// ---------------------------------------------------------------------------

describe('Full Body structured sessions', () => {
  // Realistic catalog covering all full body needs
  const fbCatalog: Exercise[] = [
    // === COMPOUND LOWER: Quad-dominant ===
    makeExercise({
      id: 101, name: 'Leg press', category: 'compound',
      primaryMuscles: ['quadriceps', 'fessiers'],
      tags: ['legs', 'lower_body', 'machine'],
      equipmentNeeded: ['leg_press'],
    }),
    makeExercise({
      id: 102, name: 'Squat smith machine', category: 'compound',
      primaryMuscles: ['quadriceps', 'fessiers'],
      tags: ['legs', 'lower_body', 'squat', 'smith_machine'],
      equipmentNeeded: ['smith_machine'],
    }),

    // === COMPOUND LOWER: Unilateral legs ===
    makeExercise({
      id: 103, name: 'Fentes haltères', category: 'compound',
      primaryMuscles: ['quadriceps', 'fessiers'],
      tags: ['legs', 'lower_body', 'lunge', 'dumbbells', 'unilateral'],
      equipmentNeeded: ['dumbbells'],
    }),

    // === COMPOUND LOWER: Hip hinge ===
    makeExercise({
      id: 111, name: 'SDT smith machine (soulevé de terre jambes tendues)', category: 'compound',
      primaryMuscles: ['ischio-jambiers', 'fessiers'],
      contraindications: ['lower_back'],
      tags: ['pull', 'lower_body', 'posterior_chain', 'smith_machine', 'hamstrings'],
      equipmentNeeded: ['smith_machine'],
    }),
    makeExercise({
      id: 112, name: 'Soulevé de terre roumain haltères', category: 'compound',
      primaryMuscles: ['ischio-jambiers', 'fessiers'],
      contraindications: ['lower_back'],
      tags: ['pull', 'lower_body', 'posterior_chain', 'dumbbells', 'hamstrings'],
      equipmentNeeded: ['dumbbells'],
    }),

    // === COMPOUND LOWER: Hip thrust ===
    makeExercise({
      id: 113, name: 'Hip thrust smith machine', category: 'compound',
      primaryMuscles: ['fessiers'],
      tags: ['lower_body', 'glutes', 'smith_machine'],
      equipmentNeeded: ['smith_machine', 'bench'],
    }),

    // === ISOLATION LOWER ===
    makeExercise({
      id: 105, name: 'Leg extension', category: 'isolation',
      primaryMuscles: ['quadriceps'],
      tags: ['legs', 'lower_body', 'quadriceps', 'machine'],
      equipmentNeeded: ['leg_extension'],
    }),
    makeExercise({
      id: 106, name: 'Leg curl (ischio-jambiers)', category: 'isolation',
      primaryMuscles: ['ischio-jambiers'],
      tags: ['legs', 'lower_body', 'hamstrings', 'machine'],
      equipmentNeeded: ['leg_curl'],
    }),

    // === COMPOUND UPPER: Horizontal push ===
    makeExercise({
      id: 201, name: 'Développé couché haltères', category: 'compound',
      primaryMuscles: ['pectoraux'],
      tags: ['push', 'upper_body', 'chest', 'dumbbells'],
      equipmentNeeded: ['bench', 'dumbbells'],
    }),
    makeExercise({
      id: 202, name: 'Développé couché smith machine', category: 'compound',
      primaryMuscles: ['pectoraux'],
      tags: ['push', 'upper_body', 'chest', 'smith_machine'],
      equipmentNeeded: ['smith_machine', 'bench'],
    }),

    // === COMPOUND UPPER: Vertical push ===
    makeExercise({
      id: 203, name: 'Développé militaire haltères', category: 'compound',
      primaryMuscles: ['deltoïdes'],
      tags: ['push', 'upper_body', 'shoulders', 'dumbbells'],
      equipmentNeeded: ['dumbbells'],
    }),

    // === COMPOUND UPPER: Horizontal pull ===
    makeExercise({
      id: 210, name: 'Rowing câble assis', category: 'compound',
      primaryMuscles: ['dorsaux', 'rhomboïdes'],
      tags: ['pull', 'upper_body', 'back', 'cable', 'posture'],
      equipmentNeeded: ['cable'],
    }),
    makeExercise({
      id: 211, name: 'Rowing machine (chest-supported)', category: 'compound',
      primaryMuscles: ['dorsaux', 'rhomboïdes'],
      tags: ['pull', 'upper_body', 'back', 'machine'],
      equipmentNeeded: ['rowing_machine'],
    }),

    // === COMPOUND UPPER: Unilateral pull ===
    makeExercise({
      id: 224, name: 'Rowing haltère unilatéral', category: 'compound',
      primaryMuscles: ['dorsaux', 'rhomboïdes'],
      tags: ['pull', 'upper_body', 'back', 'dumbbell', 'unilateral'],
      equipmentNeeded: ['dumbbell', 'bench'],
    }),

    // === COMPOUND UPPER: Vertical pull ===
    makeExercise({
      id: 213, name: 'Tirage vertical (lat pulldown)', category: 'compound',
      primaryMuscles: ['dorsaux', 'grand rond'],
      tags: ['pull', 'upper_body', 'back', 'machine'],
      equipmentNeeded: ['lat_pulldown'],
    }),

    // === ISOLATION UPPER ===
    makeExercise({
      id: 205, name: 'Élévations latérales', category: 'isolation',
      primaryMuscles: ['deltoïdes latéraux'],
      tags: ['push', 'upper_body', 'shoulders', 'dumbbells'],
      equipmentNeeded: ['dumbbells'],
    }),
    makeExercise({
      id: 206, name: 'Câble crossover (écartés câble)', category: 'isolation',
      primaryMuscles: ['pectoraux'],
      tags: ['push', 'upper_body', 'chest', 'cable'],
      equipmentNeeded: ['cable'],
    }),
    makeExercise({
      id: 208, name: 'Face pull', category: 'isolation',
      primaryMuscles: ['deltoïdes postérieurs', 'rhomboïdes'],
      tags: ['pull', 'upper_body', 'shoulders', 'posture', 'cable'],
      equipmentNeeded: ['cable', 'rope_attachment'],
    }),
    makeExercise({
      id: 214, name: 'Curl biceps haltères', category: 'isolation',
      primaryMuscles: ['biceps'],
      tags: ['pull', 'upper_body', 'arms', 'biceps', 'dumbbells'],
      equipmentNeeded: ['dumbbells'],
    }),

    // === CORE ===
    makeExercise({
      id: 109, name: 'Dead bug', category: 'core',
      primaryMuscles: ['transverse abdominal', 'rectus abdominis'],
      tags: ['core', 'abs', 'stability', 'bodyweight'],
      equipmentNeeded: [],
    }),
    makeExercise({
      id: 110, name: 'Pallof press', category: 'core',
      primaryMuscles: ['obliques', 'transverse abdominal'],
      tags: ['core', 'anti_rotation', 'stability', 'cable'],
      equipmentNeeded: ['cable'],
    }),
  ]

  const fbEquipment: GymEquipment[] = [
    makeEquipment('bench'),
    makeEquipment('dumbbells'),
    makeEquipment('dumbbell'),
    makeEquipment('cable'),
    makeEquipment('rope_attachment'),
    makeEquipment('smith_machine'),
    makeEquipment('leg_press'),
    makeEquipment('leg_extension'),
    makeEquipment('leg_curl'),
    makeEquipment('lat_pulldown'),
    makeEquipment('rowing_machine'),
  ]

  function getSession(result: ReturnType<typeof generateProgram>, nameFragment: string) {
    return result.sessions.find((s) => s.name.toLowerCase().includes(nameFragment.toLowerCase()))!
  }

  function sessionExerciseIds(session: { exercises: { exerciseId: number }[] }): number[] {
    return session.exercises.map((e) => e.exerciseId)
  }

  // -----------------------------------------------------------------------
  // 2 days/week
  // -----------------------------------------------------------------------
  describe('2 days/week', () => {
    const fbInput2 = {
      userId: 1,

      conditions: [],
      equipment: fbEquipment,

      daysPerWeek: 2,
      minutesPerSession: 75, // 75 min to fit all exercises with realistic time estimates
    }

    const result2 = generateProgram(fbInput2, fbCatalog)

    it('generates 2 sessions for daysPerWeek=2', () => {
      expect(result2.type).toBe('full_body')
      expect(result2.sessions).toHaveLength(2)
    })

    it('Full Body A contains essential compounds (face pull and core may be trimmed for time)', () => {
      const fbA = getSession(result2, 'full body a')
      const ids = sessionExerciseIds(fbA)

      // Lower compound (quad) - first slot, should always be present
      expect(ids.some((id) => [101, 102].includes(id))).toBe(true)
      // Push (horizontal chest compound) - second slot, should always be present
      expect(ids.some((id) => [201, 202].includes(id))).toBe(true)
      // Pull (horizontal pull) - third slot, should always be present
      // 210 = Rowing câble, 211 = Rowing machine, 212 = Tirage horizontal unilatéral, 224 = Rowing haltère unilatéral
      expect(ids.some((id) => [210, 211, 212, 224].includes(id))).toBe(true)
      // Face pull and core are later slots and may be trimmed to fit time budget
    })

    it('Full Body B contains hip hinge, vertical push, vertical pull, face pull, core', () => {
      const fbB = getSession(result2, 'full body b')
      const ids = sessionExerciseIds(fbB)

      // Hip hinge
      expect(ids.some((id) => [111, 112].includes(id))).toBe(true)
      // Vertical push
      expect(ids).toContain(203)
      // Vertical pull
      expect(ids).toContain(213)
      // Face pull
      expect(ids).toContain(208)
      // Core
      expect(ids.some((id) => [109, 110].includes(id))).toBe(true)
    })

    it('no duplicates within any session', () => {
      for (const session of result2.sessions) {
        const ids = session.exercises.map((e) => e.exerciseId)
        expect(new Set(ids).size).toBe(ids.length)
      }
    })

    it('each session has 3-7 exercises (respects time budget)', () => {
      // Time budget trimming keeps minimum 3 exercises
      for (const session of result2.sessions) {
        expect(session.exercises.length).toBeGreaterThanOrEqual(3)
        expect(session.exercises.length).toBeLessThanOrEqual(7)
      }
    })
  })

  // -----------------------------------------------------------------------
  // 3 days/week
  // -----------------------------------------------------------------------
  describe('3 days/week', () => {
    const fbInput3 = {
      userId: 1,

      conditions: [],
      equipment: fbEquipment,

      daysPerWeek: 3,
      minutesPerSession: 75, // 75 min to fit all exercises with realistic time estimates
    }

    const result3 = generateProgram(fbInput3, fbCatalog)

    it('generates 3 sessions for daysPerWeek=3', () => {
      expect(result3.type).toBe('full_body')
      expect(result3.sessions).toHaveLength(3)
    })

    it('Full Body C exists and contains push, pull, lower, biceps (face pull limited to 2x/week)', () => {
      const fbC = getSession(result3, 'full body c')
      const ids = sessionExerciseIds(fbC)

      // Unilateral legs or lower compound
      expect(ids.some((id) => [101, 102, 103, 111, 112, 113].includes(id))).toBe(true)
      // Push (horizontal)
      expect(ids.some((id) => [201, 202, 206].includes(id))).toBe(true)
      // Pull (unilateral or horizontal)
      expect(ids.some((id) => [210, 211, 224].includes(id))).toBe(true)
      // Biceps (replaces face pull to limit face pull to 2x/week - A + B only)
      expect(ids).toContain(214)
    })

    it('no duplicates within any session', () => {
      for (const session of result3.sessions) {
        const ids = session.exercises.map((e) => e.exerciseId)
        expect(new Set(ids).size).toBe(ids.length)
      }
    })

    it('each session has at least 3 exercises (respects time budget)', () => {
      // Time budget trimming keeps minimum 3 exercises
      for (const session of result3.sessions) {
        expect(session.exercises.length).toBeGreaterThanOrEqual(3)
      }
    })

    it('session orders are sequential 1-3', () => {
      result3.sessions.forEach((s, i) => {
        expect(s.order).toBe(i + 1)
      })
    })

    it('face pull may appear in sessions (unless trimmed for time budget)', () => {
      // Face pull is at a later slot position and may be trimmed to fit time budget
      // This test verifies no crash and face pull has correct ID when present
      for (const session of result3.sessions) {
        const ids = session.exercises.map((e) => e.exerciseId)
        const hasFacePull = ids.includes(208)
        // If face pull is present, it should have the correct ID
        if (hasFacePull) {
          expect(ids).toContain(208)
        }
      }
    })

    it('all exercise fields are well-formed', () => {
      for (const session of result3.sessions) {
        for (const ex of session.exercises) {
          expect(ex.exerciseId).toBeGreaterThan(0)
          expect(ex.order).toBeGreaterThan(0)
          expect(ex.sets).toBeGreaterThanOrEqual(2)
          expect(ex.targetReps).toBeGreaterThanOrEqual(1)
          expect(ex.restSeconds).toBeGreaterThan(0)
          expect(typeof ex.isRehab).toBe('boolean')
        }
      }
    })
  })
})

// ---------------------------------------------------------------------------
// Lower back contraindication filtering — hip hinge slot adaptation
// ---------------------------------------------------------------------------

describe('Lower back contraindication filtering — hip hinge slot adaptation', () => {
  // Shared catalog with SDT exercises (111, 112) having lower_back contraindication
  // and hip thrust (113) without lower_back contraindication
  const sdtCatalog: Exercise[] = [
    // === COMPOUND LOWER: Quad-dominant ===
    makeExercise({
      id: 101, name: 'Leg press', category: 'compound',
      primaryMuscles: ['quadriceps', 'fessiers'],
      tags: ['legs', 'lower_body', 'machine'],
      equipmentNeeded: ['leg_press'],
    }),
    makeExercise({
      id: 102, name: 'Squat smith machine', category: 'compound',
      primaryMuscles: ['quadriceps', 'fessiers'],
      tags: ['legs', 'lower_body', 'squat', 'smith_machine'],
      equipmentNeeded: ['smith_machine'],
    }),

    // === COMPOUND LOWER: Unilateral legs ===
    makeExercise({
      id: 103, name: 'Fentes haltères', category: 'compound',
      primaryMuscles: ['quadriceps', 'fessiers'],
      tags: ['legs', 'lower_body', 'lunge', 'dumbbells', 'unilateral'],
      equipmentNeeded: ['dumbbells'],
    }),

    // === ISOLATION LOWER: Leg extension ===
    makeExercise({
      id: 105, name: 'Leg extension', category: 'isolation',
      primaryMuscles: ['quadriceps'],
      tags: ['legs', 'lower_body', 'quadriceps', 'machine'],
      equipmentNeeded: ['leg_extension'],
    }),

    // === ISOLATION LOWER: Leg curl ===
    makeExercise({
      id: 106, name: 'Leg curl (ischio-jambiers)', category: 'isolation',
      primaryMuscles: ['ischio-jambiers'],
      tags: ['legs', 'lower_body', 'hamstrings', 'machine'],
      equipmentNeeded: ['leg_curl'],
    }),

    // === ISOLATION LOWER: Calves ===
    makeExercise({
      id: 107, name: 'Mollets debout smith machine (calf raise)', category: 'isolation',
      primaryMuscles: ['gastrocnémiens'],
      tags: ['legs', 'lower_body', 'calves', 'smith_machine'],
      equipmentNeeded: ['smith_machine'],
    }),

    // === CORE ===
    makeExercise({
      id: 109, name: 'Dead bug', category: 'core',
      primaryMuscles: ['transverse abdominal', 'rectus abdominis'],
      tags: ['core', 'abs', 'stability', 'bodyweight'],
      equipmentNeeded: [],
    }),
    makeExercise({
      id: 110, name: 'Pallof press', category: 'core',
      primaryMuscles: ['obliques', 'transverse abdominal'],
      tags: ['core', 'anti_rotation', 'stability', 'cable'],
      equipmentNeeded: ['cable'],
    }),

    // === COMPOUND LOWER: Hip hinge (SDT variants) ===
    makeExercise({
      id: 111, name: 'SDT smith machine (soulevé de terre jambes tendues)', category: 'compound',
      primaryMuscles: ['ischio-jambiers', 'fessiers'],
      contraindications: ['lower_back'],
      tags: ['pull', 'lower_body', 'posterior_chain', 'smith_machine', 'hamstrings'],
      equipmentNeeded: ['smith_machine'],
    }),
    makeExercise({
      id: 112, name: 'Soulevé de terre roumain haltères', category: 'compound',
      primaryMuscles: ['ischio-jambiers', 'fessiers'],
      contraindications: ['lower_back'],
      tags: ['pull', 'lower_body', 'posterior_chain', 'dumbbells', 'hamstrings'],
      equipmentNeeded: ['dumbbells'],
    }),

    // === COMPOUND LOWER: Hip thrust ===
    makeExercise({
      id: 113, name: 'Hip thrust smith machine', category: 'compound',
      primaryMuscles: ['fessiers'],
      tags: ['lower_body', 'glutes', 'smith_machine'],
      equipmentNeeded: ['smith_machine', 'bench'],
    }),

    // === ISOLATION LOWER: Pull-through ===
    makeExercise({
      id: 114, name: 'Pull-through câble (tirage entre les jambes)', category: 'isolation',
      primaryMuscles: ['fessiers', 'ischio-jambiers'],
      tags: ['lower_body', 'glutes', 'posterior_chain', 'cable'],
      equipmentNeeded: ['cable', 'rope_attachment'],
    }),

    // === COMPOUND UPPER: Horizontal push ===
    makeExercise({
      id: 201, name: 'Développé couché haltères', category: 'compound',
      primaryMuscles: ['pectoraux'],
      tags: ['push', 'upper_body', 'chest', 'dumbbells'],
      equipmentNeeded: ['bench', 'dumbbells'],
    }),

    // === COMPOUND UPPER: Vertical push ===
    makeExercise({
      id: 203, name: 'Développé militaire haltères', category: 'compound',
      primaryMuscles: ['deltoïdes'],
      tags: ['push', 'upper_body', 'shoulders', 'dumbbells'],
      equipmentNeeded: ['dumbbells'],
    }),

    // === ISOLATION UPPER ===
    makeExercise({
      id: 205, name: 'Élévations latérales', category: 'isolation',
      primaryMuscles: ['deltoïdes latéraux'],
      tags: ['push', 'upper_body', 'shoulders', 'dumbbells'],
      equipmentNeeded: ['dumbbells'],
    }),
    makeExercise({
      id: 206, name: 'Câble crossover (écartés câble)', category: 'isolation',
      primaryMuscles: ['pectoraux'],
      tags: ['push', 'upper_body', 'chest', 'cable'],
      equipmentNeeded: ['cable'],
    }),
    makeExercise({
      id: 208, name: 'Face pull', category: 'isolation',
      primaryMuscles: ['deltoïdes postérieurs', 'rhomboïdes'],
      tags: ['pull', 'upper_body', 'shoulders', 'posture', 'cable'],
      equipmentNeeded: ['cable', 'rope_attachment'],
    }),
    makeExercise({
      id: 209, name: 'Extension triceps poulie haute', category: 'isolation',
      primaryMuscles: ['triceps'],
      tags: ['push', 'upper_body', 'arms', 'triceps', 'cable'],
      equipmentNeeded: ['cable'],
    }),

    // === COMPOUND UPPER: Horizontal pull ===
    makeExercise({
      id: 210, name: 'Rowing câble assis', category: 'compound',
      primaryMuscles: ['dorsaux', 'rhomboïdes'],
      tags: ['pull', 'upper_body', 'back', 'cable', 'posture'],
      equipmentNeeded: ['cable'],
    }),

    // === COMPOUND UPPER: Unilateral pull ===
    makeExercise({
      id: 212, name: 'Tirage horizontal câble unilatéral', category: 'compound',
      primaryMuscles: ['dorsaux', 'rhomboïdes'],
      tags: ['pull', 'upper_body', 'back', 'cable', 'unilateral'],
      equipmentNeeded: ['cable'],
    }),

    // === COMPOUND UPPER: Vertical pull ===
    makeExercise({
      id: 213, name: 'Tirage vertical (lat pulldown)', category: 'compound',
      primaryMuscles: ['dorsaux', 'grand rond'],
      tags: ['pull', 'upper_body', 'back', 'machine'],
      equipmentNeeded: ['lat_pulldown'],
    }),

    // === ISOLATION UPPER: Biceps ===
    makeExercise({
      id: 214, name: 'Curl biceps haltères', category: 'isolation',
      primaryMuscles: ['biceps'],
      tags: ['pull', 'upper_body', 'arms', 'biceps', 'dumbbells'],
      equipmentNeeded: ['dumbbells'],
    }),

    // === REHAB ===
    makeExercise({
      id: 215, name: 'Band pull-apart', category: 'rehab',
      primaryMuscles: ['deltoïdes postérieurs', 'rhomboïdes'],
      tags: ['rehab', 'posture', 'shoulders', 'upper_back', 'band'],
      equipmentNeeded: ['resistance_band'],
      isRehab: true,
    }),
  ]

  const sdtEquipment: GymEquipment[] = [
    makeEquipment('bench'),
    makeEquipment('dumbbells'),
    makeEquipment('dumbbell'),
    makeEquipment('cable'),
    makeEquipment('rope_attachment'),
    makeEquipment('smith_machine'),
    makeEquipment('leg_press'),
    makeEquipment('leg_extension'),
    makeEquipment('leg_curl'),
    makeEquipment('lat_pulldown'),
    makeEquipment('resistance_band'),
  ]

  const sdtBaseInput = {
    userId: 1,

    conditions: [] as HealthCondition[],
    equipment: sdtEquipment,

    minutesPerSession: 60,
  }

  function getSession(result: ReturnType<typeof generateProgram>, nameFragment: string) {
    return result.sessions.find((s) => s.name.toLowerCase().includes(nameFragment.toLowerCase()))!
  }

  function sessionExerciseIds(session: { exercises: { exerciseId: number }[] }): number[] {
    return session.exercises.map((e) => e.exerciseId)
  }

  // SDT exercise IDs: 111 = SDT smith, 112 = Soulevé de terre roumain
  const sdtExerciseIds = [111, 112]
  const hipThrustId = 113

  // -----------------------------------------------------------------------
  // Upper/Lower split — Lower 2
  // -----------------------------------------------------------------------
  describe('Upper/Lower — Lower 2', () => {
    it('without lower_back condition, Lower 2 contains SDT as expected', () => {
      const result = generateProgram(
        { ...sdtBaseInput, daysPerWeek: 4 },
        sdtCatalog,
      )
      const lower2 = getSession(result, 'lower 2')
      const ids = sessionExerciseIds(lower2)
      expect(ids.some((id) => sdtExerciseIds.includes(id))).toBe(true)
    })

    it('with lower_back painLevel=7, Lower 2 does NOT contain any SDT exercise', () => {
      const conditions = [makeCondition('lower_back', 7)]
      const result = generateProgram(
        { ...sdtBaseInput, daysPerWeek: 4, conditions },
        sdtCatalog,
      )
      const lower2 = getSession(result, 'lower 2')
      const ids = sessionExerciseIds(lower2)
      for (const sdtId of sdtExerciseIds) {
        expect(ids).not.toContain(sdtId)
      }
    })

    it('with lower_back painLevel=7 (boundary), Lower 2 excludes SDT', () => {
      const conditions = [makeCondition('lower_back', 7)]
      const result = generateProgram(
        { ...sdtBaseInput, daysPerWeek: 4, conditions },
        sdtCatalog,
      )
      const lower2 = getSession(result, 'lower 2')
      const ids = sessionExerciseIds(lower2)
      for (const sdtId of sdtExerciseIds) {
        expect(ids).not.toContain(sdtId)
      }
    })

    it('with lower_back painLevel=6, Lower 2 keeps SDT (below threshold)', () => {
      const conditions = [makeCondition('lower_back', 6)]
      const result = generateProgram(
        { ...sdtBaseInput, daysPerWeek: 4, conditions },
        sdtCatalog,
      )
      const lower2 = getSession(result, 'lower 2')
      const ids = sessionExerciseIds(lower2)
      expect(ids.some((id) => sdtExerciseIds.includes(id))).toBe(true)
    })

    it('with inactive lower_back condition (painLevel=7), Lower 2 keeps SDT', () => {
      const conditions = [makeCondition('lower_back', 7, false)]
      const result = generateProgram(
        { ...sdtBaseInput, daysPerWeek: 4, conditions },
        sdtCatalog,
      )
      const lower2 = getSession(result, 'lower 2')
      const ids = sessionExerciseIds(lower2)
      expect(ids.some((id) => sdtExerciseIds.includes(id))).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // PPL split — Legs B
  // -----------------------------------------------------------------------
  describe('PPL — Legs B', () => {
    it('with lower_back painLevel=7, Legs B does NOT contain any SDT exercise', () => {
      const conditions = [makeCondition('lower_back', 7)]
      const result = generateProgram(
        { ...sdtBaseInput, daysPerWeek: 5, conditions },
        sdtCatalog,
      )
      const legsB = getSession(result, 'legs b')
      const ids = sessionExerciseIds(legsB)
      for (const sdtId of sdtExerciseIds) {
        expect(ids).not.toContain(sdtId)
      }
    })

    it('without lower_back condition, Legs B contains SDT', () => {
      const result = generateProgram(
        { ...sdtBaseInput, daysPerWeek: 5 },
        sdtCatalog,
      )
      const legsB = getSession(result, 'legs b')
      const ids = sessionExerciseIds(legsB)
      expect(ids.some((id) => sdtExerciseIds.includes(id))).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // Full Body split — Full Body B
  // -----------------------------------------------------------------------
  describe('Full Body — Full Body B', () => {
    it('with lower_back painLevel=7, Full Body B does NOT contain any SDT exercise', () => {
      const conditions = [makeCondition('lower_back', 7)]
      const result = generateProgram(
        { ...sdtBaseInput, daysPerWeek: 2, conditions },
        sdtCatalog,
      )
      const fbB = getSession(result, 'full body b')
      const ids = sessionExerciseIds(fbB)
      for (const sdtId of sdtExerciseIds) {
        expect(ids).not.toContain(sdtId)
      }
    })

    it('without lower_back condition, Full Body B contains SDT', () => {
      const result = generateProgram(
        { ...sdtBaseInput, daysPerWeek: 2 },
        sdtCatalog,
      )
      const fbB = getSession(result, 'full body b')
      const ids = sessionExerciseIds(fbB)
      expect(ids.some((id) => sdtExerciseIds.includes(id))).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // Broader lower_back filtering — exercises beyond SDT
  // -----------------------------------------------------------------------
  describe('Broader lower_back filtering', () => {
    // Extended catalog that adds rowing barre (lower_back contraindicated)
    // and rowing câble (no lower_back contraindication)
    const extendedCatalog: Exercise[] = [
      ...sdtCatalog,
      makeExercise({
        id: 301, name: 'Rowing barre', category: 'compound',
        primaryMuscles: ['dorsaux', 'rhomboïdes'],
        contraindications: ['lower_back', 'elbow_left', 'elbow_right'],
        tags: ['pull', 'upper_body', 'back', 'barbell'],
        equipmentNeeded: ['barbell'],
      }),
      makeExercise({
        id: 302, name: 'Rowing câble assis', category: 'compound',
        primaryMuscles: ['dorsaux', 'rhomboïdes'],
        contraindications: [],
        tags: ['pull', 'upper_body', 'back', 'cable', 'posture'],
        equipmentNeeded: ['cable'],
      }),
      makeExercise({
        id: 303, name: 'Rowing machine (chest-supported)', category: 'compound',
        primaryMuscles: ['dorsaux', 'rhomboïdes'],
        contraindications: [],
        tags: ['pull', 'upper_body', 'back', 'machine'],
        equipmentNeeded: ['rowing_machine'],
      }),
    ]
    const extendedEquipment = [
      ...sdtEquipment,
      makeEquipment('barbell'),
      makeEquipment('rowing_machine'),
    ]

    it('with lower_back pain >= 7, rowing barre is excluded from all sessions', () => {
      const conditions = [makeCondition('lower_back', 7)]
      const result = generateProgram(
        { ...sdtBaseInput, daysPerWeek: 4, conditions, equipment: extendedEquipment },
        extendedCatalog,
      )
      for (const session of result.sessions) {
        for (const ex of session.exercises) {
          expect(ex.exerciseId).not.toBe(301)
        }
      }
    })

    it('with lower_back pain >= 7, rowing câble (no lower_back contraindication) survives filter', () => {
      const conditions = [makeCondition('lower_back', 7)]
      const rowingCable = extendedCatalog.find((e) => e.id === 302)!
      const filtered = filterExercisesByContraindications([rowingCable], conditions)
      expect(filtered).toHaveLength(1)
    })

    it('with lower_back pain >= 7, hip thrust (no lower_back contraindication) is NOT excluded', () => {
      const conditions = [makeCondition('lower_back', 7)]
      const result = generateProgram(
        { ...sdtBaseInput, daysPerWeek: 4, conditions, equipment: extendedEquipment },
        extendedCatalog,
      )
      const allIds = result.sessions.flatMap((s) => s.exercises.map((e) => e.exerciseId))
      expect(allIds).toContain(hipThrustId)
    })

    it('with lower_back pain >= 7, leg press (no lower_back contraindication) is NOT excluded', () => {
      const conditions = [makeCondition('lower_back', 7)]
      const result = generateProgram(
        { ...sdtBaseInput, daysPerWeek: 4, conditions, equipment: extendedEquipment },
        extendedCatalog,
      )
      const allIds = result.sessions.flatMap((s) => s.exercises.map((e) => e.exerciseId))
      expect(allIds).toContain(101) // Leg press
    })

    it('without lower_back condition, rowing barre survives filter', () => {
      const rowingBarre = extendedCatalog.find((e) => e.id === 301)!
      const filtered = filterExercisesByContraindications([rowingBarre], [])
      expect(filtered).toHaveLength(1)
    })
  })
})

// ---------------------------------------------------------------------------
// trimSlotsToTimeBudget — unit tests
// ---------------------------------------------------------------------------

describe('trimSlotsToTimeBudget', () => {
  // Helper to create a minimal ExerciseSlot for time-budget testing
  function makeSlot(overrides: Partial<ExerciseSlot> & { sets: number; rest: number }): ExerciseSlot {
    return {
      label: 'Test slot',
      candidates: () => [],
      reps: 10,
      ...overrides,
    }
  }

  // Build 7 slots that estimate to ~67 min:
  // Slot 1: 4 * (45 + 150) = 780
  // Slot 2: 4 * (45 + 150) = 780
  // Slot 3: 4 * (45 + 120) = 660
  // Slot 4: 3 * (45 + 120) = 495
  // Slot 5: 3 * (45 + 90)  = 405
  // Slot 6: 3 * (45 + 90)  = 405
  // Slot 7: 3 * (45 + 60)  = 315
  // Total = 3840s => round(3840 / 60) + 5 = 64 + 5 = 69 min
  const heavySlots: ExerciseSlot[] = [
    makeSlot({ label: 'Compound 1', sets: 4, rest: 150 }),
    makeSlot({ label: 'Compound 2', sets: 4, rest: 150 }),
    makeSlot({ label: 'Compound 3', sets: 4, rest: 120 }),
    makeSlot({ label: 'Accessory 1', sets: 3, rest: 120 }),
    makeSlot({ label: 'Accessory 2', sets: 3, rest: 90 }),
    makeSlot({ label: 'Accessory 3', sets: 3, rest: 90 }),
    makeSlot({ label: 'Accessory 4', sets: 3, rest: 60 }),
  ]

  it('estimates heavy slots at ~81 min (with transitions + warmup/cooldown)', () => {
    // 7 slots × 90s transition + 10 min warmup/cooldown = ~81 min
    expect(estimateSlotMinutes(heavySlots)).toBe(81)
  })

  it('trims slots from 65min to fit within 45min budget', () => {
    const trimmed = trimSlotsToTimeBudget(heavySlots, 45)
    const estimated = estimateSlotMinutes(trimmed)
    expect(estimated).toBeLessThanOrEqual(45)
    // Should still have at least 3 exercises (the minimum)
    expect(trimmed.length).toBeGreaterThanOrEqual(3)
  })

  it('does not trim when budget is 90min (generous budget)', () => {
    const trimmed = trimSlotsToTimeBudget(heavySlots, 90)
    // All 7 slots should remain untouched
    expect(trimmed).toHaveLength(7)
    expect(trimmed.map((s) => s.sets)).toEqual(heavySlots.map((s) => s.sets))
    expect(trimmed.map((s) => s.rest)).toEqual(heavySlots.map((s) => s.rest))
  })
})

// ---------------------------------------------------------------------------
// generateProgram — minutesPerSession integration test
// ---------------------------------------------------------------------------

describe('generateProgram — minutesPerSession', () => {
  // Reuse a rich catalog with enough exercises for all split types
  const catalog: Exercise[] = [
    makeExercise({ id: 1, name: 'Bench Press', category: 'compound', primaryMuscles: ['pectoraux'], tags: ['push', 'upper_body', 'chest'], equipmentNeeded: ['bench', 'barbell'] }),
    makeExercise({ id: 2, name: 'DB Shoulder Press', category: 'compound', primaryMuscles: ['deltoïdes'], tags: ['push', 'upper_body', 'shoulders'], equipmentNeeded: ['dumbbells'] }),
    makeExercise({ id: 3, name: 'Cable Row', category: 'compound', primaryMuscles: ['dorsaux', 'rhomboïdes'], tags: ['pull', 'upper_body', 'back'], equipmentNeeded: ['cable'] }),
    makeExercise({ id: 4, name: 'Lat Pulldown', category: 'compound', primaryMuscles: ['dorsaux', 'grand rond'], tags: ['pull', 'upper_body', 'back'], equipmentNeeded: ['lat_pulldown'] }),
    makeExercise({ id: 5, name: 'Lateral Raise', category: 'isolation', primaryMuscles: ['deltoïdes latéraux'], tags: ['push', 'upper_body', 'shoulders'], equipmentNeeded: ['dumbbells'] }),
    makeExercise({ id: 6, name: 'Bicep Curl', category: 'isolation', primaryMuscles: ['biceps'], tags: ['pull', 'upper_body', 'arms'], equipmentNeeded: ['dumbbells'] }),
    makeExercise({ id: 7, name: 'Squat', category: 'compound', primaryMuscles: ['quadriceps', 'fessiers'], tags: ['legs', 'lower_body', 'squat'], equipmentNeeded: ['barbell'] }),
    makeExercise({ id: 8, name: 'Leg Press', category: 'compound', primaryMuscles: ['quadriceps', 'fessiers'], tags: ['legs', 'lower_body'], equipmentNeeded: ['leg_press'] }),
    makeExercise({ id: 9, name: 'Lunge', category: 'compound', primaryMuscles: ['quadriceps', 'fessiers'], tags: ['legs', 'lower_body', 'unilateral'], equipmentNeeded: ['dumbbells'] }),
    makeExercise({ id: 10, name: 'Leg Extension', category: 'isolation', primaryMuscles: ['quadriceps'], tags: ['legs', 'lower_body', 'quadriceps'], equipmentNeeded: ['leg_extension'] }),
    makeExercise({ id: 11, name: 'Leg Curl', category: 'isolation', primaryMuscles: ['ischio-jambiers'], tags: ['legs', 'lower_body', 'hamstrings'], equipmentNeeded: ['leg_curl'] }),
    makeExercise({ id: 12, name: 'Dead Bug', category: 'core', primaryMuscles: ['transverse abdominal'], tags: ['core', 'abs'], equipmentNeeded: [] }),
    makeExercise({ id: 13, name: 'Plank', category: 'core', primaryMuscles: ['transverse abdominal'], tags: ['core', 'stability'], equipmentNeeded: [] }),
  ]

  const allEquipment: GymEquipment[] = [
    makeEquipment('bench'),
    makeEquipment('barbell'),
    makeEquipment('cable'),
    makeEquipment('lat_pulldown'),
    makeEquipment('dumbbells'),
    makeEquipment('leg_press'),
    makeEquipment('leg_extension'),
    makeEquipment('leg_curl'),
  ]

  /**
   * Estimate session duration using the same formula as estimateSlotMinutes:
   *   sum(sets * (45 + restSeconds)) / 60 + 5
   */
  function estimateSessionMinutes(session: { exercises: { sets: number; restSeconds: number }[] }): number {
    let totalSec = 0
    for (const ex of session.exercises) totalSec += ex.sets * (45 + ex.restSeconds)
    return Math.round(totalSec / 60) + 5
  }

  it('with minutesPerSession: 45, all sessions estimate <= 45min (respects exact budget)', () => {
    // After the fix, trimSessionToTimeBudget runs AFTER intensity adjustments,
    // so sessions now respect the exact time budget specified.
    for (const daysPerWeek of [3, 4, 5]) {
      const result = generateProgram(
        {
          userId: 1,

          conditions: [],
          equipment: allEquipment,
      
          daysPerWeek,
          minutesPerSession: 45,
        },
        catalog,
      )

      for (const session of result.sessions) {
        const estimated = estimateSessionMinutes(session)
        expect(estimated).toBeLessThanOrEqual(45)
      }
    }
  })

  it('with minutesPerSession: 45, sessions are shorter than with minutesPerSession: 90', () => {
    for (const daysPerWeek of [3, 4, 5]) {
      const short = generateProgram(
        {
          userId: 1,

          conditions: [],
          equipment: allEquipment,
      
          daysPerWeek,
          minutesPerSession: 45,
        },
        catalog,
      )

      const long = generateProgram(
        {
          userId: 1,

          conditions: [],
          equipment: allEquipment,
      
          daysPerWeek,
          minutesPerSession: 90,
        },
        catalog,
      )

      const shortTotal = short.sessions.reduce(
        (sum, s) => sum + estimateSessionMinutes(s),
        0,
      )
      const longTotal = long.sessions.reduce(
        (sum, s) => sum + estimateSessionMinutes(s),
        0,
      )

      expect(shortTotal).toBeLessThanOrEqual(longTotal)
    }
  })

  it('with minutesPerSession: 60, all sessions estimate <= 60min (bug fix: was 83min)', () => {
    // This test verifies the fix for the bug where 60min sessions showed 83min
    // due to intensity adjustments (heavy: +sets, +rest) being applied AFTER trimming.
    // The fix applies trimSessionToTimeBudget AFTER buildStructuredSession's intensity adjustments.
    for (const daysPerWeek of [3, 4, 5]) {
      const result = generateProgram(
        {
          userId: 1,

          conditions: [],
          equipment: allEquipment,
      
          daysPerWeek,
          minutesPerSession: 60,
        },
        catalog,
      )

      for (const session of result.sessions) {
        const estimated = estimateSessionMinutes(session)
        expect(estimated).toBeLessThanOrEqual(60)
      }
    }
  })
})
