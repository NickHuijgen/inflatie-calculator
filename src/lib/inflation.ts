export interface YearData {
  ID: number;
  Perioden: string;
  JaarmutatieCPI_1: string;
  JaarmutatieCPIAfgeleid_2: string | null;
}

export const CBS_DATA_URL = 'https://opendata.cbs.nl/ODataFeed/odata/70936ned/UntypedDataSet?%24format=json';
export const CBS_DATASET_URL = 'https://opendata.cbs.nl/#/CBS/nl/dataset/70936ned/table?ts=1664823822870';
export const FIRST_YEAR = 1963;

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

export async function fetchInflationData(): Promise<InflationData> {
  const response = await fetch(CBS_DATA_URL);

  if (!response.ok) {
    throw new Error(`CBS data request failed: ${response.status} ${response.statusText}`);
  }

  const json: { value: YearData[] } = await response.json();

  return new InflationData(json.value);
}

export class InflationData {
  private readonly byPeriod: Map<string, YearData>;
  readonly latest: YearData | undefined;

  constructor(items: YearData[]) {
    this.byPeriod = new Map(items.map(item => [item.Perioden, item]));
    this.latest = items[items.length - 1];
  }

  get latestYear(): number {
    return this.latest ? parseInt(this.latest.Perioden.substring(0, 4)) : FIRST_YEAR;
  }

  /** Period suffix of the latest entry, e.g. "MM08" or "JJ00". */
  get latestMonth(): string {
    return this.latest ? this.latest.Perioden.substring(4, 8) : 'JJ00';
  }

  has(year: number, month: string): boolean {
    return this.byPeriod.has(year + month);
  }

  /** Yearly CPI mutation in percent for the given period. */
  private mutation(year: number, month: string): number | undefined {
    const item = this.byPeriod.get(year + month);

    return item ? parseFloat(item.JaarmutatieCPI_1.replace(/\s/g, '')) : undefined;
  }

  calculateCPIMutation(beginYear: number, endYear: number, month: string, conversion: boolean = true): number {
    if (!this.has(beginYear, month) || !this.has(endYear, month)) {
      return -1;
    }

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
    if (amount <= 0) {
      return -1;
    }

    return parseFloat(round(amount * (this.calculateCPIMutation(startYear, endYear, month) / 100)).toFixed(2));
  }

  inflationPercentage(startYear: number, endYear: number, month: string): number {
    return parseFloat((this.calculateCPIMutation(startYear, endYear, month, false) - 100).toFixed(2));
  }

  /**
   * What `amount` from each earlier year is worth in the latest period,
   * comparing the same month (the latest one CBS has published).
   */
  historicalValues(amount: number): { year: number; value: number; inflation: number }[] {
    const month = this.latestMonth;
    const rows = [];

    for (let year = FIRST_YEAR; year < this.latestYear; year++) {
      if (this.has(year, month)) {
        rows.push({
          year,
          value: this.output(amount, year, this.latestYear, month),
          inflation: this.inflationPercentage(year, this.latestYear, month),
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

  averageInflation(startYear: number, endYear: number, month: string): number {
    const yearDifference = endYear - startYear;

    if (yearDifference === 0) {
      return 0;
    }

    let totalInflation = 0;
    let year = startYear;

    for (let i = 0; i < Math.abs(yearDifference); i++) {
      if (yearDifference > 0) {
        year++;
      }

      const mutation = this.mutation(year, month);

      if (mutation === undefined) {
        return 0;
      }

      totalInflation += mutation;

      if (yearDifference < 0) {
        year--;
      }
    }

    return round(totalInflation / yearDifference);
  }
}

export function round(number: number, decimals: number = 2): number {
  return parseFloat((Math.round(number * 10000) / 10000).toFixed(decimals));
}

const amountFormat = new Intl.NumberFormat('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const percentFormat = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 2 });

/** Dutch notation: 1234.5 → "1.234,50". */
export function formatAmount(number: number): string {
  return amountFormat.format(number);
}

/** "€ 1.234,50", or "ƒ 1.234,50" for years before the euro. */
export function formatMoney(number: number, year: number): string {
  return `${currencySymbol(year)}\u00a0${formatAmount(number)}`;
}

/** Dutch notation without the sign: 39.28 → "39,28". */
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
