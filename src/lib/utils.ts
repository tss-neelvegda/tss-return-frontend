import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Strip per-size variant suffixes from product names so all sizes of the same
 * product collapse into a single row.
 *   "Gurkha Pants: Onyx - Variant ( 34 )" → "Gurkha Pants: Onyx"
 */
export function normalizeProductName(name: string | null | undefined): string {
  if (!name) return "";
  return name.replace(/\s*[-–—]\s*Variant\s*\([^)]*\)\s*$/i, "").trim();
}
