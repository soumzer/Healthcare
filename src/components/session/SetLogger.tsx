import { useState } from 'react'
import type { BodyZone } from '../../db/types'

interface SetLoggerProps {
  prescribedReps: number
  prescribedWeightKg: number
  userConditions: BodyZone[]
  onSubmit: (
    reps: number,
    weightKg: number,
    rir: number,
    pain?: { zone: BodyZone; level: number }
  ) => void
}

const bodyZoneLabels: Record<string, string> = {
  neck: 'Cou',
  shoulder_left: 'Épaule gauche',
  shoulder_right: 'Épaule droite',
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

function painColor(level: number): string {
  if (level === 0) return 'bg-emerald-600'
  if (level <= 2) return 'bg-emerald-700'
  if (level <= 4) return 'bg-amber-500'
  if (level <= 6) return 'bg-orange-500'
  return 'bg-red-600'
}

export default function SetLogger({
  prescribedReps,
  prescribedWeightKg,
  userConditions,
  onSubmit,
}: SetLoggerProps) {
  const [reps, setReps] = useState(prescribedReps > 0 ? String(prescribedReps) : '')
  const [weight, setWeight] = useState(prescribedWeightKg > 0 ? String(prescribedWeightKg) : '')
  const [rir, setRir] = useState(2)
  const [hasPain, setHasPain] = useState(false)
  const [showRirHelp, setShowRirHelp] = useState(false)
  const [painZone, setPainZone] = useState<BodyZone | null>(
    userConditions[0] ?? null
  )
  const [painLevel, setPainLevel] = useState(1)

  const parsedReps = parseInt(reps) || 0
  const parsedWeight = parseFloat(weight) || 0

  const handleSubmit = () => {
    const pain =
      hasPain && painZone
        ? { zone: painZone, level: painLevel }
        : undefined
    onSubmit(parsedReps, parsedWeight, rir, pain)
  }

  return (
    <div className="flex flex-col min-h-[80vh] p-4">
      <div className="flex-1 space-y-6">
        {/* Reps */}
        <div>
          <label className="block text-zinc-400 text-sm mb-2">
            Reps réussies
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            placeholder="0"
            className="w-full bg-zinc-900 text-white text-4xl font-bold text-center rounded-xl py-4 border border-zinc-700 focus:border-emerald-400 focus:outline-none placeholder:text-zinc-600"
          />
        </div>

        {/* Weight */}
        <div>
          <label className="block text-zinc-400 text-sm mb-2">
            Poids (kg)
          </label>
          <input
            type="number"
            inputMode="decimal"
            step="0.5"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="0"
            className="w-full bg-zinc-900 text-white text-2xl font-bold text-center rounded-xl py-3 border border-zinc-700 focus:border-emerald-400 focus:outline-none placeholder:text-zinc-600"
          />
        </div>

        {/* RIR */}
        <div>
          <label className="block text-zinc-400 text-sm mb-2">
            En réserve (RIR)
            <button
              onClick={() => setShowRirHelp(v => !v)}
              className="text-zinc-400 text-xs ml-1"
              type="button"
              aria-label="Aide RIR"
            >
              ?
            </button>
          </label>
          {showRirHelp && (
            <p className="text-zinc-400 text-xs mt-1 mb-2">
              Reps In Reserve = répétitions que tu aurais pu faire en plus.
              0 = échec, 1 = il en restait 1, 2 = confortable, 3 = facile.
            </p>
          )}
          <div className="flex gap-2">
            {[0, 1, 2, 3, 4].map((value) => (
              <button
                key={value}
                onClick={() => setRir(value)}
                className={`flex-1 rounded-xl py-3 text-lg font-semibold ${
                  rir === value
                    ? 'bg-white text-black'
                    : 'bg-zinc-800 text-white'
                }`}
              >
                {value === 4 ? '4+' : value}
              </button>
            ))}
          </div>
        </div>

        {/* Pain */}
        <div>
          <label className="block text-zinc-400 text-sm mb-2">
            Douleur ?
          </label>
          <div className="flex gap-3 mb-3">
            <button
              onClick={() => setHasPain(false)}
              className={`flex-1 rounded-xl py-3 text-lg font-semibold ${
                !hasPain ? 'bg-white text-black' : 'bg-zinc-800 text-white'
              }`}
            >
              Non
            </button>
            <button
              onClick={() => setHasPain(true)}
              className={`flex-1 rounded-xl py-3 text-lg font-semibold ${
                hasPain ? 'bg-red-600 text-white' : 'bg-zinc-800 text-white'
              }`}
            >
              Oui
            </button>
          </div>

          {hasPain && (
            <div className="space-y-3 bg-zinc-900 rounded-xl p-4">
              {/* Zone selector */}
              <div>
                <label className="block text-zinc-400 text-xs mb-2">
                  Zone
                </label>
                <select
                  value={painZone ?? ''}
                  onChange={(e) => setPainZone(e.target.value as BodyZone)}
                  className="w-full bg-zinc-800 text-white rounded-xl py-3 px-4 focus:outline-none"
                >
                  {userConditions.map((zone) => (
                    <option key={zone} value={zone}>
                      {bodyZoneLabels[zone] ?? zone}
                    </option>
                  ))}
                </select>
              </div>
              {/* Pain level */}
              <div>
                <label className="block text-zinc-400 text-xs mb-2">
                  Intensité (1-10)
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                    <button
                      key={level}
                      onClick={() => setPainLevel(level)}
                      className={`rounded-xl py-2 text-sm font-semibold ${
                        painLevel === level
                          ? `${painColor(level)} text-white`
                          : 'bg-zinc-800 text-white'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="pb-4 pt-4">
        <button
          onClick={handleSubmit}
          className="w-full bg-white text-black font-semibold rounded-xl py-4 text-lg"
        >
          Valider
        </button>
      </div>
    </div>
  )
}
