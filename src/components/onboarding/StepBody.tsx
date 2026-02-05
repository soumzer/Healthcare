import { useState } from 'react'
import type { useOnboarding } from '../../hooks/useOnboarding'

type Props = ReturnType<typeof useOnboarding>

/** Parse a string that may use comma or dot as decimal separator */
function parseDecimal(value: string): number {
  const normalized = value.replace(',', '.')
  const num = parseFloat(normalized)
  return isNaN(num) ? 0 : num
}

export default function StepBody({ state, updateBody, nextStep }: Props) {
  const { body } = state

  // Use string state for number fields so the user can clear them
  const [heightStr, setHeightStr] = useState(body.height ? String(body.height) : '')
  const [weightStr, setWeightStr] = useState(body.weight ? String(body.weight) : '')
  const [ageStr, setAgeStr] = useState(body.age ? String(body.age) : '')

  const setField = <K extends keyof typeof body>(key: K, value: (typeof body)[K]) => {
    updateBody({ ...body, [key]: value })
  }

  const handleHeightChange = (val: string) => {
    setHeightStr(val)
    setField('height', parseDecimal(val))
  }

  const handleWeightChange = (val: string) => {
    setWeightStr(val)
    setField('weight', parseDecimal(val))
  }

  const handleAgeChange = (val: string) => {
    setAgeStr(val)
    setField('age', parseDecimal(val))
  }

  const canProceed = body.name.trim() && body.height > 0 && body.weight > 0 && body.age > 0

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-4">
        <h2 className="text-xl font-bold">Votre profil</h2>

        <div>
          <label className="block text-sm text-zinc-400 mb-1">Nom / Prénom</label>
          <input
            type="text"
            value={body.name}
            onChange={e => setField('name', e.target.value)}
            placeholder="Votre nom"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Taille (cm)</label>
            <input
              type="text"
              inputMode="decimal"
              value={heightStr}
              onChange={e => handleHeightChange(e.target.value)}
              placeholder="196"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 text-center"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Poids (kg)</label>
            <input
              type="text"
              inputMode="decimal"
              value={weightStr}
              onChange={e => handleWeightChange(e.target.value)}
              placeholder="85"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 text-center"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Âge</label>
            <input
              type="text"
              inputMode="numeric"
              value={ageStr}
              onChange={e => handleAgeChange(e.target.value)}
              placeholder="30"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 text-center"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-2">Sexe</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setField('sex', 'male')}
              className={`py-3 rounded-lg text-center font-medium transition-colors ${
                body.sex === 'male'
                  ? 'bg-white text-black'
                  : 'bg-zinc-800 text-white'
              }`}
            >
              Homme
            </button>
            <button
              type="button"
              onClick={() => setField('sex', 'female')}
              className={`py-3 rounded-lg text-center font-medium transition-colors ${
                body.sex === 'female'
                  ? 'bg-white text-black'
                  : 'bg-zinc-800 text-white'
              }`}
            >
              Femme
            </button>
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 pt-4 pb-2">
        <button
          type="button"
          onClick={nextStep}
          disabled={!canProceed}
          className="w-full bg-white text-black font-semibold py-3 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Suivant
        </button>
      </div>
    </div>
  )
}
