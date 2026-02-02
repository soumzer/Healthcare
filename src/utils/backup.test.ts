import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db'
import { exportData, importData } from './backup'

describe('backup', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  async function seedUser() {
    const userId = await db.userProfiles.add({
      name: 'Yassine',
      height: 196,
      weight: 112,
      age: 30,
      sex: 'male',
      goals: ['muscle_gain', 'rehab'],
      daysPerWeek: 4,
      minutesPerSession: 90,
      createdAt: new Date(),
      updatedAt: new Date(),
    }) as number
    await db.healthConditions.add({
      userId,
      bodyZone: 'elbow_right',
      label: 'Golf elbow',
      diagnosis: 'Epicondylite mediale',
      painLevel: 6,
      since: '1 an',
      notes: 'Douleur en poussant',
      isActive: true,
      createdAt: new Date(),
    })
    await db.gymEquipment.add({
      userId,
      name: 'Banc plat',
      type: 'free_weight',
      isAvailable: true,
      notes: '',
    })
    await db.availableWeights.add({
      userId,
      equipmentType: 'dumbbell',
      weightKg: 20,
      isAvailable: true,
    })
    await db.painLogs.add({
      userId,
      zone: 'elbow_right',
      level: 4,
      context: 'during_set',
      exerciseName: 'Bench Press',
      date: new Date(),
    })
    await db.trainingPhases.add({
      userId,
      phase: 'hypertrophy',
      startedAt: new Date(),
      weekCount: 4,
    })
    return userId
  }

  it('exports all user data as JSON', async () => {
    const userId = await seedUser()
    const json = await exportData(userId)
    const data = JSON.parse(json)

    expect(data.version).toBe(1)
    expect(data.exportedAt).toBeDefined()
    expect(data.profile.name).toBe('Yassine')
    expect(data.conditions).toHaveLength(1)
    expect(data.conditions[0].label).toBe('Golf elbow')
    expect(data.equipment).toHaveLength(1)
    expect(data.equipment[0].name).toBe('Banc plat')
    expect(data.weights).toHaveLength(1)
    expect(data.weights[0].weightKg).toBe(20)
    expect(data.painLogs).toHaveLength(1)
    expect(data.painLogs[0].zone).toBe('elbow_right')
    expect(data.phases).toHaveLength(1)
    expect(data.phases[0].phase).toBe('hypertrophy')
    expect(data.programs).toHaveLength(0)
    expect(data.sessions).toHaveLength(0)
    expect(data.progress).toHaveLength(0)
  })

  it('throws when exporting non-existent user', async () => {
    await expect(exportData(999)).rejects.toThrow('Profil utilisateur introuvable')
  })

  it('imports data from exported JSON', async () => {
    const userId = await seedUser()
    const json = await exportData(userId)

    // Clear everything
    await db.delete()
    await db.open()

    // Import
    const newUserId = await importData(json)
    expect(newUserId).toBeDefined()

    // Verify all data restored
    const profile = await db.userProfiles.get(newUserId)
    expect(profile).toBeDefined()
    expect(profile!.name).toBe('Yassine')
    expect(profile!.height).toBe(196)

    const conditions = await db.healthConditions.where('userId').equals(newUserId).toArray()
    expect(conditions).toHaveLength(1)
    expect(conditions[0].label).toBe('Golf elbow')

    const equipment = await db.gymEquipment.where('userId').equals(newUserId).toArray()
    expect(equipment).toHaveLength(1)

    const weights = await db.availableWeights.where('userId').equals(newUserId).toArray()
    expect(weights).toHaveLength(1)

    const painLogs = await db.painLogs.where('userId').equals(newUserId).toArray()
    expect(painLogs).toHaveLength(1)

    const phases = await db.trainingPhases.where('userId').equals(newUserId).toArray()
    expect(phases).toHaveLength(1)
  })

  it('import clears existing data', async () => {
    // Seed initial data
    const userId = await seedUser()
    const json = await exportData(userId)

    // Add extra condition that should be wiped on import
    await db.healthConditions.add({
      userId,
      bodyZone: 'knee_left',
      label: 'Tendinite rotulienne',
      diagnosis: 'Tendinopathie',
      painLevel: 5,
      since: '6 mois',
      notes: '',
      isActive: true,
      createdAt: new Date(),
    })

    // Verify we now have 2 conditions
    const beforeImport = await db.healthConditions.toArray()
    expect(beforeImport).toHaveLength(2)

    // Import original backup (with only 1 condition)
    const newUserId = await importData(json)

    const afterImport = await db.healthConditions.where('userId').equals(newUserId).toArray()
    expect(afterImport).toHaveLength(1)
    expect(afterImport[0].label).toBe('Golf elbow')
  })

  it('rejects invalid version', async () => {
    const json = JSON.stringify({ version: 99 })
    await expect(importData(json)).rejects.toThrow('Version de backup non supportée')
  })

  it('rejects invalid JSON', async () => {
    await expect(importData('not valid json')).rejects.toThrow()
  })
})
