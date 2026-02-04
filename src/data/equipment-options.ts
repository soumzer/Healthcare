import type { GymEquipment } from '../db/types'

export type EquipmentItem = Omit<GymEquipment, 'id' | 'userId'>

export interface EquipmentOption {
  /** Tag name saved to DB — must match exercise equipmentNeeded values */
  tag: string
  /** Human-readable label displayed in the UI */
  label: string
  type: GymEquipment['type']
  /** Extra tags to add when this is selected (e.g. 'dumbbells' alias) */
  alsoAdd?: string[]
}

export interface Category {
  title: string
  items: EquipmentOption[]
}

export const categories: Category[] = [
  {
    title: 'Machines',
    items: [
      { tag: 'leg_press', label: 'Presse à cuisses', type: 'machine' },
      { tag: 'leg_curl', label: 'Leg curl', type: 'machine' },
      { tag: 'leg_extension', label: 'Leg extension', type: 'machine' },
      { tag: 'pec_press', label: 'Pec press', type: 'machine' },
      { tag: 'pec_deck', label: 'Pec deck / butterfly', type: 'machine' },
      { tag: 'shoulder_press', label: 'Dev militaire machine', type: 'machine' },
      { tag: 'rowing_machine', label: 'Rowing assis machine', type: 'machine' },
      { tag: 'lat_pulldown', label: 'Lat pulldown', type: 'machine' },
      { tag: 'smith_machine', label: 'Smith machine (barre guidée)', type: 'machine' },
      { tag: 'cable', label: 'Poulie / cable', type: 'cable', alsoAdd: ['rope_attachment'] },
      { tag: 'hip_abduction', label: 'Machine abduction/adduction', type: 'machine' },
      { tag: 'hack_squat', label: 'Hack squat', type: 'machine' },
    ],
  },
  {
    title: 'Poids libres',
    items: [
      { tag: 'dumbbell', label: 'Haltères', type: 'free_weight', alsoAdd: ['dumbbells'] },
      { tag: 'barbell', label: 'Barres (droite/EZ)', type: 'free_weight' },
      { tag: 'bench', label: 'Banc de musculation', type: 'free_weight' },
      { tag: 'squat_rack', label: 'Rack à squat', type: 'free_weight' },
      { tag: 'kettlebell', label: 'Kettlebell', type: 'free_weight' },
      { tag: 'sandbag', label: 'Sac lesté', type: 'free_weight' },
    ],
  },
  {
    title: 'Accessoires',
    items: [
      { tag: 'mat', label: 'Tapis de sol', type: 'other' },
      { tag: 'resistance_band', label: 'Bandes élastiques', type: 'band' },
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
      { tag: 'bike', label: 'Vélo', type: 'machine' },
      { tag: 'elliptical', label: 'Elliptique', type: 'machine' },
    ],
  },
]

export function tagsForOption(opt: EquipmentOption): string[] {
  return [opt.tag, ...(opt.alsoAdd ?? [])]
}

/** All equipment items derived from categories -- used for the "select all" preset. */
export const ALL_EQUIPMENT: EquipmentItem[] = categories.flatMap(cat =>
  cat.items.flatMap(opt =>
    tagsForOption(opt).map(tag => ({
      name: tag,
      type: opt.type,
      isAvailable: true,
      notes: '',
    }))
  )
)
