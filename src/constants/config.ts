// Session configuration
export const SESSION_CONFIG = {
  /** Schema version for session state persistence */
  STATE_VERSION: 1,
  /** Session state expiry time in milliseconds (3 hours) */
  EXPIRY_MS: 3 * 60 * 60 * 1000,
  /** Default rest time between sets in seconds */
  DEFAULT_REST_SECONDS: 120,
  /** Minimum rest hours between workout sessions */
  MINIMUM_REST_HOURS: 24,
} as const

// Rehab exercise limits
export const REHAB_CONFIG = {
  /** Maximum warmup rehab exercises per session */
  MAX_WARMUP: 8,
  /** Maximum cooldown rehab exercises per session */
  MAX_COOLDOWN: 5,
  /** Maximum rehab exercises for rest day routine */
  MAX_REHAB_EXERCISES: 5,
  /** Maximum general exercises for rest day routine */
  MAX_GENERAL_EXERCISES: 3,
} as const

// Weight configuration
export const WEIGHT_CONFIG = {
  /** Standard weight increment in kg */
  INCREMENT_KG: 2.5,
  /** Maximum weight in kg (for validation) */
  MAX_WEIGHT_KG: 500,
  /** Maximum reps (for validation) */
  MAX_REPS: 999,
} as const

// Backup configuration
export const BACKUP_CONFIG = {
  /** Maximum backup file size in bytes (10MB) */
  MAX_SIZE_BYTES: 10 * 1024 * 1024,
  /** Current backup version */
  VERSION: 1,
} as const
