import {
  FIRST_YEAR,
  InflationData,
  currencySymbol,
  fetchInflationData,
  numberWithCommas,
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
const resultLoading = element('result-loading');

let data: InflationData;

function showState(state: 'result' | 'invalid' | 'error' | 'loading'): void {
  result.hidden = state !== 'result';
  resultInvalid.hidden = state !== 'invalid';
  resultError.hidden = state !== 'error';
  resultLoading.hidden = state !== 'loading';
}

function render(): void {
  const amount = amountInput.valueAsNumber;
  const startYear = startYearInput.valueAsNumber;
  const endYear = endYearInput.valueAsNumber;
  const month = monthSelect.value;

  const output = data.output(amount, startYear, endYear, month);

  if (!(output > 0)) {
    showState('invalid');

    return;
  }

  element('result-input').textContent = currencySymbol(startYear) + numberWithCommas(amount);
  element('result-output').textContent = currencySymbol(endYear) + numberWithCommas(output);
  element('result-start-year').textContent = String(startYear);
  element('result-end-year').textContent = String(endYear);
  element('result-inflation').textContent = String(data.inflationPercentage(startYear, endYear, month));
  element('result-average').textContent = String(data.averageInflation(startYear, endYear, month));

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
  if (!(amountInput.valueAsNumber > 0)) {
    amountInput.valueAsNumber = 1;
  }

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
    console.error(error);
    showState('error');

    return;
  }

  const latest = data.latest;

  if (latest) {
    const period = latest.Perioden.substring(6, 8);

    element('latest-period').textContent = (period !== '00' ? `${period}-` : '') + data.latestYear;
    element('latest-period-wrapper').hidden = false;

    endYearInput.valueAsNumber = data.latestYear;
    startYearInput.valueAsNumber = data.latestYear - 10;
    monthSelect.value = data.latestMonth;
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
