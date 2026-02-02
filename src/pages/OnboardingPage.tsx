import { useOnboarding } from '../hooks/useOnboarding'
import StepBody from '../components/onboarding/StepBody'
import StepHealthConditions from '../components/onboarding/StepHealthConditions'
import StepGymEquipment from '../components/onboarding/StepGymEquipment'
import StepGoals from '../components/onboarding/StepGoals'
import StepSchedule from '../components/onboarding/StepSchedule'
import StepKnownWeights from '../components/onboarding/StepKnownWeights'
import StepImportProgram from '../components/onboarding/StepImportProgram'

export default function OnboardingPage() {
  const onboarding = useOnboarding()
  const { state, totalSteps } = onboarding

  const steps: Record<number, React.ReactNode> = {
    1: <StepBody {...onboarding} />,
    2: <StepHealthConditions {...onboarding} />,
    3: <StepGymEquipment {...onboarding} />,
    4: <StepGoals {...onboarding} />,
    5: <StepSchedule {...onboarding} />,
    6: <StepKnownWeights {...onboarding} />,
    7: <StepImportProgram {...onboarding} />,
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 pt-[max(env(safe-area-inset-top),2rem)]">
      <div className="text-sm text-zinc-500 mb-4">
        Etape {state.step} / {totalSteps}
      </div>
      <div className="w-full bg-zinc-800 rounded-full h-1 mb-6">
        <div
          className="bg-white h-1 rounded-full transition-all"
          style={{ width: `${(state.step / totalSteps) * 100}%` }}
        />
      </div>
      {steps[state.step]}
    </div>
  )
}
