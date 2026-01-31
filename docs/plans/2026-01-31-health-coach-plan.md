# Health Coach — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a mobile-first PWA that acts as a personalized fitness coach, adapting workouts in real-time based on health conditions, pain levels, gym equipment, and progressive overload tracking.

**Architecture:** Pure client-side React PWA. All logic runs in the browser — no backend server needed. Data stored in IndexedDB via Dexie.js. This keeps it truly offline, truly private, and simple to deploy (static files only). The "brain" (progression engine, rehab protocols, session adaptation) lives as TypeScript modules in the frontend.

**Tech Stack:**
- Vite + React 18 + TypeScript
- Dexie.js (IndexedDB wrapper)
- Tailwind CSS (mobile-first styling)
- Vitest + Testing Library (tests)
- Recharts (dashboard charts)
- Vite PWA plugin (service worker, manifest)

**Architecture change from design doc:** We drop Python/FastAPI/SQLite in favor of a pure frontend app. Rationale: the user is non-technical, wants privacy, and needs offline. A PWA with IndexedDB meets all requirements without needing to run a server. All progression/adaptation logic is in TypeScript modules.

---

## Task 1: Project Setup

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/index.css`
- Create: `.gitignore`

**Step 1: Initialize git repo**

```bash
cd /Users/yassine/Healthcare
git init
```

**Step 2: Scaffold Vite + React + TypeScript project**

```bash
npm create vite@latest . -- --template react-ts
```

Select: React, TypeScript. If prompted about existing files, overwrite.

**Step 3: Install dependencies**

```bash
npm install
npm install dexie dexie-react-hooks
npm install -D tailwindcss @tailwindcss/vite
npm install recharts
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

**Step 4: Configure Tailwind**

Replace `src/index.css` with:

```css
@import "tailwindcss";
```

Add Tailwind plugin to `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
  },
})
```

Create `src/test-setup.ts`:

```typescript
import '@testing-library/jest-dom'
```

**Step 5: Add test script to package.json**

In `package.json` scripts, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

**Step 6: Create minimal App to verify setup**

Replace `src/App.tsx`:

```tsx
function App() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
      <h1 className="text-2xl font-bold">Health Coach</h1>
    </div>
  )
}

export default App
```

**Step 7: Write smoke test**

Create `src/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the app title', () => {
    render(<App />)
    expect(screen.getByText('Health Coach')).toBeInTheDocument()
  })
})
```

**Step 8: Run test to verify**

```bash
npm test
```

Expected: PASS

**Step 9: Run dev server to verify visually**

```bash
npm run dev
```

Expected: Dark screen with "Health Coach" centered.

**Step 10: Commit**

```bash
git add .
git commit -m "feat: scaffold project with Vite, React, TypeScript, Tailwind, Dexie, Vitest"
```

---

## Task 2: Database Schema

**Files:**
- Create: `src/db/index.ts`
- Create: `src/db/types.ts`
- Test: `src/db/index.test.ts`

**Step 1: Define TypeScript types for all data models**

Create `src/db/types.ts`:

```typescript
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
  name: string // e.g. "Banc développé couché", "Poulie haute"
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
  isAvailable: boolean // false = user said they don't have this
}

// Exercise definition (knowledge base)
export interface Exercise {
  id?: number
  name: string
  category: 'compound' | 'isolation' | 'rehab' | 'mobility' | 'core'
  primaryMuscles: string[]
  secondaryMuscles: string[]
  equipmentNeeded: string[] // references GymEquipment names
  contraindications: BodyZone[] // don't do this if pain in these zones
  alternatives: string[] // exercise names that can replace this
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

export interface ProgramSession {
  name: string // e.g. "Push A"
  order: number
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
}

export interface SessionSet {
  setNumber: number
  prescribedReps: number
  prescribedWeightKg: number
  actualReps?: number
  actualWeightKg?: number
  repsInReserve?: number // RPE proxy: 0 = failure, 3 = easy
  painReported: boolean
  painZone?: BodyZone
  painLevel?: number // 1-5
  restPrescribedSeconds: number
  restActualSeconds?: number
  completedAt?: Date
}

export interface PainCheck {
  zone: BodyZone
  level: number // 0-5
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
  reps: number
  sets: number
  avgRepsInReserve: number
  avgRestSeconds: number
  exerciseOrder: number // position in session
  phase: 'hypertrophy' | 'strength' | 'deload'
  weekNumber: number
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
```

**Step 2: Create Dexie database**

Create `src/db/index.ts`:

```typescript
import Dexie, { type EntityTable } from 'dexie'
import type {
  UserProfile,
  HealthCondition,
  GymEquipment,
  AvailableWeight,
  Exercise,
  WorkoutProgram,
  WorkoutSession,
  ExerciseProgress,
  PainLog,
  TrainingPhase,
} from './types'

class HealthCoachDB extends Dexie {
  userProfiles!: EntityTable<UserProfile, 'id'>
  healthConditions!: EntityTable<HealthCondition, 'id'>
  gymEquipment!: EntityTable<GymEquipment, 'id'>
  availableWeights!: EntityTable<AvailableWeight, 'id'>
  exercises!: EntityTable<Exercise, 'id'>
  workoutPrograms!: EntityTable<WorkoutProgram, 'id'>
  workoutSessions!: EntityTable<WorkoutSession, 'id'>
  exerciseProgress!: EntityTable<ExerciseProgress, 'id'>
  painLogs!: EntityTable<PainLog, 'id'>
  trainingPhases!: EntityTable<TrainingPhase, 'id'>

  constructor() {
    super('HealthCoachDB')
    this.version(1).stores({
      userProfiles: '++id, name',
      healthConditions: '++id, userId, bodyZone, isActive',
      gymEquipment: '++id, userId, type, isAvailable',
      availableWeights: '++id, userId, equipmentType, weightKg',
      exercises: '++id, name, category, isRehab, *primaryMuscles, *tags',
      workoutPrograms: '++id, userId, isActive',
      workoutSessions: '++id, userId, programId, startedAt',
      exerciseProgress: '++id, userId, exerciseId, date',
      painLogs: '++id, userId, zone, date',
      trainingPhases: '++id, userId, phase',
    })
  }
}

export const db = new HealthCoachDB()
```

**Step 3: Write database tests**

Create `src/db/index.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './index'
import type { UserProfile } from './types'

// Use fake IndexedDB for testing
import 'fake-indexeddb/auto'

describe('HealthCoachDB', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('creates a user profile', async () => {
    const profile: UserProfile = {
      name: 'Test User',
      height: 196,
      weight: 112,
      age: 30,
      sex: 'male',
      goals: ['weight_loss', 'rehab'],
      daysPerWeek: 4,
      minutesPerSession: 90,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const id = await db.userProfiles.add(profile)
    const saved = await db.userProfiles.get(id)

    expect(saved).toBeDefined()
    expect(saved!.name).toBe('Test User')
    expect(saved!.height).toBe(196)
    expect(saved!.goals).toContain('weight_loss')
  })

  it('creates a health condition linked to user', async () => {
    const userId = await db.userProfiles.add({
      name: 'Test',
      height: 196,
      weight: 112,
      age: 30,
      sex: 'male',
      goals: ['rehab'],
      daysPerWeek: 4,
      minutesPerSession: 90,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await db.healthConditions.add({
      userId,
      bodyZone: 'elbow_right',
      label: 'Golf elbow',
      diagnosis: 'Épicondylite médiale',
      painLevel: 6,
      since: '1 an',
      notes: 'Douleur en poussant',
      isActive: true,
      createdAt: new Date(),
    })

    const conditions = await db.healthConditions
      .where('userId')
      .equals(userId)
      .toArray()

    expect(conditions).toHaveLength(1)
    expect(conditions[0].bodyZone).toBe('elbow_right')
    expect(conditions[0].label).toBe('Golf elbow')
  })

  it('tracks available weights', async () => {
    const userId = 1

    await db.availableWeights.bulkAdd([
      { userId, equipmentType: 'dumbbell', weightKg: 2.5, isAvailable: true },
      { userId, equipmentType: 'dumbbell', weightKg: 5, isAvailable: true },
      { userId, equipmentType: 'dumbbell', weightKg: 3, isAvailable: false },
    ])

    const available = await db.availableWeights
      .where('userId')
      .equals(userId)
      .filter(w => w.isAvailable)
      .toArray()

    expect(available).toHaveLength(2)
  })
})
```

**Step 4: Install fake-indexeddb for tests**

```bash
npm install -D fake-indexeddb
```

**Step 5: Run tests**

```bash
npm test
```

Expected: PASS (3 tests)

**Step 6: Commit**

```bash
git add .
git commit -m "feat: add database schema with Dexie.js and IndexedDB"
```

---

## Task 3: Exercise & Rehab Knowledge Base

**Files:**
- Create: `src/data/exercises.ts`
- Create: `src/data/rehab-protocols.ts`
- Create: `src/data/seed.ts`
- Test: `src/data/seed.test.ts`

**Step 1: Create exercise catalog**

Create `src/data/exercises.ts` with a comprehensive list of gym exercises. Each exercise must include:
- Name, category, muscles, equipment needed
- Contraindications (which body zones make this exercise risky)
- Alternatives
- Clear instructions

Include at minimum:
- 15-20 compound movements (squat, bench, deadlift, rows, OHP, etc.)
- 15-20 isolation movements (curls, extensions, raises, etc.)
- 10-15 rehab/mobility exercises (Tyler Twist, Spanish squat, face pulls, dead bugs, nerve flossing, etc.)
- 5-10 core exercises (planks, pallof press, bird dogs, etc.)

Structure:

```typescript
import type { Exercise } from '../db/types'

export const exerciseCatalog: Omit<Exercise, 'id'>[] = [
  {
    name: 'Développé couché — barre',
    category: 'compound',
    primaryMuscles: ['chest', 'triceps'],
    secondaryMuscles: ['front_delt'],
    equipmentNeeded: ['bench_press', 'barbell'],
    contraindications: ['elbow_right', 'elbow_left', 'shoulder_right', 'shoulder_left'],
    alternatives: ['Développé couché — haltères', 'Développé couché — machine'],
    instructions: 'Allongé sur le banc, pieds au sol. Descends la barre au niveau des pectoraux, coudes à 45°. Pousse jusqu\'en haut sans verrouiller les coudes.',
    isRehab: false,
    tags: ['push', 'chest', 'compound'],
  },
  // ... more exercises
]
```

**Important for research:** Before writing the exercise catalog, use WebSearch to research:
- Best exercises for each muscle group with scientific backing
- Golf elbow (medial epicondylitis) rehab protocols — Tyler Twist, eccentric wrist curls
- Knee tendinitis rehab — eccentric quad work, spanish squats
- Flat feet + foot arthritis exercises
- Anterior head/shoulder posture correction exercises
- Core strengthening for anterior pelvic tilt
- Sciatica nerve flossing protocols
- Lower back rehab protocols

The knowledge base must be evidence-based, not generic.

**Step 2: Create rehab protocol definitions**

Create `src/data/rehab-protocols.ts`:

```typescript
import type { BodyZone } from '../db/types'

export interface RehabProtocol {
  targetZone: BodyZone
  conditionName: string
  exercises: RehabExercise[]
  frequency: 'every_session' | 'daily' | '3x_week'
  priority: number // higher = more important
  progressionCriteria: string
}

export interface RehabExercise {
  exerciseName: string // references exercise catalog
  sets: number
  reps: number | string // e.g. "30s hold"
  intensity: 'very_light' | 'light' | 'moderate'
  notes: string
  placement: 'warmup' | 'active_wait' | 'cooldown' | 'rest_day'
}

export const rehabProtocols: RehabProtocol[] = [
  {
    targetZone: 'elbow_right',
    conditionName: 'Épicondylite médiale (golf elbow)',
    exercises: [
      {
        exerciseName: 'Wrist curls excentriques',
        sets: 3,
        reps: 15,
        intensity: 'light',
        notes: 'Descente lente (3-4s), remonter avec l\'autre main. Poids très léger (1-2kg).',
        placement: 'warmup',
      },
      {
        exerciseName: 'Tyler Twist',
        sets: 3,
        reps: 15,
        intensity: 'light',
        notes: 'Avec barre flexible (Theraband FlexBar). Torsion excentrique lente.',
        placement: 'active_wait',
      },
    ],
    frequency: 'daily',
    priority: 8,
    progressionCriteria: 'Pain level drops below 2/10 for 2 consecutive weeks',
  },
  // ... more protocols for each condition
]
```

**Step 3: Create seed function**

Create `src/data/seed.ts`:

```typescript
import { db } from '../db'
import { exerciseCatalog } from './exercises'

export async function seedExercises(): Promise<void> {
  const count = await db.exercises.count()
  if (count > 0) return // already seeded

  await db.exercises.bulkAdd(exerciseCatalog)
}
```

**Step 4: Write tests**

Create `src/data/seed.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { db } from '../db'
import { seedExercises } from './seed'
import { exerciseCatalog } from './exercises'

describe('seedExercises', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('seeds all exercises from catalog', async () => {
    await seedExercises()
    const count = await db.exercises.count()
    expect(count).toBe(exerciseCatalog.length)
  })

  it('does not duplicate on second call', async () => {
    await seedExercises()
    await seedExercises()
    const count = await db.exercises.count()
    expect(count).toBe(exerciseCatalog.length)
  })

  it('includes rehab exercises', async () => {
    await seedExercises()
    const rehab = await db.exercises.where('isRehab').equals(1).toArray()
    expect(rehab.length).toBeGreaterThan(0)
  })
})
```

**Step 5: Run tests**

```bash
npm test
```

Expected: PASS

**Step 6: Commit**

```bash
git add .
git commit -m "feat: add exercise catalog and rehab protocols knowledge base"
```

---

## Task 4: Routing & App Shell

**Files:**
- Modify: `src/App.tsx`
- Create: `src/pages/OnboardingPage.tsx`
- Create: `src/pages/HomePage.tsx`
- Create: `src/pages/SessionPage.tsx`
- Create: `src/pages/DashboardPage.tsx`
- Create: `src/components/BottomNav.tsx`
- Test: `src/App.test.tsx`

**Step 1: Install React Router**

```bash
npm install react-router-dom
```

**Step 2: Create placeholder pages**

Each page is a minimal placeholder. Create `src/pages/HomePage.tsx`:

```tsx
export default function HomePage() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">Accueil</h1>
    </div>
  )
}
```

Same pattern for `OnboardingPage.tsx`, `SessionPage.tsx`, `DashboardPage.tsx`.

**Step 3: Create bottom navigation**

Create `src/components/BottomNav.tsx`:

```tsx
import { NavLink } from 'react-router-dom'

export default function BottomNav() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center text-xs ${isActive ? 'text-white' : 'text-zinc-500'}`

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 flex justify-around py-2 pb-[env(safe-area-inset-bottom)]">
      <NavLink to="/" className={linkClass}>
        <span className="text-lg">▶</span>
        <span>Séance</span>
      </NavLink>
      <NavLink to="/dashboard" className={linkClass}>
        <span className="text-lg">◆</span>
        <span>Stats</span>
      </NavLink>
      <NavLink to="/profile" className={linkClass}>
        <span className="text-lg">●</span>
        <span>Profil</span>
      </NavLink>
    </nav>
  )
}
```

**Step 4: Wire up routing in App.tsx**

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import { seedExercises } from './data/seed'
import { useEffect } from 'react'
import BottomNav from './components/BottomNav'
import HomePage from './pages/HomePage'
import OnboardingPage from './pages/OnboardingPage'
import SessionPage from './pages/SessionPage'
import DashboardPage from './pages/DashboardPage'

function App() {
  const user = useLiveQuery(() => db.userProfiles.toCollection().first())

  useEffect(() => {
    seedExercises()
  }, [])

  // Show onboarding if no user profile exists
  if (user === undefined) return null // loading
  if (user === null) return <OnboardingPage />

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-16">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/session" element={<SessionPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <BottomNav />
    </div>
  )
}

export default function AppWrapper() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  )
}
```

**Step 5: Update App.test.tsx**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import 'fake-indexeddb/auto'
import AppWrapper from './App'

describe('App', () => {
  it('renders onboarding when no user exists', async () => {
    render(<AppWrapper />)
    // Should show onboarding since no user profile in DB
    expect(await screen.findByText(/onboarding/i)).toBeInTheDocument()
  })
})
```

**Step 6: Run tests**

```bash
npm test
```

Expected: PASS

**Step 7: Commit**

```bash
git add .
git commit -m "feat: add routing, app shell, and bottom navigation"
```

---

## Task 5: Onboarding Flow

**Files:**
- Modify: `src/pages/OnboardingPage.tsx`
- Create: `src/components/onboarding/StepBody.tsx`
- Create: `src/components/onboarding/StepHealthConditions.tsx`
- Create: `src/components/onboarding/StepGymEquipment.tsx`
- Create: `src/components/onboarding/StepGoals.tsx`
- Create: `src/components/onboarding/StepSchedule.tsx`
- Create: `src/components/onboarding/StepImportProgram.tsx`
- Create: `src/components/onboarding/BodyZonePicker.tsx`
- Create: `src/hooks/useOnboarding.ts`
- Test: `src/hooks/useOnboarding.test.ts`

**Step 1: Create onboarding state hook**

Create `src/hooks/useOnboarding.ts` — manages the multi-step form state:

```typescript
import { useState } from 'react'
import { db } from '../db'
import type { UserProfile, HealthCondition, GymEquipment, Goal } from '../db/types'

export interface OnboardingState {
  step: number
  body: { name: string; height: number; weight: number; age: number; sex: 'male' | 'female' }
  conditions: Omit<HealthCondition, 'id' | 'userId' | 'createdAt'>[]
  equipment: Omit<GymEquipment, 'id' | 'userId'>[]
  goals: Goal[]
  daysPerWeek: number
  minutesPerSession: number
}

const initialState: OnboardingState = {
  step: 1,
  body: { name: '', height: 170, weight: 70, age: 25, sex: 'male' },
  conditions: [],
  equipment: [],
  goals: [],
  daysPerWeek: 3,
  minutesPerSession: 60,
}

export function useOnboarding() {
  const [state, setState] = useState<OnboardingState>(initialState)

  const totalSteps = 6

  const nextStep = () => setState(s => ({ ...s, step: Math.min(s.step + 1, totalSteps) }))
  const prevStep = () => setState(s => ({ ...s, step: Math.max(s.step - 1, 1) }))

  const updateBody = (body: OnboardingState['body']) => setState(s => ({ ...s, body }))
  const updateConditions = (conditions: OnboardingState['conditions']) => setState(s => ({ ...s, conditions }))
  const updateEquipment = (equipment: OnboardingState['equipment']) => setState(s => ({ ...s, equipment }))
  const updateGoals = (goals: Goal[]) => setState(s => ({ ...s, goals }))
  const updateSchedule = (daysPerWeek: number, minutesPerSession: number) =>
    setState(s => ({ ...s, daysPerWeek, minutesPerSession }))

  const submit = async () => {
    const now = new Date()
    const userId = await db.userProfiles.add({
      name: state.body.name,
      height: state.body.height,
      weight: state.body.weight,
      age: state.body.age,
      sex: state.body.sex,
      goals: state.goals,
      daysPerWeek: state.daysPerWeek,
      minutesPerSession: state.minutesPerSession,
      createdAt: now,
      updatedAt: now,
    })

    if (state.conditions.length > 0) {
      await db.healthConditions.bulkAdd(
        state.conditions.map(c => ({ ...c, userId, createdAt: now }))
      )
    }

    if (state.equipment.length > 0) {
      await db.gymEquipment.bulkAdd(
        state.equipment.map(e => ({ ...e, userId }))
      )
    }

    return userId
  }

  return {
    state,
    totalSteps,
    nextStep,
    prevStep,
    updateBody,
    updateConditions,
    updateEquipment,
    updateGoals,
    updateSchedule,
    submit,
  }
}
```

**Step 2: Write test for onboarding hook**

Create `src/hooks/useOnboarding.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { useOnboarding } from './useOnboarding'
import { db } from '../db'

describe('useOnboarding', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('starts at step 1', () => {
    const { result } = renderHook(() => useOnboarding())
    expect(result.current.state.step).toBe(1)
  })

  it('navigates between steps', () => {
    const { result } = renderHook(() => useOnboarding())
    act(() => result.current.nextStep())
    expect(result.current.state.step).toBe(2)
    act(() => result.current.prevStep())
    expect(result.current.state.step).toBe(1)
    act(() => result.current.prevStep())
    expect(result.current.state.step).toBe(1) // doesn't go below 1
  })

  it('submits profile to database', async () => {
    const { result } = renderHook(() => useOnboarding())

    act(() => {
      result.current.updateBody({
        name: 'Yassine',
        height: 196,
        weight: 112,
        age: 30,
        sex: 'male',
      })
      result.current.updateGoals(['weight_loss', 'rehab'])
      result.current.updateSchedule(4, 90)
    })

    let userId: number
    await act(async () => {
      userId = await result.current.submit()
    })

    const user = await db.userProfiles.get(userId!)
    expect(user!.name).toBe('Yassine')
    expect(user!.height).toBe(196)
    expect(user!.goals).toContain('rehab')
  })
})
```

**Step 3: Run tests**

```bash
npm test
```

Expected: PASS

**Step 4: Build each onboarding step component**

Create each step component (StepBody, StepHealthConditions, StepGymEquipment, StepGoals, StepSchedule, StepImportProgram) as simple mobile-first forms using Tailwind.

Key UX notes:
- **StepHealthConditions**: Interactive body zone picker — list of zones with tap to add, then a small form per zone (diagnosis, pain level, since when)
- **StepGymEquipment**: Checklist of common machines + free weights. Ability to add custom. Weight range selector.
- **StepGoals**: Multi-select chips
- **StepSchedule**: Simple number pickers
- **StepImportProgram**: Text area to paste a program (optional, skip button)

Wire them into `OnboardingPage.tsx`:

```tsx
import { useOnboarding } from '../hooks/useOnboarding'
import StepBody from '../components/onboarding/StepBody'
import StepHealthConditions from '../components/onboarding/StepHealthConditions'
import StepGymEquipment from '../components/onboarding/StepGymEquipment'
import StepGoals from '../components/onboarding/StepGoals'
import StepSchedule from '../components/onboarding/StepSchedule'
import StepImportProgram from '../components/onboarding/StepImportProgram'

export default function OnboardingPage() {
  const onboarding = useOnboarding()
  const { state, totalSteps } = onboarding

  const steps: Record<number, JSX.Element> = {
    1: <StepBody {...onboarding} />,
    2: <StepHealthConditions {...onboarding} />,
    3: <StepGymEquipment {...onboarding} />,
    4: <StepGoals {...onboarding} />,
    5: <StepSchedule {...onboarding} />,
    6: <StepImportProgram {...onboarding} />,
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4">
      <div className="text-sm text-zinc-500 mb-4">
        Étape {state.step} / {totalSteps}
      </div>
      <div className="w-full bg-zinc-800 rounded-full h-1 mb-6">
        <div
          className="bg-white h-1 rounded-full transition-all"
          style={{ width: `${(state.step / totalSteps) * 100}%` }}
        />
      </div>
      {steps[state.step]}
    </div>
  )
}
```

**Step 5: Run tests and verify**

```bash
npm test
```

Expected: PASS

**Step 6: Commit**

```bash
git add .
git commit -m "feat: add multi-step onboarding flow with body, health, gym, goals, schedule"
```

---

## Task 6: Session Engine (Core Logic)

**Files:**
- Create: `src/engine/session-engine.ts`
- Create: `src/engine/warmup.ts`
- Create: `src/engine/filler.ts`
- Test: `src/engine/session-engine.test.ts`
- Test: `src/engine/warmup.test.ts`

This is the brain of the app. It decides what exercise comes next, what weight/reps to prescribe, and how to adapt.

**Step 1: Write failing test for session engine**

Create `src/engine/session-engine.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { SessionEngine } from './session-engine'
import type { ProgramSession, SessionExercise } from '../db/types'

describe('SessionEngine', () => {
  const mockProgramSession: ProgramSession = {
    name: 'Push A',
    order: 1,
    exercises: [
      { exerciseId: 1, order: 1, sets: 4, targetReps: 8, restSeconds: 120, isRehab: false },
      { exerciseId: 2, order: 2, sets: 3, targetReps: 12, restSeconds: 90, isRehab: false },
      { exerciseId: 3, order: 3, sets: 3, targetReps: 15, restSeconds: 60, isRehab: true },
    ],
  }

  it('returns first exercise when session starts', () => {
    const engine = new SessionEngine(mockProgramSession, {})
    const current = engine.getCurrentExercise()
    expect(current.exerciseId).toBe(1)
    expect(current.prescribedSets).toBe(4)
  })

  it('advances to next exercise when current is completed', () => {
    const engine = new SessionEngine(mockProgramSession, {})
    engine.completeExercise()
    const current = engine.getCurrentExercise()
    expect(current.exerciseId).toBe(2)
  })

  it('returns session complete when all exercises done', () => {
    const engine = new SessionEngine(mockProgramSession, {})
    engine.completeExercise()
    engine.completeExercise()
    engine.completeExercise()
    expect(engine.isSessionComplete()).toBe(true)
  })

  it('marks exercise as occupied without changing order', () => {
    const engine = new SessionEngine(mockProgramSession, {})
    engine.markOccupied()
    // Should still be on exercise 1 — waiting
    expect(engine.getCurrentExercise().exerciseId).toBe(1)
    expect(engine.isWaitingForMachine()).toBe(true)
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL — SessionEngine not defined

**Step 3: Implement SessionEngine**

Create `src/engine/session-engine.ts`:

```typescript
import type { ProgramSession, SessionExercise, SessionSet } from '../db/types'

export interface ExerciseHistory {
  [exerciseId: number]: {
    lastWeightKg: number
    lastReps: number[]
    lastAvgRIR: number
  }
}

export class SessionEngine {
  private exercises: SessionExercise[]
  private currentIndex: number = 0
  private occupied: boolean = false
  private history: ExerciseHistory

  constructor(programSession: ProgramSession, history: ExerciseHistory) {
    this.history = history
    this.exercises = programSession.exercises.map((pe) => ({
      exerciseId: pe.exerciseId,
      exerciseName: '', // filled by caller
      order: pe.order,
      prescribedSets: pe.sets,
      prescribedReps: pe.targetReps,
      prescribedWeightKg: this.calculatePrescribedWeight(pe.exerciseId, pe.targetReps),
      sets: [],
      status: 'pending',
    }))
  }

  private calculatePrescribedWeight(exerciseId: number, targetReps: number): number {
    const prev = this.history[exerciseId]
    if (!prev) return 0 // new exercise, user will input

    const allRepsHit = prev.lastReps.every(r => r >= targetReps)
    const easyEnough = prev.lastAvgRIR >= 2

    if (allRepsHit && easyEnough) {
      return prev.lastWeightKg + 2.5 // progress
    }
    return prev.lastWeightKg // maintain
  }

  getCurrentExercise(): SessionExercise {
    return this.exercises[this.currentIndex]
  }

  getCurrentSetNumber(): number {
    const ex = this.exercises[this.currentIndex]
    return ex.sets.length + 1
  }

  completeExercise(): void {
    this.exercises[this.currentIndex].status = 'completed'
    this.currentIndex++
    this.occupied = false
  }

  markOccupied(): void {
    this.occupied = true
  }

  markMachineFree(): void {
    this.occupied = false
  }

  isWaitingForMachine(): boolean {
    return this.occupied
  }

  isSessionComplete(): boolean {
    return this.currentIndex >= this.exercises.length
  }

  logSet(set: SessionSet): void {
    this.exercises[this.currentIndex].sets.push(set)
    if (this.exercises[this.currentIndex].sets.length >= this.exercises[this.currentIndex].prescribedSets) {
      this.exercises[this.currentIndex].status = 'completed'
    }
  }

  getAllExercises(): SessionExercise[] {
    return this.exercises
  }
}
```

**Step 4: Run tests**

```bash
npm test
```

Expected: PASS

**Step 5: Write warmup generator**

Create `src/engine/warmup.ts`:

```typescript
export interface WarmupSet {
  weightKg: number
  reps: number
  label: string
}

export function generateWarmupSets(workingWeightKg: number): WarmupSet[] {
  if (workingWeightKg <= 20) {
    return [{ weightKg: 0, reps: 15, label: 'Barre à vide / sans poids' }]
  }

  return [
    { weightKg: 0, reps: 10, label: 'Barre à vide' },
    { weightKg: Math.round(workingWeightKg * 0.5), reps: 8, label: '50%' },
    { weightKg: Math.round(workingWeightKg * 0.7), reps: 5, label: '70%' },
    { weightKg: Math.round(workingWeightKg * 0.85), reps: 3, label: '85%' },
  ]
}
```

Create `src/engine/warmup.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { generateWarmupSets } from './warmup'

describe('generateWarmupSets', () => {
  it('generates progressive warmup sets', () => {
    const sets = generateWarmupSets(80)
    expect(sets).toHaveLength(4)
    expect(sets[0].weightKg).toBe(0)
    expect(sets[1].weightKg).toBe(40)
    expect(sets[2].weightKg).toBe(56)
    expect(sets[3].weightKg).toBe(68)
  })

  it('returns single light set for low working weight', () => {
    const sets = generateWarmupSets(10)
    expect(sets).toHaveLength(1)
  })
})
```

**Step 6: Write filler exercise selector**

Create `src/engine/filler.ts`:

```typescript
import type { BodyZone, Exercise } from '../db/types'
import type { RehabProtocol } from '../data/rehab-protocols'

/**
 * Selects filler exercises (rehab/mobility) that do NOT fatigue
 * the muscles needed for the upcoming exercise.
 */
export function selectFillerExercises(
  upcomingPrimaryMuscles: string[],
  userConditions: BodyZone[],
  rehabProtocols: RehabProtocol[],
  availableExercises: Exercise[]
): Exercise[] {
  // Get rehab exercises that target user's conditions
  const rehabExercises = availableExercises.filter(ex =>
    ex.isRehab &&
    ex.rehabTarget &&
    userConditions.includes(ex.rehabTarget) &&
    // Don't fatigue muscles needed for the next main exercise
    !ex.primaryMuscles.some(m => upcomingPrimaryMuscles.includes(m))
  )

  // Sort by protocol priority
  return rehabExercises.slice(0, 2) // max 2 filler exercises
}
```

**Step 7: Run all tests**

```bash
npm test
```

Expected: PASS

**Step 8: Commit**

```bash
git add .
git commit -m "feat: add session engine, warmup generator, and filler exercise selector"
```

---

## Task 7: Progression Engine

**Files:**
- Create: `src/engine/progression.ts`
- Test: `src/engine/progression.test.ts`

**Step 1: Write failing tests for progression logic**

Create `src/engine/progression.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { calculateProgression, shouldDeload, getPhaseRecommendation } from './progression'

describe('calculateProgression', () => {
  it('increases weight when all sets completed with sufficient RIR', () => {
    const result = calculateProgression({
      prescribedWeightKg: 40,
      prescribedReps: 8,
      prescribedSets: 4,
      actualReps: [8, 8, 8, 8],
      avgRIR: 2,
      avgRestSeconds: 120,
      prescribedRestSeconds: 120,
      availableWeights: [37.5, 40, 42.5, 45],
      phase: 'hypertrophy',
    })
    expect(result.nextWeightKg).toBe(42.5)
    expect(result.nextReps).toBe(8)
  })

  it('keeps same weight when sets partially completed', () => {
    const result = calculateProgression({
      prescribedWeightKg: 40,
      prescribedReps: 8,
      prescribedSets: 4,
      actualReps: [8, 8, 7, 6],
      avgRIR: 1,
      avgRestSeconds: 120,
      prescribedRestSeconds: 120,
      availableWeights: [37.5, 40, 42.5, 45],
      phase: 'hypertrophy',
    })
    expect(result.nextWeightKg).toBe(40)
    expect(result.nextReps).toBe(8)
  })

  it('increases reps when next weight not available', () => {
    const result = calculateProgression({
      prescribedWeightKg: 40,
      prescribedReps: 8,
      prescribedSets: 4,
      actualReps: [8, 8, 8, 8],
      avgRIR: 2,
      avgRestSeconds: 120,
      prescribedRestSeconds: 120,
      availableWeights: [37.5, 40, 45], // no 42.5
      phase: 'hypertrophy',
    })
    expect(result.nextWeightKg).toBe(40)
    expect(result.nextReps).toBe(9) // increase reps instead
  })

  it('does not progress when rest was much longer than prescribed', () => {
    const result = calculateProgression({
      prescribedWeightKg: 40,
      prescribedReps: 8,
      prescribedSets: 4,
      actualReps: [8, 8, 8, 8],
      avgRIR: 2,
      avgRestSeconds: 300, // 5min instead of 2min
      prescribedRestSeconds: 120,
      availableWeights: [37.5, 40, 42.5],
      phase: 'hypertrophy',
    })
    expect(result.nextWeightKg).toBe(40) // no progression
  })

  it('decreases weight after consistent regression', () => {
    const result = calculateProgression({
      prescribedWeightKg: 40,
      prescribedReps: 8,
      prescribedSets: 4,
      actualReps: [6, 5, 5, 4],
      avgRIR: 0,
      avgRestSeconds: 120,
      prescribedRestSeconds: 120,
      availableWeights: [35, 37.5, 40, 42.5],
      phase: 'hypertrophy',
    })
    expect(result.nextWeightKg).toBe(37.5)
  })
})

describe('shouldDeload', () => {
  it('returns true after 5 weeks of progression', () => {
    expect(shouldDeload(5)).toBe(true)
  })

  it('returns false during first 4 weeks', () => {
    expect(shouldDeload(3)).toBe(false)
  })
})

describe('getPhaseRecommendation', () => {
  it('stays in hypertrophy when pain is still high', () => {
    const phase = getPhaseRecommendation({
      currentPhase: 'hypertrophy',
      weeksInPhase: 8,
      avgPainLevel: 4,
      progressionConsistency: 0.8,
    })
    expect(phase).toBe('hypertrophy')
  })

  it('transitions to strength when pain is low and progression stable', () => {
    const phase = getPhaseRecommendation({
      currentPhase: 'hypertrophy',
      weeksInPhase: 8,
      avgPainLevel: 1,
      progressionConsistency: 0.8,
    })
    expect(phase).toBe('transition')
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: FAIL

**Step 3: Implement progression engine**

Create `src/engine/progression.ts`:

```typescript
export interface ProgressionInput {
  prescribedWeightKg: number
  prescribedReps: number
  prescribedSets: number
  actualReps: number[]
  avgRIR: number
  avgRestSeconds: number
  prescribedRestSeconds: number
  availableWeights: number[]
  phase: 'hypertrophy' | 'strength' | 'deload'
}

export interface ProgressionResult {
  nextWeightKg: number
  nextReps: number
  action: 'increase_weight' | 'increase_reps' | 'maintain' | 'decrease'
  reason: string
}

export function calculateProgression(input: ProgressionInput): ProgressionResult {
  const {
    prescribedWeightKg, prescribedReps, prescribedSets,
    actualReps, avgRIR, avgRestSeconds, prescribedRestSeconds,
    availableWeights, phase,
  } = input

  // Check if rest was inflated (>50% longer than prescribed)
  const restInflated = avgRestSeconds > prescribedRestSeconds * 1.5

  // Check if all sets completed
  const allSetsCompleted = actualReps.every(r => r >= prescribedReps)

  // Check for regression (>25% reps lost across sets)
  const totalPrescribed = prescribedSets * prescribedReps
  const totalActual = actualReps.reduce((a, b) => a + b, 0)
  const repDeficit = 1 - totalActual / totalPrescribed
  const regressed = repDeficit > 0.25

  if (regressed) {
    const lowerWeight = availableWeights
      .filter(w => w < prescribedWeightKg)
      .sort((a, b) => b - a)[0]
    return {
      nextWeightKg: lowerWeight ?? prescribedWeightKg,
      nextReps: prescribedReps,
      action: 'decrease',
      reason: 'Régression significative — on baisse la charge pour relancer',
    }
  }

  if (!allSetsCompleted || avgRIR < 1) {
    return {
      nextWeightKg: prescribedWeightKg,
      nextReps: prescribedReps,
      action: 'maintain',
      reason: 'Séries incomplètes ou effort maximal — on maintient pour consolider',
    }
  }

  if (restInflated) {
    return {
      nextWeightKg: prescribedWeightKg,
      nextReps: prescribedReps,
      action: 'maintain',
      reason: 'Repos plus long que prévu — performance non comparable, on maintient',
    }
  }

  // Ready to progress
  const increment = phase === 'strength' ? 2.5 : 2.5
  const targetWeight = prescribedWeightKg + increment
  const nextWeightAvailable = availableWeights
    .filter(w => w > prescribedWeightKg)
    .sort((a, b) => a - b)[0]

  if (nextWeightAvailable && nextWeightAvailable <= targetWeight + 1) {
    return {
      nextWeightKg: nextWeightAvailable,
      nextReps: prescribedReps,
      action: 'increase_weight',
      reason: `Progression — on passe à ${nextWeightAvailable}kg`,
    }
  }

  // No weight available, increase reps
  const maxReps = phase === 'hypertrophy' ? 15 : 8
  if (prescribedReps < maxReps) {
    return {
      nextWeightKg: prescribedWeightKg,
      nextReps: prescribedReps + 1,
      action: 'increase_reps',
      reason: 'Poids suivant non disponible — on ajoute une rep',
    }
  }

  return {
    nextWeightKg: prescribedWeightKg,
    nextReps: prescribedReps,
    action: 'maintain',
    reason: 'Plafond de reps atteint — progression bloquée sans poids supplémentaire',
  }
}

export function shouldDeload(weeksSinceLastDeload: number): boolean {
  return weeksSinceLastDeload >= 5
}

export interface PhaseInput {
  currentPhase: 'hypertrophy' | 'transition' | 'strength'
  weeksInPhase: number
  avgPainLevel: number // 0-10
  progressionConsistency: number // 0-1 (% of sessions where user progressed)
}

export function getPhaseRecommendation(input: PhaseInput): string {
  const { currentPhase, weeksInPhase, avgPainLevel, progressionConsistency } = input

  // Don't transition if pain is still significant
  if (avgPainLevel > 2) return currentPhase

  if (currentPhase === 'hypertrophy' && weeksInPhase >= 6 && progressionConsistency >= 0.7) {
    return 'transition'
  }

  if (currentPhase === 'transition' && weeksInPhase >= 4 && progressionConsistency >= 0.7) {
    return 'strength'
  }

  return currentPhase
}
```

**Step 4: Run tests**

```bash
npm test
```

Expected: PASS

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add progression engine with double progression, deload, and phase management"
```

---

## Task 8: Workout Session Screen

**Files:**
- Modify: `src/pages/SessionPage.tsx`
- Create: `src/components/session/ExerciseView.tsx`
- Create: `src/components/session/SetLogger.tsx`
- Create: `src/components/session/RestTimer.tsx`
- Create: `src/components/session/ActiveWait.tsx`
- Create: `src/components/session/WeightPicker.tsx`
- Create: `src/components/session/WarmupView.tsx`
- Create: `src/components/session/EndSessionPainCheck.tsx`
- Create: `src/hooks/useSession.ts`
- Test: `src/hooks/useSession.test.ts`

This is the main workout screen. Build each sub-component:

**Step 1: Create useSession hook**

`src/hooks/useSession.ts` — orchestrates the entire workout session state. Manages:
- Current exercise / current set
- Transitions between: warmup → working sets → rest → next set → next exercise
- Occupied flow (active wait)
- Weight unavailable flow
- Pain logging per set
- End of session pain check
- Saving to database

**Step 2: Write tests for useSession**

Test key flows:
- Start session → shows first exercise warmup
- Complete warmup → shows first working set
- Log a set → starts rest timer
- Rest complete → shows next set
- Mark occupied → shows filler exercises
- Mark machine free → returns to exercise
- Weight unavailable → shows weight picker → adjusts reps
- Complete all exercises → shows end-session pain check
- Submit pain check → saves session to DB

**Step 3: Build ExerciseView component**

The main display:
```
Développé couché — prise neutre
2/4 · 40kg × 8

[ Fait ]  [ Occupé ]  [ Pas ce poids ]
```

**Step 4: Build SetLogger component**

After tapping "Fait":
```
Reps réussies : [ 8 ]
En réserve :    [ 2 ]
Douleur ?       [ Non ]
```

If douleur = oui → show zone selector + level (1-5).

**Step 5: Build RestTimer component**

```
Repos
1:32 / 2:00
Série suivante : 3/4 · 40kg × 8
[ Go ]
```

Tracks real rest time. Go button appears when timer finishes.

**Step 6: Build ActiveWait component**

When occupied:
```
Machine occupée — en attendant :
→ Tyler Twist (rehab coude)     [2 min]
→ Gainage latéral                [2 min]
[ Machine libre ]
```

Uses `selectFillerExercises()` from engine/filler.ts.

**Step 7: Build WeightPicker component**

```
Pas ce poids — qu'est-ce que tu as ?
[ 2.5 ] [ 5 ] [ 7.5 ] [ Autre: __ ]
```

Saves unavailable weight to DB. Recalculates reps.

**Step 8: Build WarmupView component**

```
Échauffement — Développé couché
1/4 · Barre à vide × 10
[ Fait ]  [ Passer ]
```

Uses `generateWarmupSets()`.

**Step 9: Build EndSessionPainCheck component**

```
Séance terminée ✓
· Coude droit :  [0] [1] [2] [3] [4] [5]
· Genou droit :  [0] [1] [2] [3] [4] [5]
· Lombaires :    [0] [1] [2] [3] [4] [5]
[ Terminer ]
```

Only shows zones from user's active health conditions.

**Step 10: Wire everything into SessionPage.tsx**

State machine flow:
```
warmup → exercise_view → (set_logger | occupied | no_weight) → rest_timer → exercise_view → ... → end_pain_check → save
```

**Step 11: Run all tests**

```bash
npm test
```

Expected: PASS

**Step 12: Commit**

```bash
git add .
git commit -m "feat: add workout session screen with full exercise flow, timer, pain tracking"
```

---

## Task 9: Home Page & Session Launcher

**Files:**
- Modify: `src/pages/HomePage.tsx`
- Create: `src/hooks/useNextSession.ts`
- Test: `src/hooks/useNextSession.test.ts`

**Step 1: Create useNextSession hook**

Determines what to show on the home page:
- Which session is next (A, B, C based on last completed)
- Whether enough rest since last session
- Rest day routine if too soon for a workout
- Preview of upcoming exercises

**Step 2: Write tests**

```typescript
describe('useNextSession', () => {
  it('returns session B after session A was last', () => { ... })
  it('recommends rest if last session was less than 24h ago', () => { ... })
  it('returns session A if no sessions logged yet', () => { ... })
})
```

**Step 3: Build HomePage**

When ready for a session:
```
Prochaine séance : Push A
4 exercices · ~60 min
[ Commencer ]
```

When rest recommended:
```
Repos recommandé
Dernière séance : hier, 18h30

Routine du jour (optionnel) :
→ Mobilité épaules
→ Excentriques coude
→ Étirements (programme externe)
[ Faire la routine ]  [ Passer ]
```

**Step 4: Run tests, commit**

```bash
npm test && git add . && git commit -m "feat: add home page with session launcher and rest day detection"
```

---

## Task 10: Dashboard

**Files:**
- Modify: `src/pages/DashboardPage.tsx`
- Create: `src/components/dashboard/ProgressionChart.tsx`
- Create: `src/components/dashboard/PainChart.tsx`
- Create: `src/components/dashboard/SessionHistory.tsx`
- Create: `src/components/dashboard/AttendanceTracker.tsx`
- Create: `src/hooks/useDashboardData.ts`
- Test: `src/hooks/useDashboardData.test.ts`

**Step 1: Create useDashboardData hook**

Queries DB for:
- Exercise progression over time (weight/reps per exercise, grouped by week)
- Pain levels over time per zone
- Session history (last 20 sessions)
- Attendance (sessions per week vs target)

**Step 2: Write tests for data aggregation**

**Step 3: Build ProgressionChart**

Line chart (Recharts) showing weight over time for selected exercise. Simple select dropdown to pick the exercise.

**Step 4: Build PainChart**

Line chart showing pain level per zone over weeks. Color-coded by zone.

**Step 5: Build SessionHistory**

List of past sessions with summary (date, session name, exercises count, duration).

**Step 6: Build AttendanceTracker**

Simple visual: "Cette semaine : 3/4 séances" with a bar or dots.

**Step 7: Wire into DashboardPage**

Scrollable page with sections stacked vertically. Minimal, clean.

**Step 8: Run tests, commit**

```bash
npm test && git add . && git commit -m "feat: add dashboard with progression, pain, history, and attendance charts"
```

---

## Task 11: Data Export/Import

**Files:**
- Create: `src/utils/backup.ts`
- Create: `src/components/settings/BackupSection.tsx`
- Test: `src/utils/backup.test.ts`

**Step 1: Write failing tests**

```typescript
describe('backup', () => {
  it('exports all user data as JSON', async () => {
    // Seed DB with test data
    const json = await exportData(userId)
    const parsed = JSON.parse(json)
    expect(parsed.profile).toBeDefined()
    expect(parsed.conditions).toHaveLength(2)
    expect(parsed.sessions).toHaveLength(1)
  })

  it('imports data from JSON', async () => {
    const json = '...' // valid backup
    await importData(json)
    const user = await db.userProfiles.toCollection().first()
    expect(user).toBeDefined()
  })
})
```

**Step 2: Implement export/import**

`src/utils/backup.ts`:

```typescript
export async function exportData(userId: number): Promise<string> {
  const profile = await db.userProfiles.get(userId)
  const conditions = await db.healthConditions.where('userId').equals(userId).toArray()
  const equipment = await db.gymEquipment.where('userId').equals(userId).toArray()
  const weights = await db.availableWeights.where('userId').equals(userId).toArray()
  const programs = await db.workoutPrograms.where('userId').equals(userId).toArray()
  const sessions = await db.workoutSessions.where('userId').equals(userId).toArray()
  const progress = await db.exerciseProgress.where('userId').equals(userId).toArray()
  const painLogs = await db.painLogs.where('userId').equals(userId).toArray()
  const phases = await db.trainingPhases.where('userId').equals(userId).toArray()

  return JSON.stringify({
    version: 1,
    exportedAt: new Date().toISOString(),
    profile,
    conditions,
    equipment,
    weights,
    programs,
    sessions,
    progress,
    painLogs,
    phases,
  }, null, 2)
}

export async function importData(json: string): Promise<void> {
  const data = JSON.parse(json)
  // Clear existing data, then insert
  await db.transaction('rw',
    db.userProfiles, db.healthConditions, db.gymEquipment,
    db.availableWeights, db.workoutPrograms, db.workoutSessions,
    db.exerciseProgress, db.painLogs, db.trainingPhases,
    async () => {
      await db.userProfiles.clear()
      // ... clear all tables and re-insert from data
      await db.userProfiles.add(data.profile)
      await db.healthConditions.bulkAdd(data.conditions)
      // ... etc
    }
  )
}
```

**Step 3: Build BackupSection component**

Two buttons: "Exporter" (downloads JSON file) and "Importer" (file picker).

**Step 4: Run tests, commit**

```bash
npm test && git add . && git commit -m "feat: add data export/import for backup"
```

---

## Task 12: PWA Configuration

**Files:**
- Create: `public/manifest.json`
- Modify: `vite.config.ts`
- Modify: `index.html`
- Create: `public/icons/` (app icons)

**Step 1: Install Vite PWA plugin**

```bash
npm install -D vite-plugin-pwa
```

**Step 2: Configure PWA in vite.config.ts**

Add VitePWA plugin with:
- App name: "Health Coach"
- Theme: dark (#09090b = zinc-950)
- Display: standalone (no Safari chrome)
- Service worker: cache all assets for offline
- Manifest with icons

**Step 3: Create manifest.json**

```json
{
  "name": "Health Coach",
  "short_name": "Coach",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#09090b",
  "theme_color": "#09090b",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**Step 4: Add meta tags to index.html**

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#09090b">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="apple-touch-icon" href="/icons/icon-192.png">
```

**Step 5: Generate simple app icons**

Create minimal icons (can be placeholder squares for now).

**Step 6: Build and test PWA**

```bash
npm run build
npx serve dist
```

Open in Safari, verify "Add to Home Screen" works.

**Step 7: Commit**

```bash
git add .
git commit -m "feat: configure PWA with manifest, service worker, and offline support"
```

---

## Task 13: Rest Day Routines

**Files:**
- Create: `src/engine/rest-day.ts`
- Create: `src/components/session/RestDayRoutine.tsx`
- Test: `src/engine/rest-day.test.ts`

**Step 1: Write rest day routine generator**

Based on user's active health conditions, generates a short routine:
- Rehab exercises for active conditions
- Mobility work
- "Étirements (programme externe)" checkbox

**Step 2: Write tests**

```typescript
describe('generateRestDayRoutine', () => {
  it('includes rehab exercises for active conditions', () => { ... })
  it('includes external stretching checkbox', () => { ... })
  it('limits routine to 20 minutes', () => { ... })
})
```

**Step 3: Build RestDayRoutine component**

Simple checklist interface. Each exercise has a checkbox. "Programme externe" has a single Fait/Pas fait toggle.

**Step 4: Save completion to DB for attendance tracking**

**Step 5: Run tests, commit**

```bash
npm test && git add . && git commit -m "feat: add rest day rehab routines"
```

---

## Summary

| Task | Description | Dependencies |
|------|-------------|-------------|
| 1 | Project setup | None |
| 2 | Database schema | Task 1 |
| 3 | Exercise & rehab knowledge base | Task 2 |
| 4 | Routing & app shell | Task 1 |
| 5 | Onboarding flow | Tasks 2, 4 |
| 6 | Session engine (core logic) | Task 2 |
| 7 | Progression engine | Task 6 |
| 8 | Workout session screen | Tasks 3, 6, 7 |
| 9 | Home page & session launcher | Tasks 5, 6 |
| 10 | Dashboard | Tasks 2, 8 |
| 11 | Data export/import | Task 2 |
| 12 | PWA configuration | Task 1 |
| 13 | Rest day routines | Tasks 3, 6 |
