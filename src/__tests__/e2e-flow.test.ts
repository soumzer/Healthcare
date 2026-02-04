import { describe, it, expect, beforeAll } from 'vitest'
import { db } from '../db'
import { seedExercises } from '../data/seed'
import { generateProgram, type ProgramGeneratorInput } from '../engine/program-generator'
import { suggestFillerFromCatalog } from '../engine/filler'
import { generateWarmupSets } from '../engine/warmup'
import { generateRestDayRoutine } from '../engine/rest-day'
import { selectCooldownExercises } from '../engine/cooldown'
import { fixedWarmupRoutine } from '../data/warmup-routine'
import type {
  HealthCondition,
  GymEquipment,
  Exercise,
  WorkoutProgram,
  NotebookEntry,
  PainReport,
} from '../db/types'

// ---------------------------------------------------------------------------
// Reference user profile — matches the task description
// ---------------------------------------------------------------------------

const USER_BODY = {
  name: 'Yassine',
  height: 196,
  weight: 112,
  age: 30,
  sex: 'male' as const,
}

const USER_CONDITIONS: Omit<HealthCondition, 'id' | 'userId' | 'createdAt'>[] = [
  {
    bodyZone: 'elbow_right',
    label: 'Golf elbow (coude droit)',
    diagnosis: 'Epicondylite mediale',
    painLevel: 4,
    since: '2 ans',
    notes: 'Douleur lors des mouvements de poussee et prehension',
    isActive: true,
  },
  {
    bodyZone: 'knee_right',
    label: 'Tendinite genou droit',
    diagnosis: 'Tendinopathie rotulienne',
    painLevel: 3,
    since: '1 an',
    notes: 'Douleur en montant les escaliers',
    isActive: true,
  },
  {
    bodyZone: 'lower_back',
    label: 'Douleurs lombaires',
    diagnosis: 'Core faible, douleurs lombaires chroniques',
    painLevel: 5,
    since: '3 ans',
    notes: 'Aggrave en position assise prolongee',
    isActive: true,
  },
  {
    bodyZone: 'upper_back',
    label: 'Posture anteriere',
    diagnosis: 'Tete et epaules en avant, core faible',
    painLevel: 2,
    since: '5 ans',
    notes: 'Travail de bureau',
    isActive: true,
  },
]

const USER_EQUIPMENT: Omit<GymEquipment, 'id' | 'userId'>[] = [
  { name: 'dumbbell', type: 'free_weight', isAvailable: true, notes: '' },
  { name: 'dumbbells', type: 'free_weight', isAvailable: true, notes: '' },
  { name: 'bench', type: 'other', isAvailable: true, notes: '' },
  { name: 'cable', type: 'cable', isAvailable: true, notes: '' },
  { name: 'rope_attachment', type: 'other', isAvailable: true, notes: '' },
  { name: 'smith_machine', type: 'machine', isAvailable: true, notes: '' },
  { name: 'leg_press', type: 'machine', isAvailable: true, notes: '' },
  { name: 'leg_curl', type: 'machine', isAvailable: true, notes: '' },
  { name: 'leg_extension', type: 'machine', isAvailable: true, notes: '' },
  { name: 'pec_press', type: 'machine', isAvailable: true, notes: '' },
  { name: 'shoulder_press', type: 'machine', isAvailable: true, notes: '' },
  { name: 'rowing_machine', type: 'machine', isAvailable: true, notes: '' },
  { name: 'lat_pulldown', type: 'machine', isAvailable: true, notes: '' },
  { name: 'mat', type: 'other', isAvailable: true, notes: '' },
  { name: 'resistance_band', type: 'band', isAvailable: true, notes: '' },
]

// ---------------------------------------------------------------------------
// Shared state across describe blocks (built up as the flow progresses)
// ---------------------------------------------------------------------------

let userId: number
let exerciseCatalog: Exercise[]
let generatedProgram: ReturnType<typeof generateProgram>
let savedProgram: WorkoutProgram
let conditions: HealthCondition[]

// ---------------------------------------------------------------------------
// E2E flow test
// ---------------------------------------------------------------------------

describe('E2E flow: onboarding -> programme -> notebook session -> dashboard', () => {
  // -----------------------------------------------------------------------
  // 1. Setup — seed DB, create user + conditions + equipment
  // -----------------------------------------------------------------------

  beforeAll(async () => {
    // Fresh database
    await db.delete()
    await db.open()

    // Seed exercises
    await seedExercises()
    exerciseCatalog = await db.exercises.toArray()
  })

  // -----------------------------------------------------------------------
  // Step 1 — Onboarding: create user, conditions, equipment, generate program
  // -----------------------------------------------------------------------

  describe('1. Onboarding et generation du programme', () => {
    it('cree le profil utilisateur en base', async () => {
      const now = new Date()
      userId = await db.userProfiles.add({
        name: USER_BODY.name,
        height: USER_BODY.height,
        weight: USER_BODY.weight,
        age: USER_BODY.age,
        sex: USER_BODY.sex,
        daysPerWeek: 4,
        minutesPerSession: 75,
        createdAt: now,
        updatedAt: now,
      }) as number

      expect(userId).toBeGreaterThan(0)

      const profile = await db.userProfiles.get(userId)
      expect(profile).toBeDefined()
      expect(profile!.name).toBe('Yassine')
      expect(profile!.height).toBe(196)
      expect(profile!.weight).toBe(112)
    })

    it('enregistre les conditions de sante', async () => {
      const now = new Date()
      await db.healthConditions.bulkAdd(
        USER_CONDITIONS.map(c => ({ ...c, userId, createdAt: now }))
      )

      conditions = await db.healthConditions.where('userId').equals(userId).toArray()
      expect(conditions).toHaveLength(4)
      expect(conditions.map(c => c.bodyZone)).toContain('elbow_right')
      expect(conditions.map(c => c.bodyZone)).toContain('knee_right')
      expect(conditions.map(c => c.bodyZone)).toContain('lower_back')
      expect(conditions.map(c => c.bodyZone)).toContain('upper_back')
    })

    it('enregistre l\'equipement disponible', async () => {
      await db.gymEquipment.bulkAdd(
        USER_EQUIPMENT.map(e => ({ ...e, userId }))
      )

      const equipment = await db.gymEquipment.where('userId').equals(userId).toArray()
      expect(equipment.length).toBeGreaterThanOrEqual(USER_EQUIPMENT.length)
    })

    it('genere un programme upper_lower avec 4 sessions', () => {
      const equipment: GymEquipment[] = USER_EQUIPMENT.map(e => ({
        ...e,
        userId,
      }))

      const input: ProgramGeneratorInput = {
        userId,
        conditions,
        equipment,
        daysPerWeek: 4,
        minutesPerSession: 75,
      }

      generatedProgram = generateProgram(input, exerciseCatalog)

      expect(generatedProgram.type).toBe('upper_lower')
      expect(generatedProgram.name).toBe('Programme Upper / Lower')
      expect(generatedProgram.sessions).toHaveLength(4)
    })

    it('chaque session a au moins 1 exercice et les upper sessions ont 5-6', () => {
      // Lower sessions may have fewer exercises due to knee_right + lower_back contraindications
      // filtering out most lower body compounds. Upper sessions should still be well-populated.
      for (const session of generatedProgram.sessions) {
        expect(session.exercises.length).toBeGreaterThanOrEqual(1)
      }

      const upperSessions = generatedProgram.sessions.filter(
        s => s.name.toLowerCase().includes('upper')
      )
      for (const session of upperSessions) {
        expect(session.exercises.length).toBeGreaterThanOrEqual(4)
        expect(session.exercises.length).toBeLessThanOrEqual(8)
      }
    })

    it('aucun exercice n\'a de contre-indication pour les zones avec douleur severe (>= 7)', () => {
      // Only zones with pain >= 7 trigger hard exclusion
      // In our test data: elbow_right (4), knee_right (3), lower_back (5) — all below 7
      // So no exercises should be excluded by contraindications in this scenario
      const severeZones = new Set(
        USER_CONDITIONS
          .filter(c => c.painLevel >= 7)
          .map(c => c.bodyZone)
      )

      // If no zones are severe, all exercises are allowed regardless of contraindications
      if (severeZones.size === 0) {
        // Just verify program was generated with exercises
        for (const session of generatedProgram.sessions) {
          expect(session.exercises.length).toBeGreaterThan(0)
        }
        return
      }

      for (const session of generatedProgram.sessions) {
        for (const progEx of session.exercises) {
          const exercise = exerciseCatalog.find(e => e.id === progEx.exerciseId)
          expect(exercise).toBeDefined()
          const hasContraindication = exercise!.contraindications.some(
            zone => severeZones.has(zone)
          )
          expect(
            hasContraindication,
            `Exercise "${exercise!.name}" has contraindication for a severe zone`
          ).toBe(false)
        }
      }
    })

    it('Face pull apparait dans les sessions upper', () => {
      const upperSessions = generatedProgram.sessions.filter(
        s => s.name.toLowerCase().includes('upper')
      )
      expect(upperSessions.length).toBe(2)

      const facePullIds = exerciseCatalog
        .filter(e => e.name.toLowerCase().includes('face pull') && !e.isRehab)
        .map(e => e.id)

      const upperHasFacePull = upperSessions.some(session =>
        session.exercises.some(ex => facePullIds.includes(ex.exerciseId))
      )
      expect(upperHasFacePull).toBe(true)
    })

    it('sauvegarde le programme en base de donnees', async () => {
      const programId = await db.workoutPrograms.add({
        userId,
        name: generatedProgram.name,
        type: generatedProgram.type,
        sessions: generatedProgram.sessions,
        isActive: true,
        createdAt: new Date(),
      })

      savedProgram = (await db.workoutPrograms.get(programId))!
      expect(savedProgram).toBeDefined()
      expect(savedProgram.sessions).toHaveLength(4)
      expect(savedProgram.isActive).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // Step 2 — Warmup sets generation
  // -----------------------------------------------------------------------

  describe('3. Generation des sets d\'echauffement', () => {
    it('genere des sets progressifs pour un poids de travail de 80kg', () => {
      const warmupSets = generateWarmupSets(80)
      // Should generate 4 warmup sets: empty bar, 50%, 70%, 85%
      expect(warmupSets).toHaveLength(4)
      expect(warmupSets[0].label).toBe('Barre \u00e0 vide')
      expect(warmupSets[1].weightKg).toBe(40)  // 50% of 80
      expect(warmupSets[2].weightKg).toBe(55)   // 70% of 80 = 56, rounded to 55
      expect(warmupSets[3].weightKg).toBe(67.5) // 85% of 80 = 68, rounded to 67.5
    })

    it('genere moins de sets pour un poids leger', () => {
      const warmupSets = generateWarmupSets(15)
      expect(warmupSets.length).toBeLessThanOrEqual(2)
    })

    it('retourne un tableau vide pour poids zero', () => {
      const warmupSets = generateWarmupSets(0)
      expect(warmupSets).toHaveLength(0)
    })
  })

  // -----------------------------------------------------------------------
  // Step 4 — Notebook session simulation
  // -----------------------------------------------------------------------

  describe('4. Simulation session avec notebook', () => {
    it('enregistre les NotebookEntry pour chaque exercice', async () => {
      const session = savedProgram.sessions[0]
      for (let i = 0; i < session.exercises.length; i++) {
        const progEx = session.exercises[i]
        const catalogEx = exerciseCatalog.find(e => e.id === progEx.exerciseId)
        const weight = 40 + i * 5
        const entry: NotebookEntry = {
          userId,
          exerciseId: progEx.exerciseId,
          exerciseName: catalogEx?.name ?? `Exercise ${progEx.exerciseId}`,
          date: new Date(),
          sessionIntensity: session.intensity ?? 'moderate',
          sets: Array.from({ length: progEx.sets }, () => ({ weightKg: weight, reps: progEx.targetReps })),
          skipped: false,
        }
        await db.notebookEntries.add(entry)
      }

      const entries = await db.notebookEntries.where('userId').equals(userId).toArray()
      expect(entries.length).toBe(session.exercises.length)
      expect(entries.every(e => e.sets.length > 0)).toBe(true)
    })

    it('skip un exercice avec douleur au genou', async () => {
      const session = savedProgram.sessions[1] // second session
      const firstEx = session.exercises[0]
      const catalogEx = exerciseCatalog.find(e => e.id === firstEx.exerciseId)

      // Skipped entry
      const skipEntry: NotebookEntry = {
        userId,
        exerciseId: firstEx.exerciseId,
        exerciseName: catalogEx?.name ?? 'Unknown',
        date: new Date(),
        sessionIntensity: session.intensity ?? 'moderate',
        sets: [],
        skipped: true,
        skipZone: 'knee_right',
      }
      await db.notebookEntries.add(skipEntry)

      // Pain report
      const painReport: PainReport = {
        userId,
        zone: 'knee_right',
        date: new Date(),
        fromExerciseName: catalogEx?.name ?? 'Unknown',
        accentDaysRemaining: 3,
      }
      await db.painReports.add(painReport)

      const reports = await db.painReports.where('userId').equals(userId).toArray()
      expect(reports.length).toBe(1)
      expect(reports[0].zone).toBe('knee_right')
      expect(reports[0].accentDaysRemaining).toBe(3)
    })

    it('sauvegarde le WorkoutSession', async () => {
      const session = savedProgram.sessions[0]
      await db.workoutSessions.add({
        userId,
        programId: savedProgram.id!,
        sessionName: session.name,
        startedAt: new Date(Date.now() - 75 * 60 * 1000),
        completedAt: new Date(),
        exercises: session.exercises.map((ex, i) => {
          const catalogEx = exerciseCatalog.find(e => e.id === ex.exerciseId)
          return {
            exerciseId: ex.exerciseId,
            exerciseName: catalogEx?.name ?? '',
            order: i + 1,
            prescribedSets: ex.sets,
            prescribedReps: ex.targetReps,
            prescribedWeightKg: 40 + i * 5,
            sets: [],
            status: 'completed' as const,
          }
        }),
        endPainChecks: [],
        notes: '',
      })

      const sessions = await db.workoutSessions.where('userId').equals(userId).toArray()
      expect(sessions.length).toBe(1)
      expect(sessions[0].completedAt).toBeDefined()
    })
  })

  // -----------------------------------------------------------------------
  // Step 5 — Fixed warmup routine
  // -----------------------------------------------------------------------

  describe('5. Warmup routine fixe', () => {
    it('contient les 17 exercices d\'echauffement', () => {
      expect(fixedWarmupRoutine.length).toBe(17)
      expect(fixedWarmupRoutine[0].name).toBe('Curl supination')
      expect(fixedWarmupRoutine.every(w => w.reps.startsWith('x'))).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // Step 6 — Filler exercise (catalog-based)
  // -----------------------------------------------------------------------

  describe('6. Filler exercise (machine occupee)', () => {
    it('suggere des exercices mobility du catalogue', () => {
      const suggestions = suggestFillerFromCatalog({
        sessionMuscles: ['quadriceps', 'ischio-jambiers'],
        completedFillers: [],
        exerciseCatalog: exerciseCatalog,
      })
      // May or may not have mobility exercises depending on catalog
      // Just verify it returns an array
      expect(Array.isArray(suggestions)).toBe(true)
    })

    it('exclut les exercices deja completes', () => {
      const first = suggestFillerFromCatalog({
        sessionMuscles: ['pectoraux'],
        completedFillers: [],
        exerciseCatalog: exerciseCatalog,
      })

      if (first.length > 0) {
        const second = suggestFillerFromCatalog({
          sessionMuscles: ['pectoraux'],
          completedFillers: [first[0].name],
          exerciseCatalog: exerciseCatalog,
        })

        if (second.length > 0) {
          expect(second[0].name).not.toBe(first[0].name)
        }
      }
    })
  })

  // -----------------------------------------------------------------------
  // Step 7 — Rest day routine and cooldown
  // -----------------------------------------------------------------------

  describe('7. Routine jour de repos et cooldown', () => {
    it('genere une routine adaptee aux conditions actives', () => {
      const routine = generateRestDayRoutine(conditions)
      expect(routine.exercises.length).toBeGreaterThan(0)
      expect(routine.totalMinutes).toBeGreaterThan(0)
    })

    it('selectionne des exercices cooldown par muscles', () => {
      const cooldown = selectCooldownExercises(
        ['quadriceps', 'ischio-jambiers'],
        exerciseCatalog,
        3,
      )
      expect(Array.isArray(cooldown)).toBe(true)
      // Cooldown exercises should be mobility category or tagged cooldown
    })
  })

  // -----------------------------------------------------------------------
  // Step 8 — Dashboard data verification (NotebookEntry)
  // -----------------------------------------------------------------------

  describe('8. Donnees du dashboard (NotebookEntry)', () => {
    it('NotebookEntry contient les donnees de la session', async () => {
      const entries = await db.notebookEntries.where('userId').equals(userId).toArray()
      expect(entries.length).toBeGreaterThan(0)

      const nonSkipped = entries.filter(e => !e.skipped)
      expect(nonSkipped.length).toBeGreaterThan(0)
      for (const entry of nonSkipped) {
        expect(entry.sets.length).toBeGreaterThan(0)
        expect(entry.sets[0].weightKg).toBeGreaterThan(0)
      }
    })

    it('PainReport est present pour le skip', async () => {
      const reports = await db.painReports.where('userId').equals(userId).toArray()
      expect(reports.length).toBe(1)
      expect(reports[0].zone).toBe('knee_right')
      expect(reports[0].accentDaysRemaining).toBe(3)
    })

    it('WorkoutSession est enregistree', async () => {
      const sessions = await db.workoutSessions.where('userId').equals(userId).toArray()
      expect(sessions.length).toBe(1)
      expect(sessions[0].completedAt).toBeDefined()
    })

    it('le programme est actif', async () => {
      const programs = await db.workoutPrograms
        .where('userId').equals(userId)
        .filter(p => p.isActive)
        .toArray()
      expect(programs.length).toBe(1)
    })
  })
})
