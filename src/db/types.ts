// User profile from onboarding
export interface UserProfile {
  id?: number
  name: string
  height: number // cm
  weight: number // kg
  age: number
  sex: 'male' | 'female'
  goals: Goal[]
  daysPerWeek: number
  minutesPerSession: number
  createdAt: Date
  updatedAt: Date
}

export type Goal = 'weight_loss' | 'muscle_gain' | 'rehab' | 'posture' | 'mobility'

// Health conditions (per user)
export interface HealthCondition {
  id?: number
  userId: number
  bodyZone: BodyZone
  label: string // e.g. "Golf elbow", "Tendinite genou droit"
  diagnosis: string
  painLevel: number // 0-10 at onboarding
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
  | 'other'

// Gym equipment inventory
export interface GymEquipment {
  id?: number
  userId: number
  name: string
  type: 'machine' | 'free_weight' | 'cable' | 'bodyweight' | 'band' | 'other'
  isAvailable: boolean
  notes: string
}

// Available weights at the gym
export interface AvailableWeight {
  id?: number
  userId: number
  equipmentType: 'dumbbell' | 'barbell_plate' | 'machine_stack' | 'cable_stack'
  weightKg: number
  isAvailable: boolean
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
  type: 'push_pull_legs' | 'upper_lower' | 'full_body' | 'custom'
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
  painLevel?: number
  restPrescribedSeconds: number
  restActualSeconds?: number
  completedAt?: Date
}

export interface PainCheck {
  zone: BodyZone
  level: number
}

// Progression tracking per exercise
export interface ExerciseProgress {
  id?: number
  userId: number
  exerciseId: number
  exerciseName: string
  date: Date
  sessionId: number
  weightKg: number
  reps: number // average reps per set
  sets: number
  avgRepsInReserve: number // -1 if pain was reported
  avgRestSeconds: number
  exerciseOrder: number
  phase: 'hypertrophy' | 'strength' | 'deload'
  weekNumber: number
  prescribedReps?: number
  prescribedRestSeconds?: number
}

// Pain history
export interface PainLog {
  id?: number
  userId: number
  zone: BodyZone
  level: number
  context: 'during_set' | 'end_session' | 'rest_day' | 'onboarding'
  exerciseName?: string
  date: Date
}

// User training phase tracking
export interface TrainingPhase {
  id?: number
  userId: number
  phase: 'hypertrophy' | 'transition' | 'strength' | 'deload'
  startedAt: Date
  endedAt?: Date
  weekCount: number
}
