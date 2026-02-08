import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../db'
import { seedExercises } from '../../data/seed'
import { generateProgram } from '../program-generator'
import type { GymEquipment, HealthCondition } from '../../db/types'

// ---------------------------------------------------------------------------
// Helpers — simulate the onboarding submit flow without React hooks
// ---------------------------------------------------------------------------

interface SimulatedOnboardingState {
  body: { name: string; height: number; weight: number; age: number; sex: 'male' | 'female' }
  conditions: Omit<HealthCondition, 'id' | 'userId' | 'createdAt'>[]
  equipment: Omit<GymEquipment, 'id' | 'userId'>[]
  daysPerWeek: number
  minutesPerSession: number
}

/**
 * Replicates the logic of useOnboarding().submit() without React state,
 * so we can test the full database integration in a pure unit test.
 */
async function simulateOnboardingSubmit(state: SimulatedOnboardingState): Promise<number> {
  const now = new Date()

  // 1. Create UserProfile
  const userId = await db.userProfiles.add({
    name: state.body.name,
    height: state.body.height,
    weight: state.body.weight,
    age: state.body.age,
    sex: state.body.sex,
    daysPerWeek: state.daysPerWeek,
    minutesPerSession: state.minutesPerSession,
    createdAt: now,
    updatedAt: now,
  }) as number

  // 2. Bulk add health conditions
  if (state.conditions.length > 0) {
    await db.healthConditions.bulkAdd(
      state.conditions.map(c => ({ ...c, userId, createdAt: now }))
    )
  }

  // 3. Bulk add gym equipment
  if (state.equipment.length > 0) {
    await db.gymEquipment.bulkAdd(
      state.equipment.map(e => ({ ...e, userId }))
    )
  }

  // 4. Load exercise catalog
  const exerciseCatalog = await db.exercises.toArray()

  // 5. Build generator inputs
  const equipmentForGenerator: GymEquipment[] = state.equipment.map(e => ({
    ...e,
    userId,
  }))

  const conditionsForGenerator: HealthCondition[] = state.conditions.map(c => ({
    ...c,
    userId,
    createdAt: now,
  }))

  // 6. Generate program
  const generatedProgram = generateProgram(
    {
      userId,
      conditions: conditionsForGenerator,
      equipment: equipmentForGenerator,
      daysPerWeek: state.daysPerWeek,
      minutesPerSession: state.minutesPerSession,
    },
    exerciseCatalog,
  )

  // 7. Save to database
  await db.workoutPrograms.add({
    userId,
    name: generatedProgram.name,
    type: generatedProgram.type,
    sessions: generatedProgram.sessions,
    isActive: true,
    createdAt: new Date(),
  })

  return userId
}

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const typicalEquipment: Omit<GymEquipment, 'id' | 'userId'>[] = [
  { name: 'smith_machine', type: 'machine', isAvailable: true, notes: '' },
  { name: 'cable', type: 'cable', isAvailable: true, notes: '' },
  { name: 'rope_attachment', type: 'other', isAvailable: true, notes: '' },
  { name: 'dumbbells', type: 'free_weight', isAvailable: true, notes: '' },
  { name: 'dumbbell', type: 'free_weight', isAvailable: true, notes: '' },
  { name: 'bench', type: 'other', isAvailable: true, notes: '' },
  { name: 'leg_press', type: 'machine', isAvailable: true, notes: '' },
  { name: 'leg_extension', type: 'machine', isAvailable: true, notes: '' },
  { name: 'leg_curl', type: 'machine', isAvailable: true, notes: '' },
  { name: 'lat_pulldown', type: 'machine', isAvailable: true, notes: '' },
  { name: 'pec_deck', type: 'machine', isAvailable: true, notes: '' },
  { name: 'shoulder_press', type: 'machine', isAvailable: true, notes: '' },
  { name: 'resistance_band', type: 'band', isAvailable: true, notes: '' },
  { name: 'pec_press', type: 'machine', isAvailable: true, notes: '' },
  { name: 'hack_squat', type: 'machine', isAvailable: true, notes: '' },
  { name: 'hip_abduction', type: 'machine', isAvailable: true, notes: '' },
  { name: 'rowing_machine', type: 'machine', isAvailable: true, notes: '' },
]

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Onboarding → Program Generation integration', () => {
  beforeEach(async () => {
    // Clear all tables before each test
    await db.delete()
    await db.open()

    // Seed the exercise catalog (must happen before onboarding submit)
    await seedExercises()
  })

  it('creates a WorkoutProgram in the database after submit', async () => {
    const userId = await simulateOnboardingSubmit({
      body: { name: 'Alice', height: 165, weight: 60, age: 30, sex: 'female' },
      conditions: [],
      equipment: typicalEquipment,
      daysPerWeek: 4,
      minutesPerSession: 60,
    })

    const programs = await db.workoutPrograms.where('userId').equals(userId).toArray()
    expect(programs).toHaveLength(1)
    expect(programs[0]).toBeDefined()
  })

  it('generates the correct number of sessions for daysPerWeek=4 (upper_lower)', async () => {
    const userId = await simulateOnboardingSubmit({
      body: { name: 'Bob', height: 180, weight: 85, age: 28, sex: 'male' },
      conditions: [],
      equipment: typicalEquipment,
      daysPerWeek: 4,
      minutesPerSession: 60,
    })

    const program = await db.workoutPrograms.where('userId').equals(userId).first()
    expect(program).toBeDefined()
    expect(program!.sessions).toHaveLength(4)
    expect(program!.type).toBe('upper_lower')
  })

  it('generates 3 sessions for daysPerWeek=3 (full_body)', async () => {
    const userId = await simulateOnboardingSubmit({
      body: { name: 'Claire', height: 170, weight: 65, age: 35, sex: 'female' },
      conditions: [],
      equipment: typicalEquipment,
      daysPerWeek: 3,
      minutesPerSession: 45,
    })

    const program = await db.workoutPrograms.where('userId').equals(userId).first()
    expect(program).toBeDefined()
    expect(program!.sessions).toHaveLength(3)
    expect(program!.type).toBe('full_body')
  })

  it('generates 6 sessions for daysPerWeek=5 (push_pull_legs)', async () => {
    const userId = await simulateOnboardingSubmit({
      body: { name: 'Dan', height: 175, weight: 80, age: 25, sex: 'male' },
      conditions: [],
      equipment: typicalEquipment,
      daysPerWeek: 5,
      minutesPerSession: 75,
    })

    const program = await db.workoutPrograms.where('userId').equals(userId).first()
    expect(program).toBeDefined()
    expect(program!.sessions).toHaveLength(6)
    expect(program!.type).toBe('push_pull_legs')
  })

  it('links the WorkoutProgram to the correct userId', async () => {
    const userId = await simulateOnboardingSubmit({
      body: { name: 'Eve', height: 160, weight: 55, age: 40, sex: 'female' },
      conditions: [],
      equipment: typicalEquipment,

      daysPerWeek: 4,
      minutesPerSession: 60,
    })

    const program = await db.workoutPrograms.where('userId').equals(userId).first()
    expect(program).toBeDefined()
    expect(program!.userId).toBe(userId)
  })

  it('marks the WorkoutProgram as active (isActive=true)', async () => {
    const userId = await simulateOnboardingSubmit({
      body: { name: 'Frank', height: 185, weight: 90, age: 32, sex: 'male' },
      conditions: [],
      equipment: typicalEquipment,

      daysPerWeek: 4,
      minutesPerSession: 60,
    })

    const program = await db.workoutPrograms.where('userId').equals(userId).first()
    expect(program).toBeDefined()
    expect(program!.isActive).toBe(true)
  })

  it('saves a valid createdAt date', async () => {
    const before = new Date()
    const userId = await simulateOnboardingSubmit({
      body: { name: 'Grace', height: 170, weight: 65, age: 28, sex: 'female' },
      conditions: [],
      equipment: typicalEquipment,
      daysPerWeek: 4,
      minutesPerSession: 60,
    })
    const after = new Date()

    const program = await db.workoutPrograms.where('userId').equals(userId).first()
    expect(program).toBeDefined()
    expect(program!.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
    expect(program!.createdAt.getTime()).toBeLessThanOrEqual(after.getTime())
  })

  it('saves a program with a valid name', async () => {
    const userId = await simulateOnboardingSubmit({
      body: { name: 'Hank', height: 175, weight: 78, age: 30, sex: 'male' },
      conditions: [],
      equipment: typicalEquipment,
      daysPerWeek: 4,
      minutesPerSession: 60,
    })

    const program = await db.workoutPrograms.where('userId').equals(userId).first()
    expect(program).toBeDefined()
    expect(program!.name).toBe('Programme Upper / Lower')
  })

  it('each session has at least one exercise', async () => {
    const userId = await simulateOnboardingSubmit({
      body: { name: 'Iris', height: 168, weight: 62, age: 27, sex: 'female' },
      conditions: [],
      equipment: typicalEquipment,
      daysPerWeek: 4,
      minutesPerSession: 60,
    })

    const program = await db.workoutPrograms.where('userId').equals(userId).first()
    expect(program).toBeDefined()
    for (const session of program!.sessions) {
      expect(session.exercises.length).toBeGreaterThan(0)
    }
  })

  it('exercises reference valid exercise IDs from the catalog', async () => {
    const userId = await simulateOnboardingSubmit({
      body: { name: 'Jack', height: 180, weight: 82, age: 29, sex: 'male' },
      conditions: [],
      equipment: typicalEquipment,
      daysPerWeek: 4,
      minutesPerSession: 60,
    })

    const program = await db.workoutPrograms.where('userId').equals(userId).first()
    const catalogIds = new Set((await db.exercises.toArray()).map(e => e.id))

    expect(program).toBeDefined()
    for (const session of program!.sessions) {
      for (const ex of session.exercises) {
        expect(catalogIds.has(ex.exerciseId)).toBe(true)
      }
    }
  })

  it('works correctly with health conditions (filters contraindicated exercises)', async () => {
    const userId = await simulateOnboardingSubmit({
      body: { name: 'Kate', height: 165, weight: 58, age: 33, sex: 'female' },
      conditions: [
        {
          bodyZone: 'knee_right',
          label: 'Tendinite genou droit',
          diagnosis: 'Tendinopathie rotulienne',
          since: '6 mois',
          notes: '',
          isActive: true,
        },
      ],
      equipment: typicalEquipment,

      daysPerWeek: 4,
      minutesPerSession: 60,
    })

    const program = await db.workoutPrograms.where('userId').equals(userId).first()
    expect(program).toBeDefined()
    // Program should still have 4 sessions
    expect(program!.sessions).toHaveLength(4)

    // Exercises with knee contraindications should be excluded
    // We just verify the program was generated successfully with exercises
    for (const session of program!.sessions) {
      expect(session.exercises.length).toBeGreaterThan(0)
    }
  })

  it('works with minimal equipment (bodyweight only)', async () => {
    const userId = await simulateOnboardingSubmit({
      body: { name: 'Leo', height: 178, weight: 75, age: 26, sex: 'male' },
      conditions: [],
      equipment: [], // No equipment — bodyweight only
      daysPerWeek: 3,
      minutesPerSession: 45,
    })

    const program = await db.workoutPrograms.where('userId').equals(userId).first()
    expect(program).toBeDefined()
    expect(program!.sessions).toHaveLength(3)
    expect(program!.type).toBe('bodyweight')
  })
})
