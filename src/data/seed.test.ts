import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db'
import { seedExercises } from './seed'
import { exerciseCatalog } from './exercises'
import { rehabProtocols } from './rehab-protocols'

describe('seedExercises', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('seeds all exercises from catalog', async () => {
    await seedExercises()
    const count = await db.exercises.count()
    expect(count).toBe(exerciseCatalog.length)
  })

  it('does not duplicate on second call', async () => {
    await seedExercises()
    await seedExercises()
    const count = await db.exercises.count()
    expect(count).toBe(exerciseCatalog.length)
  })

  it('includes rehab exercises', async () => {
    await seedExercises()
    const all = await db.exercises.toArray()
    const rehab = all.filter(e => e.isRehab)
    expect(rehab.length).toBeGreaterThan(0)
  })

  it('catalog has at least 50 exercises', () => {
    expect(exerciseCatalog.length).toBeGreaterThanOrEqual(50)
  })

  it('all rehab exercises have a rehabTarget', () => {
    const rehabExercises = exerciseCatalog.filter(e => e.isRehab)
    for (const ex of rehabExercises) {
      expect(ex.rehabTarget, `${ex.name} missing rehabTarget`).toBeDefined()
    }
  })

  it('rehab protocols cover all major conditions', () => {
    const targetZones = rehabProtocols.map(p => p.targetZone)
    expect(targetZones).toContain('elbow_right')
    expect(targetZones).toContain('knee_right')
    expect(targetZones).toContain('foot_left')
    expect(targetZones).toContain('lower_back')
  })

  it('all rehab exercises have French instructions', () => {
    const rehabExercises = exerciseCatalog.filter(e => e.isRehab)
    for (const ex of rehabExercises) {
      expect(ex.instructions.length, `${ex.name} has empty instructions`).toBeGreaterThan(20)
    }
  })

  it('every protocol exercise name matches a catalog exercise', () => {
    const catalogNames = new Set(exerciseCatalog.map(e => e.name))
    for (const protocol of rehabProtocols) {
      for (const ex of protocol.exercises) {
        expect(
          catalogNames.has(ex.exerciseName),
          `Protocol exercise "${ex.exerciseName}" (${protocol.conditionName}) not found in catalog`
        ).toBe(true)
      }
    }
  })

  it('no duplicate exercise names in catalog', () => {
    const names = exerciseCatalog.map(e => e.name)
    const uniqueNames = new Set(names)
    expect(uniqueNames.size).toBe(names.length)
  })

  it('all exercises have at least one primary muscle', () => {
    for (const ex of exerciseCatalog) {
      expect(
        ex.primaryMuscles.length,
        `${ex.name} has no primary muscles`
      ).toBeGreaterThanOrEqual(1)
    }
  })

  it('compound exercises have secondary muscles', () => {
    const compounds = exerciseCatalog.filter(e => e.category === 'compound')
    for (const ex of compounds) {
      expect(
        ex.secondaryMuscles.length,
        `Compound "${ex.name}" has no secondary muscles`
      ).toBeGreaterThanOrEqual(1)
    }
  })

  it('rehab protocols have valid frequencies', () => {
    const validFreqs = ['every_session', 'daily', '3x_week']
    for (const p of rehabProtocols) {
      expect(validFreqs).toContain(p.frequency)
    }
  })

  it('rehab protocols have valid exercise placements', () => {
    const validPlacements = ['warmup', 'active_wait', 'cooldown', 'rest_day']
    for (const p of rehabProtocols) {
      for (const ex of p.exercises) {
        expect(
          validPlacements,
          `Invalid placement "${ex.placement}" in protocol "${p.conditionName}"`
        ).toContain(ex.placement)
      }
    }
  })
})
