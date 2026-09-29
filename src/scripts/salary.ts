import { CaoData, type CompactCaoData } from '../lib/cao.ts';
import {
  FIRST_MONTHLY_YEAR,
  FIRST_YEAR,
  InflationData,
  type CompactData,
  formatAmount,
  formatMoney,
  formatPercent,
  parseAmount,
} from '../lib/inflation.ts';
import { caoPeriodNote, comparedToCao, salaryComparison, wageComparison } from '../lib/salary.ts';
import { clampYear, element, isUnchanged, monthLabel, monthToParam, paramToMonth } from './form.ts';

// Makes SalaryCalculator.astro interactive. Same division of labour as
// calculator.ts: this file only reads the form, calls src/lib/salary.ts and
// writes text into the elements the page already rendered — every sentence
// lives in the component, so the static page and the updated one read alike.

const thenInput = element<HTMLInputElement>('salary-input-then');
const nowInput = element<HTMLInputElement>('salary-input-now');
const startYearInput = element<HTMLInputElement>('salary-input-start-year');
const endYearInput = element<HTMLInputElement>('salary-input-end-year');
const monthSelect = element<HTMLSelectElement>('salary-select-month');
const switchButton = element<HTMLButtonElement>('salary-switch-years');
const shareButton = element<HTMLButtonElement>('salary-share');

const result = element('salary-result');
const keepUp = element('salary-keepup');
const keepUpPrompt = element('salary-keepup-prompt');
const caoBlock = element('salary-cao');
const caoYours = element('salary-cao-yours');
const caoNote = element('salary-cao-note');
const resultMissing = element('salary-result-missing');
const resultNote = element('salary-result-note');
const resultStatus = element('salary-result-status');
const shareFeedback = element('salary-share-feedback');

// Both datasets are embedded by the build (see SalaryCalculator.astro), so
// the page never contacts CBS and works the moment it loads.
const data = InflationData.fromCompact(JSON.parse(element('cbs-data').textContent!) as CompactData);
const cao = CaoData.fromCompact(JSON.parse(element('cao-data').textContent!) as CompactCaoData);

// Shareable URLs: ?bedrag=3000&van=2016&naar=2026&maand=08&nu=3600. The four
// names /  uses mean the same thing here; `nu` is this page's own.
const PARAMS = { amount: 'bedrag', startYear: 'van', endYear: 'naar', month: 'maand', currentSalary: 'nu' } as const;

/** The optional current salary, or undefined when the field is empty. */
function currentSalary(): number | undefined {
  const value = parseAmount(nowInput.value);

  return value > 0 ? value : undefined;
}

/**
 * Recalculates and updates the result. Returns a summary when the inputs are
 * valid, for the status announcement and the share text.
 */
function render(): string | undefined {
  const amount = parseAmount(thenInput.value);
  const startYear = startYearInput.valueAsNumber;
  const endYear = endYearInput.valueAsNumber;
  const month = monthSelect.value;
  const salary = currentSalary();

  const comparison = salaryComparison(data, amount, startYear, endYear, month, salary);

  if (!comparison) {
    // A valid year that just has no figures for this month gets an
    // explanation; anything else is half-typed, so dim the last result until
    // the field is left and resetBadInputs() corrects it. Same rule as /.
    const missingYear = [startYear, endYear].find(year => year >= FIRST_YEAR && year <= data.latestYear && !data.has(year, month));

    if (missingYear !== undefined && amount > 0) {
      if (month === 'JJ00') {
        resultMissing.textContent = `Voor ${missingYear} is nog geen jaargemiddelde beschikbaar. Kies een maand of een eerder jaar.`;
      } else if (missingYear < FIRST_MONTHLY_YEAR) {
        resultMissing.textContent = `Voor jaren vóór ${FIRST_MONTHLY_YEAR} zijn alleen jaargemiddelden beschikbaar. Kies bij "Vergelijk op" het jaargemiddelde.`;
      } else {
        resultMissing.textContent = `Voor ${monthLabel(month)} ${missingYear} zijn nog geen cijfers. De nieuwste cijfers zijn van ${data.latestPeriodLabel}.`;
      }

      resultMissing.hidden = false;
      result.hidden = true;
    } else {
      result.classList.add('opacity-40');
    }

    return undefined;
  }

  // The comparison decides which salary and which years it answered about:
  // with two salaries it runs forwards in time, so the base is whichever
  // field holds the earlier year (see salaryComparison).
  const { baseSalary, baseYear, targetYear, required, inflation, average, actual } = comparison;

  element('salary-result-then').textContent = formatMoney(baseSalary, baseYear);
  element('salary-result-start-year').textContent = String(baseYear);
  element('salary-result-end-year').textContent = String(targetYear);
  element('salary-result-required').textContent = formatMoney(required, targetYear);

  // Prices are always described forwards in time, whichever order the years
  // were entered in.
  const fromYear = Math.min(startYear, endYear);
  const toYear = Math.max(startYear, endYear);

  element('salary-result-change').hidden = fromYear === toYear;
  element('salary-result-same-year').hidden = fromYear !== toYear;
  element('salary-result-from-year').textContent = String(fromYear);
  element('salary-result-to-year').textContent = String(toYear);
  element('salary-result-direction').textContent = inflation < 0 ? 'daalden' : 'stegen';
  element('salary-result-inflation').textContent = formatPercent(Math.abs(inflation));
  element('salary-result-average').textContent = formatPercent(average);

  // One or the other: the numbers, or the line inviting them to be entered.
  keepUp.hidden = !actual;
  keepUpPrompt.hidden = !!actual;

  if (actual) {
    element('salary-keepup-end-year').textContent = String(targetYear);
    element('salary-keepup-salary').textContent = formatMoney(actual.salary, targetYear);
    element('salary-keepup-gap').textContent = formatMoney(Math.abs(actual.gap), targetYear);
    element('salary-keepup-gap-direction').textContent = actual.gap < 0 ? 'minder' : 'meer';
    element('salary-keepup-real').textContent = formatPercent(Math.abs(actual.realChange));
    element('salary-keepup-real-direction').textContent = actual.realChange < 0 ? 'gedaald' : 'gestegen';
    element('salary-keepup-real-value').textContent = formatMoney(actual.realValue, baseYear);
    element('salary-keepup-start-year').textContent = String(baseYear);
    element('salary-keepup-start-year-2').textContent = String(baseYear);
  }

  renderCao(startYear, endYear, month, actual?.nominalChange);

  result.hidden = false;
  result.classList.remove('opacity-40');
  resultMissing.hidden = true;

  const summary = `${formatMoney(baseSalary, baseYear)} uit ${baseYear} komt in ${targetYear} overeen met ${formatMoney(required, targetYear)}.`;

  return actual
    ? `${summary} In ${targetYear} verdien je ${formatMoney(actual.salary, targetYear)}: ${formatMoney(Math.abs(actual.gap), targetYear)} ${actual.gap < 0 ? 'minder' : 'meer'} dan nodig om dezelfde koopkracht te houden als in ${baseYear}.`
    : summary;
}

/**
 * The cao-loon context. Hidden when CBS has no comparable cao figures at all;
 * when the exact period is unavailable, wageComparison() answers about the
 * yearly averages instead and the note says which years those are.
 */
function renderCao(startYear: number, endYear: number, month: string, nominalChange: number | undefined): void {
  const wages = wageComparison(data, cao, startYear, endYear, month);

  caoBlock.hidden = !wages;

  if (!wages) {
    return;
  }

  element('salary-cao-from-year').textContent = String(wages.fromYear);
  element('salary-cao-to-year').textContent = String(wages.toYear);
  element('salary-cao-direction').textContent = wages.cao < 0 ? 'daalden' : 'stegen';
  element('salary-cao-growth').textContent = formatPercent(Math.abs(wages.cao));
  element('salary-cao-prices').textContent = formatPercent(Math.abs(wages.prices));
  element('salary-cao-prices-direction').textContent = wages.prices < 0 ? 'daalden' : 'stegen';
  element('salary-cao-real-direction').textContent = wages.real < 0 ? 'daalden' : 'stegen';
  element('salary-cao-real').textContent = formatPercent(Math.abs(wages.real));

  caoYours.hidden = nominalChange === undefined;

  if (nominalChange !== undefined) {
    element('salary-cao-yours-direction').textContent = nominalChange < 0 ? 'daalde' : 'steeg';
    element('salary-cao-yours-from').textContent = String(Math.min(startYear, endYear));
    element('salary-cao-yours-to').textContent = String(Math.max(startYear, endYear));
    element('salary-cao-yours-growth').textContent = formatPercent(Math.abs(nominalChange));
    // Only a like-for-like claim when the cao figures cover the visitor's own
    // period; over a fallback period the two spans differ, so both sentences
    // name their years and the verdict is left out.
    element('salary-cao-yours-verdict').hidden = !wages.exact;
    element('salary-cao-yours-compared').textContent = comparedToCao(nominalChange, wages.cao);
  }

  caoNote.hidden = wages.exact;
  caoNote.textContent = caoPeriodNote(wages);
}

function resetBadInputs(): void {
  const amount = parseAmount(thenInput.value);
  const salary = currentSalary();

  thenInput.value = formatAmount(amount > 0 ? amount : 1);
  // "Salaris nu" is optional: an empty field stays empty, and anything that
  // isn't a number is cleared rather than replaced with a made-up salary.
  nowInput.value = salary === undefined ? '' : formatAmount(salary);
  clampYear(startYearInput, data.latestYear);
  clampYear(endYearInput, data.latestYear);
}

/**
 * Before 1963 CBS only has yearly prices. When a committed year is that
 * early, switch to the yearly average instead of showing no result — and if
 * the other year is the current one (which has no yearly average yet), move
 * it to the latest complete year. Explains itself in #salary-result-note.
 */
function adjustForYearlyOnly(): void {
  const years = [startYearInput, endYearInput];

  resultNote.hidden = true;

  if (monthSelect.value === 'JJ00' || !years.some(input => input.valueAsNumber < FIRST_MONTHLY_YEAR)) {
    return;
  }

  monthSelect.value = 'JJ00';

  let note = `Vóór ${FIRST_MONTHLY_YEAR} zijn alleen jaargemiddelden beschikbaar, dus die worden vergeleken.`;

  for (const input of years) {
    if (!data.has(input.valueAsNumber, 'JJ00')) {
      input.valueAsNumber = data.latestYearlyYear;
      note += ` ${data.latestYearlyYear} is het meest recente jaar met een jaargemiddelde.`;
    }
  }

  resultNote.textContent = note;
  resultNote.hidden = false;
}

function isDefault(): boolean {
  return [thenInput, nowInput, startYearInput, endYearInput].every(isUnchanged)
    && [...monthSelect.options].every(option => option.selected === option.defaultSelected);
}

/** Mirrors the form into the address bar so the result can be shared. */
function updateUrl(): void {
  const url = new URL(location.href);
  const salary = currentSalary();
  const values: Record<string, string | undefined> = {
    [PARAMS.amount]: String(parseAmount(thenInput.value)),
    [PARAMS.startYear]: startYearInput.value,
    [PARAMS.endYear]: endYearInput.value,
    [PARAMS.month]: monthToParam(monthSelect.value),
    [PARAMS.currentSalary]: salary === undefined ? undefined : String(salary),
  };
  const clear = isDefault();

  for (const [param, value] of Object.entries(values)) {
    if (clear || value === undefined) {
      url.searchParams.delete(param);
    } else {
      url.searchParams.set(param, value);
    }
  }

  history.replaceState(history.state, '', url);
}

/** Called when a value is committed (field left, select changed, swap). */
function commit(): void {
  resetBadInputs();
  adjustForYearlyOnly();

  const summary = render();

  updateUrl();
  shareFeedback.textContent = '';
  // Only when it is actually on screen: see the same guard in calculator.ts.
  const missing = resultMissing.hidden ? '' : resultMissing.textContent;

  resultStatus.textContent = [summary ?? missing, resultNote.hidden ? '' : resultNote.textContent].filter(Boolean).join(' ');
}

function applyUrlParams(): void {
  const params = new URLSearchParams(location.search);
  const amount = parseAmount(params.get(PARAMS.amount) ?? '');
  const salary = parseAmount(params.get(PARAMS.currentSalary) ?? '');
  const startYear = parseInt(params.get(PARAMS.startYear) ?? '');
  const endYear = parseInt(params.get(PARAMS.endYear) ?? '');
  const month = paramToMonth(params.get(PARAMS.month) ?? '');

  if (amount > 0) {
    thenInput.value = formatAmount(amount);
  }

  // An explicitly empty `nu` clears the default example rather than keeping it.
  if (params.has(PARAMS.currentSalary)) {
    nowInput.value = salary > 0 ? formatAmount(salary) : '';
  }

  if (!Number.isNaN(startYear)) {
    startYearInput.valueAsNumber = startYear;
  }

  if (!Number.isNaN(endYear)) {
    endYearInput.valueAsNumber = endYear;
  }

  if (month) {
    monthSelect.value = month;
  }

  resetBadInputs();
  adjustForYearlyOnly();
}

async function share(): Promise<void> {
  const text = render();
  const url = location.href;

  if (navigator.share) {
    try {
      await navigator.share({ title: document.title, text, url });

      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    shareFeedback.textContent = 'Link gekopieerd.';
  } catch {
    shareFeedback.textContent = 'Kopiëren lukte niet. Kopieer de link uit de adresbalk.';
  }
}

if (location.search) {
  applyUrlParams();
}

// Live update while typing (visual only); announce and update the URL only
// once a value is committed, so a screen reader isn't interrupted per key.
for (const input of [thenInput, nowInput, startYearInput, endYearInput]) {
  input.addEventListener('input', () => render());
  input.addEventListener('change', commit);
}

monthSelect.addEventListener('change', commit);

switchButton.addEventListener('click', () => {
  [startYearInput.value, endYearInput.value] = [endYearInput.value, startYearInput.value];
  commit();
});

shareButton.addEventListener('click', share);

// Enter in a field would otherwise submit the form and reload the page.
element<HTMLFormElement>('salary-form').addEventListener('submit', event => {
  event.preventDefault();
  commit();
});

render();
