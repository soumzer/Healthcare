import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import BackupSection from '../components/settings/BackupSection'
import HealthConditionsManager from '../components/settings/HealthConditionsManager'
import { useRegenerateProgram } from '../hooks/useRegenerateProgram'

const goalLabels: Record<string, string> = {
  weight_loss: 'Perte de poids',
  muscle_gain: 'Prise de masse',
  rehab: 'Reeducation',
  posture: 'Posture',
  mobility: 'Mobilite',
}

const splitLabels: Record<string, string> = {
  upper_lower: 'Upper / Lower',
  full_body: 'Full Body',
  push_pull_legs: 'Push / Pull / Legs',
  custom: 'Personnalise',
}

export default function ProfilePage() {
  const { regenerate, isRegenerating } = useRegenerateProgram()
  const user = useLiveQuery(() => db.userProfiles.toCollection().first())
  const program = useLiveQuery(
    () => user?.id
      ? db.workoutPrograms.where('userId').equals(user.id).and(p => p.isActive).first()
      : undefined,
    [user?.id]
  )
  const sessionCount = useLiveQuery(
    () => user?.id
      ? db.workoutSessions.where('userId').equals(user.id).count()
      : 0,
    [user?.id]
  )

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-zinc-500">Chargement...</p>
      </div>
    )
  }

  return (
    <div className="px-4 pt-6 pb-20 space-y-6">
      <h1 className="text-2xl font-bold">Profil</h1>

      {/* User info */}
      <div className="bg-zinc-900 rounded-xl p-4 space-y-2">
        <p className="text-lg font-semibold">{user.name || 'Utilisateur'}</p>
        <div className="grid grid-cols-2 gap-y-1 text-sm text-zinc-400">
          <span>{user.height} cm</span>
          <span>{user.weight} kg</span>
          <span>{user.age} ans</span>
          <span>{user.sex === 'male' ? 'Homme' : 'Femme'}</span>
        </div>
      </div>

      {/* Training info */}
      <div className="bg-zinc-900 rounded-xl p-4 space-y-2">
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">Entrainement</h3>
        <div className="text-sm space-y-1">
          <p className="text-zinc-300">
            {user.daysPerWeek}x/semaine · {user.minutesPerSession} min/seance
          </p>
          {program && (
            <p className="text-zinc-300">
              Programme : {splitLabels[program.type] ?? program.type} ({program.sessions.length} seances)
            </p>
          )}
          <p className="text-zinc-500">{sessionCount ?? 0} seance{(sessionCount ?? 0) > 1 ? 's' : ''} completee{(sessionCount ?? 0) > 1 ? 's' : ''}</p>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {user.goals.map(g => (
            <span key={g} className="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded">
              {goalLabels[g] ?? g}
            </span>
          ))}
        </div>
      </div>

      {/* Health conditions manager */}
      <div className="bg-zinc-900 rounded-xl p-4">
        <HealthConditionsManager
          userId={user.id!}
          onRegenerate={() => regenerate(user.id!)}
          isRegenerating={isRegenerating}
        />
      </div>

      {/* Backup */}
      <BackupSection userId={user.id!} />

      {/* Reset */}
      <div className="bg-zinc-900 rounded-xl p-4 space-y-3">
        <h3 className="text-lg font-semibold text-white">Reinitialiser</h3>
        <p className="text-sm text-zinc-400">Supprime toutes les donnees et relance l'onboarding.</p>
        <button
          onClick={async () => {
            if (window.confirm('Supprimer toutes les donnees ?')) {
              await db.delete()
              await db.open()
              window.location.href = '/'
            }
          }}
          className="w-full py-3 bg-red-900 hover:bg-red-800 text-red-200 font-medium rounded-lg transition-colors"
        >
          Tout supprimer et recommencer
        </button>
      </div>

      {/* App info */}
      <p className="text-center text-xs text-zinc-600 pt-4">
        Health Coach · Donnees 100% locales
      </p>
    </div>
  )
}
