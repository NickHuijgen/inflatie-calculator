import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { FIRST_CAO_YEAR } from '../src/lib/cao.ts';
import { FIRST_YEAR, MONTHS } from '../src/lib/inflation.ts';
import { caoPeriodNote, comparedToCao, realWageChange, salaryComparison, wageComparison } from '../src/lib/salary.ts';
import { LATEST_MONTHLY, LATEST_YEARLY_YEAR, caoData, inflationData } from './data.ts';

const data = inflationData();
const cao = caoData();
const months = MONTHS.map(([code]) => code);

describe('salaryComparison', () => {
  it('measures the real change against the amount actually needed', () => {
    const comparison = salaryComparison(data, 3000, 2016, 2025, 'JJ00', 3600)!;

    assert.equal(comparison.required, 4023.97);
    // Not the difference between two percentages: 3600 against 4023.97.
    assert.equal(comparison.actual!.realChange, -10.54);
    assert.equal(comparison.actual!.nominalChange, 20);
  });

  it('converts the currency before comparing two nominal amounts', () => {
    // A guilder salary against a euro one is meaningless without the fixed
    // rate: 2000 guilders is ~907 euro, so 1000 euro is a rise, not a fall.
    const comparison = salaryComparison(data, 2000, 2000, 2010, 'JJ00', 1000)!;

    assert.ok(comparison.actual!.nominalChange > 0, `${comparison.actual!.nominalChange}`);
  });

  it('describes prices forwards in time, whichever order the years are given', () => {
    const forwards = salaryComparison(data, 3000, 2016, 2025, 'JJ00', 3600)!;
    const backwards = salaryComparison(data, 3000, 2025, 2016, 'JJ00', 3600)!;

    assert.equal(forwards.inflation, backwards.inflation);
    assert.equal(forwards.average, backwards.average);
  });

  it('measures the pay rise from the amount belonging to the earlier year', () => {
    // Same two (amount, year) pairs, entered the other way round: 3000 in
    // 2016 and 3600 in 2025 is a 20% rise however the fields are filled in.
    assert.equal(salaryComparison(data, 3000, 2016, 2025, 'JJ00', 3600)!.actual!.nominalChange, 20);
    assert.equal(salaryComparison(data, 3600, 2025, 2016, 'JJ00', 3000)!.actual!.nominalChange, 20);
  });

  it('answers about the same comparison whichever way round the years are', () => {
    // Two salaries each belong to a year, so entering the years backwards
    // only decides which field holds the earlier one. Every figure has to
    // agree -- the keep-up block used to answer backwards while the pay rise
    // ran forwards, which put "koopkracht gestegen" next to "salaris daalde".
    const forwards = salaryComparison(data, 3000, 2016, 2025, 'JJ00', 3600)!;
    const backwards = salaryComparison(data, 3600, 2025, 2016, 'JJ00', 3000)!;

    for (const key of ['baseSalary', 'baseYear', 'targetYear', 'required', 'inflation', 'average'] as const) {
      assert.equal(backwards[key], forwards[key], key);
    }

    assert.deepEqual(backwards.actual, forwards.actual);
    assert.equal(forwards.baseYear, 2016);
    assert.equal(forwards.baseSalary, 3000);
  });

  it('measures the purchasing power over the same period as the pay rise', () => {
    // Both are measured forwards now, so the real change is what is left of
    // the nominal one after the inflation the card prints beside it. When
    // they ran over different periods this did not hold at all: the same card
    // said "koopkracht 60,96% gestegen" and "salaris daalde 16,67%".
    for (const month of months) {
      for (let year = 1965; year <= 2020; year += 5) {
        for (const [from, to] of [[year, year + 5], [year + 5, year]] as const) {
          const comparison = salaryComparison(data, 3600, from, to, month, 3000);

          if (comparison?.actual) {
            const { nominalChange, realChange } = comparison.actual;
            const expected = realWageChange(nominalChange, comparison.inflation);

            assert.ok(Math.abs(realChange - expected) < 0.5, `${from}->${to} ${month}: ${realChange} vs ${expected}`);
          }
        }
      }
    }
  });

  it('answers a single salary in the direction it was asked', () => {
    // Nothing to run forwards to: "what is my 2025 salary worth in 2016?" is
    // a fair question and keeps its own direction.
    const backwards = salaryComparison(data, 3000, 2025, 2016, 'JJ00')!;

    assert.equal(backwards.baseYear, 2025);
    assert.equal(backwards.targetYear, 2016);
    assert.equal(backwards.required, 2236.6);
    assert.equal(backwards.inflation, salaryComparison(data, 3000, 2016, 2025, 'JJ00')!.inflation);
  });

  it('keeps the gap and the real change telling the same story', () => {
    for (const month of months) {
      for (let year = FIRST_YEAR; year <= LATEST_MONTHLY.year; year += 7) {
        const comparison = salaryComparison(data, 3000, year, Math.min(year + 10, LATEST_MONTHLY.year), month, 3600);

        if (comparison?.actual) {
          assert.equal(comparison.actual.gap < 0, comparison.actual.realChange < 0, `${year} ${month}`);
        }
      }
    }
  });

  it('returns nothing rather than a result when a period has no figures', () => {
    assert.equal(salaryComparison(data, 3000, 1950, 2020, 'MM01'), undefined);
    assert.equal(salaryComparison(data, 3000, 2016, LATEST_MONTHLY.year, 'JJ00'), undefined);
    assert.equal(salaryComparison(data, 0, 2016, 2025, 'JJ00'), undefined);
  });

  it('leaves out the keep-up figures when no current salary was entered', () => {
    assert.equal(salaryComparison(data, 3000, 2016, 2025, 'JJ00')!.actual, undefined);
    assert.equal(salaryComparison(data, 3000, 2016, 2025, 'JJ00', 0)!.actual, undefined);
  });
});

describe('realWageChange', () => {
  it('is what is left after inflation, not the difference between percentages', () => {
    assert.equal(realWageChange(5, 3), 1.94);
  });
});

describe('comparedToCao', () => {
  it('calls a difference too small to show "evenveel"', () => {
    assert.equal(comparedToCao(5, 3), 'meer');
    assert.equal(comparedToCao(3, 5), 'minder');
    assert.equal(comparedToCao(5, 5.001), 'evenveel');
  });
});

describe('wageComparison', () => {
  it('never pairs cao figures with prices from another period', () => {
    for (const month of months) {
      for (let from = FIRST_YEAR; from <= LATEST_MONTHLY.year; from++) {
        for (const to of [from + 1, from + 9, LATEST_MONTHLY.year]) {
          const wages = wageComparison(data, cao, from, to, month);

          if (!wages) {
            continue;
          }

          assert.ok(cao.has(wages.fromYear, wages.month) && cao.has(wages.toYear, wages.month), `cao missing for ${wages.fromYear}-${wages.toYear} ${wages.month}`);
          assert.ok(data.has(wages.fromYear, wages.month) && data.has(wages.toYear, wages.month), `prices missing for ${wages.fromYear}-${wages.toYear} ${wages.month}`);
          assert.equal(wages.real, realWageChange(wages.cao, wages.prices));
          assert.ok(Number.isFinite(wages.cao) && Number.isFinite(wages.prices));
        }
      }
    }
  });

  it('falls back to yearly averages inside the cao index its own range', () => {
    for (const month of months) {
      for (let from = FIRST_YEAR; from <= LATEST_MONTHLY.year; from += 3) {
        const wages = wageComparison(data, cao, from, LATEST_MONTHLY.year, month);

        if (wages && !wages.exact) {
          assert.equal(wages.month, 'JJ00');
          assert.ok(wages.fromYear >= FIRST_CAO_YEAR, `${wages.fromYear}`);
          assert.ok(wages.toYear <= LATEST_YEARLY_YEAR, `${wages.toYear}`);
          assert.ok(wages.reason, 'a moved period must say why');
        }
      }
    }
  });

  it('blames the right thing for moving the period', () => {
    // A month comparison has no cao figures before 2020.
    assert.equal(wageComparison(data, cao, 2016, LATEST_MONTHLY.year, 'MM08')!.reason, 'month');
    // Yearly averages that start before the cao index does.
    assert.equal(wageComparison(data, cao, 1960, 2020, 'JJ00')!.reason, 'firstYear');
    // Yearly averages that run past the last complete cao year.
    assert.equal(wageComparison(data, cao, 2016, LATEST_MONTHLY.year, 'JJ00')!.reason, 'lastYear');

    for (const reason of ['month', 'firstYear', 'lastYear'] as const) {
      const wages = { fromYear: 2016, toYear: 2025, month: 'JJ00', cao: 1, prices: 1, real: 0, exact: false, reason };

      assert.match(caoPeriodNote(wages), /2016 tot en met 2025/);
    }
  });

  it('is exact only when it answers about the period that was asked for', () => {
    const exact = wageComparison(data, cao, 2016, 2025, 'JJ00')!;

    assert.equal(exact.exact, true);
    assert.equal(exact.reason, undefined);
    assert.equal(caoPeriodNote(exact), '');
    assert.equal(exact.fromYear, 2016);
    assert.equal(exact.toYear, 2025);
  });

  it('gives nothing at all when both years predate the cao index', () => {
    assert.equal(wageComparison(data, cao, 1930, 1960, 'JJ00'), undefined);
    assert.equal(wageComparison(data, cao, 2000, 2000, 'JJ00'), undefined);
  });
});

describe('cao figures', () => {
  it('are the exact ratio of the index levels', () => {
    const growth = cao.growth(2016, 2025, 'JJ00')!;
    const levels = cao.level(2025, 'JJ00')! / cao.level(2016, 'JJ00')!;

    assert.ok(Math.abs(growth - (levels - 1) * 100) < 1e-9);
  });

  it('stay within a rounding step of what CBS publishes, for recent years', () => {
    // CBS rounds both the percentages and the index levels to one decimal, so
    // the two can differ -- the further back, the smaller the index and the
    // larger the gap (up to ~0,4pp in the 1970s; see AGENTS.md).
    assert.ok(Math.abs(cao.yearlyChange(2025)! - 5.0) <= 0.05, `${cao.yearlyChange(2025)}`);
    assert.ok(Math.abs(cao.yearlyChange(2016)! - 1.9) <= 0.15, `${cao.yearlyChange(2016)}`);
  });
});
