import type { BodyZone } from '../db/types'

export const bodyZones: { zone: BodyZone; label: string }[] = [
  { zone: 'neck', label: 'Cou' },
  { zone: 'shoulder_left', label: 'Épaule G' },
  { zone: 'shoulder_right', label: 'Épaule D' },
  { zone: 'elbow_left', label: 'Coude G' },
  { zone: 'elbow_right', label: 'Coude D' },
  { zone: 'wrist_left', label: 'Poignet G' },
  { zone: 'wrist_right', label: 'Poignet D' },
  { zone: 'upper_back', label: 'Haut du dos / Posture' },
  { zone: 'lower_back', label: 'Bas du dos / Core' },
  { zone: 'hip_left', label: 'Hanche G' },
  { zone: 'hip_right', label: 'Hanche D' },
  { zone: 'knee_left', label: 'Genou G' },
  { zone: 'knee_right', label: 'Genou D' },
  { zone: 'ankle_left', label: 'Cheville G' },
  { zone: 'ankle_right', label: 'Cheville D' },
  { zone: 'foot_left', label: 'Pied G' },
  { zone: 'foot_right', label: 'Pied D' },
]

export const painLabels: Record<number, string> = {
  0: 'Aucune',
  1: 'Très légère',
  2: 'Légère',
  3: 'Modérée — progression bloquée',
  4: 'Modérée — progression bloquée',
  5: 'Forte — charge réduite',
  6: 'Forte — exercices adaptés',
  7: 'Sévère — exercice remplacé',
  8: 'Sévère — exercice remplacé',
  9: 'Sévère — exercice remplacé',
  10: 'Sévère — exercice remplacé',
}

export const bodyZoneLabels: Record<string, string> = Object.fromEntries(
  bodyZones.map(({ zone, label }) => [zone, label])
)
