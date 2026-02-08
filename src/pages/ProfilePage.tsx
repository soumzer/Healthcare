import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import BackupSection from '../components/settings/BackupSection'
import HealthConditionsManager from '../components/settings/HealthConditionsManager'
import EquipmentManager from '../components/settings/EquipmentManager'
import { useRegenerateProgram } from '../hooks/useRegenerateProgram'


const splitLabels: Record<string, string> = {
  upper_lower: 'Upper / Lower',
  full_body: 'Full Body',
  push_pull_legs: 'Push / Pull / Legs',
  custom: 'Personnalisé',
}

function TrainingSettings({
  userId,
  daysPerWeek,
  programType,
  programSessionCount,
  sessionCount,
  onRegenerate,
  isRegenerating,
}: {
  userId: number
  daysPerWeek: number
  programType?: string
  programSessionCount?: number
  sessionCount: number
  onRegenerate: () => Promise<{ success: boolean; error?: string }>
  isRegenerating: boolean
}) {
  const [editDays, setEditDays] = useState(daysPerWeek)
  const hasChanges = editDays !== daysPerWeek
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await db.userProfiles.update(userId, {
        daysPerWeek: editDays,
        minutesPerSession: 75, // Fixed at 75 minutes
        updatedAt: new Date(),
      })
      await onRegenerate()
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const daysOptions = [2, 3, 4, 5, 6]

  return (
    <div className="bg-zinc-900 rounded-xl p-4 space-y-4">
      <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">Entraînement</h3>

      {/* Days per week */}
      <div>
        <p className="text-sm text-zinc-400 mb-2">Jours par semaine</p>
        <div className="flex gap-2">
          {daysOptions.map(d => (
            <button
              key={d}
              onClick={() => setEditDays(d)}
              className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-colors ${
                editDays === d
                  ? 'bg-white text-black'
                  : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {d}x
            </button>
          ))}
        </div>
      </div>

      {/* Duration info */}
      <p className="text-sm text-zinc-500">
        Durée des séances : 75 minutes
      </p>

      {/* Save button */}
      {hasChanges && (
        <button
          onClick={handleSave}
          disabled={saving || isRegenerating}
          className="w-full py-3 bg-white text-black font-semibold rounded-lg disabled:opacity-50"
        >
          {saving || isRegenerating ? 'Mise à jour du programme...' : 'Appliquer les changements'}
        </button>
      )}

      {/* Info */}
      <div className="text-sm space-y-1">
        {programType && (
          <p className="text-zinc-300">
            Programme : {splitLabels[programType] ?? programType} ({programSessionCount} séances)
          </p>
        )}
        <p className="text-zinc-400">{sessionCount} séance{sessionCount > 1 ? 's' : ''} complétée{sessionCount > 1 ? 's' : ''}</p>
      </div>
    </div>
  )
}

function HowItWorksModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div
        className="bg-zinc-900 rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto p-5 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Comment ça marche</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-xl leading-none">&times;</button>
        </div>

        <section className="space-y-1">
          <h3 className="text-sm font-semibold text-white">Programme</h3>
          <p className="text-sm text-zinc-400">
            Ton programme est généré automatiquement selon ton nombre de jours par semaine et ton équipement.
            Le split (Full Body, Upper/Lower, PPL) est choisi en fonction du nombre de séances.
            Chaque séance alterne entre Force, Volume et Modéré pour une progression optimale.
          </p>
        </section>

        <section className="space-y-1">
          <h3 className="text-sm font-semibold text-white">Conditions de santé</h3>
          <p className="text-sm text-zinc-400">
            Les conditions de santé (tendinites, douleurs articulaires, etc.) ne modifient pas le programme.
            Un bandeau d'avertissement orange s'affiche sur les exercices qui touchent une zone sensible
            pour te rappeler d'adapter la charge ou de skip si tu as mal.
          </p>
        </section>

        <section className="space-y-1">
          <h3 className="text-sm font-semibold text-white">Skip et questionnaire</h3>
          <p className="text-sm text-zinc-400">
            Si un exercice te fait mal, tu peux le passer (skip) en indiquant la zone douloureuse.
            Un questionnaire rapide te permet d'identifier le problème.
            Si un diagnostic est identifié, une condition de santé est créée automatiquement.
            Un rapport de douleur est enregistré pour accentuer le travail de rééducation les jours suivants.
          </p>
        </section>

        <section className="space-y-1">
          <h3 className="text-sm font-semibold text-white">Rééducation</h3>
          <p className="text-sm text-zinc-400">
            La page Rehab propose des exercices de rééducation adaptés à tes conditions actives.
            Après un skip, les exercices de rehab pour la zone concernée sont mis en avant pendant 3-4 jours.
          </p>
        </section>

        <section className="space-y-1">
          <h3 className="text-sm font-semibold text-white">Carnet</h3>
          <p className="text-sm text-zinc-400">
            Chaque exercice a un carnet qui enregistre tes séries (poids et répétitions).
            L'historique de tes 5 dernières séances est visible pour suivre ta progression.
            Le dernier poids utilisé est pré-rempli pour gagner du temps.
          </p>
        </section>

        <section className="space-y-1">
          <h3 className="text-sm font-semibold text-white">Données</h3>
          <p className="text-sm text-zinc-400">
            Toutes tes données sont stockées localement sur ton appareil.
            Rien n'est envoyé sur un serveur. Utilise la section Sauvegarde pour exporter/importer tes données.
          </p>
        </section>

        <button
          onClick={onClose}
          className="w-full py-3 bg-zinc-800 text-white font-medium rounded-lg mt-2"
        >
          Compris
        </button>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const [showHowItWorks, setShowHowItWorks] = useState(false)
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
        <p className="text-zinc-400">Chargement...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[var(--content-h)] overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 pt-6 pb-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Profil</h1>
        <button
          onClick={() => setShowHowItWorks(true)}
          className="text-sm text-zinc-400 hover:text-white transition-colors"
        >
          Comment ça marche ?
        </button>
      </div>

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

      {/* Training settings */}
      <TrainingSettings
        userId={user.id!}
        daysPerWeek={user.daysPerWeek}
        programType={program?.type}
        programSessionCount={program?.sessions.length}
        sessionCount={sessionCount ?? 0}
        onRegenerate={() => regenerate(user.id!)}
        isRegenerating={isRegenerating}
      />

      {/* Health conditions manager */}
      <div className="bg-zinc-900 rounded-xl p-4">
        <HealthConditionsManager userId={user.id!} />
      </div>

      {/* Equipment manager */}
      <div className="bg-zinc-900 rounded-xl p-4">
        <EquipmentManager
          userId={user.id!}
          onRegenerate={() => regenerate(user.id!)}
          isRegenerating={isRegenerating}
        />
      </div>

      {/* Backup */}
      <BackupSection userId={user.id!} />

      {/* Reset */}
      <div className="bg-zinc-900 rounded-xl p-4 space-y-3">
        <h3 className="text-lg font-semibold text-white">Réinitialiser</h3>
        <p className="text-sm text-zinc-400">Supprime toutes les données et relance l'onboarding.</p>
        <button
          onClick={async () => {
            if (window.confirm('Supprimer toutes les données ?')) {
              await db.delete()
              await db.open()
              localStorage.clear()
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
        Health Coach · Données 100% locales
      </p>
      </div>
      {showHowItWorks && <HowItWorksModal onClose={() => setShowHowItWorks(false)} />}
    </div>
  )
}
