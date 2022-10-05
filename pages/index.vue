<template>
  <div class="flex min-h-screen items-center justify-center p-10">
    <div class="container grid max-w-screen-xl gap-8 lg:grid-cols-2 lg:grid-rows-2">
      <div class="row-span-2 flex flex-col rounded-md border border-blue-200">
        <div class="p-10">
          <h3 class="text-xl font-bold">Bereken inflatie</h3>
          <div class="mt-2">
            <div class="p-2">
              <label class="mb-1 font-semibold text-gray-700">Bedrag</label>
              <input
                v-model="input"
                @blur="resetBadInputs"
                type="number"
                class="bg-gray-100 px-4 py-2 outline-none rounded-md w-full"
              />
            </div>

            <div class="p-2">
              <label class="block mb-1 font-semibold text-gray-700">Beginjaar</label>
              <input
                v-model="inputYear"
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
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
              </svg>
            </div>

            <div class="p-2">
              <label class="block mb-1 font-semibold text-gray-700">Eindjaar</label>
              <input
                v-model="outputYear"
                @blur="resetBadInputs"
                type="number"
                class="bg-gray-100 px-4 py-2 outline-none rounded-md w-full"
              />
            </div>

            <div class="p-2">
              <label class="block mb-1 font-semibold text-gray-700">Maand</label>
              <select v-model="inputMonth" class="bg-gray-100 px-4 py-2 outline-none rounded-md w-full">
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
      </div>

      <div class="flex rounded-md border border-blue-200">
        <div class="flex-1 p-10">
          <h3 class="text-xl font-bold">Resultaten</h3>
          <div class="mt-2">
            <div v-if="output > 0">
              <div class="mb-2">
                <p v-if="inputYear < 2002 && outputYear >= 2002">
                  <strong>ƒ{{ input }}</strong> had in {{ inputYear }} dezelfde koopkracht als <strong>€{{ output }}</strong> in {{ outputYear }}
                </p>
                <p v-else-if="inputYear >= 2002 && outputYear < 2002">
                  <strong>€{{ input }}</strong> had in {{ inputYear }} dezelfde koopkracht als <strong>ƒ{{ output }}</strong> in {{ outputYear }}
                </p>
                <p v-else-if="inputYear < 2002 && outputYear < 2002">
                  <strong>ƒ{{ input }}</strong> had in {{ inputYear }} dezelfde koopkracht als <strong>ƒ{{ output }}</strong> in {{ outputYear }}
                </p>
                <p v-else>
                  <strong>€{{ input }}</strong> had in {{ inputYear }} dezelfde koopkracht als <strong>€{{ output }}</strong> in {{ outputYear }}
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
      </div>

      <div class="flex rounded-md border border-blue-200">
        <div class="flex-1 p-10">
          <h3 class="text-xl font-bold">Over deze site</h3>
          <div class="mt-2">
            <p class="mb-2">
              Inflatie is de laatste tijd steeds meer te merken, ons geld wordt razendsnel minder waard. Maar precies hoeveel minder waard is het geworden?
            </p>

            <p class="mb-2">
              Voor de berekening is gebruik gemaakt van <a href="https://opendata.cbs.nl/#/CBS/nl/dataset/70936ned/table?ts=1664823822870" class="text-blue-500">deze</a> dataset van het CBS.
              Data is beschikbaar vanaf januari 1963 tot en met september 2022.
            </p>

            <p class="mb-4">
              De code (inclusief berekening) staat op <a href="https://github.com/NickHuijgen01/inflatie-calculator" class="text-blue-500">GitHub</a>.
            </p>

            <p class="text-gray-400">
              Gemaakt door Nick Huijgen
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {Component, Vue} from 'vue-property-decorator'
import inflationData from '~/static/data.json'
import YearData from "~/models/YearData";

@Component
export default class index extends Vue {
  data: YearData[] = inflationData

  input: number = 100
  inputYear: number = 2015
  inputMonth: string = 'MM09'

  outputYear: number = 2022


  guilderToEuroConversionRate: number = 0.453780
  euroToGuilderConversionRate: number = 2.20371

  get output(): number {
    if (this.input > 9999999 || this.input <= 0) {
      return -1
    }

    return parseFloat(this.round(this.input * (this.calculateCPIMutation(this.inputYear, this.outputYear, this.inputMonth) / 100)).toFixed(2))
  }

  get inflationPercentage(): number {
    return parseFloat((this.calculateCPIMutation(this.inputYear, this.outputYear, this.inputMonth, false) - 100).toFixed(2))
  }

  get averageInflation(): number {
    const averageInflation: number = parseFloat((this.inflationPercentage / Math.abs(this.outputYear - this.inputYear)).toFixed(2))

    if (!averageInflation) {
      return 0
    }

    return averageInflation
  }

  calculateCPIMutation(beginYear: number, endYear: number, month: string, conversion: boolean = true): number {
    const inputYearData: YearData|undefined = this.getItemByDate(beginYear + month)
    const outputYearData: YearData|undefined = this.getItemByDate(endYear + month)

    if (!inputYearData || !outputYearData) {
      return -1
    }

    const yearDifference: number = endYear - beginYear

    let CPIMutation: number = 100

    let year: number = beginYear

    if (yearDifference > 0) {
      for (let i: number = 0; i < yearDifference; i++) {
        year++

        let yearData: YearData|undefined = this.getItemByDate(year + month)

        if (year === 2002 && conversion) {
          CPIMutation = this.round(CPIMutation * this.guilderToEuroConversionRate)
        }

        CPIMutation = this.round(CPIMutation * (((parseFloat(yearData!.yearmutation_cpi.replace(/\s/g, ''))) / 100) + 1))
      }
    } else {
      for (let i: number = 0; i < Math.abs(yearDifference); i++) {
        let yearData: YearData|undefined = this.getItemByDate(year + month)

        if (year == 2002 && conversion) {
          CPIMutation = this.round((CPIMutation * this.euroToGuilderConversionRate))
        }

        CPIMutation = this.round(CPIMutation * (-Math.abs(parseFloat(yearData!.yearmutation_cpi.replace(/\s/g, '')) / 100) + 1))

        year--
      }
    }

    return CPIMutation
  }

  round(number: number, decimals: number = 2) {
    return parseFloat((Math.round((number) * 10000) / 10000).toFixed(decimals))
  }

  getItemByDate(period: string): YearData|undefined {
    return this.data.find(object => object.period === period)
  }

  switchInputAndOutput(): void {
    const inputYear: number = this.inputYear
    this.inputYear = this.outputYear
    this.outputYear = inputYear
  }

  resetBadInputs(): void {
    if (this.input > 9999999 || this.input <= 0) {
      this.input = 100
    }

    if (this.inputYear > 2022 || this.inputYear < 1963) {
      this.inputYear = 2015
    }

    if (this.outputYear > 2022 || this.outputYear < 1963) {
      this.outputYear = 2021
    }
  }
}
</script>

<style scoped>
</style>
