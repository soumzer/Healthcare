import { useState } from 'react'
import { useOnboarding } from '../hooks/useOnboarding'
import StepBody from '../components/onboarding/StepBody'
import StepHealthConditions from '../components/onboarding/StepHealthConditions'
import StepGymEquipment from '../components/onboarding/StepGymEquipment'
import StepSchedule from '../components/onboarding/StepSchedule'

export default function OnboardingPage() {
  const onboarding = useOnboarding()
  const { state, totalSteps } = onboarding

  const steps: Record<number, React.ReactNode> = {
    1: <StepBody {...onboarding} />,
    2: <StepHealthConditions {...onboarding} />,
    3: <StepGymEquipment {...onboarding} />,
    4: <StepSchedule {...onboarding} />,
    5: <FinalStep {...onboarding} />,
  }

  return (
    <div className="h-[var(--app-h)] bg-zinc-950 text-white p-4 pt-8 flex flex-col overflow-hidden">
      <div className="text-sm text-zinc-400 mb-4">
        Étape {state.step} / {totalSteps}
      </div>
      <div className="w-full bg-zinc-800 rounded-full h-1 mb-6">
        <div
          className="bg-white h-1 rounded-full transition-all"
          style={{ width: `${(state.step / totalSteps) * 100}%` }}
        />
      </div>
      <div className="flex-1 overflow-y-auto overscroll-none">{steps[state.step]}</div>
    </div>
  )
}

function FinalStep({ prevStep, submit }: ReturnType<typeof useOnboarding>) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await submit()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'enregistrement")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1">
        <h2 className="text-xl font-bold mb-4">Tout est prêt !</h2>
        <p className="text-sm text-zinc-400">
          Votre programme sera généré automatiquement en fonction de vos réponses.
        </p>
      </div>

      <div className="flex-shrink-0 pb-2">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={prevStep}
            disabled={submitting}
            className="flex-1 bg-zinc-800 text-white font-semibold py-3 rounded-lg disabled:opacity-40"
          >
            Retour
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 bg-white text-black font-semibold py-3 rounded-lg disabled:opacity-40"
          >
            {submitting ? 'Enregistrement...' : 'Terminer'}
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-400 text-center mt-3">{error}</p>
        )}
      </div>
    </div>
  )
}
