import { MONTHS } from './inflation';

// The third CBS dataset, used only by /salaris (see Calculation in
// AGENTS.md): the index of collectively agreed wages. Deliberately kept out
// of inflation.ts -- that file's output is pinned by a full old-vs-new
// regression, and nothing here needs to touch it.
//
// 85663NED holds one index per cao-sector and per branch; the site only ever
// asks for the totals ("Totaal cao-sectoren" x "Alle economische
// activiteiten"), so the filter is part of the URL rather than something the
// class has to sift through. "Versie" picks the current figures over the
// first-published ones, and its key really does carry three trailing spaces.
const CAO_FILTER = "CaoSectoren eq 'T001020' and BedrijfstakkenBranchesSBI2008 eq 'T001081' and Versie eq 'A045600   '";
const CAO_SELECT = 'Perioden,CaoLonenPerMaandInclBijzBeloningen_2';

export const CBS_CAO_URL = `https://opendata.cbs.nl/ODataApi/odata/85663NED/TypedDataSet?$format=json&$filter=${encodeURIComponent(CAO_FILTER)}&$select=${encodeURIComponent(CAO_SELECT)}`;
export const CBS_CAO_DATASET_URL = 'https://opendata.cbs.nl/#/CBS/nl/dataset/85663NED/table';
export const CBS_CAO_INFO_URL = 'https://opendata.cbs.nl/ODataApi/odata/85663NED/TableInfos?$format=json';
export const CBS_CAO_TITLE = 'Cao-lonen, contractuele loonkosten en arbeidsduur; indexcijfers (2020=100)';

/** First year with a cao-loonindex (yearly averages). */
export const FIRST_CAO_YEAR = 1972;
/** First year with cao figures per month; before that, yearly averages only. */
export const FIRST_CAO_MONTHLY_YEAR = 2020;

interface CaoRow {
  Perioden: string;
  CaoLonenPerMaandInclBijzBeloningen_2: number | null;
}

/** [period, index level] pairs, e.g. ["2016JJ00", 91.8]. */
export type CompactCaoData = [string, number][];

/**
 * The cao-loonindex per period (2020=100), keyed exactly like the CPI data
 * in inflation.ts: "1972JJ00" for a yearly average, "2026MM08" for a month.
 * Yearly figures run from 1972, monthly ones only from 2020 -- which is why
 * the comparison on /salaris falls back to yearly averages (see
 * wageComparison() in salary.ts).
 */
export class CaoData {
  private readonly levels: Map<string, number>;

  constructor(entries: CompactCaoData) {
    this.levels = new Map(entries);
  }

  static fromCompact(data: CompactCaoData): CaoData {
    return new CaoData(data);
  }

  toCompact(): CompactCaoData {
    return [...this.levels.entries()];
  }

  has(year: number, month: string): boolean {
    return this.levels.has(year + month);
  }

  level(year: number, month: string): number | undefined {
    return this.levels.get(year + month);
  }

  /** The latest year with a yearly average, e.g. 2025. */
  get latestYearlyYear(): number {
    return Math.max(...[...this.levels.keys()].filter(period => period.endsWith('JJ00')).map(period => parseInt(period)));
  }

  /**
   * How much cao wages rose from one period to a later one, in percent.
   * The exact ratio of CBS's own index levels, without intermediate
   * rounding -- the same approach as priceFactor() for yearly averages.
   * Returns undefined when either period has no figures.
   */
  growth(fromYear: number, toYear: number, month: string): number | undefined {
    const from = this.level(fromYear, month);
    const to = this.level(toYear, month);

    return from !== undefined && to !== undefined ? (to / from - 1) * 100 : undefined;
  }

  /** How much cao wages rose in `year` compared with the year before. */
  yearlyChange(year: number): number | undefined {
    return this.growth(year - 1, year, 'JJ00');
  }

  /** Human-readable latest period, e.g. "augustus 2026". */
  get latestPeriodLabel(): string {
    const latest = [...this.levels.keys()].sort().at(-1) ?? '';
    const month = MONTHS.find(([value]) => value === latest.substring(4, 8));

    return !month || month[0] === 'JJ00' ? latest.substring(0, 4) : `${month[1].toLowerCase()} ${latest.substring(0, 4)}`;
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`CBS request failed: ${response.status} ${response.statusText} (${url})`);
  }

  return await response.json() as T;
}

export async function fetchCaoData(): Promise<CaoData> {
  const { value } = await fetchJson<{ value: CaoRow[] }>(CBS_CAO_URL);

  // The table also publishes quarters (2020KW01); only years and months are
  // comparable with the CPI data, so those are the ones kept.
  const entries = value
    .filter(row => row.CaoLonenPerMaandInclBijzBeloningen_2 !== null && /(JJ|MM)\d\d$/.test(row.Perioden))
    .map((row): [string, number] => [row.Perioden, row.CaoLonenPerMaandInclBijzBeloningen_2!]);

  // A request that succeeds but matches nothing means CBS changed the table:
  // it has been replaced once already (82838NED, 2010=100, was retired in
  // December 2023), and the dimension keys in CAO_FILTER go with it. Fail
  // here, loudly and by name, rather than let a dataset with no years reach
  // the pages -- `latestYearlyYear` would be -Infinity and the table loop in
  // salaris.astro would spin forever, hanging the build instead of failing it.
  if (!entries.some(([period]) => period.endsWith('JJ00'))) {
    throw new Error(`CBS returned no yearly cao figures: 85663NED may have been replaced, or its dimension keys changed (${CBS_CAO_URL})`);
  }

  return new CaoData(entries);
}

/** When CBS last updated the cao dataset. */
export async function fetchCaoModified(): Promise<Date> {
  const { value } = await fetchJson<{ value: { Modified: string }[] }>(CBS_CAO_INFO_URL);

  return new Date(value[0].Modified);
}
