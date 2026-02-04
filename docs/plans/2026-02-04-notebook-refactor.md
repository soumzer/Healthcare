# Refonte Bloc-Note & Simplification — Plan d'implémentation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remplacer le système de progression automatique et la machine à états 9 phases par une interface bloc-note manuelle, séparer muscu et rehab, simplifier le pain tracking et le warmup/cooldown.

**Architecture:** L'app garde le générateur de programme (force/volume), le catalogue d'exercices et les protocoles de rehab. On remplace la session flow par une liste d'exercices cliquables, chacun ouvrant une page unique bloc-note (target, saisie manuelle poids/reps, chrono, historique). Le rehab passe dans un onglet séparé. Les listes de mobilité/posture générales sont supprimées — tout passe par les protocoles de santé.

**Tech Stack:** React 19 + TypeScript, Vite, Tailwind CSS 4, Dexie (IndexedDB), Recharts, PWA

---

## Vue d'ensemble des changements

### Ce qui est SUPPRIMÉ
- Moteur de progression automatique (`engine/progression.ts`)
- Machine à états 9 phases dans `useSession.ts`
- Pain feedback 4 niveaux (`engine/pain-feedback.ts`)
- Rehab injecté en warmup/cooldown/active_wait pendant les séances (`engine/rehab-integrator.ts` — usage en séance uniquement)
- Périodisation ondulée (DUP) — les sessions gardent leur intensité (heavy/volume) mais plus de calcul DUP
- Phase "weight picker" et composant `WeightPicker.tsx`
- Phase "warmup rehab" en séance et composant `WarmupRehabView.tsx`
- Collecte des poids disponibles à l'onboarding (`StepKnownWeights.tsx`)
- Collecte des objectifs à l'onboarding (`StepGoals.tsx`)
- Listes mobilité/posture générales (`data/general-routines.ts`)
- Table `AvailableWeight` dans la DB
- Table `ExerciseProgress` (remplacée par `NotebookEntry`)
- Composants session : `SetLogger.tsx`, `ActiveWait.tsx`, `WarmupView.tsx` (ancienne version)

### Ce qui est GARDÉ
- Générateur de programme (`engine/program-generator.ts`) — force/volume, splits
- Catalogue d'exercices (`data/exercises.ts`) — avec contraindications
- Protocoles de rehab (`data/rehab-protocols.ts`) — avec rotation
- Notes par exercice (`useExerciseNote.ts`, `ExerciseNote` table)
- Descriptions/instructions des exercices
- Système de rotation rehab (`utils/rehab-rotation.ts`)
- Routines jour off (`engine/rest-day.ts`)
- Onboarding : StepBody, StepHealthConditions, StepGymEquipment, StepSchedule, SymptomQuestionnaire, StepImportProgram
- Backup/export (`utils/backup.ts`)
- PWA, service worker

### Ce qui est NOUVEAU
- Page bloc-note par exercice (`ExerciseNotebook.tsx`)
- Table `NotebookEntry` en DB (poids + reps par série, par séance)
- Table `PainReport` en DB (zone + date, pour accentuer rehab)
- Chrono intégré avec son/vibration
- Warmup fixe (routine pré-séance)
- Échauffement progressif calculateur (composés lourds uniquement)
- Tableau historique par exercice avec code couleur force/volume
- Bouton "/" (skip) avec sélection de zone douleur
- Bouton "occupé" avec overlay suggestions
- Navigation 2 onglets (Muscu / Rehab)
- Cooldown adaptatif basé sur muscles travaillés
- Vidéo externe mobilité (checkbox jour off)
- Suggestion deload informationnelle
- "Mauvaise posture" comme condition de santé sélectionnable
- Conseil d'incrément affiché par exercice

---

## Task 1: Nettoyer la DB — nouveau schéma

**Files:**
- Modify: `src/db/types.ts`
- Modify: `src/db/index.ts`

**Step 1: Ajouter les nouvelles interfaces dans `types.ts`**

Ajouter après `ExerciseNote` (ligne ~202) :

```typescript
// --- Notebook (bloc-note) ---

export interface NotebookEntry {
  id?: number
  userId: number
  exerciseId: number
  exerciseName: string
  date: Date
  sessionIntensity: 'heavy' | 'volume' | 'moderate'
  /** Données saisies manuellement : chaque élément = une série { weightKg, reps } */
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
  /** Déduit de l'exercice skippé */
  fromExerciseName: string
  /** Nombre de jours restants d'accentuation rehab */
  accentDaysRemaining: number
}
```

**Step 2: Supprimer les interfaces obsolètes de `types.ts`**

Supprimer :
- `AvailableWeight` (lignes 53-59)
- `SessionSet` (lignes 132-145) — remplacé par `NotebookSet`
- `PainCheck` (lignes 147-150)
- `Goal` type et le champ `goals` de `UserProfile`

Simplifier `SessionExercise` (lignes 119-130) — cette interface reste pour la rétrocompatibilité des anciennes sessions mais ne sera plus utilisée pour les nouvelles.

Simplifier `WorkoutSession` (lignes 107-117) :
```typescript
export interface WorkoutSession {
  id?: number
  userId: number
  programId: number
  sessionName: string
  sessionIntensity: 'heavy' | 'volume' | 'moderate'
  date: Date
  completedAt?: Date
  /** IDs des NotebookEntry de cette séance */
  notebookEntryIds: number[]
  notes: string
}
```

**Step 3: Mettre à jour `db/index.ts` — version 3**

Ajouter les nouvelles tables et un upgrade path :

```typescript
// Dans la classe HealthCoachDB, ajouter :
notebookEntries!: EntityTable<NotebookEntry, 'id'>
painReports!: EntityTable<PainReport, 'id'>

// Version 3 schema :
this.version(3).stores({
  // ... tables existantes inchangées ...
  notebookEntries: '++id, userId, exerciseId, date, [userId+exerciseId], sessionIntensity',
  painReports: '++id, userId, zone, date, [userId+zone]',
  // Supprimer :
  availableWeights: null,
})
```

**Step 4: Lancer les tests DB**

Run: `cd /Users/yassine/Healthcare && npx vitest run src/db/index.test.ts`
Expected: Les tests existants peuvent casser → les adapter.

**Step 5: Commit**

```bash
git add src/db/types.ts src/db/index.ts src/db/index.test.ts
git commit -m "refactor: add NotebookEntry/PainReport tables, remove AvailableWeight"
```

---

## Task 2: Supprimer le moteur de progression et le pain feedback

**Files:**
- Delete: `src/engine/progression.ts`
- Delete: `src/engine/pain-feedback.ts`
- Delete: `src/engine/progression.test.ts`
- Delete: `src/engine/__tests__/pain-feedback.test.ts`
- Delete: `src/engine/__tests__/progression-integration.test.ts`
- Delete: `src/engine/__tests__/progression-simulation.test.ts`
- Modify: tout fichier qui importe ces modules

**Step 1: Identifier toutes les importations**

Chercher tous les imports de `progression` et `pain-feedback` :
```bash
grep -rn "from.*progression\|from.*pain-feedback" src/
```

**Step 2: Supprimer les fichiers**

Supprimer les 4 fichiers source et les 3 fichiers test.

**Step 3: Nettoyer les imports**

Dans chaque fichier qui importait ces modules, supprimer les imports et le code qui les utilisait. Principalement :
- `src/hooks/useSession.ts` — supprimer les appels à `calculateProgression()` et `applyPainFeedback()`
- `src/pages/SessionPage.tsx` — supprimer les pain adjustments (lignes 225-257)

**Step 4: Vérifier que le build passe**

Run: `cd /Users/yassine/Healthcare && npx tsc --noEmit`
Expected: Pas d'erreur TypeScript.

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor: remove automatic progression engine and pain feedback system"
```

---

## Task 3: Simplifier l'onboarding — supprimer objectifs et poids connus

**Files:**
- Delete: `src/components/onboarding/StepGoals.tsx`
- Delete: `src/components/onboarding/StepKnownWeights.tsx`
- Modify: `src/pages/OnboardingPage.tsx` — retirer steps 4 et 6, renuméroter
- Modify: `src/hooks/useOnboarding.ts` — retirer la logique goals et known weights
- Modify: `src/db/types.ts` — retirer `goals` de `UserProfile` (si pas déjà fait task 1)
- Modify: `src/pages/HomePage.tsx` — retirer les références à `goals`

**Step 1: Supprimer les composants**

Supprimer `StepGoals.tsx` et `StepKnownWeights.tsx`.

**Step 2: Mettre à jour OnboardingPage.tsx**

Nouveau flow (5 étapes au lieu de 7) :
```
1: StepBody
2: StepHealthConditions
3: StepGymEquipment
4: StepSchedule
5: SymptomQuestionnaire (ancien step 7, renommé)
```

Note : `StepImportProgram` peut rester comme option dans la page profil, pas dans l'onboarding principal.

**Step 3: Mettre à jour useOnboarding.ts**

Supprimer :
- La logique de seed des `ExerciseProgress` avec known weights (lignes 171-175 et 191-246)
- La sauvegarde des `AvailableWeight` (lignes 95-126)
- Les goals du `UserProfile`

**Step 4: Mettre à jour HomePage.tsx**

Supprimer la constante `REST_DAY_ROUTINE_GOALS` (ligne 10) et la logique qui vérifie les goals de l'utilisateur pour afficher la routine jour off. La routine jour off s'affiche si l'utilisateur a des conditions actives, point.

**Step 5: Mettre à jour les tests onboarding**

Run: `cd /Users/yassine/Healthcare && npx vitest run src/hooks/useOnboarding.test.ts`
Adapter les tests cassés.

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor: remove goals and known weights from onboarding flow"
```

---

## Task 4: Ajouter "Mauvaise posture" comme condition de santé

**Files:**
- Modify: `src/data/rehab-protocols.ts` — ajouter un protocole "Mauvaise posture générale"
- Modify: `src/components/onboarding/StepHealthConditions.tsx` — s'assurer que "Mauvaise posture" est proposable

**Step 1: Créer le protocole posture dans rehab-protocols.ts**

Ajouter un nouveau protocole :

```typescript
{
  targetZone: 'upper_back',
  conditionName: 'Mauvaise posture générale',
  frequency: 'daily',
  priority: 3,
  progressionCriteria: 'Quand les exercices sont réalisés sans difficulté et que la posture s\'améliore au quotidien, maintenir en entretien 3x/semaine.',
  exercises: [
    {
      exerciseName: 'Chin tucks (rétraction cervicale)',
      sets: 3, reps: '10-15', intensity: 'very_light',
      notes: 'Rentrer le menton en créant un "double menton"...',
      placement: 'rest_day',
    },
    {
      exerciseName: 'Wall angels (anges au mur)',
      sets: 2, reps: '10-12', intensity: 'light',
      notes: 'Dos, tête et fesses contre le mur...',
      placement: 'rest_day',
    },
    {
      exerciseName: 'Band pull-aparts (écartés avec bande)',
      sets: 3, reps: '15-20', intensity: 'light',
      notes: 'Bras tendus devant, tirer la bande élastique...',
      placement: 'rest_day',
    },
    {
      exerciseName: 'Thoracic extensions (extensions thoraciques)',
      sets: 2, reps: '10-12', intensity: 'light',
      notes: 'Sur un foam roller au niveau du haut du dos...',
      placement: 'rest_day',
    },
    {
      exerciseName: 'Doorway chest stretch (étirement pectoral)',
      sets: 2, reps: '30-45 sec', intensity: 'light',
      notes: 'Avant-bras contre le cadre d\'une porte...',
      placement: 'rest_day',
    },
  ],
}
```

**Step 2: Déplacer les exos pertinents dans les protocoles existants**

- `Thoracic spine rotation` → protocole "Posture antérieure tête et épaules" (targetZone: upper_back, ligne 174)
- `Ankle mobility circles` → protocole pieds plats (targetZone: foot_left, ligne 133) et/ou cheville

**Step 3: Supprimer `data/general-routines.ts`**

Supprimer le fichier entièrement. Mettre à jour les imports dans `engine/rest-day.ts` pour ne plus référencer `generalMobilityExercises` ni `generalPostureExercises`.

**Step 4: Mettre à jour `engine/rest-day.ts`**

Supprimer toute la section 2 ("Add general mobility/posture exercises based on goals", lignes 123-156). La routine jour off ne tire plus que des protocoles rehab.

**Step 5: Prioriser le pistolet masseur dans les notes d'exercices**

Dans `rehab-protocols.ts`, pour les exercices qui mentionnent "foam roller ou pistolet de massage", remplacer par "pistolet de massage" comme option principale (le foam roller reste en alternative).

**Step 6: Lancer les tests rest-day**

Run: `cd /Users/yassine/Healthcare && npx vitest run src/engine/rest-day.test.ts`
Adapter les tests cassés.

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add posture as health condition, move exercises into protocols, remove general routines"
```

---

## Task 5: Refondre la navigation — 2 onglets Muscu / Rehab

**Files:**
- Modify: `src/components/BottomNav.tsx`
- Modify: `src/App.tsx` — ajouter route `/rehab`
- Create: `src/pages/RehabPage.tsx` — nouvel onglet rehab (jour off)
- Modify: `src/pages/RestDayPage.tsx` → fusionner dans `RehabPage.tsx`
- Modify: `src/pages/HomePage.tsx` — simplifier, focus muscu

**Step 1: Modifier BottomNav.tsx**

Nouveau nav :
```typescript
<nav className="fixed bottom-0 ...">
  <NavLink to="/">
    <DumbbellIcon />
    <span>Muscu</span>
  </NavLink>
  <NavLink to="/rehab">
    <HeartIcon />
    <span>Rehab</span>
  </NavLink>
  <NavLink to="/dashboard">
    <ChartIcon />
    <span>Stats</span>
  </NavLink>
  <NavLink to="/profile">
    <UserIcon />
    <span>Profil</span>
  </NavLink>
</nav>
```

**Step 2: Créer RehabPage.tsx**

Cette page reprend le contenu de `RestDayPage.tsx` :
- Affiche les exos de rehab du jour (rotation, max 5, avec format bloc-note : target + cases à remplir)
- Affiche la suggestion de vidéo externe mobilité avec checkbox ("Séance externe : Lower Back & Hips — 7 min ✓")
- Rotation des vidéos externes : full body, lower back & hips, neck & shoulders, knee, ankles & feet

**Step 3: Mettre à jour App.tsx**

```typescript
<Route path="/rehab" element={<RehabPage />} />
// Supprimer : <Route path="/rest-day" ... />
```

**Step 4: Supprimer RestDayPage.tsx**

Le contenu est migré dans RehabPage.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Rehab tab in navigation, merge rest-day into rehab page"
```

---

## Task 6: Créer la page bloc-note exercice (`ExerciseNotebook.tsx`)

C'est le composant central de la refonte.

**Files:**
- Create: `src/components/session/ExerciseNotebook.tsx`
- Create: `src/hooks/useNotebook.ts`
- Create: `src/hooks/useRestTimer.ts`

**Step 1: Créer le hook `useRestTimer.ts`**

```typescript
// Gère le chrono de repos
// - countdown basé sur restSeconds (force: 180s, volume: 90s)
// - play/pause/reset
// - son + vibration quand terminé
// - tout sur la même page, pas de changement de vue

export function useRestTimer(restSeconds: number) {
  // state: remaining, isRunning
  // start() → lance le décompte
  // pause() / reset()
  // useEffect → quand remaining === 0 → vibrate + play sound
  // return { remaining, isRunning, start, pause, reset, formatTime }
}
```

**Step 2: Créer le hook `useNotebook.ts`**

```typescript
// Gère les données bloc-note pour un exercice
// - charge l'historique des NotebookEntry pour cet exercice (dernières 5 séances)
// - gère la saisie en cours (sets[]: { weightKg, reps })
// - sauvegarde dans Dexie
// - gère le skip ("/") avec sélection de zone douleur
// - charge le conseil d'incrément (compound: +2.5kg, isolation: +1.25kg)

export function useNotebook(userId: number, exerciseId: number, exerciseName: string) {
  // state: currentSets, history, isSaving
  // addSet(weightKg, reps) → ajoute une série
  // removeLastSet() → supprime la dernière série
  // saveAndNext() → sauvegarde NotebookEntry + passe à l'exo suivant
  // skipExercise(zone: BodyZone) → sauvegarde NotebookEntry avec skipped=true + crée PainReport
  // return { currentSets, history, addSet, removeLastSet, saveAndNext, skipExercise }
}
```

**Step 3: Créer `ExerciseNotebook.tsx`**

Layout de la page (tout visible en même temps, une seule page) :

```
┌─────────────────────────────────────┐
│  ← Retour         3/8 exercices     │
│                                      │
│  🔴 LEG PRESS            [VOLUME]   │
│  Target: 3 × 15 reps — repos 90s    │
│  Incrément: +2.5kg quand réussi     │
│                                      │
│  [📝 Description]  [📌 Note perso]  │
│                                      │
│  ── Échauffement (composé) ───────  │
│  Poids travail: [___] kg             │
│  → Vide × 10 | 50kg × 8 | 70kg × 5 │
│    | 85kg × 3                        │
│                                      │
│  ── Séries ───────────────────────  │
│  Série 1: [__]kg × [__]reps  ✓      │
│  Série 2: [__]kg × [__]reps  ✓      │
│  Série 3: [__]kg × [__]reps         │
│  [+ Ajouter série]                   │
│                                      │
│  ── Chrono repos ─────────────────  │
│  [  1:32  ]  ▶️ Lancer               │
│                                      │
│  ── Historique ───────────────────  │
│  S1 (vol) : 80kg×15 / 80kg×15 / ... │
│  S2 (vol) : 80kg×15 / 80kg×15 / ... │
│  S3 (force): 120kg×6 / 120kg×6 /... │
│  S4 (vol) : 82.5kg×12 / ...         │
│  [Voir plus]                         │
│                                      │
│  [/ Skip]  [Machine occupée]  [✓ OK]│
└─────────────────────────────────────┘
```

**Props de ExerciseNotebook :**
```typescript
interface ExerciseNotebookProps {
  exercise: {
    exerciseId: number
    exerciseName: string
    instructions: string
    category: 'compound' | 'isolation' | 'rehab' | 'mobility' | 'core'
    primaryMuscles: string[]
    isRehab: boolean
  }
  target: {
    sets: number
    reps: number
    restSeconds: number
    intensity: 'heavy' | 'volume' | 'moderate'
  }
  exerciseIndex: number
  totalExercises: number
  userId: number
  sessionId: number
  fillerSuggestions: FillerSuggestion[]
  onNext: () => void
  onSkip: (zone: BodyZone) => void
}
```

**Éléments clés :**
- **Code couleur** : badge force = bleu, volume = vert (ou autre paire contrastée)
- **Échauffement progressif** : affiché uniquement si `category === 'compound'` et le poids de travail est > 20kg. L'utilisateur tape son poids de travail → calcul instantané des paliers.
- **Cases de saisie** : une ligne par série. Champs : poids (kg) + reps. Le nombre de lignes = target sets, mais le bouton "+ Ajouter série" permet d'en rajouter.
- **Chrono** : décompte du temps de repos affiché en gros, avec bouton lancer/pause. Son + vibration quand fini.
- **Historique** : les 4-5 dernières `NotebookEntry` pour cet exercice, formatées "poids×reps / poids×reps / ...", avec code couleur force/volume.
- **Description** : toggle dépliant avec les instructions de l'exercice.
- **Note perso** : affichée en permanence si elle existe, bouton modifier.
- **Bouton "/"** : skip l'exercice → modal "Où as-tu eu mal ?" → liste des zones → sauvegarde PainReport.
- **Bouton "Machine occupée"** : overlay avec 2-3 suggestions d'exos légers (cooldown/rehab). Fermer → retour au bloc-note.
- **Bouton "OK"** : sauvegarde les données et passe à l'exo suivant.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: create ExerciseNotebook component with timer, history, and manual input"
```

---

## Task 7: Refondre la page de séance (`SessionPage.tsx`)

**Files:**
- Rewrite: `src/pages/SessionPage.tsx`
- Rewrite: `src/hooks/useSession.ts`
- Modify: `src/pages/HomePage.tsx`

**Step 1: Réécrire useSession.ts**

L'ancien hook de 945 lignes avec machine à états est remplacé par un hook simple :

```typescript
export function useSession(programId: number, sessionIndex: number) {
  // 1. Charge le programme et la session
  // 2. Charge les exercices du catalogue
  // 3. Vérifie les PainReports actifs → remplace les exos muscu par kiné si accentDaysRemaining > 0
  //    (remplacement 1 pour 1 : un exo muscu → un exo kiné du protocole de la zone)
  // 4. State: currentExerciseIndex, sessionStarted, sessionCompleted
  // 5. Actions: nextExercise(), skipExercise(zone), completeSession()
  // 6. Persistance sessionStorage pour reprendre si l'app est fermée
  //
  // return {
  //   session, exercises, currentExerciseIndex,
  //   nextExercise, skipExercise, completeSession,
  //   warmupRoutine, cooldownExercises, fillerSuggestions
  // }
}
```

**Step 2: Réécrire SessionPage.tsx**

Flow simplifié :

```
1. Page d'accueil séance :
   - Warmup fixe (liste des exos, pas loggé)
   - Bouton "C'est parti"

2. Liste des exercices :
   - Chaque exo est un item cliquable
   - Badge force/volume coloré
   - Statut : ◯ à faire / ✓ fait / ✗ skip
   - Tap → ouvre ExerciseNotebook

3. Quand tous les exos sont faits :
   - Cooldown (2-3 étirements affichés, pas loggé)
   - Résumé de la séance
   - Suggestion deload si > 5 semaines
```

**Step 3: Intégrer le warmup fixe**

Créer `src/data/warmup-routine.ts` :

```typescript
export const fixedWarmupRoutine = [
  { name: 'Curl supination', reps: 'x10' },
  { name: 'Curl neutre', reps: 'x10' },
  { name: 'Curl pronation', reps: 'x10' },
  { name: 'Élévation frontale supination', reps: 'x10' },
  { name: 'Élévation sur le côté', reps: 'x10' },
  { name: 'Tirage poulie coiffe des rotateurs interne', reps: 'x10' },
  { name: 'Tirage poulie coiffe des rotateurs externe', reps: 'x10' },
  { name: 'Oiseau 90°', reps: 'x10' },
  { name: 'Oiseau relevé', reps: 'x10' },
  { name: 'Rowing buste penché', reps: 'x15' },
  { name: 'Rowing coude 45°', reps: 'x15' },
  { name: 'Développé épaules coude fermé', reps: 'x10' },
  { name: 'Développé épaules coude ouvert 45°', reps: 'x10' },
  { name: 'Développé épaules coude ouvert totalement', reps: 'x10' },
  { name: 'Extension nuque', reps: 'x20' },
  { name: 'Romanian deadlift une jambe', reps: 'x10' },
  { name: 'Gobelet squat', reps: 'x20' },
]
```

**Step 4: Intégrer le cooldown adaptatif**

Créer `src/engine/cooldown.ts` :

```typescript
// Sélectionne 2-3 exos de cooldown du catalogue
// basés sur les muscles travaillés dans la séance
// Filtre : category === 'mobility' ET tags.includes('cooldown')
// ET primaryMuscles overlap avec les muscles de la séance

export function selectCooldownExercises(
  sessionMuscles: string[],
  exerciseCatalog: Exercise[],
  maxCount: number = 3,
): Exercise[]
```

**Step 5: Suggestion deload**

Dans la page de fin de séance, vérifier le nombre de semaines depuis le dernier deload (ou depuis le début) :
- Si >= 5 semaines → afficher : "Ça fait X semaines, pense à une semaine light. Réduis de ~10%."
- Si l'utilisateur a des données de dernière séance → afficher les vrais chiffres (ex: "100kg → ~90kg")

**Step 6: Machine occupée**

Le bouton "Machine occupée" dans ExerciseNotebook appelle `suggestFiller()` qui tire des exos de cooldown du catalogue (taggés `cooldown` + catégorie `mobility`) qui ne fatiguent pas les muscles du prochain exo. Le système existant dans `engine/filler.ts` est adapté pour utiliser les exos cooldown au lieu du `activeWaitPool` rehab.

**Step 7: Supprimer les anciens composants session**

Supprimer :
- `src/components/session/SetLogger.tsx`
- `src/components/session/ActiveWait.tsx`
- `src/components/session/WarmupView.tsx`
- `src/components/session/WarmupRehabView.tsx`
- `src/components/session/WeightPicker.tsx`
- `src/components/session/CooldownView.tsx`

Garder (adapté) :
- `src/components/session/RestTimer.tsx` → intégré dans ExerciseNotebook via `useRestTimer`

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: rewrite session page with notebook flow, fixed warmup, adaptive cooldown"
```

---

## Task 8: Page Rehab avec bloc-note + vidéo externe

**Files:**
- Create/Modify: `src/pages/RehabPage.tsx`
- Modify: `src/engine/rest-day.ts`

**Step 1: Mettre à jour rest-day.ts**

Supprimer les références aux `generalMobilityExercises` et `generalPostureExercises`. La routine jour off ne tire plus que des protocoles rehab.

**Step 2: Créer RehabPage.tsx**

Layout :

```
┌─────────────────────────────────────┐
│  Rehab — Jour off                    │
│                                      │
│  ── Exercices du jour ────────────  │
│  1. Nerve flossing sciatique         │
│     Target: 2×5-10 | très léger     │
│     Fait: [__] × [__]  ✓            │
│                                      │
│  2. Étirement piriforme              │
│     Target: 3×30-45s | très léger   │
│     Fait: [__] × [__]  ✓            │
│                                      │
│  ... (max 5 exos en rotation)        │
│                                      │
│  ── Séance externe mobilité ──────  │
│  ☐ Lower Back & Hips (7 min)        │
│                                      │
│  [Enregistrer]                       │
└─────────────────────────────────────┘
```

- Chaque exo rehab a : nom, target (séries × reps), notes, et des cases pour noter ce qui a été fait (format bloc-note)
- La vidéo externe tourne entre les programmes : full body, lower back & hips, neck & shoulders, knee, ankles & feet
- Simple checkbox pour marquer la vidéo comme faite

**Step 3: Sauvegarder les données rehab**

Les exos rehab sont sauvegardés dans `NotebookEntry` avec `sessionIntensity: 'rehab'` (ajouter cette valeur au type).

Mise à jour du type `sessionIntensity` :
```typescript
sessionIntensity: 'heavy' | 'volume' | 'moderate' | 'rehab'
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: create RehabPage with notebook logging and external mobility video"
```

---

## Task 9: Pain report et accentuation rehab

**Files:**
- Modify: `src/hooks/useNotebook.ts` — logique skip + PainReport
- Modify: `src/hooks/useSession.ts` — vérifier les PainReports actifs
- Modify: `src/utils/rehab-rotation.ts` — accentuation par zone

**Step 1: Logique skip dans useNotebook**

Quand l'utilisateur appuie "/" et sélectionne une zone :
1. Créer un `PainReport` avec `accentDaysRemaining: 4`
2. Sauvegarder un `NotebookEntry` avec `skipped: true` et `skipZone: zone`

**Step 2: Accentuation dans la rotation rehab**

Dans `selectRotatedExercises` ou un wrapper, avant la sélection :
1. Charger les `PainReport` actifs (`accentDaysRemaining > 0`)
2. Pour chaque zone accentuée, garantir que 2 exos du protocole de cette zone sont dans la sélection des 5 exos du jour off
3. Les 3 restants tournent normalement entre les autres conditions

**Step 3: Décrémenter les jours**

Quand une routine rehab est complétée (bouton "Enregistrer" sur RehabPage), décrémenter `accentDaysRemaining` de 1 pour tous les PainReports actifs. Si 0 → plus d'accentuation.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: pain report from skipped exercises, accent rehab for affected zones"
```

---

## Task 10: Adapter le programme generator — composés force+volume, isolation volume seul

**Files:**
- Modify: `src/engine/program-generator.ts`

**Step 1: Modifier la logique d'intensité**

Actuellement le générateur crée des sessions entières en "heavy" ou "volume". Modifier pour que dans chaque session :
- Les exercices `compound` apparaissent avec l'intensité de la session (heavy OU volume)
- Les exercices `isolation` sont toujours en `volume` (reps 12-15, repos 60-90s), même dans une session "heavy"

Modifier la fonction d'application d'intensité (lignes 309-322) :

```typescript
// Si session heavy ET exercice isolation → forcer volume params
if (intensity === 'heavy' && exercise.category === 'isolation') {
  reps = Math.max(slot.reps, 12)
  restSeconds = Math.min(slot.rest, 90)
}
```

**Step 2: Supprimer la logique DUP**

Supprimer les références à `sessionIntensity` dans le contexte DUP. Les sessions gardent leur intensité (heavy/volume) définie par le split, mais pas de calcul DUP.

**Step 3: Mettre à jour les tests**

Run: `cd /Users/yassine/Healthcare && npx vitest run src/engine/__tests__/program-generator.test.ts`
Adapter.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: compounds in force+volume, isolation always volume"
```

---

## Task 11: Son/vibration du chrono + notification

**Files:**
- Modify: `src/hooks/useRestTimer.ts`
- Create: `src/assets/timer-done.mp3` (ou utiliser Web Audio API)

**Step 1: Implémenter le son**

Deux options :
- **Web Audio API** : générer un bip simple sans fichier audio
- **Audio file** : inclure un petit mp3

Web Audio API est plus simple (pas de fichier) :

```typescript
function playTimerSound() {
  const ctx = new AudioContext()
  const oscillator = ctx.createOscillator()
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(880, ctx.currentTime) // La5
  oscillator.connect(ctx.destination)
  oscillator.start()
  oscillator.stop(ctx.currentTime + 0.3)
}
```

**Step 2: Vibration**

Le `RestTimer.tsx` actuel a déjà `navigator.vibrate?.(200)`. S'assurer que c'est aussi dans le nouveau `useRestTimer`.

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add sound and vibration to rest timer"
```

---

## Task 12: Dashboard simplifié

**Files:**
- Modify: `src/pages/DashboardPage.tsx`
- Modify: `src/hooks/useDashboardData.ts`

**Step 1: Simplifier le dashboard**

Remplacer les graphiques complexes par :

```
┌─────────────────────────────────────┐
│  Stats                               │
│                                      │
│  Cette semaine : 3 séances           │
│  Série en cours : 12 jours 🔥       │
│                                      │
│  ── Progression ──────────────────  │
│  Développé couché    80kg → 85kg  ↑  │
│  Squat               120kg = 120kg — │
│  Leg press           200kg → 190kg ↓ │
│  ...                                 │
│                                      │
│  Basé sur tes 4 dernières séances    │
└─────────────────────────────────────┘
```

- Nombre de séances cette semaine
- Streak (jours consécutifs avec au moins une séance ou rehab)
- Liste des exercices avec évolution du poids (compare dernière séance vs 4 séances avant)
- Flèche ↑ (progresse) / — (stagne) / ↓ (régresse)

**Step 2: Adapter useDashboardData.ts**

Tirer les données de `NotebookEntry` au lieu de `ExerciseProgress`.

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: simplify dashboard to streak, session count, and progression overview"
```

---

## Task 13: Supprimer les anciens composants et fichiers inutiles

**Files:**
- Delete: `src/engine/session-engine.ts` (et son test)
- Delete: `src/engine/rehab-integrator.ts` (et son test)
- Delete: `src/data/general-routines.ts`
- Delete: `src/components/session/SetLogger.tsx`
- Delete: `src/components/session/ActiveWait.tsx`
- Delete: `src/components/session/WarmupView.tsx`
- Delete: `src/components/session/WarmupRehabView.tsx`
- Delete: `src/components/session/WeightPicker.tsx`
- Delete: `src/components/session/CooldownView.tsx`
- Delete: `src/components/session/RestDayRoutine.tsx`
- Delete: `src/pages/RestDayPage.tsx`
- Delete: `src/components/onboarding/StepGoals.tsx`
- Delete: `src/components/onboarding/StepKnownWeights.tsx`
- Clean: Supprimer tous les tests orphelins référençant du code supprimé

**Step 1: Supprimer tous les fichiers listés**

**Step 2: Nettoyer les imports partout**

```bash
npx tsc --noEmit
```

Corriger toute erreur d'import restante.

**Step 3: Lancer tous les tests**

```bash
cd /Users/yassine/Healthcare && npx vitest run
```

Corriger les tests cassés, supprimer les tests obsolètes.

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove obsolete components, engines, and tests"
```

---

## Task 14: Adapter le filler (machine occupée) pour utiliser les exos cooldown

**Files:**
- Modify: `src/engine/filler.ts`

**Step 1: Modifier suggestFiller**

Au lieu de tirer du `activeWaitPool` (rehab), tirer des exos du catalogue avec :
- `category === 'mobility'` OU `tags.includes('cooldown')`
- Pas de conflit musculaire avec l'exo en cours
- La logique de conflit musculaire existante est réutilisée

```typescript
export function suggestFiller(input: {
  sessionMuscles: string[]
  completedFillers: string[]
  exerciseCatalog: Exercise[]
}): FillerSuggestion | null {
  const candidates = input.exerciseCatalog.filter(ex =>
    (ex.category === 'mobility' || ex.tags.includes('cooldown')) &&
    !input.completedFillers.includes(ex.name) &&
    !hasMuscleConflictFromPrimary(ex.primaryMuscles, input.sessionMuscles)
  )
  if (candidates.length === 0) return null
  return toMobilityFillerSuggestion(candidates[0])
}
```

**Step 2: Commit**

```bash
git add -A
git commit -m "refactor: filler suggestions use cooldown exercises instead of rehab pool"
```

---

## Task 15: Test final end-to-end et build

**Files:**
- Modify: `src/__tests__/e2e-flow.test.ts`

**Step 1: Réécrire le test E2E**

Le flow E2E suit le nouveau parcours :
1. Onboarding (5 étapes)
2. Programme généré
3. Ouvrir une séance → voir warmup fixe
4. Naviguer dans les exercices → bloc-note
5. Saisir des données manuellement
6. Skip un exo avec "/" → sélectionner zone
7. Terminer la séance → voir cooldown
8. Aller dans Rehab → voir exos jour off + vidéo externe
9. Dashboard → voir stats

**Step 2: Lancer le build**

```bash
cd /Users/yassine/Healthcare && npm run build
```

Expected: Build réussi, 0 erreur.

**Step 3: Lancer tous les tests**

```bash
cd /Users/yassine/Healthcare && npx vitest run
```

Expected: Tous les tests passent.

**Step 4: Commit final**

```bash
git add -A
git commit -m "test: rewrite e2e tests for notebook flow, verify full build"
```

---

## Ordre d'exécution recommandé

```
Task 1  → DB schema (fondation)
Task 2  → Supprimer progression/pain-feedback (nettoyage)
Task 3  → Simplifier onboarding (nettoyage)
Task 4  → Posture comme condition + fusionner exos dans protocoles
Task 13 → Supprimer anciens composants (gros nettoyage)
Task 5  → Nouvelle navigation
Task 6  → ExerciseNotebook (composant central) ⭐
Task 7  → Refondre SessionPage
Task 8  → RehabPage
Task 9  → Pain report + accentuation
Task 10 → Adapter program generator
Task 11 → Son/vibration chrono
Task 12 → Dashboard simplifié
Task 14 → Adapter filler (machine occupée)
Task 15 → Tests E2E + build final
```

Les tâches 1-4 et 13 sont du nettoyage. La tâche 6 est le coeur de la refonte. Les tâches 11-14 sont des finitions.
