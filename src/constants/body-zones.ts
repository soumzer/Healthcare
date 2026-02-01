import type { BodyZone } from '../db/types'

export const bodyZones: { zone: BodyZone; label: string }[] = [
  { zone: 'neck', label: 'Cou' },
  { zone: 'shoulder_left', label: 'Epaule G' },
  { zone: 'shoulder_right', label: 'Epaule D' },
  { zone: 'elbow_left', label: 'Coude G' },
  { zone: 'elbow_right', label: 'Coude D' },
  { zone: 'wrist_left', label: 'Poignet G' },
  { zone: 'wrist_right', label: 'Poignet D' },
  { zone: 'upper_back', label: 'Haut du dos' },
  { zone: 'lower_back', label: 'Bas du dos' },
  { zone: 'hip_left', label: 'Hanche G' },
  { zone: 'hip_right', label: 'Hanche D' },
  { zone: 'knee_left', label: 'Genou G' },
  { zone: 'knee_right', label: 'Genou D' },
  { zone: 'ankle_left', label: 'Cheville G' },
  { zone: 'ankle_right', label: 'Cheville D' },
  { zone: 'foot_left', label: 'Pied G' },
  { zone: 'foot_right', label: 'Pied D' },
  { zone: 'other', label: 'Autre' },
]

export const painLabels: Record<number, string> = {
  0: 'Aucune',
  1: 'Tres legere',
  2: 'Legere',
  3: 'Moderee — progression bloquee',
  4: 'Moderee — progression bloquee',
  5: 'Forte — charge reduite',
  6: 'Forte — exercices adaptes',
  7: 'Severe — exercice remplace',
  8: 'Severe — exercice remplace',
  9: 'Severe — exercice remplace',
  10: 'Severe — exercice remplace',
}

export const bodyZoneLabels: Record<string, string> = Object.fromEntries(
  bodyZones.map(({ zone, label }) => [zone, label])
)
