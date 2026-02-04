import type { useOnboarding } from '../../hooks/useOnboarding'
import {
  type EquipmentItem,
  type EquipmentOption,
  categories,
  tagsForOption,
  ALL_EQUIPMENT,
} from '../../data/equipment-options'

type Props = ReturnType<typeof useOnboarding>

export default function StepGymEquipment({ state, updateEquipment, nextStep, prevStep }: Props) {
  const selectedTags = new Set(state.equipment.map(e => e.name))

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

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        <h2 className="text-xl font-bold">Équipement disponible</h2>
        <p className="text-sm text-zinc-400">
          Cochez le matériel auquel vous avez accès.
        </p>

        {/* Preset buttons */}
        <div className="flex gap-3">
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
      </div>

      <div className="flex gap-3 pt-3 pb-2 flex-shrink-0">
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
    </div>
  )
}
