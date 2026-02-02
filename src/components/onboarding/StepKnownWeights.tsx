import type { useOnboarding } from '../../hooks/useOnboarding'

type Props = ReturnType<typeof useOnboarding>

export default function StepKnownWeights({ state, updateKnownWeights, nextStep, prevStep }: Props) {
  const setWeight = (index: number, weightKg: number) => {
    const updated = [...state.knownWeights]
    updated[index] = { ...updated[index], weightKg }
    updateKnownWeights(updated)
  }

  const filledCount = state.knownWeights.filter(kw => kw.weightKg > 0).length

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">Vos poids actuels</h2>
      <p className="text-sm text-zinc-400">
        Renseignez les poids que vous utilisez actuellement.
        Laissez vide si vous ne savez pas — vous les ajusterez en séance.
      </p>

      <div className="space-y-3">
        {state.knownWeights.map((kw, i) => (
          <div key={kw.matchFragment} className="flex items-center gap-3">
            <span className="flex-1 text-sm text-zinc-300 truncate">{kw.label}</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                step={0.5}
                value={kw.weightKg || ''}
                onChange={e => setWeight(i, parseFloat(e.target.value) || 0)}
                placeholder="—"
                className="w-20 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm text-right focus:outline-none focus:border-zinc-500"
              />
              <span className="text-xs text-zinc-400">kg</span>
            </div>
          </div>
        ))}
      </div>

      {filledCount > 0 && (
        <p className="text-xs text-zinc-400">
          {filledCount} exercice{filledCount > 1 ? 's' : ''} renseigné{filledCount > 1 ? 's' : ''}
        </p>
      )}

      <div className="flex gap-3 mt-4">
        <button
          type="button"
          onClick={prevStep}
          className="flex-1 bg-zinc-800 text-white font-semibold py-3 rounded-lg"
        >
          Retour
        </button>
        <button
          type="button"
          onClick={nextStep}
          className="flex-1 bg-white text-black font-semibold py-3 rounded-lg"
        >
          Suivant
        </button>
      </div>

      <button
        type="button"
        onClick={nextStep}
        className="w-full text-center text-sm text-zinc-400 py-2"
      >
        Passer
      </button>
    </div>
  )
}
