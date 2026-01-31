import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { db } from '../db'
import { useNextSession } from '../hooks/useNextSession'

export default function HomePage() {
  const user = useLiveQuery(() => db.userProfiles.toCollection().first())
  const info = useNextSession(user?.id)
  const navigate = useNavigate()

  // Loading
  if (!user || info === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-zinc-500">Chargement...</p>
      </div>
    )
  }

  // No program
  if (info.status === 'no_program') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
        <p className="text-2xl font-bold mb-4">Pas encore de programme</p>
        <p className="text-zinc-400 mb-8">
          {"Importe tes programmes d'entra\u00EEnement pour commencer."}
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          className="bg-white text-black font-semibold rounded-xl py-4 w-full text-lg"
        >
          {"Cr\u00E9er un programme"}
        </button>
      </div>
    )
  }

  // Rest recommended
  if (info.status === 'rest_recommended') {
    const hoursAgo = Math.round(info.hoursSinceLastSession ?? 0)

    return (
      <div className="flex flex-col min-h-[70vh] px-6 pt-12">
        <p className="text-2xl font-bold mb-2">{"Repos recommand\u00E9"}</p>
        <p className="text-zinc-400 mb-8">
          {"Derni\u00E8re s\u00E9ance il y a "}{hoursAgo}{"h"}
        </p>

        <div className="mb-8">
          <p className="text-zinc-400 mb-4">Tu peux faire ta routine du jour :</p>
          <div className="space-y-2 text-zinc-300">
            <p>{"\u2192 Mobilit\u00E9 \u00E9paules"}</p>
            <p>{"\u2192 Excentriques coude"}</p>
            <p>{"\u2192 \u00C9tirements (programme externe)"}</p>
          </div>
        </div>

        <div className="mt-auto space-y-3 pb-8">
          <button
            className="bg-white text-black font-semibold rounded-xl py-4 w-full text-lg"
          >
            Faire la routine
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

  // Ready
  return (
    <div className="flex flex-col min-h-[70vh] px-6 pt-12">
      <p className="text-zinc-400 mb-1">{"Prochaine s\u00E9ance"}</p>
      <p className="text-3xl font-bold mb-4">{info.nextSessionName}</p>

      <p className="text-zinc-400 mb-8">
        {info.exerciseCount}{" exercices \u00B7 ~"}{info.estimatedMinutes}{" min"}
      </p>

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
