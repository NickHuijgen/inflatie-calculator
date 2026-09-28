export interface YearData {
  ID: number;
  Perioden: string;
  JaarmutatieCPI_1: string;
  JaarmutatieCPIAfgeleid_2: string | null;
}

export const CBS_DATA_URL = 'https://opendata.cbs.nl/ODataFeed/odata/70936ned/UntypedDataSet?%24format=json';
export const CBS_DATASET_URL = 'https://opendata.cbs.nl/#/CBS/nl/dataset/70936ned/table?ts=1664823822870';
export const FIRST_YEAR = 1963;
export const EURO_INTRODUCTION_YEAR = 2002;

const guilderToEuroConversionRate = 0.453780;
const euroToGuilderConversionRate = 2.20371;

export async function fetchInflationData(): Promise<InflationData> {
  const response = await fetch(CBS_DATA_URL);
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
      for (let i = 0; i < Math.abs(yearDifference); i++) {
        if (year === EURO_INTRODUCTION_YEAR && conversion) {
          CPIMutation = round(CPIMutation * euroToGuilderConversionRate);
        }

        CPIMutation = round(CPIMutation * (-Math.abs(this.mutation(year, month)! / 100) + 1));

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

export function numberWithCommas(number: number): string {
  return number.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function currencySymbol(year: number): string {
  return year < EURO_INTRODUCTION_YEAR ? 'ƒ' : '€';
}
