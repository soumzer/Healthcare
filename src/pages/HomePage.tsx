import { useState, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { db } from '../db'
import { useNextSession } from '../hooks/useNextSession'
import type { NextSessionExercisePreview } from '../hooks/useNextSession'
import { isRehabAvailable, getRemainingCooldownText } from '../utils/rehab-cooldown'

function ExercisePreviewRow({ exercise }: { exercise: NextSessionExercisePreview }) {
  const weightDisplay = exercise.estimatedWeightKg > 0
    ? `${exercise.estimatedWeightKg}kg`
    : '-'

  return (
    <div
      className={`flex items-baseline justify-between py-2 ${
        exercise.isRehab ? 'text-sm text-zinc-400' : 'text-zinc-300'
      }`}
    >
      <div className="flex items-baseline gap-2 min-w-0">
        <span className="text-zinc-600 select-none">{'\u00B7'}</span>
        <span className="truncate">
          {exercise.name}
          {exercise.isRehab && (
            <span className="ml-1.5 text-xs text-amber-600/70">(rehab)</span>
          )}
        </span>
      </div>
      <span className="ml-3 shrink-0 tabular-nums text-zinc-400">
        {exercise.sets}{'\u00D7'}{exercise.targetReps}
        {' '}
        <span className={exercise.estimatedWeightKg > 0 ? 'text-zinc-300' : 'text-zinc-600'}>
          {weightDisplay}
        </span>
      </span>
    </div>
  )
}

export default function HomePage() {
  const user = useLiveQuery(() => db.userProfiles.toCollection().first())
  const info = useNextSession(user?.id)
  const navigate = useNavigate()

  // Rehab cooldown state
  const [rehabAvailable, setRehabAvailable] = useState(true)
  const [rehabCooldownText, setRehabCooldownText] = useState<string | null>(null)

  // Check rehab cooldown on mount and periodically
  useEffect(() => {
    const checkCooldown = () => {
      setRehabAvailable(isRehabAvailable())
      setRehabCooldownText(getRemainingCooldownText())
    }
    checkCooldown()
    // Re-check every minute to update the countdown
    const interval = setInterval(checkCooldown, 60000)
    return () => clearInterval(interval)
  }, [])

  // Loading
  if (!user || info === undefined) {
    return (
      <div className="flex items-center justify-center h-[calc(100dvh-4rem)] overflow-hidden">
        <p className="text-zinc-400">Chargement...</p>
      </div>
    )
  }

  // No program — user hasn't completed onboarding
  if (info.status === 'no_program') {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100dvh-4rem)] px-6 text-center overflow-hidden">
        <p className="text-2xl font-bold mb-2">Bienvenue !</p>
        <p className="text-zinc-400 mb-8">
          {"Compl\u00E9tez votre profil pour commencer."}
        </p>
        <button
          onClick={() => navigate('/onboarding')}
          className="bg-white text-black font-semibold rounded-xl py-4 w-full text-lg"
        >
          {"Commencer l'onboarding"}
        </button>
      </div>
    )
  }

  // Rest recommended
  if (info.status === 'rest_recommended') {
    const hoursAgo = Math.round(info.hoursSinceLastSession ?? 0)

    return (
      <div className="flex flex-col h-[calc(100dvh-4rem)] overflow-hidden px-6 pt-12">
        <p className="text-2xl font-bold mb-2">{"Repos recommand\u00E9"}</p>
        <p className="text-zinc-400 mb-6">
          {"Derni\u00E8re s\u00E9ance il y a "}{hoursAgo}{"h"}
        </p>

        {info.restRecommendation && (
          <p className="text-zinc-400 text-sm mb-6">{info.restRecommendation}</p>
        )}

        <div className="mb-6">
          <p className="text-zinc-400 mb-3">{"Routine l\u00E9g\u00E8re disponible :"}</p>
          <div className="space-y-1 text-zinc-400 text-sm">
            <p>{"\u00B7 Mobilit\u00E9 + rehab (15-20 min)"}</p>
          </div>
        </div>

        {/* Preview of the next session exercises if available */}
        {info.preview && info.preview.exercises.length > 0 && (
          <div className="mb-8">
            <p className="text-zinc-400 text-xs uppercase tracking-wide mb-2">
              {"Prochaine s\u00E9ance : "}{info.preview.sessionName}
            </p>
            <div className="divide-y divide-zinc-800/50">
              {info.preview.exercises.map((ex, i) => (
                <ExercisePreviewRow key={i} exercise={ex} />
              ))}
            </div>
          </div>
        )}

        <div className="mt-auto space-y-3 pb-8">
          <button
            onClick={() => rehabAvailable && navigate('/rest-day')}
            disabled={!rehabAvailable}
            className={`font-semibold rounded-xl py-4 w-full text-lg ${
              rehabAvailable
                ? 'bg-white text-black'
                : 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
            }`}
          >
            {rehabAvailable ? 'Faire la routine' : rehabCooldownText ?? 'En cooldown'}
          </button>
          <button
            onClick={() =>
              navigate(
                `/session?programId=${info.programId}&sessionIndex=${info.nextSessionIndex}`
              )
            }
            className="border border-zinc-600 text-zinc-300 font-semibold rounded-xl py-4 w-full text-lg"
          >
            {"Commencer quand m\u00EAme"}
          </button>
        </div>
      </div>
    )
  }

  // Ready — show session preview
  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] overflow-hidden px-6 pt-12">
      <p className="text-zinc-400 mb-1">{"Prochaine s\u00E9ance"}</p>
      <p className="text-3xl font-bold mb-6">{info.nextSessionName}</p>

      {/* Exercise preview list */}
      {info.preview && info.preview.exercises.length > 0 ? (
        <div className="mb-8">
          <div className="divide-y divide-zinc-800/50">
            {info.preview.exercises.map((ex, i) => (
              <ExercisePreviewRow key={i} exercise={ex} />
            ))}
          </div>
          <p className="text-zinc-600 text-xs mt-3">
            {info.exerciseCount}{" exercices \u00B7 ~"}{info.estimatedMinutes}{" min"}
          </p>
        </div>
      ) : (
        <p className="text-zinc-400 mb-8">
          {info.exerciseCount}{" exercices \u00B7 ~"}{info.estimatedMinutes}{" min"}
        </p>
      )}

      <div className="mt-auto pb-8">
        <button
          onClick={() =>
            navigate(
              `/session?programId=${info.programId}&sessionIndex=${info.nextSessionIndex}`
            )
          }
          className="bg-white text-black font-semibold rounded-xl py-4 w-full text-lg"
        >
          {"Commencer la s\u00E9ance"}
        </button>
      </div>
    </div>
  )
}
