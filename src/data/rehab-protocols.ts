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
      'Quand 3x15 répétitions de curl excentrique sont indolores pendant 2 semaines consécutives, augmenter la charge de 0.5-1 kg. Pour l\'extension doigts, progresser vers un élastique plus résistant. Objectif : 0 douleur sur les mouvements de poussée et de préhension.',
    exercises: [
      {
        exerciseName: 'Massage avant-bras avec balle',
        sets: 2,
        reps: '60 sec',
        intensity: 'very_light',
        notes:
          'Utiliser une balle de tennis ou de lacrosse. Rouler sur les fléchisseurs de l\'avant-bras (côté paume) en insistant sur les points sensibles. Prépare les tissus avant les exercices excentriques et améliore la circulation locale. Faire avant chaque séance.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Curl poignet excentrique (golf elbow)',
        sets: 3,
        reps: 15,
        intensity: 'very_light',
        notes:
          'Phase excentrique de 5 secondes, concentrique assistée par l\'autre main. Commencer avec 1-2 kg. Ne pas augmenter la charge tant que 3x15 n\'est pas indolore. Faire 2x/jour les jours sans entraînement.',
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
      {
        exerciseName: 'Extension doigts avec élastique',
        sets: 3,
        reps: '15-20',
        intensity: 'very_light',
        notes:
          'Placer un élastique autour des doigts et les écarter contre la résistance. Renforce les extenseurs des doigts et équilibre la force de préhension. Excellent exercice de récupération active entre les séries ou en fin de séance. Peut être fait plusieurs fois par jour.',
        placement: 'cooldown',
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
      {
        exerciseName: 'Ankle mobility circles (cercles de cheville)',
        sets: 2,
        reps: '10 par sens',
        intensity: 'very_light',
        notes: 'En position assise ou debout sur une jambe, tracer de grands cercles avec le pied. Faire les deux sens (horaire et anti-horaire) pour chaque cheville. Améliore la mobilité et la proprioception.',
        placement: 'rest_day',
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
      {
        exerciseName: 'Thoracic spine rotation (rotation thoracique)',
        sets: 2,
        reps: '8-10 par côté',
        intensity: 'light',
        notes: 'En position 4 pattes ou assis. Placer une main derrière la tête et tourner le coude vers le plafond en ouvrant la poitrine. Mouvement contrôlé, ne pas forcer l\'amplitude. Excellent pour la mobilité du haut du dos.',
        placement: 'rest_day',
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
      'Nerve flossing : augmenter de 5 à 10-15 répétitions quand bien toléré. Étirement piriforme : augmenter la durée de 30 à 60 secondes. Si la douleur sciatique diminue significativement (< 2/10), réduire à un programme d\'entretien (3x/semaine). Ajouter progressivement le renforcement des fessiers (ponts, hip thrust). Pour les étirements chaîne postérieure : augmenter la durée de 30 à 45 sec quand l\'étirement est confortable. Objectif : toucher les orteils jambes tendues sans douleur.',
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
      {
        exerciseName: 'Étirement ischio-jambiers (hamstring stretch)',
        sets: 3,
        reps: '30 sec',
        intensity: 'very_light',
        notes:
          'Jambe tendue sur support (banc, step). Garder le dos droit, basculer le bassin vers l\'avant. Ne pas arrondir le dos. Alterner les deux jambes. Étirement passif, ne pas forcer. Essentiel pour la chaîne postérieure, surtout chez les grands gabarits.',
        placement: 'cooldown',
      },
      {
        exerciseName: 'Étirement fléchisseurs de hanche (hip flexor stretch)',
        sets: 3,
        reps: '30 sec',
        intensity: 'very_light',
        notes:
          'Position de fente au sol, genou arrière posé. Avancer les hanches vers l\'avant sans cambrer le dos. Contracter le fessier du côté étiré. La raideur des fléchisseurs aggrave la lordose et la compression sciatique. Faire des deux côtés.',
        placement: 'cooldown',
      },
      {
        exerciseName: 'Foam roll chaîne postérieure (ischios + mollets)',
        sets: 2,
        reps: '60 sec',
        intensity: 'very_light',
        notes:
          'Rouler lentement sur les ischio-jambiers puis les mollets. S\'attarder sur les points sensibles (10-15 sec). Aide à relâcher la tension de la chaîne postérieure et améliore la mobilité pour le squat et le deadlift. Faire avant la séance pour préparer les tissus.',
        placement: 'warmup',
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

  // =========================================================================
  // 15. COMPLEX FOOT PAIN (Douleur pied complexe)
  // =========================================================================
  {
    targetZone: 'foot_right',
    conditionName: 'Douleur pied complexe (nerf tibial, extenseurs, péronéaux)',
    frequency: 'daily',
    priority: 2,
    progressionCriteria:
      'Nerve flossing : augmenter de 10 à 15 répétitions quand les sensations électriques diminuent. Étirements : augmenter la durée de 30 à 45 secondes quand bien toléré. Towel curl : ajouter un poids léger sur la serviette quand 3x15 est facile. Quand la raideur matinale disparaît et que la douleur est < 2/10 pendant la marche et la station debout prolongée, réduire à un programme d\'entretien (3x/semaine). Objectif : 0 sensation de décharge électrique et disparition des douleurs sur le bord externe et le dessus du pied.',
    exercises: [
      {
        exerciseName: 'Massage balle sous le pied',
        sets: 2,
        reps: '60 sec',
        intensity: 'very_light',
        notes:
          'Utiliser une balle à picots (spiky ball) ou balle de tennis. Rouler sous la voûte plantaire en insistant sur les points sensibles. Prépare les tissus et améliore la circulation locale. Faire debout ou assis selon la tolérance.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Auto-massage mollet',
        sets: 2,
        reps: '60 sec',
        intensity: 'very_light',
        notes:
          'Utiliser un pistolet de massage (ou foam roller). Relâche les tensions du mollet qui affectent le pied via le nerf tibial et les tendons. Insister sur les points sensibles du gastrocnémien et du soléaire.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Nerve flossing pied (nerf tibial)',
        sets: 3,
        reps: '10-15',
        intensity: 'very_light',
        notes:
          'Aide à réduire les sensations de décharge électrique dans le talon. Assis, jambe tendue, pointer puis fléchir le pied tout en inclinant la tête. Mouvement DOUX et contrôlé — ne jamais forcer. Arrêter si aggravation des symptômes.',
        placement: 'active_wait',
      },
      {
        exerciseName: 'Étirement extenseurs du pied',
        sets: 3,
        reps: '30 sec',
        intensity: 'very_light',
        notes:
          'Pour la douleur sur le dessus du pied. Assis, pointer le pied et appuyer doucement sur le dessus des orteils. Étire les tendons extenseurs. Ne pas forcer en cas de douleur aiguë.',
        placement: 'active_wait',
      },
      {
        exerciseName: 'Étirement péronéaux',
        sets: 3,
        reps: '30 sec',
        intensity: 'very_light',
        notes:
          'Pour la douleur sur le bord externe du pied. Assis, tourner le pied en inversion (plante vers l\'intérieur) et maintenir. Étire les muscles péroniers sur le côté externe de la jambe.',
        placement: 'active_wait',
      },
      {
        exerciseName: 'Mobilité cheville',
        sets: 2,
        reps: '10 cercles/direction',
        intensity: 'very_light',
        notes:
          'Cercles de cheville dans les deux sens. Améliore la fonction globale du pied et réduit la raideur matinale. Peut être fait assis ou debout. Excellent le matin au réveil.',
        placement: 'active_wait',
      },
      {
        exerciseName: 'Towel curl (renforcement orteils)',
        sets: 3,
        reps: '10-15',
        intensity: 'light',
        notes:
          'Serviette posée au sol, ramener vers soi en agrippant avec les orteils. Renforce les muscles intrinsèques du pied et améliore la stabilité de la voûte plantaire. Progression : ajouter un poids léger sur la serviette.',
        placement: 'cooldown',
      },
    ],
  },

  // =========================================================================
  // 16. ADHESIVE CAPSULITIS / FROZEN SHOULDER (Capsulite adhésive / épaule gelée)
  // =========================================================================
  {
    targetZone: 'shoulder_right',
    conditionName: 'Capsulite adhésive (épaule gelée)',
    frequency: 'daily',
    priority: 2,
    progressionCriteria:
      'Phase 1 (inflammatoire) : exercices de pendule et étirements passifs doux uniquement. Phase 2 (gelée) : ajouter progressivement les wall walks et rotations externes passives. Phase 3 (dégel) : introduire les exercices actifs assistés puis actifs. Objectif : récupérer 80% de l\'amplitude de mouvement comparée au côté sain. Le processus complet peut prendre 12-24 mois — la patience est essentielle.',
    exercises: [
      {
        exerciseName: 'Exercices de pendule (Codman)',
        sets: 3,
        reps: '30 sec/direction',
        intensity: 'very_light',
        notes:
          'Penchez-vous en avant, bras pendant, laissez le bras faire des cercles par gravité. Cercles horaires, antihoraires, puis avant-arrière. NE PAS forcer activement — le mouvement vient du corps, pas de l\'épaule. Excellent pour maintenir la mobilité sans stress sur la capsule. Faire 3-4x par jour.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Étirement passif en élévation (table slide)',
        sets: 3,
        reps: '30-45 sec',
        intensity: 'very_light',
        notes:
          'Assis devant une table, faites glisser la main vers l\'avant en laissant le bras monter passivement. Le bras sain peut aider à pousser. Aller jusqu\'à la sensation d\'étirement, pas de douleur. Progression : augmenter la distance parcourue.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Wall walk (marche au mur)',
        sets: 3,
        reps: '10-15',
        intensity: 'very_light',
        notes:
          'Face au mur, montez les doigts sur le mur en marchant vers le haut. Maintenez la position haute 5 secondes. Ne laissez pas l\'épaule se hausser vers l\'oreille. Marquez votre progression sur le mur pour suivre l\'amélioration de l\'amplitude.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Étirement rotation externe passive',
        sets: 3,
        reps: '30 sec',
        intensity: 'very_light',
        notes:
          'Allongé sur le dos, coude à 90°, utilisez le bras sain ou un bâton pour pousser doucement l\'avant-bras vers l\'extérieur. TRÈS progressif — la capsule postérieure est souvent très raide. Ne jamais forcer contre la douleur.',
        placement: 'cooldown',
      },
      {
        exerciseName: 'Étirement rotation interne (towel stretch)',
        sets: 3,
        reps: '30 sec',
        intensity: 'very_light',
        notes:
          'Serviette dans le dos, main affectée en bas. Le bras sain tire doucement vers le haut pour augmenter la rotation interne. Étirement progressif, maintenir sans rebondir. Important pour les gestes du quotidien (attacher le soutien-gorge, se gratter le dos).',
        placement: 'cooldown',
      },
    ],
  },

  // =========================================================================
  // 17. SUBACROMIAL BURSITIS (Bursite sous-acromiale)
  // =========================================================================
  {
    targetZone: 'shoulder_right',
    conditionName: 'Bursite sous-acromiale',
    frequency: 'daily',
    priority: 2,
    progressionCriteria:
      'Phase 1 (aiguë, 1-2 semaines) : repos, glace, éviter les mouvements overhead. Phase 2 (subaiguë) : introduire la stabilisation scapulaire et les rotations externes légères. Phase 3 (chronique) : renforcement progressif de la coiffe avec charges légères. Quand la douleur est < 2/10 en élévation du bras, réintroduire progressivement les mouvements overhead. Objectif : élévation complète du bras sans douleur ni accrochage.',
    exercises: [
      {
        exerciseName: 'Rétraction scapulaire (scapular squeeze)',
        sets: 3,
        reps: '10-15',
        intensity: 'very_light',
        notes:
          'Serrez les omoplates ensemble et vers le bas, maintenez 5 secondes. Améliore le positionnement scapulaire et ouvre l\'espace sous-acromial. Peut être fait assis, debout, ou allongé sur le ventre. Exercice fondamental — faire plusieurs fois par jour.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Rotation externe isométrique mur',
        sets: 3,
        reps: '10 x 5 sec',
        intensity: 'very_light',
        notes:
          'Coude à 90°, dos de la main contre le mur, poussez comme pour tourner vers l\'extérieur. Renforce la coiffe sans mouvement, idéal en phase aiguë. Intensité légère (30-50% effort max). Pas de douleur pendant l\'exercice.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Rotation externe câble/bande (coiffe)',
        sets: 3,
        reps: '12-15',
        intensity: 'light',
        notes:
          'Coude collé au corps, rotation externe contrôlée contre la résistance de la bande. Serviette roulée entre le coude et le flanc. Tempo lent (3 sec excentrique). À introduire quand les isométriques sont indolores.',
        placement: 'active_wait',
      },
      {
        exerciseName: 'Stabilisation scapulaire Y-T-W',
        sets: 2,
        reps: '8-10/position',
        intensity: 'light',
        notes:
          'Allongé sur le ventre ou penché en avant. Former les lettres Y, T, et W avec les bras en soulevant contre la gravité. Renforce les stabilisateurs scapulaires (trapèze moyen/inférieur, rhomboïdes). Poids très légers ou poids du corps uniquement.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Élévation latérale scaption (30°)',
        sets: 3,
        reps: '10-12',
        intensity: 'light',
        notes:
          'Élévation dans le plan de la scapula (30° en avant), pouces vers le haut. Angle shoulder-safe qui minimise le risque de conflit. NE PAS dépasser la hauteur des épaules en phase de récupération. Poids très légers (1-2 kg max).',
        placement: 'active_wait',
      },
    ],
  },

  // =========================================================================
  // 18. ANTERIOR SHOULDER INSTABILITY (Instabilité antérieure épaule)
  // =========================================================================
  {
    targetZone: 'shoulder_right',
    conditionName: 'Instabilité antérieure épaule',
    frequency: 'every_session',
    priority: 2,
    progressionCriteria:
      'Phase 1 (0-6 semaines) : renforcement isométrique et stabilisation scapulaire uniquement. Phase 2 (6-12 semaines) : exercices dynamiques en amplitude réduite. Phase 3 (12+ semaines) : exercices en amplitude complète et proprioception avancée. Quand le test d\'appréhension est négatif et la force symétrique, introduire progressivement les exercices de poussée. Objectif : stabilité dynamique permettant le retour au sport sans sensation d\'instabilité.',
    exercises: [
      {
        exerciseName: 'Rotation externe couché (renforcement coiffe)',
        sets: 3,
        reps: '12-15',
        intensity: 'light',
        notes:
          'Couché sur le côté sain, haltère léger. Rotation externe lente et contrôlée, coude collé au corps. Renforce l\'infraspinatus et le teres minor, stabilisateurs clés contre l\'instabilité antérieure. Ne JAMAIS utiliser de charges lourdes.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Stabilisation scapulaire (serratus push-up)',
        sets: 3,
        reps: '10-12',
        intensity: 'light',
        notes:
          'Position de planche ou push-up, pousser les omoplates vers l\'extérieur en fin de mouvement (protraction). Renforce le serratus anterior, essentiel pour la stabilité scapulaire. Peut être fait sur les genoux si trop difficile.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Proprioception épaule (rhythmic stabilization)',
        sets: 3,
        reps: '30 sec',
        intensity: 'light',
        notes:
          'Bras tendu devant, partenaire ou bande applique des perturbations légères dans différentes directions. L\'épaule doit résister et maintenir la position. Entraîne les réflexes stabilisateurs. Progresser : yeux fermés, positions variées.',
        placement: 'active_wait',
      },
      {
        exerciseName: 'Face pull avec rotation externe',
        sets: 3,
        reps: '12-15',
        intensity: 'light',
        notes:
          'Câble ou bande à hauteur du visage. Tirer vers le visage puis rotation externe en fin de mouvement. Renforce les rotateurs externes et les stabilisateurs scapulaires. Ratio recommandé : 2 séries de tirage pour 1 série de poussée.',
        placement: 'active_wait',
      },
      {
        exerciseName: 'Exercice de Blackburn (prone Y-T-W-L)',
        sets: 2,
        reps: '8/position',
        intensity: 'light',
        notes:
          'Allongé sur le ventre, bras pendants. Former les lettres Y, T, W, L en soulevant les bras. Renforce l\'ensemble de la coiffe et les stabilisateurs scapulaires. Maintenir chaque position 3 secondes. Poids du corps uniquement au début.',
        placement: 'warmup',
      },
    ],
  },

  // =========================================================================
  // 19. TROCHANTERIC BURSITIS (Bursite trochantérienne)
  // =========================================================================
  {
    targetZone: 'hip_right',
    conditionName: 'Bursite trochantérienne',
    frequency: 'daily',
    priority: 2,
    progressionCriteria:
      'Phase 1 (aiguë) : repos relatif, éviter de dormir sur le côté affecté, étirements IT band et fessiers. Phase 2 : introduire le renforcement du moyen fessier (clam shell, abduction). Phase 3 : renforcement fonctionnel (single-leg stance, step-ups latéraux). Quand la douleur nocturne disparaît et que la marche est indolore, réduire à un programme d\'entretien (3x/semaine). Objectif : 0 douleur sur la face latérale de la hanche.',
    exercises: [
      {
        exerciseName: 'Foam roll IT band',
        sets: 2,
        reps: '60-90 sec',
        intensity: 'very_light',
        notes:
          'Rouler sur le côté externe de la cuisse du genou à la hanche. NE PAS rouler directement sur le grand trochanter (bosse osseuse). Pression modérée — l\'IT band est naturellement tendu. Aide à relâcher les tensions qui irritent la bourse.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Étirement IT band debout',
        sets: 3,
        reps: '30 sec/côté',
        intensity: 'very_light',
        notes:
          'Debout, jambe affectée croisée derrière, inclinez le bassin vers le côté sain. Vous devez sentir l\'étirement sur le côté externe de la hanche/cuisse. Maintenir sans rebondir. Faire plusieurs fois par jour.',
        placement: 'cooldown',
      },
      {
        exerciseName: 'Clam shell (renforcement moyen fessier)',
        sets: 3,
        reps: '15/côté',
        intensity: 'light',
        notes:
          'Couché sur le côté, genoux fléchis, ouvrir le genou supérieur comme une coquille. Bande élastique autour des genoux pour plus de résistance. Le bassin ne doit PAS rouler vers l\'arrière. Renforce le moyen fessier faible, souvent la cause sous-jacente.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Abduction hanche couché (side-lying hip abduction)',
        sets: 3,
        reps: '12-15',
        intensity: 'light',
        notes:
          'Couché sur le côté sain, lever la jambe affectée vers le plafond, pied en légère rotation interne (orteils vers le bas). Éviter de monter trop haut (30-45° suffisent). Renforce les abducteurs de hanche.',
        placement: 'active_wait',
      },
      {
        exerciseName: 'Pont fessier avec bande',
        sets: 3,
        reps: '12-15',
        intensity: 'light',
        notes:
          'Bande autour des genoux, pont fessier classique en poussant légèrement contre la bande. Active le moyen fessier en plus du grand fessier. Serrer les fessiers 3 secondes en haut du mouvement.',
        placement: 'active_wait',
      },
      {
        exerciseName: 'Étirement piriforme/fessier',
        sets: 3,
        reps: '30 sec/côté',
        intensity: 'very_light',
        notes:
          'Position figure-4 allongé ou assis. Étire les rotateurs profonds de la hanche qui peuvent contribuer à l\'irritation de la bourse. Respirer profondément pendant l\'étirement.',
        placement: 'cooldown',
      },
    ],
  },

  // =========================================================================
  // 20. FEMOROACETABULAR IMPINGEMENT - FAI (Conflit fémoro-acétabulaire)
  // =========================================================================
  {
    targetZone: 'hip_right',
    conditionName: 'Conflit fémoro-acétabulaire (FAI)',
    frequency: 'every_session',
    priority: 2,
    progressionCriteria:
      'Phase 1 : mobilité douce et étirements des fléchisseurs, éviter la flexion profonde (> 90°). Phase 2 : stabilisation du core et renforcement fessier en amplitude limitée. Phase 3 : augmentation progressive de l\'amplitude dans les limites de la douleur. Objectif : mouvements fonctionnels (marche, escaliers, vélo) sans douleur. ATTENTION : éviter les squats profonds, les fentes profondes, et les positions de flexion-adduction-rotation interne qui reproduisent le conflit.',
    exercises: [
      {
        exerciseName: 'Étirement fléchisseurs hanche (half-kneeling)',
        sets: 3,
        reps: '30-45 sec/côté',
        intensity: 'very_light',
        notes:
          'Position de fente au sol, genou arrière posé. Avancer les hanches sans cambrer le dos, contracter le fessier du côté étiré. Les fléchisseurs raides aggravent le FAI en tirant la tête fémorale vers l\'avant. Faire quotidiennement.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Mobilité hanche (hip circles contrôlés)',
        sets: 2,
        reps: '10/direction',
        intensity: 'very_light',
        notes:
          'À quatre pattes, faire des cercles avec le genou (comme un chien qui lève la patte). Mouvement LENT et contrôlé. Éviter les amplitudes qui reproduisent la douleur (généralement flexion + rotation interne). Maintient la mobilité articulaire.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Dead bug (stabilisation core)',
        sets: 3,
        reps: '8-10/côté',
        intensity: 'light',
        notes:
          'Le bas du dos doit rester PLAQUÉ au sol. Excellent pour renforcer le core sans charger la hanche en flexion profonde. Si le dos se cambre, réduire l\'amplitude. Alternative au squat pour le travail du core.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Pont fessier',
        sets: 3,
        reps: '12-15',
        intensity: 'light',
        notes:
          'Renforce les fessiers sans flexion de hanche. Serrer les fessiers 3 secondes en haut. Évite de compenser avec les lombaires. Progression : unipodal quand 3x15 est facile.',
        placement: 'active_wait',
      },
      {
        exerciseName: 'Clam shell',
        sets: 3,
        reps: '15/côté',
        intensity: 'light',
        notes:
          'Renforce les rotateurs externes et abducteurs sans stress sur le labrum. Position de départ avec hanches à 45° (pas 90°). Bande élastique pour plus de résistance quand l\'exercice devient facile.',
        placement: 'active_wait',
      },
      {
        exerciseName: 'Squat limité (box squat haut)',
        sets: 3,
        reps: '10-12',
        intensity: 'light',
        notes:
          'Squat jusqu\'à un banc haut (flexion 60-70° max). Garder le torse droit, genoux tracking sur les orteils. Permet de travailler le pattern squat sans atteindre les amplitudes de conflit. NE PAS descendre plus bas tant que la douleur n\'est pas contrôlée.',
        placement: 'active_wait',
      },
    ],
  },

  // =========================================================================
  // 21. HIP FLEXOR STRAIN (Strain fléchisseurs hanche)
  // =========================================================================
  {
    targetZone: 'hip_right',
    conditionName: 'Strain fléchisseurs hanche',
    frequency: 'daily',
    priority: 2,
    progressionCriteria:
      'Phase 1 (aiguë, 0-2 semaines) : repos, glace, étirements très doux uniquement. Phase 2 (subaiguë, 2-4 semaines) : isométriques doux et étirements progressifs. Phase 3 (remodelage, 4-8 semaines) : renforcement isotonique progressif. Quand la flexion de hanche contre résistance est indolore, réintroduire progressivement les exercices dynamiques (fentes, step-ups). Objectif : force symétrique et absence de douleur à l\'étirement et à la contraction.',
    exercises: [
      {
        exerciseName: 'Étirement fléchisseurs doux (Thomas stretch modifié)',
        sets: 3,
        reps: '30 sec/côté',
        intensity: 'very_light',
        notes:
          'Allongé au bord du lit, une jambe pendante, l\'autre genou contre la poitrine. Laisser la jambe descendre passivement. NE PAS forcer en phase aiguë. Progression : augmenter la durée puis l\'amplitude.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Isométrique flexion hanche',
        sets: 3,
        reps: '5 x 10 sec',
        intensity: 'very_light',
        notes:
          'Assis, pousser doucement le genou vers le haut contre la résistance de la main (30-50% effort max). Renforce les fléchisseurs sans les raccourcir. Pas de douleur pendant l\'exercice. Introduire en phase 2 uniquement.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Marche genoux hauts lente (slow high knees)',
        sets: 2,
        reps: '10/jambe',
        intensity: 'light',
        notes:
          'Marche sur place en levant lentement les genoux à 90°. Contrôle le mouvement, pas de momentum. Renforce les fléchisseurs de manière fonctionnelle. Introduire en phase 3 quand les isométriques sont indolores.',
        placement: 'active_wait',
      },
      {
        exerciseName: 'Pont fessier',
        sets: 3,
        reps: '12-15',
        intensity: 'light',
        notes:
          'Renforce les fessiers et étire passivement les fléchisseurs en fin de mouvement. Serrer les fessiers 3 secondes en haut. Peut être fait dès la phase 1 si indolore.',
        placement: 'active_wait',
      },
      {
        exerciseName: 'Dead bug simplifié',
        sets: 3,
        reps: '8-10/côté',
        intensity: 'light',
        notes:
          'Version simplifiée : ne bouger que les bras au début, puis ajouter les jambes. Renforce le core et les fléchisseurs de manière contrôlée. Le bas du dos reste plaqué au sol.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Foam roll quadriceps/psoas',
        sets: 2,
        reps: '60 sec',
        intensity: 'very_light',
        notes:
          'Rouler sur le devant de la cuisse et la zone du pli de l\'aine (attention : pas directement sur l\'os). Aide à relâcher les tensions des fléchisseurs. Pression légère en phase aiguë.',
        placement: 'cooldown',
      },
    ],
  },

  // =========================================================================
  // 22. IT BAND SYNDROME (Syndrome bandelette ilio-tibiale)
  // =========================================================================
  {
    targetZone: 'knee_right',
    conditionName: 'Syndrome bandelette ilio-tibiale (ITB)',
    frequency: 'daily',
    priority: 2,
    progressionCriteria:
      'Phase 1 (aiguë) : repos relatif de la course, foam rolling, étirements IT band. Phase 2 : renforcement des abducteurs et du moyen fessier. Phase 3 : retour progressif à la course avec focus sur la cadence et la technique. Quand 30 minutes de course sont indolores, augmenter progressivement la distance (règle des 10%). Objectif : 0 douleur sur la face externe du genou pendant et après la course.',
    exercises: [
      {
        exerciseName: 'Foam roll IT band',
        sets: 2,
        reps: '90 sec/côté',
        intensity: 'light',
        notes:
          'Rouler sur le côté externe de la cuisse du genou à la hanche. S\'arrêter sur les points sensibles 15-20 secondes. NE PAS rouler directement sur l\'os du genou. La bandelette elle-même ne s\'étire pas vraiment — on travaille les tissus environnants.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Étirement IT band couché',
        sets: 3,
        reps: '30 sec/côté',
        intensity: 'very_light',
        notes:
          'Couché sur le dos, croiser la jambe affectée par-dessus et laisser tomber vers le côté opposé. Garder les épaules au sol. L\'étirement se ressent sur le côté externe de la cuisse et de la hanche.',
        placement: 'cooldown',
      },
      {
        exerciseName: 'Clam shell avec bande',
        sets: 3,
        reps: '15/côté',
        intensity: 'light',
        notes:
          'Exercice fondamental pour le syndrome ITB. Renforce le moyen fessier souvent faible chez les coureurs avec ITB. Le bassin ne doit pas rouler. Faire quotidiennement même les jours de course.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Side-lying hip abduction',
        sets: 3,
        reps: '15/côté',
        intensity: 'light',
        notes:
          'Couché sur le côté, lever la jambe vers le plafond, pied en légère rotation interne. Renforce les abducteurs. Alternative au clam shell pour varier les exercices. Ne pas monter trop haut (45° max).',
        placement: 'active_wait',
      },
      {
        exerciseName: 'Single-leg squat partiel (pistol regression)',
        sets: 3,
        reps: '8-10/jambe',
        intensity: 'moderate',
        notes:
          'Squat sur une jambe, descente partielle (30-45°). Le genou ne doit PAS partir en valgus (vers l\'intérieur). Corrige le pattern de mouvement qui contribue au syndrome ITB. Utiliser un support si nécessaire.',
        placement: 'active_wait',
      },
      {
        exerciseName: 'Pont fessier unilatéral',
        sets: 3,
        reps: '10/jambe',
        intensity: 'light',
        notes:
          'Renforce le grand fessier de chaque côté indépendamment. Corrige les déséquilibres bilatéraux fréquents chez les coureurs avec ITB. Serrer le fessier 3 secondes en haut.',
        placement: 'active_wait',
      },
    ],
  },

  // =========================================================================
  // 23. KNEE BURSITIS (Bursite genou)
  // =========================================================================
  {
    targetZone: 'knee_right',
    conditionName: 'Bursite genou',
    frequency: 'daily',
    priority: 2,
    progressionCriteria:
      'Phase 1 (aiguë) : repos, glace, éviter l\'agenouillement. Phase 2 : renforcement doux du quadriceps et mobilité. Phase 3 : retour progressif aux activités normales. Quand la flexion complète du genou est indolore et l\'agenouillement toléré avec protection, réduire à un programme d\'entretien. Objectif : 0 douleur et gonflement au niveau de la rotule ou de la face interne du genou.',
    exercises: [
      {
        exerciseName: 'Quad sets (contraction isométrique quadriceps)',
        sets: 3,
        reps: '10 x 10 sec',
        intensity: 'very_light',
        notes:
          'Jambe tendue, contracter le quadriceps pour écraser l\'arrière du genou contre le sol. Maintenir 10 secondes. Exercice de base pour maintenir la force du quadriceps sans stress articulaire. Peut être fait plusieurs fois par jour.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Straight leg raise (élévation jambe tendue)',
        sets: 3,
        reps: '12-15',
        intensity: 'light',
        notes:
          'Allongé sur le dos, contracter le quad, lever la jambe tendue à 30-45°. Renforce le quadriceps sans flexion du genou. Progression : ajouter une leste à la cheville.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Mobilité genou (heel slides)',
        sets: 2,
        reps: '15-20',
        intensity: 'very_light',
        notes:
          'Allongé sur le dos, faire glisser le talon vers les fesses puis l\'éloigner. Maintient l\'amplitude de mouvement du genou. Mouvement doux et contrôlé, ne pas forcer si gonflement.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Step-up bas (15 cm)',
        sets: 3,
        reps: '10-12/jambe',
        intensity: 'light',
        notes:
          'Step bas (15-20 cm). Monter en poussant avec la jambe affectée, descendre contrôlé. Renforce le quadriceps de manière fonctionnelle. Augmenter la hauteur progressivement quand indolore.',
        placement: 'active_wait',
      },
      {
        exerciseName: 'Mini-squat (wall sit partiel)',
        sets: 3,
        reps: '10-12',
        intensity: 'light',
        notes:
          'Dos contre le mur, descendre en squat partiel (30-45° de flexion). Renforce les quadriceps dans une amplitude limitée. Maintenir 5 secondes en bas. Éviter la flexion profonde tant que la bursite n\'est pas résolue.',
        placement: 'active_wait',
      },
      {
        exerciseName: 'Étirement quadriceps debout',
        sets: 3,
        reps: '30 sec/côté',
        intensity: 'very_light',
        notes:
          'Debout, attraper la cheville et tirer le talon vers les fesses. Garder les genoux alignés, contracter légèrement les abdominaux. Maintient la souplesse du quadriceps. Ne pas forcer si gonflement important.',
        placement: 'cooldown',
      },
    ],
  },

  // =========================================================================
  // 24. ANTERIOR ANKLE IMPINGEMENT (Impingement antérieur cheville)
  // =========================================================================
  {
    targetZone: 'ankle_right',
    conditionName: 'Impingement antérieur cheville',
    frequency: 'daily',
    priority: 2,
    progressionCriteria:
      'Phase 1 : mobilisation douce et étirements du mollet, éviter les activités qui provoquent le pincement. Phase 2 : renforcement en dorsiflexion avec résistance légère. Phase 3 : retour progressif aux squats profonds et activités sportives. Quand la dorsiflexion complète est indolore et le squat profond toléré, réduire à un programme d\'entretien (3x/semaine). Objectif : dorsiflexion symétrique et absence de douleur antérieure à la cheville.',
    exercises: [
      {
        exerciseName: 'Mobilisation cheville bande (joint mobilization)',
        sets: 3,
        reps: '15-20',
        intensity: 'very_light',
        notes:
          'Bande élastique autour de la cheville, ancrée derrière. En fente, avancer le genou vers l\'avant pendant que la bande tire le talus vers l\'arrière. Améliore la mécanique articulaire et libère l\'espace antérieur. Faire quotidiennement.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Étirement mollet mur (wall calf stretch)',
        sets: 3,
        reps: '30-45 sec',
        intensity: 'very_light',
        notes:
          'Gastrocnémien (genou tendu) puis soléaire (genou fléchi). La raideur du mollet limite la dorsiflexion et aggrave le conflit antérieur. Maintenir sans rebondir. Faire plusieurs fois par jour.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Dorsiflexion genou-au-mur (knee-to-wall)',
        sets: 3,
        reps: '10-15',
        intensity: 'light',
        notes:
          'Face au mur, pied à quelques centimètres, avancer le genou pour toucher le mur sans lever le talon. Mesurer la distance pour suivre les progrès. Test et exercice de mobilité en dorsiflexion. Objectif : 10-12 cm du mur.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Renforcement dorsiflexion bande',
        sets: 3,
        reps: '12-15',
        intensity: 'light',
        notes:
          'Assis, bande autour de l\'avant-pied ancrée devant. Tirer le pied vers le tibia contre la résistance (dorsiflexion). Renforce le tibial antérieur et les extenseurs. Mouvement lent et contrôlé, 3 secondes en excentrique.',
        placement: 'active_wait',
      },
      {
        exerciseName: 'Foam roll mollet',
        sets: 2,
        reps: '60 sec',
        intensity: 'very_light',
        notes:
          'Rouler sur le gastrocnémien et le soléaire. S\'arrêter sur les points sensibles. Aide à relâcher les tensions qui limitent la dorsiflexion. Faire avant les mobilisations articulaires.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Cercles de cheville (ankle circles)',
        sets: 2,
        reps: '10/direction',
        intensity: 'very_light',
        notes:
          'Cercles lents et contrôlés dans les deux sens. Maintient la mobilité globale de la cheville. Peut être fait assis ou debout. Excellent le matin pour réduire la raideur.',
        placement: 'cooldown',
      },
    ],
  },

  // =========================================================================
  // 25. DE QUERVAIN TENOSYNOVITIS (Tendinite de De Quervain)
  // =========================================================================
  {
    targetZone: 'wrist_right',
    conditionName: 'Tendinite de De Quervain',
    frequency: 'daily',
    priority: 2,
    progressionCriteria:
      'Phase 1 (aiguë) : repos, attelle de pouce si nécessaire, étirements très doux. Phase 2 : étirements progressifs et exercices isométriques. Phase 3 : renforcement excentrique du pouce et du poignet. Quand le test de Finkelstein est négatif (pas de douleur) et la préhension indolore, réduire à un programme d\'entretien (3x/semaine). Objectif : 0 douleur sur le bord radial du poignet lors des mouvements du pouce.',
    exercises: [
      {
        exerciseName: 'Étirement pouce (thumb stretch)',
        sets: 3,
        reps: '30 sec',
        intensity: 'very_light',
        notes:
          'Pouce dans la paume, enrouler les doigts autour. Incliner doucement le poignet vers le petit doigt (déviation ulnaire). Version douce du test de Finkelstein. NE PAS forcer en phase aiguë — aller à la sensation d\'étirement sans douleur.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Finkelstein stretch doux (étirement radial)',
        sets: 3,
        reps: '20-30 sec',
        intensity: 'very_light',
        notes:
          'Version contrôlée et progressive. Pouce dans la paume, déviation ulnaire très légère. Augmenter l\'amplitude progressivement sur plusieurs semaines. Arrêter immédiatement si douleur vive. Faire plusieurs fois par jour.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Massage avant-bras radial',
        sets: 2,
        reps: '60 sec',
        intensity: 'very_light',
        notes:
          'Masser le bord externe de l\'avant-bras (côté pouce) avec les doigts ou une balle. Relâche les tensions des muscles long abducteur et court extenseur du pouce. Faire avant les étirements pour préparer les tissus.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Extension pouce isométrique',
        sets: 3,
        reps: '10 x 5 sec',
        intensity: 'very_light',
        notes:
          'Pouce contre la table ou contre la main opposée, pousser vers l\'extérieur sans mouvement. Renforce les tendons affectés de manière sécuritaire. Intensité légère (30-50% effort max). Pas de douleur pendant l\'exercice.',
        placement: 'active_wait',
      },
      {
        exerciseName: 'Extension pouce excentrique',
        sets: 3,
        reps: '10-12',
        intensity: 'light',
        notes:
          'Bande élastique autour du pouce, résister à l\'adduction (mouvement vers la paume) en contrôlant la descente sur 3-4 secondes. Introduire uniquement quand les isométriques sont indolores. Renforce les tendons de manière excentrique.',
        placement: 'active_wait',
      },
      {
        exerciseName: 'Mobilité poignet (flexion/extension)',
        sets: 2,
        reps: '10-15',
        intensity: 'very_light',
        notes:
          'Mouvements lents de flexion et extension du poignet. Maintient la mobilité articulaire. Éviter les mouvements qui reproduisent la douleur. Peut être fait plusieurs fois par jour.',
        placement: 'cooldown',
      },
    ],
  },

  // =========================================================================
  // 26. GENERAL WRIST TENDINITIS (Tendinite poignet générale)
  // =========================================================================
  {
    targetZone: 'wrist_right',
    conditionName: 'Tendinite poignet générale',
    frequency: 'daily',
    priority: 2,
    progressionCriteria:
      'Phase 1 (aiguë) : repos relatif, éviter les mouvements répétitifs qui aggravent. Phase 2 : isométriques puis exercices excentriques légers. Phase 3 : renforcement progressif de la préhension et du poignet. Quand 3x15 exercices de renforcement sont indolores pendant 2 semaines, réduire à un programme d\'entretien (3x/semaine). Objectif : mouvements du poignet et préhension indolores dans les activités quotidiennes.',
    exercises: [
      {
        exerciseName: 'Étirement fléchisseurs poignet',
        sets: 3,
        reps: '30 sec',
        intensity: 'very_light',
        notes:
          'Bras tendu, paume vers le haut, tirer doucement les doigts vers le bas avec l\'autre main. Étire les fléchisseurs du poignet. Maintenir sans rebondir. Faire plusieurs fois par jour.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Étirement extenseurs poignet',
        sets: 3,
        reps: '30 sec',
        intensity: 'very_light',
        notes:
          'Bras tendu, paume vers le bas, tirer doucement les doigts vers le bas. Étire les extenseurs du poignet. Complément essentiel à l\'étirement des fléchisseurs. Maintenir sans rebondir.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Isométrique flexion poignet',
        sets: 3,
        reps: '10 x 5 sec',
        intensity: 'very_light',
        notes:
          'Avant-bras sur la table, paume vers le haut. Pousser contre la résistance de l\'autre main sans mouvement. Renforce les fléchisseurs de manière sécuritaire. Intensité légère (30-50% effort max).',
        placement: 'warmup',
      },
      {
        exerciseName: 'Isométrique extension poignet',
        sets: 3,
        reps: '10 x 5 sec',
        intensity: 'very_light',
        notes:
          'Avant-bras sur la table, paume vers le bas. Pousser vers le haut contre la résistance de l\'autre main. Renforce les extenseurs. Faire après les fléchisseurs pour équilibrer.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Curl poignet excentrique',
        sets: 3,
        reps: '12-15',
        intensity: 'light',
        notes:
          'Avant-bras sur la table, haltère léger (1-2 kg). Descente excentrique lente sur 4-5 secondes, montée assistée par l\'autre main. Introduire en phase 2 quand les isométriques sont indolores. Progresser vers le concentrique complet.',
        placement: 'active_wait',
      },
      {
        exerciseName: 'Renforcement préhension progressive',
        sets: 3,
        reps: '10-15',
        intensity: 'light',
        notes:
          'Balle souple, grip trainer, ou serviette roulée. Serrer et maintenir 5 secondes. Commencer très léger et augmenter progressivement la résistance. Faire uniquement si indolore.',
        placement: 'active_wait',
      },
    ],
  },

  // =========================================================================
  // 27. TFCC INJURY (Lésion TFCC - complexe fibrocartilagineux triangulaire)
  // =========================================================================
  {
    targetZone: 'wrist_right',
    conditionName: 'Lésion TFCC (complexe fibrocartilagineux triangulaire)',
    frequency: 'daily',
    priority: 2,
    progressionCriteria:
      'Phase 1 (aiguë) : repos, attelle si prescrite, ÉVITER la déviation ulnaire. Phase 2 : isométriques en position neutre. Phase 3 : renforcement progressif en pronation/supination et préhension. Quand les mouvements de rotation de l\'avant-bras sont indolores et la préhension symétrique, réduire à un programme d\'entretien (3x/semaine). Objectif : 0 douleur sur le bord ulnaire du poignet lors des rotations et de la préhension. ATTENTION : la déviation ulnaire est contre-indiquée pendant tout le protocole.',
    exercises: [
      {
        exerciseName: 'Isométrique poignet neutre',
        sets: 3,
        reps: '10 x 5 sec',
        intensity: 'very_light',
        notes:
          'Poignet en position neutre, pousser doucement dans chaque direction (flexion, extension, radial, ÉVITER ulnaire) contre la résistance de l\'autre main. Renforce sans stress sur le TFCC. Pas de douleur pendant l\'exercice.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Pronation/supination contrôlée',
        sets: 3,
        reps: '10-12',
        intensity: 'very_light',
        notes:
          'Coude fléchi à 90°, rotation lente de l\'avant-bras (paume vers le haut, puis vers le bas). Sans charge au début, puis avec un bâton léger ou un marteau. Mouvement lent et contrôlé, arrêter si douleur.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Renforcement pronation excentrique',
        sets: 3,
        reps: '10-12',
        intensity: 'light',
        notes:
          'Marteau ou haltère lesté d\'un côté. Résister à la pronation en contrôlant la descente sur 3-4 secondes. Introduire uniquement quand les mouvements sans charge sont indolores. Renforce les rotateurs de l\'avant-bras.',
        placement: 'active_wait',
      },
      {
        exerciseName: 'Renforcement préhension isométrique',
        sets: 3,
        reps: '10 x 5 sec',
        intensity: 'very_light',
        notes:
          'Serrer une balle souple ou une serviette roulée, poignet en position NEUTRE. Éviter la déviation ulnaire pendant la préhension. Maintenir 5 secondes. Commencer très léger.',
        placement: 'active_wait',
      },
      {
        exerciseName: 'Renforcement préhension progressive',
        sets: 3,
        reps: '10-15',
        intensity: 'light',
        notes:
          'Progresser vers des résistances plus fortes (grip trainer) quand les isométriques sont indolores. Toujours maintenir le poignet en position neutre. Serrer et maintenir 3-5 secondes.',
        placement: 'active_wait',
      },
      {
        exerciseName: 'Mobilité poignet (éviter déviation ulnaire)',
        sets: 2,
        reps: '10',
        intensity: 'very_light',
        notes:
          'Mouvements de flexion, extension, et déviation RADIALE uniquement. ÉVITER la déviation ulnaire qui stresse le TFCC. Maintient la mobilité dans les amplitudes sécuritaires.',
        placement: 'cooldown',
      },
    ],
  },

  // =========================================================================
  // 28. CERVICALGIA (Cervicalgie - douleur cervicale)
  // =========================================================================
  {
    targetZone: 'neck',
    conditionName: 'Cervicalgie (douleur cervicale)',
    frequency: 'daily',
    priority: 2,
    progressionCriteria:
      'Phase 1 (aiguë) : chin tucks et étirements doux uniquement, éviter les amplitudes extrêmes. Phase 2 : ajout du renforcement isométrique et des étirements progressifs. Phase 3 : renforcement dynamique et correction posturale. Quand les mouvements cervicaux sont indolores dans toutes les directions et la posture est améliorée, réduire à un programme d\'entretien (3x/semaine). Objectif : amplitude cervicale complète sans douleur et posture neutre maintenue.',
    exercises: [
      {
        exerciseName: 'Chin tuck (rétraction cervicale)',
        sets: 3,
        reps: '10-15',
        intensity: 'very_light',
        notes:
          'Exercice fondamental pour la cervicalgie. Rentrer le menton vers l\'arrière (double menton), tenir 5 secondes. Peut être fait assis ou debout. Faire 3-5x par jour pour reprogrammer la posture. Ajouter une résistance avec la main quand l\'exercice devient facile.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Étirement trapèze supérieur',
        sets: 3,
        reps: '30 sec/côté',
        intensity: 'very_light',
        notes:
          'Incliner la tête vers l\'épaule, main sur la tête pour appui léger. Abaisser l\'épaule opposée. Étire le trapèze supérieur souvent hypertendu. Maintenir sans rebondir, respirer profondément.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Étirement élévateur de la scapula',
        sets: 3,
        reps: '30 sec/côté',
        intensity: 'very_light',
        notes:
          'Regarder vers l\'aisselle, incliner la tête, main sur la tête pour appui léger. L\'élévateur de la scapula est souvent la source des douleurs cervicales latérales. Faire des deux côtés même si asymptomatique.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Rotation cervicale douce',
        sets: 2,
        reps: '10/côté',
        intensity: 'very_light',
        notes:
          'Tourner lentement la tête d\'un côté puis de l\'autre. Ne pas forcer l\'amplitude — aller jusqu\'à la sensation d\'étirement sans douleur. Aide à maintenir la mobilité cervicale. Faire plusieurs fois par jour.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Flexion/extension cervicale',
        sets: 2,
        reps: '10',
        intensity: 'very_light',
        notes:
          'Baisser le menton vers la poitrine puis regarder vers le plafond. Mouvements lents et contrôlés. Éviter les amplitudes extrêmes en phase aiguë. Maintient la mobilité en flexion/extension.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Correction posturale (posture reset)',
        sets: 3,
        reps: '10',
        intensity: 'very_light',
        notes:
          'Chin tuck + rétraction scapulaire combinés. Rentrer le menton, serrer les omoplates, tenir 5-10 secondes. Reprogramme la posture neutre. Faire toutes les heures si travail sur écran.',
        placement: 'active_wait',
      },
    ],
  },

  // =========================================================================
  // 29. CERVICAL RADICULOPATHY (Radiculopathie cervicale)
  // =========================================================================
  {
    targetZone: 'neck',
    conditionName: 'Radiculopathie cervicale',
    frequency: 'daily',
    priority: 1,
    progressionCriteria:
      'Phase 1 (aiguë) : nerve gliding très doux, chin tucks, éviter les positions qui aggravent. Phase 2 : étirements progressifs et renforcement postural. Phase 3 : retour aux activités normales avec maintien de la posture. ATTENTION : arrêter immédiatement tout exercice qui augmente les symptômes radiants (douleur, engourdissement, faiblesse dans le bras). Quand les symptômes radiants ont disparu depuis 4 semaines, réduire à un programme d\'entretien. Objectif : 0 symptôme radiant et amplitude cervicale fonctionnelle.',
    exercises: [
      {
        exerciseName: 'Nerve gliding cervical (median/radial/ulnar)',
        sets: 2,
        reps: '5-10',
        intensity: 'very_light',
        notes:
          'Glissements doux du nerf affecté. Mouvement TRÈS LENT et contrôlé. ARRÊTER IMMÉDIATEMENT si les symptômes augmentent (douleur, engourdissement, fourmillements). Le nerf doit glisser, pas être étiré. Faire 2-3x par jour si bien toléré.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Chin tuck (rétraction cervicale)',
        sets: 3,
        reps: '10-15',
        intensity: 'very_light',
        notes:
          'Exercice fondamental. Ouvre l\'espace des foramen intervertébraux et réduit la compression nerveuse. Rentrer le menton, tenir 5-8 secondes. Faire plusieurs fois par jour. Peut soulager immédiatement les symptômes.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Étirement trapèze supérieur (doux)',
        sets: 3,
        reps: '20-30 sec/côté',
        intensity: 'very_light',
        notes:
          'Version très douce. Incliner la tête vers l\'épaule SANS forcer. Si les symptômes radiants apparaissent, réduire l\'amplitude ou arrêter. Relâche les tensions musculaires qui peuvent contribuer à la compression.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Rétraction scapulaire (posture)',
        sets: 3,
        reps: '10-15',
        intensity: 'very_light',
        notes:
          'Serrer les omoplates ensemble et vers le bas, maintenir 5 secondes. Améliore la posture et réduit la tension sur la région cervicale. Peut être fait assis au bureau. Faire plusieurs fois par jour.',
        placement: 'active_wait',
      },
      {
        exerciseName: 'Exercices posturaux (wall angel modifié)',
        sets: 2,
        reps: '8-10',
        intensity: 'very_light',
        notes:
          'Dos contre le mur, chin tuck, faire glisser les bras vers le haut (amplitude limitée selon tolérance). Améliore la posture thoracique et cervicale. Arrêter si symptômes radiants.',
        placement: 'active_wait',
      },
      {
        exerciseName: 'Auto-massage sous-occipitaux',
        sets: 2,
        reps: '60 sec',
        intensity: 'very_light',
        notes:
          'Avec les doigts ou une balle, masser doucement la base du crâne. Relâche les tensions des muscles sous-occipitaux qui peuvent contribuer aux symptômes. Pression légère, ne jamais forcer.',
        placement: 'cooldown',
      },
    ],
  },

  // =========================================================================
  // 30. TENSION HEADACHE (Céphalée de tension)
  // =========================================================================
  {
    targetZone: 'neck',
    conditionName: 'Céphalée de tension',
    frequency: 'daily',
    priority: 2,
    progressionCriteria:
      'Exercices à faire quotidiennement et lors de l\'apparition des symptômes. Quand la fréquence des céphalées diminue significativement (< 1/semaine) et que la tension musculaire est bien contrôlée, réduire à un programme d\'entretien (3x/semaine). Objectif : réduction de la fréquence et de l\'intensité des céphalées, meilleure gestion de la tension musculaire cervicale.',
    exercises: [
      {
        exerciseName: 'Release trapèze supérieur (auto-massage)',
        sets: 2,
        reps: '60-90 sec/côté',
        intensity: 'very_light',
        notes:
          'Utiliser les doigts ou une balle pour masser le trapèze supérieur (entre le cou et l\'épaule). Insister sur les points de tension (trigger points). Pression modérée, respirer profondément. Faire dès l\'apparition des symptômes.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Release sous-occipitaux (suboccipital release)',
        sets: 2,
        reps: '60-90 sec',
        intensity: 'very_light',
        notes:
          'Couché sur le dos, placer deux balles de tennis (ou une balle double type peanut) sous la base du crâne. Laisser le poids de la tête créer la pression. Relâche les muscles sous-occipitaux, source fréquente des céphalées de tension.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Chin tuck (rétraction cervicale)',
        sets: 3,
        reps: '10-15',
        intensity: 'very_light',
        notes:
          'Rentrer le menton vers l\'arrière, tenir 5-8 secondes. Corrige la posture de tête avancée qui contribue aux céphalées de tension. Faire plusieurs fois par jour, surtout si travail sur écran.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Étirement cervical latéral',
        sets: 3,
        reps: '30 sec/côté',
        intensity: 'very_light',
        notes:
          'Incliner la tête vers l\'épaule, main sur la tête pour appui léger. Abaisser l\'épaule opposée. Étire le trapèze supérieur et les scalènes. Respirer profondément pendant l\'étirement.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Étirement cervical postérieur',
        sets: 3,
        reps: '30 sec',
        intensity: 'very_light',
        notes:
          'Mains derrière la tête, baisser doucement le menton vers la poitrine. Étire les muscles postérieurs du cou (semi-épineux, splénius). Ne pas forcer, laisser le poids des bras créer l\'étirement.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Rotation cervicale douce',
        sets: 2,
        reps: '10/côté',
        intensity: 'very_light',
        notes:
          'Tourner lentement la tête d\'un côté puis de l\'autre. Maintenir quelques secondes en fin de mouvement. Relâche les tensions et maintient la mobilité cervicale.',
        placement: 'active_wait',
      },
    ],
  },

  // =========================================================================
  // 31. THORACIC STIFFNESS (Rigidité thoracique)
  // =========================================================================
  {
    targetZone: 'upper_back',
    conditionName: 'Rigidité thoracique',
    frequency: 'daily',
    priority: 2,
    progressionCriteria:
      'Quand la mobilité thoracique est améliorée (wall angel avec contact complet des mains, rotation thoracique symétrique > 45°), réduire à un programme d\'entretien (3x/semaine). Maintenir la mobilité acquise avec des exercices réguliers, surtout si travail sédentaire. Objectif : extension et rotation thoracique complètes sans raideur ni douleur.',
    exercises: [
      {
        exerciseName: 'Extension thoracique foam roller',
        sets: 2,
        reps: '10-15',
        intensity: 'light',
        notes:
          'Foam roller perpendiculaire sous le milieu du dos, mains derrière la tête. Faire des extensions en arrière, segment par segment. Améliore l\'extension thoracique souvent limitée par la position assise prolongée. Faire quotidiennement.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Cat-cow (chat-vache)',
        sets: 2,
        reps: '10-15',
        intensity: 'very_light',
        notes:
          'À quatre pattes, alterner entre flexion (dos rond, tête vers le bas) et extension (dos creux, tête vers le haut). Mouvements lents, synchronisés avec la respiration. Excellent pour la mobilité globale du rachis.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Thread the needle (rotation thoracique)',
        sets: 3,
        reps: '8-10/côté',
        intensity: 'very_light',
        notes:
          'À quatre pattes, passer un bras sous le corps en tournant le thorax, puis ouvrir vers le plafond. Mouvements lents et contrôlés. Améliore la rotation thoracique. Excellent échauffement avant les exercices overhead.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Open book (rotation couché)',
        sets: 3,
        reps: '8-10/côté',
        intensity: 'very_light',
        notes:
          'Couché sur le côté, genoux fléchis à 90°. Ouvrir le bras supérieur vers le côté opposé en tournant le thorax. Les genoux restent ensemble pour isoler la rotation thoracique. Maintenir la position ouverte 3-5 secondes.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Wall angel (ange au mur)',
        sets: 3,
        reps: '10-12',
        intensity: 'light',
        notes:
          'Dos contre le mur, chin tuck, faire glisser les bras vers le haut en gardant le contact avec le mur. Diagnostic et exercice de mobilité thoracique. Si impossible de garder le contact, la mobilité thoracique est insuffisante.',
        placement: 'active_wait',
      },
      {
        exerciseName: 'Étirement pectoral doorway',
        sets: 3,
        reps: '30-45 sec',
        intensity: 'very_light',
        notes:
          'Dans un cadre de porte, avant-bras sur les montants, avancer le corps. 3 positions : coudes bas, à 90°, hauts pour les différentes fibres pectorales. Les pectoraux raccourcis contribuent à la cyphose et à la rigidité thoracique.',
        placement: 'cooldown',
      },
    ],
  },

  // =========================================================================
  // 32. POSTURAL UPPER BACK PAIN (Douleur posturale dos haut)
  // =========================================================================
  {
    targetZone: 'upper_back',
    conditionName: 'Douleur posturale dos haut',
    frequency: 'every_session',
    priority: 2,
    progressionCriteria:
      'Chin tucks : progresser vers une résistance (main contre le menton). Face pulls et retractions : augmenter la résistance progressivement. Wall angels : augmenter l\'amplitude. Quand capable de maintenir une bonne posture pendant 8 heures de travail sans fatigue significative, réduire à un programme d\'entretien (3x/semaine). Objectif : posture neutre automatique, 0 douleur entre les omoplates ou au niveau des trapèzes.',
    exercises: [
      {
        exerciseName: 'Rétraction scapulaire (scapular squeeze)',
        sets: 3,
        reps: '15-20',
        intensity: 'very_light',
        notes:
          'Serrer les omoplates ensemble et vers le bas, maintenir 5 secondes. Exercice fondamental pour la posture. Renforce les rhomboïdes et le trapèze moyen/inférieur. Faire plusieurs fois par jour, surtout si travail sur écran.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Face pull (câble ou bande)',
        sets: 3,
        reps: '15-20',
        intensity: 'light',
        notes:
          'Tirer vers le visage puis rotation externe en fin de mouvement. Renforce les rotateurs externes et les rétracteurs scapulaires. Ratio recommandé : 1 série pour chaque série de poussée. Excellent en super-set avec le développé couché.',
        placement: 'active_wait',
      },
      {
        exerciseName: 'Wall angel (ange au mur)',
        sets: 3,
        reps: '10-12',
        intensity: 'light',
        notes:
          'Dos contre le mur, chin tuck, faire glisser les bras vers le haut en gardant le contact. Corrige la posture antérieure des épaules et la tête avancée simultanément. Faire avant les exercices de poussée.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Chin tuck (rétraction cervicale)',
        sets: 3,
        reps: '10-15',
        intensity: 'very_light',
        notes:
          'Rentrer le menton vers l\'arrière, tenir 5-8 secondes. Corrige la tête avancée qui accompagne souvent les épaules en avant. Faire au minimum 3x par jour. Ajouter une résistance avec la main quand facile.',
        placement: 'warmup',
      },
      {
        exerciseName: 'Étirement pectoral (doorway stretch)',
        sets: 3,
        reps: '30-45 sec',
        intensity: 'very_light',
        notes:
          'Les pectoraux raccourcis tirent les épaules vers l\'avant. Étirer dans le cadre d\'une porte à 3 angles différents. Faire après chaque séance et les jours de repos.',
        placement: 'cooldown',
      },
      {
        exerciseName: 'Band pull-apart',
        sets: 3,
        reps: '15-20',
        intensity: 'light',
        notes:
          'Bande devant, bras tendus, écarter en serrant les omoplates. Excellent en super-set avec les exercices de poussée. Bande légère à moyenne. Serrer les omoplates 2 secondes à chaque répétition.',
        placement: 'active_wait',
      },
    ],
  },

  // =========================================================================
  // 33. MAUVAISE POSTURE GÉNÉRALE
  // =========================================================================
  {
    targetZone: 'upper_back',
    conditionName: 'Mauvaise posture générale',
    frequency: 'daily',
    priority: 3,
    progressionCriteria: 'Quand les exercices sont réalisés sans difficulté et que la posture s\'améliore au quotidien, maintenir en entretien 3x/semaine.',
    exercises: [
      {
        exerciseName: 'Chin tuck (rétraction cervicale)',
        sets: 3,
        reps: '10-15',
        intensity: 'very_light',
        notes: 'Rentrer le menton en créant un "double menton", comme pour éloigner la tête du téléphone. Tenir 5 secondes. Renforce les muscles profonds du cou et corrige la posture "tête en avant".',
        placement: 'rest_day',
      },
      {
        exerciseName: 'Wall angel (ange au mur)',
        sets: 2,
        reps: '10-12',
        intensity: 'light',
        notes: 'Dos, tête et fesses contre le mur. Bras en position de "stick-up" (90°), glisser les bras vers le haut en gardant le contact avec le mur. Excellent pour la mobilité des épaules et la posture thoracique.',
        placement: 'rest_day',
      },
      {
        exerciseName: 'Band pull-apart',
        sets: 3,
        reps: '15-20',
        intensity: 'light',
        notes: 'Bras tendus devant, tirer la bande élastique en écartant les bras sur les côtés. Serrer les omoplates à la fin du mouvement. Renforce les muscles du haut du dos essentiels à une bonne posture.',
        placement: 'rest_day',
      },
      {
        exerciseName: 'Thoracic extensions (extensions thoraciques)',
        sets: 2,
        reps: '10-12',
        intensity: 'light',
        notes: 'Sur un foam roller au niveau du haut du dos, mains derrière la tête. Étendre le dos sur le rouleau en ouvrant la poitrine. Mouvement contrôlé, ne pas hyper-étendre le bas du dos.',
        placement: 'rest_day',
      },
      {
        exerciseName: 'Étirement pectoral (doorway stretch)',
        sets: 2,
        reps: '30-45 sec',
        intensity: 'light',
        notes: 'Avant-bras contre le cadre d\'une porte, coude à 90°. Avancer doucement pour étirer le pectoral. Faire les deux côtés. Contrebalance la posture "épaules en avant" causée par la position assise.',
        placement: 'rest_day',
      },
    ],
  },
]
