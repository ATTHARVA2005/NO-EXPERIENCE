import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Generate a stable, short hash-based id from a string (e.g., URL)
export function stableIdFromString(input: string, prefix: string = 'id'): string {
  // djb2 hash
  let hash = 5381
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i)
  }
  // convert to unsigned and base36 for compactness
  const token = (hash >>> 0).toString(36)
  return `${prefix}-${token}`
}

export function resourceIdFromUrl(url: string): string {
  return stableIdFromString(url, 'res')
}
