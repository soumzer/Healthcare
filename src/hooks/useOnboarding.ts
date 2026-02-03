import { useState } from 'react'
import { db } from '../db'
import type { HealthCondition, GymEquipment, Goal, Exercise } from '../db/types'
import { generateProgram } from '../engine/program-generator'

export interface KnownWeight {
  label: string
  matchFragment: string
  weightKg: number
}

export const COMMON_EXERCISES_FOR_WEIGHTS: Omit<KnownWeight, 'weightKg'>[] = [
  { label: 'Leg press', matchFragment: 'leg press' },
  { label: 'Leg curl', matchFragment: 'leg curl' },
  { label: 'Leg extension', matchFragment: 'leg extension' },
  { label: 'Développé couché (haltères)', matchFragment: 'développé couché' },
  { label: 'Développé militaire', matchFragment: 'développé militaire' },
  { label: 'Rowing câble / tirage horizontal', matchFragment: 'rowing câble' },
  { label: 'Lat pulldown', matchFragment: 'lat pulldown' },
  { label: 'Face pull', matchFragment: 'face pull' },
  { label: 'Élévations latérales', matchFragment: 'élévations latérales' },
  { label: 'SDT / Soulevé de terre', matchFragment: 'sdt' },
  { label: 'Hip thrust', matchFragment: 'hip thrust' },
  { label: 'Rowing haltère unilatéral', matchFragment: 'rowing haltère' },
  { label: 'Curl biceps', matchFragment: 'curl biceps' },
  { label: 'Mollets (calf raise)', matchFragment: 'mollets' },
]

export interface OnboardingState {
  step: number
  body: { name: string; height: number; weight: number; age: number; sex: 'male' | 'female' }
  conditions: Omit<HealthCondition, 'id' | 'userId' | 'createdAt'>[]
  equipment: Omit<GymEquipment, 'id' | 'userId'>[]
  goals: Goal[]
  daysPerWeek: number
  minutesPerSession: number
  programText: string
  knownWeights: KnownWeight[]
}

const initialState: OnboardingState = {
  step: 1,
  body: { name: '', height: 170, weight: 70, age: 25, sex: 'male' },
  conditions: [],
  equipment: [],
  goals: [],
  daysPerWeek: 3,
  minutesPerSession: 75,
  programText: '',
  knownWeights: COMMON_EXERCISES_FOR_WEIGHTS.map(e => ({ ...e, weightKg: 0 })),
}

export function useOnboarding() {
  const [state, setState] = useState<OnboardingState>(initialState)
  const totalSteps = 7

  const nextStep = () => setState(s => ({ ...s, step: Math.min(s.step + 1, totalSteps) }))
  const prevStep = () => setState(s => ({ ...s, step: Math.max(s.step - 1, 1) }))
  const updateBody = (body: OnboardingState['body']) => setState(s => ({ ...s, body }))
  const updateConditions = (conditions: OnboardingState['conditions']) => setState(s => ({ ...s, conditions }))
  const updateEquipment = (equipment: OnboardingState['equipment']) => setState(s => ({ ...s, equipment }))
  const updateGoals = (goals: Goal[]) => setState(s => ({ ...s, goals }))
  const updateSchedule = (daysPerWeek: number, minutesPerSession: number) =>
    setState(s => ({ ...s, daysPerWeek, minutesPerSession }))
  const updateProgramText = (programText: string) => setState(s => ({ ...s, programText }))
  const updateKnownWeights = (knownWeights: KnownWeight[]) => setState(s => ({ ...s, knownWeights }))

  const submit = async () => {
    const now = new Date()
    const userId = await db.userProfiles.add({
      name: state.body.name,
      height: state.body.height,
      weight: state.body.weight,
      age: state.body.age,
      sex: state.body.sex,
      goals: state.goals,
      daysPerWeek: state.daysPerWeek,
      minutesPerSession: state.minutesPerSession,
      createdAt: now,
      updatedAt: now,
    }) as number

    if (state.conditions.length > 0) {
      await db.healthConditions.bulkAdd(
        state.conditions.map(c => ({ ...c, userId, createdAt: now }))
      )
    }

    if (state.equipment.length > 0) {
      await db.gymEquipment.bulkAdd(
        state.equipment.map(e => ({ ...e, userId }))
      )
    }

    // Save available weights from dumbbell range (stored in notes as JSON)
    const dumbbellEquipment = state.equipment.find(e => e.name === 'dumbbell')
    if (dumbbellEquipment?.notes) {
      try {
        const range = JSON.parse(dumbbellEquipment.notes) as { min: number; max: number; step: number }
        const weights = []
        for (let w = range.min; w <= range.max; w += range.step) {
          weights.push({
            userId,
            equipmentType: 'dumbbell' as const,
            weightKg: w,
            isAvailable: true,
          })
        }
        if (weights.length > 0) {
          await db.availableWeights.bulkAdd(weights)
        }
      } catch { /* invalid JSON — skip */ }
    }

    // --- Generate workout program ---

    // 1. Load the exercise catalog from the database
    const exerciseCatalog = await db.exercises.toArray()

    // 2. Build the full GymEquipment list for the generator
    //    (add userId to the onboarding equipment items)
    const equipmentForGenerator: GymEquipment[] = state.equipment.map(e => ({
      ...e,
      userId,
    }))

    // 3. Build full HealthCondition list for the generator
    const conditionsForGenerator: HealthCondition[] = state.conditions.map(c => ({
      ...c,
      userId,
      createdAt: now,
    }))

    // 4. Call the program generator
    const generatedProgram = generateProgram(
      {
        userId,
        goals: state.goals,
        conditions: conditionsForGenerator,
        equipment: equipmentForGenerator,
        availableWeights: [],
        daysPerWeek: state.daysPerWeek,
        minutesPerSession: state.minutesPerSession,
      },
      exerciseCatalog,
    )

    // 5. Save the generated program to the database
    const _programId = await db.workoutPrograms.add({
      userId,
      name: generatedProgram.name,
      type: generatedProgram.type,
      sessions: generatedProgram.sessions,
      isActive: true,
      createdAt: new Date(),
    })

    // 6. Save initial ExerciseProgress entries for known weights
    const weightsToSeed = state.knownWeights.filter(kw => kw.weightKg > 0)
    if (weightsToSeed.length > 0) {
      await seedKnownWeights(userId, _programId as number, weightsToSeed, exerciseCatalog, generatedProgram)
    }

    return userId
  }

  return {
    state, totalSteps,
    nextStep, prevStep,
    updateBody, updateConditions, updateEquipment,
    updateGoals, updateSchedule, updateProgramText,
    updateKnownWeights,
    submit,
  }
}

/** Match known weights to exercises in the generated program and seed ExerciseProgress entries */
async function seedKnownWeights(
  userId: number,
  _programId: number,
  knownWeights: KnownWeight[],
  catalog: Exercise[],
  program: { sessions: { exercises: { exerciseId: number; sets: number; targetReps: number }[] }[] },
) {
  // Collect all exercise IDs used in the program
  const programExerciseIds = new Set<number>()
  for (const session of program.sessions) {
    for (const pe of session.exercises) {
      programExerciseIds.add(pe.exerciseId)
    }
  }

  // Build a name → exercise lookup from the catalog (only program exercises)
  const programExercises = catalog.filter(e => programExerciseIds.has(e.id ?? 0))

  const progressEntries = []
  const now = new Date()

  for (const kw of knownWeights) {
    const fragment = kw.matchFragment.toLowerCase()
    // Find the first matching exercise in the program
    const match = programExercises.find(e => e.name.toLowerCase().includes(fragment))
    if (!match) continue

    // Find the ProgramExercise to get sets/reps info
    let sets = 3
    let reps = 10
    for (const session of program.sessions) {
      const pe = session.exercises.find(e => e.exerciseId === match.id)
      if (pe) {
        sets = pe.sets
        reps = pe.targetReps
        break
      }
    }

    progressEntries.push({
      userId,
      exerciseId: match.id!,
      exerciseName: match.name,
      date: now,
      sessionId: 0, // No real session yet — seed entry
      weightKg: kw.weightKg,
      reps,
      sets,
      avgRepsInReserve: 2, // Assume moderate difficulty
      avgRestSeconds: 120,
      exerciseOrder: 1,
      phase: 'hypertrophy' as const,
      weekNumber: 0,
      prescribedReps: reps,
      prescribedRestSeconds: 120,
    })
  }

  if (progressEntries.length > 0) {
    await db.exerciseProgress.bulkAdd(progressEntries)
  }
}
