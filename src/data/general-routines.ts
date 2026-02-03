import type { RehabExercise } from './rehab-protocols'

/**
 * General mobility and posture exercises for users without specific conditions.
 * These are used when users have mobility/posture goals but no health conditions.
 *
 * Structure matches RehabExercise for consistency with the rest-day routine system.
 */

export const generalMobilityExercises: RehabExercise[] = [
  {
    exerciseName: 'Hip flexor stretch (fléchisseurs de hanche)',
    sets: 2,
    reps: '30-45 sec',
    intensity: 'light',
    notes:
      'Position de fente basse, genou arrière au sol. Garder le buste droit et engager les fessiers pour accentuer l\'étirement. Alterner les deux côtés. Excellent pour contrer les effets de la position assise prolongée.',
    placement: 'rest_day',
  },
  {
    exerciseName: 'Hamstring stretch (ischio-jambiers)',
    sets: 2,
    reps: '30-45 sec',
    intensity: 'light',
    notes:
      'Jambe tendue sur un support (marche, banc) ou en position assise. Ne pas forcer — aller jusqu\'à la sensation d\'étirement sans douleur. Maintenir le dos droit pour cibler les ischio-jambiers.',
    placement: 'rest_day',
  },
  {
    exerciseName: 'Thoracic spine rotation (rotation thoracique)',
    sets: 2,
    reps: '8-10 par côté',
    intensity: 'light',
    notes:
      'En position 4 pattes ou assis. Placer une main derrière la tête et tourner le coude vers le plafond en ouvrant la poitrine. Mouvement contrôlé, ne pas forcer l\'amplitude. Excellent pour la mobilité du haut du dos.',
    placement: 'rest_day',
  },
  {
    exerciseName: 'Shoulder dislocates (désarticulés épaules)',
    sets: 2,
    reps: '10-15',
    intensity: 'very_light',
    notes:
      'Avec une bande élastique ou un bâton, prise large. Passer les bras de l\'avant vers l\'arrière en gardant les coudes tendus. Commencer avec une prise très large et réduire progressivement. Améliore la mobilité globale des épaules.',
    placement: 'rest_day',
  },
  {
    exerciseName: 'Ankle mobility circles (cercles de cheville)',
    sets: 2,
    reps: '10 par sens',
    intensity: 'very_light',
    notes:
      'En position assise ou debout sur une jambe, tracer de grands cercles avec le pied. Faire les deux sens (horaire et anti-horaire) pour chaque cheville. Améliore la mobilité et la proprioception.',
    placement: 'rest_day',
  },
  {
    exerciseName: 'Cat-cow (chat-vache)',
    sets: 2,
    reps: '8-10',
    intensity: 'very_light',
    notes:
      'En position 4 pattes, alterner entre dos rond (chat) et dos cambré (vache). Mouvement fluide et contrôlé, synchronisé avec la respiration. Excellent pour la mobilité générale de la colonne vertébrale.',
    placement: 'rest_day',
  },
]

export const generalPostureExercises: RehabExercise[] = [
  {
    exerciseName: 'Chin tucks (rétraction cervicale)',
    sets: 3,
    reps: '10-15',
    intensity: 'very_light',
    notes:
      'Rentrer le menton en créant un "double menton", comme pour éloigner la tête du téléphone. Tenir 5 secondes. Renforce les muscles profonds du cou et corrige la posture "tête en avant".',
    placement: 'rest_day',
  },
  {
    exerciseName: 'Wall angels (anges au mur)',
    sets: 2,
    reps: '10-12',
    intensity: 'light',
    notes:
      'Dos, tête et fesses contre le mur. Bras en position de "stick-up" (90°), glisser les bras vers le haut en gardant le contact avec le mur. Excellent pour la mobilité des épaules et la posture thoracique.',
    placement: 'rest_day',
  },
  {
    exerciseName: 'Band pull-aparts (écartés avec bande)',
    sets: 3,
    reps: '15-20',
    intensity: 'light',
    notes:
      'Bras tendus devant, tirer la bande élastique en écartant les bras sur les côtés. Serrer les omoplates à la fin du mouvement. Renforce les muscles du haut du dos essentiels à une bonne posture.',
    placement: 'rest_day',
  },
  {
    exerciseName: 'Thoracic extensions (extensions thoraciques)',
    sets: 2,
    reps: '10-12',
    intensity: 'light',
    notes:
      'Sur un foam roller placé au niveau du haut du dos, mains derrière la tête. Étendre le dos sur le rouleau en ouvrant la poitrine. Mouvement contrôlé, ne pas hyper-étendre le bas du dos.',
    placement: 'rest_day',
  },
  {
    exerciseName: 'Doorway chest stretch (étirement pectoral)',
    sets: 2,
    reps: '30-45 sec',
    intensity: 'light',
    notes:
      'Avant-bras contre le cadre d\'une porte, coude à 90°. Avancer doucement pour étirer le pectoral. Faire les deux côtés. Contrebalance la posture "épaules en avant" causée par la position assise.',
    placement: 'rest_day',
  },
]
