import type { useOnboarding } from '../../hooks/useOnboarding'

type Props = ReturnType<typeof useOnboarding>

const daysOptions = [1, 2, 3, 4, 5, 6, 7]
const minutesOptions = [30, 45, 60, 75, 90, 120]

export default function StepSchedule({ state, updateSchedule, nextStep, prevStep }: Props) {
  return (
    <div className="space-y-5">
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
              onClick={() => updateSchedule(d, state.minutesPerSession)}
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

      <div>
        <label className="block text-sm text-zinc-400 mb-3">
          Minutes par séance : <span className="text-white font-semibold">{state.minutesPerSession}</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {minutesOptions.map(m => (
            <button
              key={m}
              type="button"
              onClick={() => updateSchedule(state.daysPerWeek, m)}
              className={`py-3 rounded-lg text-center font-medium transition-colors ${
                state.minutesPerSession === m
                  ? 'bg-white text-black'
                  : 'bg-zinc-800 text-white'
              }`}
            >
              {m} min
            </button>
          ))}
        </div>
      </div>

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
    </div>
  )
}
