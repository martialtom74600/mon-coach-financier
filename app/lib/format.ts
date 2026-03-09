/**
 * Formatage de dates centralisé avec locale fr-FR.
 * Presets : short, long, monthYear, monthYear2Digit, monthLongYear, weekdayShort
 */

const LOCALE = 'fr-FR';

export type DateFormatPreset =
  | 'short'           // "9 mars 2026"
  | 'long'            // "lundi 9 mars 2026"
  | 'monthYear'       // "mars 2026"
  | 'monthYear2Digit' // "mars 26"
  | 'monthLongYear'   // "mars 2026" (mois en toutes lettres)
  | 'weekdayShort';   // "lun"

const PRESETS: Record<DateFormatPreset, Intl.DateTimeFormatOptions> = {
  short: { day: 'numeric', month: 'short', year: 'numeric' },
  long: { weekday: 'long', day: 'numeric', month: 'long' },
  monthYear: { month: 'short', year: 'numeric' },
  monthYear2Digit: { month: 'short', year: '2-digit' },
  monthLongYear: { month: 'long', year: 'numeric' },
  weekdayShort: { weekday: 'short' },
};

/**
 * Formate une date selon un preset.
 * @param date Date ou string ISO
 * @param preset Preset de format
 * @returns Chaîne formatée ou '-' si date invalide
 */
export function formatDate(date: Date | string | null | undefined, preset: DateFormatPreset = 'short'): string {
  if (date == null || date === '') return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';

  const options = PRESETS[preset];
  const formatted = d.toLocaleDateString(LOCALE, options);

  if (preset === 'weekdayShort') {
    return formatted.slice(0, 3);
  }
  return formatted;
}
