import type { BodyZone } from '../db/types'

/**
 * Questionnaire intelligent pour le diagnostic des symptomes.
 *
 * Ce systeme pose des questions specifiques pour identifier
 * plus precisement la condition et matcher le bon protocole de rehab.
 */

export interface SymptomQuestion {
  id: string
  /** Zones du corps auxquelles cette question s'applique */
  bodyZones: BodyZone[]
  /** Question en francais */
  question: string
  options: {
    id: string
    label: string
    /** Indicateurs de condition suggeres par cette reponse */
    indicators: string[]
  }[]
  /** Permet de selectionner plusieurs options */
  multiSelect: boolean
  /** Ordre d'affichage (plus petit = plus tot) */
  order: number
}

export interface ConditionMapping {
  /** Nom de la condition en francais */
  conditionName: string
  /** Zone cible */
  targetZone: BodyZone
  /** Tous ces indicateurs doivent etre presents */
  requiredIndicators: string[]
  /** Indicateurs bonus qui augmentent la confiance */
  suggestedIndicators: string[]
  /** ID du protocole de rehab correspondant (conditionName dans rehabProtocols) */
  protocolConditionName: string
  /** Score de priorite (plus eleve = plus prioritaire en cas de match egal) */
  priority: number
}

// =============================================================================
// QUESTIONS PAR ZONE
// =============================================================================

export const symptomQuestions: SymptomQuestion[] = [
  // =========================================================================
  // PIED (foot_left, foot_right)
  // =========================================================================
  {
    id: 'foot_location',
    bodyZones: ['foot_left', 'foot_right'],
    question: 'Ou avez-vous mal exactement ?',
    options: [
      { id: 'arch', label: 'Sous le pied (voute plantaire)', indicators: ['location_arch', 'plantar'] },
      { id: 'heel', label: 'Talon', indicators: ['location_heel', 'plantar'] },
      { id: 'outer', label: 'Bord externe du pied', indicators: ['location_outer', 'peroneal'] },
      { id: 'dorsal', label: 'Dessus du pied', indicators: ['location_dorsal', 'extensor'] },
      { id: 'toes', label: 'Orteils', indicators: ['location_toes'] },
    ],
    multiSelect: true,
    order: 1,
  },
  {
    id: 'foot_timing',
    bodyZones: ['foot_left', 'foot_right'],
    question: 'Quand est-ce que ca fait mal ?',
    options: [
      { id: 'morning', label: 'Le matin, aux premiers pas', indicators: ['timing_morning', 'plantar_fasciitis'] },
      { id: 'standing', label: 'Apres station debout prolongee', indicators: ['timing_standing', 'plantar'] },
      { id: 'walking', label: 'Apres longue marche', indicators: ['timing_walking'] },
      { id: 'exercise', label: 'Pendant l\'exercice', indicators: ['timing_exercise'] },
      { id: 'always', label: 'Tout le temps', indicators: ['timing_constant', 'chronic'] },
    ],
    multiSelect: true,
    order: 2,
  },
  {
    id: 'foot_pain_type',
    bodyZones: ['foot_left', 'foot_right'],
    question: 'Quel type de douleur ressentez-vous ?',
    options: [
      { id: 'pulling', label: 'Tension / tiraillement', indicators: ['pain_tension', 'tendon'] },
      { id: 'electric', label: 'Decharges electriques / picotements', indicators: ['pain_electric', 'nerve', 'tibial_nerve'] },
      { id: 'dull', label: 'Douleur diffuse / sourde', indicators: ['pain_diffuse', 'chronic'] },
      { id: 'sharp', label: 'Douleur vive / point precis', indicators: ['pain_sharp', 'acute'] },
      { id: 'burning', label: 'Brulure', indicators: ['pain_burning', 'nerve'] },
    ],
    multiSelect: true,
    order: 3,
  },
  {
    id: 'foot_history',
    bodyZones: ['foot_left', 'foot_right'],
    question: 'Avez-vous des antecedents ?',
    options: [
      { id: 'flat_feet', label: 'Pieds plats', indicators: ['history_flat_feet', 'flat_feet'] },
      { id: 'high_arch', label: 'Pieds creux', indicators: ['history_high_arch'] },
      { id: 'sprain', label: 'Entorse ancienne', indicators: ['history_sprain', 'instability'] },
      { id: 'arthritis', label: 'Arthrite / arthrose', indicators: ['history_arthritis', 'arthritis'] },
      { id: 'none', label: 'Aucun', indicators: [] },
    ],
    multiSelect: true,
    order: 4,
  },

  // =========================================================================
  // GENOU (knee_left, knee_right)
  // =========================================================================
  {
    id: 'knee_location',
    bodyZones: ['knee_left', 'knee_right'],
    question: 'Ou avez-vous mal exactement ?',
    options: [
      { id: 'front', label: 'Devant le genou / rotule', indicators: ['location_front', 'patellofemoral'] },
      { id: 'below', label: 'Sous la rotule', indicators: ['location_below_patella', 'patellar_tendon'] },
      { id: 'inner', label: 'Cote interne', indicators: ['location_inner', 'medial'] },
      { id: 'outer', label: 'Cote externe', indicators: ['location_outer', 'lateral', 'itb'] },
      { id: 'back', label: 'Arriere du genou', indicators: ['location_back', 'popliteal'] },
    ],
    multiSelect: true,
    order: 1,
  },
  {
    id: 'knee_timing',
    bodyZones: ['knee_left', 'knee_right'],
    question: 'Quand est-ce que ca fait mal ?',
    options: [
      { id: 'stairs_down', label: 'En descendant les escaliers', indicators: ['timing_stairs_down', 'patellofemoral', 'eccentric'] },
      { id: 'stairs_up', label: 'En montant les escaliers', indicators: ['timing_stairs_up'] },
      { id: 'squat', label: 'En squat / accroupi', indicators: ['timing_squat', 'load'] },
      { id: 'sitting', label: 'Apres position assise prolongee', indicators: ['timing_sitting', 'patellofemoral'] },
      { id: 'running', label: 'Pendant la course', indicators: ['timing_running', 'patellar_tendon'] },
      { id: 'jumping', label: 'En sautant', indicators: ['timing_jumping', 'patellar_tendon', 'jumpers_knee'] },
    ],
    multiSelect: true,
    order: 2,
  },
  {
    id: 'knee_symptoms',
    bodyZones: ['knee_left', 'knee_right'],
    question: 'Autres symptomes ?',
    options: [
      { id: 'swelling', label: 'Gonflement', indicators: ['symptom_swelling', 'inflammation'] },
      { id: 'cracking', label: 'Craquements', indicators: ['symptom_cracking'] },
      { id: 'instability', label: 'Sensation d\'instabilite', indicators: ['symptom_instability', 'ligament'] },
      { id: 'locking', label: 'Blocages', indicators: ['symptom_locking', 'meniscus'] },
      { id: 'none', label: 'Aucun', indicators: [] },
    ],
    multiSelect: true,
    order: 3,
  },

  // =========================================================================
  // EPAULE (shoulder_left, shoulder_right)
  // =========================================================================
  {
    id: 'shoulder_location',
    bodyZones: ['shoulder_left', 'shoulder_right'],
    question: 'Ou avez-vous mal exactement ?',
    options: [
      { id: 'front', label: 'Devant l\'epaule', indicators: ['location_front', 'anterior'] },
      { id: 'side', label: 'Sur le cote', indicators: ['location_side', 'lateral', 'rotator_cuff'] },
      { id: 'top', label: 'Sur le dessus', indicators: ['location_top', 'ac_joint'] },
      { id: 'back', label: 'Arriere de l\'epaule', indicators: ['location_back', 'posterior'] },
      { id: 'deep', label: 'En profondeur', indicators: ['location_deep', 'rotator_cuff'] },
    ],
    multiSelect: true,
    order: 1,
  },
  {
    id: 'shoulder_movement',
    bodyZones: ['shoulder_left', 'shoulder_right'],
    question: 'Quel mouvement fait mal ?',
    options: [
      { id: 'overhead', label: 'Lever le bras au-dessus de la tete', indicators: ['movement_overhead', 'impingement', 'rotator_cuff'] },
      { id: 'behind_back', label: 'Mettre la main dans le dos', indicators: ['movement_behind_back', 'internal_rotation'] },
      { id: 'push', label: 'Pousser (developpe)', indicators: ['movement_push', 'anterior'] },
      { id: 'pull', label: 'Tirer (rowing)', indicators: ['movement_pull', 'posterior'] },
      { id: 'rotation_ext', label: 'Rotation externe', indicators: ['movement_rotation_ext', 'rotator_cuff'] },
      { id: 'lying', label: 'La nuit, couche dessus', indicators: ['movement_lying', 'rotator_cuff', 'bursitis'] },
    ],
    multiSelect: true,
    order: 2,
  },
  {
    id: 'shoulder_pain_type',
    bodyZones: ['shoulder_left', 'shoulder_right'],
    question: 'Quel type de douleur ?',
    options: [
      { id: 'sharp_arc', label: 'Douleur vive a un angle precis', indicators: ['pain_arc', 'impingement'] },
      { id: 'dull', label: 'Douleur diffuse / constante', indicators: ['pain_diffuse', 'chronic'] },
      { id: 'catching', label: 'Accrochage / cliquetis', indicators: ['pain_catching', 'labrum', 'biceps'] },
      { id: 'weakness', label: 'Faiblesse sans douleur majeure', indicators: ['symptom_weakness', 'rotator_cuff'] },
    ],
    multiSelect: true,
    order: 3,
  },

  // =========================================================================
  // COUDE (elbow_left, elbow_right)
  // =========================================================================
  {
    id: 'elbow_location',
    bodyZones: ['elbow_left', 'elbow_right'],
    question: 'Ou avez-vous mal exactement ?',
    options: [
      { id: 'outer', label: 'Cote externe (vers le pouce)', indicators: ['location_outer', 'lateral', 'tennis_elbow'] },
      { id: 'inner', label: 'Cote interne (vers l\'auriculaire)', indicators: ['location_inner', 'medial', 'golf_elbow'] },
      { id: 'back', label: 'Arriere du coude', indicators: ['location_back', 'triceps', 'olecranon'] },
      { id: 'front', label: 'Devant le coude', indicators: ['location_front', 'biceps'] },
    ],
    multiSelect: true,
    order: 1,
  },
  {
    id: 'elbow_trigger',
    bodyZones: ['elbow_left', 'elbow_right'],
    question: 'Qu\'est-ce qui declenche la douleur ?',
    options: [
      { id: 'grip', label: 'Serrer / tenir un objet', indicators: ['trigger_grip', 'epicondylitis'] },
      { id: 'wrist_ext', label: 'Extension du poignet', indicators: ['trigger_wrist_ext', 'tennis_elbow'] },
      { id: 'wrist_flex', label: 'Flexion du poignet', indicators: ['trigger_wrist_flex', 'golf_elbow'] },
      { id: 'pronation', label: 'Tourner la paume vers le bas', indicators: ['trigger_pronation'] },
      { id: 'supination', label: 'Tourner la paume vers le haut', indicators: ['trigger_supination'] },
      { id: 'push', label: 'Exercices de poussee', indicators: ['trigger_push'] },
      { id: 'pull', label: 'Exercices de tirage', indicators: ['trigger_pull', 'epicondylitis'] },
    ],
    multiSelect: true,
    order: 2,
  },
  {
    id: 'elbow_symptoms',
    bodyZones: ['elbow_left', 'elbow_right'],
    question: 'Autres symptomes ?',
    options: [
      { id: 'tingling', label: 'Picotements / engourdissement', indicators: ['symptom_tingling', 'nerve', 'ulnar'] },
      { id: 'weakness', label: 'Faiblesse de prise', indicators: ['symptom_weakness', 'chronic'] },
      { id: 'stiffness', label: 'Raideur le matin', indicators: ['symptom_stiffness'] },
      { id: 'none', label: 'Aucun', indicators: [] },
    ],
    multiSelect: true,
    order: 3,
  },

  // =========================================================================
  // BAS DU DOS (lower_back)
  // =========================================================================
  {
    id: 'lower_back_location',
    bodyZones: ['lower_back'],
    question: 'Ou avez-vous mal exactement ?',
    options: [
      { id: 'center', label: 'Centre du dos', indicators: ['location_center', 'disc', 'muscular'] },
      { id: 'side_left', label: 'Cote gauche', indicators: ['location_side', 'muscular', 'facet'] },
      { id: 'side_right', label: 'Cote droit', indicators: ['location_side', 'muscular', 'facet'] },
      { id: 'buttock', label: 'Irradie vers la fesse', indicators: ['location_buttock', 'sciatica', 'piriformis'] },
      { id: 'leg', label: 'Irradie dans la jambe', indicators: ['location_leg', 'sciatica', 'disc', 'radicular'] },
    ],
    multiSelect: true,
    order: 1,
  },
  {
    id: 'lower_back_timing',
    bodyZones: ['lower_back'],
    question: 'Quand est-ce que ca fait mal ?',
    options: [
      { id: 'morning', label: 'Le matin au reveil', indicators: ['timing_morning', 'disc'] },
      { id: 'sitting', label: 'Position assise prolongee', indicators: ['timing_sitting', 'disc', 'postural'] },
      { id: 'standing', label: 'Position debout prolongee', indicators: ['timing_standing', 'facet'] },
      { id: 'bending', label: 'En se penchant en avant', indicators: ['timing_bending', 'disc', 'flexion'] },
      { id: 'extension', label: 'En se cambrant', indicators: ['timing_extension', 'facet', 'stenosis'] },
      { id: 'lifting', label: 'En soulevant une charge', indicators: ['timing_lifting', 'disc', 'muscular'] },
    ],
    multiSelect: true,
    order: 2,
  },
  {
    id: 'lower_back_pain_type',
    bodyZones: ['lower_back'],
    question: 'Quel type de douleur ?',
    options: [
      { id: 'sharp', label: 'Douleur vive / blocage', indicators: ['pain_sharp', 'acute', 'disc'] },
      { id: 'dull', label: 'Douleur sourde / constante', indicators: ['pain_dull', 'chronic', 'muscular'] },
      { id: 'electric', label: 'Decharge electrique dans la jambe', indicators: ['pain_electric', 'sciatica', 'radicular'] },
      { id: 'numbness', label: 'Engourdissement / fourmillements', indicators: ['symptom_numbness', 'nerve', 'radicular'] },
      { id: 'muscle_spasm', label: 'Spasmes musculaires', indicators: ['pain_spasm', 'muscular', 'acute'] },
    ],
    multiSelect: true,
    order: 3,
  },
  {
    id: 'lower_back_relief',
    bodyZones: ['lower_back'],
    question: 'Qu\'est-ce qui soulage ?',
    options: [
      { id: 'lying', label: 'S\'allonger', indicators: ['relief_lying', 'disc'] },
      { id: 'walking', label: 'Marcher', indicators: ['relief_walking', 'disc', 'mckenzie'] },
      { id: 'sitting', label: 'S\'asseoir', indicators: ['relief_sitting', 'stenosis'] },
      { id: 'extension', label: 'Se cambrer / extension', indicators: ['relief_extension', 'disc', 'mckenzie'] },
      { id: 'flexion', label: 'Se pencher en avant', indicators: ['relief_flexion', 'stenosis', 'facet'] },
      { id: 'nothing', label: 'Rien ne soulage', indicators: ['relief_none', 'chronic'] },
    ],
    multiSelect: true,
    order: 4,
  },

  // =========================================================================
  // HAUT DU DOS (upper_back)
  // =========================================================================
  {
    id: 'upper_back_location',
    bodyZones: ['upper_back'],
    question: 'Ou avez-vous mal exactement ?',
    options: [
      { id: 'between_blades', label: 'Entre les omoplates', indicators: ['location_interscapular', 'postural', 'thoracic'] },
      { id: 'spine', label: 'Le long de la colonne', indicators: ['location_spine', 'thoracic', 'vertebral'] },
      { id: 'sides', label: 'Sur les cotes (musculature laterale)', indicators: ['location_sides', 'rib', 'muscular'] },
    ],
    multiSelect: true,
    order: 1,
  },
  {
    id: 'upper_back_trigger',
    bodyZones: ['upper_back'],
    question: 'Qu\'est-ce qui declenche ou aggrave la douleur ?',
    options: [
      { id: 'sitting', label: 'Position assise prolongee', indicators: ['trigger_sitting', 'postural', 'thoracic_stiffness'] },
      { id: 'posture', label: 'Mauvaise posture (epaules en avant)', indicators: ['trigger_posture', 'postural', 'thoracic_stiffness'] },
      { id: 'breathing', label: 'Respiration profonde', indicators: ['trigger_breathing', 'rib', 'rib_dysfunction'] },
      { id: 'rotation', label: 'Rotation du tronc', indicators: ['trigger_rotation', 'thoracic', 'rib'] },
      { id: 'reaching', label: 'Lever les bras', indicators: ['trigger_reaching', 'thoracic_stiffness'] },
    ],
    multiSelect: true,
    order: 2,
  },
  {
    id: 'upper_back_pain_type',
    bodyZones: ['upper_back'],
    question: 'Quel type de douleur ressentez-vous ?',
    options: [
      { id: 'stiffness', label: 'Raideur / tension', indicators: ['pain_stiffness', 'thoracic_stiffness', 'postural'] },
      { id: 'dull', label: 'Douleur sourde / diffuse', indicators: ['pain_dull', 'postural', 'chronic'] },
      { id: 'sharp', label: 'Douleur vive / ponctuelle', indicators: ['pain_sharp', 'rib_dysfunction', 'acute'] },
      { id: 'burning', label: 'Sensation de brulure', indicators: ['pain_burning', 'postural', 'nerve'] },
    ],
    multiSelect: true,
    order: 3,
  },

  // =========================================================================
  // HANCHE (hip_left, hip_right)
  // =========================================================================
  {
    id: 'hip_location',
    bodyZones: ['hip_left', 'hip_right'],
    question: 'Ou avez-vous mal exactement ?',
    options: [
      { id: 'front', label: 'Devant la hanche / aine', indicators: ['location_front', 'hip_flexor', 'labral'] },
      { id: 'side', label: 'Sur le cote (trochanter)', indicators: ['location_side', 'bursitis', 'gluteal'] },
      { id: 'back', label: 'Arriere / fesse', indicators: ['location_back', 'piriformis', 'sciatica'] },
      { id: 'deep', label: 'En profondeur dans l\'articulation', indicators: ['location_deep', 'labral', 'articular'] },
    ],
    multiSelect: true,
    order: 1,
  },
  {
    id: 'hip_trigger',
    bodyZones: ['hip_left', 'hip_right'],
    question: 'Qu\'est-ce qui declenche ou aggrave la douleur ?',
    options: [
      { id: 'walking', label: 'Marche prolongee', indicators: ['trigger_walking', 'bursitis', 'hip_flexor'] },
      { id: 'stairs', label: 'Monter les escaliers', indicators: ['trigger_stairs', 'hip_flexor', 'labral'] },
      { id: 'sitting', label: 'Position assise prolongee', indicators: ['trigger_sitting', 'piriformis', 'hip_flexor'] },
      { id: 'rotation', label: 'Rotation de la hanche', indicators: ['trigger_rotation', 'labral', 'piriformis'] },
      { id: 'lying_side', label: 'Couche sur le cote', indicators: ['trigger_lying_side', 'bursitis'] },
      { id: 'squat', label: 'Squat profond', indicators: ['trigger_squat', 'labral', 'hip_flexor'] },
    ],
    multiSelect: true,
    order: 2,
  },
  {
    id: 'hip_symptoms',
    bodyZones: ['hip_left', 'hip_right'],
    question: 'Autres symptomes ?',
    options: [
      { id: 'clicking', label: 'Claquement / cliquetis', indicators: ['symptom_clicking', 'labral', 'snapping_hip'] },
      { id: 'stiffness', label: 'Raideur (surtout le matin)', indicators: ['symptom_stiffness', 'hip_flexor', 'articular'] },
      { id: 'weakness', label: 'Faiblesse / instabilite', indicators: ['symptom_weakness', 'gluteal', 'hip_flexor'] },
      { id: 'radiating', label: 'Douleur qui descend dans la jambe', indicators: ['symptom_radiating', 'sciatica', 'piriformis'] },
      { id: 'none', label: 'Aucun', indicators: [] },
    ],
    multiSelect: true,
    order: 3,
  },

  // =========================================================================
  // CHEVILLE (ankle_left, ankle_right)
  // =========================================================================
  {
    id: 'ankle_location',
    bodyZones: ['ankle_left', 'ankle_right'],
    question: 'Ou avez-vous mal exactement ?',
    options: [
      { id: 'front', label: 'Devant la cheville', indicators: ['location_front', 'anterior_impingement', 'tibialis_anterior'] },
      { id: 'back', label: 'Arriere (tendon d\'Achille)', indicators: ['location_back', 'achilles', 'achilles_tendinitis'] },
      { id: 'inner', label: 'Cote interne', indicators: ['location_inner', 'medial', 'tibialis_posterior'] },
      { id: 'outer', label: 'Cote externe', indicators: ['location_outer', 'lateral', 'ankle_instability', 'peroneal'] },
    ],
    multiSelect: true,
    order: 1,
  },
  {
    id: 'ankle_trigger',
    bodyZones: ['ankle_left', 'ankle_right'],
    question: 'Qu\'est-ce qui declenche ou aggrave la douleur ?',
    options: [
      { id: 'walking', label: 'Marche prolongee', indicators: ['trigger_walking', 'achilles', 'tibialis_posterior'] },
      { id: 'running', label: 'Course a pied', indicators: ['trigger_running', 'achilles_tendinitis', 'ankle_instability'] },
      { id: 'stairs', label: 'Monter/descendre les escaliers', indicators: ['trigger_stairs', 'achilles', 'anterior_impingement'] },
      { id: 'dorsiflexion', label: 'Plier la cheville (pied vers le haut)', indicators: ['trigger_dorsiflexion', 'anterior_impingement', 'achilles'] },
      { id: 'plantarflexion', label: 'Pointer le pied', indicators: ['trigger_plantarflexion', 'achilles_tendinitis'] },
      { id: 'uneven_ground', label: 'Terrain irregulier', indicators: ['trigger_uneven', 'ankle_instability'] },
    ],
    multiSelect: true,
    order: 2,
  },
  {
    id: 'ankle_history',
    bodyZones: ['ankle_left', 'ankle_right'],
    question: 'Avez-vous des antecedents ?',
    options: [
      { id: 'sprain', label: 'Entorse(s) precedente(s)', indicators: ['history_sprain', 'ankle_instability', 'chronic'] },
      { id: 'multiple_sprains', label: 'Entorses a repetition', indicators: ['history_multiple_sprains', 'ankle_instability', 'chronic'] },
      { id: 'fracture', label: 'Fracture ancienne', indicators: ['history_fracture'] },
      { id: 'none', label: 'Aucun', indicators: [] },
    ],
    multiSelect: true,
    order: 3,
  },

  // =========================================================================
  // POIGNET (wrist_left, wrist_right)
  // =========================================================================
  {
    id: 'wrist_location',
    bodyZones: ['wrist_left', 'wrist_right'],
    question: 'Ou avez-vous mal exactement ?',
    options: [
      { id: 'palm_side', label: 'Cote paume (interieur)', indicators: ['location_palm', 'carpal_tunnel', 'flexor_tendinitis'] },
      { id: 'back_side', label: 'Dos du poignet (exterieur)', indicators: ['location_dorsal', 'wrist_tendinitis', 'extensor'] },
      { id: 'thumb_side', label: 'Cote du pouce (radial)', indicators: ['location_radial', 'de_quervain', 'radial'] },
      { id: 'pinky_side', label: 'Cote auriculaire (ulnaire)', indicators: ['location_ulnar', 'tfcc', 'ulnar'] },
    ],
    multiSelect: true,
    order: 1,
  },
  {
    id: 'wrist_trigger',
    bodyZones: ['wrist_left', 'wrist_right'],
    question: 'Qu\'est-ce qui declenche ou aggrave la douleur ?',
    options: [
      { id: 'typing', label: 'Frappe au clavier / souris', indicators: ['trigger_typing', 'carpal_tunnel', 'wrist_tendinitis'] },
      { id: 'gripping', label: 'Serrer / tenir des objets', indicators: ['trigger_gripping', 'de_quervain', 'flexor_tendinitis'] },
      { id: 'rotation', label: 'Tourner le poignet', indicators: ['trigger_rotation', 'tfcc', 'de_quervain'] },
      { id: 'weight_bearing', label: 'Appui sur le poignet (pompes, planche)', indicators: ['trigger_weight_bearing', 'wrist_tendinitis', 'tfcc'] },
      { id: 'thumb_movement', label: 'Mouvements du pouce', indicators: ['trigger_thumb', 'de_quervain'] },
    ],
    multiSelect: true,
    order: 2,
  },
  {
    id: 'wrist_symptoms',
    bodyZones: ['wrist_left', 'wrist_right'],
    question: 'Autres symptomes ?',
    options: [
      { id: 'numbness', label: 'Engourdissement / picotements (doigts)', indicators: ['symptom_numbness', 'carpal_tunnel', 'nerve'] },
      { id: 'weakness', label: 'Faiblesse de prise', indicators: ['symptom_weakness', 'carpal_tunnel', 'chronic'] },
      { id: 'clicking', label: 'Cliquetis / craquements', indicators: ['symptom_clicking', 'tfcc', 'wrist_tendinitis'] },
      { id: 'swelling', label: 'Gonflement', indicators: ['symptom_swelling', 'inflammation'] },
      { id: 'night_symptoms', label: 'Symptomes nocturnes (reveils)', indicators: ['symptom_night', 'carpal_tunnel'] },
      { id: 'none', label: 'Aucun', indicators: [] },
    ],
    multiSelect: true,
    order: 3,
  },

  // =========================================================================
  // COU (neck)
  // =========================================================================
  {
    id: 'neck_location',
    bodyZones: ['neck'],
    question: 'Ou avez-vous mal exactement ?',
    options: [
      { id: 'back', label: 'Arriere du cou', indicators: ['location_back', 'cervicalgia', 'postural'] },
      { id: 'sides', label: 'Sur les cotes', indicators: ['location_sides', 'muscular', 'tension'] },
      { id: 'base_skull', label: 'Base du crane', indicators: ['location_base_skull', 'tension_headache', 'suboccipital'] },
    ],
    multiSelect: true,
    order: 1,
  },
  {
    id: 'neck_trigger',
    bodyZones: ['neck'],
    question: 'Qu\'est-ce qui declenche ou aggrave la douleur ?',
    options: [
      { id: 'looking_up', label: 'Regarder vers le haut', indicators: ['trigger_looking_up', 'cervicalgia', 'facet'] },
      { id: 'looking_down', label: 'Regarder vers le bas (telephone, livre)', indicators: ['trigger_looking_down', 'postural_strain', 'cervicalgia'] },
      { id: 'turning', label: 'Tourner la tete', indicators: ['trigger_turning', 'cervicalgia', 'muscular'] },
      { id: 'sleeping', label: 'Position de sommeil', indicators: ['trigger_sleeping', 'postural', 'muscular'] },
      { id: 'computer', label: 'Travail sur ordinateur', indicators: ['trigger_computer', 'postural_strain', 'tension'] },
    ],
    multiSelect: true,
    order: 2,
  },
  {
    id: 'neck_radiation',
    bodyZones: ['neck'],
    question: 'La douleur irradie-t-elle ?',
    options: [
      { id: 'arm', label: 'Dans le bras', indicators: ['radiation_arm', 'cervical_radiculopathy', 'radicular'] },
      { id: 'shoulder', label: 'Vers l\'epaule', indicators: ['radiation_shoulder', 'cervicalgia', 'muscular'] },
      { id: 'headache', label: 'Maux de tete', indicators: ['radiation_headache', 'tension_headache', 'suboccipital'] },
      { id: 'none', label: 'Pas d\'irradiation', indicators: [] },
    ],
    multiSelect: true,
    order: 3,
  },
  {
    id: 'neck_symptoms',
    bodyZones: ['neck'],
    question: 'Autres symptomes ?',
    options: [
      { id: 'stiffness', label: 'Raideur', indicators: ['symptom_stiffness', 'cervicalgia', 'postural'] },
      { id: 'dizziness', label: 'Vertiges / etourdissements', indicators: ['symptom_dizziness', 'cervicogenic'] },
      { id: 'numbness', label: 'Engourdissement / picotements (bras/main)', indicators: ['symptom_numbness', 'cervical_radiculopathy', 'nerve'] },
      { id: 'weakness', label: 'Faiblesse dans le bras', indicators: ['symptom_weakness', 'cervical_radiculopathy', 'nerve'] },
      { id: 'none', label: 'Aucun', indicators: [] },
    ],
    multiSelect: true,
    order: 4,
  },
]

// =============================================================================
// MAPPINGS CONDITIONS -> PROTOCOLES
// =============================================================================

const conditionMappings: ConditionMapping[] = [
  // =========================================================================
  // PIED
  // =========================================================================
  {
    conditionName: 'Fasciite plantaire',
    targetZone: 'foot_left', // sera adapte pour foot_right aussi
    requiredIndicators: ['plantar', 'timing_morning'],
    suggestedIndicators: ['location_heel', 'location_arch', 'pain_tension'],
    protocolConditionName: 'Pieds plats et arthrite du pied gauche', // closest match
    priority: 10,
  },
  {
    conditionName: 'Irritation nerf tibial',
    targetZone: 'foot_left',
    requiredIndicators: ['pain_electric', 'nerve'],
    suggestedIndicators: ['tibial_nerve', 'pain_burning', 'location_heel'],
    protocolConditionName: 'Douleur pied complexe (nerf tibial, extenseurs, peronaux)',
    priority: 9,
  },
  {
    conditionName: 'Tendinite des extenseurs',
    targetZone: 'foot_left',
    requiredIndicators: ['location_dorsal', 'extensor'],
    suggestedIndicators: ['pain_tension', 'timing_exercise'],
    protocolConditionName: 'Douleur pied complexe (nerf tibial, extenseurs, peronaux)',
    priority: 8,
  },
  {
    conditionName: 'Tendinite des peroneaux',
    targetZone: 'foot_left',
    requiredIndicators: ['location_outer', 'peroneal'],
    suggestedIndicators: ['pain_tension', 'history_sprain'],
    protocolConditionName: 'Douleur pied complexe (nerf tibial, extenseurs, peronaux)',
    priority: 8,
  },
  {
    conditionName: 'Pieds plats symptomatiques',
    targetZone: 'foot_left',
    requiredIndicators: ['flat_feet'],
    suggestedIndicators: ['location_arch', 'timing_standing', 'timing_walking'],
    protocolConditionName: 'Pieds plats et arthrite du pied gauche',
    priority: 7,
  },

  // =========================================================================
  // GENOU
  // =========================================================================
  {
    conditionName: 'Tendinopathie rotulienne',
    targetZone: 'knee_left',
    requiredIndicators: ['location_below_patella', 'patellar_tendon'],
    suggestedIndicators: ['timing_jumping', 'timing_running', 'timing_squat'],
    protocolConditionName: 'Tendinopathie rotulienne',
    priority: 10,
  },
  {
    conditionName: 'Syndrome femoro-patellaire',
    targetZone: 'knee_left',
    requiredIndicators: ['patellofemoral'],
    suggestedIndicators: ['timing_stairs_down', 'timing_sitting', 'location_front'],
    protocolConditionName: 'Syndrome femoro-patellaire (douleur rotule)',
    priority: 9,
  },
  {
    conditionName: 'Syndrome de la bandelette ilio-tibiale',
    targetZone: 'knee_left',
    requiredIndicators: ['location_outer', 'itb'],
    suggestedIndicators: ['timing_running', 'lateral'],
    protocolConditionName: 'Syndrome femoro-patellaire (douleur rotule)', // closest rehab
    priority: 7,
  },

  // =========================================================================
  // EPAULE
  // =========================================================================
  {
    conditionName: 'Tendinite de la coiffe des rotateurs',
    targetZone: 'shoulder_left',
    requiredIndicators: ['rotator_cuff'],
    suggestedIndicators: ['movement_overhead', 'impingement', 'pain_arc', 'movement_lying'],
    protocolConditionName: 'Tendinite epaule / coiffe des rotateurs',
    priority: 10,
  },
  {
    conditionName: 'Conflit sous-acromial',
    targetZone: 'shoulder_left',
    requiredIndicators: ['impingement', 'pain_arc'],
    suggestedIndicators: ['movement_overhead', 'location_side'],
    protocolConditionName: 'Tendinite epaule / coiffe des rotateurs',
    priority: 9,
  },
  {
    conditionName: 'Instabilite anterieure',
    targetZone: 'shoulder_left',
    requiredIndicators: ['location_front', 'anterior'],
    suggestedIndicators: ['movement_push', 'symptom_instability'],
    protocolConditionName: 'Tendinite epaule / coiffe des rotateurs',
    priority: 7,
  },

  // =========================================================================
  // COUDE
  // =========================================================================
  {
    conditionName: 'Epicondylite laterale (tennis elbow)',
    targetZone: 'elbow_left',
    requiredIndicators: ['tennis_elbow'],
    suggestedIndicators: ['location_outer', 'trigger_grip', 'trigger_wrist_ext'],
    protocolConditionName: 'Epicondylite laterale (tennis elbow)',
    priority: 10,
  },
  {
    conditionName: 'Epicondylite laterale (tennis elbow)',
    targetZone: 'elbow_left',
    requiredIndicators: ['lateral', 'epicondylitis'],
    suggestedIndicators: ['trigger_grip', 'trigger_wrist_ext', 'trigger_pull'],
    protocolConditionName: 'Epicondylite laterale (tennis elbow)',
    priority: 9,
  },
  {
    conditionName: 'Epicondylite mediale (golf elbow)',
    targetZone: 'elbow_left',
    requiredIndicators: ['golf_elbow'],
    suggestedIndicators: ['location_inner', 'trigger_grip', 'trigger_wrist_flex'],
    protocolConditionName: 'Epicondylite mediale (golf elbow)',
    priority: 10,
  },
  {
    conditionName: 'Epicondylite mediale (golf elbow)',
    targetZone: 'elbow_left',
    requiredIndicators: ['medial', 'epicondylitis'],
    suggestedIndicators: ['trigger_grip', 'trigger_wrist_flex'],
    protocolConditionName: 'Epicondylite mediale (golf elbow)',
    priority: 9,
  },

  // =========================================================================
  // BAS DU DOS
  // =========================================================================
  {
    conditionName: 'Hernie discale / protrusion',
    targetZone: 'lower_back',
    requiredIndicators: ['disc', 'radicular'],
    suggestedIndicators: ['location_leg', 'pain_electric', 'timing_bending', 'timing_sitting'],
    protocolConditionName: 'Hernie discale / protrusion',
    priority: 10,
  },
  {
    conditionName: 'Sciatique',
    targetZone: 'lower_back',
    requiredIndicators: ['sciatica'],
    suggestedIndicators: ['location_leg', 'location_buttock', 'pain_electric'],
    protocolConditionName: 'Hernie discale / protrusion', // McKenzie-based
    priority: 9,
  },
  {
    conditionName: 'Lombalgie mecanique / core faible',
    targetZone: 'lower_back',
    requiredIndicators: ['muscular'],
    suggestedIndicators: ['timing_lifting', 'pain_dull', 'timing_standing', 'location_center'],
    protocolConditionName: 'Core faible et douleurs lombaires',
    priority: 8,
  },
  {
    conditionName: 'Syndrome facettaire',
    targetZone: 'lower_back',
    requiredIndicators: ['facet', 'timing_extension'],
    suggestedIndicators: ['relief_flexion', 'location_side'],
    protocolConditionName: 'Core faible et douleurs lombaires',
    priority: 7,
  },

  // =========================================================================
  // HAUT DU DOS
  // =========================================================================
  {
    conditionName: 'Raideur thoracique',
    targetZone: 'upper_back',
    requiredIndicators: ['thoracic_stiffness'],
    suggestedIndicators: ['pain_stiffness', 'trigger_sitting', 'trigger_posture', 'location_interscapular'],
    protocolConditionName: 'Posture anterieure tete et epaules',
    priority: 10,
  },
  {
    conditionName: 'Douleur posturale',
    targetZone: 'upper_back',
    requiredIndicators: ['postural'],
    suggestedIndicators: ['trigger_sitting', 'trigger_posture', 'pain_dull', 'location_interscapular'],
    protocolConditionName: 'Posture anterieure tete et epaules',
    priority: 9,
  },
  {
    conditionName: 'Dysfonction costale',
    targetZone: 'upper_back',
    requiredIndicators: ['rib_dysfunction'],
    suggestedIndicators: ['trigger_breathing', 'pain_sharp', 'location_sides', 'rib'],
    protocolConditionName: 'Dysfonction costale', // Protocol to be added later
    priority: 8,
  },

  // =========================================================================
  // HANCHE
  // =========================================================================
  {
    conditionName: 'Tendinite du flechisseur de hanche',
    targetZone: 'hip_left',
    requiredIndicators: ['hip_flexor'],
    suggestedIndicators: ['location_front', 'trigger_stairs', 'trigger_sitting', 'symptom_stiffness'],
    protocolConditionName: 'Tendinite flechisseur hanche', // Protocol to be added later
    priority: 10,
  },
  {
    conditionName: 'Syndrome du piriforme',
    targetZone: 'hip_left',
    requiredIndicators: ['piriformis'],
    suggestedIndicators: ['location_back', 'trigger_sitting', 'symptom_radiating', 'trigger_rotation'],
    protocolConditionName: 'Syndrome du piriforme',
    priority: 9,
  },
  {
    conditionName: 'Bursite trochantérienne',
    targetZone: 'hip_left',
    requiredIndicators: ['bursitis'],
    suggestedIndicators: ['location_side', 'trigger_lying_side', 'trigger_walking'],
    protocolConditionName: 'Bursite trochantérienne', // Protocol to be added later
    priority: 8,
  },
  {
    conditionName: 'Lesion labrale',
    targetZone: 'hip_left',
    requiredIndicators: ['labral'],
    suggestedIndicators: ['location_deep', 'symptom_clicking', 'trigger_rotation', 'trigger_squat'],
    protocolConditionName: 'Lesion labrale hanche', // Protocol to be added later
    priority: 9,
  },
  {
    conditionName: 'Sciatique',
    targetZone: 'hip_left',
    requiredIndicators: ['sciatica'],
    suggestedIndicators: ['location_back', 'symptom_radiating', 'piriformis'],
    protocolConditionName: 'Sciatique (compression nerf sciatique)',
    priority: 10,
  },

  // =========================================================================
  // CHEVILLE
  // =========================================================================
  {
    conditionName: 'Tendinite d\'Achille',
    targetZone: 'ankle_left',
    requiredIndicators: ['achilles_tendinitis'],
    suggestedIndicators: ['location_back', 'trigger_running', 'trigger_stairs', 'achilles'],
    protocolConditionName: 'Tendinite d\'Achille',
    priority: 10,
  },
  {
    conditionName: 'Tendinite d\'Achille',
    targetZone: 'ankle_left',
    requiredIndicators: ['achilles', 'trigger_running'],
    suggestedIndicators: ['location_back', 'trigger_stairs', 'trigger_plantarflexion'],
    protocolConditionName: 'Tendinite d\'Achille',
    priority: 9,
  },
  {
    conditionName: 'Instabilite chronique de cheville',
    targetZone: 'ankle_left',
    requiredIndicators: ['ankle_instability'],
    suggestedIndicators: ['location_outer', 'history_sprain', 'history_multiple_sprains', 'trigger_uneven'],
    protocolConditionName: 'Entorse cheville chronique / instabilite',
    priority: 10,
  },
  {
    conditionName: 'Instabilite chronique de cheville',
    targetZone: 'ankle_left',
    requiredIndicators: ['history_multiple_sprains', 'lateral'],
    suggestedIndicators: ['location_outer', 'trigger_uneven', 'ankle_instability'],
    protocolConditionName: 'Entorse cheville chronique / instabilite',
    priority: 9,
  },
  {
    conditionName: 'Conflit anterieur de cheville',
    targetZone: 'ankle_left',
    requiredIndicators: ['anterior_impingement'],
    suggestedIndicators: ['location_front', 'trigger_dorsiflexion', 'trigger_stairs'],
    protocolConditionName: 'Conflit anterieur cheville', // Protocol to be added later
    priority: 8,
  },

  // =========================================================================
  // POIGNET
  // =========================================================================
  {
    conditionName: 'Syndrome du canal carpien',
    targetZone: 'wrist_left',
    requiredIndicators: ['carpal_tunnel'],
    suggestedIndicators: ['location_palm', 'symptom_numbness', 'symptom_night', 'trigger_typing'],
    protocolConditionName: 'Syndrome canal carpien / douleur poignet',
    priority: 10,
  },
  {
    conditionName: 'Syndrome du canal carpien',
    targetZone: 'wrist_left',
    requiredIndicators: ['symptom_numbness', 'symptom_night'],
    suggestedIndicators: ['location_palm', 'trigger_typing', 'carpal_tunnel'],
    protocolConditionName: 'Syndrome canal carpien / douleur poignet',
    priority: 9,
  },
  {
    conditionName: 'Tenosynovite de De Quervain',
    targetZone: 'wrist_left',
    requiredIndicators: ['de_quervain'],
    suggestedIndicators: ['location_radial', 'trigger_thumb', 'trigger_gripping'],
    protocolConditionName: 'Tenosynovite de De Quervain', // Protocol to be added later
    priority: 10,
  },
  {
    conditionName: 'Tenosynovite de De Quervain',
    targetZone: 'wrist_left',
    requiredIndicators: ['location_radial', 'trigger_thumb'],
    suggestedIndicators: ['trigger_gripping', 'de_quervain'],
    protocolConditionName: 'Tenosynovite de De Quervain', // Protocol to be added later
    priority: 9,
  },
  {
    conditionName: 'Tendinite du poignet',
    targetZone: 'wrist_left',
    requiredIndicators: ['wrist_tendinitis'],
    suggestedIndicators: ['location_dorsal', 'trigger_typing', 'trigger_weight_bearing', 'extensor'],
    protocolConditionName: 'Syndrome canal carpien / douleur poignet',
    priority: 8,
  },
  {
    conditionName: 'Lesion du TFCC',
    targetZone: 'wrist_left',
    requiredIndicators: ['tfcc'],
    suggestedIndicators: ['location_ulnar', 'trigger_rotation', 'symptom_clicking', 'trigger_weight_bearing'],
    protocolConditionName: 'Lesion TFCC poignet', // Protocol to be added later
    priority: 9,
  },

  // =========================================================================
  // COU
  // =========================================================================
  {
    conditionName: 'Cervicalgie',
    targetZone: 'neck',
    requiredIndicators: ['cervicalgia'],
    suggestedIndicators: ['location_back', 'symptom_stiffness', 'trigger_turning', 'trigger_looking_down'],
    protocolConditionName: 'Cervicalgie', // Protocol to be added later
    priority: 10,
  },
  {
    conditionName: 'Radiculopathie cervicale',
    targetZone: 'neck',
    requiredIndicators: ['cervical_radiculopathy'],
    suggestedIndicators: ['radiation_arm', 'symptom_numbness', 'symptom_weakness', 'radicular'],
    protocolConditionName: 'Radiculopathie cervicale', // Protocol to be added later
    priority: 10,
  },
  {
    conditionName: 'Radiculopathie cervicale',
    targetZone: 'neck',
    requiredIndicators: ['radiation_arm', 'symptom_numbness'],
    suggestedIndicators: ['cervical_radiculopathy', 'symptom_weakness', 'nerve'],
    protocolConditionName: 'Radiculopathie cervicale', // Protocol to be added later
    priority: 9,
  },
  {
    conditionName: 'Cephalee de tension',
    targetZone: 'neck',
    requiredIndicators: ['tension_headache'],
    suggestedIndicators: ['location_base_skull', 'radiation_headache', 'suboccipital', 'trigger_computer'],
    protocolConditionName: 'Posture anterieure tete et epaules',
    priority: 9,
  },
  {
    conditionName: 'Tension posturale cervicale',
    targetZone: 'neck',
    requiredIndicators: ['postural_strain'],
    suggestedIndicators: ['trigger_looking_down', 'trigger_computer', 'tension', 'symptom_stiffness'],
    protocolConditionName: 'Posture anterieure tete et epaules',
    priority: 8,
  },
]

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Retourne les questions pertinentes pour une zone donnee, triees par ordre.
 */
export function getQuestionsForZone(zone: BodyZone): SymptomQuestion[] {
  // Normalize bilateral zones to their base
  const normalizedZone = zone.replace(/_left$|_right$/, '')

  return symptomQuestions
    .filter(q => q.bodyZones.some(z => z.replace(/_left$|_right$/, '') === normalizedZone))
    .sort((a, b) => a.order - b.order)
}

/**
 * Calcule les conditions matchees a partir des indicateurs collectes.
 * Retourne les conditions triees par score de matching (meilleur en premier).
 */
export function matchConditions(
  zone: BodyZone,
  collectedIndicators: string[]
): { condition: ConditionMapping; score: number; confidence: 'high' | 'medium' | 'low' }[] {
  const indicatorSet = new Set(collectedIndicators)

  // Normalize zone for bilateral matching
  const normalizedZone = zone.replace(/_left$|_right$/, '')

  const results = conditionMappings
    .filter(m => m.targetZone.replace(/_left$|_right$/, '') === normalizedZone)
    .map(mapping => {
      // Check required indicators
      const requiredMatched = mapping.requiredIndicators.filter(i => indicatorSet.has(i))
      const requiredScore = requiredMatched.length
      const requiredTotal = mapping.requiredIndicators.length

      // If not all required indicators match, skip this condition
      if (requiredScore < requiredTotal) {
        return null
      }

      // Count suggested indicators
      const suggestedMatched = mapping.suggestedIndicators.filter(i => indicatorSet.has(i))
      const suggestedScore = suggestedMatched.length
      const suggestedTotal = mapping.suggestedIndicators.length

      // Calculate total score
      // Required indicators are worth 2 points each, suggested worth 1
      const score = (requiredScore * 2) + suggestedScore + (mapping.priority / 10)

      // Determine confidence
      let confidence: 'high' | 'medium' | 'low'
      const suggestedRatio = suggestedTotal > 0 ? suggestedMatched.length / suggestedTotal : 1
      if (suggestedRatio >= 0.5) {
        confidence = 'high'
      } else if (suggestedRatio >= 0.25 || suggestedTotal === 0) {
        confidence = 'medium'
      } else {
        confidence = 'low'
      }

      return { condition: mapping, score, confidence }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => b.score - a.score)

  // Deduplicate by conditionName, keeping highest score
  const seen = new Set<string>()
  const deduplicated = results.filter(r => {
    if (seen.has(r.condition.conditionName)) return false
    seen.add(r.condition.conditionName)
    return true
  })

  return deduplicated
}

