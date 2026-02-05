import { useState } from 'react'
import type { useOnboarding } from '../../hooks/useOnboarding'
import type { BodyZone } from '../../db/types'
import { bodyZones, painLabels } from '../../constants/body-zones'
import SymptomQuestionnaire, { type QuestionnaireResult } from './SymptomQuestionnaire'

type Props = ReturnType<typeof useOnboarding>

interface ConditionForm {
  bodyZone: BodyZone
  label: string
  diagnosis: string
  painLevel: number
  since: string
  notes: string
  editIndex?: number // Index of condition being edited (undefined = new)
}

const emptyForm = (zone: BodyZone, editIndex?: number): ConditionForm => ({
  bodyZone: zone,
  label: '',
  diagnosis: '',
  painLevel: 3,
  since: '',
  notes: '',
  editIndex,
})

export default function StepHealthConditions({ state, updateConditions, nextStep, prevStep }: Props) {
  const [expandedZone, setExpandedZone] = useState<BodyZone | null>(null)
  const [form, setForm] = useState<ConditionForm | null>(null)
  const [showQuestionnaire, setShowQuestionnaire] = useState<BodyZone | null>(null)

  const zonesWithConditions = new Set(state.conditions.map(c => c.bodyZone))

  // Clicking zone button always starts questionnaire to add new condition
  const handleZoneTap = (zone: BodyZone) => {
    setShowQuestionnaire(zone)
  }

  // Clicking existing condition opens it for editing
  const handleEditCondition = (index: number) => {
    const existing = state.conditions[index]
    if (!existing) return
    setExpandedZone(existing.bodyZone)
    setForm({
      bodyZone: existing.bodyZone,
      label: existing.label,
      diagnosis: existing.diagnosis,
      painLevel: existing.painLevel,
      since: existing.since,
      notes: existing.notes,
      editIndex: index,
    })
  }

  const handleQuestionnaireComplete = (result: QuestionnaireResult) => {
    // Pre-fill form with questionnaire result (new condition, no editIndex)
    setExpandedZone(result.zone)
    setForm({
      ...emptyForm(result.zone),
      label: result.conditionName,
      diagnosis: result.protocolConditionName,
    })
    setShowQuestionnaire(null)
  }

  const handleQuestionnaireCancel = () => {
    setShowQuestionnaire(null)
  }

  const handleSaveCondition = () => {
    if (!form) return
    // Auto-generate label from zone name if user left it empty
    const zoneName = bodyZones.find(z => z.zone === form.bodyZone)?.label ?? ''
    const label = form.label.trim() || `Douleur ${zoneName}`
    const { editIndex, ...conditionData } = form
    const newCondition = { ...conditionData, label, isActive: true }

    if (editIndex !== undefined) {
      // Update existing condition
      const updated = [...state.conditions]
      updated[editIndex] = newCondition
      updateConditions(updated)
    } else {
      // Add new condition
      updateConditions([...state.conditions, newCondition])
    }
    setExpandedZone(null)
    setForm(null)
  }

  const handleRemoveCondition = (index: number) => {
    updateConditions(state.conditions.filter((_, i) => i !== index))
    setExpandedZone(null)
    setForm(null)
  }

  const handleSkip = () => {
    updateConditions([])
    nextStep()
  }

  // Show questionnaire if active
  if (showQuestionnaire) {
    return (
      <SymptomQuestionnaire
        zone={showQuestionnaire}
        onComplete={handleQuestionnaireComplete}
        onCancel={handleQuestionnaireCancel}
      />
    )
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
              zonesWithConditions.has(zone)
                ? 'bg-white text-black'
                : 'bg-zinc-800 text-white hover:bg-zinc-700'
            }`}
          >
            {label}
            {zonesWithConditions.has(zone) && (
              <span className="ml-1 text-xs">
                ({state.conditions.filter(c => c.bodyZone === zone).length})
              </span>
            )}
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
              {form.editIndex !== undefined ? 'Modifier' : 'Ajouter'}
            </button>
            {form.editIndex !== undefined && (
              <button
                type="button"
                onClick={() => handleRemoveCondition(form.editIndex!)}
                className="px-4 py-2 bg-red-900 text-red-200 rounded-lg text-sm"
              >
                Supprimer
              </button>
            )}
            <button
              type="button"
              onClick={() => { setExpandedZone(null); setForm(null) }}
              className="px-4 py-2 bg-zinc-800 text-white rounded-lg text-sm"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {state.conditions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm text-zinc-400">{state.conditions.length} condition{state.conditions.length > 1 ? 's' : ''} ajoutée{state.conditions.length > 1 ? 's' : ''}</h3>
          {state.conditions.map((c, index) => (
            <button
              key={`${c.bodyZone}-${index}`}
              type="button"
              onClick={() => handleEditCondition(index)}
              className="w-full flex items-center justify-between bg-zinc-900 rounded-lg px-3 py-2"
            >
              <div className="text-left">
                <span className="text-sm">{c.label || bodyZones.find(z => z.zone === c.bodyZone)?.label}</span>
                <span className="text-xs text-zinc-500 ml-2">({bodyZones.find(z => z.zone === c.bodyZone)?.label})</span>
              </div>
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
