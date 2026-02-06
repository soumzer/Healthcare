import type { useOnboarding } from '../../hooks/useOnboarding'

type Props = ReturnType<typeof useOnboarding>

const daysOptions = [1, 2, 3, 4, 5, 6, 7]

export default function StepSchedule({ state, updateSchedule, nextStep, prevStep }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-5">
        <h2 className="text-xl font-bold">Planning</h2>

        <div>
          <label className="block text-sm text-zinc-400 mb-3">
            Jours par semaine: <span className="text-white font-semibold">{state.daysPerWeek}</span>
          </label>
          <div className="flex gap-2">
            {daysOptions.map(d => (
              <button
                key={d}
                type="button"
                onClick={() => updateSchedule(d, 75)}
                className={`flex-1 py-3 rounded-lg text-center font-medium transition-colors ${
                  state.daysPerWeek === d
                    ? 'bg-white text-black'
                    : 'bg-zinc-800 text-white'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <p className="text-zinc-500 text-sm">
          Durée des séances : 75 minutes (optimal pour une séance complète)
        </p>
      </div>

      <div className="flex-shrink-0 pt-4 pb-2">
        <div className="flex gap-3">
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
      </div>
    </div>
  )
}
