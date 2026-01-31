import { describe, it, expect } from 'vitest'
import { generateWarmupSets } from './warmup'

describe('generateWarmupSets', () => {
  it('generates progressive warmup for heavy weight', () => {
    const sets = generateWarmupSets(80)
    expect(sets).toHaveLength(4)
    expect(sets[0].weightKg).toBe(0)
    expect(sets[1].weightKg).toBe(40)
    expect(sets[2].weightKg).toBe(56)
    expect(sets[3].weightKg).toBe(68)
  })

  it('returns single set for light working weight', () => {
    const sets = generateWarmupSets(10)
    expect(sets).toHaveLength(1)
    expect(sets[0].label).toBe('Sans poids')
  })

  it('handles edge case at 20kg', () => {
    const sets = generateWarmupSets(20)
    expect(sets).toHaveLength(1)
  })

  it('generates 4 sets for weight above 20', () => {
    const sets = generateWarmupSets(21)
    expect(sets).toHaveLength(4)
  })
})
