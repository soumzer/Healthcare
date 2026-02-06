import { useState, useMemo, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { NotebookEntry, NotebookSet, BodyZone } from '../db/types'
import { generateRestDayRoutine, type RestDayVariant } from '../engine/rest-day'
import { recordRehabExercisesDone } from '../utils/rehab-rotation'

const UPPER_ZONES: ReadonlySet<BodyZone> = new Set([
  'neck', 'shoulder_left', 'shoulder_right',
  'elbow_left', 'elbow_right',
  'wrist_left', 'wrist_right',
  'upper_back',
])

const LOWER_ZONES: ReadonlySet<BodyZone> = new Set([
  'lower_back',
  'hip_left', 'hip_right',
  'knee_left', 'knee_right',
  'ankle_left', 'ankle_right',
  'foot_left', 'foot_right',
])

const STORAGE_KEY = 'rest_day_last_variant'

const EXTERNAL_VIDEOS = [
  { id: 'full_body', label: 'Full body stretching', duration: '10 min' },
  { id: 'lower_back_hips', label: 'Lower back & hips mobility', duration: '7 min' },
  { id: 'neck_shoulders', label: 'Neck & shoulders release', duration: '8 min' },
  { id: 'knee', label: 'Knee rehab routine', duration: '6 min' },
  { id: 'ankles_feet', label: 'Ankles & feet mobility', duration: '5 min' },
]

const VARIANT_LABELS: Record<RestDayVariant, string> = {
  upper: 'Haut du corps',
  lower: 'Bas du corps',
  all: 'Routine complete',
}

const INTENSITY_LABELS: Record<string, { label: string; className: string }> = {
  very_light: { label: 'Tres leger', className: 'text-emerald-400 bg-emerald-900/30' },
  light: { label: 'Leger', className: 'text-blue-400 bg-blue-900/30' },
  moderate: { label: 'Modere', className: 'text-amber-400 bg-amber-900/30' },
}

function getNextVideoIndex(): number {
  const lastIdx = parseInt(localStorage.getItem('rehab_video_idx') ?? '-1', 10)
  return (lastIdx + 1) % EXTERNAL_VIDEOS.length
}

function pickVariant(conditions: { bodyZone: BodyZone }[]): RestDayVariant {
  const hasUpper = conditions.some(c => UPPER_ZONES.has(c.bodyZone))
  const hasLower = conditions.some(c => LOWER_ZONES.has(c.bodyZone))

  if (!hasUpper || !hasLower) return 'all'

  const last = localStorage.getItem(STORAGE_KEY) as RestDayVariant | null
  return last === 'upper' ? 'lower' : 'upper'
}

/** Check if reps string is time-based (e.g. "30s", "45s") */
function isTimeBased(reps: string): boolean {
  return /^\d+s$/.test(reps.trim())
}

/** Per-exercise local state for notebook logging */
interface ExerciseLogState {
  /** Logged sets for this exercise */
  sets: NotebookSet[]
  /** Current weight input */
  weightInput: string
  /** Current reps input */
  repsInput: string
  /** Whether this exercise is expanded */
  expanded: boolean
  /** Whether this time-based exercise is checked off */
  checked: boolean
}

export default function RehabPage() {
  const user = useLiveQuery(() => db.userProfiles.toCollection().first())
  const conditions = useLiveQuery(
    () => user?.id
      ? db.healthConditions.where('userId').equals(user.id).and(c => c.isActive).toArray()
      : [],
    [user?.id]
  )

  // Load active PainReports (accentDaysRemaining > 0) to prioritise those zones in rehab rotation
  const activePainReports = useLiveQuery(
    () => user?.id
      ? db.painReports
          .where('userId').equals(user.id)
          .filter(r => r.accentDaysRemaining > 0)
          .toArray()
      : [],
    [user?.id]
  )

  const accentZones = useMemo(
    () => {
      if (!activePainReports || activePainReports.length === 0) return []
      // Deduplicate zones
      return [...new Set(activePainReports.map(r => r.zone))]
    },
    [activePainReports]
  )

  const variant = useMemo(
    () => conditions && conditions.length > 0 ? pickVariant(conditions) : 'all' as RestDayVariant,
    [conditions]
  )

  const routine = useMemo(
    () => conditions && conditions.length > 0
      ? generateRestDayRoutine(conditions, variant, accentZones)
      : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conditions, variant, accentZones, refreshKey]
  )

  const [videoIdx] = useState(() => getNextVideoIndex())
  const [videoDone, setVideoDone] = useState(false)
  const video = EXTERNAL_VIDEOS[videoIdx]

  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // Per-exercise state (for regular rehab)
  const [exerciseLogs, setExerciseLogs] = useState<Record<number, ExerciseLogState>>({})
  // Per-exercise state for SA routine (separate from regular rehab)
  const [saLogs, setSaLogs] = useState<Record<number, ExerciseLogState>>({})

  /** Get or create log state for an exercise index */
  const getLog = useCallback((index: number): ExerciseLogState => {
    return exerciseLogs[index] ?? {
      sets: [],
      weightInput: '0',
      repsInput: '',
      expanded: false,
      checked: false,
    }
  }, [exerciseLogs])

  /** Get or create log state for SA exercise index */
  const getSaLog = useCallback((index: number): ExerciseLogState => {
    return saLogs[index] ?? {
      sets: [],
      weightInput: '0',
      repsInput: '',
      expanded: false,
      checked: false,
    }
  }, [saLogs])

  const updateLog = useCallback((index: number, patch: Partial<ExerciseLogState>) => {
    setExerciseLogs(prev => ({
      ...prev,
      [index]: { ...prev[index] ?? { sets: [], weightInput: '0', repsInput: '', expanded: false, checked: false }, ...patch },
    }))
  }, [])

  const updateSaLog = useCallback((index: number, patch: Partial<ExerciseLogState>) => {
    setSaLogs(prev => ({
      ...prev,
      [index]: { ...prev[index] ?? { sets: [], weightInput: '0', repsInput: '', expanded: false, checked: false }, ...patch },
    }))
  }, [])

  const toggleExpand = useCallback((index: number) => {
    setExerciseLogs(prev => {
      const current = prev[index] ?? { sets: [], weightInput: '0', repsInput: '', expanded: false, checked: false }
      return { ...prev, [index]: { ...current, expanded: !current.expanded } }
    })
  }, [])

  const toggleChecked = useCallback((index: number) => {
    setExerciseLogs(prev => {
      const current = prev[index] ?? { sets: [], weightInput: '0', repsInput: '', expanded: false, checked: false }
      return { ...prev, [index]: { ...current, checked: !current.checked } }
    })
  }, [])

  const toggleSaExpand = useCallback((index: number) => {
    setSaLogs(prev => {
      const current = prev[index] ?? { sets: [], weightInput: '0', repsInput: '', expanded: false, checked: false }
      return { ...prev, [index]: { ...current, expanded: !current.expanded } }
    })
  }, [])

  const toggleSaChecked = useCallback((index: number) => {
    setSaLogs(prev => {
      const current = prev[index] ?? { sets: [], weightInput: '0', repsInput: '', expanded: false, checked: false }
      return { ...prev, [index]: { ...current, checked: !current.checked } }
    })
  }, [])

  const addSet = useCallback((index: number) => {
    setExerciseLogs(prev => {
      const current = prev[index] ?? { sets: [], weightInput: '0', repsInput: '', expanded: false, checked: false }
      const weight = parseFloat(current.weightInput) || 0
      const reps = parseInt(current.repsInput) || 0
      if (reps <= 0) return prev
      return {
        ...prev,
        [index]: {
          ...current,
          sets: [...current.sets, { weightKg: weight, reps }],
          repsInput: '',
        },
      }
    })
  }, [])

  const removeLastSet = useCallback((index: number) => {
    setExerciseLogs(prev => {
      const current = prev[index]
      if (!current || current.sets.length === 0) return prev
      return {
        ...prev,
        [index]: { ...current, sets: current.sets.slice(0, -1) },
      }
    })
  }, [])

  const addSaSet = useCallback((index: number) => {
    setSaLogs(prev => {
      const current = prev[index] ?? { sets: [], weightInput: '0', repsInput: '', expanded: false, checked: false }
      const weight = parseFloat(current.weightInput) || 0
      const reps = parseInt(current.repsInput) || 0
      if (reps <= 0) return prev
      return {
        ...prev,
        [index]: {
          ...current,
          sets: [...current.sets, { weightKg: weight, reps }],
          repsInput: '',
        },
      }
    })
  }, [])

  const removeSaLastSet = useCallback((index: number) => {
    setSaLogs(prev => {
      const current = prev[index]
      if (!current || current.sets.length === 0) return prev
      return {
        ...prev,
        [index]: { ...current, sets: current.sets.slice(0, -1) },
      }
    })
  }, [])

  /** Count exercises that have data (sets logged or checked for time-based) */
  const exercisesWithData = useMemo(() => {
    if (!routine) return 0
    let count = routine.exercises.filter((ex, idx) => {
      const log = getLog(idx)
      if (isTimeBased(ex.reps)) return log.checked
      return log.sets.length > 0
    }).length

    // Count SA routine exercises too
    if (routine.saRoutine) {
      count += routine.saRoutine.filter((ex, idx) => {
        const log = getSaLog(idx)
        if (isTimeBased(ex.reps)) return log.checked
        return log.sets.length > 0
      }).length
    }

    return count
  }, [routine, exerciseLogs, saLogs, getLog, getSaLog])

  const canSave = exercisesWithData > 0 || videoDone

  const handleSave = useCallback(async () => {
    if (!user?.id || isSaving) return
    setIsSaving(true)

    try {
      const now = new Date()
      const completedNames: string[] = []
      let regularExercisesCompleted = 0

      // Save SA routine exercises first (don't count towards cooldown)
      if (routine?.saRoutine) {
        for (let i = 0; i < routine.saRoutine.length; i++) {
          const ex = routine.saRoutine[i]
          const log = getSaLog(i)
          const timeBased = isTimeBased(ex.reps)

          if (timeBased && !log.checked) continue
          if (!timeBased && log.sets.length === 0) continue

          const entry: NotebookEntry = {
            userId: user.id!,
            exerciseId: 0,
            exerciseName: ex.name,
            date: now,
            sessionIntensity: 'rehab',
            sets: timeBased
              ? [{ weightKg: 0, reps: ex.sets }]
              : log.sets.filter(s => s.reps > 0),
            skipped: false,
          }
          await db.notebookEntries.add(entry)
          completedNames.push(ex.name)
        }
      }

      // Save each regular exercise that has data as a NotebookEntry
      for (let i = 0; i < (routine?.exercises.length ?? 0); i++) {
        const ex = routine!.exercises[i]
        const log = getLog(i)
        const timeBased = isTimeBased(ex.reps)

        // Skip exercises with no data
        if (timeBased && !log.checked) continue
        if (!timeBased && log.sets.length === 0) continue

        const entry: NotebookEntry = {
          userId: user.id!,
          exerciseId: 0, // rehab exercises don't have DB IDs
          exerciseName: ex.name,
          date: now,
          sessionIntensity: 'rehab',
          sets: timeBased
            ? [{ weightKg: 0, reps: ex.sets }] // For time-based, record sets count as reps
            : log.sets.filter(s => s.reps > 0),
          skipped: false,
        }
        await db.notebookEntries.add(entry)
        completedNames.push(ex.name)
        regularExercisesCompleted++
      }

      // Record completed exercises for rotation tracking
      if (completedNames.length > 0) {
        recordRehabExercisesDone(completedNames)
      }

      // Update variant preference
      if (regularExercisesCompleted > 0 && variant !== 'all') {
        localStorage.setItem(STORAGE_KEY, variant)
      }

      // Decrement accentDaysRemaining on active PainReports (skip zone feature)
      if (regularExercisesCompleted > 0) {
        const activePainReports = await db.painReports
          .where('userId').equals(user.id!)
          .and(r => r.accentDaysRemaining > 0)
          .toArray()

        for (const report of activePainReports) {
          await db.painReports.update(report.id!, {
            accentDaysRemaining: Math.max(0, report.accentDaysRemaining - 1),
          })
        }
      }

      // Update video index
      localStorage.setItem('rehab_video_idx', String(videoIdx))

      setSaved(true)
    } finally {
      setIsSaving(false)
    }
  }, [user, routine, isSaving, getLog, getSaLog, variant, videoIdx])

  // --- Render ---

  if (!user || conditions === undefined) {
    return (
      <div className="flex items-center justify-center h-[var(--content-h)] overflow-hidden">
        <p className="text-zinc-400">Chargement...</p>
      </div>
    )
  }

  // Show saved confirmation for no-conditions case
  if (saved && conditions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[var(--content-h)] px-6 text-center overflow-hidden">
        <p className="text-4xl mb-4">✓</p>
        <p className="text-2xl font-bold mb-2">Routine terminée</p>
        <p className="text-zinc-400">Bien joué ! Reviens demain.</p>
      </div>
    )
  }

  // No conditions: show only external video option
  if (conditions.length === 0) {
    return (
      <div className="flex flex-col h-[var(--content-h)] overflow-hidden">
        <div className="flex-1 px-4 pt-6">
          <p className="text-2xl font-bold mb-2">Rehab</p>
          <p className="text-zinc-400 mb-6">
            Aucune condition de sante active. Routine externe disponible :
          </p>

          <button
            onClick={() => setVideoDone(d => !d)}
            className="w-full bg-zinc-900 rounded-xl px-4 py-3 flex items-center gap-3 text-left"
          >
            <div
              className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                videoDone ? 'bg-emerald-600 border-emerald-600' : 'border-zinc-600 bg-transparent'
              }`}
            >
              {videoDone && (
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <p className={`font-medium ${videoDone ? 'text-zinc-400 line-through' : 'text-white'}`}>
                {video.label}
              </p>
              <p className="text-zinc-500 text-xs mt-0.5">{video.duration}</p>
            </div>
          </button>
        </div>

        <div className="flex-shrink-0 px-4 pb-4">
          <button
            onClick={async () => {
              localStorage.setItem('rehab_video_idx', String(videoIdx))
              setSaved(true)
            }}
            disabled={!videoDone || isSaving}
            className={`w-full font-semibold rounded-xl py-4 text-lg transition-colors ${
              videoDone && !isSaving
                ? 'bg-emerald-600 text-white'
                : 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
            }`}
          >
            Enregistrer
          </button>
        </div>
      </div>
    )
  }

  // Check if user has SA (routine SA is always available)
  const hasSA = routine?.saRoutine !== null && routine?.saRoutine !== undefined && routine.saRoutine.length > 0

  // Other rehab exercises are always available (no cooldown)
  const otherRehabAvailable = routine && routine.exercises.length > 0

  const handleContinue = useCallback(() => {
    // Reset all state and refresh exercises
    setExerciseLogs({})
    setSaLogs({})
    setVideoDone(false)
    setSaved(false)
    setRefreshKey(k => k + 1)
  }, [])

  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center h-[var(--content-h)] px-6 text-center overflow-hidden">
        <div className="w-16 h-16 rounded-full bg-emerald-600/20 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-2xl font-bold mb-2">Session enregistree</p>
        <p className="text-zinc-400 mb-6">
          {exercisesWithData} exercice{exercisesWithData > 1 ? 's' : ''} de rehab enregistre{exercisesWithData > 1 ? 's' : ''}
        </p>
        <button
          onClick={handleContinue}
          className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-colors"
        >
          Continuer avec d'autres exercices
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[var(--content-h)] overflow-hidden">
      {/* External video suggestion */}
      <div className="px-4 pt-4 pb-2">
        <button
          onClick={() => setVideoDone(d => !d)}
          className="w-full bg-zinc-900 rounded-xl px-4 py-3 flex items-center gap-3 text-left"
        >
          <div
            className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
              videoDone ? 'bg-emerald-600 border-emerald-600' : 'border-zinc-600 bg-transparent'
            }`}
          >
            {videoDone && (
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <div className="flex-1">
            <p className={`font-medium ${videoDone ? 'text-zinc-400 line-through' : 'text-white'}`}>
              Seance externe : {video.label}
            </p>
            <p className="text-zinc-500 text-xs mt-0.5">{video.duration}</p>
          </div>
        </button>
      </div>

      {/* Notebook-style rehab exercises */}
      {routine && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Header */}
          <div className="flex-shrink-0 text-center px-4 pt-4 pb-2">
            <p className="text-zinc-400 text-sm uppercase tracking-wider mb-1">
              Jour de repos
            </p>
            <h2 className="text-xl font-bold">
              {VARIANT_LABELS[variant]} &middot; ~{routine.totalMinutes} min
            </h2>
            <p className="text-zinc-400 text-sm mt-1">
              Saisis tes series ou coche les exercices chronometres
            </p>
          </div>

          {/* Exercise list */}
          <div className="flex-1 overflow-y-auto px-4 space-y-3">
            {/* SA Routine Section */}
            {routine.saRoutine && routine.saRoutine.length > 0 && (
              <>
                <div className="pt-2 pb-1">
                  <p className="text-amber-400 text-sm font-semibold uppercase tracking-wider">
                    Routine Spondylarthrite
                  </p>
                  <p className="text-zinc-500 text-xs">Exercices quotidiens essentiels</p>
                </div>
                {routine.saRoutine.map((exercise, index) => {
                  const log = getSaLog(index)
                  const timeBased = isTimeBased(exercise.reps)
                  const hasData = timeBased ? log.checked : log.sets.length > 0
                  const intensityInfo = INTENSITY_LABELS[exercise.intensity]

                  return (
                    <div key={`sa-${exercise.name}`} className="bg-zinc-900 rounded-xl overflow-hidden border-l-2 border-amber-500">
                      <button
                        onClick={() => toggleSaExpand(index)}
                        className="w-full px-4 py-3 flex items-center gap-3 text-left"
                      >
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                            hasData ? 'bg-emerald-600' : 'bg-zinc-800 border border-zinc-700'
                          }`}
                        >
                          {hasData && (
                            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium ${hasData ? 'text-zinc-400' : 'text-white'}`}>
                            {exercise.name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-zinc-400 text-xs">
                              {exercise.sets}&times;{exercise.reps}
                            </span>
                            {intensityInfo && (
                              <span className={`text-xs px-1.5 py-0.5 rounded ${intensityInfo.className}`}>
                                {intensityInfo.label}
                              </span>
                            )}
                          </div>
                        </div>
                        <svg
                          className={`w-5 h-5 text-zinc-400 transition-transform ${log.expanded ? 'rotate-180' : ''}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {log.expanded && (
                        <div className="px-4 pb-4 pt-0 border-t border-zinc-800">
                          {exercise.notes && (
                            <p className="text-zinc-400 text-sm leading-relaxed mt-3 mb-3">{exercise.notes}</p>
                          )}
                          {timeBased ? (
                            <button
                              onClick={() => toggleSaChecked(index)}
                              className={`mt-2 w-full flex items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
                                log.checked ? 'bg-emerald-900/30 border border-emerald-700' : 'bg-zinc-800 border border-zinc-700'
                              }`}
                            >
                              <div
                                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                  log.checked ? 'bg-emerald-600 border-emerald-600' : 'border-zinc-500 bg-transparent'
                                }`}
                              >
                                {log.checked && (
                                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <span className={`text-sm ${log.checked ? 'text-emerald-400' : 'text-zinc-300'}`}>
                                {exercise.sets} &times; {exercise.reps} — Fait
                              </span>
                            </button>
                          ) : (
                            <div className="mt-2 space-y-3">
                              {log.sets.length > 0 && (
                                <div className="space-y-1.5">
                                  {log.sets.map((s, si) => (
                                    <div key={si} className="flex items-center gap-2 bg-zinc-800/60 rounded-lg px-3 py-2">
                                      <span className="text-zinc-500 text-xs w-6">S{si + 1}</span>
                                      <span className="text-white text-sm">{s.weightKg > 0 ? `${s.weightKg} kg` : 'PDC'}</span>
                                      <span className="text-zinc-500 text-sm">&times;</span>
                                      <span className="text-white text-sm">{s.reps} reps</span>
                                      {si === log.sets.length - 1 && (
                                        <button onClick={() => removeSaLastSet(index)} className="ml-auto text-zinc-500 hover:text-red-400 transition-colors">
                                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <div className="flex-1 flex items-center gap-1 bg-zinc-800 rounded-lg px-3 py-2">
                                  <input
                                    type="number" inputMode="decimal" min={0} step={0.5} placeholder="0"
                                    value={log.weightInput}
                                    onChange={e => updateSaLog(index, { weightInput: e.target.value })}
                                    className="w-14 bg-transparent text-white text-sm text-right outline-none placeholder-zinc-600"
                                  />
                                  <span className="text-zinc-500 text-xs">kg</span>
                                </div>
                                <span className="text-zinc-600">&times;</span>
                                <div className="flex-1 flex items-center gap-1 bg-zinc-800 rounded-lg px-3 py-2">
                                  <input
                                    type="number" inputMode="numeric" min={1} placeholder="reps"
                                    value={log.repsInput}
                                    onChange={e => updateSaLog(index, { repsInput: e.target.value })}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSaSet(index) } }}
                                    className="w-14 bg-transparent text-white text-sm text-right outline-none placeholder-zinc-600"
                                  />
                                  <span className="text-zinc-500 text-xs">reps</span>
                                </div>
                                <button onClick={() => addSaSet(index)} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-3 py-2 transition-colors">
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Separator if there are also regular exercises available */}
                {otherRehabAvailable && (
                  <div className="pt-4 pb-1">
                    <p className="text-zinc-400 text-sm font-semibold uppercase tracking-wider">
                      Autres exercices
                    </p>
                  </div>
                )}

              </>
            )}

            {/* Regular rehab exercises - only if available */}
            {otherRehabAvailable && routine.exercises.map((exercise, index) => {
              const log = getLog(index)
              const timeBased = isTimeBased(exercise.reps)
              const hasData = timeBased ? log.checked : log.sets.length > 0
              const intensityInfo = INTENSITY_LABELS[exercise.intensity]

              return (
                <div key={exercise.name} className="bg-zinc-900 rounded-xl overflow-hidden">
                  {/* Header row */}
                  <button
                    onClick={() => toggleExpand(index)}
                    className="w-full px-4 py-3 flex items-center gap-3 text-left"
                  >
                    {/* Done indicator */}
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                        hasData
                          ? 'bg-emerald-600'
                          : 'bg-zinc-800 border border-zinc-700'
                      }`}
                    >
                      {hasData && (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>

                    {/* Exercise info */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${hasData ? 'text-zinc-400' : 'text-white'}`}>
                        {exercise.name}
                      </p>
                      {exercise.conditionName && (
                        <p className="text-zinc-500 text-xs mt-0.5 truncate">
                          {exercise.conditionName}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-zinc-400 text-xs">
                          {exercise.sets}&times;{exercise.reps}
                        </span>
                        {intensityInfo && (
                          <span className={`text-xs px-1.5 py-0.5 rounded ${intensityInfo.className}`}>
                            {intensityInfo.label}
                          </span>
                        )}
                        {log.sets.length > 0 && !timeBased && (
                          <span className="text-emerald-400 text-xs">
                            {log.sets.length} serie{log.sets.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Expand chevron */}
                    <svg
                      className={`w-5 h-5 text-zinc-400 transition-transform ${log.expanded ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Expanded content */}
                  {log.expanded && (
                    <div className="px-4 pb-4 pt-0 border-t border-zinc-800">
                      {/* Notes */}
                      {exercise.notes && (
                        <p className="text-zinc-400 text-sm leading-relaxed mt-3 mb-3">
                          {exercise.notes}
                        </p>
                      )}

                      {timeBased ? (
                        /* Time-based exercise: just a checkbox */
                        <button
                          onClick={() => toggleChecked(index)}
                          className={`mt-2 w-full flex items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
                            log.checked
                              ? 'bg-emerald-900/30 border border-emerald-700'
                              : 'bg-zinc-800 border border-zinc-700'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                              log.checked
                                ? 'bg-emerald-600 border-emerald-600'
                                : 'border-zinc-500 bg-transparent'
                            }`}
                          >
                            {log.checked && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span className={`text-sm ${log.checked ? 'text-emerald-400' : 'text-zinc-300'}`}>
                            {exercise.sets} &times; {exercise.reps} — Fait
                          </span>
                        </button>
                      ) : (
                        /* Weight/reps exercise: notebook-style input */
                        <div className="mt-2 space-y-3">
                          {/* Logged sets */}
                          {log.sets.length > 0 && (
                            <div className="space-y-1.5">
                              {log.sets.map((s, si) => (
                                <div
                                  key={si}
                                  className="flex items-center gap-2 bg-zinc-800/60 rounded-lg px-3 py-2"
                                >
                                  <span className="text-zinc-500 text-xs w-6">S{si + 1}</span>
                                  <span className="text-white text-sm">
                                    {s.weightKg > 0 ? `${s.weightKg} kg` : 'PDC'}
                                  </span>
                                  <span className="text-zinc-500 text-sm">&times;</span>
                                  <span className="text-white text-sm">{s.reps} reps</span>
                                  {si === log.sets.length - 1 && (
                                    <button
                                      onClick={() => removeLastSet(index)}
                                      className="ml-auto text-zinc-500 hover:text-red-400 transition-colors"
                                      aria-label="Supprimer derniere serie"
                                    >
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Input row: weight + reps + add button */}
                          <div className="flex items-center gap-2">
                            <div className="flex-1 flex items-center gap-1 bg-zinc-800 rounded-lg px-3 py-2">
                              <input
                                type="number"
                                inputMode="decimal"
                                min={0}
                                step={0.5}
                                placeholder="0"
                                value={log.weightInput}
                                onChange={e => updateLog(index, { weightInput: e.target.value })}
                                className="w-14 bg-transparent text-white text-sm text-right outline-none placeholder-zinc-600"
                              />
                              <span className="text-zinc-500 text-xs">kg</span>
                            </div>
                            <span className="text-zinc-600">&times;</span>
                            <div className="flex-1 flex items-center gap-1 bg-zinc-800 rounded-lg px-3 py-2">
                              <input
                                type="number"
                                inputMode="numeric"
                                min={1}
                                placeholder="reps"
                                value={log.repsInput}
                                onChange={e => updateLog(index, { repsInput: e.target.value })}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    addSet(index)
                                  }
                                }}
                                className="w-14 bg-transparent text-white text-sm text-right outline-none placeholder-zinc-600"
                              />
                              <span className="text-zinc-500 text-xs">reps</span>
                            </div>
                            <button
                              onClick={() => addSet(index)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-3 py-2 transition-colors"
                              aria-label="Ajouter une serie"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Save button */}
          <div className="flex-shrink-0 px-4 pt-3 pb-4">
            <button
              onClick={handleSave}
              disabled={!canSave || isSaving}
              className={`w-full font-semibold rounded-xl py-4 text-lg transition-colors ${
                canSave && !isSaving
                  ? 'bg-emerald-600 text-white'
                  : 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
              }`}
            >
              {isSaving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
