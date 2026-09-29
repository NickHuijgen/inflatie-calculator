import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  EURO_INTRODUCTION_YEAR,
  FIRST_MONTHLY_YEAR,
  FIRST_YEAR,
  MONTHS,
  formatAmount,
  formatMoney,
  formatPercent,
  parseAmount,
  InflationData,
} from '../src/lib/inflation.ts';
import { LATEST_MONTHLY, LATEST_YEARLY_YEAR, inflationData } from './data.ts';

const data = inflationData();
const months = MONTHS.map(([code]) => code);

/** Every year/month pair the snapshot actually has figures for. */
function* periods(): Generator<[number, string]> {
  for (const month of months) {
    for (let year = FIRST_YEAR; year <= LATEST_MONTHLY.year; year++) {
      if (data.has(year, month)) {
        yield [year, month];
      }
    }
  }
}

describe('parseAmount', () => {
  it('reads Dutch notation', () => {
    assert.equal(parseAmount('1.234,50'), 1234.5);
    assert.equal(parseAmount('1234,5'), 1234.5);
    assert.equal(parseAmount('1.000'), 1000);
    assert.equal(parseAmount('12.500.000'), 12500000);
    assert.equal(parseAmount('€ 1.000'), 1000);
    assert.equal(parseAmount('ƒ 1.000'), 1000);
    assert.equal(parseAmount('1234.5'), 1234.5);
  });

  it('rejects what is not a number, rather than guessing', () => {
    for (const input of ['', 'abc', '1,2,3', '-5', '+5', '1e3', '1.000.00']) {
      assert.ok(Number.isNaN(parseAmount(input)), `${input} should not parse`);
    }
  });

  it('rejects amounts that are not finite', () => {
    // 310 digits parses to Infinity, which passes every `> 0` guard and used
    // to render as "€ ∞".
    assert.ok(Number.isNaN(parseAmount('1'.repeat(310))));
  });
});

describe('formatting', () => {
  it('is Dutch notation, always two decimals', () => {
    assert.equal(formatAmount(1234.5), '1.234,50');
    assert.equal(formatPercent(3.3), '3,30');
    assert.equal(formatMoney(100, 2026), '€ 100,00');
    assert.equal(formatMoney(100, EURO_INTRODUCTION_YEAR - 1), 'ƒ 100,00');
  });
});

describe('yearly averages', () => {
  it('are the exact ratio of the CBS index, without intermediate rounding', () => {
    let worst = 0;

    for (let from = FIRST_YEAR; from < LATEST_YEARLY_YEAR; from++) {
      for (let to = from + 1; to <= LATEST_YEARLY_YEAR; to++) {
        const ratio = data.priceLevel(to)! / data.priceLevel(from)!;
        const reported = data.inflationPercentage(from, to, 'JJ00');

        worst = Math.max(worst, Math.abs(reported - (ratio - 1) * 100));
      }
    }

    // Only the two decimals the figure is displayed with.
    assert.ok(worst <= 0.005, `worst deviation ${worst}`);
  });

  it('matches the known answers the year pages are built on', () => {
    // ƒ 100 from 1980 in 2025 money. An AI summary once answered "€78-95" for
    // this; the point of the year pages is to be the citable version.
    assert.equal(data.output(100, 1980, LATEST_YEARLY_YEAR, 'JJ00'), 133.71);
    assert.equal(data.output(100, 1900, LATEST_YEARLY_YEAR, 'JJ00'), 1704.08);
  });
});

describe('averageInflation', () => {
  it('is the compound rate: applying it n times gives the total change', () => {
    for (const [from, to, month] of [[1990, 2026, 'MM08'], [1900, 2025, 'JJ00'], [2016, 2025, 'JJ00']] as const) {
      const average = data.averageInflation(from, to, month);
      const total = data.inflationPercentage(from, to, month);
      const implied = ((1 + average / 100) ** (to - from) - 1) * 100;

      // The rate is rounded to two decimals before it is shown, which over a
      // long span is worth a little; the relative gap stays under 1%.
      assert.ok(Math.abs(implied - total) / Math.abs(total) < 0.01, `${from}-${to} ${month}: ${implied} vs ${total}`);
    }
  });

  it('does not depend on the order the years are given in', () => {
    for (const [year, month] of periods()) {
      const other = Math.max(FIRST_YEAR, year - 7);

      if (data.has(other, month)) {
        assert.equal(data.averageInflation(other, year, month), data.averageInflation(year, other, month));
      }
    }
  });

  it('is 0 for a single year and for periods without figures', () => {
    assert.equal(data.averageInflation(2000, 2000, 'JJ00'), 0);
    assert.equal(data.averageInflation(1950, 2000, 'MM01'), 0);
  });
});

describe('converting back', () => {
  it('returns the original amount, up to the rounding of each step', () => {
    let worst = { error: 0, label: '' };

    for (const [year, month] of periods()) {
      for (const other of [year - 1, year - 10, year - 40]) {
        if (!data.has(other, month)) {
          continue;
        }

        const there = data.output(1000, other, year, month);
        const back = data.output(there, year, other, month);

        const error = Math.abs(back - 1000) / 1000;
        if (error > worst.error) {
          worst = { error, label: `${other} <-> ${year} ${month}` };
        }
      }
    }

    // Months chain one-decimal percentages and round at every step, so the
    // round trip is not exact -- but it is within 0.12%.
    assert.ok(worst.error < 0.0012, `worst round trip ${(worst.error * 100).toFixed(3)}% at ${worst.label}`);
  });

  it('applies the fixed guilder rate exactly once when a period crosses 2002', () => {
    const inEuros = data.output(100, 2001, 2002, 'JJ00');
    const backInGuilders = data.output(inEuros, 2002, 2001, 'JJ00');

    assert.ok(inEuros < 100, 'guilders convert to fewer euros');
    assert.ok(Math.abs(backInGuilders - 100) < 0.01, `${backInGuilders} back from ${inEuros}`);
  });
});

describe('missing figures', () => {
  it('are reported, not invented', () => {
    for (const [year, month] of [[LATEST_MONTHLY.year, 'JJ00'], [LATEST_MONTHLY.year, 'MM12'], [FIRST_MONTHLY_YEAR - 1, 'MM01'], [FIRST_YEAR - 1, 'JJ00']] as const) {
      assert.equal(data.has(year, month), false, `${year}${month}`);
      assert.equal(data.output(100, 2000, year, month), -1);
      assert.ok(Number.isNaN(data.inflationPercentage(2000, year, month)), 'a missing period is NaN, never a plausible -101%');
    }
  });

  it('are not created by an amount that is not a positive number', () => {
    for (const amount of [0, -5, NaN, Infinity]) {
      assert.equal(data.output(amount, 2000, 2020, 'JJ00'), -1, `amount ${amount}`);
    }
  });

  it('stop the yearly index rather than carrying NaN into the pages', () => {
    // CBS publishing a period without a usable figure used to make every
    // yearly figure NaN, which no guard downstream catches ("€ NaN").
    const broken = new InflationData(
      [
        { ID: 0, Perioden: '2024JJ00', JaarmutatieCPI_1: '     3.0', JaarmutatieCPIAfgeleid_2: null },
        { ID: 1, Perioden: '2025JJ00', JaarmutatieCPI_1: '        ', JaarmutatieCPIAfgeleid_2: null },
      ],
      [[2023, 100], [2024, 103]],
    );

    assert.equal(broken.latestYearlyYear, 2024);
    assert.equal(broken.has(2025, 'JJ00'), false);
    assert.equal(broken.output(100, 2023, 2025, 'JJ00'), -1);
    assert.ok(Number.isFinite(broken.output(100, 2023, 2024, 'JJ00')));
  });
});

describe('the latest period', () => {
  it('is the newest entry, whatever order the feed arrives in', () => {
    const forwards = inflationData();
    const compact = forwards.toCompact();
    const reversed = InflationData.fromCompact({ mutations: [...compact.mutations].reverse(), yearlyIndex: compact.yearlyIndex });

    assert.equal(forwards.latestYear, LATEST_MONTHLY.year);
    assert.equal(forwards.latestMonth, LATEST_MONTHLY.month);
    assert.equal(reversed.latestYear, forwards.latestYear);
    assert.equal(reversed.latestMonth, forwards.latestMonth);
  });

  it('names a month when copy asks for a month', () => {
    assert.equal(data.latestMonthlyLabel, 'augustus 2026');

    // The weeks after CBS publishes a yearly figure: the newest period is a
    // year, but "maandcijfers tot en met ..." still has to name a month.
    const january = InflationData.fromCompact({
      mutations: data.toCompact().mutations.filter(([period]) => period <= '2025MM12' || period === '2025JJ00'),
      yearlyIndex: data.toCompact().yearlyIndex,
    });

    assert.equal(january.latestMonth, 'JJ00');
    assert.equal(january.latestPeriodLabel, '2025');
    assert.equal(january.latestMonthlyLabel, 'december 2025');
  });
});

describe('the embedded copy the browser rebuilds from', () => {
  it('answers exactly like the one the build used', () => {
    const rebuilt = InflationData.fromCompact(data.toCompact());

    for (const [year, month] of periods()) {
      assert.equal(rebuilt.output(250, FIRST_YEAR + 63, year, month), data.output(250, FIRST_YEAR + 63, year, month));
    }

    assert.equal(rebuilt.latestYearlyYear, data.latestYearlyYear);
    assert.equal(rebuilt.latestPeriodLabel, data.latestPeriodLabel);
  });
});

describe('historicalValues', () => {
  it('covers every year from 1900 up to the latest complete one', () => {
    const rows = data.historicalValues(100);

    assert.equal(rows[0].year, FIRST_YEAR);
    assert.equal(rows.at(-1)!.year, LATEST_YEARLY_YEAR - 1);
    assert.ok(rows.every(row => row.value > 0 && Number.isFinite(row.inflation)));
  });
});
