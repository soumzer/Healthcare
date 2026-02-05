import { useState, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { db } from '../db'
import { useNextSession } from '../hooks/useNextSession'
import { isRehabAvailable, getRemainingCooldownText } from '../utils/rehab-cooldown'

export default function HomePage() {
  const user = useLiveQuery(() => db.userProfiles.toCollection().first())
  const conditions = useLiveQuery(
    () => user?.id ? db.healthConditions.where('userId').equals(user.id).and(c => c.isActive).toArray() : [],
    [user?.id]
  )
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
      <div className="flex items-center justify-center h-[calc(100dvh-var(--nav-h))] overflow-hidden">
        <p className="text-zinc-400">Chargement...</p>
      </div>
    )
  }

  // No program — user hasn't completed onboarding
  if (info.status === 'no_program') {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100dvh-var(--nav-h))] px-6 text-center overflow-hidden">
        <p className="text-2xl font-bold mb-2">Aucun programme</p>
        <p className="text-zinc-400 mb-8">
          {"Allez dans le profil pour g\u00E9n\u00E9rer un programme."}
        </p>
        <button
          onClick={() => navigate('/profile')}
          className="bg-white text-black font-semibold rounded-xl py-4 w-full text-lg"
        >
          Aller au profil
        </button>
      </div>
    )
  }

  // Rest recommended
  if (info.status === 'rest_recommended') {
    const hoursAgo = Math.round(info.hoursSinceLastSession ?? 0)

    // Show rest day routine if user has active health conditions
    const hasActiveConditions = (conditions?.length ?? 0) > 0
    const showRestDayRoutine = hasActiveConditions

    return (
      <div className="flex flex-col h-[calc(100dvh-var(--nav-h))] overflow-hidden px-6 pt-6">
        <div className="flex-1">
          <p className="text-2xl font-bold mb-2">{showRestDayRoutine ? "Repos recommand\u00E9" : "Jour de repos"}</p>
          <p className="text-zinc-400 mb-4">
            {"Derni\u00E8re s\u00E9ance il y a "}{hoursAgo}{"h"}
          </p>

          {info.restRecommendation && (
            <p className="text-zinc-400 text-sm mb-4">{info.restRecommendation}</p>
          )}

          {showRestDayRoutine && (
            <div className="mb-4">
              <p className="text-zinc-400 mb-3">{"Routine l\u00E9g\u00E8re disponible :"}</p>
              <div className="space-y-1 text-zinc-400 text-sm">
                <p>{"\u00B7 Mobilit\u00E9 + rehab (15-20 min)"}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 pb-4 space-y-3">
          {showRestDayRoutine && (
            <button
              onClick={() => rehabAvailable && navigate('/rehab')}
              disabled={!rehabAvailable}
              className={`font-semibold rounded-xl py-4 w-full text-lg ${
                rehabAvailable
                  ? 'bg-white text-black'
                  : 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
              }`}
            >
              {rehabAvailable ? 'Faire la routine' : (rehabCooldownText ?? 'Disponible bientot')}
            </button>
          )}
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

  // Ready — start session
  return (
    <div className="flex flex-col h-[calc(100dvh-var(--nav-h))] overflow-hidden px-6 pt-6">
      <div className="flex-1 overflow-y-auto">
        {info.deloadReminder && (
          <p className="text-amber-400 text-sm mb-2">{info.deloadReminder}</p>
        )}
        <p className="text-zinc-400 mb-1">{"Prochaine s\u00E9ance"}</p>
        <p className="text-3xl font-bold mb-4">{info.nextSessionName}</p>

        {info.preview && info.preview.exercises.length > 0 && (
          <ul className="text-sm text-zinc-400 mb-4 space-y-0.5">
            {info.preview.exercises.map((ex, idx) => (
              <li key={idx}>{"\u2022 "}{ex.name}</li>
            ))}
          </ul>
        )}

        <p className="text-zinc-400">
          {"~ "}{info.estimatedMinutes}{" min"}
        </p>
      </div>

      <div className="flex-shrink-0 pb-4">
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
