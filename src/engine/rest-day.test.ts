import { describe, it, expect } from 'vitest'
import { generateRestDayRoutine, type RestDayVariant } from './rest-day'
import type { HealthCondition } from '../db/types'

describe('generateRestDayRoutine', () => {
  // Use conditions that have rest_day / cooldown exercises in the real rehab protocols:
  // - upper_back has cooldown: "Étirement pectoral (doorway stretch)"
  // - foot_left has rest_day: "Towel curl (curl serviette pied)"
  // - hip_right has cooldown: "Étirement piriforme", "Child's pose (posture de l'enfant)",
  //   "Étirement ischio-jambiers (hamstring stretch)", "Étirement fléchisseurs de hanche (hip flexor stretch)"
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
    // upper_back cooldown + foot_left rest_day + hip_right cooldowns + external
    expect(routine.exercises.length).toBeGreaterThan(1)
  })

  it('picks warmup, cooldown, and rest_day exercises from protocols', () => {
    const routine = generateRestDayRoutine(mockConditions)
    const names = routine.exercises.map(e => e.name)
    // From upper_back (warmup)
    expect(names).toContain('Chin tuck (rétraction cervicale)')
    // From upper_back (cooldown)
    expect(names).toContain('Étirement pectoral (doorway stretch)')
    // From foot_left (warmup)
    expect(names).toContain('Short foot (exercice du pied court)')
    // From foot_left (rest_day)
    expect(names).toContain('Towel curl (curl serviette pied)')
    // From hip_right (cooldown)
    expect(names).toContain('Étirement piriforme')
    expect(names).toContain('Child\'s pose (posture de l\'enfant)')
    expect(names).toContain('Étirement ischio-jambiers (hamstring stretch)')
    expect(names).toContain('Étirement fléchisseurs de hanche (hip flexor stretch)')
    // From hip_right (warmup)
    expect(names).toContain('Nerve flossing sciatique')
    expect(names).toContain('Foam roll chaîne postérieure (ischios + mollets)')
  })

  it('excludes inactive conditions', () => {
    const routine = generateRestDayRoutine(mockConditions)
    // knee_left is inactive — knee_right protocol exercises should not appear
    const names = routine.exercises.map(e => e.name)
    const kneeExercises = names.filter(n =>
      n.toLowerCase().includes('tendinite rotulienne') ||
      n.toLowerCase().includes('spanish squat')
    )
    expect(kneeExercises).toHaveLength(0)
  })

  it('always includes external stretching as last item', () => {
    const routine = generateRestDayRoutine(mockConditions)
    const last = routine.exercises[routine.exercises.length - 1]
    expect(last.isExternal).toBe(true)
    expect(last.name).toContain('programme externe')
  })

  it('includes external stretching even with no conditions', () => {
    const routine = generateRestDayRoutine([])
    expect(routine.exercises).toHaveLength(1)
    expect(routine.exercises[0].isExternal).toBe(true)
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

  it('includes warmup rehab exercises for rest day routine', () => {
    const elbowOnly: HealthCondition[] = [
      {
        id: 10, userId: 1, bodyZone: 'elbow_right', label: 'Golf elbow',
        diagnosis: 'Épicondylite médiale', painLevel: 5, since: '1 an',
        notes: '', isActive: true, createdAt: new Date(),
      },
    ]
    const routine = generateRestDayRoutine(elbowOnly)
    const names = routine.exercises.map(e => e.name)
    // elbow_right protocol has warmup exercises that should now be included
    expect(names).toContain('Tyler Twist inversé (golf elbow)')
    expect(names).toContain('Curl poignet excentrique (golf elbow)')
    // Plus external stretching at the end
    expect(routine.exercises[routine.exercises.length - 1].isExternal).toBe(true)
  })

  it('includes active_wait rehab exercises in rest day routine', () => {
    const routine = generateRestDayRoutine(mockConditions)
    const names = routine.exercises.map(e => e.name)
    // active_wait exercises ARE included — rest days guarantee rehab gets done
    expect(names).toContain('Face pull (rehab posture)')
    expect(names).toContain('Band pull-apart')
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

    it('variant=upper returns only upper body rehab exercises + external stretching', () => {
      const routine = generateRestDayRoutine(mixedConditions, 'upper')
      const names = routine.exercises.filter(e => !e.isExternal).map(e => e.name)

      // Should include elbow_right exercises
      expect(names).toContain('Tyler Twist inversé (golf elbow)')
      expect(names).toContain('Curl poignet excentrique (golf elbow)')
      // Should include upper_back exercises
      expect(names).toContain('Chin tuck (rétraction cervicale)')
      expect(names).toContain('Face pull (rehab posture)')

      // Should NOT include foot_left exercises
      expect(names).not.toContain('Short foot (exercice du pied court)')
      expect(names).not.toContain('Towel curl (curl serviette pied)')
      // Should NOT include hip_right exercises
      expect(names).not.toContain('Nerve flossing sciatique')
      expect(names).not.toContain('Étirement piriforme')
    })

    it('variant=lower returns only lower body rehab exercises + external stretching', () => {
      const routine = generateRestDayRoutine(mixedConditions, 'lower')
      const names = routine.exercises.filter(e => !e.isExternal).map(e => e.name)

      // Should include foot_left exercises
      expect(names).toContain('Short foot (exercice du pied court)')
      expect(names).toContain('Towel curl (curl serviette pied)')
      // Should include hip_right exercises
      expect(names).toContain('Nerve flossing sciatique')
      expect(names).toContain('Étirement piriforme')
      expect(names).toContain('Child\'s pose (posture de l\'enfant)')
      expect(names).toContain('Étirement ischio-jambiers (hamstring stretch)')
      expect(names).toContain('Étirement fléchisseurs de hanche (hip flexor stretch)')
      expect(names).toContain('Foam roll chaîne postérieure (ischios + mollets)')

      // Should NOT include elbow_right exercises
      expect(names).not.toContain('Tyler Twist inversé (golf elbow)')
      expect(names).not.toContain('Curl poignet excentrique (golf elbow)')
      // Should NOT include upper_back exercises
      expect(names).not.toContain('Chin tuck (rétraction cervicale)')
      expect(names).not.toContain('Face pull (rehab posture)')
      expect(names).not.toContain('Band pull-apart')
    })

    it('variant=all returns all exercises (backward compatible)', () => {
      const routineAll = generateRestDayRoutine(mixedConditions, 'all')
      const routineDefault = generateRestDayRoutine(mixedConditions)
      // Both should produce the same exercises
      expect(routineAll.exercises.map(e => e.name)).toEqual(routineDefault.exercises.map(e => e.name))

      const names = routineAll.exercises.filter(e => !e.isExternal).map(e => e.name)
      // Should include both upper and lower exercises
      expect(names).toContain('Tyler Twist inversé (golf elbow)')
      expect(names).toContain('Chin tuck (rétraction cervicale)')
      expect(names).toContain('Short foot (exercice du pied court)')
      expect(names).toContain('Nerve flossing sciatique')
    })

    it('variant=upper still includes external stretching', () => {
      const routine = generateRestDayRoutine(mixedConditions, 'upper')
      const last = routine.exercises[routine.exercises.length - 1]
      expect(last.isExternal).toBe(true)
      expect(last.name).toContain('programme externe')
    })

    it('variant=lower still includes external stretching', () => {
      const routine = generateRestDayRoutine(mixedConditions, 'lower')
      const last = routine.exercises[routine.exercises.length - 1]
      expect(last.isExternal).toBe(true)
      expect(last.name).toContain('programme externe')
    })

    it('returns variant field in the routine', () => {
      expect(generateRestDayRoutine(mixedConditions, 'upper').variant).toBe('upper')
      expect(generateRestDayRoutine(mixedConditions, 'lower').variant).toBe('lower')
      expect(generateRestDayRoutine(mixedConditions, 'all').variant).toBe('all')
      expect(generateRestDayRoutine(mixedConditions).variant).toBe('all')
    })
  })
})
