import { describe, it, expect } from 'vitest'
import { generateWarmupSets } from './warmup'

describe('generateWarmupSets', () => {
  describe('heavy weight (>20kg) — full 4-set progressive warmup', () => {
    it('generates 4 warmup sets for 100kg', () => {
      const sets = generateWarmupSets(100)
      expect(sets).toHaveLength(4)
      expect(sets[0]).toEqual({ weightKg: 0, reps: 10, label: 'Barre à vide' })
      expect(sets[1]).toEqual({ weightKg: 50, reps: 8, label: '50%' })
      expect(sets[2]).toEqual({ weightKg: 70, reps: 5, label: '70%' })
      expect(sets[3]).toEqual({ weightKg: 85, reps: 3, label: '85%' })
    })

    it('generates 4 warmup sets for 80kg', () => {
      const sets = generateWarmupSets(80)
      expect(sets).toHaveLength(4)
      expect(sets[0].weightKg).toBe(0)
      expect(sets[0].reps).toBe(10)
      expect(sets[1].weightKg).toBe(40)   // 80*0.5 = 40
      expect(sets[1].reps).toBe(8)
      expect(sets[2].weightKg).toBe(55)   // 80*0.7 = 56 -> nearest 2.5 = 55
      expect(sets[2].reps).toBe(5)
      expect(sets[3].weightKg).toBe(67.5) // 80*0.85 = 68 -> nearest 2.5 = 67.5
      expect(sets[3].reps).toBe(3)
    })

    it('generates 4 sets for weight just above 20kg', () => {
      const sets = generateWarmupSets(21)
      expect(sets).toHaveLength(4)
      expect(sets[0].weightKg).toBe(0)
      expect(sets[1].weightKg).toBe(10) // 21*0.5 = 10.5 -> 10
      expect(sets[2].weightKg).toBe(15) // 21*0.7 = 14.7 -> 15
      expect(sets[3].weightKg).toBe(17.5) // 21*0.85 = 17.85 -> 17.5
    })

    it('has correct reps progression: 10, 8, 5, 3', () => {
      const sets = generateWarmupSets(60)
      expect(sets.map(s => s.reps)).toEqual([10, 8, 5, 3])
    })

    it('has correct labels', () => {
      const sets = generateWarmupSets(60)
      expect(sets.map(s => s.label)).toEqual(['Barre à vide', '50%', '70%', '85%'])
    })
  })

  describe('light weight (8-20kg) — abbreviated warmup', () => {
    it('generates 2 warmup sets for 14kg', () => {
      const sets = generateWarmupSets(14)
      expect(sets).toHaveLength(2)
      expect(sets[0]).toEqual({ weightKg: 0, reps: 10, label: 'Sans poids' })
      expect(sets[1].weightKg).toBe(7.5) // 14*0.5 = 7 -> 7.5
      expect(sets[1].reps).toBe(8)
      expect(sets[1].label).toBe('50%')
    })

    it('generates 2 warmup sets for 20kg (boundary)', () => {
      const sets = generateWarmupSets(20)
      expect(sets).toHaveLength(2)
      expect(sets[0].weightKg).toBe(0)
      expect(sets[1].weightKg).toBe(10) // 20*0.5 = 10
    })

    it('generates 2 sets for 8kg (boundary)', () => {
      // 8 * 0.5 = 4 -> rounded to 5.0 (nearest 2.5) which is > 0
      const sets = generateWarmupSets(8)
      expect(sets).toHaveLength(2)
      expect(sets[0].weightKg).toBe(0)
      expect(sets[0].reps).toBe(10)
      expect(sets[1].weightKg).toBe(5) // 4 -> nearest 2.5 = 5
      expect(sets[1].reps).toBe(8)
    })
  })

  describe('very light weight (<8kg) — minimal warmup', () => {
    it('generates 1 warmup set for 4kg', () => {
      const sets = generateWarmupSets(4)
      expect(sets).toHaveLength(1)
      expect(sets[0]).toEqual({ weightKg: 0, reps: 10, label: 'Sans poids' })
    })

    it('generates 1 warmup set for 7kg', () => {
      const sets = generateWarmupSets(7)
      expect(sets).toHaveLength(1)
      expect(sets[0].weightKg).toBe(0)
    })

    it('generates 1 warmup set for 1kg', () => {
      const sets = generateWarmupSets(1)
      expect(sets).toHaveLength(1)
      expect(sets[0].weightKg).toBe(0)
    })
  })

  describe('zero / negative weight — no warmup', () => {
    it('returns empty array for 0kg', () => {
      const sets = generateWarmupSets(0)
      expect(sets).toHaveLength(0)
    })

    it('returns empty array for negative weight', () => {
      const sets = generateWarmupSets(-5)
      expect(sets).toHaveLength(0)
    })
  })

  describe('available weights rounding', () => {
    it('rounds to nearest available weight for heavy exercise', () => {
      const available = [20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90]
      const sets = generateWarmupSets(100, available)
      expect(sets).toHaveLength(4)
      expect(sets[0].weightKg).toBe(0) // empty bar not affected
      expect(sets[1].weightKg).toBe(50) // 50% = 50 -> exact match
      expect(sets[2].weightKg).toBe(70) // 70% = 70 -> exact match
      expect(sets[3].weightKg).toBe(85) // 85% = 85 -> exact match
    })

    it('rounds to nearest when exact weight not available', () => {
      const available = [20, 30, 40, 50, 60, 70, 80]
      const sets = generateWarmupSets(100, available)
      expect(sets[1].weightKg).toBe(50) // 50% = 50 -> exact
      expect(sets[2].weightKg).toBe(70) // 70% = 70 -> exact
      expect(sets[3].weightKg).toBe(80) // 85% = 85 -> nearest is 80
    })

    it('rounds to nearest available weight for light exercise', () => {
      const available = [2, 4, 6, 8, 10, 12]
      const sets = generateWarmupSets(18, available)
      expect(sets).toHaveLength(2) // light weight
      expect(sets[0].weightKg).toBe(0)
      expect(sets[1].weightKg).toBe(8) // 50% of 18 = 9 -> nearest available is 8 (tie broken by order)
    })

    it('handles sparse available weights', () => {
      const available = [20, 60, 100]
      const sets = generateWarmupSets(100, available)
      expect(sets[1].weightKg).toBe(60) // 50% = 50 -> nearest is 60
      expect(sets[2].weightKg).toBe(60) // 70% = 70 -> nearest is 60
      expect(sets[3].weightKg).toBe(100) // 85% = 85 -> nearest is 100
    })

    it('uses 2.5kg rounding when no available weights provided', () => {
      const sets = generateWarmupSets(33)
      // 50% of 33 = 16.5 -> 17.5 (nearest 2.5)
      expect(sets[1].weightKg).toBe(17.5)
      // 70% of 33 = 23.1 -> 22.5 (nearest 2.5)
      expect(sets[2].weightKg).toBe(22.5)
      // 85% of 33 = 28.05 -> 27.5 (nearest 2.5)
      expect(sets[3].weightKg).toBe(27.5)
    })
  })

  describe('return type structure', () => {
    it('returns WarmupSet objects with weight, reps, and label', () => {
      const sets = generateWarmupSets(80)
      for (const set of sets) {
        expect(set).toHaveProperty('weightKg')
        expect(set).toHaveProperty('reps')
        expect(set).toHaveProperty('label')
        expect(typeof set.weightKg).toBe('number')
        expect(typeof set.reps).toBe('number')
        expect(typeof set.label).toBe('string')
      }
    })

    it('all weights are non-negative', () => {
      const sets = generateWarmupSets(100)
      for (const set of sets) {
        expect(set.weightKg).toBeGreaterThanOrEqual(0)
      }
    })

    it('all reps are positive', () => {
      const sets = generateWarmupSets(100)
      for (const set of sets) {
        expect(set.reps).toBeGreaterThan(0)
      }
    })
  })
})
