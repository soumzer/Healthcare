import { useState } from 'react'

interface WeightPickerProps {
  currentWeightKg: number
  prescribedReps: number
  availableWeights?: number[]
  onSelect: (weightKg: number, adjustedReps: number) => void
  onCancel: () => void
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
  availableWeights,
  onSelect,
  onCancel,
}: WeightPickerProps) {
  const [customWeight, setCustomWeight] = useState('')

  // Use actual available weights if provided, otherwise generate nearby options
  let options: number[]
  if (availableWeights && Array.isArray(availableWeights) && availableWeights.length > 0) {
    // Show available weights that are different from the current prescribed weight
    options = availableWeights.filter((w) => Math.abs(w - currentWeightKg) > 0.1)
    // Sort by distance from current weight (closest first)
    options.sort((a, b) => Math.abs(a - currentWeightKg) - Math.abs(b - currentWeightKg))
    // Limit to 8 closest options
    options = options.slice(0, 8)
    // Re-sort ascending for display
    options.sort((a, b) => a - b)
  } else {
    // Fallback: generate nearby weight options (2.5kg increments around current)
    options = []
    const step = 2.5
    if (currentWeightKg === 0) {
      // Bodyweight exercise: offer options starting from 0 (bodyweight), then weighted
      options = [0, 2.5, 5, 7.5, 10, 12.5, 15, 20]
    } else {
      for (let i = -4; i <= 4; i++) {
        if (i === 0) continue // skip current weight
        const w = currentWeightKg + i * step
        if (w >= 0) options.push(w) // Include 0 for bodyweight option
      }
    }
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
    // Validate: min 0, max 500kg (reasonable bounds)
    const MAX_WEIGHT_KG = 500
    if (!isNaN(weight) && weight >= 0 && weight <= MAX_WEIGHT_KG && isFinite(weight)) {
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

        <p className="text-zinc-400 text-sm mb-3">
          {availableWeights && availableWeights.length > 0
            ? 'Poids disponibles :'
            : 'Poids proches :'}
        </p>
        <div className="grid grid-cols-4 gap-2 mb-6">
          {options.map((w) => (
            <button
              key={w}
              onClick={() => handleSelect(w)}
              aria-label={`Sélectionner ${w} kilogrammes`}
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
              className="flex-1 bg-zinc-900 text-white text-xl text-center rounded-xl py-3 border border-zinc-700 focus:border-emerald-400 focus:outline-none"
            />
            <button
              onClick={handleCustom}
              className="bg-white text-black font-semibold rounded-xl px-6 py-3"
            >
              OK
            </button>
          </div>
        </div>

        <button
          onClick={onCancel}
          className="w-full py-4 text-zinc-400 text-base mt-4"
        >
          Garder {currentWeightKg}kg
        </button>
      </div>
    </div>
  )
}
