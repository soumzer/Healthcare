import { describe, it, expect } from 'vitest'
import { integrateRehab } from '../rehab-integrator'
import type { RehabExerciseInfo } from '../rehab-integrator'
import { rehabProtocols } from '../../data/rehab-protocols'
import type { HealthCondition, ProgramSession } from '../../db/types'

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeCondition(
  bodyZone: HealthCondition['bodyZone'],
  label: string,
  isActive = true,
): HealthCondition {
  return {
    id: Math.random(),
    userId: 1,
    bodyZone,
    label,
    diagnosis: '',
    painLevel: 4,
    since: '1 an',
    notes: '',
    isActive,
    createdAt: new Date(),
  }
}

function makeSession(name: string, exerciseNames: string[] = []): ProgramSession {
  return {
    name,
    order: 1,
    exercises: exerciseNames.map((_n, i) => ({
      exerciseId: i + 1,
      order: i + 1,
      sets: 3,
      targetReps: 10,
      restSeconds: 90,
      isRehab: false,
    })),
  }
}

function exerciseNames(list: RehabExerciseInfo[]): string[] {
  return list.map((e) => e.exerciseName)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('integrateRehab', () => {
  // -----------------------------------------------------------------------
  // Golf elbow condition
  // -----------------------------------------------------------------------
  describe('golf elbow (elbow_right)', () => {
    const conditions = [makeCondition('elbow_right', 'Golf elbow')]
    const session = makeSession('Upper 1 — Push')

    it('warmup contains Tyler Twist and Curl poignet excentrique', () => {
      const result = integrateRehab(session, conditions)
      const names = exerciseNames(result.warmupRehab)
      expect(names).toContain('Tyler Twist inversé (golf elbow)')
      expect(names).toContain('Curl poignet excentrique (golf elbow)')
    })

    it('warmup contains wrist flexor stretch', () => {
      const result = integrateRehab(session, conditions)
      const names = exerciseNames(result.warmupRehab)
      expect(names).toContain('Étirement fléchisseurs du poignet')
    })

    it('all 3 golf elbow exercises go to warmup', () => {
      const result = integrateRehab(session, conditions)
      expect(result.warmupRehab).toHaveLength(3)
    })

    it('active wait and cooldown are empty for golf elbow alone', () => {
      const result = integrateRehab(session, conditions)
      expect(result.activeWaitPool).toHaveLength(0)
      expect(result.cooldownRehab).toHaveLength(0)
    })

    it('protocol name is correct', () => {
      const result = integrateRehab(session, conditions)
      for (const ex of result.warmupRehab) {
        expect(ex.protocolName).toBe('Épicondylite médiale (golf elbow)')
      }
    })

    it('priority is 1 for golf elbow exercises', () => {
      const result = integrateRehab(session, conditions)
      for (const ex of result.warmupRehab) {
        expect(ex.priority).toBe(1)
      }
    })
  })

  // -----------------------------------------------------------------------
  // Knee tendinitis condition
  // -----------------------------------------------------------------------
  describe('knee tendinitis (knee_right)', () => {
    const conditions = [makeCondition('knee_right', 'Tendinite genou droit')]
    const session = makeSession('Lower 1 — Quadriceps')

    it('warmup contains Spanish squat isometrique', () => {
      const result = integrateRehab(session, conditions)
      const names = exerciseNames(result.warmupRehab)
      expect(names).toContain('Spanish squat isométrique (tendinite rotulienne)')
    })

    it('warmup has exactly 1 exercise', () => {
      const result = integrateRehab(session, conditions)
      expect(result.warmupRehab).toHaveLength(1)
    })

    it('active wait contains Leg extension tempo lent', () => {
      const result = integrateRehab(session, conditions)
      const names = exerciseNames(result.activeWaitPool)
      expect(names).toContain('Leg extension tempo lent (tendinite rotulienne)')
    })

    it('active wait has exactly 1 exercise', () => {
      const result = integrateRehab(session, conditions)
      expect(result.activeWaitPool).toHaveLength(1)
    })

    it('cooldown is empty for knee tendinitis alone', () => {
      const result = integrateRehab(session, conditions)
      expect(result.cooldownRehab).toHaveLength(0)
    })
  })

  // -----------------------------------------------------------------------
  // Both golf elbow + lower back conditions (both priority 1)
  // -----------------------------------------------------------------------
  describe('multiple conditions — golf elbow + core/lower back', () => {
    const conditions = [
      makeCondition('elbow_right', 'Golf elbow'),
      makeCondition('lower_back', 'Douleurs lombaires'),
    ]
    const session = makeSession('Upper 1 — Push')

    it('warmup is sorted by priority (both priority 1)', () => {
      const result = integrateRehab(session, conditions)
      // Both protocols have priority 1, so all warmup exercises have priority 1
      for (const ex of result.warmupRehab) {
        expect(ex.priority).toBe(1)
      }
    })

    it('warmup returns all 6 exercises (under cap of 8)', () => {
      const result = integrateRehab(session, conditions)
      // Golf elbow has 3 warmup, lower back has 3 warmup (Dead bug, Bird dog, Pont fessier)
      // Total is 6, under the cap of 8, so all are returned
      expect(result.warmupRehab).toHaveLength(6)
    })

    it('warmup contains exercises from both protocols', () => {
      const result = integrateRehab(session, conditions)
      exerciseNames(result.warmupRehab)
      const protocols = result.warmupRehab.map((e) => e.protocolName)
      expect(protocols).toContain('Épicondylite médiale (golf elbow)')
      expect(protocols).toContain('Core faible et douleurs lombaires')
    })

    it('active wait contains Pallof press from lower back protocol', () => {
      const result = integrateRehab(session, conditions)
      const names = exerciseNames(result.activeWaitPool)
      expect(names).toContain('Pallof press')
    })
  })

  // -----------------------------------------------------------------------
  // Multiple conditions with different priorities
  // -----------------------------------------------------------------------
  describe('multiple conditions — priority ordering', () => {
    const conditions = [
      makeCondition('knee_right', 'Tendinite genou droit'),    // priority 2
      makeCondition('lower_back', 'Douleurs lombaires'),        // priority 1
    ]
    const session = makeSession('Full Body A')

    it('warmup exercises from higher priority protocol come first', () => {
      const result = integrateRehab(session, conditions)
      // Lower back (priority 1) warmup exercises should come before knee (priority 2)
      const firstPriority1Idx = result.warmupRehab.findIndex((e) => e.priority === 1)
      const firstPriority2Idx = result.warmupRehab.findIndex((e) => e.priority === 2)
      if (firstPriority1Idx !== -1 && firstPriority2Idx !== -1) {
        expect(firstPriority1Idx).toBeLessThan(firstPriority2Idx)
      }
    })

    it('active wait pool contains exercises from both protocols', () => {
      const result = integrateRehab(session, conditions)
      const names = exerciseNames(result.activeWaitPool)
      expect(names).toContain('Pallof press')
      expect(names).toContain('Leg extension tempo lent (tendinite rotulienne)')
    })
  })

  // -----------------------------------------------------------------------
  // Active wait pool — posture protocol
  // -----------------------------------------------------------------------
  describe('posture protocol (upper_back) — active wait pool', () => {
    const conditions = [makeCondition('upper_back', 'Posture anterieuse')]
    const session = makeSession('Upper 1 — Push')

    it('active wait contains Face pull rehab and Band pull-apart', () => {
      const result = integrateRehab(session, conditions)
      const names = exerciseNames(result.activeWaitPool)
      expect(names).toContain('Face pull (rehab posture)')
      expect(names).toContain('Band pull-apart')
    })

    it('warmup contains Chin tuck and Wall angel', () => {
      const result = integrateRehab(session, conditions)
      const names = exerciseNames(result.warmupRehab)
      expect(names).toContain('Chin tuck (rétraction cervicale)')
      expect(names).toContain('Wall angel (ange au mur)')
    })

    it('cooldown contains pectoral stretch', () => {
      const result = integrateRehab(session, conditions)
      const names = exerciseNames(result.cooldownRehab)
      expect(names).toContain('Étirement pectoral (doorway stretch)')
    })
  })

  // -----------------------------------------------------------------------
  // Cooldown exercises
  // -----------------------------------------------------------------------
  describe('cooldown exercises from sciatica + posture', () => {
    const conditions = [
      makeCondition('hip_right', 'Sciatique'),
      makeCondition('upper_back', 'Posture'),
    ]
    const session = makeSession('Lower 1')

    it('cooldown contains piriformis stretch', () => {
      const result = integrateRehab(session, conditions)
      const names = exerciseNames(result.cooldownRehab)
      expect(names).toContain('Étirement piriforme')
    })

    it('cooldown contains pectoral stretch', () => {
      const result = integrateRehab(session, conditions)
      const names = exerciseNames(result.cooldownRehab)
      expect(names).toContain('Étirement pectoral (doorway stretch)')
    })

    it('cooldown contains Child\'s pose', () => {
      const result = integrateRehab(session, conditions)
      const names = exerciseNames(result.cooldownRehab)
      expect(names).toContain('Child\'s pose (posture de l\'enfant)')
    })

    it('cooldown contains hamstring stretch', () => {
      const result = integrateRehab(session, conditions)
      const names = exerciseNames(result.cooldownRehab)
      expect(names).toContain('Étirement ischio-jambiers (hamstring stretch)')
    })

    it('cooldown contains hip flexor stretch', () => {
      const result = integrateRehab(session, conditions)
      const names = exerciseNames(result.cooldownRehab)
      expect(names).toContain('Étirement fléchisseurs de hanche (hip flexor stretch)')
    })

    it('cooldown returns all 5 exercises (at cap of 5)', () => {
      const result = integrateRehab(session, conditions)
      expect(result.cooldownRehab).toHaveLength(5)
    })
  })

  // -----------------------------------------------------------------------
  // Deduplication: exercise already in rehab list
  // -----------------------------------------------------------------------
  describe('deduplication of exercise names', () => {
    it('Pont fessier appears only once even if from two protocols', () => {
      // Both lower_back and hip_right protocols have "Pont fessier (glute bridge)"
      const conditions = [
        makeCondition('lower_back', 'Douleurs lombaires'),   // priority 1: warmup
        makeCondition('hip_right', 'Sciatique'),             // priority 2: active_wait
      ]
      const session = makeSession('Lower 1')
      const result = integrateRehab(session, conditions)

      // Pont fessier from lower_back (priority 1) is warmup
      // Pont fessier from hip_right (priority 2) is active_wait but should be skipped
      const allExercises = [
        ...result.warmupRehab,
        ...result.activeWaitPool,
        ...result.cooldownRehab,
      ]
      const pontFessierCount = allExercises.filter(
        (e) => e.exerciseName === 'Pont fessier (glute bridge)',
      ).length
      expect(pontFessierCount).toBe(1)
    })
  })

  // -----------------------------------------------------------------------
  // Inactive conditions are ignored
  // -----------------------------------------------------------------------
  describe('inactive conditions', () => {
    it('inactive conditions produce no rehab exercises', () => {
      const conditions = [
        makeCondition('elbow_right', 'Golf elbow', false),
        makeCondition('knee_right', 'Tendinite', false),
      ]
      const session = makeSession('Upper 1')
      const result = integrateRehab(session, conditions)

      expect(result.warmupRehab).toHaveLength(0)
      expect(result.activeWaitPool).toHaveLength(0)
      expect(result.cooldownRehab).toHaveLength(0)
    })

    it('only active conditions are considered in a mixed list', () => {
      const conditions = [
        makeCondition('elbow_right', 'Golf elbow', true),
        makeCondition('knee_right', 'Tendinite', false), // inactive
      ]
      const session = makeSession('Upper 1')
      const result = integrateRehab(session, conditions)

      // Only golf elbow exercises
      expect(result.warmupRehab).toHaveLength(3)
      const names = exerciseNames(result.warmupRehab)
      expect(names).toContain('Tyler Twist inversé (golf elbow)')
      // No knee exercises
      expect(names).not.toContain('Spanish squat isométrique (tendinite rotulienne)')
    })
  })

  // -----------------------------------------------------------------------
  // No conditions → all empty
  // -----------------------------------------------------------------------
  describe('no conditions', () => {
    it('returns empty rehab lists when no conditions provided', () => {
      const session = makeSession('Lower 1')
      const result = integrateRehab(session, [])

      expect(result.warmupRehab).toHaveLength(0)
      expect(result.activeWaitPool).toHaveLength(0)
      expect(result.cooldownRehab).toHaveLength(0)
    })

    it('session is returned unchanged', () => {
      const session = makeSession('Lower 1', ['Squat', 'Leg Press'])
      const result = integrateRehab(session, [])

      expect(result.session).toBe(session)
      expect(result.session.name).toBe('Lower 1')
      expect(result.session.exercises).toHaveLength(2)
    })
  })

  // -----------------------------------------------------------------------
  // Warmup capped at 8
  // -----------------------------------------------------------------------
  describe('warmup cap at 8 exercises', () => {
    it('caps warmup to 8 when many conditions produce many warmup exercises', () => {
      // golf elbow (3 warmup) + lower_back (3 warmup) + knee (1 warmup)
      // + foot (2 warmup) + posture (2 warmup) + sciatique (3 warmup)
      // = 14 total warmup → capped to 8
      const conditions = [
        makeCondition('elbow_right', 'Golf elbow'),
        makeCondition('lower_back', 'Douleurs lombaires'),
        makeCondition('knee_right', 'Tendinite'),
        makeCondition('foot_left', 'Pieds plats'),
        makeCondition('upper_back', 'Posture'),
        makeCondition('hip_right', 'Sciatique'),
      ]
      const session = makeSession('Full Body')
      const result = integrateRehab(session, conditions)

      expect(result.warmupRehab).toHaveLength(8)
    })

    it('higher priority protocols are kept when capping', () => {
      // lower_back (priority 1) + elbow_right (priority 1) + knee (priority 2)
      // + posture (priority 2) + foot (priority 3) + sciatique (priority 2)
      const conditions = [
        makeCondition('elbow_right', 'Golf elbow'),
        makeCondition('lower_back', 'Douleurs lombaires'),
        makeCondition('knee_right', 'Tendinite'),
        makeCondition('foot_left', 'Pieds plats'),
        makeCondition('upper_back', 'Posture'),
        makeCondition('hip_right', 'Sciatique'),
      ]
      const session = makeSession('Full Body')
      const result = integrateRehab(session, conditions)

      // The first 6 should be from priority 1 protocols (golf elbow + lower back)
      // golf elbow: 3 warmup (priority 1), lower back: 3 warmup (priority 1)
      // That's 6 from priority 1, then 2 from priority 2 fill up to the cap of 8
      const priority1Exercises = result.warmupRehab.filter((e) => e.priority === 1)
      expect(priority1Exercises).toHaveLength(6)
      // All priority 1 exercises should come before any priority 2
      const lastPriority1Idx = result.warmupRehab.reduce(
        (maxIdx, ex, idx) => (ex.priority === 1 ? idx : maxIdx),
        -1,
      )
      const firstPriority2Idx = result.warmupRehab.findIndex((e) => e.priority === 2)
      if (firstPriority2Idx !== -1) {
        expect(lastPriority1Idx).toBeLessThan(firstPriority2Idx)
      }
    })

    it('with 6 conditions, returns more than 5 warmup exercises', () => {
      // Regression: the old cap of 5 cut important exercises like nerve flossing
      // and short foot for users with many health conditions. The new cap of 8
      // allows more rehab exercises through.
      const conditions = [
        makeCondition('elbow_right', 'Golf elbow'),
        makeCondition('lower_back', 'Douleurs lombaires'),
        makeCondition('knee_right', 'Tendinite'),
        makeCondition('foot_left', 'Pieds plats'),
        makeCondition('upper_back', 'Posture'),
        makeCondition('hip_right', 'Sciatique'),
      ]
      const session = makeSession('Full Body')
      const result = integrateRehab(session, conditions)

      // 14 total warmup exercises across 6 conditions, capped at 8
      expect(result.warmupRehab.length).toBeGreaterThan(5)
      expect(result.warmupRehab.length).toBeLessThanOrEqual(8)
    })
  })

  // -----------------------------------------------------------------------
  // Cooldown capped at 5
  // -----------------------------------------------------------------------
  describe('cooldown cap at 5 exercises', () => {
    it('cooldown is capped at 5 even with multiple conditions', () => {
      // posture: 1 cooldown (Etirement pectoral)
      // sciatique: 4 cooldown (Etirement piriforme, Child's pose, ischio-jambiers, fléchisseurs hanche)
      // total: 5, at cap of 5
      const conditions = [
        makeCondition('upper_back', 'Posture'),
        makeCondition('hip_right', 'Sciatique'),
      ]
      const session = makeSession('Full Body')
      const result = integrateRehab(session, conditions)

      expect(result.cooldownRehab.length).toBeLessThanOrEqual(5)
    })
  })

  // -----------------------------------------------------------------------
  // Active wait pool has no cap
  // -----------------------------------------------------------------------
  describe('active wait pool has no cap', () => {
    it('returns all active wait exercises without capping', () => {
      // posture: 2 active_wait (Face pull, Band pull-apart)
      // lower_back: 1 active_wait (Pallof press)
      // knee: 1 active_wait (Leg extension tempo lent)
      // sciatique: 1 active_wait (Pont fessier) — but may be deduped with lower_back
      const conditions = [
        makeCondition('upper_back', 'Posture'),
        makeCondition('lower_back', 'Douleurs lombaires'),
        makeCondition('knee_right', 'Tendinite'),
        makeCondition('hip_right', 'Sciatique'),
      ]
      const session = makeSession('Full Body')
      const result = integrateRehab(session, conditions)

      // At least 4 active_wait exercises (Pont fessier deduped: lower_back warmup vs sciatique active_wait)
      expect(result.activeWaitPool.length).toBeGreaterThanOrEqual(4)
    })
  })

  // -----------------------------------------------------------------------
  // Session is returned unchanged
  // -----------------------------------------------------------------------
  describe('session is not mutated', () => {
    it('returns the original session object unchanged', () => {
      const session = makeSession('Upper 1', ['Bench Press', 'Shoulder Press'])
      const conditions = [makeCondition('elbow_right', 'Golf elbow')]
      const result = integrateRehab(session, conditions)

      expect(result.session).toBe(session)
      expect(result.session.exercises).toHaveLength(2)
    })
  })

  // -----------------------------------------------------------------------
  // Rest day exercises are excluded
  // -----------------------------------------------------------------------
  describe('rest day exercises are excluded', () => {
    it('Towel curl (rest_day placement) is not included in any list', () => {
      const conditions = [makeCondition('foot_left', 'Pieds plats')]
      const session = makeSession('Lower 1')
      const result = integrateRehab(session, conditions)

      const allNames = [
        ...exerciseNames(result.warmupRehab),
        ...exerciseNames(result.activeWaitPool),
        ...exerciseNames(result.cooldownRehab),
      ]
      expect(allNames).not.toContain('Towel curl (curl serviette pied)')
    })
  })

  // -----------------------------------------------------------------------
  // RehabExerciseInfo fields are well-formed
  // -----------------------------------------------------------------------
  describe('RehabExerciseInfo fields', () => {
    it('all fields are populated correctly', () => {
      const conditions = [makeCondition('elbow_right', 'Golf elbow')]
      const session = makeSession('Upper 1')
      const result = integrateRehab(session, conditions)

      const tyler = result.warmupRehab.find(
        (e) => e.exerciseName === 'Tyler Twist inversé (golf elbow)',
      )!
      expect(tyler).toBeDefined()
      expect(tyler.sets).toBe(3)
      expect(tyler.reps).toBe('15')
      expect(tyler.intensity).toBe('light')
      expect(tyler.notes).toContain('FlexBar')
      expect(tyler.protocolName).toBe('Épicondylite médiale (golf elbow)')
      expect(tyler.priority).toBe(1)
    })

    it('reps as string works for time-based exercises', () => {
      const conditions = [makeCondition('knee_right', 'Tendinite')]
      const session = makeSession('Lower 1')
      const result = integrateRehab(session, conditions)

      const spanish = result.warmupRehab.find(
        (e) => e.exerciseName === 'Spanish squat isométrique (tendinite rotulienne)',
      )!
      expect(spanish).toBeDefined()
      expect(spanish.reps).toBe('45 sec')
      expect(spanish.sets).toBe(5)
      expect(spanish.intensity).toBe('moderate')
    })
  })

  // -----------------------------------------------------------------------
  // Mirrored zone matching (left ↔ right fallback)
  // -----------------------------------------------------------------------
  describe('mirrored zone matching', () => {
    it('hip_left matches sciatique protocol (which targets hip_right)', () => {
      const conditions = [makeCondition('hip_left', 'Sciatique gauche')]
      const session = makeSession('Lower 1')
      const result = integrateRehab(session, conditions)

      const allNames = [
        ...exerciseNames(result.warmupRehab),
        ...exerciseNames(result.activeWaitPool),
        ...exerciseNames(result.cooldownRehab),
      ]
      expect(allNames).toContain('Nerve flossing sciatique')
      expect(allNames).toContain('Étirement piriforme')
    })

    it('knee_left matches tendinopathie rotulienne protocol (which targets knee_right)', () => {
      const conditions = [makeCondition('knee_left', 'Tendinite genou gauche')]
      const session = makeSession('Lower 1')
      const result = integrateRehab(session, conditions)

      const warmupNames = exerciseNames(result.warmupRehab)
      expect(warmupNames).toContain('Spanish squat isométrique (tendinite rotulienne)')

      const activeWaitNames = exerciseNames(result.activeWaitPool)
      expect(activeWaitNames).toContain('Leg extension tempo lent (tendinite rotulienne)')
    })

    it('exact match takes precedence over mirrored match', () => {
      // elbow_right has an exact protocol match, so mirroring should not be used
      const conditions = [makeCondition('elbow_right', 'Golf elbow')]
      const session = makeSession('Upper 1')
      const result = integrateRehab(session, conditions)

      const names = exerciseNames(result.warmupRehab)
      expect(names).toContain('Tyler Twist inversé (golf elbow)')
    })

    it('zones without a mirror (e.g. neck) produce no rehab when no exact match', () => {
      // neck has no mirror and no default protocol in rehabProtocols
      const conditions = [makeCondition('neck', 'Cervicalgie')]
      const session = makeSession('Upper 1')
      const result = integrateRehab(session, conditions)

      expect(result.warmupRehab).toHaveLength(0)
      expect(result.activeWaitPool).toHaveLength(0)
      expect(result.cooldownRehab).toHaveLength(0)
    })
  })

  // -----------------------------------------------------------------------
  // Custom protocols parameter
  // -----------------------------------------------------------------------
  describe('custom protocols parameter', () => {
    it('uses provided protocols instead of default rehabProtocols', () => {
      const customProtocols: typeof rehabProtocols = [
        {
          targetZone: 'neck',
          conditionName: 'Test Neck Protocol',
          frequency: 'daily',
          priority: 1,
          progressionCriteria: 'Test',
          exercises: [
            {
              exerciseName: 'Neck Stretch Custom',
              sets: 2,
              reps: '20 sec',
              intensity: 'very_light',
              notes: 'Custom test exercise',
              placement: 'warmup',
            },
          ],
        },
      ]
      const conditions = [makeCondition('neck', 'Neck pain')]
      const session = makeSession('Upper 1')
      const result = integrateRehab(session, conditions, customProtocols)

      expect(result.warmupRehab).toHaveLength(1)
      expect(result.warmupRehab[0].exerciseName).toBe('Neck Stretch Custom')
      expect(result.warmupRehab[0].protocolName).toBe('Test Neck Protocol')
    })
  })
})
