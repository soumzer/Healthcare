// --- Session persistence ---

export type SessionPhase = 'warmup' | 'exercises' | 'notebook' | 'cooldown' | 'done'

export interface ExerciseStatus {
  exerciseId: number
  status: 'pending' | 'done' | 'skipped'
  skipZone?: BodyZone
}

export interface ActiveSessionState {
  id?: number                    // Always 1 (singleton)
  programId: number
  sessionIndex: number
  phase: SessionPhase
  currentExerciseIdx: number
  exerciseStatuses: ExerciseStatus[]
  sessionStartTime: Date
  warmupChecked: number[]        // Set<number> serialized as array
  draftSets: { exerciseId: number; sets: NotebookSet[] }[]
  updatedAt: Date
}

// User profile from onboarding
export interface UserProfile {
  id?: number
  name: string
  height: number // cm
  weight: number // kg
  age: number
  sex: 'male' | 'female'
  daysPerWeek: number
  minutesPerSession: number
  createdAt: Date
  updatedAt: Date
}

// Health conditions (per user)
export interface HealthCondition {
  id?: number
  userId: number
  bodyZone: BodyZone
  label: string // e.g. "Golf elbow", "Tendinite genou droit"
  diagnosis: string
  since: string // e.g. "2 ans"
  notes: string
  isActive: boolean
  createdAt: Date
}

export type BodyZone =
  | 'neck' | 'shoulder_left' | 'shoulder_right'
  | 'elbow_left' | 'elbow_right'
  | 'wrist_left' | 'wrist_right'
  | 'upper_back' | 'lower_back'
  | 'hip_left' | 'hip_right'
  | 'knee_left' | 'knee_right'
  | 'ankle_left' | 'ankle_right'
  | 'foot_left' | 'foot_right'

// Gym equipment inventory
export interface GymEquipment {
  id?: number
  userId: number
  name: string
  type: 'machine' | 'free_weight' | 'cable' | 'bodyweight' | 'band' | 'other'
  isAvailable: boolean
  notes: string
}

// Exercise definition (knowledge base)
export interface Exercise {
  id?: number
  name: string
  category: 'compound' | 'isolation' | 'rehab' | 'mobility' | 'core'
  primaryMuscles: string[]
  secondaryMuscles: string[]
  equipmentNeeded: string[]
  contraindications: BodyZone[]
  alternatives: string[]
  instructions: string
  isRehab: boolean
  rehabTarget?: BodyZone
  tags: string[]
}

// Workout program template
export interface WorkoutProgram {
  id?: number
  userId: number
  name: string
  type: 'push_pull_legs' | 'upper_lower' | 'full_body' | 'bodyweight' | 'custom'
  sessions: ProgramSession[]
  isActive: boolean
  createdAt: Date
}

export type SessionIntensity = 'heavy' | 'moderate' | 'volume'

export interface ProgramSession {
  name: string
  order: number
  intensity?: SessionIntensity
  exercises: ProgramExercise[]
}

export interface ProgramExercise {
  exerciseId: number
  order: number
  sets: number
  targetReps: number
  restSeconds: number
  isRehab: boolean
  isTimeBased?: boolean // true for isometric exercises (plank, etc.) - targetReps = seconds
}

// Actual workout session (logged)
export interface WorkoutSession {
  id?: number
  userId: number
  programId: number
  sessionName: string
  startedAt: Date
  completedAt?: Date
  exercises: SessionExercise[]
  endPainChecks: PainCheck[]
  notes: string
}

export interface SessionExercise {
  exerciseId: number
  exerciseName: string
  order: number
  prescribedSets: number
  prescribedReps: number
  prescribedWeightKg: number
  sets: SessionSet[]
  status: 'pending' | 'in_progress' | 'completed' | 'skipped'
  skippedReason?: 'occupied' | 'pain' | 'no_weight' | 'time'
  instructions?: string
}

export interface SessionSet {
  setNumber: number
  prescribedReps: number
  prescribedWeightKg: number
  actualReps?: number
  actualWeightKg?: number
  repsInReserve?: number
  painReported: boolean
  painZone?: BodyZone
  restPrescribedSeconds: number
  restActualSeconds?: number
  completedAt?: Date
}

export interface PainCheck {
  zone: BodyZone
  level: number
}

// Persistent notes per exercise (sticky reminders)
export interface ExerciseNote {
  id?: number
  userId: number
  exerciseId: number
  note: string
  createdAt: Date
  updatedAt: Date
}

// --- Notebook (bloc-note) ---

export interface NotebookEntry {
  id?: number
  userId: number
  exerciseId: number
  exerciseName: string
  date: Date
  sessionIntensity: 'heavy' | 'volume' | 'moderate' | 'rehab'
  /** Donn\u00e9es saisies manuellement : chaque \u00e9l\u00e9ment = une s\u00e9rie { weightKg, reps } */
  sets: NotebookSet[]
  skipped: boolean
  skipZone?: BodyZone
}

export interface NotebookSet {
  weightKg: number
  reps: number
}

export interface PainReport {
  id?: number
  userId: number
  zone: BodyZone
  date: Date
  /** D\u00e9duit de l'exercice skipp\u00e9 */
  fromExerciseName: string
  /** Nombre de jours restants d'accentuation rehab */
  accentDaysRemaining: number
}
