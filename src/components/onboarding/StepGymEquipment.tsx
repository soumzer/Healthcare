import { useState } from 'react'
import type { useOnboarding } from '../../hooks/useOnboarding'
import type { GymEquipment } from '../../db/types'

type Props = ReturnType<typeof useOnboarding>

type EquipmentItem = Omit<GymEquipment, 'id' | 'userId'>

interface EquipmentOption {
  /** Tag name saved to DB — must match exercise equipmentNeeded values */
  tag: string
  /** Human-readable label displayed in the UI */
  label: string
  type: GymEquipment['type']
  /** Extra tags to add when this is selected (e.g. 'dumbbells' alias) */
  alsoAdd?: string[]
}

interface Category {
  title: string
  items: EquipmentOption[]
}

const categories: Category[] = [
  {
    title: 'Machines',
    items: [
      { tag: 'leg_press', label: 'Presse a cuisses', type: 'machine' },
      { tag: 'leg_curl', label: 'Leg curl', type: 'machine' },
      { tag: 'leg_extension', label: 'Leg extension', type: 'machine' },
      { tag: 'pec_press', label: 'Pec press', type: 'machine' },
      { tag: 'pec_deck', label: 'Pec deck / butterfly', type: 'machine' },
      { tag: 'shoulder_press', label: 'Dev militaire machine', type: 'machine' },
      { tag: 'rowing_machine', label: 'Rowing assis machine', type: 'machine' },
      { tag: 'lat_pulldown', label: 'Lat pulldown', type: 'machine' },
      { tag: 'smith_machine', label: 'Smith machine (barre guidee)', type: 'machine' },
      { tag: 'cable', label: 'Poulie / cable', type: 'cable', alsoAdd: ['rope_attachment'] },
      { tag: 'hip_abduction', label: 'Machine abduction/adduction', type: 'machine' },
      { tag: 'hack_squat', label: 'Hack squat', type: 'machine' },
    ],
  },
  {
    title: 'Poids libres',
    items: [
      { tag: 'dumbbell', label: 'Halteres', type: 'free_weight', alsoAdd: ['dumbbells'] },
      { tag: 'barbell', label: 'Barres (droite/EZ)', type: 'free_weight' },
      { tag: 'bench', label: 'Banc de musculation', type: 'free_weight' },
      { tag: 'squat_rack', label: 'Rack a squat', type: 'free_weight' },
      { tag: 'kettlebell', label: 'Kettlebell', type: 'free_weight' },
      { tag: 'sandbag', label: 'Sac leste', type: 'free_weight' },
    ],
  },
  {
    title: 'Accessoires',
    items: [
      { tag: 'mat', label: 'Tapis de sol', type: 'other' },
      { tag: 'resistance_band', label: 'Bandes elastiques', type: 'band' },
      { tag: 'pull_up_bar', label: 'Barre de traction', type: 'other' },
      { tag: 'dip_station', label: 'Dip station', type: 'other' },
      { tag: 'prowler', label: 'Prowler / sled', type: 'other' },
      { tag: 'foam_roller', label: 'Rouleau de massage', type: 'other' },
    ],
  },
  {
    title: 'Cardio',
    items: [
      { tag: 'treadmill', label: 'Tapis de course', type: 'machine' },
      { tag: 'bike', label: 'Velo', type: 'machine' },
      { tag: 'elliptical', label: 'Elliptique', type: 'machine' },
    ],
  },
]

function tagsForOption(opt: EquipmentOption): string[] {
  return [opt.tag, ...(opt.alsoAdd ?? [])]
}

/** All equipment items derived from categories – used for the "select all" preset. */
const ALL_EQUIPMENT: EquipmentItem[] = categories.flatMap(cat =>
  cat.items.flatMap(opt =>
    tagsForOption(opt).map(tag => ({
      name: tag,
      type: opt.type,
      isAvailable: true,
      notes: '',
    }))
  )
)

export default function StepGymEquipment({ state, updateEquipment, nextStep, prevStep }: Props) {
  const selectedTags = new Set(state.equipment.map(e => e.name))

  // Dumbbell weight range state
  const hasDumbbells = selectedTags.has('dumbbell')
  const [dbMin, setDbMin] = useState(2)
  const [dbMax, setDbMax] = useState(30)
  const [dbStep, setDbStep] = useState(2)

  const toggleItem = (opt: EquipmentOption) => {
    const tags = tagsForOption(opt)
    if (selectedTags.has(opt.tag)) {
      // Remove all tags associated with this option
      updateEquipment(state.equipment.filter(e => !tags.includes(e.name)))
    } else {
      // Add all tags
      const newItems: EquipmentItem[] = tags.map(tag => ({
        name: tag,
        type: opt.type,
        isAvailable: true,
        notes: '',
      }))
      updateEquipment([...state.equipment, ...newItems])
    }
  }

  const handleNext = () => {
    // If dumbbells selected, store the weight range in the first dumbbell equipment's notes
    if (hasDumbbells) {
      const updated = state.equipment.map(e =>
        e.name === 'dumbbell'
          ? { ...e, notes: JSON.stringify({ min: dbMin, max: dbMax, step: dbStep }) }
          : e
      )
      updateEquipment(updated)
    }
    nextStep()
  }

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">Equipement disponible</h2>
      <p className="text-sm text-zinc-400">
        Cochez le materiel auquel vous avez acces.
      </p>

      {/* Preset buttons */}
      <div className="flex gap-3 mb-4">
        <button
          type="button"
          onClick={() => updateEquipment(ALL_EQUIPMENT)}
          className="flex-1 py-3 rounded-lg bg-zinc-800 text-white text-sm"
        >
          Salle complète
        </button>
        <button
          type="button"
          onClick={() => updateEquipment([])}
          className="flex-1 py-3 rounded-lg bg-zinc-800 text-white text-sm"
        >
          Aucun
        </button>
      </div>

      {categories.map(cat => (
        <div key={cat.title}>
          <h3 className="text-sm font-semibold text-zinc-400 mb-2">{cat.title}</h3>
          <div className="space-y-1">
            {cat.items.map(opt => (
              <button
                key={opt.tag}
                type="button"
                onClick={() => toggleItem(opt)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  selectedTags.has(opt.tag)
                    ? 'bg-zinc-800 text-white'
                    : 'bg-zinc-900 text-zinc-400'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                    selectedTags.has(opt.tag)
                      ? 'bg-white border-white'
                      : 'border-zinc-600'
                  }`}
                >
                  {selectedTags.has(opt.tag) && (
                    <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-sm">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Dumbbell weight range */}
      {hasDumbbells && (
        <div className="bg-zinc-900 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-zinc-300">Halteres disponibles</h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">De (kg)</label>
              <input
                type="number"
                min={1}
                value={dbMin}
                onChange={e => setDbMin(Number(e.target.value) || 1)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white text-sm text-center"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">A (kg)</label>
              <input
                type="number"
                min={dbMin}
                value={dbMax}
                onChange={e => setDbMax(Number(e.target.value) || dbMin)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white text-sm text-center"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Pas (kg)</label>
              <input
                type="number"
                min={0.5}
                step={0.5}
                value={dbStep}
                onChange={e => setDbStep(Number(e.target.value) || 1)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white text-sm text-center"
              />
            </div>
          </div>
          <p className="text-xs text-zinc-400">
            {Array.from({ length: Math.floor((dbMax - dbMin) / dbStep) + 1 }, (_, i) => dbMin + i * dbStep)
              .filter(w => w <= dbMax)
              .join(', ')} kg
          </p>
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
          onClick={handleNext}
          className="flex-1 bg-white text-black font-semibold py-3 rounded-lg"
        >
          Suivant
        </button>
      </div>
    </div>
  )
}
