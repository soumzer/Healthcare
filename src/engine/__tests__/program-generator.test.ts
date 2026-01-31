import { describe, it, expect } from 'vitest'
import {
  filterExercisesByEquipment,
  filterExercisesByContraindications,
  determineSplit,
  generateProgram,
} from '../program-generator'
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

  it('excludes exercise when zone has painLevel >= 3', () => {
    const conditions = [makeCondition('shoulder_left', 5)]
    const result = filterExercisesByContraindications(
      [shoulderExercise, safeExercise],
      conditions,
    )
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Dead Bug')
  })

  it('allows exercise when zone painLevel < 3 (mild pain)', () => {
    const conditions = [makeCondition('shoulder_left', 2)]
    const result = filterExercisesByContraindications(
      [shoulderExercise, safeExercise],
      conditions,
    )
    // Both should pass because painLevel < 3
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

  it('handles exact boundary: painLevel 3 excludes', () => {
    const conditions = [makeCondition('knee_right', 3)]
    const result = filterExercisesByContraindications(
      [kneeExercise, safeExercise],
      conditions,
    )
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Dead Bug')
  })

  it('handles exact boundary: painLevel 2 allows', () => {
    const conditions = [makeCondition('knee_right', 2)]
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
      makeCondition('shoulder_left', 4),
      makeCondition('lower_back', 6),
    ]
    const result = filterExercisesByContraindications(
      [shoulderExercise, kneeExercise, safeExercise],
      conditions,
    )
    // shoulderExercise excluded by shoulder_left, kneeExercise excluded by lower_back
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
    goals: ['muscle_gain' as const],
    conditions: [],
    equipment: allEquipment,
    availableWeights: [],
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
    const conditions = [makeCondition('shoulder_left', 5)]
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
      tags: ['pull', 'lower_body', 'posterior_chain', 'smith_machine', 'hamstrings'],
      equipmentNeeded: ['smith_machine'],
    }),
    makeExercise({
      id: 112, name: 'Soulevé de terre roumain haltères', category: 'compound',
      primaryMuscles: ['ischio-jambiers', 'fessiers'],
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
    goals: ['muscle_gain' as const],
    conditions: [],
    equipment: ulEquipment,
    availableWeights: [],
    daysPerWeek: 4,
    minutesPerSession: 60,
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

    it('contains leg extension', () => {
      expect(ids).toContain(105)
    })

    it('contains leg curl (balance)', () => {
      expect(ids).toContain(106)
    })

    it('contains a core exercise', () => {
      expect(ids.some((id) => [109, 110].includes(id))).toBe(true)
    })

    it('has no duplicate exercise IDs', () => {
      expect(new Set(ids).size).toBe(ids.length)
    })

    it('has between 5 and 8 exercises', () => {
      expect(lower1.exercises.length).toBeGreaterThanOrEqual(5)
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
