import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db'
import {
  type EquipmentOption,
  categories,
  tagsForOption,
  ALL_EQUIPMENT,
} from '../../data/equipment-options'

interface Props {
  userId: number
  onRegenerate: () => Promise<{ success: boolean; error?: string }>
  isRegenerating: boolean
}

export default function EquipmentManager({ userId, onRegenerate, isRegenerating }: Props) {
  const equipment = useLiveQuery(
    () => db.gymEquipment.where('userId').equals(userId).toArray(),
    [userId]
  )

  const [equipmentChanged, setEquipmentChanged] = useState(false)
  const [regenerateResult, setRegenerateResult] = useState<{ success: boolean; error?: string } | null>(null)

  if (equipment === undefined) return null

  const selectedTags = new Set(equipment.map(e => e.name))

  const toggleItem = async (opt: EquipmentOption) => {
    const tags = tagsForOption(opt)
    if (selectedTags.has(opt.tag)) {
      // Remove all tags associated with this option
      const idsToRemove = equipment
        .filter(e => tags.includes(e.name))
        .map(e => e.id!)
      await db.gymEquipment.bulkDelete(idsToRemove)
    } else {
      // Add all tags
      const newItems = tags.map(tag => ({
        userId,
        name: tag,
        type: opt.type,
        isAvailable: true,
        notes: '',
      }))
      await db.gymEquipment.bulkAdd(newItems)
    }
    setEquipmentChanged(true)
    setRegenerateResult(null)
  }

  const handleSelectAll = async () => {
    // Clear existing
    const allIds = equipment.map(e => e.id!)
    if (allIds.length > 0) {
      await db.gymEquipment.bulkDelete(allIds)
    }
    // Add all equipment
    const items = ALL_EQUIPMENT.map(e => ({ ...e, userId }))
    await db.gymEquipment.bulkAdd(items)
    setEquipmentChanged(true)
    setRegenerateResult(null)
  }

  const handleSelectNone = async () => {
    const allIds = equipment.map(e => e.id!)
    if (allIds.length > 0) {
      await db.gymEquipment.bulkDelete(allIds)
    }
    setEquipmentChanged(true)
    setRegenerateResult(null)
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">
        Équipement disponible
      </h3>
      <p className="text-sm text-zinc-400">
        Cochez le matériel auquel vous avez accès.
      </p>

      {/* Preset buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleSelectAll}
          className="flex-1 py-3 rounded-lg bg-zinc-800 text-white text-sm"
        >
          Salle complète
        </button>
        <button
          type="button"
          onClick={handleSelectNone}
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

      {/* Regeneration banner */}
      {equipmentChanged && !regenerateResult?.success && (
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 space-y-2">
          <p className="text-sm text-white">
            Ton équipement a changé. Veux-tu régénérer ton programme ?
          </p>
          {regenerateResult?.error && (
            <p className="text-sm text-red-400">{regenerateResult.error}</p>
          )}
          <button
            type="button"
            disabled={isRegenerating}
            onClick={async () => {
              setRegenerateResult(null)
              const result = await onRegenerate()
              setRegenerateResult(result)
              if (result.success) {
                setEquipmentChanged(false)
              }
            }}
            className="w-full py-2 bg-white text-black font-semibold rounded-lg text-sm disabled:opacity-50"
          >
            {isRegenerating ? 'Régénération en cours...' : 'Régénérer le programme'}
          </button>
        </div>
      )}

      {/* Success feedback */}
      {regenerateResult?.success && (
        <div className="bg-emerald-900 border border-emerald-700 rounded-xl p-4">
          <p className="text-sm text-emerald-200">Programme régénéré avec succès !</p>
        </div>
      )}
    </div>
  )
}
