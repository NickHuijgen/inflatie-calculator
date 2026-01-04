<template>
  <main class="flex min-h-screen items-center justify-center p-10">
    <div class="container grid max-w-screen-xl gap-8 lg:grid-cols-2 lg:grid-rows-2">
      <section class="row-span-2 flex flex-col rounded-md border border-blue-200" aria-label="Calculator">
        <div class="p-10">
          <h1 class="text-xl font-bold">Inflatie Berekenen</h1>
          <div class="mt-2">
            <div class="p-2">
              <label class="mb-1 font-semibold text-gray-700">Bedrag</label>
              <input
                v-model.number="input"
                @blur="resetBadInputs"
                type="number"
                class="bg-gray-100 px-4 py-2 outline-none rounded-md w-full"
              />
            </div>

            <div class="p-2">
              <label class="block mb-1 font-semibold text-gray-700">Beginjaar</label>
              <input
                v-model.number="startYear"
                @blur="resetBadInputs"
                type="number"
                class="bg-gray-100 px-4 py-2 outline-none rounded-md w-full"
              />
            </div>

            <div class="p-2 ml-4">
              <svg
                @click="switchInputAndOutput"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="w-6 h-6"
                role="button"
                aria-label="Wissel begin- en eindjaar"
                tabindex="0"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
              </svg>
            </div>

            <div class="p-2">
              <label class="block mb-1 font-semibold text-gray-700">Eindjaar</label>
              <input
                v-model.number="endYear"
                @blur="resetBadInputs"
                type="number"
                class="bg-gray-100 px-4 py-2 outline-none rounded-md w-full"
              />
            </div>

            <div class="p-2">
              <label class="block mb-1 font-semibold text-gray-700">Maand</label>
              <select v-model="compareMonth" class="bg-gray-100 px-4 py-2 outline-none rounded-md w-full">
                <option value="JJ00">Jaargemiddelde</option>
                <option value="MM01">Januari</option>
                <option value="MM02">Februari</option>
                <option value="MM03">Maart</option>
                <option value="MM04">April</option>
                <option value="MM05">Mei</option>
                <option value="MM06">Juni</option>
                <option value="MM07">Juli</option>
                <option value="MM08">Augustus</option>
                <option value="MM09">September</option>
                <option value="MM10">Oktober</option>
                <option value="MM11">November</option>
                <option value="MM12">December</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      <section class="flex rounded-md border border-blue-200" aria-label="Resultaten">
        <div class="flex-1 p-10">
          <h2 class="text-xl font-bold">Resultaten</h2>
          <div class="mt-2">
            <div v-if="output > 0">
              <div class="mb-2">
                <p v-if="startYear < 2002 && endYear >= 2002">
                  <strong>ƒ{{ numberWithCommas(input) }}</strong> had in {{ startYear }} dezelfde koopkracht als <strong>€{{ numberWithCommas(output) }}</strong> in {{ endYear }}
                </p>
                <p v-else-if="startYear >= 2002 && endYear < 2002">
                  <strong>€{{ numberWithCommas(input) }}</strong> had in {{ startYear }} dezelfde koopkracht als <strong>ƒ{{ numberWithCommas(output) }}</strong> in {{ endYear }}
                </p>
                <p v-else-if="startYear < 2002 && endYear < 2002">
                  <strong>ƒ{{ numberWithCommas(input) }}</strong> had in {{ startYear }} dezelfde koopkracht als <strong>ƒ{{ numberWithCommas(output) }}</strong> in {{ endYear }}
                </p>
                <p v-else>
                  <strong>€{{ numberWithCommas(input) }}</strong> had in {{ startYear }} dezelfde koopkracht als <strong>€{{ numberWithCommas(output) }}</strong> in {{ endYear }}
                </p>
              </div>

              <p class="mb-2">
                Dat is een totale inflatie van <strong>{{ inflationPercentage }}%</strong>
              </p>

              <p>
                Gemiddeld <strong>{{ averageInflation }}%</strong> per jaar
              </p>
            </div>
            <div v-else>
              <p>
                Vul alstublieft geldige waarden in
              </p>
            </div>
          </div>
        </div>
      </section>

      <section class="flex rounded-md border border-blue-200" aria-label="Informatie">
        <div class="flex-1 p-10">
          <h2 class="text-xl font-bold">Informatie</h2>
          <div class="mt-2">
            <p class="mb-2">
              Inflatie is de laatste tijd steeds meer te merken, ons geld wordt razendsnel minder waard. Maar precies hoeveel minder waard is het geworden?
            </p>

            <p class="mb-2">
              Om de inflatie te berekenen is gebruik gemaakt van <a href="https://opendata.cbs.nl/#/CBS/nl/dataset/70936ned/table?ts=1664823822870" target="_blank" class="text-blue-500">deze</a> dataset van het CBS.
              Data is beschikbaar vanaf 01-1963 tot en met <template v-if="latestYearData?.Perioden?.substring(6,8) !== '00'">{{ latestYearData.Perioden?.substring(6,8) }}-</template>{{ latestYearData.Perioden?.substring(0,4) }}.
            </p>

            <p class="mb-4">
              De code (inclusief berekening) staat op <a href="https://github.com/NickHuijgen/inflatie-calculator" target="_blank" class="text-blue-500">GitHub</a>.
            </p>

            <p class="text-gray-400">
              Gemaakt door Nick Huijgen
            </p>
          </div>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import YearData from "~/models/YearData";
import { ref, computed, onMounted } from 'vue';
import { useHead } from '#imports'

useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        'name': 'Inflatie Berekenen',
        'description': 'Calculator voor inflatie en koopkracht in Nederland',
        'applicationCategory': 'FinanceApplication',
        'operatingSystem': 'Any',
      })
    }
  ]
});

const data = ref<YearData[]>([]);
const input = ref<number>(100);
const startYear = ref<number>(0);
const compareMonth = ref<string>('JJ00');
const endYear = ref<number>(0);
const latestYearData = ref<YearData>(new YearData({}));

const guilderToEuroConversionRate = 0.453780;
const euroToGuilderConversionRate = 2.20371;

onMounted(() => {
  fetch('https://opendata.cbs.nl/ODataFeed/odata/70936ned/UntypedDataSet?%24format=json')
    .then((response) => {
      return response.json();
    })
    .then((jsonData) => {
      data.value = jsonData.value;

      const latest = data.value[data.value.length - 1];

      if (latest) {
        latestYearData.value = latest;
        endYear.value = parseInt(latestYearData.value.Perioden!.substring(0, 4));
        startYear.value = endYear.value - 10;
        compareMonth.value = latestYearData.value.Perioden!.substring(4, 8);
      }
    });
});

const output = computed((): number => {
  if (input.value <= 0) {
    return -1;
  }

  return parseFloat(round(input.value * (calculateCPIMutation(startYear.value, endYear.value, compareMonth.value) / 100)).toFixed(2));
});

const inflationPercentage = computed((): number => {
  return parseFloat((calculateCPIMutation(startYear.value, endYear.value, compareMonth.value, false) - 100).toFixed(2));
});

const averageInflation = computed((): number => {
  const yearDifference: number = endYear.value - startYear.value;

  if (yearDifference === 0) {
    return 0;
  }

  let totalInflation: number = 0;

  let year: number = startYear.value;

  for (let i: number = 0; i < Math.abs(yearDifference); i++) {
    if (yearDifference > 0) {
      year++;
    }

    let yearData: YearData | undefined = getItemByDate(year + compareMonth.value);

    if (!yearData) {
      return 0;
    }

    totalInflation += parseFloat(yearData!.JaarmutatieCPI_1!.replace(/\s/g, ''));

    if (yearDifference < 0) {
      year--;
    }
  }

  return round(totalInflation / yearDifference);
});

function calculateCPIMutation(beginYear: number, endYear: number, month: string, conversion: boolean = true): number {
  const startYearData: YearData | undefined = getItemByDate(beginYear + month);
  const endYearData: YearData | undefined = getItemByDate(endYear + month);

  if (!startYearData || !endYearData) {
    return -1;
  }

  const yearDifference: number = endYear - beginYear;

  let CPIMutation: number = 100;

  let year: number = beginYear;

  if (yearDifference > 0) {
    for (let i: number = 0; i < yearDifference; i++) {
      year++;

      let yearData: YearData | undefined = getItemByDate(year + month);

      if (year === 2002 && conversion) {
        CPIMutation = round(CPIMutation * guilderToEuroConversionRate);
      }

      CPIMutation = round(CPIMutation * (((parseFloat(yearData!.JaarmutatieCPI_1!.replace(/\s/g, ''))) / 100) + 1));
    }
  } else {
    for (let i: number = 0; i < Math.abs(yearDifference); i++) {
      let yearData: YearData | undefined = getItemByDate(year + month);

      if (year == 2002 && conversion) {
        CPIMutation = round((CPIMutation * euroToGuilderConversionRate));
      }

      CPIMutation = round(CPIMutation * (-Math.abs(parseFloat(yearData!.JaarmutatieCPI_1!.replace(/\s/g, '')) / 100) + 1));

      year--;
    }
  }

  return CPIMutation;
}

function round(number: number, decimals: number = 2): number {
  return parseFloat((Math.round((number) * 10000) / 10000).toFixed(decimals));
}

function getItemByDate(period: string): YearData | undefined {
  return data.value.find(object => object.Perioden === period);
}

function switchInputAndOutput(): void {
  const tempstartYear: number = startYear.value;
  startYear.value = endYear.value;
  endYear.value = tempstartYear;
}

function resetBadInputs(): void {
  const latestYear: number = parseInt(latestYearData.value!.Perioden!.substring(0, 4));

  if (input.value <= 0) {
    input.value = 1;
  }

  if (startYear.value >= latestYear) {
    startYear.value = latestYear;

    if (!getItemByDate(startYear.value + compareMonth.value)) {
      compareMonth.value = latestYearData.value!.Perioden!.substring(4, 8);
    }
  }

  if (startYear.value < 1963) {
    startYear.value = 1963;
  }

  if (endYear.value >= latestYear) {
    endYear.value = latestYear;

    if (!getItemByDate(endYear.value + compareMonth.value)) {
      compareMonth.value = latestYearData.value!.Perioden!.substring(4, 8);
    }
  }

  if (endYear.value < 1963) {
    endYear.value = 1963;
  }
}

function numberWithCommas(number: number): string {
  const fixedNumber = number.toFixed(2);

  return fixedNumber.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
</script>
