/**
 * Groups an array of items by a key extracted from each item.
 * @param items Array of items to group
 * @param keyFn Function to extract the key from each item
 * @returns Map of key to array of items
 */
export function groupBy<T, K>(items: T[], keyFn: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>()
  for (const item of items) {
    const key = keyFn(item)
    const list = map.get(key) ?? []
    list.push(item)
    map.set(key, list)
  }
  return map
}

/**
 * Groups items by exerciseId - common pattern in this codebase.
 * @param items Array of items with exerciseId property
 * @returns Map of exerciseId to array of items
 */
export function groupByExerciseId<T extends { exerciseId: number }>(
  items: T[]
): Map<number, T[]> {
  return groupBy(items, (item) => item.exerciseId)
}

/**
 * Gets the latest item from an array based on a date property.
 * @param items Array of items
 * @param dateFn Function to extract the date from each item
 * @returns The item with the most recent date, or undefined if array is empty
 */
export function getLatestByDate<T>(
  items: T[],
  dateFn: (item: T) => Date
): T | undefined {
  if (items.length === 0) return undefined
  return items.reduce((latest, item) =>
    dateFn(item) > dateFn(latest) ? item : latest
  )
}

/**
 * Safely parses a date from a value that might be a Date or string.
 * @param value The value to parse
 * @param fallback Fallback date if parsing fails (defaults to now)
 * @returns A valid Date object
 */
export function safeParseDate(value: unknown, fallback?: Date): Date {
  const defaultDate = fallback ?? new Date()
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? defaultDate : value
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value)
    return isNaN(parsed.getTime()) ? defaultDate : parsed
  }
  return defaultDate
}

/**
 * Formats a date as YYYY-MM-DD string.
 * @param date The date to format
 * @returns ISO date string (YYYY-MM-DD)
 */
export function formatDateISO(date: Date): string {
  return date.toISOString().slice(0, 10)
}
