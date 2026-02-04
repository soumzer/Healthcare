import { useState, useMemo, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import RestDayRoutine from '../components/session/RestDayRoutine'
import type { RestDayVariant } from '../engine/rest-day'
import type { BodyZone } from '../db/types'
import { recordRehabCompletion, isRehabAvailable, getRemainingCooldownText } from '../utils/rehab-cooldown'

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

export default function RehabPage() {
  const user = useLiveQuery(() => db.userProfiles.toCollection().first())
  const conditions = useLiveQuery(
    () => user?.id
      ? db.healthConditions.where('userId').equals(user.id).and(c => c.isActive).toArray()
      : [],
    [user?.id]
  )

  const variant = useMemo(
    () => conditions && conditions.length > 0 ? pickVariant(conditions) : 'all' as RestDayVariant,
    [conditions]
  )

  const [videoIdx] = useState(() => getNextVideoIndex())
  const [videoDone, setVideoDone] = useState(false)
  const video = EXTERNAL_VIDEOS[videoIdx]

  const available = isRehabAvailable()
  const cooldownText = getRemainingCooldownText()

  const handleComplete = useCallback(() => {
    if (variant !== 'all') {
      localStorage.setItem(STORAGE_KEY, variant)
    }
    localStorage.setItem('rehab_video_idx', String(videoIdx))
    recordRehabCompletion()
  }, [variant, videoIdx])

  if (!user || conditions === undefined) {
    return (
      <div className="flex items-center justify-center h-[calc(100dvh-4rem)] overflow-hidden">
        <p className="text-zinc-400">Chargement...</p>
      </div>
    )
  }

  if (conditions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100dvh-4rem)] px-6 text-center overflow-hidden">
        <p className="text-2xl font-bold mb-2">Rehab</p>
        <p className="text-zinc-400 mb-4">
          Aucune condition de sante active.
        </p>
        <p className="text-zinc-500 text-sm">
          Ajoutez des conditions dans votre profil pour obtenir une routine de rehab personnalisee.
        </p>
      </div>
    )
  }

  if (!available) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100dvh-4rem)] px-6 text-center overflow-hidden">
        <p className="text-2xl font-bold mb-2">Rehab</p>
        <p className="text-zinc-400 mb-4">
          {cooldownText ?? 'Disponible bientot'}
        </p>
        <p className="text-zinc-500 text-sm">
          Reposez-vous avant la prochaine session de rehab.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-[calc(100dvh-4rem)] overflow-auto">
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

      {/* Rest day routine (rehab exercises) */}
      <RestDayRoutine
        conditions={conditions}
        variant={variant}
        onComplete={handleComplete}
        onSkip={() => {/* stay on page */}}
      />
    </div>
  )
}
