import { useMemo, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { db } from '../db'
import RestDayRoutine from '../components/session/RestDayRoutine'
import type { RestDayVariant } from '../engine/rest-day'
import type { BodyZone, Goal } from '../db/types'
import { recordRehabCompletion } from '../utils/rehab-cooldown'

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

// Goals that benefit from rest day mobility/rehab routine
const REST_DAY_ROUTINE_GOALS: Goal[] = ['mobility', 'posture', 'rehab']

const STORAGE_KEY = 'rest_day_last_variant'

function pickVariant(conditions: { bodyZone: BodyZone }[]): RestDayVariant {
  const hasUpper = conditions.some(c => UPPER_ZONES.has(c.bodyZone))
  const hasLower = conditions.some(c => LOWER_ZONES.has(c.bodyZone))

  // If conditions only span one side, no need to split
  if (!hasUpper || !hasLower) return 'all'

  // Alternate based on last used variant
  const last = localStorage.getItem(STORAGE_KEY) as RestDayVariant | null
  return last === 'upper' ? 'lower' : 'upper'
}

export default function RestDayPage() {
  const navigate = useNavigate()
  const user = useLiveQuery(() => db.userProfiles.toCollection().first())
  const conditions = useLiveQuery(
    () => user?.id
      ? db.healthConditions.where('userId').equals(user.id).and(c => c.isActive).toArray()
      : [],
    [user?.id]
  )

  // Check if user has relevant goals for rest day routine
  const hasRelevantGoals = user?.goals?.some(g => REST_DAY_ROUTINE_GOALS.includes(g)) ?? false

  const variant = useMemo(
    () => conditions && conditions.length > 0 ? pickVariant(conditions) : 'all' as RestDayVariant,
    [conditions]
  )

  const handleComplete = useCallback(() => {
    if (variant !== 'all') {
      localStorage.setItem(STORAGE_KEY, variant)
    }
    // Record completion time for 12h cooldown
    recordRehabCompletion()
    navigate('/')
  }, [variant, navigate])

  if (!user || conditions === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-zinc-400">Chargement...</p>
      </div>
    )
  }

  // No conditions AND no relevant goals — nothing to show
  if (conditions.length === 0 && !hasRelevantGoals) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <p className="text-zinc-400 mb-4">Aucune condition de santé active — pas de routine de repos personnalisée.</p>
        <button
          onClick={() => navigate('/')}
          className="bg-zinc-800 text-white font-semibold rounded-xl py-3 px-6"
        >
          Retour
        </button>
      </div>
    )
  }

  return (
    <RestDayRoutine
      conditions={conditions}
      goals={user.goals}
      variant={variant}
      onComplete={handleComplete}
      onSkip={() => navigate('/')}
    />
  )
}
