export interface WarmupSet {
  weightKg: number
  reps: number
  label: string
}

export function generateWarmupSets(workingWeightKg: number): WarmupSet[] {
  if (workingWeightKg <= 20) {
    return [{ weightKg: 0, reps: 15, label: 'Sans poids' }]
  }

  return [
    { weightKg: 0, reps: 10, label: 'Barre à vide' },
    { weightKg: Math.round(workingWeightKg * 0.5), reps: 8, label: '50%' },
    { weightKg: Math.round(workingWeightKg * 0.7), reps: 5, label: '70%' },
    { weightKg: Math.round(workingWeightKg * 0.85), reps: 3, label: '85%' },
  ]
}
