import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db'
import type { BodyZone, HealthCondition } from '../../db/types'
import { bodyZones } from '../../constants/body-zones'
import { getDiagnosesForZone } from '../../data/rehab-protocols'

interface ConditionForm {
  bodyZone: BodyZone
  label: string
  diagnosis: string
  since: string
  notes: string
}

const emptyForm = (zone: BodyZone): ConditionForm => ({
  bodyZone: zone,
  label: '',
  diagnosis: '',
  since: '',
  notes: '',
})

const formFromCondition = (c: HealthCondition): ConditionForm => ({
  bodyZone: c.bodyZone,
  label: c.label,
  diagnosis: c.diagnosis,
  since: c.since,
  notes: c.notes,
})

interface Props {
  userId: number
}

export default function HealthConditionsManager({ userId }: Props) {
  const conditions = useLiveQuery(
    () => db.healthConditions.where('userId').equals(userId).toArray(),
    [userId]
  )

  const [editingId, setEditingId] = useState<number | null>(null)
  const [addingNew, setAddingNew] = useState(false)
  const [expandedZone, setExpandedZone] = useState<BodyZone | null>(null)
  const [form, setForm] = useState<ConditionForm | null>(null)

  if (conditions === undefined) return null

  const activeConditions = conditions.filter(c => c.isActive)
  const existingActiveZones = new Set(activeConditions.map(c => c.bodyZone))

  const handleEditCondition = (c: HealthCondition) => {
    setEditingId(c.id!)
    setForm(formFromCondition(c))
    setAddingNew(false)
    setExpandedZone(null)
  }

  const handleStartAdd = () => {
    setAddingNew(true)
    setEditingId(null)
    setForm(null)
    setExpandedZone(null)
  }

  const handleZoneTap = (zone: BodyZone) => {
    if (expandedZone === zone) {
      setExpandedZone(null)
      setForm(null)
    } else {
      setExpandedZone(zone)
      // Check if there's an existing condition for this zone (active or not)
      const existing = conditions.find(c => c.bodyZone === zone)
      if (existing) {
        setForm(formFromCondition(existing))
        setEditingId(existing.id!)
      } else {
        setForm(emptyForm(zone))
        setEditingId(null)
      }
    }
  }

  const handleSaveEdit = async () => {
    if (!form || editingId === null) return
    const zoneName = bodyZones.find(z => z.zone === form.bodyZone)?.label ?? ''
    const label = form.label.trim() || `Douleur ${zoneName}`
    await db.healthConditions.update(editingId, {
      label,
      diagnosis: form.diagnosis,
      painLevel: 0, // User decides to skip exercises themselves
      since: form.since,
      notes: form.notes,
      isActive: true,
    })
    setEditingId(null)
    setForm(null)
  }

  const handleSaveNew = async () => {
    if (!form) return
    const zoneName = bodyZones.find(z => z.zone === form.bodyZone)?.label ?? ''
    const label = form.label.trim() || `Douleur ${zoneName}`

    // Check if there's an existing (possibly inactive) condition for this zone
    const existing = conditions.find(c => c.bodyZone === form.bodyZone)
    if (existing) {
      await db.healthConditions.update(existing.id!, {
        label,
        diagnosis: form.diagnosis,
        painLevel: 0, // User decides to skip exercises themselves
        since: form.since,
        notes: form.notes,
        isActive: true,
      })
    } else {
      await db.healthConditions.add({
        userId,
        bodyZone: form.bodyZone,
        label,
        diagnosis: form.diagnosis,
        painLevel: 0, // User decides to skip exercises themselves
        since: form.since,
        notes: form.notes,
        isActive: true,
        createdAt: new Date(),
      })
    }
    setAddingNew(false)
    setExpandedZone(null)
    setForm(null)
  }

  const handleDeactivate = async (id: number) => {
    await db.healthConditions.update(id, { isActive: false })
    setEditingId(null)
    setForm(null)
  }

  const handleCancel = () => {
    setEditingId(null)
    setAddingNew(false)
    setExpandedZone(null)
    setForm(null)
  }

  const renderForm = (onSave: () => void, existingId?: number) => {
    if (!form) return null
    const availableDiagnoses = getDiagnosesForZone(form.bodyZone)

    return (
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 space-y-3">
        <h3 className="font-semibold text-sm text-zinc-300">
          {bodyZones.find(z => z.zone === form.bodyZone)?.label}
        </h3>

        <div>
          <label className="block text-xs text-zinc-400 mb-1">
            Qu'est-ce que vous avez ?
          </label>
          <select
            value={form.diagnosis}
            onChange={e => {
              const diagnosis = e.target.value
              const label = diagnosis || `Douleur ${bodyZones.find(z => z.zone === form.bodyZone)?.label ?? ''}`
              setForm({ ...form, diagnosis, label })
            }}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
          >
            <option value="">Je sais pas (rehab général)</option>
            {availableDiagnoses.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onSave}
            className="flex-1 bg-white text-black font-semibold py-2 rounded-lg text-sm"
          >
            Enregistrer
          </button>
          {existingId !== undefined && (
            <button
              type="button"
              onClick={() => handleDeactivate(existingId)}
              className="px-4 py-2 bg-red-900 text-red-200 rounded-lg text-sm"
            >
              Guéri
            </button>
          )}
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-sm"
          >
            Annuler
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">
          Mes conditions de santé
        </h3>
      </div>

      {/* Active conditions list */}
      {activeConditions.length > 0 && editingId === null && !addingNew && (
        <div className="space-y-2">
          {activeConditions.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleEditCondition(c)}
              className="w-full flex items-center justify-between bg-zinc-800 rounded-xl px-4 py-3 text-left"
            >
              <div>
                <span className="text-sm text-white">{c.label}</span>
                {c.diagnosis && (
                  <span className="text-xs text-zinc-400 ml-2">{c.diagnosis}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {activeConditions.length === 0 && editingId === null && !addingNew && (
        <p className="text-sm text-zinc-400">Aucune condition active.</p>
      )}

      {/* Edit existing condition */}
      {editingId !== null && !addingNew && renderForm(handleSaveEdit, editingId)}

      {/* Add new condition — zone picker */}
      {addingNew && (
        <div className="space-y-3">
          <p className="text-sm text-zinc-400">Touchez la zone concernée :</p>
          <div className="flex flex-wrap gap-2">
            {bodyZones.map(({ zone, label }) => (
              <button
                key={zone}
                type="button"
                onClick={() => handleZoneTap(zone)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  existingActiveZones.has(zone)
                    ? 'bg-zinc-700 text-zinc-400'
                    : expandedZone === zone
                      ? 'bg-white text-black'
                      : 'bg-zinc-800 text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {expandedZone && form && renderForm(
            editingId !== null ? handleSaveEdit : handleSaveNew,
            editingId ?? undefined
          )}
        </div>
      )}

      {/* Add button */}
      {editingId === null && !addingNew && (
        <button
          type="button"
          onClick={handleStartAdd}
          className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-colors text-sm"
        >
          + Ajouter une condition
        </button>
      )}

    </div>
  )
}
