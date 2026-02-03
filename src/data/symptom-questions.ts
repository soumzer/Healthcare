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
]

// =============================================================================
// MAPPINGS CONDITIONS -> PROTOCOLES
// =============================================================================

export const conditionMappings: ConditionMapping[] = [
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

  return results
}

/**
 * Retourne le meilleur match ou null si aucun match.
 */
export function getBestMatch(
  zone: BodyZone,
  collectedIndicators: string[]
): { condition: ConditionMapping; confidence: 'high' | 'medium' | 'low' } | null {
  const matches = matchConditions(zone, collectedIndicators)
  if (matches.length === 0) return null
  return { condition: matches[0].condition, confidence: matches[0].confidence }
}
