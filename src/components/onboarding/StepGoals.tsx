import type { useOnboarding } from '../../hooks/useOnboarding'
import type { Goal } from '../../db/types'

type Props = ReturnType<typeof useOnboarding>

const goalOptions: { value: Goal; label: string }[] = [
  { value: 'weight_loss', label: 'Perte de poids' },
  { value: 'muscle_gain', label: 'Prise de masse' },
  { value: 'rehab', label: 'Reeducation' },
  { value: 'posture', label: 'Ameliorer posture' },
  { value: 'mobility', label: 'Mobilite' },
]

export default function StepGoals({ state, updateGoals, nextStep, prevStep }: Props) {
  const toggleGoal = (goal: Goal) => {
    if (state.goals.includes(goal)) {
      updateGoals(state.goals.filter(g => g !== goal))
    } else {
      updateGoals([...state.goals, goal])
    }
  }

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">Vos objectifs</h2>
      <p className="text-sm text-zinc-400">
        Selectionnez un ou plusieurs objectifs.
      </p>

      <div className="flex flex-wrap gap-3">
        {goalOptions.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => toggleGoal(value)}
            className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              state.goals.includes(value)
                ? 'bg-white text-black'
                : 'bg-zinc-800 text-white'
            }`}
          >
            {label}
          </button>
        ))}
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
          disabled={state.goals.length === 0}
          className="flex-1 bg-white text-black font-semibold py-3 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Suivant
        </button>
      </div>
    </div>
  )
}
