import { describe, it, expect } from 'vitest'
import { generateRestDayRoutine } from './rest-day'
import type { HealthCondition } from '../db/types'

describe('generateRestDayRoutine', () => {
  // Use conditions that have rest_day / cooldown exercises in the real rehab protocols:
  // - upper_back has exercises: "Chin tuck", "Face pull", "Band pull-apart", "Etirement pectoral"
  // - foot_left has exercises: "Short foot", "Towel curl", "Heel raises"
  // - hip_right has exercises: "Nerve flossing", "Etirement piriforme", etc.
  const mockConditions: HealthCondition[] = [
    {
      id: 1, userId: 1, bodyZone: 'upper_back', label: 'Posture',
      diagnosis: 'Posture antérieure', painLevel: 3, since: '2 ans',
      notes: '', isActive: true, createdAt: new Date(),
    },
    {
      id: 2, userId: 1, bodyZone: 'foot_left', label: 'Pieds plats',
      diagnosis: 'Pieds plats et arthrite', painLevel: 4, since: '3 ans',
      notes: '', isActive: true, createdAt: new Date(),
    },
    {
      id: 3, userId: 1, bodyZone: 'hip_right', label: 'Sciatique',
      diagnosis: 'Compression nerf sciatique', painLevel: 5, since: '1 an',
      notes: '', isActive: true, createdAt: new Date(),
    },
    {
      id: 4, userId: 1, bodyZone: 'knee_left', label: 'Ancien',
      diagnosis: '', painLevel: 0, since: '', notes: '',
      isActive: false, createdAt: new Date(), // inactive — should be excluded
    },
  ]

  it('includes rehab exercises for active conditions', () => {
    const routine = generateRestDayRoutine(mockConditions)
    // Should have exercises (max 5 due to rotation system)
    expect(routine.exercises.length).toBeGreaterThan(0)
    expect(routine.exercises.length).toBeLessThanOrEqual(5)
  })

  it('picks exercises from rehab protocols for active conditions', () => {
    const routine = generateRestDayRoutine(mockConditions)
    const names = routine.exercises.map(e => e.name)
    // Should include at least some exercises (rotation picks 5)
    expect(names.length).toBeGreaterThan(0)
    // All exercises should be non-external
    expect(routine.exercises.every(e => !e.isExternal)).toBe(true)
  })

  it('excludes inactive conditions', () => {
    const routine = generateRestDayRoutine(mockConditions)
    // knee_left is inactive — knee protocol exercises should not appear
    const names = routine.exercises.map(e => e.name)
    const kneeExercises = names.filter(n =>
      n.toLowerCase().includes('tendinite rotulienne') ||
      n.toLowerCase().includes('spanish squat')
    )
    expect(kneeExercises).toHaveLength(0)
  })

  it('returns empty exercises with no conditions and no goals', () => {
    const routine = generateRestDayRoutine([])
    expect(routine.exercises).toHaveLength(0)
  })

  it('computes total minutes from all exercises', () => {
    const routine = generateRestDayRoutine(mockConditions)
    expect(routine.totalMinutes).toBeGreaterThan(0)
  })

  it('does not include duplicate exercises', () => {
    const routine = generateRestDayRoutine(mockConditions)
    const names = routine.exercises.map(e => e.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('includes rehab exercises from condition protocols', () => {
    const elbowOnly: HealthCondition[] = [
      {
        id: 10, userId: 1, bodyZone: 'elbow_right', label: 'Golf elbow',
        diagnosis: 'Épicondylite médiale', painLevel: 5, since: '1 an',
        notes: '', isActive: true, createdAt: new Date(),
      },
    ]
    const routine = generateRestDayRoutine(elbowOnly)
    // Should have exercises from elbow protocol
    expect(routine.exercises.length).toBeGreaterThan(0)
    // All should be valid exercises (not external)
    expect(routine.exercises.every(e => !e.isExternal)).toBe(true)
  })

  it('respects max exercises limit through rotation', () => {
    const routine = generateRestDayRoutine(mockConditions)
    // With multiple conditions, rotation limits to max 5
    expect(routine.exercises.length).toBeLessThanOrEqual(5)
  })

  // ---------------------------------------------------------------------------
  // General mobility/posture exercises (for users without conditions)
  // ---------------------------------------------------------------------------

  describe('general mobility/posture exercises', () => {
    it('generates mobility exercises when user has mobility goal but no conditions', () => {
      const routine = generateRestDayRoutine({ conditions: [], goals: ['mobility'] })
      const names = routine.exercises.map(e => e.name)

      // Should include general mobility exercises
      expect(names).toContain('Hip flexor stretch (fléchisseurs de hanche)')
      expect(names).toContain('Hamstring stretch (ischio-jambiers)')
      expect(names).toContain('Thoracic spine rotation (rotation thoracique)')
      expect(routine.exercises.length).toBeGreaterThanOrEqual(5)
    })

    it('generates posture exercises when user has posture goal but no conditions', () => {
      const routine = generateRestDayRoutine({ conditions: [], goals: ['posture'] })
      const names = routine.exercises.map(e => e.name)

      // Should include general posture exercises
      expect(names).toContain('Chin tucks (rétraction cervicale)')
      expect(names).toContain('Wall angels (anges au mur)')
      expect(names).toContain('Band pull-aparts (écartés avec bande)')
      expect(routine.exercises.length).toBeGreaterThanOrEqual(5)
    })

    it('generates both mobility and posture exercises when user has both goals', () => {
      const routine = generateRestDayRoutine({ conditions: [], goals: ['mobility', 'posture'] })
      const names = routine.exercises.map(e => e.name)

      // Should include exercises from both categories (limited to max 5)
      expect(routine.exercises.length).toBe(5)
      // First exercises should be from mobility (added first)
      expect(names).toContain('Hip flexor stretch (fléchisseurs de hanche)')
    })

    it('combines rehab and general exercises when user has both conditions and goals', () => {
      const elbowCondition: HealthCondition[] = [
        {
          id: 10, userId: 1, bodyZone: 'elbow_right', label: 'Golf elbow',
          diagnosis: 'Épicondylite médiale', painLevel: 5, since: '1 an',
          notes: '', isActive: true, createdAt: new Date(),
        },
      ]
      const routine = generateRestDayRoutine({
        conditions: elbowCondition,
        goals: ['mobility'],
      })

      // Should include both rehab and general exercises
      expect(routine.exercises.length).toBeGreaterThan(3)
      // Should include some general mobility exercises (limited to 3 when combined)
      const names = routine.exercises.map(e => e.name)
      expect(names).toContain('Hip flexor stretch (fléchisseurs de hanche)')
    })

    it('limits general exercises to 3 when combined with rehab', () => {
      const routine = generateRestDayRoutine({
        conditions: mockConditions,
        goals: ['mobility', 'posture'],
      })

      // Count general exercises (those not from rehab protocols)
      const generalExerciseNames = [
        'Hip flexor stretch (fléchisseurs de hanche)',
        'Hamstring stretch (ischio-jambiers)',
        'Thoracic spine rotation (rotation thoracique)',
        'Shoulder dislocates (désarticulés épaules)',
        'Ankle mobility circles (cercles de cheville)',
        'Cat-cow (chat-vache)',
        'Chin tucks (rétraction cervicale)',
        'Wall angels (anges au mur)',
        'Band pull-aparts (écartés avec bande)',
        'Thoracic extensions (extensions thoraciques)',
        'Doorway chest stretch (étirement pectoral)',
      ]
      const names = routine.exercises.map(e => e.name)
      const generalCount = names.filter(n => generalExerciseNames.includes(n)).length

      expect(generalCount).toBeLessThanOrEqual(3)
    })

    it('returns empty routine when no conditions and no relevant goals', () => {
      const routine = generateRestDayRoutine({ conditions: [], goals: ['weight_loss', 'muscle_gain'] })
      expect(routine.exercises).toHaveLength(0)
    })
  })

  // ---------------------------------------------------------------------------
  // Variant filtering (upper / lower / all)
  // ---------------------------------------------------------------------------

  describe('variant filtering', () => {
    // Mixed conditions spanning both upper and lower zones:
    // - elbow_right = upper zone
    // - upper_back = upper zone
    // - foot_left = lower zone
    // - hip_right = lower zone
    // - knee_left = inactive (should always be excluded)
    const mixedConditions: HealthCondition[] = [
      {
        id: 10, userId: 1, bodyZone: 'elbow_right', label: 'Golf elbow',
        diagnosis: 'Épicondylite médiale', painLevel: 4, since: '1 an',
        notes: '', isActive: true, createdAt: new Date(),
      },
      {
        id: 1, userId: 1, bodyZone: 'upper_back', label: 'Posture',
        diagnosis: 'Posture antérieure', painLevel: 3, since: '2 ans',
        notes: '', isActive: true, createdAt: new Date(),
      },
      {
        id: 2, userId: 1, bodyZone: 'foot_left', label: 'Pieds plats',
        diagnosis: 'Pieds plats et arthrite', painLevel: 4, since: '3 ans',
        notes: '', isActive: true, createdAt: new Date(),
      },
      {
        id: 3, userId: 1, bodyZone: 'hip_right', label: 'Sciatique',
        diagnosis: 'Compression nerf sciatique', painLevel: 5, since: '1 an',
        notes: '', isActive: true, createdAt: new Date(),
      },
      {
        id: 4, userId: 1, bodyZone: 'knee_left', label: 'Ancien',
        diagnosis: '', painLevel: 0, since: '', notes: '',
        isActive: false, createdAt: new Date(),
      },
    ]

    it('variant=upper returns only upper body rehab exercises', () => {
      const routine = generateRestDayRoutine(mixedConditions, 'upper')
      const names = routine.exercises.map(e => e.name)

      // Should have exercises
      expect(names.length).toBeGreaterThan(0)

      // Should NOT include foot_left exercises
      expect(names).not.toContain('Short foot (exercice du pied court)')
      expect(names).not.toContain('Towel curl (curl serviette pied)')
      // Should NOT include hip_right exercises
      expect(names).not.toContain('Nerve flossing sciatique')
      expect(names).not.toContain('Étirement piriforme')
    })

    it('variant=lower returns only lower body rehab exercises', () => {
      const routine = generateRestDayRoutine(mixedConditions, 'lower')
      const names = routine.exercises.map(e => e.name)

      // Should have exercises
      expect(names.length).toBeGreaterThan(0)

      // Should NOT include elbow_right exercises
      const elbowExercises = names.filter(n => n.toLowerCase().includes('golf elbow'))
      expect(elbowExercises).toHaveLength(0)
      // Should NOT include upper_back exercises
      expect(names).not.toContain('Chin tuck (rétraction cervicale)')
      expect(names).not.toContain('Face pull (rehab posture)')
      expect(names).not.toContain('Band pull-apart')
    })

    it('variant=all returns exercises from all zones', () => {
      const routineAll = generateRestDayRoutine(mixedConditions, 'all')
      const routineDefault = generateRestDayRoutine(mixedConditions)

      // Both should produce the same exercises
      expect(routineAll.exercises.map(e => e.name)).toEqual(routineDefault.exercises.map(e => e.name))

      // Should have exercises
      expect(routineAll.exercises.length).toBeGreaterThan(0)
    })

    it('returns variant field in the routine', () => {
      expect(generateRestDayRoutine(mixedConditions, 'upper').variant).toBe('upper')
      expect(generateRestDayRoutine(mixedConditions, 'lower').variant).toBe('lower')
      expect(generateRestDayRoutine(mixedConditions, 'all').variant).toBe('all')
      expect(generateRestDayRoutine(mixedConditions).variant).toBe('all')
    })
  })

  // ---------------------------------------------------------------------------
  // Options object signature
  // ---------------------------------------------------------------------------

  describe('options object signature', () => {
    it('supports options object with conditions and variant', () => {
      const routine = generateRestDayRoutine({
        conditions: mockConditions,
        variant: 'upper',
      })
      expect(routine.variant).toBe('upper')
      expect(routine.exercises.length).toBeGreaterThan(0)
    })

    it('supports options object with goals', () => {
      const routine = generateRestDayRoutine({
        conditions: [],
        goals: ['mobility'],
      })
      expect(routine.exercises.length).toBeGreaterThan(0)
    })
  })
})
