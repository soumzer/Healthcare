import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { db } from '../db'
import { useNextSession } from '../hooks/useNextSession'
import { useActiveSession } from '../hooks/useActiveSession'

export default function HomePage() {
  const user = useLiveQuery(() => db.userProfiles.toCollection().first())
  const info = useNextSession(user?.id)
  const activeSession = useActiveSession()
  const navigate = useNavigate()

  // Loading
  if (!user || info === undefined) {
    return (
      <div className="flex items-center justify-center h-[var(--content-h)] overflow-hidden">
        <p className="text-zinc-400">Chargement...</p>
      </div>
    )
  }

  // No program — user hasn't completed onboarding
  if (info.status === 'no_program') {
    return (
      <div className="flex flex-col items-center justify-center h-[var(--content-h)] px-6 text-center overflow-hidden">
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

  // Editing window — last session can be corrected
  if (info.status === 'editing_window') {
    const hoursRemaining = info.editingHoursRemaining ?? 0

    return (
      <div className="flex flex-col h-[var(--content-h)] overflow-hidden px-6 pt-6">
        <div className="flex-1">
          <p className="text-2xl font-bold mb-2">{info.lastSessionName}</p>
          <p className="text-zinc-400 mb-4">
            {"S\u00E9ance termin\u00E9e — tu peux encore la modifier"}
          </p>
          <p className="text-zinc-500 text-sm">
            {"Prochaine s\u00E9ance dans "}{hoursRemaining}{"h"}
          </p>
        </div>

        <div className="flex-shrink-0 pb-4">
          <button
            onClick={() =>
              navigate(
                `/session?programId=${info.programId}&sessionIndex=${info.lastSessionIndex}`
              )
            }
            className="bg-white text-black font-semibold rounded-xl py-4 w-full text-lg"
          >
            {"Modifier la s\u00E9ance"}
          </button>
        </div>
      </div>
    )
  }

  // Active session — resume
  if (activeSession) {
    const doneCount = activeSession.exerciseStatuses.filter(s => s.status !== 'pending').length
    const totalCount = activeSession.exerciseStatuses.length
    return (
      <div className="flex flex-col h-[var(--content-h)] overflow-hidden px-6 pt-6">
        <div className="flex-1 overflow-y-auto">
          <p className="text-zinc-400 mb-1">{"S\u00E9ance en cours"}</p>
          <p className="text-3xl font-bold mb-4">{info.status === 'ready' ? info.nextSessionName : info.lastSessionName ?? 'S\u00E9ance'}</p>
          <p className="text-zinc-400">
            {doneCount}/{totalCount} exercices
          </p>
        </div>

        <div className="flex-shrink-0 pb-4">
          <button
            onClick={() =>
              navigate(
                `/session?programId=${activeSession.programId}&sessionIndex=${activeSession.sessionIndex}`
              )
            }
            className="bg-emerald-600 text-white font-semibold rounded-xl py-4 w-full text-lg"
          >
            {"Reprendre la s\u00E9ance"}
          </button>
        </div>
      </div>
    )
  }

  // Ready — start session
  return (
    <div className="flex flex-col h-[var(--content-h)] overflow-hidden px-6 pt-6">
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
