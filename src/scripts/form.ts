import { FIRST_YEAR, MONTHS } from '../lib/inflation';

// The pieces calculator.ts and salary.ts both need, verbatim. Everything
// that knows about a specific form's fields or result stays in those files;
// this is only the shared plumbing.

export function element<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

/** "MM08" -> "08", "JJ00" -> "jaar", for the shareable URL. */
export function monthToParam(month: string): string {
  return month === 'JJ00' ? 'jaar' : month.substring(2);
}

/** The inverse, rejecting anything that is not a real period. */
export function paramToMonth(value: string): string | undefined {
  const month = value === 'jaar' ? 'JJ00' : `MM${value.padStart(2, '0')}`;

  return MONTHS.some(([code]) => code === month) ? month : undefined;
}

export function monthLabel(month: string): string {
  return MONTHS.find(([code]) => code === month)?.[1].toLowerCase() ?? month;
}

/** Pulls a year field back into the range CBS has figures for. */
export function clampYear(input: HTMLInputElement, latestYear: number): void {
  let year = Math.round(input.valueAsNumber);

  if (Number.isNaN(year) || year < FIRST_YEAR) {
    year = FIRST_YEAR;
  }

  if (year > latestYear) {
    year = latestYear;
  }

  input.valueAsNumber = year;
}
