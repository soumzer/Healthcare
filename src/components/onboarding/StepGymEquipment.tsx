import type { useOnboarding } from '../../hooks/useOnboarding'
import type { GymEquipment } from '../../db/types'

type Props = ReturnType<typeof useOnboarding>

type EquipmentItem = Omit<GymEquipment, 'id' | 'userId'>

interface Category {
  title: string
  items: EquipmentItem[]
}

const categories: Category[] = [
  {
    title: 'Machines',
    items: [
      { name: 'Presse a cuisses', type: 'machine', isAvailable: true, notes: '' },
      { name: 'Machine developpe couche', type: 'machine', isAvailable: true, notes: '' },
      { name: 'Poulie haute', type: 'cable', isAvailable: true, notes: '' },
      { name: 'Poulie basse', type: 'cable', isAvailable: true, notes: '' },
      { name: 'Machine leg curl', type: 'machine', isAvailable: true, notes: '' },
      { name: 'Machine leg extension', type: 'machine', isAvailable: true, notes: '' },
      { name: 'Smith machine', type: 'machine', isAvailable: true, notes: '' },
      { name: 'Pec deck', type: 'machine', isAvailable: true, notes: '' },
    ],
  },
  {
    title: 'Poids libres',
    items: [
      { name: 'Banc plat', type: 'free_weight', isAvailable: true, notes: '' },
      { name: 'Banc incline', type: 'free_weight', isAvailable: true, notes: '' },
      { name: 'Halteres', type: 'free_weight', isAvailable: true, notes: '' },
      { name: 'Barre droite', type: 'free_weight', isAvailable: true, notes: '' },
      { name: 'Barre EZ', type: 'free_weight', isAvailable: true, notes: '' },
      { name: 'Rack a squat', type: 'free_weight', isAvailable: true, notes: '' },
    ],
  },
  {
    title: 'Autre',
    items: [
      { name: 'Bandes elastiques', type: 'band', isAvailable: true, notes: '' },
      { name: 'TRX', type: 'bodyweight', isAvailable: true, notes: '' },
      { name: 'Cables', type: 'cable', isAvailable: true, notes: '' },
    ],
  },
]

export default function StepGymEquipment({ state, updateEquipment, nextStep, prevStep }: Props) {
  const selectedNames = new Set(state.equipment.map(e => e.name))

  const toggleItem = (item: EquipmentItem) => {
    if (selectedNames.has(item.name)) {
      updateEquipment(state.equipment.filter(e => e.name !== item.name))
    } else {
      updateEquipment([...state.equipment, item])
    }
  }

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">Equipement disponible</h2>
      <p className="text-sm text-zinc-400">
        Cochez le materiel auquel vous avez acces.
      </p>

      {categories.map(cat => (
        <div key={cat.title}>
          <h3 className="text-sm font-semibold text-zinc-400 mb-2">{cat.title}</h3>
          <div className="space-y-1">
            {cat.items.map(item => (
              <button
                key={item.name}
                type="button"
                onClick={() => toggleItem(item)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  selectedNames.has(item.name)
                    ? 'bg-zinc-800 text-white'
                    : 'bg-zinc-900 text-zinc-400'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                    selectedNames.has(item.name)
                      ? 'bg-white border-white'
                      : 'border-zinc-600'
                  }`}
                >
                  {selectedNames.has(item.name) && (
                    <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-sm">{item.name}</span>
              </button>
            ))}
          </div>
        </div>
      ))}

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
    </div>
  )
}
