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
 * - Reinold et al. (2004) — Protocole coiffe des rotateurs
 * - Thigpen et al. (2010) — Scaption shoulder-safe angle
 * - Stasinopoulos & Stasinopoulos (2017) — Excentrique épicondylite latérale
 * - Rathleff et al. (2015) — Step-down excentrique fémoro-patellaire
 * - Powers (2010) — Renforcement proximal pour douleur fémoro-patellaire
 * - McKenzie — Extension pour hernie discale
 * - Alfredson (1998) — Protocole excentrique tendinite d'Achille
 * - Freeman et al. — Entraînement proprioceptif cheville
 * - Rozmaryn et al. (1998) — Nerve gliding syndrome canal carpien
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

  // =========================================================================
  // 7. ROTATOR CUFF TENDINITIS (Tendinite épaule / coiffe des rotateurs)
  // =========================================================================
  {
    targetZone: 'shoulder_right',
    conditionName: 'Tendinite épaule / coiffe des rotateurs',
    frequency: 'every_session',
    priority: 2,
    progressionCriteria:
      'Quand 3x15 répétitions de rotation externe sont indolores pendant 2 semaines consécutives, augmenter la charge de 0.5 kg. Pour la scaption, progresser de 1 kg à 3 kg maximum. Quand la douleur est < 2/10 pendant les exercices de poussée au-dessus de la tête, réduire à un programme d\'entretien (3x/semaine). Objectif : 0 douleur sur les mouvements overhead et de rotation externe.',
    exercises: [
      {
        exerciseName: 'Rotation externe haltère (couché)',
        sets: 3,
        reps: 15,
        intensity: 'light',
        notes:
          'Side-lying external rotation. Basé sur Reinold et al. (2004) : protocole de renforcement de la coiffe des rotateurs. Phase excentrique de 3 secondes. Commencer avec 1-2 kg. Le coude reste collé au flanc pendant tout le mouvement. Faire avant toute séance impliquant les épaules.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Rotation externe câble',
        sets: 3,
        reps: '12-15',
        intensity: 'light',
        notes:
          'Câble réglé à hauteur du coude, serviette roulée entre le coude et le corps. Rotation externe contrôlée, 3 secondes en excentrique. Charge légère — la coiffe des rotateurs ne nécessite pas de charges lourdes. Excellent en active wait entre les séries de développé couché.',
        placement: 'active_wait',
      },
      {
        exerciseName: 'Élévation latérale scaption (30°)',
        sets: 3,
        reps: '12-15',
        intensity: 'light',
        notes:
          'Élévation dans le plan de la scapula (30° en avant du plan frontal), pouces vers le haut. Angle shoulder-safe selon Thigpen et al. (2010) : réduit le risque de conflit sous-acromial. Haltères très légers (1-3 kg). Ne pas dépasser la hauteur des épaules.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Étirement capsule postérieure (sleeper stretch)',
        sets: 3,
        reps: '30 sec',
        intensity: 'very_light',
        notes:
          'Allongé sur le côté affecté, rotation interne passive douce. Adresse la raideur de la capsule postérieure, fréquente dans les tendinopathies de la coiffe. Ne JAMAIS forcer — aller à la sensation d\'étirement sans douleur. Faire après chaque séance.',
        placement: 'cooldown',
      },
    ],
  },

  // =========================================================================
  // 8. LATERAL EPICONDYLITIS / TENNIS ELBOW (Épicondylite latérale)
  // =========================================================================
  {
    targetZone: 'elbow_right',
    conditionName: 'Épicondylite latérale (tennis elbow)',
    frequency: 'daily',
    priority: 1,
    progressionCriteria:
      'Quand 3x15 extensions excentriques sont indolores pendant 2 semaines consécutives, augmenter la charge de 0.5 kg. Protocole Stasinopoulos (2017) : 12 semaines minimum. Quand la douleur est < 2/10 sur les mouvements de préhension et d\'extension du poignet, réduire à un programme d\'entretien (3x/semaine). Objectif : reprendre les exercices de tirage sans douleur au coude.',
    exercises: [
      {
        exerciseName: 'Extension poignet excentrique (tennis elbow)',
        sets: 3,
        reps: 15,
        intensity: 'light',
        notes:
          'Gold standard pour le tennis elbow — Stasinopoulos & Stasinopoulos (2017). Phase excentrique de 5 secondes, concentrique assistée par l\'autre main. Commencer avec 1-2 kg. Faire 2x/jour les jours sans entraînement. Ne pas augmenter la charge tant que 3x15 n\'est pas indolore.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Supination/pronation avec marteau',
        sets: 3,
        reps: 15,
        intensity: 'very_light',
        notes:
          'Utiliser un marteau léger ou un haltère lesté d\'un côté. Mouvements lents et contrôlés de supination et pronation. Renforce les rotateurs de l\'avant-bras qui stabilisent le coude. Commencer avec une charge très légère et augmenter progressivement.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Étirement extenseurs du poignet',
        sets: 3,
        reps: '30 sec',
        intensity: 'very_light',
        notes:
          'Étirement doux des extenseurs du poignet. Bras tendu, paume vers le bas, tirez les doigts vers le bas. Ne jamais forcer en douleur. Faire avant et après les exercices excentriques et avant toute séance impliquant la préhension.',
        placement: 'cooldown',
      },
    ],
  },

  // =========================================================================
  // 9. PATELLOFEMORAL SYNDROME (Syndrome fémoro-patellaire / douleur rotule)
  // =========================================================================
  {
    targetZone: 'knee_right',
    conditionName: 'Syndrome fémoro-patellaire (douleur rotule)',
    frequency: 'every_session',
    priority: 2,
    progressionCriteria:
      'Step-down : progresser de 15 cm à 20 cm de hauteur de step quand indolore. Clam shell : ajouter une bande plus résistante quand 3x15 est facile. TKE : augmenter la résistance de la bande. Quand la douleur est < 2/10 pendant les squats et montées d\'escaliers, réintroduire progressivement les exercices en chaîne cinétique fermée (squats, fentes). Approche Powers (2010) : le renforcement proximal (hanche) est aussi important que le renforcement local (quadriceps).',
    exercises: [
      {
        exerciseName: 'Step-down excentrique',
        sets: 3,
        reps: '10/jambe',
        intensity: 'light',
        notes:
          'Rathleff et al. (2015) : l\'excentrique ciblé du VMO améliore le tracking rotulien. Descente lente sur 3-4 secondes, genou aligné sur le 2e orteil. Step de 15-20 cm. Ne laissez pas le genou partir en valgus (vers l\'intérieur).',
        placement: 'warmup',
      },
      {
        exerciseName: 'Clam shell (renforcement moyen fessier)',
        sets: 3,
        reps: 15,
        intensity: 'light',
        notes:
          'Powers (2010) : le renforcement du moyen fessier améliore le contrôle du genou et réduit la douleur fémoro-patellaire de 43% en 6 semaines. Bande élastique autour des genoux. Ne laissez pas le bassin rouler vers l\'arrière.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Terminal knee extension câble',
        sets: 3,
        reps: 15,
        intensity: 'light',
        notes:
          'Bande derrière le genou, extension des derniers 30° du genou. Cible spécifiquement le VMO dans les amplitudes les plus fonctionnelles. Tenez 2 secondes en extension complète. Excellent en active wait.',
        placement: 'active_wait',
      },
      {
        exerciseName: 'Foam roll quadriceps/ITB',
        sets: 2,
        reps: '60 sec',
        intensity: 'very_light',
        notes:
          'Auto-libération myofasciale des quadriceps et de la bandelette ilio-tibiale. Roulez lentement, insistez sur les points sensibles. Réduit les tensions qui contribuent au mauvais tracking rotulien. Ne roulez jamais directement sur le genou.',
        placement: 'warmup',
      },
    ],
  },

  // =========================================================================
  // 10. DISC HERNIATION (Hernie discale / protrusion discale)
  // =========================================================================
  {
    targetZone: 'lower_back',
    conditionName: 'Hernie discale / protrusion',
    frequency: 'daily',
    priority: 1,
    progressionCriteria:
      'Extension McKenzie : progresser de la version coudes au sol (sphinx) vers la version bras tendus quand indolore. Bird dog : ajouter une pause de 5 secondes en extension, puis un élastique. Quand la douleur est centralisée (reste au centre du dos, ne descend plus dans la jambe) et < 3/10 pendant 4 semaines, commencer à réintroduire la flexion progressive (cat-cow, puis squats légers). Le retour au soulevé de terre ne doit se faire que quand 0 douleur irradiante depuis 8 semaines minimum.',
    exercises: [
      {
        exerciseName: 'Extension McKenzie (prone press-up)',
        sets: 3,
        reps: 10,
        intensity: 'very_light',
        notes:
          'Méthode McKenzie : gold standard pour les hernies/protrusions discales. L\'extension répétée centralise la douleur (signe de bon pronostic). Faire plusieurs fois par jour (toutes les 2-3 heures). STOP immédiatement si la douleur se déplace vers la jambe (périphéralisation). Commencer par la version sphinx (coudes au sol) si la version bras tendus est douloureuse.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Bird dog',
        sets: 3,
        reps: 10,
        intensity: 'light',
        notes:
          'McGill Big 3 : stabilisation lombaire sans flexion du rachis. Le bassin ne doit PAS tourner. Tenir 3 secondes en extension. Excellent complément au McKenzie pour renforcer les stabilisateurs du tronc sans charger le disque.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Marche (décompression active)',
        sets: 1,
        reps: '10-15 min',
        intensity: 'very_light',
        notes:
          'Décompression par le mouvement cyclique du bassin. La marche favorise la nutrition du disque intervertébral par imbibition. Faire quotidiennement, idéalement le matin. Augmenter progressivement la durée vers 20-30 minutes.',
        placement: 'rest_day',
      },
    ],
  },

  // =========================================================================
  // 11. PIRIFORMIS SYNDROME (Syndrome du piriforme)
  // =========================================================================
  {
    targetZone: 'hip_right',
    conditionName: 'Syndrome du piriforme',
    frequency: 'daily',
    priority: 2,
    progressionCriteria:
      'Étirement piriforme : augmenter la durée de 30 à 60 secondes quand bien toléré. Clam shell : progresser vers une bande plus résistante quand 3x15 est facile. Pont fessier unilatéral : ajouter une charge (haltère sur la hanche) quand 3x10 est indolore. Quand la douleur est < 2/10 pendant la position assise prolongée et les squats profonds, réduire à un programme d\'entretien (3x/semaine). Objectif : 0 douleur dans la fesse et absence de symptômes irradiants.',
    exercises: [
      {
        exerciseName: 'Étirement piriforme assis',
        sets: 3,
        reps: '30-45 sec',
        intensity: 'very_light',
        notes:
          'Variante assise : figure 4 sur la chaise puis inclinaison du buste vers l\'avant. Peut être fait au bureau ou à la salle entre les exercices. Respirez profondément pendant l\'étirement. Ne forcez jamais au-delà de la sensation d\'étirement confortable.',
        placement: 'cooldown',
      },
      {
        exerciseName: 'Clam shell (renforcement moyen fessier)',
        sets: 3,
        reps: 15,
        intensity: 'light',
        notes:
          'Renforce le moyen fessier pour stabiliser la hanche et réduire la surcharge du piriforme. Bande élastique autour des genoux. Ne laissez pas le bassin rouler vers l\'arrière. Peut être fait en échauffement et les jours de repos.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Foam roll fessier',
        sets: 2,
        reps: '60 sec',
        intensity: 'very_light',
        notes:
          'Assis sur le foam roller, croisez la cheville sur le genou opposé. Roulez sur le fessier en insistant sur les points sensibles. Pour plus de pression, utilisez une balle de lacrosse. Libère les tensions du piriforme et des rotateurs profonds.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Pont fessier unilatéral (single-leg glute bridge)',
        sets: 3,
        reps: '10/jambe',
        intensity: 'light',
        notes:
          'Renforce spécifiquement le fessier de la hanche affectée. Corrige les déséquilibres bilatéraux. Serrez le fessier 3 secondes en haut. Excellent en active wait entre les séries d\'exercices pour le bas du corps.',
        placement: 'active_wait',
      },
    ],
  },

  // =========================================================================
  // 12. CHRONIC ANKLE SPRAIN / INSTABILITY (Entorse cheville chronique)
  // =========================================================================
  {
    targetZone: 'ankle_right',
    conditionName: 'Entorse cheville chronique / instabilité',
    frequency: '3x_week',
    priority: 3,
    progressionCriteria:
      'Proprioception : progresser de sol dur yeux ouverts → yeux fermés → surface instable yeux ouverts → surface instable yeux fermés. Quand capable de tenir 30 secondes yeux fermés sur surface instable, réduire à un programme d\'entretien (2x/semaine). Éversion résistée : augmenter la résistance de la bande. Mollets excentriques : ajouter une charge (sac à dos lesté) quand 3x12 est facile. Objectif : 0 sensation d\'instabilité pendant les mouvements latéraux et la course.',
    exercises: [
      {
        exerciseName: 'Proprioception unipodal (single-leg balance)',
        sets: 3,
        reps: '30 sec',
        intensity: 'very_light',
        notes:
          'Protocole Freeman et al. : l\'entraînement proprioceptif réduit le risque de récidive d\'entorse de 50%. Progresser : sol dur yeux ouverts → yeux fermés → coussin yeux ouverts → coussin yeux fermés. Faire quotidiennement.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Éversion/inversion résistée (banded ankle)',
        sets: 3,
        reps: 15,
        intensity: 'very_light',
        notes:
          'Bande autour de l\'avant-pied. Éversion : tournez le pied vers l\'extérieur contre la bande. Inversion : tournez vers l\'intérieur. Les péroniers (éversion) sont particulièrement importants pour prévenir l\'inversion excessive. Mouvements lents et contrôlés.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Mollets excentriques unilatéral',
        sets: 3,
        reps: 12,
        intensity: 'light',
        notes:
          'Montée sur deux pieds, descente excentrique sur une jambe sur 3-4 secondes. Renforce les mollets pour stabiliser la cheville. Travaillez l\'amplitude complète (talon sous le step).',
        placement: 'active_wait',
      },
      {
        exerciseName: 'Mobilité cheville (ankle circles & dorsiflexion)',
        sets: 3,
        reps: 15,
        intensity: 'very_light',
        notes:
          'Cercles de cheville et dorsiflexion genou-au-mur. Maintient l\'amplitude articulaire essentielle après entorse. La dorsiflexion est souvent limitée après une entorse et doit être restaurée pour prévenir les récidives.',
        placement: 'cooldown',
      },
    ],
  },

  // =========================================================================
  // 13. ACHILLES TENDINITIS (Tendinite d'Achille)
  // =========================================================================
  {
    targetZone: 'ankle_right',
    conditionName: 'Tendinite d\'Achille',
    frequency: 'daily',
    priority: 2,
    progressionCriteria:
      'Protocole Alfredson (1998) : 12 semaines minimum, 2x par jour. Phase 1 (semaines 1-4) : poids du corps uniquement, la douleur légère (< 5/10) est acceptable. Phase 2 (semaines 5-8) : ajouter progressivement du poids (sac à dos lesté, gilet lesté). Phase 3 (semaines 9-12) : charges plus lourdes, réintroduction progressive de la course. Quand 3x15 heel drops sont indolores avec charge additionnelle pendant 2 semaines, commencer le retour au sport progressif. Ne JAMAIS faire de sprints ou de pliométrie avant la fin du protocole de 12 semaines.',
    exercises: [
      {
        exerciseName: 'Mollets excentriques Alfredson (heel drop)',
        sets: 3,
        reps: 15,
        intensity: 'light',
        notes:
          'Gold standard — protocole Alfredson (1998). Genou TENDU, descente excentrique lente sur 3-5 secondes. Montée sur 2 pieds, descente sur 1 pied. Faire 2x/jour (matin et soir). La douleur légère pendant l\'exercice est acceptable et attendue au début. 12 semaines minimum.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Mollets excentriques genou fléchi (soleus heel drop)',
        sets: 3,
        reps: 15,
        intensity: 'light',
        notes:
          'Même protocole mais genou fléchi à 20-30° pour cibler le soléaire. Le soléaire constitue la majorité de la masse du tendon d\'Achille. Les deux variantes (genou tendu + genou fléchi) doivent être faites — c\'est le protocole Alfredson complet. Faire 2x/jour.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Étirement mollet mur (wall calf stretch)',
        sets: 3,
        reps: '30 sec',
        intensity: 'very_light',
        notes:
          'Étirement du gastrocnémien (genou tendu) puis du soléaire (genou légèrement fléchi). Maintenir la souplesse du complexe mollet-Achille est essentiel pendant le protocole excentrique. Ne jamais rebondir pendant l\'étirement.',
        placement: 'cooldown',
      },
    ],
  },

  // =========================================================================
  // 14. CARPAL TUNNEL SYNDROME (Syndrome canal carpien / douleur poignet)
  // =========================================================================
  {
    targetZone: 'wrist_right',
    conditionName: 'Syndrome canal carpien / douleur poignet',
    frequency: 'daily',
    priority: 3,
    progressionCriteria:
      'Nerve gliding : augmenter de 5 à 10 répétitions par position quand bien toléré. Si les symptômes diminuent (picotements < 2/10), ajouter le renforcement de préhension. Étirements : augmenter la durée de 30 à 45 secondes. Quand les symptômes nocturnes disparaissent et que la force de préhension est symétrique, réduire à un programme d\'entretien (3x/semaine). Objectif : 0 engourdissement/picotement nocturne et force de préhension normale. Si aucune amélioration après 6 semaines, référer au médecin pour évaluation chirurgicale.',
    exercises: [
      {
        exerciseName: 'Nerve gliding poignet (median nerve glides)',
        sets: 2,
        reps: 10,
        intensity: 'very_light',
        notes:
          'Protocole Rozmaryn et al. (1998) : les glissements du nerf médian réduisent la pression intracarpienne. 6 positions progressives, 5-7 secondes chacune. Mouvement DOUX — arrêtez immédiatement si picotements ou engourdissement augmentent. Faire 2-3x par jour.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Étirement fléchisseurs du poignet',
        sets: 3,
        reps: '30 sec',
        intensity: 'very_light',
        notes:
          'Bras tendu, paume vers le haut, tirez doucement les doigts vers le bas. Étire les fléchisseurs qui passent dans le canal carpien. Ne forcez pas en cas de douleur ou de picotements.',
        placement: 'cooldown',
      },
      {
        exerciseName: 'Étirement extenseurs du poignet',
        sets: 3,
        reps: '30 sec',
        intensity: 'very_light',
        notes:
          'Bras tendu, paume vers le bas, tirez les doigts vers le bas. Équilibre les tensions musculaires autour du poignet. Complément essentiel à l\'étirement des fléchisseurs.',
        placement: 'cooldown',
      },
      {
        exerciseName: 'Renforcement préhension (grip strengthening)',
        sets: 3,
        reps: '10-15',
        intensity: 'very_light',
        notes:
          'Balle souple ou serviette roulée. Serrer et maintenir 5 secondes. Ne PAS faire en phase aiguë (picotements constants). À introduire uniquement quand les symptômes sont bien contrôlés. Faire les jours de repos.',
        placement: 'rest_day',
      },
    ],
  },
]
