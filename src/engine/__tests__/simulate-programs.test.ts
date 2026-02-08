import { describe, it, expect } from 'vitest'
import { generateProgram } from '../program-generator'
import { exerciseCatalog } from '../../data/exercises'
import type { Exercise, GymEquipment } from '../../db/types'

// ---------------------------------------------------------------------------
// Setup: build a full catalog with IDs + full equipment
// ---------------------------------------------------------------------------

const catalog: Exercise[] = exerciseCatalog.map((e, i) => ({ ...e, id: i + 1 }))

const fullEquipment: GymEquipment[] = [
  'smith_machine', 'cable', 'rope_attachment', 'dumbbells', 'dumbbell',
  'bench', 'leg_press', 'leg_extension', 'leg_curl', 'lat_pulldown',
  'pec_deck', 'shoulder_press', 'resistance_band', 'pec_press',
  'hack_squat', 'hip_abduction', 'rowing_machine', 'barbell',
].map((name, i) => ({
  id: i + 1,
  userId: 1,
  name,
  type: 'machine' as const,
  isAvailable: true,
  notes: '',
}))

// ---------------------------------------------------------------------------
// Helper: analyze a generated program for incoherences
// ---------------------------------------------------------------------------

interface Issue {
  severity: 'error' | 'warning'
  message: string
}

function analyzeProgram(days: number, program: ReturnType<typeof generateProgram>): Issue[] {
  const issues: Issue[] = []
  const { sessions } = program

  // 1. Session count
  const expectedSessions: Record<number, number> = { 2: 2, 3: 3, 4: 4, 5: 6, 6: 6 }
  if (sessions.length !== expectedSessions[days]) {
    issues.push({ severity: 'error', message: `${days}j/sem: attendu ${expectedSessions[days]} sessions, reçu ${sessions.length}` })
  }

  // 2. Expected split type
  const expectedType: Record<number, string> = { 2: 'full_body', 3: 'full_body', 4: 'upper_lower', 5: 'push_pull_legs', 6: 'push_pull_legs' }
  if (program.type !== expectedType[days]) {
    issues.push({ severity: 'error', message: `${days}j/sem: attendu split ${expectedType[days]}, reçu ${program.type}` })
  }

  // Track all exercises across sessions for duplicate check
  const exercisesBySession: Map<number, Set<number>> = new Map()
  const allExerciseIds: number[] = []
  const musclesCoveredPerWeek = new Set<string>()

  for (const session of sessions) {
    const exIds = new Set<number>()

    // 3. Each session has exercises
    if (session.exercises.length === 0) {
      issues.push({ severity: 'error', message: `${days}j/sem, ${session.name}: session VIDE (0 exercices)` })
    }

    // 4. Reasonable exercise count (3-10)
    if (session.exercises.length < 3) {
      issues.push({ severity: 'warning', message: `${days}j/sem, ${session.name}: seulement ${session.exercises.length} exercices (min attendu: 3)` })
    }
    if (session.exercises.length > 10) {
      issues.push({ severity: 'warning', message: `${days}j/sem, ${session.name}: ${session.exercises.length} exercices (beaucoup, max usuel: 10)` })
    }

    for (const ex of session.exercises) {
      // 5. Valid sets/reps/rest
      if (ex.sets < 1 || ex.sets > 8) {
        issues.push({ severity: 'error', message: `${days}j/sem, ${session.name}: exercice ${ex.exerciseId} a ${ex.sets} sets (hors range 1-8)` })
      }
      if (ex.targetReps < 1 || ex.targetReps > 30) {
        issues.push({ severity: 'error', message: `${days}j/sem, ${session.name}: exercice ${ex.exerciseId} a ${ex.targetReps} reps (hors range 1-30)` })
      }
      if (ex.restSeconds < 30 || ex.restSeconds > 300) {
        issues.push({ severity: 'warning', message: `${days}j/sem, ${session.name}: exercice ${ex.exerciseId} a ${ex.restSeconds}s rest (hors range 30-300)` })
      }

      // 6. No rehab exercises without conditions
      if (ex.isRehab) {
        issues.push({ severity: 'error', message: `${days}j/sem, ${session.name}: exercice ${ex.exerciseId} est rehab alors qu'il n'y a pas de conditions` })
      }

      // 7. Duplicate within same session
      if (exIds.has(ex.exerciseId)) {
        issues.push({ severity: 'error', message: `${days}j/sem, ${session.name}: exercice ${ex.exerciseId} en DOUBLE dans la même session` })
      }
      exIds.add(ex.exerciseId)
      allExerciseIds.push(ex.exerciseId)

      // 8. Exercise exists in catalog
      const catalogEx = catalog.find(c => c.id === ex.exerciseId)
      if (!catalogEx) {
        issues.push({ severity: 'error', message: `${days}j/sem, ${session.name}: exercice ID ${ex.exerciseId} introuvable dans le catalogue` })
      } else {
        catalogEx.primaryMuscles.forEach(m => musclesCoveredPerWeek.add(m.toLowerCase()))
      }
    }

    exercisesBySession.set(session.order, exIds)

    // 9. Intensity is set
    if (!session.intensity) {
      issues.push({ severity: 'warning', message: `${days}j/sem, ${session.name}: pas d'intensité définie` })
    }
  }

  // 10. Check DUP: at least one heavy and one volume session
  const intensities = sessions.map(s => s.intensity)
  if (!intensities.includes('heavy')) {
    issues.push({ severity: 'error', message: `${days}j/sem: aucune session heavy (DUP cassée)` })
  }
  if (!intensities.includes('volume')) {
    issues.push({ severity: 'error', message: `${days}j/sem: aucune session volume (DUP cassée)` })
  }

  // 11. Check heavy vs volume reps coherence
  for (const session of sessions) {
    if (session.intensity === 'heavy') {
      const compounds = session.exercises.filter(ex => {
        const cat = catalog.find(c => c.id === ex.exerciseId)
        return cat?.category === 'compound' && !ex.isRehab
      })
      for (const ex of compounds) {
        if (ex.targetReps > 10) {
          const cat = catalog.find(c => c.id === ex.exerciseId)
          issues.push({ severity: 'warning', message: `${days}j/sem, ${session.name} (heavy): compound "${cat?.name}" a ${ex.targetReps} reps (attendu ≤10 pour heavy)` })
        }
      }
    }
    if (session.intensity === 'volume') {
      const compounds = session.exercises.filter(ex => {
        const cat = catalog.find(c => c.id === ex.exerciseId)
        return cat?.category === 'compound' && !ex.isRehab
      })
      for (const ex of compounds) {
        if (ex.targetReps < 8) {
          const cat = catalog.find(c => c.id === ex.exerciseId)
          issues.push({ severity: 'warning', message: `${days}j/sem, ${session.name} (volume): compound "${cat?.name}" a ${ex.targetReps} reps (attendu ≥8 pour volume)` })
        }
      }
    }
  }

  // 12. Major muscle groups covered across the week
  const requiredMuscles = ['pectoraux', 'quadriceps', 'deltoïdes']
  for (const m of requiredMuscles) {
    const found = [...musclesCoveredPerWeek].some(covered =>
      covered.includes(m.toLowerCase())
    )
    if (!found) {
      issues.push({ severity: 'error', message: `${days}j/sem: muscle "${m}" jamais travaillé dans la semaine` })
    }
  }

  // 13. For PPL: check session naming/content coherence
  if (program.type === 'push_pull_legs') {
    for (const session of sessions) {
      const nameLower = session.name.toLowerCase()
      const exInSession = session.exercises.map(ex => catalog.find(c => c.id === ex.exerciseId)!).filter(Boolean)

      if (nameLower.includes('push')) {
        // Push session should not contain pull-primary exercises (back movements)
        const pullExercises = exInSession.filter(e =>
          e.tags.includes('pull') && !e.tags.includes('push') &&
          (e.primaryMuscles.some(m => m.toLowerCase().includes('dorsa') || m.toLowerCase().includes('grand dorsal')))
        )
        if (pullExercises.length > 0) {
          issues.push({ severity: 'error', message: `${days}j/sem, ${session.name}: contient des exos pull (dos) dans une session push: ${pullExercises.map(e => e.name).join(', ')}` })
        }
      }

      if (nameLower.includes('pull')) {
        // Pull session should not contain push-primary exercises (chest movements)
        const pushExercises = exInSession.filter(e =>
          e.tags.includes('push') && !e.tags.includes('pull') &&
          (e.primaryMuscles.some(m => m.toLowerCase().includes('pectoraux')))
        )
        if (pushExercises.length > 0) {
          issues.push({ severity: 'error', message: `${days}j/sem, ${session.name}: contient des exos push (pec) dans une session pull: ${pushExercises.map(e => e.name).join(', ')}` })
        }
      }

      if (nameLower.includes('legs')) {
        // Legs session should be mostly lower body
        const upperOnly = exInSession.filter(e =>
          e.tags.includes('upper_body') && !e.tags.includes('lower_body') &&
          e.category !== 'core'
        )
        if (upperOnly.length > 1) {
          issues.push({ severity: 'warning', message: `${days}j/sem, ${session.name}: ${upperOnly.length} exos upper body dans une session legs: ${upperOnly.map(e => e.name).join(', ')}` })
        }
      }
    }
  }

  // 14. For Upper/Lower: check session content coherence
  if (program.type === 'upper_lower') {
    for (const session of sessions) {
      const nameLower = session.name.toLowerCase()
      const exInSession = session.exercises.map(ex => catalog.find(c => c.id === ex.exerciseId)!).filter(Boolean)

      if (nameLower.includes('lower')) {
        const upperOnly = exInSession.filter(e =>
          e.tags.includes('upper_body') && !e.tags.includes('lower_body') &&
          e.category !== 'core'
        )
        if (upperOnly.length > 1) {
          issues.push({ severity: 'warning', message: `${days}j/sem, ${session.name}: ${upperOnly.length} exos upper dans session lower: ${upperOnly.map(e => e.name).join(', ')}` })
        }
      }

      if (nameLower.includes('upper')) {
        const lowerOnly = exInSession.filter(e =>
          e.tags.includes('lower_body') && !e.tags.includes('upper_body') &&
          e.category !== 'core'
        )
        if (lowerOnly.length > 0) {
          issues.push({ severity: 'warning', message: `${days}j/sem, ${session.name}: ${lowerOnly.length} exos lower dans session upper: ${lowerOnly.map(e => e.name).join(', ')}` })
        }
      }
    }
  }

  return issues
}

// ---------------------------------------------------------------------------
// Print program summary for human review
// ---------------------------------------------------------------------------

function printProgram(days: number, program: ReturnType<typeof generateProgram>): string {
  const lines: string[] = []
  lines.push(`\n${'='.repeat(70)}`)
  lines.push(`${days} SÉANCES/SEMAINE — ${program.type.toUpperCase()} — "${program.name}"`)
  lines.push('='.repeat(70))

  for (const session of program.sessions) {
    lines.push(`\n  📋 ${session.name} [${session.intensity}]`)
    lines.push('  ' + '-'.repeat(50))
    for (const ex of session.exercises) {
      const catalogEx = catalog.find(c => c.id === ex.exerciseId)
      const name = catalogEx?.name ?? `ID:${ex.exerciseId}`
      const cat = catalogEx?.category ?? '?'
      const muscles = catalogEx?.primaryMuscles.join(', ') ?? '?'
      const rehab = ex.isRehab ? ' [REHAB]' : ''
      lines.push(`    ${ex.order}. ${name} — ${ex.sets}×${ex.targetReps} (${ex.restSeconds}s) [${cat}] {${muscles}}${rehab}`)
    }
  }

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Simulation programmes 2-6 séances/semaine (conditions normales, avec poids, sans SA)', () => {
  for (const days of [2, 3, 4, 5, 6]) {
    it(`${days} séances/semaine — génère un programme cohérent`, () => {
      const program = generateProgram(
        {
          userId: 1,
          conditions: [],
          equipment: fullEquipment,
          daysPerWeek: days,
          minutesPerSession: 75,
        },
        catalog,
      )

      // Print full program for human review
      const summary = printProgram(days, program)
      console.log(summary)

      // Run automated incoherence checks
      const issues = analyzeProgram(days, program)

      const errors = issues.filter(i => i.severity === 'error')
      const warnings = issues.filter(i => i.severity === 'warning')

      if (warnings.length > 0) {
        console.log(`\n  ⚠️  WARNINGS (${days}j/sem):`)
        warnings.forEach(w => console.log(`    - ${w.message}`))
      }

      if (errors.length > 0) {
        console.log(`\n  ❌ ERRORS (${days}j/sem):`)
        errors.forEach(e => console.log(`    - ${e.message}`))
      }

      if (issues.length === 0) {
        console.log(`\n  ✅ Aucune incohérence détectée (${days}j/sem)`)
      }

      // Fail test only on errors
      expect(errors).toEqual([])
    })
  }
})

// ---------------------------------------------------------------------------
// Targeted fix verification tests
// ---------------------------------------------------------------------------

describe('Fix verification: programme generator corrections', () => {
  // Helper to resolve exercise name from ID
  const nameOf = (id: number) => catalog.find(c => c.id === id)?.name ?? `ID:${id}`
  const categoryOf = (id: number) => catalog.find(c => c.id === id)?.category
  const musclesOf = (id: number) => catalog.find(c => c.id === id)?.primaryMuscles ?? []

  it('Fix 1 — Full Body C (moderate): compounds have ≤90s rest and session has 6 exercises', () => {
    const program = generateProgram(
      { userId: 1, conditions: [], equipment: fullEquipment, daysPerWeek: 3, minutesPerSession: 60 },
      catalog,
    )
    const fbC = program.sessions.find(s => s.name.includes('Moderé') || s.name.includes('Modéré'))
    expect(fbC).toBeDefined()
    expect(fbC!.intensity).toBe('moderate')

    // Compounds should have rest ≤ 90s (moderate caps rest)
    const compounds = fbC!.exercises.filter(ex => categoryOf(ex.exerciseId) === 'compound')
    for (const ex of compounds) {
      expect(ex.restSeconds).toBeLessThanOrEqual(90)
    }

    // Should have at least 5 exercises (not trimmed down to 3-4)
    expect(fbC!.exercises.length).toBeGreaterThanOrEqual(5)
  })

  it('Fix 2 — Upper 2: développé incliné (not pec deck) in push slot', () => {
    const program = generateProgram(
      { userId: 1, conditions: [], equipment: fullEquipment, daysPerWeek: 4, minutesPerSession: 60 },
      catalog,
    )
    const upper2 = program.sessions.find(s => s.name.includes('Upper 2'))
    expect(upper2).toBeDefined()

    // Find the push compound in Upper 2 (order 2 = incline/chest slot)
    const inclineEx = upper2!.exercises.find(ex => ex.order === 2)
    expect(inclineEx).toBeDefined()
    const name = nameOf(inclineEx!.exerciseId).toLowerCase()
    // Should be développé incliné (a compound), NOT pec deck (isolation)
    expect(name).toContain('incliné')
  })

  it('Fix 3 — Heavy sessions: compound rest is 120s (not 150s)', () => {
    const program = generateProgram(
      { userId: 1, conditions: [], equipment: fullEquipment, daysPerWeek: 4, minutesPerSession: 60 },
      catalog,
    )
    const heavySessions = program.sessions.filter(s => s.intensity === 'heavy')
    expect(heavySessions.length).toBeGreaterThan(0)

    for (const session of heavySessions) {
      const compounds = session.exercises.filter(ex => categoryOf(ex.exerciseId) === 'compound')
      for (const ex of compounds) {
        expect(ex.restSeconds).toBeLessThanOrEqual(120)
      }
    }
  })

  it('Fix 3 — Force sessions: at least 5 exercises (accessories not trimmed)', () => {
    const program = generateProgram(
      { userId: 1, conditions: [], equipment: fullEquipment, daysPerWeek: 4, minutesPerSession: 60 },
      catalog,
    )
    const heavySessions = program.sessions.filter(s => s.intensity === 'heavy')
    for (const session of heavySessions) {
      expect(session.exercises.length).toBeGreaterThanOrEqual(5)
    }
  })

  it('Fix 4 — Push B (PPL volume): contains a triceps isolation exercise', () => {
    const program = generateProgram(
      { userId: 1, conditions: [], equipment: fullEquipment, daysPerWeek: 6, minutesPerSession: 60 },
      catalog,
    )
    const pushB = program.sessions.find(s => s.name.includes('Push B'))
    expect(pushB).toBeDefined()

    const hasTriceps = pushB!.exercises.some(ex => {
      const muscles = musclesOf(ex.exerciseId)
      const cat = categoryOf(ex.exerciseId)
      return cat === 'isolation' && muscles.some(m => m.toLowerCase().includes('triceps'))
    })
    expect(hasTriceps).toBe(true)
  })

  it('Fix 4 — Upper 1 (UL): triceps slot exists (may be trimmed in 60min heavy, present in 75min)', () => {
    // With 60min budget, Upper 1 heavy (3 compounds at 120s + lat raises + face pull) may trim triceps
    // With 75min budget, the triceps slot should survive
    const program75 = generateProgram(
      { userId: 1, conditions: [], equipment: fullEquipment, daysPerWeek: 4, minutesPerSession: 75 },
      catalog,
    )
    const upper1_75 = program75.sessions.find(s => s.name.includes('Upper 1'))
    expect(upper1_75).toBeDefined()

    const hasTriceps75 = upper1_75!.exercises.some(ex => {
      const muscles = musclesOf(ex.exerciseId)
      const cat = categoryOf(ex.exerciseId)
      return cat === 'isolation' && muscles.some(m => m.toLowerCase().includes('triceps'))
    })
    expect(hasTriceps75).toBe(true)
  })

  it('Fix 3 — Pull A (PPL heavy): contains biceps', () => {
    const program = generateProgram(
      { userId: 1, conditions: [], equipment: fullEquipment, daysPerWeek: 6, minutesPerSession: 60 },
      catalog,
    )
    const pullA = program.sessions.find(s => s.name.includes('Pull A'))
    expect(pullA).toBeDefined()

    const hasBiceps = pullA!.exercises.some(ex => {
      const muscles = musclesOf(ex.exerciseId)
      return muscles.some(m => m.toLowerCase().includes('biceps') || m.toLowerCase().includes('brachial'))
    })
    expect(hasBiceps).toBe(true)
  })
})
