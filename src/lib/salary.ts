import { FIRST_CAO_MONTHLY_YEAR, FIRST_CAO_YEAR, type CaoData } from './cao.ts';
import { convertCurrency, round, type InflationData } from './inflation.ts';

// The maths behind /salaris. Pure, like inflation.ts: no DOM access, so the
// page and its script can share it. Every purchasing-power figure comes from
// InflationData -- there is no second inflation calculation here.

export interface ActualSalary {
  salary: number;
  /** What that salary is worth in the start year's money. */
  realValue: number;
  /** Difference with `required`, in the end year's currency. */
  gap: number;
  /** Purchasing-power change in percent: the figure that actually matters. */
  realChange: number;
  /**
   * The change on the payslip, in percent, with the currency converted.
   * Measured forwards in time like `inflation`, so it can be held against
   * the cao rise whichever order the years were entered in.
   */
  nominalChange: number;
}

export interface SalaryComparison {
  /**
   * The salary the answer starts from and the year it belongs to. With two
   * salaries this is always the one from the earlier year, whichever field it
   * was typed in; with one it is simply what was entered. Every renderer takes
   * its years and its amounts from here rather than from the form, so the
   * sentences describe the comparison that was actually made.
   */
  baseSalary: number;
  baseYear: number;
  /** The year the answer is about. */
  targetYear: number;
  /** What `baseSalary` has to be in `targetYear` for the same purchasing power. */
  required: number;
  /** Total price change between the two years, forwards in time, in percent. */
  inflation: number;
  /** Compound average price change per year, in percent. */
  average: number;
  /** Only present when a current salary was entered. */
  actual?: ActualSalary;
}

/**
 * What a salary from `startYear` has to be in `endYear` to buy the same, and
 * -- when `currentSalary` is given -- how the real salary compares with that.
 * Returns undefined when either period has no CBS figures.
 */
export function salaryComparison(
  data: InflationData,
  salary: number,
  startYear: number,
  endYear: number,
  month: string,
  currentSalary?: number,
): SalaryComparison | undefined {
  // Prices are always described forwards in time, whichever order the years
  // were entered in -- the same rule the calculator on / follows.
  const fromYear = Math.min(startYear, endYear);
  const toYear = Math.max(startYear, endYear);

  // So is everything else here, once there are two salaries to compare. Each
  // salary belongs to a year, so entering the years backwards (or one click
  // of the swap button) does not turn the question round -- it only decides
  // which field holds the earlier salary. Measuring the purchasing power in
  // the entered order while the pay rise ran forwards put two contradictory
  // sentences in the same card: "koopkracht 60,96% gestegen" above "salaris
  // daalde 16,67%".
  //
  // With a single salary there is nothing to run forwards to, so the question
  // is answered the way it was asked: what that amount is worth in the other
  // year, earlier or later.
  const current = currentSalary !== undefined && currentSalary > 0 ? currentSalary : undefined;

  const [baseSalary, later]: [number, number | undefined] = current === undefined
    ? [salary, undefined]
    : startYear <= endYear ? [salary, current] : [current, salary];

  const baseYear = current === undefined ? startYear : fromYear;
  const targetYear = current === undefined ? endYear : toYear;

  const required = data.output(baseSalary, baseYear, targetYear, month);

  // Same guard as the calculator on /: anything that isn't a positive result
  // is a missing figure or a half-typed amount, never something to show.
  if (!(required > 0)) {
    return undefined;
  }

  const comparison: SalaryComparison = {
    baseSalary,
    baseYear,
    targetYear,
    required,
    inflation: data.inflationPercentage(fromYear, toYear, month),
    average: data.averageInflation(fromYear, toYear, month),
  };

  if (later !== undefined) {
    comparison.actual = {
      salary: later,
      realValue: data.output(later, targetYear, baseYear, month),
      gap: round(later - required),
      realChange: round((later / required - 1) * 100),
      // Nominally, guilders and euros can only be compared at the fixed rate.
      nominalChange: round((later / convertCurrency(baseSalary, baseYear, targetYear) - 1) * 100),
    };
  }

  return comparison;
}

export interface WageComparison {
  fromYear: number;
  toYear: number;
  month: string;
  /** Total rise in cao wages over that period, in percent. */
  cao: number;
  /** Total rise in prices over the same period, in percent. */
  prices: number;
  /** What is left of the cao rise after inflation, in percent. */
  real: number;
  /** False when this is not the period the visitor asked about. */
  exact: boolean;
  /**
   * Why the period moved, so the page can explain the right thing. The note
   * used to blame the missing monthly figures every time, which is simply
   * untrue when the visitor already chose Jaargemiddelde and the period moved
   * because the cao index starts in 1972 or stops at its last complete year.
   */
  reason?: 'month' | 'firstYear' | 'lastYear';
}

/**
 * How cao wages and prices moved over the same period, for the context block
 * on /salaris. Self-contained on purpose: cao figures per month only start in
 * 2020, so a comparison the visitor asked for may be impossible. Rather than
 * silently pairing cao figures from one period with prices from another, it
 * falls back to the yearly averages of those years within the cao index's own
 * range (1972 up to its latest complete year) and reports the period it
 * actually used, so the page can say so. Undefined when even that is
 * impossible.
 */
export function wageComparison(
  data: InflationData,
  cao: CaoData,
  startYear: number,
  endYear: number,
  month: string,
): WageComparison | undefined {
  const result = (from: number, to: number, period: string, reason?: WageComparison['reason']): WageComparison => {
    const caoChange = round(cao.growth(from, to, period)!);
    const prices = data.inflationPercentage(from, to, period);

    return { fromYear: from, toYear: to, month: period, cao: caoChange, prices, real: realWageChange(caoChange, prices), exact: !reason, reason };
  };

  const fromYear = Math.min(startYear, endYear);
  const toYear = Math.max(startYear, endYear);

  if (fromYear !== toYear && [fromYear, toYear].every(year => cao.has(year, month) && data.has(year, month))) {
    return result(fromYear, toYear, month);
  }

  const first = Math.max(fromYear, FIRST_CAO_YEAR);
  const last = Math.min(toYear, cao.latestYearlyYear);

  if (first >= last || ![first, last].every(year => cao.has(year, 'JJ00') && data.has(year, 'JJ00'))) {
    return undefined;
  }

  // Which reason to give. Switching from a month to yearly averages is the
  // most visible change, so it comes first -- but only when a month was
  // actually asked for: blaming the missing monthly figures when the visitor
  // already chose Jaargemiddelde is simply untrue, and there the reason is
  // whichever bound the cao index moved. The note names the period either
  // way, so nobody can be wrong about what is being compared.
  const reason = month !== 'JJ00' ? 'month' : first !== fromYear ? 'firstYear' : 'lastYear';

  return result(first, last, 'JJ00', reason);
}

/**
 * Why the cao block is answering about other years than the form asks, in
 * words. Shared with the script for the same reason as comparedToCao.
 */
export function caoPeriodNote(wages: WageComparison): string {
  const period = `dit zijn de jaargemiddelden van ${wages.fromYear} tot en met ${wages.toYear}`;

  switch (wages.reason) {
    case 'firstYear':
      return `De cao-loonindex begint pas in ${FIRST_CAO_YEAR}, dus ${period}.`;
    case 'lastYear':
      return `${wages.toYear} is het laatste jaar met een volledig cao-jaargemiddelde, dus ${period}.`;
    case 'month':
      return `Cao-cijfers per maand zijn er pas vanaf ${FIRST_CAO_MONTHLY_YEAR}, dus ${period}.`;
    default:
      return '';
  }
}

/**
 * How the visitor's own rise compares with the cao rise. Shared by the page
 * and its script so the static and the recalculated sentence can't disagree,
 * threshold included.
 */
export function comparedToCao(nominalChange: number, caoChange: number): 'meer' | 'minder' | 'evenveel' {
  if (Math.abs(nominalChange - caoChange) < 0.005) {
    return 'evenveel';
  }

  return nominalChange > caoChange ? 'meer' : 'minder';
}

/**
 * What is left of a wage rise after inflation, in percent. Not the difference
 * between the two percentages: 5% more pay with 3% higher prices leaves
 * 1,94%, not 2%.
 */
export function realWageChange(wageChange: number, priceChange: number): number {
  return round(((1 + wageChange / 100) / (1 + priceChange / 100) - 1) * 100);
}

export interface PurchasingPowerPoint {
  year: number;
  /** Cao wages, `FIRST_CAO_YEAR` = 100. */
  wages: number;
  /** Prices, `FIRST_CAO_YEAR` = 100. */
  prices: number;
  /** What the average cao wage buys, `FIRST_CAO_YEAR` = 100. */
  purchasingPower: number;
}

/**
 * The purchasing power of the average cao wage per year, from
 * `FIRST_CAO_YEAR` up to the last year with both a cao and a price figure.
 * Yearly averages only, so cao and prices always come from the same period,
 * and exact ratios of the index levels without intermediate rounding.
 * Empty when the first year itself has no figures.
 */
export function caoPurchasingPower(data: InflationData, cao: CaoData): PurchasingPowerPoint[] {
  const baseWage = cao.level(FIRST_CAO_YEAR, 'JJ00');
  const basePrice = data.priceLevel(FIRST_CAO_YEAR);
  const lastYear = Math.min(cao.latestYearlyYear, data.latestYearlyYear);
  const points = [];

  if (baseWage === undefined || basePrice === undefined) {
    return [];
  }

  for (let year = FIRST_CAO_YEAR; year <= lastYear; year++) {
    const wage = cao.level(year, 'JJ00');
    const price = data.priceLevel(year);

    if (wage !== undefined && price !== undefined) {
      const wages = (wage / baseWage) * 100;
      const prices = (price / basePrice) * 100;
      points.push({ year, wages, prices, purchasingPower: (wages / prices) * 100 });
    }
  }

  return points;
}
