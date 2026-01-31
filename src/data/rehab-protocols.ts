import type { BodyZone } from '../db/types'

/**
 * Protocoles de rééducation basés sur les preuves scientifiques.
 *
 * Chaque protocole cible une condition spécifique et inclut :
 * - Les exercices prescrits avec sets/reps/intensité
 * - La fréquence recommandée
 * - La priorité (pour l'ordonnancement dans la séance)
 * - Les critères de progression
 *
 * Références principales :
 * - Tyler et al. (2014) — Reverse Tyler Twist pour épicondylite médiale
 * - Rio et al. (2015) — Isométriques pour tendinopathie rotulienne
 * - Hara et al. (2023) — Short foot exercises pour pieds plats
 * - Cleland et al. (2006) — Chin tucks et mobilisation cervicale
 */

export interface RehabProtocol {
  targetZone: BodyZone
  conditionName: string
  exercises: RehabExercise[]
  frequency: 'every_session' | 'daily' | '3x_week'
  priority: number
  progressionCriteria: string
}

export interface RehabExercise {
  exerciseName: string
  sets: number
  reps: number | string
  intensity: 'very_light' | 'light' | 'moderate'
  notes: string
  placement: 'warmup' | 'active_wait' | 'cooldown' | 'rest_day'
}

export const rehabProtocols: RehabProtocol[] = [
  // =========================================================================
  // 1. GOLF ELBOW (Épicondylite médiale)
  // =========================================================================
  {
    targetZone: 'elbow_right',
    conditionName: 'Épicondylite médiale (golf elbow)',
    frequency: 'daily',
    priority: 1,
    progressionCriteria:
      'Quand 3x15 répétitions sont indolores pendant 2 semaines consécutives, augmenter la résistance de la FlexBar (changer de couleur) ou ajouter 0.5-1 kg au curl excentrique. Objectif : 0 douleur sur les mouvements de poussée et de préhension.',
    exercises: [
      {
        exerciseName: 'Tyler Twist inversé (golf elbow)',
        sets: 3,
        reps: 15,
        intensity: 'light',
        notes:
          'Phase excentrique de 4-5 secondes. Utiliser la FlexBar. Protocole Tyler et al. (2014) : amélioration de 77% du score DASH en 6 semaines. Progression de résistance toutes les 3 semaines. Faire 2x/jour les jours sans entraînement.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Curl poignet excentrique (golf elbow)',
        sets: 3,
        reps: 15,
        intensity: 'very_light',
        notes:
          'Phase excentrique de 5 secondes, concentrique assistée par l\'autre main. Commencer avec 1-2 kg. Ne pas augmenter la charge tant que 3x15 n\'est pas indolore. Alternative si pas de FlexBar disponible.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Étirement fléchisseurs du poignet',
        sets: 3,
        reps: '30 sec',
        intensity: 'very_light',
        notes:
          'Étirement doux, ne jamais forcer en douleur. Faire avant et après les exercices excentriques et avant toute séance impliquant les bras. Peut être fait plusieurs fois par jour.',
        placement: 'warmup',
      },
    ],
  },

  // =========================================================================
  // 2. KNEE TENDINITIS (Tendinite rotulienne)
  // =========================================================================
  {
    targetZone: 'knee_right',
    conditionName: 'Tendinopathie rotulienne',
    frequency: 'every_session',
    priority: 2,
    progressionCriteria:
      'Phase 1 (isométrique) : quand la douleur est < 3/10 au Spanish squat pendant 2 semaines. Phase 2 (isotonique) : progresser du leg extension tempo lent vers le Spanish squat isotonique (3x10 reps). Phase 3 : réintroduire progressivement les squats classiques avec charges légères.',
    exercises: [
      {
        exerciseName: 'Spanish squat isométrique (tendinite rotulienne)',
        sets: 5,
        reps: '45 sec',
        intensity: 'moderate',
        notes:
          'Basé sur Rio et al. (2015) : les isométriques à 70% d\'effort réduisent la douleur tendineuse immédiatement et augmentent la force de 18.7%. Tenir 45 secondes à 70-90° de flexion, 2 minutes de repos entre les séries. Faire avant la séance comme analgésique. Peut être fait 2-3x/jour les jours de repos.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Leg extension tempo lent (tendinite rotulienne)',
        sets: 4,
        reps: '8-15',
        intensity: 'moderate',
        notes:
          'Protocole Heavy Slow Resistance (HSR) : tempo 3-2-4 (3s concentrique, 2s isométrique, 4s excentrique). Commencer à 15RM et progresser vers 6RM sur 12 semaines. Éviter l\'amplitude complète si douloureux — travailler en amplitude moyenne. Pas de douleur > 4/10 pendant l\'exercice.',
        placement: 'active_wait',
      },
    ],
  },

  // =========================================================================
  // 3. FLAT FEET + FOOT ARTHRITIS (Pieds plats + Arthrite pied gauche)
  // =========================================================================
  {
    targetZone: 'foot_left',
    conditionName: 'Pieds plats et arthrite du pied gauche',
    frequency: 'daily',
    priority: 3,
    progressionCriteria:
      'Short foot : progresser de assis → debout bipodal → debout unipodal quand l\'exercice est maîtrisé et indolore pendant 2 semaines. Objectif : maintenir la voûte plantaire 10 secondes en position unipodale. Towel curls : augmenter la résistance en posant un poids sur la serviette.',
    exercises: [
      {
        exerciseName: 'Short foot (exercice du pied court)',
        sets: 3,
        reps: '10-15',
        intensity: 'light',
        notes:
          'Exercice fondamental pour les pieds plats (Hara et al., 2023). Tenir chaque contraction 5-8 secondes. Apprentissage difficile — pratiquer d\'abord assis pour bien comprendre l\'activation musculaire. 6 semaines minimum pour des résultats mesurables. Faire quotidiennement même les jours de repos.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Towel curl (curl serviette pied)',
        sets: 3,
        reps: '15-20',
        intensity: 'light',
        notes:
          'Complément au short foot pour renforcer les fléchisseurs des orteils. Peut être fait à la maison devant la télé. Progression : ajouter un petit poids sur la serviette pour augmenter la résistance.',
        placement: 'rest_day',
      },
      {
        exerciseName: 'Mobilité cheville (ankle circles & dorsiflexion)',
        sets: 3,
        reps: 15,
        intensity: 'very_light',
        notes:
          'Maintient l\'amplitude articulaire malgré l\'arthrite. La dorsiflexion genou-au-mur est particulièrement importante pour le squat et la marche. Ne pas forcer en cas de douleur articulaire aiguë — adapter l\'amplitude.',
        placement: 'warmup',
      },
    ],
  },

  // =========================================================================
  // 4. ANTERIOR HEAD/SHOULDER POSTURE (Posture antérieure tête/épaules)
  // =========================================================================
  {
    targetZone: 'upper_back',
    conditionName: 'Posture antérieure tête et épaules',
    frequency: 'every_session',
    priority: 2,
    progressionCriteria:
      'Chin tucks : augmenter de 10 à 15 répétitions, puis ajouter une résistance (main contre le menton). Wall angels : augmenter l\'amplitude progressivement. Quand capable de toucher le mur avec les mains en position Y pendant 12 reps, passer à un programme d\'entretien (2x/semaine). Face pulls et band pull-aparts : augmenter progressivement la résistance.',
    exercises: [
      {
        exerciseName: 'Chin tuck (rétraction cervicale)',
        sets: 3,
        reps: '10-15',
        intensity: 'very_light',
        notes:
          'Exercice le plus important pour la tête avancée. Tenir 5 secondes par répétition. Peut être fait assis au bureau, en voiture, ou debout. Faire au minimum 3x par jour pour reprogrammer la posture. Ajouter une résistance avec la main quand l\'exercice devient facile.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Wall angel (ange au mur)',
        sets: 3,
        reps: '10-12',
        intensity: 'light',
        notes:
          'Excellent diagnostic de la mobilité thoracique — si incapable de garder le dos des mains contre le mur, la mobilité thoracique est insuffisante. Faire avant les exercices de poussée (développé couché, militaire). Progression : augmenter l\'amplitude lentement.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Face pull (rehab posture)',
        sets: 3,
        reps: '15-20',
        intensity: 'light',
        notes:
          'Rotation externe en fin de mouvement est essentielle — ne pas simplement tirer vers le visage. Ratio recommandé : 1 série de face pull pour chaque série de développé couché. Peut remplacer un exercice d\'isolation pour les épaules.',
        placement: 'active_wait',
      },
      {
        exerciseName: 'Band pull-apart',
        sets: 3,
        reps: '15-20',
        intensity: 'light',
        notes:
          'Parfait en super-set avec le développé couché ou entre les séries d\'exercices de poussée (active wait). Bande légère à moyenne. Serrer les omoplates 2 secondes à chaque répétition. Alternative au face pull quand la poulie est occupée.',
        placement: 'active_wait',
      },
      {
        exerciseName: 'Étirement pectoral (doorway stretch)',
        sets: 3,
        reps: '30-45 sec',
        intensity: 'very_light',
        notes:
          'Étirement passif des pectoraux raccourcis par la posture antérieure. 3 positions : coudes bas (fibres inférieures), coudes à 90° (fibres moyennes), coudes hauts (fibres supérieures). Faire en cooldown et les jours de repos.',
        placement: 'cooldown',
      },
    ],
  },

  // =========================================================================
  // 5. WEAK CORE / LOWER BACK (Core faible / Douleurs lombaires)
  // =========================================================================
  {
    targetZone: 'lower_back',
    conditionName: 'Core faible et douleurs lombaires',
    frequency: 'every_session',
    priority: 1,
    progressionCriteria:
      'Dead bugs : progresser de 3x8 à 3x15. Quand maîtrisé, ajouter un élastique aux pieds ou un poids dans les mains. Bird dogs : idem, ajouter une pause de 5 secondes en extension. Pallof press : augmenter le poids au câble progressivement. Glute bridges : passer à unipodal puis ajouter une charge (barre ou haltère). Objectif : 60 secondes de planche latérale de chaque côté.',
    exercises: [
      {
        exerciseName: 'Dead bug',
        sets: 3,
        reps: '8-12',
        intensity: 'light',
        notes:
          'Exercice #1 pour le core profond et la stabilisation lombaire (McGill). Le bas du dos doit rester PLAQUÉ au sol pendant tout le mouvement. Si le dos se cambre, réduire l\'amplitude des mouvements. Respirer normalement, ne pas retenir le souffle.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Bird dog',
        sets: 3,
        reps: '8-12',
        intensity: 'light',
        notes:
          'McGill Big 3 : exercice fondamental pour la stabilisation lombaire. Le bassin ne doit PAS tourner quand vous étendez la jambe. Placer un verre d\'eau sur le dos comme test de stabilité. Tenir 3 secondes en extension.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Pallof press',
        sets: 3,
        reps: '10-12',
        intensity: 'moderate',
        notes:
          'Anti-rotation : protège le dos contre les forces de torsion. Commencer avec un poids léger, se concentrer sur la rigidité du core. Peut être fait debout, à genoux, ou en fente. Excellent en active wait entre les séries de squat.',
        placement: 'active_wait',
      },
      {
        exerciseName: 'Pont fessier (glute bridge)',
        sets: 3,
        reps: '12-15',
        intensity: 'light',
        notes:
          'Active les fessiers inhibés par la position assise prolongée (« amnésie glutéale »). Fessiers forts = dos protégé. Serrer les fessiers 3 secondes en haut. Progression : unipodal → avec barre → hip thrust.',
        placement: 'warmup',
      },
    ],
  },

  // =========================================================================
  // 6. SCIATICA (Sciatique)
  // =========================================================================
  {
    targetZone: 'hip_right',
    conditionName: 'Sciatique (compression nerf sciatique)',
    frequency: 'daily',
    priority: 2,
    progressionCriteria:
      'Nerve flossing : augmenter de 5 à 10-15 répétitions quand bien toléré. Étirement piriforme : augmenter la durée de 30 à 60 secondes. Si la douleur sciatique diminue significativement (< 2/10), réduire à un programme d\'entretien (3x/semaine). Ajouter progressivement le renforcement des fessiers (ponts, hip thrust).',
    exercises: [
      {
        exerciseName: 'Nerve flossing sciatique',
        sets: 2,
        reps: '5-10',
        intensity: 'very_light',
        notes:
          'ATTENTION : mouvement DOUX et LENT. Ne JAMAIS forcer. Arrêter immédiatement si douleur vive ou aggravation des symptômes. Le nerf glisse doucement dans sa gaine — pas d\'étirement brutal. Faire quotidiennement, idéalement le matin et le soir. Contre-indiqué en phase aiguë (douleur > 7/10).',
        placement: 'warmup',
      },
      {
        exerciseName: 'Étirement piriforme',
        sets: 3,
        reps: '30-45 sec',
        intensity: 'very_light',
        notes:
          'Position figure-4 allongée sur le dos. Le piriforme tendu peut comprimer le nerf sciatique. Respirer profondément pendant l\'étirement. Ne pas forcer — aller à la sensation d\'étirement confortable. Faire après chaque séance et les jours de repos.',
        placement: 'cooldown',
      },
      {
        exerciseName: 'Cat-cow (chat-vache)',
        sets: 1,
        reps: '10-15',
        intensity: 'very_light',
        notes:
          'Mobilise doucement la colonne lombaire et soulage la compression nerveuse. Mouvements lents et contrôlés, synchronisés avec la respiration. Excellent le matin au réveil quand la raideur est maximale.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Pont fessier (glute bridge)',
        sets: 3,
        reps: '12-15',
        intensity: 'light',
        notes:
          'Des fessiers forts aident à stabiliser le bassin et réduisent la compression du nerf sciatique. Complète le programme d\'étirement. Le renforcement est aussi important que l\'étirement pour la sciatique chronique.',
        placement: 'active_wait',
      },
      {
        exerciseName: 'Child\'s pose (posture de l\'enfant)',
        sets: 3,
        reps: '30-60 sec',
        intensity: 'very_light',
        notes:
          'Position de repos qui ouvre doucement l\'espace intervertébral. Idéal en fin de séance. Si les genoux sont douloureux, placer un coussin entre les fesses et les talons.',
        placement: 'cooldown',
      },
    ],
  },
]
