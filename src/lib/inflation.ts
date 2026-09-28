export interface YearData {
  ID: number;
  Perioden: string;
  JaarmutatieCPI_1: string;
  JaarmutatieCPIAfgeleid_2: string | null;
}

// Two CBS datasets (see Calculation in AGENTS.md):
// - 70936ned: year-on-year CPI change per month and per year, from 1963,
//   updated monthly. Used for every comparison by month.
// - 71905ned: the yearly price index (1900=100), from 1900, updated once a
//   year. Used for every comparison of yearly averages ("Jaargemiddelde").
export const CBS_DATA_URL = 'https://opendata.cbs.nl/ODataFeed/odata/70936ned/UntypedDataSet?%24format=json';
export const CBS_DATASET_URL = 'https://opendata.cbs.nl/#/CBS/nl/dataset/70936ned/table?ts=1664823822870';
export const CBS_DATASET_INFO_URL = 'https://opendata.cbs.nl/ODataApi/odata/70936ned/TableInfos?$format=json';
export const CBS_DATASET_TITLE = 'Jaarmutatie consumentenprijsindex; vanaf 1963';

export const CBS_INDEX_URL = 'https://opendata.cbs.nl/ODataApi/odata/71905ned/TypedDataSet?$format=json';
export const CBS_INDEX_DATASET_URL = 'https://opendata.cbs.nl/#/CBS/nl/dataset/71905ned/table';
export const CBS_INDEX_INFO_URL = 'https://opendata.cbs.nl/ODataApi/odata/71905ned/TableInfos?$format=json';
export const CBS_INDEX_TITLE = 'Consumentenprijzen; prijsindex 1900=100';

/** First year with yearly figures (71905ned). */
export const FIRST_YEAR = 1900;
/** First year with monthly figures (70936ned). */
export const FIRST_MONTHLY_YEAR = 1963;

/** CBS period suffixes and their Dutch labels, in select order. */
export const MONTHS: [string, string][] = [
  ['JJ00', 'Jaargemiddelde'],
  ['MM01', 'Januari'],
  ['MM02', 'Februari'],
  ['MM03', 'Maart'],
  ['MM04', 'April'],
  ['MM05', 'Mei'],
  ['MM06', 'Juni'],
  ['MM07', 'Juli'],
  ['MM08', 'Augustus'],
  ['MM09', 'September'],
  ['MM10', 'Oktober'],
  ['MM11', 'November'],
  ['MM12', 'December'],
];
export const EURO_INTRODUCTION_YEAR = 2002;

const guilderToEuroConversionRate = 0.453780;
/** The fixed euro rate: 1 euro = 2,20371 gulden. */
export const euroToGuilderConversionRate = 2.20371;

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`CBS request failed: ${response.status} ${response.statusText} (${url})`);
  }

  return await response.json() as T;
}

export async function fetchInflationData(): Promise<InflationData> {
  const [mutations, index] = await Promise.all([
    fetchJson<{ value: YearData[] }>(CBS_DATA_URL),
    fetchJson<{ value: { Perioden: string; CPI_1: number | null }[] }>(CBS_INDEX_URL),
  ]);

  const yearlyIndex = index.value
    .filter(row => row.CPI_1 !== null)
    .map((row): [number, number] => [parseInt(row.Perioden), row.CPI_1!]);

  return new InflationData(mutations.value, yearlyIndex);
}

/** When CBS last updated either dataset, e.g. 2026-09-08T06:30:00. */
export async function fetchDatasetModified(): Promise<Date> {
  const infos = await Promise.all([CBS_DATASET_INFO_URL, CBS_INDEX_INFO_URL].map(url => fetchJson<{ value: { Modified: string }[] }>(url)));

  return new Date(Math.max(...infos.map(info => new Date(info.value[0].Modified).getTime())));
}

/**
 * Compact form of the data for embedding in the page, read back by
 * `InflationData.fromCompact`: the monthly/yearly mutations as
 * [period, mutation] pairs (["1963MM01", "3.9"]) and the yearly index as
 * [year, level] pairs ([1900, 100]).
 */
export interface CompactData {
  mutations: [string, string][];
  yearlyIndex: [number, number][];
}

export class InflationData {
  private readonly byPeriod: Map<string, YearData>;
  /** Yearly price level (1900=100) per year; see the constructor. */
  private readonly levels: Map<number, number>;
  private readonly yearlyIndex: [number, number][];
  readonly latest: YearData | undefined;

  constructor(items: YearData[], yearlyIndex: [number, number][]) {
    this.byPeriod = new Map(items.map(item => [item.Perioden, item]));
    this.latest = items[items.length - 1];
    this.yearlyIndex = yearlyIndex;
    this.levels = new Map(yearlyIndex);

    // 71905ned is published once a year, a few weeks after 70936ned has the
    // same year's yearly change. Extend the index with those changes so the
    // yearly average never lags behind the monthly data.
    let year = Math.max(...this.levels.keys()) + 1;

    while (this.byPeriod.has(`${year}JJ00`)) {
      this.levels.set(year, this.levels.get(year - 1)! * (1 + this.mutation(year, 'JJ00')! / 100));
      year++;
    }
  }

  static fromCompact(data: CompactData): InflationData {
    const items = data.mutations.map(([Perioden, JaarmutatieCPI_1], ID) => ({ ID, Perioden, JaarmutatieCPI_1, JaarmutatieCPIAfgeleid_2: null }));

    return new InflationData(items, data.yearlyIndex);
  }

  toCompact(): CompactData {
    return {
      mutations: [...this.byPeriod.values()].map(item => [item.Perioden, item.JaarmutatieCPI_1.trim()]),
      yearlyIndex: this.yearlyIndex,
    };
  }

  get latestYear(): number {
    return this.latest ? parseInt(this.latest.Perioden.substring(0, 4)) : FIRST_MONTHLY_YEAR;
  }

  /** Period suffix of the latest entry, e.g. "MM08" or "JJ00". */
  get latestMonth(): string {
    return this.latest ? this.latest.Perioden.substring(4, 8) : 'JJ00';
  }

  /** The latest year with a yearly average, e.g. 2025. */
  get latestYearlyYear(): number {
    return Math.max(...this.levels.keys());
  }

  has(year: number, month: string): boolean {
    return month === 'JJ00' ? this.levels.has(year) : this.byPeriod.has(year + month);
  }

  /** Yearly CPI mutation in percent for the given period (70936ned). */
  private mutation(year: number, month: string): number | undefined {
    const item = this.byPeriod.get(year + month);

    return item ? parseFloat(item.JaarmutatieCPI_1.replace(/\s/g, '')) : undefined;
  }

  /**
   * How much prices rose from `fromYear` to a later `toYear`, as a factor
   * (1.25 = 25% more expensive), without any currency conversion and
   * without intermediate rounding. Assumes `has()` holds for both years.
   */
  private priceFactor(fromYear: number, toYear: number, month: string): number {
    if (month === 'JJ00') {
      return this.levels.get(toYear)! / this.levels.get(fromYear)!;
    }

    let factor = 1;

    for (let year = fromYear + 1; year <= toYear; year++) {
      factor *= 1 + this.mutation(year, month)! / 100;
    }

    return factor;
  }

  /**
   * What 100 in `beginYear` is worth in `endYear` (or, without
   * `conversion`, the price level of `endYear` with `beginYear` = 100).
   * Returns -1 when either period has no figures.
   */
  calculateCPIMutation(beginYear: number, endYear: number, month: string, conversion: boolean = true): number {
    if (!this.has(beginYear, month) || !this.has(endYear, month)) {
      return -1;
    }

    // Yearly averages: the exact ratio of CBS's own index levels.
    if (month === 'JJ00') {
      let value = 100 * (beginYear <= endYear
        ? this.priceFactor(beginYear, endYear, month)
        : 1 / this.priceFactor(endYear, beginYear, month));

      if (conversion && beginYear < EURO_INTRODUCTION_YEAR && endYear >= EURO_INTRODUCTION_YEAR) {
        value *= guilderToEuroConversionRate;
      } else if (conversion && beginYear >= EURO_INTRODUCTION_YEAR && endYear < EURO_INTRODUCTION_YEAR) {
        value *= euroToGuilderConversionRate;
      }

      return value;
    }

    // Months: chain the yearly changes for that month, rounding each step.
    // Unchanged from the original calculation, so monthly results are too.
    const yearDifference = endYear - beginYear;
    let CPIMutation = 100;
    let year = beginYear;

    if (yearDifference > 0) {
      for (let i = 0; i < yearDifference; i++) {
        year++;

        if (year === EURO_INTRODUCTION_YEAR && conversion) {
          CPIMutation = round(CPIMutation * guilderToEuroConversionRate);
        }

        CPIMutation = round(CPIMutation * ((this.mutation(year, month)! / 100) + 1));
      }
    } else {
      // Mirror of the forward branch: undo each year's mutation, then undo
      // the euro conversion when stepping back from 2002 into 2001.
      for (let i = 0; i < Math.abs(yearDifference); i++) {
        CPIMutation = round(CPIMutation / ((this.mutation(year, month)! / 100) + 1));

        if (year === EURO_INTRODUCTION_YEAR && conversion) {
          CPIMutation = round(CPIMutation * euroToGuilderConversionRate);
        }

        year--;
      }
    }

    return CPIMutation;
  }

  /** Purchasing power equivalent of `amount` in `endYear`, or -1 when invalid. */
  output(amount: number, startYear: number, endYear: number, month: string): number {
    const factor = this.calculateCPIMutation(startYear, endYear, month);

    if (amount <= 0 || factor < 0) {
      return -1;
    }

    return parseFloat(round(amount * (factor / 100)).toFixed(2));
  }

  inflationPercentage(startYear: number, endYear: number, month: string): number {
    return parseFloat((this.calculateCPIMutation(startYear, endYear, month, false) - 100).toFixed(2));
  }

  /**
   * Compound average yearly price change between two years, in percent:
   * the constant rate that gives the same total change. Always measured
   * forwards in time, from the earlier year to the later one.
   */
  averageInflation(startYear: number, endYear: number, month: string): number {
    const fromYear = Math.min(startYear, endYear);
    const toYear = Math.max(startYear, endYear);

    if (fromYear === toYear || !this.has(fromYear, month) || !this.has(toYear, month)) {
      return 0;
    }

    return round((this.priceFactor(fromYear, toYear, month) ** (1 / (toYear - fromYear)) - 1) * 100);
  }

  /**
   * What `amount` from each earlier year is worth in the latest year with
   * a yearly average, comparing yearly averages (exact, from 1900).
   */
  historicalValues(amount: number): { year: number; value: number; inflation: number }[] {
    const endYear = this.latestYearlyYear;
    const rows = [];

    for (let year = FIRST_YEAR; year < endYear; year++) {
      if (this.has(year, 'JJ00')) {
        rows.push({
          year,
          value: this.output(amount, year, endYear, 'JJ00'),
          inflation: this.inflationPercentage(year, endYear, 'JJ00'),
        });
      }
    }

    return rows;
  }

  /** Human-readable latest period, e.g. "augustus 2026" or "2025". */
  get latestPeriodLabel(): string {
    const month = MONTHS.find(([value]) => value === this.latestMonth);

    return this.latestMonth === 'JJ00' || !month ? String(this.latestYear) : `${month[1].toLowerCase()} ${this.latestYear}`;
  }
}

export function round(number: number, decimals: number = 2): number {
  return parseFloat((Math.round(number * 10000) / 10000).toFixed(decimals));
}

const amountFormat = new Intl.NumberFormat('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const percentFormat = new Intl.NumberFormat('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Dutch notation: 1234.5 → "1.234,50". */
export function formatAmount(number: number): string {
  return amountFormat.format(number);
}

/** "€ 1.234,50", or "ƒ 1.234,50" for years before the euro. */
export function formatMoney(number: number, year: number): string {
  return `${currencySymbol(year)}\u00a0${formatAmount(number)}`;
}

/** Dutch notation, always two decimals: 39.28 → "39,28", 3.3 → "3,30". */
export function formatPercent(number: number): string {
  return percentFormat.format(number);
}

/**
 * Parses an amount as a Dutch visitor may type it: "1.234,50", "1234,5",
 * "1234.5" or "1.000". A comma is always the decimal separator; without a
 * comma, dots in groups of three ("1.000", "12.500.000") are thousands
 * separators and a single other dot is a decimal point.
 */
export function parseAmount(input: string): number {
  let value = input.trim().replace(/[€ƒ\s]/g, '');

  if (value.includes(',')) {
    value = value.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(value)) {
    value = value.replace(/\./g, '');
  }

  return /^\d*\.?\d+$|^\d+\.$/.test(value) ? parseFloat(value) : NaN;
}

export function currencySymbol(year: number): string {
  return year < EURO_INTRODUCTION_YEAR ? 'ƒ' : '€';
}
