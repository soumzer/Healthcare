import { describe, it, expect } from 'vitest'
import { generateRestDayRoutine } from './rest-day'
import type { HealthCondition } from '../db/types'

describe('generateRestDayRoutine', () => {
  // Use conditions that have rest_day / cooldown exercises in the real rehab protocols:
  // - upper_back has cooldown: "Étirement pectoral (doorway stretch)"
  // - foot_left has rest_day: "Towel curl (curl serviette pied)"
  // - hip_right has cooldown: "Étirement piriforme", "Child's pose (posture de l'enfant)"
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

  it('picks rest_day and cooldown exercises from protocols', () => {
    const routine = generateRestDayRoutine(mockConditions)
    const names = routine.exercises.map(e => e.name)
    // From upper_back (cooldown)
    expect(names).toContain('Étirement pectoral (doorway stretch)')
    // From foot_left (rest_day)
    expect(names).toContain('Towel curl (curl serviette pied)')
    // From hip_right (cooldown)
    expect(names).toContain('Étirement piriforme')
    expect(names).toContain('Child\'s pose (posture de l\'enfant)')
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

  it('caps total minutes at 20', () => {
    const routine = generateRestDayRoutine(mockConditions)
    expect(routine.totalMinutes).toBeLessThanOrEqual(20)
  })

  it('does not include duplicate exercises', () => {
    const routine = generateRestDayRoutine(mockConditions)
    const names = routine.exercises.map(e => e.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('returns only external when conditions have no rest_day/cooldown exercises', () => {
    const elbowOnly: HealthCondition[] = [
      {
        id: 10, userId: 1, bodyZone: 'elbow_right', label: 'Golf elbow',
        diagnosis: 'Épicondylite médiale', painLevel: 5, since: '1 an',
        notes: '', isActive: true, createdAt: new Date(),
      },
    ]
    const routine = generateRestDayRoutine(elbowOnly)
    // elbow_right protocol only has 'warmup' exercises — no rest_day/cooldown
    expect(routine.exercises).toHaveLength(1)
    expect(routine.exercises[0].isExternal).toBe(true)
  })
})
