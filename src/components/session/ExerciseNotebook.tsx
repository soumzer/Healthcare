import { useState, useCallback, useEffect } from 'react'
import { useNotebook } from '../../hooks/useNotebook'
import { useRestTimer } from '../../hooks/useRestTimer'
import { generateWarmupSets } from '../../engine/warmup'
import type { BodyZone, NotebookEntry } from '../../db/types'
import type { FillerSuggestion } from '../../engine/filler'

export interface ExerciseNotebookProps {
  exercise: {
    exerciseId: number
    exerciseName: string
    instructions: string
    category: 'compound' | 'isolation' | 'rehab' | 'mobility' | 'core'
    primaryMuscles: string[]
    isRehab: boolean
  }
  target: {
    sets: number
    reps: number
    restSeconds: number
    intensity: 'heavy' | 'volume' | 'moderate'
  }
  exerciseIndex: number
  totalExercises: number
  userId: number
  fillerSuggestions: FillerSuggestion[]
  onNext: () => void
  onSkip: (zone: BodyZone) => void
}

const INTENSITY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  heavy: { bg: 'bg-blue-900/40', text: 'text-blue-400', label: 'Force' },
  volume: { bg: 'bg-emerald-900/40', text: 'text-emerald-400', label: 'Volume' },
  moderate: { bg: 'bg-amber-900/40', text: 'text-amber-400', label: 'Modere' },
}

const BODY_ZONES: { zone: BodyZone; label: string }[] = [
  { zone: 'neck', label: 'Cou' },
  { zone: 'shoulder_left', label: 'Epaule G' },
  { zone: 'shoulder_right', label: 'Epaule D' },
  { zone: 'elbow_left', label: 'Coude G' },
  { zone: 'elbow_right', label: 'Coude D' },
  { zone: 'wrist_left', label: 'Poignet G' },
  { zone: 'wrist_right', label: 'Poignet D' },
  { zone: 'upper_back', label: 'Haut du dos' },
  { zone: 'lower_back', label: 'Bas du dos' },
  { zone: 'hip_left', label: 'Hanche G' },
  { zone: 'hip_right', label: 'Hanche D' },
  { zone: 'knee_left', label: 'Genou G' },
  { zone: 'knee_right', label: 'Genou D' },
  { zone: 'ankle_left', label: 'Cheville G' },
  { zone: 'ankle_right', label: 'Cheville D' },
  { zone: 'foot_left', label: 'Pied G' },
  { zone: 'foot_right', label: 'Pied D' },
]

export default function ExerciseNotebook({
  exercise,
  target,
  exerciseIndex,
  totalExercises,
  userId,
  fillerSuggestions,
  onNext,
  onSkip,
}: ExerciseNotebookProps) {
  const notebook = useNotebook(
    userId,
    exercise.exerciseId,
    exercise.exerciseName,
    target.intensity,
    onNext,
    onSkip,
  )

  const timer = useRestTimer(target.restSeconds)

  const [showDescription, setShowDescription] = useState(false)
  const [showSkipModal, setShowSkipModal] = useState(false)
  const [showOccupied, setShowOccupied] = useState(false)
  const [workingWeight, setWorkingWeight] = useState<string>('')

  // Warmup sets for compounds
  const isCompound = exercise.category === 'compound'
  const ww = parseFloat(workingWeight) || 0
  const warmupSets = isCompound && ww > 20 ? generateWarmupSets(ww) : []

  // Set input state
  const [inputWeight, setInputWeight] = useState('')
  const [inputReps, setInputReps] = useState('')

  // Pre-fill weight from last session when history loads
  useEffect(() => {
    if (notebook.lastWeight !== null && inputWeight === '') {
      setInputWeight(String(notebook.lastWeight))
    }
  }, [notebook.lastWeight])

  const handleAddSet = useCallback(() => {
    const w = parseFloat(inputWeight)
    const r = parseInt(inputReps, 10)
    if (isNaN(w) || w < 0 || !r || r <= 0) return
    notebook.addSet(w, r)
    // Keep weight, clear reps for next set
    setInputReps('')
    // Start rest timer after logging a set
    timer.reset()
    timer.start()
  }, [inputWeight, inputReps, notebook, timer])

  const intensityInfo = INTENSITY_COLORS[target.intensity]

  return (
    <div className="flex flex-col min-h-[calc(100dvh-4rem)] bg-zinc-950 text-white">
      {/* Skip modal */}
      {showSkipModal && (
        <SkipModal
          onSelect={(zone) => { setShowSkipModal(false); notebook.skipExercise(zone) }}
          onCancel={() => setShowSkipModal(false)}
        />
      )}

      {/* Occupied overlay */}
      {showOccupied && (
        <OccupiedOverlay
          suggestions={fillerSuggestions}
          onClose={() => setShowOccupied(false)}
        />
      )}

      <div className="flex-1 overflow-auto px-4 pt-4 pb-32">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={onNext} className="text-zinc-400 text-sm">
            Passer
          </button>
          <span className="text-zinc-500 text-sm">{exerciseIndex + 1}/{totalExercises}</span>
        </div>

        {/* Exercise name + intensity badge */}
        <div className="mb-3">
          <h1 className="text-xl font-bold uppercase">{exercise.exerciseName}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-zinc-400 text-sm">
              {target.sets} x {target.reps} reps — repos {formatRestLabel(target.restSeconds)}
            </span>
            {intensityInfo && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${intensityInfo.bg} ${intensityInfo.text}`}>
                {intensityInfo.label}
              </span>
            )}
          </div>
          <p className="text-zinc-500 text-xs mt-1">
            Increment: {isCompound ? '+2.5kg' : '+1.25kg'} quand reussi
          </p>
        </div>

        {/* Description toggle */}
        {exercise.instructions && (
          <button
            onClick={() => setShowDescription(d => !d)}
            className="text-zinc-400 text-xs underline mb-3"
          >
            {showDescription ? 'Masquer description' : 'Voir description'}
          </button>
        )}
        {showDescription && exercise.instructions && (
          <p className="text-zinc-400 text-sm bg-zinc-900 rounded-lg p-3 mb-3">
            {exercise.instructions}
          </p>
        )}

        {/* Warmup (compounds only) */}
        {isCompound && (
          <div className="bg-zinc-900 rounded-xl p-3 mb-4">
            <p className="text-zinc-400 text-xs uppercase tracking-wider mb-2">Echauffement</p>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-zinc-400 text-sm">Poids travail:</span>
              <input
                type="number"
                inputMode="decimal"
                value={workingWeight}
                onChange={e => setWorkingWeight(e.target.value)}
                placeholder="kg"
                className="w-20 bg-zinc-800 text-white text-center rounded-lg px-2 py-1.5 text-sm"
              />
              <span className="text-zinc-500 text-sm">kg</span>
            </div>
            {warmupSets.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {warmupSets.map((ws, i) => (
                  <span key={i} className="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded">
                    {ws.label || `${ws.weightKg}kg`} x {ws.reps}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Set input */}
        <div className="bg-zinc-900 rounded-xl p-3 mb-4">
          <p className="text-zinc-400 text-xs uppercase tracking-wider mb-3">Series</p>

          {/* Completed sets */}
          {notebook.currentSets.map((set, i) => (
            <div key={i} className="flex items-center gap-2 mb-2 text-sm">
              <span className="text-emerald-400 w-6">S{i + 1}</span>
              <span className="text-white">{set.weightKg}kg</span>
              <span className="text-zinc-500">x</span>
              <span className="text-white">{set.reps}</span>
              {set.reps >= target.reps ? (
                <span className="text-emerald-400 text-xs ml-auto">OK</span>
              ) : (
                <span className="text-amber-400 text-xs ml-auto">-{target.reps - set.reps}</span>
              )}
            </div>
          ))}

          {/* Input row for next set */}
          {notebook.currentSets.length < target.sets + 2 && (
            <div className="flex items-center gap-2 mt-3">
              <span className="text-zinc-500 w-6 text-sm">S{notebook.currentSets.length + 1}</span>
              <input
                type="number"
                inputMode="decimal"
                value={inputWeight}
                onChange={e => setInputWeight(e.target.value)}
                placeholder="kg"
                className="w-20 bg-zinc-800 text-white text-center rounded-lg px-2 py-2 text-sm"
              />
              <span className="text-zinc-500 text-sm">x</span>
              <input
                type="number"
                inputMode="numeric"
                value={inputReps}
                onChange={e => setInputReps(e.target.value)}
                placeholder="reps"
                className="w-16 bg-zinc-800 text-white text-center rounded-lg px-2 py-2 text-sm"
              />
              <button
                onClick={handleAddSet}
                disabled={!inputWeight || !inputReps}
                className="ml-auto bg-zinc-700 text-white rounded-lg px-3 py-2 text-sm disabled:opacity-30"
              >
                +
              </button>
            </div>
          )}

          {/* Remove last set */}
          {notebook.currentSets.length > 0 && (
            <button
              onClick={notebook.removeLastSet}
              className="text-zinc-500 text-xs mt-2 underline"
            >
              Supprimer derniere serie
            </button>
          )}
        </div>

        {/* Rest timer */}
        <div className="bg-zinc-900 rounded-xl p-3 mb-4">
          <p className="text-zinc-400 text-xs uppercase tracking-wider mb-2">Repos</p>
          <div className="flex items-center gap-4">
            <span className={`text-3xl font-mono font-bold ${timer.remaining === 0 && timer.isRunning === false && notebook.currentSets.length > 0 ? 'text-emerald-400' : 'text-white'}`}>
              {timer.formatTime()}
            </span>
            <div className="flex gap-2">
              {timer.isRunning ? (
                <button onClick={timer.pause} className="bg-zinc-700 text-white rounded-lg px-4 py-2 text-sm">
                  Pause
                </button>
              ) : (
                <button onClick={timer.start} className="bg-zinc-700 text-white rounded-lg px-4 py-2 text-sm">
                  Lancer
                </button>
              )}
              <button onClick={timer.reset} className="bg-zinc-800 text-zinc-400 rounded-lg px-3 py-2 text-sm">
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* History */}
        {notebook.history.length > 0 && (
          <div className="bg-zinc-900 rounded-xl p-3 mb-4">
            <p className="text-zinc-400 text-xs uppercase tracking-wider mb-2">Historique</p>
            {notebook.history.map((entry, i) => (
              <HistoryRow key={entry.id ?? i} entry={entry} />
            ))}
          </div>
        )}
      </div>

      {/* Bottom bar — fixed */}
      <div className="fixed bottom-16 left-0 right-0 bg-zinc-950 border-t border-zinc-800 px-4 py-3 flex gap-3">
        <button
          onClick={() => setShowSkipModal(true)}
          className="bg-zinc-800 text-zinc-300 rounded-xl py-3 px-4 text-sm flex-shrink-0"
        >
          / Skip
        </button>
        <button
          onClick={() => setShowOccupied(true)}
          className="bg-zinc-800 text-zinc-300 rounded-xl py-3 px-4 text-sm flex-shrink-0"
        >
          Occupee
        </button>
        <button
          onClick={notebook.saveAndNext}
          disabled={notebook.isSaving}
          className="flex-1 bg-white text-black font-semibold rounded-xl py-3 text-lg disabled:opacity-50"
        >
          OK
        </button>
      </div>
    </div>
  )
}

// --- Sub-components ---

function HistoryRow({ entry }: { entry: NotebookEntry }) {
  if (entry.skipped) {
    return (
      <div className="text-zinc-500 text-xs mb-1">
        {formatDate(entry.date)} — skip ({entry.skipZone})
      </div>
    )
  }
  const intensityInfo = INTENSITY_COLORS[entry.sessionIntensity]
  return (
    <div className="flex items-center gap-2 mb-1 text-xs">
      <span className="text-zinc-500 w-16 flex-shrink-0">{formatDate(entry.date)}</span>
      {intensityInfo && (
        <span className={`px-1.5 py-0.5 rounded ${intensityInfo.bg} ${intensityInfo.text}`}>
          {intensityInfo.label.charAt(0)}
        </span>
      )}
      <span className="text-zinc-300 truncate">
        {entry.sets.map(s => `${s.weightKg}x${s.reps}`).join(' / ')}
      </span>
    </div>
  )
}

function SkipModal({ onSelect, onCancel }: { onSelect: (zone: BodyZone) => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end">
      <div className="w-full bg-zinc-900 rounded-t-2xl p-4 max-h-[70vh] overflow-auto">
        <p className="text-white font-bold text-lg mb-3">Ou as-tu eu mal ?</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {BODY_ZONES.map(({ zone, label }) => (
            <button
              key={zone}
              onClick={() => onSelect(zone)}
              className="bg-zinc-800 text-zinc-300 rounded-xl py-3 px-3 text-sm text-left"
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={onCancel}
          className="w-full bg-zinc-800 text-zinc-400 rounded-xl py-3 text-sm"
        >
          Annuler
        </button>
      </div>
    </div>
  )
}

function OccupiedOverlay({
  suggestions,
  onClose,
}: {
  suggestions: FillerSuggestion[]
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end">
      <div className="w-full bg-zinc-900 rounded-t-2xl p-4">
        <p className="text-white font-bold text-lg mb-3">Machine occupee</p>
        <p className="text-zinc-400 text-sm mb-4">En attendant, essaie :</p>
        {suggestions.length > 0 ? (
          <div className="space-y-2 mb-4">
            {suggestions.slice(0, 3).map((s, i) => (
              <div key={i} className="bg-zinc-800 rounded-xl p-3">
                <p className="text-white text-sm font-medium">{s.name}</p>
                <p className="text-zinc-400 text-xs">
                  {s.sets}x{s.reps} — {s.duration}
                  {s.isRehab && <span className="text-emerald-400 ml-1">(rehab)</span>}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-zinc-500 text-sm mb-4">Pas de suggestion disponible. Etire-toi !</p>
        )}
        <button
          onClick={onClose}
          className="w-full bg-white text-black font-semibold rounded-xl py-3 text-lg"
        >
          Machine libre
        </button>
      </div>
    </div>
  )
}

function formatDate(date: Date): string {
  const d = new Date(date)
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  return `${day}/${month}`
}

function formatRestLabel(seconds: number): string {
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return secs > 0 ? `${mins}m${secs}s` : `${mins}min`
  }
  return `${seconds}s`
}
