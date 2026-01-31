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
  // Build a small but realistic catalog with IDs
  const catalog: Exercise[] = [
    // Compound push upper
    makeExercise({ id: 1, name: 'Bench Press', category: 'compound', tags: ['push', 'upper_body', 'chest'], equipmentNeeded: ['bench', 'barbell'] }),
    makeExercise({ id: 2, name: 'DB Shoulder Press', category: 'compound', tags: ['push', 'upper_body', 'shoulders'], equipmentNeeded: ['dumbbells'] }),
    // Compound pull upper
    makeExercise({ id: 3, name: 'Cable Row', category: 'compound', tags: ['pull', 'upper_body', 'back'], equipmentNeeded: ['cable'] }),
    makeExercise({ id: 4, name: 'Lat Pulldown', category: 'compound', tags: ['pull', 'upper_body', 'back'], equipmentNeeded: ['lat_pulldown'] }),
    // Isolation push upper
    makeExercise({ id: 5, name: 'Lateral Raise', category: 'isolation', tags: ['push', 'upper_body', 'shoulders'], equipmentNeeded: ['dumbbells'] }),
    // Isolation pull upper
    makeExercise({ id: 6, name: 'Bicep Curl', category: 'isolation', tags: ['pull', 'upper_body', 'arms'], equipmentNeeded: ['dumbbells'] }),
    // Compound lower
    makeExercise({ id: 7, name: 'Squat', category: 'compound', tags: ['legs', 'lower_body', 'squat'], equipmentNeeded: ['barbell'] }),
    makeExercise({ id: 8, name: 'Leg Press', category: 'compound', tags: ['legs', 'lower_body'], equipmentNeeded: ['leg_press'] }),
    makeExercise({ id: 9, name: 'Lunge', category: 'compound', tags: ['legs', 'lower_body'], equipmentNeeded: ['dumbbells'] }),
    // Isolation lower
    makeExercise({ id: 10, name: 'Leg Extension', category: 'isolation', tags: ['legs', 'lower_body', 'quadriceps'], equipmentNeeded: ['leg_extension'] }),
    makeExercise({ id: 11, name: 'Leg Curl', category: 'isolation', tags: ['legs', 'lower_body', 'hamstrings'], equipmentNeeded: ['leg_curl'] }),
    // Core
    makeExercise({ id: 12, name: 'Dead Bug', category: 'core', tags: ['core', 'abs'], equipmentNeeded: [] }),
    makeExercise({ id: 13, name: 'Plank', category: 'core', tags: ['core', 'stability'], equipmentNeeded: [] }),
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
