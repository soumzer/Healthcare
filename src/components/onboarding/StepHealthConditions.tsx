import { useState } from 'react'
import type { useOnboarding } from '../../hooks/useOnboarding'
import type { BodyZone } from '../../db/types'
import { bodyZones, painLabels } from '../../constants/body-zones'

type Props = ReturnType<typeof useOnboarding>

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
    // Auto-generate label from zone name if user left it empty
    const zoneName = bodyZones.find(z => z.zone === form.bodyZone)?.label ?? ''
    const label = form.label.trim() || `Douleur ${zoneName}`
    const updated = state.conditions.filter(c => c.bodyZone !== form.bodyZone)
    updated.push({ ...form, label, isActive: true })
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
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Zones douloureuses</h2>
      <p className="text-sm text-zinc-400">
        Touchez les zones où vous avez mal ou un problème. Pas besoin de connaître le nom médical.
      </p>

      <div className="flex flex-wrap gap-2">
        {bodyZones.map(({ zone, label }) => (
          <button
            key={zone}
            type="button"
            onClick={() => handleZoneTap(zone)}
            className={`px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
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
            <label className="block text-xs text-zinc-400 mb-1">
              Qu'est-ce que vous avez ? (si vous savez)
            </label>
            <input
              type="text"
              value={form.label}
              onChange={e => setForm({ ...form, label: e.target.value })}
              placeholder="Ex: tendinite, arthrose, douleur..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">
              Quand est-ce que ça fait mal ?
            </label>
            <input
              type="text"
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Ex: quand je pousse lourd, en marchant, au repos..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">
              Douleur : {form.painLevel}/10 — {painLabels[form.painLevel] ?? ''}
            </label>
            <input
              type="range"
              min={0}
              max={10}
              value={form.painLevel}
              onChange={e => setForm({ ...form, painLevel: Number(e.target.value) })}
              className="w-full accent-white"
            />
            <div className="flex justify-between text-[10px] text-zinc-600 px-0.5">
              <span>0</span>
              <span>5</span>
              <span>10</span>
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Depuis quand ?</label>
            <input
              type="text"
              value={form.since}
              onChange={e => setForm({ ...form, since: e.target.value })}
              placeholder="Ex: 6 mois, 2 ans, toujours..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSaveCondition}
              className="flex-1 bg-white text-black font-semibold py-2 rounded-lg text-sm"
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
          <h3 className="text-sm text-zinc-400">{state.conditions.length} zone{state.conditions.length > 1 ? 's' : ''} ajoutée{state.conditions.length > 1 ? 's' : ''}</h3>
          {state.conditions.map(c => (
            <button
              key={c.bodyZone}
              type="button"
              onClick={() => handleZoneTap(c.bodyZone)}
              className="w-full flex items-center justify-between bg-zinc-900 rounded-lg px-3 py-2"
            >
              <span className="text-sm text-left">{c.label || bodyZones.find(z => z.zone === c.bodyZone)?.label}</span>
              <span className="text-xs text-zinc-400 shrink-0 ml-2">{c.painLevel}/10</span>
            </button>
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
        className="w-full text-center text-sm text-zinc-400 py-2"
      >
        Pas de problème de santé
      </button>
    </div>
  )
}
