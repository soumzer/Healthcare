import { useState } from 'react'

interface WeightPickerProps {
  currentWeightKg: number
  prescribedReps: number
  onSelect: (weightKg: number, adjustedReps: number) => void
}

function adjustRepsForWeight(
  originalWeight: number,
  originalReps: number,
  newWeight: number
): number {
  if (originalWeight === 0 || newWeight === 0) return originalReps
  // Rough approximation: heavier = fewer reps, lighter = more reps
  // Using Epley-like ratio
  const ratio = originalWeight / newWeight
  const adjusted = Math.round(originalReps * ratio)
  return Math.max(1, Math.min(30, adjusted))
}

export default function WeightPicker({
  currentWeightKg,
  prescribedReps,
  onSelect,
}: WeightPickerProps) {
  const [customWeight, setCustomWeight] = useState('')

  // Generate nearby weight options (2.5kg increments around current)
  const options: number[] = []
  const step = 2.5
  for (let i = -4; i <= 4; i++) {
    if (i === 0) continue // skip current weight
    const w = currentWeightKg + i * step
    if (w > 0) options.push(w)
  }

  const handleSelect = (weight: number) => {
    const adjustedReps = adjustRepsForWeight(
      currentWeightKg,
      prescribedReps,
      weight
    )
    onSelect(weight, adjustedReps)
  }

  const handleCustom = () => {
    const weight = parseFloat(customWeight)
    if (weight > 0) {
      handleSelect(weight)
    }
  }

  return (
    <div className="flex flex-col min-h-[80vh] p-4">
      <div className="flex-1">
        <p className="text-zinc-400 text-sm uppercase tracking-wider text-center mb-2">
          Poids non disponible
        </p>
        <p className="text-xl font-bold text-center mb-8">
          {currentWeightKg}kg non disponible
        </p>

        <p className="text-zinc-400 text-sm mb-3">Poids disponibles :</p>
        <div className="grid grid-cols-4 gap-2 mb-6">
          {options.map((w) => (
            <button
              key={w}
              onClick={() => handleSelect(w)}
              className="bg-zinc-800 text-white rounded-xl py-3 text-center font-semibold"
            >
              {w}
            </button>
          ))}
        </div>

        <div>
          <label className="block text-zinc-400 text-sm mb-2">Autre :</label>
          <div className="flex gap-3">
            <input
              type="number"
              inputMode="decimal"
              step="0.5"
              placeholder="kg"
              value={customWeight}
              onChange={(e) => setCustomWeight(e.target.value)}
              className="flex-1 bg-zinc-900 text-white text-xl text-center rounded-xl py-3 border border-zinc-700 focus:border-white focus:outline-none"
            />
            <button
              onClick={handleCustom}
              className="bg-white text-black font-semibold rounded-xl px-6 py-3"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
