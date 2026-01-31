import { useState } from 'react'
import type { useOnboarding } from '../../hooks/useOnboarding'
import type { BodyZone } from '../../db/types'

type Props = ReturnType<typeof useOnboarding>

const bodyZones: { zone: BodyZone; label: string }[] = [
  { zone: 'neck', label: 'Cou' },
  { zone: 'shoulder_left', label: 'Epaule gauche' },
  { zone: 'shoulder_right', label: 'Epaule droite' },
  { zone: 'elbow_left', label: 'Coude gauche' },
  { zone: 'elbow_right', label: 'Coude droit' },
  { zone: 'wrist_left', label: 'Poignet gauche' },
  { zone: 'wrist_right', label: 'Poignet droit' },
  { zone: 'upper_back', label: 'Haut du dos' },
  { zone: 'lower_back', label: 'Bas du dos' },
  { zone: 'hip_left', label: 'Hanche gauche' },
  { zone: 'hip_right', label: 'Hanche droite' },
  { zone: 'knee_left', label: 'Genou gauche' },
  { zone: 'knee_right', label: 'Genou droit' },
  { zone: 'ankle_left', label: 'Cheville gauche' },
  { zone: 'ankle_right', label: 'Cheville droite' },
  { zone: 'foot_left', label: 'Pied gauche' },
  { zone: 'foot_right', label: 'Pied droit' },
  { zone: 'other', label: 'Autre' },
]

interface ConditionForm {
  bodyZone: BodyZone
  label: string
  diagnosis: string
  painLevel: number
  since: string
  notes: string
}

const emptyForm = (zone: BodyZone): ConditionForm => ({
  bodyZone: zone,
  label: '',
  diagnosis: '',
  painLevel: 3,
  since: '',
  notes: '',
})

export default function StepHealthConditions({ state, updateConditions, nextStep, prevStep }: Props) {
  const [expandedZone, setExpandedZone] = useState<BodyZone | null>(null)
  const [form, setForm] = useState<ConditionForm | null>(null)

  const existingZones = new Set(state.conditions.map(c => c.bodyZone))

  const handleZoneTap = (zone: BodyZone) => {
    if (expandedZone === zone) {
      setExpandedZone(null)
      setForm(null)
    } else {
      setExpandedZone(zone)
      const existing = state.conditions.find(c => c.bodyZone === zone)
      setForm(existing
        ? { bodyZone: existing.bodyZone, label: existing.label, diagnosis: existing.diagnosis, painLevel: existing.painLevel, since: existing.since, notes: existing.notes }
        : emptyForm(zone))
    }
  }

  const handleSaveCondition = () => {
    if (!form) return
    const updated = state.conditions.filter(c => c.bodyZone !== form.bodyZone)
    updated.push({ ...form, isActive: true })
    updateConditions(updated)
    setExpandedZone(null)
    setForm(null)
  }

  const handleRemoveCondition = (zone: BodyZone) => {
    updateConditions(state.conditions.filter(c => c.bodyZone !== zone))
  }

  const handleSkip = () => {
    updateConditions([])
    nextStep()
  }

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">Problemes de sante</h2>
      <p className="text-sm text-zinc-400">
        Selectionnez les zones concernees pour adapter votre programme.
      </p>

      <div className="flex flex-wrap gap-2">
        {bodyZones.map(({ zone, label }) => (
          <button
            key={zone}
            type="button"
            onClick={() => handleZoneTap(zone)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              existingZones.has(zone)
                ? 'bg-white text-black'
                : expandedZone === zone
                  ? 'bg-zinc-700 text-white'
                  : 'bg-zinc-800 text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {expandedZone && form && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 space-y-3">
          <h3 className="font-semibold text-sm text-zinc-300">
            {bodyZones.find(z => z.zone === expandedZone)?.label}
          </h3>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Description</label>
            <input
              type="text"
              value={form.label}
              onChange={e => setForm({ ...form, label: e.target.value })}
              placeholder="Ex: Golf elbow, tendinite..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Diagnostic</label>
            <input
              type="text"
              value={form.diagnosis}
              onChange={e => setForm({ ...form, diagnosis: e.target.value })}
              placeholder="Ex: Epicondylite mediale"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">
              Niveau de douleur: {form.painLevel}/10
            </label>
            <input
              type="range"
              min={0}
              max={10}
              value={form.painLevel}
              onChange={e => setForm({ ...form, painLevel: Number(e.target.value) })}
              className="w-full accent-white"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Depuis quand</label>
            <input
              type="text"
              value={form.since}
              onChange={e => setForm({ ...form, since: e.target.value })}
              placeholder="Ex: 6 mois, 1 an"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Notes</label>
            <input
              type="text"
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Notes supplementaires"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSaveCondition}
              disabled={!form.label.trim()}
              className="flex-1 bg-white text-black font-semibold py-2 rounded-lg text-sm disabled:opacity-40"
            >
              Ajouter
            </button>
            {existingZones.has(expandedZone) && (
              <button
                type="button"
                onClick={() => { handleRemoveCondition(expandedZone); setExpandedZone(null); setForm(null) }}
                className="px-4 py-2 bg-red-900 text-red-200 rounded-lg text-sm"
              >
                Supprimer
              </button>
            )}
          </div>
        </div>
      )}

      {state.conditions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm text-zinc-400">Conditions ajoutees:</h3>
          {state.conditions.map(c => (
            <div key={c.bodyZone} className="flex items-center justify-between bg-zinc-900 rounded-lg px-3 py-2">
              <span className="text-sm">{c.label} ({bodyZones.find(z => z.zone === c.bodyZone)?.label})</span>
              <span className="text-xs text-zinc-500">Douleur {c.painLevel}/10</span>
            </div>
          ))}
        </div>
      )}

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

      <button
        type="button"
        onClick={handleSkip}
        className="w-full text-center text-sm text-zinc-500 py-2"
      >
        Pas de probleme de sante
      </button>
    </div>
  )
}
