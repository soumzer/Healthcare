import { describe, it, expect } from 'vitest'
import { generateRestDayRoutine } from './rest-day'
import type { HealthCondition } from '../db/types'

describe('generateRestDayRoutine', () => {
  const mockConditions: HealthCondition[] = [
    {
      id: 1, userId: 1, bodyZone: 'upper_back', label: 'Posture',
      diagnosis: 'Posture antérieure', since: '2 ans',
      notes: '', isActive: true, createdAt: new Date(),
    },
    {
      id: 2, userId: 1, bodyZone: 'foot_left', label: 'Pieds plats',
      diagnosis: 'Pieds plats et arthrite', since: '3 ans',
      notes: '', isActive: true, createdAt: new Date(),
    },
    {
      id: 3, userId: 1, bodyZone: 'hip_right', label: 'Sciatique',
      diagnosis: 'Compression nerf sciatique', since: '1 an',
      notes: '', isActive: true, createdAt: new Date(),
    },
    {
      id: 4, userId: 1, bodyZone: 'knee_left', label: 'Ancien',
      diagnosis: '', since: '', notes: '',
      isActive: false, createdAt: new Date(),
    },
  ]

  it('includes rehab exercises for active conditions', () => {
    const routine = generateRestDayRoutine(mockConditions)
    expect(routine.exercises.length).toBeGreaterThan(0)
    expect(routine.exercises.length).toBeLessThanOrEqual(5)
  })

  it('picks exercises from rehab protocols for active conditions', () => {
    const routine = generateRestDayRoutine(mockConditions)
    const names = routine.exercises.map(e => e.name)
    expect(names.length).toBeGreaterThan(0)
    expect(routine.exercises.every(e => !e.isExternal)).toBe(true)
  })

  it('excludes inactive conditions', () => {
    const routine = generateRestDayRoutine(mockConditions)
    const names = routine.exercises.map(e => e.name)
    const kneeExercises = names.filter(n =>
      n.toLowerCase().includes('tendinite rotulienne') ||
      n.toLowerCase().includes('spanish squat')
    )
    expect(kneeExercises).toHaveLength(0)
  })

  it('returns empty exercises with no conditions', () => {
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
        diagnosis: 'Épicondylite médiale', since: '1 an',
        notes: '', isActive: true, createdAt: new Date(),
      },
    ]
    const routine = generateRestDayRoutine(elbowOnly)
    expect(routine.exercises.length).toBeGreaterThan(0)
    expect(routine.exercises.every(e => !e.isExternal)).toBe(true)
  })

  it('respects max exercises limit through rotation', () => {
    const routine = generateRestDayRoutine(mockConditions)
    expect(routine.exercises.length).toBeLessThanOrEqual(5)
  })

  describe('variant filtering', () => {
    const mixedConditions: HealthCondition[] = [
      {
        id: 10, userId: 1, bodyZone: 'elbow_right', label: 'Golf elbow',
        diagnosis: 'Épicondylite médiale', since: '1 an',
        notes: '', isActive: true, createdAt: new Date(),
      },
      {
        id: 1, userId: 1, bodyZone: 'upper_back', label: 'Posture',
        diagnosis: 'Posture antérieure', since: '2 ans',
        notes: '', isActive: true, createdAt: new Date(),
      },
      {
        id: 2, userId: 1, bodyZone: 'foot_left', label: 'Pieds plats',
        diagnosis: 'Pieds plats et arthrite', since: '3 ans',
        notes: '', isActive: true, createdAt: new Date(),
      },
      {
        id: 3, userId: 1, bodyZone: 'hip_right', label: 'Sciatique',
        diagnosis: 'Compression nerf sciatique', since: '1 an',
        notes: '', isActive: true, createdAt: new Date(),
      },
      {
        id: 4, userId: 1, bodyZone: 'knee_left', label: 'Ancien',
        diagnosis: '', since: '', notes: '',
        isActive: false, createdAt: new Date(),
      },
    ]

    it('variant=upper returns only upper body rehab exercises', () => {
      const routine = generateRestDayRoutine(mixedConditions, 'upper')
      const names = routine.exercises.map(e => e.name)
      expect(names.length).toBeGreaterThan(0)
      expect(names).not.toContain('Short foot (exercice du pied court)')
      expect(names).not.toContain('Towel curl (curl serviette pied)')
      expect(names).not.toContain('Nerve flossing sciatique')
      expect(names).not.toContain('Étirement piriforme')
    })

    it('variant=lower returns only lower body rehab exercises', () => {
      const routine = generateRestDayRoutine(mixedConditions, 'lower')
      const names = routine.exercises.map(e => e.name)
      expect(names.length).toBeGreaterThan(0)
      const elbowExercises = names.filter(n => n.toLowerCase().includes('golf elbow'))
      expect(elbowExercises).toHaveLength(0)
      expect(names).not.toContain('Chin tuck (rétraction cervicale)')
      expect(names).not.toContain('Face pull (rehab posture)')
      expect(names).not.toContain('Band pull-apart')
    })

    it('variant=all returns exercises from all zones', () => {
      const routineAll = generateRestDayRoutine(mixedConditions, 'all')
      const routineDefault = generateRestDayRoutine(mixedConditions)
      expect(routineAll.exercises.map(e => e.name)).toEqual(routineDefault.exercises.map(e => e.name))
      expect(routineAll.exercises.length).toBeGreaterThan(0)
    })

    it('returns variant field in the routine', () => {
      expect(generateRestDayRoutine(mixedConditions, 'upper').variant).toBe('upper')
      expect(generateRestDayRoutine(mixedConditions, 'lower').variant).toBe('lower')
      expect(generateRestDayRoutine(mixedConditions, 'all').variant).toBe('all')
      expect(generateRestDayRoutine(mixedConditions).variant).toBe('all')
    })
  })
})
