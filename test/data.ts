import { readFileSync } from 'node:fs';
import { CaoData, type CompactCaoData } from '../src/lib/cao.ts';
import { InflationData, type CompactData } from '../src/lib/inflation.ts';

// The frozen CBS snapshot every test runs against (test/fixtures/cbs.json).
// Deliberately not a live fetch: the build already fails when CBS is down or
// changes shape, and a test suite that moves with the data can't hold anyone
// to a number. Regenerate it only on purpose, and expect to update the
// expected values in inflation.test.ts with it.

interface Fixture extends CompactData {
  cao: CompactCaoData;
}

const fixture = JSON.parse(readFileSync(new URL('fixtures/cbs.json', import.meta.url), 'utf8')) as Fixture;

export function inflationData(): InflationData {
  return InflationData.fromCompact({ mutations: fixture.mutations, yearlyIndex: fixture.yearlyIndex });
}

export function caoData(): CaoData {
  return CaoData.fromCompact(fixture.cao);
}

/** The snapshot's own bounds, so tests read as facts rather than magic numbers. */
export const LATEST_MONTHLY = { year: 2026, month: 'MM08' };
export const LATEST_YEARLY_YEAR = 2025;
