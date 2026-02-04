import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './index'
import type { UserProfile } from './types'

describe('HealthCoachDB', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('creates a user profile', async () => {
    const profile: UserProfile = {
      name: 'Test User',
      height: 196,
      weight: 112,
      age: 30,
      sex: 'male',
      daysPerWeek: 4,
      minutesPerSession: 90,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const id = await db.userProfiles.add(profile)
    const saved = await db.userProfiles.get(id)
    expect(saved).toBeDefined()
    expect(saved!.name).toBe('Test User')
    expect(saved!.height).toBe(196)
  })

  it('creates a health condition linked to user', async () => {
    const userId = await db.userProfiles.add({
      name: 'Test', height: 196, weight: 112, age: 30, sex: 'male',
      daysPerWeek: 4, minutesPerSession: 90,
      createdAt: new Date(), updatedAt: new Date(),
    }) as number
    await db.healthConditions.add({
      userId, bodyZone: 'elbow_right', label: 'Golf elbow',
      diagnosis: 'Epicondylite mediale', painLevel: 6,
      since: '1 an', notes: 'Douleur en poussant',
      isActive: true, createdAt: new Date(),
    })
    const conditions = await db.healthConditions.where('userId').equals(userId).toArray()
    expect(conditions).toHaveLength(1)
    expect(conditions[0].bodyZone).toBe('elbow_right')
    expect(conditions[0].label).toBe('Golf elbow')
  })
})
