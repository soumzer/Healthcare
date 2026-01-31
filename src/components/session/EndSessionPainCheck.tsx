import { useState } from 'react'
import type { BodyZone, PainCheck } from '../../db/types'

interface EndSessionPainCheckProps {
  userConditions: BodyZone[]
  onSubmit: (checks: PainCheck[]) => void
}

const bodyZoneLabels: Record<string, string> = {
  neck: 'Cou',
  shoulder_left: 'Epaule gauche',
  shoulder_right: 'Epaule droite',
  elbow_left: 'Coude gauche',
  elbow_right: 'Coude droit',
  wrist_left: 'Poignet gauche',
  wrist_right: 'Poignet droit',
  upper_back: 'Haut du dos',
  lower_back: 'Lombaires',
  hip_left: 'Hanche gauche',
  hip_right: 'Hanche droite',
  knee_left: 'Genou gauche',
  knee_right: 'Genou droit',
  ankle_left: 'Cheville gauche',
  ankle_right: 'Cheville droite',
  foot_left: 'Pied gauche',
  foot_right: 'Pied droit',
  other: 'Autre',
}

export default function EndSessionPainCheck({
  userConditions,
  onSubmit,
}: EndSessionPainCheckProps) {
  const [levels, setLevels] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    for (const zone of userConditions) {
      initial[zone] = 0
    }
    return initial
  })

  const handleLevelChange = (zone: BodyZone, level: number) => {
    setLevels((prev) => ({ ...prev, [zone]: level }))
  }

  const handleSubmit = () => {
    const checks: PainCheck[] = userConditions.map((zone) => ({
      zone,
      level: levels[zone] ?? 0,
    }))
    onSubmit(checks)
  }

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
          {userConditions.map((zone) => (
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
