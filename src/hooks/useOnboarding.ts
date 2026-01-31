import { useState } from 'react'
import { db } from '../db'
import type { HealthCondition, GymEquipment, Goal } from '../db/types'

export interface OnboardingState {
  step: number
  body: { name: string; height: number; weight: number; age: number; sex: 'male' | 'female' }
  conditions: Omit<HealthCondition, 'id' | 'userId' | 'createdAt'>[]
  equipment: Omit<GymEquipment, 'id' | 'userId'>[]
  goals: Goal[]
  daysPerWeek: number
  minutesPerSession: number
  programText: string
}

const initialState: OnboardingState = {
  step: 1,
  body: { name: '', height: 170, weight: 70, age: 25, sex: 'male' },
  conditions: [],
  equipment: [],
  goals: [],
  daysPerWeek: 3,
  minutesPerSession: 60,
  programText: '',
}

export function useOnboarding() {
  const [state, setState] = useState<OnboardingState>(initialState)
  const totalSteps = 6

  const nextStep = () => setState(s => ({ ...s, step: Math.min(s.step + 1, totalSteps) }))
  const prevStep = () => setState(s => ({ ...s, step: Math.max(s.step - 1, 1) }))
  const updateBody = (body: OnboardingState['body']) => setState(s => ({ ...s, body }))
  const updateConditions = (conditions: OnboardingState['conditions']) => setState(s => ({ ...s, conditions }))
  const updateEquipment = (equipment: OnboardingState['equipment']) => setState(s => ({ ...s, equipment }))
  const updateGoals = (goals: Goal[]) => setState(s => ({ ...s, goals }))
  const updateSchedule = (daysPerWeek: number, minutesPerSession: number) =>
    setState(s => ({ ...s, daysPerWeek, minutesPerSession }))
  const updateProgramText = (programText: string) => setState(s => ({ ...s, programText }))

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
    })

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

    return userId
  }

  return {
    state, totalSteps,
    nextStep, prevStep,
    updateBody, updateConditions, updateEquipment,
    updateGoals, updateSchedule, updateProgramText,
    submit,
  }
}
