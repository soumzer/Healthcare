import { describe, it, expect } from 'vitest'
import { suggestFiller, type FillerInput } from '../filler'
import type { RehabExerciseInfo } from '../rehab-integrator'
import type { Exercise } from '../../db/types'

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeRehabExercise(
  name: string,
  overrides: Partial<RehabExerciseInfo> = {},
): RehabExerciseInfo {
  return {
    exerciseName: name,
    sets: 3,
    reps: '15',
    intensity: 'light',
    notes: `Notes for ${name}`,
    protocolName: 'Test Protocol',
    priority: 1,
    ...overrides,
  }
}

function makeMobilityExercise(
  name: string,
  primaryMuscles: string[],
  overrides: Partial<Exercise> = {},
): Exercise {
  return {
    id: Math.floor(Math.random() * 10000),
    name,
    category: 'mobility',
    primaryMuscles,
    secondaryMuscles: [],
    equipmentNeeded: [],
    contraindications: [],
    alternatives: [],
    instructions: `Instructions for ${name}`,
    isRehab: true,
    tags: ['mobility'],
    ...overrides,
  }
}

function makeCoreExercise(name: string): Exercise {
  return {
    id: Math.floor(Math.random() * 10000),
    name,
    category: 'core',
    primaryMuscles: ['transverse abdominal', 'rectus abdominis'],
    secondaryMuscles: ['obliques'],
    equipmentNeeded: [],
    contraindications: [],
    alternatives: [],
    instructions: `Instructions for ${name}`,
    isRehab: false,
    tags: ['core', 'rehab_compatible'],
  }
}

// ---------------------------------------------------------------------------
// Standard pool fixtures
// ---------------------------------------------------------------------------

const upperBodyRehabExercise = makeRehabExercise('Face pull (rehab posture)', {
  protocolName: 'Posture',
  notes: 'Tirez vers le visage en rotation externe',
})

const upperBodyRehabExercise2 = makeRehabExercise('Band pull-apart', {
  protocolName: 'Posture',
  notes: 'Ecartez la bande en serrant les omoplates',
})

const lowerBodyRehabExercise = makeRehabExercise(
  'Leg extension tempo lent (tendinite rotulienne)',
  {
    protocolName: 'Tendinite rotulienne',
    reps: '12',
    notes: 'Tempo 3-2-4',
  },
)

const coreRehabExercise = makeRehabExercise('Pallof press', {
  protocolName: 'Core/Lower back',
  notes: 'Anti-rotation',
})

const timeBased = makeRehabExercise(
  'Spanish squat isométrique (tendinite rotulienne)',
  {
    sets: 5,
    reps: '45 sec',
    protocolName: 'Tendinite rotulienne',
    notes: 'Isometrique 70-90 degres',
  },
)

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('suggestFiller', () => {
  // -----------------------------------------------------------------------
  // Priority 1: Active wait pool
  // -----------------------------------------------------------------------
  describe('Priority 1 — suggests rehab exercise from pool first', () => {
    it('suggests the first available rehab exercise from pool', () => {
      const input: FillerInput = {
        activeWaitPool: [upperBodyRehabExercise, coreRehabExercise],
        nextExerciseMuscles: ['quadriceps', 'fessiers'],
        completedFillers: [],
      }

      const result = suggestFiller(input)
      expect(result).not.toBeNull()
      expect(result!.name).toBe('Face pull (rehab posture)')
      expect(result!.isRehab).toBe(true)
    })

    it('returns isRehab = true for pool exercises', () => {
      const input: FillerInput = {
        activeWaitPool: [coreRehabExercise],
        nextExerciseMuscles: ['pectoraux'],
        completedFillers: [],
      }

      const result = suggestFiller(input)
      expect(result).not.toBeNull()
      expect(result!.isRehab).toBe(true)
    })

    it('includes sets, reps, duration, and notes from the pool exercise', () => {
      const input: FillerInput = {
        activeWaitPool: [upperBodyRehabExercise],
        nextExerciseMuscles: ['quadriceps'],
        completedFillers: [],
      }

      const result = suggestFiller(input)
      expect(result).not.toBeNull()
      expect(result!.sets).toBe(3)
      expect(result!.reps).toBe('15')
      expect(result!.notes).toContain('rotation externe')
      expect(result!.duration).toBeDefined()
    })
  })

  // -----------------------------------------------------------------------
  // Muscle conflict detection
  // -----------------------------------------------------------------------
  describe('muscle conflict detection', () => {
    it('does NOT suggest upper body rehab when next exercise targets pectoraux', () => {
      const input: FillerInput = {
        activeWaitPool: [upperBodyRehabExercise, coreRehabExercise],
        nextExerciseMuscles: ['pectoraux'],
        completedFillers: [],
      }

      const result = suggestFiller(input)
      expect(result).not.toBeNull()
      // Should skip Face pull (upper body) and suggest Pallof press (core)
      expect(result!.name).toBe('Pallof press')
    })

    it('does NOT suggest upper body rehab when next exercise targets deltoïdes', () => {
      const input: FillerInput = {
        activeWaitPool: [upperBodyRehabExercise, coreRehabExercise],
        nextExerciseMuscles: ['deltoïdes'],
        completedFillers: [],
      }

      const result = suggestFiller(input)
      expect(result).not.toBeNull()
      expect(result!.name).toBe('Pallof press')
    })

    it('does NOT suggest lower body rehab when next exercise targets quadriceps', () => {
      const input: FillerInput = {
        activeWaitPool: [lowerBodyRehabExercise, coreRehabExercise],
        nextExerciseMuscles: ['quadriceps'],
        completedFillers: [],
      }

      const result = suggestFiller(input)
      expect(result).not.toBeNull()
      // Should skip Leg extension (lower body) and suggest Pallof press (core)
      expect(result!.name).toBe('Pallof press')
    })

    it('does NOT suggest lower body rehab when next exercise targets ischio-jambiers', () => {
      const input: FillerInput = {
        activeWaitPool: [lowerBodyRehabExercise, coreRehabExercise],
        nextExerciseMuscles: ['ischio-jambiers'],
        completedFillers: [],
      }

      const result = suggestFiller(input)
      expect(result).not.toBeNull()
      expect(result!.name).toBe('Pallof press')
    })

    it('core exercises are always safe regardless of next exercise muscles', () => {
      const input: FillerInput = {
        activeWaitPool: [coreRehabExercise],
        nextExerciseMuscles: ['pectoraux', 'triceps', 'deltoïdes antérieurs'],
        completedFillers: [],
      }

      const result = suggestFiller(input)
      expect(result).not.toBeNull()
      expect(result!.name).toBe('Pallof press')
    })

    it('allows upper body rehab when next exercise targets lower body', () => {
      const input: FillerInput = {
        activeWaitPool: [upperBodyRehabExercise],
        nextExerciseMuscles: ['quadriceps', 'fessiers'],
        completedFillers: [],
      }

      const result = suggestFiller(input)
      expect(result).not.toBeNull()
      expect(result!.name).toBe('Face pull (rehab posture)')
    })

    it('allows lower body rehab when next exercise targets upper body', () => {
      const input: FillerInput = {
        activeWaitPool: [lowerBodyRehabExercise],
        nextExerciseMuscles: ['pectoraux', 'triceps'],
        completedFillers: [],
      }

      const result = suggestFiller(input)
      expect(result).not.toBeNull()
      expect(result!.name).toBe('Leg extension tempo lent (tendinite rotulienne)')
    })

    it('no conflict when next exercise muscles list is empty', () => {
      const input: FillerInput = {
        activeWaitPool: [upperBodyRehabExercise],
        nextExerciseMuscles: [],
        completedFillers: [],
      }

      const result = suggestFiller(input)
      expect(result).not.toBeNull()
      expect(result!.name).toBe('Face pull (rehab posture)')
    })
  })

  // -----------------------------------------------------------------------
  // Completed fillers — no re-suggestion
  // -----------------------------------------------------------------------
  describe('does not re-suggest completed fillers', () => {
    it('skips completed filler and suggests next available', () => {
      const input: FillerInput = {
        activeWaitPool: [upperBodyRehabExercise, upperBodyRehabExercise2],
        nextExerciseMuscles: ['quadriceps'],
        completedFillers: ['Face pull (rehab posture)'],
      }

      const result = suggestFiller(input)
      expect(result).not.toBeNull()
      expect(result!.name).toBe('Band pull-apart')
    })

    it('skips all completed pool exercises before falling to mobility', () => {
      const mobilityExercise = makeMobilityExercise(
        'Cat-cow (chat-vache)',
        ['érecteurs du rachis', 'transverse abdominal'],
      )
      const input: FillerInput = {
        activeWaitPool: [upperBodyRehabExercise, upperBodyRehabExercise2],
        nextExerciseMuscles: ['quadriceps'],
        completedFillers: ['Face pull (rehab posture)', 'Band pull-apart'],
        allExercises: [mobilityExercise],
      }

      const result = suggestFiller(input)
      expect(result).not.toBeNull()
      expect(result!.name).toBe('Cat-cow (chat-vache)')
      expect(result!.isRehab).toBe(false)
    })
  })

  // -----------------------------------------------------------------------
  // Priority 2: General mobility fallback
  // -----------------------------------------------------------------------
  describe('Priority 2 — general mobility fallback when pool exhausted', () => {
    it('suggests mobility exercise from catalog when pool is completed', () => {
      const mobilityExercise = makeMobilityExercise(
        'Cat-cow (chat-vache)',
        ['érecteurs du rachis', 'transverse abdominal'],
      )
      const input: FillerInput = {
        activeWaitPool: [upperBodyRehabExercise],
        nextExerciseMuscles: ['pectoraux'],
        completedFillers: ['Face pull (rehab posture)'],
        allExercises: [mobilityExercise],
      }

      const result = suggestFiller(input)
      expect(result).not.toBeNull()
      expect(result!.name).toBe('Cat-cow (chat-vache)')
      expect(result!.isRehab).toBe(false)
    })

    it('general mobility is not suggested if it conflicts with next muscles', () => {
      const lowerMobility = makeMobilityExercise(
        'Étirement piriforme',
        ['piriforme', 'fessiers profonds'],
      )
      const coreMobility = makeMobilityExercise(
        'Cat-cow (chat-vache)',
        ['érecteurs du rachis', 'transverse abdominal'],
        { category: 'core', tags: ['core', 'rehab_compatible'] },
      )
      const input: FillerInput = {
        activeWaitPool: [],
        nextExerciseMuscles: ['quadriceps', 'fessiers'],
        completedFillers: [],
        allExercises: [lowerMobility, coreMobility],
      }

      const result = suggestFiller(input)
      expect(result).not.toBeNull()
      // Should skip lower body piriforme and suggest core cat-cow
      expect(result!.name).toBe('Cat-cow (chat-vache)')
    })

    it('returns isRehab = false for general catalog exercises', () => {
      const mobilityExercise = makeMobilityExercise(
        'Cat-cow (chat-vache)',
        ['érecteurs du rachis', 'transverse abdominal'],
      )
      const input: FillerInput = {
        activeWaitPool: [],
        nextExerciseMuscles: ['pectoraux'],
        completedFillers: [],
        allExercises: [mobilityExercise],
      }

      const result = suggestFiller(input)
      expect(result).not.toBeNull()
      expect(result!.isRehab).toBe(false)
    })

    it('accepts core exercises tagged rehab_compatible from catalog', () => {
      const coreExercise = makeCoreExercise('Dead bug')
      const input: FillerInput = {
        activeWaitPool: [],
        nextExerciseMuscles: ['pectoraux'],
        completedFillers: [],
        allExercises: [coreExercise],
      }

      const result = suggestFiller(input)
      expect(result).not.toBeNull()
      expect(result!.name).toBe('Dead bug')
      expect(result!.isRehab).toBe(false)
    })
  })

  // -----------------------------------------------------------------------
  // Priority 3: Cycle back when everything done
  // -----------------------------------------------------------------------
  describe('Priority 3 — cycles back to pool when everything done', () => {
    it('re-proposes pool exercise when all are completed and no mobility available', () => {
      const input: FillerInput = {
        activeWaitPool: [upperBodyRehabExercise, coreRehabExercise],
        nextExerciseMuscles: ['quadriceps'],
        completedFillers: ['Face pull (rehab posture)', 'Pallof press'],
      }

      const result = suggestFiller(input)
      expect(result).not.toBeNull()
      // Should cycle back — Face pull is first without conflict (next is lower body)
      expect(result!.name).toBe('Face pull (rehab posture)')
      expect(result!.isRehab).toBe(true)
    })

    it('cycles to non-conflicting pool exercise even when all completed', () => {
      const input: FillerInput = {
        activeWaitPool: [upperBodyRehabExercise, lowerBodyRehabExercise],
        nextExerciseMuscles: ['pectoraux'],
        completedFillers: ['Face pull (rehab posture)', 'Leg extension tempo lent (tendinite rotulienne)'],
      }

      const result = suggestFiller(input)
      expect(result).not.toBeNull()
      // Upper body conflicts with pectoraux, so should suggest lower body
      expect(result!.name).toBe('Leg extension tempo lent (tendinite rotulienne)')
    })

    it('as last resort, suggests a conflicting pool exercise', () => {
      const input: FillerInput = {
        activeWaitPool: [upperBodyRehabExercise],
        nextExerciseMuscles: ['pectoraux'],
        completedFillers: ['Face pull (rehab posture)'],
      }

      const result = suggestFiller(input)
      expect(result).not.toBeNull()
      // Only option is Face pull which conflicts, but it is returned as last resort
      expect(result!.name).toBe('Face pull (rehab posture)')
    })
  })

  // -----------------------------------------------------------------------
  // Returns null when nothing available
  // -----------------------------------------------------------------------
  describe('returns null when nothing available', () => {
    it('returns null with empty pool and no catalog', () => {
      const input: FillerInput = {
        activeWaitPool: [],
        nextExerciseMuscles: ['pectoraux'],
        completedFillers: [],
      }

      const result = suggestFiller(input)
      expect(result).toBeNull()
    })

    it('returns null with empty pool and empty catalog', () => {
      const input: FillerInput = {
        activeWaitPool: [],
        nextExerciseMuscles: ['pectoraux'],
        completedFillers: [],
        allExercises: [],
      }

      const result = suggestFiller(input)
      expect(result).toBeNull()
    })

    it('returns null with empty pool and catalog having only compound exercises', () => {
      const compound: Exercise = {
        id: 1,
        name: 'Bench Press',
        category: 'compound',
        primaryMuscles: ['pectoraux'],
        secondaryMuscles: ['triceps'],
        equipmentNeeded: ['bench', 'barbell'],
        contraindications: [],
        alternatives: [],
        instructions: 'Press the bar',
        isRehab: false,
        tags: ['push'],
      }
      const input: FillerInput = {
        activeWaitPool: [],
        nextExerciseMuscles: ['quadriceps'],
        completedFillers: [],
        allExercises: [compound],
      }

      const result = suggestFiller(input)
      expect(result).toBeNull()
    })
  })

  // -----------------------------------------------------------------------
  // Duration estimation
  // -----------------------------------------------------------------------
  describe('duration estimation', () => {
    it('duration is reasonable for rep-based exercises (1-3 min)', () => {
      const input: FillerInput = {
        activeWaitPool: [makeRehabExercise('Pallof press', { sets: 3, reps: '15' })],
        nextExerciseMuscles: [],
        completedFillers: [],
      }

      const result = suggestFiller(input)
      expect(result).not.toBeNull()

      // 3 sets * 45s + 2 * 30s rest = 135 + 60 = 195s ~= 3 min
      const minutes = parseInt(result!.duration)
      expect(minutes).toBeGreaterThanOrEqual(1)
      expect(minutes).toBeLessThanOrEqual(3)
    })

    it('duration is reasonable for time-based exercises', () => {
      const input: FillerInput = {
        activeWaitPool: [timeBased],
        nextExerciseMuscles: ['pectoraux'], // lower body Spanish squat won't conflict with upper
        completedFillers: [],
      }

      const result = suggestFiller(input)
      expect(result).not.toBeNull()

      // 5 sets * 45s + 4 * 30s rest = 225 + 120 = 345s ~= 6 min
      const minutes = parseInt(result!.duration)
      expect(minutes).toBeGreaterThanOrEqual(1)
      expect(minutes).toBeLessThanOrEqual(10)
    })

    it('duration format ends with " min"', () => {
      const input: FillerInput = {
        activeWaitPool: [coreRehabExercise],
        nextExerciseMuscles: [],
        completedFillers: [],
      }

      const result = suggestFiller(input)
      expect(result).not.toBeNull()
      expect(result!.duration).toMatch(/^\d+ min$/)
    })

    it('mobility fallback has 2 min duration', () => {
      const mobilityExercise = makeMobilityExercise(
        'Cat-cow (chat-vache)',
        ['érecteurs du rachis'],
      )
      const input: FillerInput = {
        activeWaitPool: [],
        nextExerciseMuscles: [],
        completedFillers: [],
        allExercises: [mobilityExercise],
      }

      const result = suggestFiller(input)
      expect(result).not.toBeNull()
      expect(result!.duration).toBe('2 min')
    })
  })

  // -----------------------------------------------------------------------
  // isRehab flag correctness
  // -----------------------------------------------------------------------
  describe('isRehab flag', () => {
    it('isRehab is true for exercises from the activeWaitPool', () => {
      const input: FillerInput = {
        activeWaitPool: [upperBodyRehabExercise],
        nextExerciseMuscles: ['quadriceps'],
        completedFillers: [],
      }

      const result = suggestFiller(input)
      expect(result).not.toBeNull()
      expect(result!.isRehab).toBe(true)
    })

    it('isRehab is false for exercises from the general catalog', () => {
      const mobilityExercise = makeMobilityExercise(
        'Cat-cow (chat-vache)',
        ['érecteurs du rachis'],
      )
      const input: FillerInput = {
        activeWaitPool: [],
        nextExerciseMuscles: [],
        completedFillers: [],
        allExercises: [mobilityExercise],
      }

      const result = suggestFiller(input)
      expect(result).not.toBeNull()
      expect(result!.isRehab).toBe(false)
    })

    it('isRehab is true for cycled-back pool exercises', () => {
      const input: FillerInput = {
        activeWaitPool: [coreRehabExercise],
        nextExerciseMuscles: [],
        completedFillers: ['Pallof press'],
      }

      const result = suggestFiller(input)
      expect(result).not.toBeNull()
      expect(result!.isRehab).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------
  describe('edge cases', () => {
    it('handles pool with single exercise correctly', () => {
      const input: FillerInput = {
        activeWaitPool: [coreRehabExercise],
        nextExerciseMuscles: [],
        completedFillers: [],
      }

      const result = suggestFiller(input)
      expect(result).not.toBeNull()
      expect(result!.name).toBe('Pallof press')
    })

    it('mixed pool with multiple categories selects non-conflicting first', () => {
      const input: FillerInput = {
        activeWaitPool: [
          upperBodyRehabExercise,
          lowerBodyRehabExercise,
          coreRehabExercise,
        ],
        nextExerciseMuscles: ['pectoraux', 'deltoïdes antérieurs'],
        completedFillers: [],
      }

      const result = suggestFiller(input)
      expect(result).not.toBeNull()
      // Face pull is upper body → conflicts with pectoraux
      // Leg extension is lower body → no conflict
      expect(result!.name).toBe('Leg extension tempo lent (tendinite rotulienne)')
    })

    it('prefers pool exercises over general mobility even if completed pool is partially done', () => {
      const mobilityExercise = makeMobilityExercise(
        'Cat-cow (chat-vache)',
        ['érecteurs du rachis'],
      )
      const input: FillerInput = {
        activeWaitPool: [upperBodyRehabExercise, coreRehabExercise],
        nextExerciseMuscles: ['quadriceps'],
        completedFillers: ['Face pull (rehab posture)'],
        allExercises: [mobilityExercise],
      }

      const result = suggestFiller(input)
      expect(result).not.toBeNull()
      // Pallof press is still available in pool
      expect(result!.name).toBe('Pallof press')
      expect(result!.isRehab).toBe(true)
    })

    it('all pool conflicting + completed, mobility completed, cycles back to pool', () => {
      const mobilityExercise = makeMobilityExercise(
        'Cat-cow (chat-vache)',
        ['érecteurs du rachis'],
      )
      const input: FillerInput = {
        activeWaitPool: [upperBodyRehabExercise, lowerBodyRehabExercise],
        nextExerciseMuscles: ['pectoraux'],
        completedFillers: [
          'Face pull (rehab posture)',
          'Leg extension tempo lent (tendinite rotulienne)',
          'Cat-cow (chat-vache)',
        ],
        allExercises: [mobilityExercise],
      }

      const result = suggestFiller(input)
      expect(result).not.toBeNull()
      // All completed, cycle: lower body doesn't conflict with pectoraux
      expect(result!.name).toBe('Leg extension tempo lent (tendinite rotulienne)')
    })
  })
})
