import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useOnboarding } from './useOnboarding'
import { db } from '../db'

describe('useOnboarding', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('starts at step 1', () => {
    const { result } = renderHook(() => useOnboarding())
    expect(result.current.state.step).toBe(1)
  })

  it('navigates forward and backward', () => {
    const { result } = renderHook(() => useOnboarding())
    act(() => result.current.nextStep())
    expect(result.current.state.step).toBe(2)
    act(() => result.current.prevStep())
    expect(result.current.state.step).toBe(1)
    act(() => result.current.prevStep())
    expect(result.current.state.step).toBe(1) // doesn't go below 1
  })

  it('does not exceed total steps', () => {
    const { result } = renderHook(() => useOnboarding())
    for (let i = 0; i < 10; i++) act(() => result.current.nextStep())
    expect(result.current.state.step).toBe(7)
  })

  it('submits profile to database', async () => {
    const { result } = renderHook(() => useOnboarding())
    act(() => {
      result.current.updateBody({ name: 'Yassine', height: 196, weight: 112, age: 30, sex: 'male' })
      result.current.updateGoals(['weight_loss', 'rehab'])
      result.current.updateSchedule(4, 90)
    })
    let userId: number
    await act(async () => { userId = await result.current.submit() })
    const user = await db.userProfiles.get(userId!)
    expect(user!.name).toBe('Yassine')
    expect(user!.height).toBe(196)
    expect(user!.goals).toContain('rehab')
  })

  it('seeds ExerciseProgress for known weights', async () => {
    // Seed exercises first so generateProgram has a catalog
    const { seedExercises } = await import('../data/seed')
    await seedExercises()

    const { result } = renderHook(() => useOnboarding())
    act(() => {
      result.current.updateBody({ name: 'Test', height: 180, weight: 80, age: 25, sex: 'male' })
      result.current.updateGoals(['muscle_gain'])
      result.current.updateSchedule(4, 60)
      // Add equipment so leg press makes it into the program
      result.current.updateEquipment([
        { name: 'leg_press', type: 'machine', isAvailable: true, notes: '' },
        { name: 'leg_curl', type: 'machine', isAvailable: true, notes: '' },
        { name: 'leg_extension', type: 'machine', isAvailable: true, notes: '' },
        { name: 'cable', type: 'cable', isAvailable: true, notes: '' },
        { name: 'dumbbell', type: 'free_weight', isAvailable: true, notes: '' },
        { name: 'bench', type: 'other', isAvailable: true, notes: '' },
        { name: 'smith_machine', type: 'machine', isAvailable: true, notes: '' },
      ])
      // Set known weight for leg press
      const updated = result.current.state.knownWeights.map(kw =>
        kw.matchFragment === 'leg press' ? { ...kw, weightKg: 150 } : kw
      )
      result.current.updateKnownWeights(updated)
    })
    let userId: number
    await act(async () => { userId = await result.current.submit() })

    // Verify ExerciseProgress was seeded
    const progress = await db.exerciseProgress.where('userId').equals(userId!).toArray()
    // Leg press is called "Leg press" in the catalog
    const legPressProgress = progress.find(p => p.exerciseName.toLowerCase().includes('leg press'))
    expect(progress.length).toBeGreaterThan(0)
    expect(legPressProgress).toBeDefined()
    expect(legPressProgress!.weightKg).toBe(150)
    expect(legPressProgress!.sessionId).toBe(0) // seed entry marker
  })

  it('submits health conditions', async () => {
    const { result } = renderHook(() => useOnboarding())
    act(() => {
      result.current.updateBody({ name: 'Test', height: 180, weight: 80, age: 25, sex: 'male' })
      result.current.updateConditions([{
        bodyZone: 'elbow_right', label: 'Golf elbow',
        diagnosis: 'Epicondylite mediale', painLevel: 6,
        since: '1 an', notes: '', isActive: true,
      }])
    })
    let userId: number
    await act(async () => { userId = await result.current.submit() })
    const conditions = await db.healthConditions.where('userId').equals(userId!).toArray()
    expect(conditions).toHaveLength(1)
    expect(conditions[0].bodyZone).toBe('elbow_right')
  })
})
