import {
  FIRST_MONTHLY_YEAR,
  FIRST_YEAR,
  InflationData,
  MONTHS,
  type CompactData,
  formatAmount,
  formatMoney,
  formatPercent,
  parseAmount,
} from '../lib/inflation';

function element<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

const amountInput = element<HTMLInputElement>('input-amount');
const startYearInput = element<HTMLInputElement>('input-start-year');
const endYearInput = element<HTMLInputElement>('input-end-year');
const monthSelect = element<HTMLSelectElement>('select-month');
const switchButton = element<HTMLButtonElement>('switch-years');
const shareButton = element<HTMLButtonElement>('share-result');

const result = element('result');
const resultMissing = element('result-missing');
const resultNote = element('result-note');
const resultStatus = element('result-status');
const shareFeedback = element('share-feedback');

// The build embeds the CBS data it rendered the page with (see index.astro),
// so the calculator works immediately and never depends on CBS being up.
const data = InflationData.fromCompact(JSON.parse(element('cbs-data').textContent!) as CompactData);

// Shareable URLs: ?bedrag=100&van=1990&naar=2026&maand=08 (or maand=jaar).
const PARAMS = { amount: 'bedrag', startYear: 'van', endYear: 'naar', month: 'maand' } as const;

function monthToParam(month: string): string {
  return month === 'JJ00' ? 'jaar' : month.substring(2);
}

function paramToMonth(value: string): string | undefined {
  const month = value === 'jaar' ? 'JJ00' : `MM${value.padStart(2, '0')}`;

  return MONTHS.some(([code]) => code === month) ? month : undefined;
}

function monthLabel(month: string): string {
  return MONTHS.find(([code]) => code === month)?.[1].toLowerCase() ?? month;
}

/**
 * Recalculates and updates the result. Returns a one-sentence summary when
 * the inputs are valid, for the status announcement and the share text.
 */
function render(): string | undefined {
  const amount = parseAmount(amountInput.value);
  const startYear = startYearInput.valueAsNumber;
  const endYear = endYearInput.valueAsNumber;
  const month = monthSelect.value;

  const output = data.output(amount, startYear, endYear, month);

  if (!(output > 0)) {
    // A valid year that just has no figures for this month (the current
    // year's later months, or its yearly average) gets an explanation.
    // Anything else is a half-typed value: dim the last result until the
    // field is left, when resetBadInputs() corrects it.
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

  element('result-input').textContent = formatMoney(amount, startYear);
  element('result-output').textContent = formatMoney(output, endYear);
  element('result-start-year').textContent = String(startYear);
  element('result-end-year').textContent = String(endYear);

  // Price change is always described forwards in time, from the earlier to
  // the later year, whichever order the visitor entered them in.
  const fromYear = Math.min(startYear, endYear);
  const toYear = Math.max(startYear, endYear);
  const inflation = data.inflationPercentage(fromYear, toYear, month);

  element('result-change').hidden = fromYear === toYear;
  element('result-same-year').hidden = fromYear !== toYear;
  element('result-from-year').textContent = String(fromYear);
  element('result-to-year').textContent = String(toYear);
  element('result-direction').textContent = inflation < 0 ? 'daalden' : 'stegen';
  element('result-inflation').textContent = formatPercent(Math.abs(inflation));
  element('result-average').textContent = formatPercent(data.averageInflation(fromYear, toYear, month));

  result.hidden = false;
  result.classList.remove('opacity-40');
  resultMissing.hidden = true;

  return `${formatMoney(amount, startYear)} uit ${startYear} heeft in ${endYear} een koopkracht van ${formatMoney(output, endYear)}.`;
}

function clampYear(input: HTMLInputElement): void {
  let year = Math.round(input.valueAsNumber);

  if (Number.isNaN(year) || year < FIRST_YEAR) {
    year = FIRST_YEAR;
  }

  if (year > data.latestYear) {
    year = data.latestYear;
  }

  input.valueAsNumber = year;
}

function resetBadInputs(): void {
  const amount = parseAmount(amountInput.value);

  amountInput.value = formatAmount(amount > 0 ? amount : 1);
  clampYear(startYearInput);
  clampYear(endYearInput);
}

/**
 * Before 1963 CBS only has yearly averages. When a committed year is that
 * early, switch to the yearly average instead of showing no result — and
 * if the other year is the current one (which has no yearly average yet),
 * move it to the latest complete year. Explains what happened in
 * #result-note.
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
  return [amountInput, startYearInput, endYearInput].every(input => parseAmount(input.value) === parseAmount(input.defaultValue))
    && [...monthSelect.options].every(option => option.selected === option.defaultSelected);
}

/** Mirrors the form into the address bar so the result can be shared. */
function updateUrl(): void {
  const url = new URL(location.href);
  const values = {
    [PARAMS.amount]: String(parseAmount(amountInput.value)),
    [PARAMS.startYear]: startYearInput.value,
    [PARAMS.endYear]: endYearInput.value,
    [PARAMS.month]: monthToParam(monthSelect.value),
  };
  const clear = isDefault();

  for (const [param, value] of Object.entries(values)) {
    if (clear) {
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
  resultStatus.textContent = [summary ?? resultMissing.textContent, resultNote.hidden ? '' : resultNote.textContent].filter(Boolean).join(' ');
}

function applyUrlParams(): void {
  const params = new URLSearchParams(location.search);
  const amount = parseAmount(params.get(PARAMS.amount) ?? '');
  const startYear = parseInt(params.get(PARAMS.startYear) ?? '');
  const endYear = parseInt(params.get(PARAMS.endYear) ?? '');
  const month = paramToMonth(params.get(PARAMS.month) ?? '');

  if (amount > 0) {
    amountInput.value = formatAmount(amount);
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
for (const input of [amountInput, startYearInput, endYearInput]) {
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
element<HTMLFormElement>('calculator').addEventListener('submit', event => {
  event.preventDefault();
  commit();
});

render();
