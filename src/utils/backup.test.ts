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
    await db.notebookEntries.add({
      userId,
      exerciseId: 1,
      exerciseName: 'Bench Press',
      date: new Date(),
      sessionIntensity: 'heavy',
      sets: [{ weightKg: 80, reps: 6 }, { weightKg: 80, reps: 5 }],
      skipped: false,
    })
    await db.painReports.add({
      userId,
      zone: 'elbow_right',
      date: new Date(),
      fromExerciseName: 'Curl biceps',
      accentDaysRemaining: 3,
    })
    return userId
  }

  it('exports all user data as JSON', async () => {
    const userId = await seedUser()
    const json = await exportData(userId)
    const data = JSON.parse(json)

    expect(data.version).toBe(2)
    expect(data.exportedAt).toBeDefined()
    expect(data.profile.name).toBe('Yassine')
    expect(data.conditions).toHaveLength(1)
    expect(data.conditions[0].label).toBe('Golf elbow')
    expect(data.equipment).toHaveLength(1)
    expect(data.equipment[0].name).toBe('Banc plat')
    expect(data.notebookEntries).toHaveLength(1)
    expect(data.notebookEntries[0].exerciseName).toBe('Bench Press')
    expect(data.notebookEntries[0].sets).toHaveLength(2)
    expect(data.painReports).toHaveLength(1)
    expect(data.painReports[0].zone).toBe('elbow_right')
    expect(data.programs).toHaveLength(0)
    expect(data.sessions).toHaveLength(0)
  })

  it('throws when exporting non-existent user', async () => {
    await expect(exportData(999)).rejects.toThrow('Profil utilisateur introuvable')
  })

  it('imports data from exported JSON', async () => {
    const userId = await seedUser()
    const json = await exportData(userId)

    await db.delete()
    await db.open()

    const newUserId = await importData(json)
    expect(newUserId).toBeDefined()

    const profile = await db.userProfiles.get(newUserId)
    expect(profile).toBeDefined()
    expect(profile!.name).toBe('Yassine')
    expect(profile!.height).toBe(196)

    const conditions = await db.healthConditions.where('userId').equals(newUserId).toArray()
    expect(conditions).toHaveLength(1)
    expect(conditions[0].label).toBe('Golf elbow')

    const equipment = await db.gymEquipment.where('userId').equals(newUserId).toArray()
    expect(equipment).toHaveLength(1)

    const entries = await db.notebookEntries.where('userId').equals(newUserId).toArray()
    expect(entries).toHaveLength(1)
    expect(entries[0].exerciseName).toBe('Bench Press')
    expect(entries[0].sets).toHaveLength(2)

    const reports = await db.painReports.where('userId').equals(newUserId).toArray()
    expect(reports).toHaveLength(1)
    expect(reports[0].zone).toBe('elbow_right')
  })

  it('import clears existing data', async () => {
    const userId = await seedUser()
    const json = await exportData(userId)

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

    const beforeImport = await db.healthConditions.toArray()
    expect(beforeImport).toHaveLength(2)

    const newUserId = await importData(json)

    const afterImport = await db.healthConditions.where('userId').equals(newUserId).toArray()
    expect(afterImport).toHaveLength(1)
    expect(afterImport[0].label).toBe('Golf elbow')
  })

  it('rejects invalid version', async () => {
    const json = JSON.stringify({ version: 99, profile: { name: 'Test' } })
    await expect(importData(json)).rejects.toThrow('Version de backup non supportée')
  })

  it('rejects invalid JSON', async () => {
    await expect(importData('not valid json')).rejects.toThrow()
  })
})
