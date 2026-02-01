import { useState } from 'react'
import type { BodyZone, PainCheck } from '../../db/types'
import { bodyZones, bodyZoneLabels } from '../../constants/body-zones'
import { db } from '../../db'

interface EndSessionPainCheckProps {
  userConditions: BodyZone[]
  onSubmit: (checks: PainCheck[]) => void
  userId?: number
}

export default function EndSessionPainCheck({
  userConditions,
  onSubmit,
  userId,
}: EndSessionPainCheckProps) {
  const [addedZones, setAddedZones] = useState<BodyZone[]>([])
  const allZones = [...userConditions, ...addedZones]

  const [levels, setLevels] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    for (const zone of userConditions) {
      initial[zone] = 0
    }
    return initial
  })

  const [showZonePicker, setShowZonePicker] = useState(false)

  const handleLevelChange = (zone: BodyZone, level: number) => {
    setLevels((prev) => ({ ...prev, [zone]: level }))
  }

  const handleSubmit = () => {
    const checks: PainCheck[] = allZones.map((zone) => ({
      zone,
      level: levels[zone] ?? 0,
    }))
    onSubmit(checks)
  }

  const handleAddZone = async (zone: BodyZone) => {
    // Add the zone to local state with default pain level
    setAddedZones((prev) => [...prev, zone])
    setLevels((prev) => ({ ...prev, [zone]: 3 }))
    setShowZonePicker(false)

    // Save to DB if userId is available
    if (userId) {
      // Check if there's an existing inactive condition for this zone
      const existing = await db.healthConditions
        .where('userId')
        .equals(userId)
        .and((c) => c.bodyZone === zone)
        .first()

      if (existing) {
        await db.healthConditions.update(existing.id!, {
          isActive: true,
          painLevel: 3,
        })
      } else {
        const label = bodyZoneLabels[zone] ?? zone
        await db.healthConditions.add({
          userId,
          bodyZone: zone,
          label: `Douleur ${label}`,
          diagnosis: '',
          painLevel: 3,
          since: '',
          notes: '',
          isActive: true,
          createdAt: new Date(),
        })
      }

      // Log pain
      await db.painLogs.add({
        userId,
        zone,
        level: 3,
        context: 'end_session',
        date: new Date(),
      })
    }
  }

  const existingZonesSet = new Set(allZones)
  const availableZones = bodyZones.filter(
    ({ zone }) => !existingZonesSet.has(zone)
  )

  return (
    <div className="flex flex-col min-h-[80vh] p-4">
      <div className="flex-1">
        <div className="text-center mb-8">
          <p className="text-3xl mb-2">Seance terminee</p>
          <p className="text-zinc-400">
            Comment vont tes zones sensibles ?
          </p>
        </div>

        <div className="space-y-6">
          {allZones.map((zone) => (
            <div key={zone}>
              <p className="text-white font-medium mb-2">
                {bodyZoneLabels[zone] ?? zone}
              </p>
              <div className="flex gap-2">
                {[0, 1, 2, 3, 4, 5].map((level) => (
                  <button
                    key={level}
                    onClick={() => handleLevelChange(zone, level)}
                    className={`flex-1 rounded-xl py-3 text-lg font-semibold ${
                      levels[zone] === level
                        ? level === 0
                          ? 'bg-green-600 text-white'
                          : level <= 2
                            ? 'bg-yellow-600 text-white'
                            : 'bg-red-600 text-white'
                        : 'bg-zinc-800 text-white'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* New pain zone picker */}
        {showZonePicker && (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-zinc-400">Ou as-tu mal ?</p>
            <div className="flex flex-wrap gap-2">
              {availableZones.map(({ zone, label }) => (
                <button
                  key={zone}
                  type="button"
                  onClick={() => handleAddZone(zone)}
                  className="px-3 py-2 rounded-lg text-sm font-medium bg-zinc-800 text-white transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowZonePicker(false)}
              className="text-sm text-zinc-500"
            >
              Annuler
            </button>
          </div>
        )}

        {/* Add new pain button */}
        {!showZonePicker && availableZones.length > 0 && (
          <button
            type="button"
            onClick={() => setShowZonePicker(true)}
            className="w-full mt-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-colors text-sm"
          >
            Signaler une nouvelle douleur
          </button>
        )}
      </div>

      <div className="pb-4 pt-6">
        <button
          onClick={handleSubmit}
          className="w-full bg-white text-black font-semibold rounded-xl py-4 text-lg"
        >
          Terminer
        </button>
      </div>
    </div>
  )
}
