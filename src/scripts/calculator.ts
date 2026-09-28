import {
  FIRST_YEAR,
  InflationData,
  fetchInflationData,
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

const result = element('result');
const resultInvalid = element('result-invalid');
const resultError = element('result-error');

let data: InflationData;

function showState(state: 'result' | 'invalid'): void {
  result.hidden = state !== 'result';
  resultInvalid.hidden = state !== 'invalid';
}

function render(): void {
  const amount = parseAmount(amountInput.value);
  const startYear = startYearInput.valueAsNumber;
  const endYear = endYearInput.valueAsNumber;
  const month = monthSelect.value;

  const output = data.output(amount, startYear, endYear, month);

  if (!(output > 0)) {
    showState('invalid');

    return;
  }

  element('result-input').textContent = formatMoney(amount, startYear);
  element('result-output').textContent = formatMoney(output, endYear);
  element('result-start-year').textContent = String(startYear);
  element('result-end-year').textContent = String(endYear);
  element('result-inflation').textContent = formatPercent(data.inflationPercentage(startYear, endYear, month));
  element('result-average').textContent = formatPercent(data.averageInflation(startYear, endYear, month));

  showState('result');
}

function clampYear(input: HTMLInputElement): void {
  const latestYear = data.latestYear;
  let year = input.valueAsNumber;

  if (Number.isNaN(year) || year < FIRST_YEAR) {
    year = FIRST_YEAR;
  }

  if (year >= latestYear) {
    year = latestYear;

    if (!data.has(year, monthSelect.value)) {
      monthSelect.value = data.latestMonth;
    }
  }

  input.valueAsNumber = year;
}

function resetBadInputs(): void {
  const amount = parseAmount(amountInput.value);

  amountInput.value = formatAmount(amount > 0 ? amount : 1);

  clampYear(startYearInput);
  clampYear(endYearInput);

  render();
}

function switchYears(): void {
  [startYearInput.value, endYearInput.value] = [endYearInput.value, startYearInput.value];

  render();
}

async function init(): Promise<void> {
  try {
    data = await fetchInflationData();
  } catch (error) {
    // The build-time result stays visible; the inputs stay disabled.
    console.error(error);
    resultError.hidden = false;

    return;
  }

  // The page was rendered with build-time data. If CBS has published since,
  // move the defaults to the newest period — unless the visitor already
  // changed something while the data was loading.
  const untouched = [startYearInput, endYearInput].every(input => input.value === input.defaultValue)
    && [...monthSelect.options].every(option => option.selected === option.defaultSelected);

  if (data.latest) {
    const period = data.latest.Perioden.substring(6, 8);

    element('latest-period').textContent = (period !== '00' ? `${period}-` : '') + data.latestYear;

    if (untouched) {
      endYearInput.valueAsNumber = data.latestYear;
      startYearInput.valueAsNumber = data.latestYear - 10;
      monthSelect.value = data.latestMonth;
    }
  }

  for (const input of [amountInput, startYearInput, endYearInput]) {
    input.disabled = false;
    input.addEventListener('input', render);
    input.addEventListener('blur', resetBadInputs);
  }

  monthSelect.addEventListener('change', render);
  switchButton.addEventListener('click', switchYears);

  render();
}

init();
