import { EURO_INTRODUCTION_YEAR, FIRST_YEAR, type InflationData } from './inflation.ts';

// The per-year pages: /gulden/<year>/ for 1900–2001 and /euro/<year>/ from
// 2002, one for every year with a yearly average before the latest one
// (the latest has nothing to compare against yet). See Routes in AGENTS.md.

export type Currency = 'gulden' | 'euro';

export function currencyOf(year: number): Currency {
  return year < EURO_INTRODUCTION_YEAR ? 'gulden' : 'euro';
}

export function yearPagePath(year: number): string {
  return `/${currencyOf(year)}/${year}/`;
}

/** Every year that gets a page, oldest first. */
export function yearPageYears(data: InflationData): number[] {
  const years = [];

  for (let year = FIRST_YEAR; year < data.latestYearlyYear; year++) {
    if (data.has(year, 'JJ00')) {
      years.push(year);
    }
  }

  return years;
}
