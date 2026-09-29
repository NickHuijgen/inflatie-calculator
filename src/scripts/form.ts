import { FIRST_YEAR, MONTHS, parseAmount } from '../lib/inflation.ts';

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

/**
 * Whether a field still holds the value the page was built with. Compares the
 * parsed amount rather than the text, so "1000" counts as unchanged against a
 * default of "1.000,00" -- but falls back to the text for fields that hold no
 * number at all, where NaN === NaN would never be true (the optional salary on
 * /salaris ships empty, and an empty field is its own default).
 */
export function isUnchanged(input: HTMLInputElement): boolean {
  const value = parseAmount(input.value);
  const initial = parseAmount(input.defaultValue);

  return Number.isNaN(value) || Number.isNaN(initial) ? input.value === input.defaultValue : value === initial;
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
