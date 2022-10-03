<template>
  <div>
    <div class="h-screen flex justify-center items-center w-full">
      <div class="bg-white px-10 py-8 bg-blue-200 rounded-xl w-screen shadow-md max-w-lg">
        <div class="space-y-4">
          <h1 class="text-center text-2xl font-semibold text-gray-600">Bereken inflatie</h1>
          <div>
            <label class="mb-1 text-gray-600 font-semibold">Aantal</label>
<!--            TODO reset to 100 if an invalid result is entered-->
            <input v-model="input" type="number" :max="10000" class="bg-gray-100 px-4 py-2 outline-none rounded-md w-full" />
          </div>
          <div>
            <label class="block mb-1 text-gray-600 font-semibold">Jaar</label>
<!--            TODO reset to 1963 if an invalid result is entered-->
            <input v-model="inputYear" type="number" class="bg-gray-100 px-4 py-2 outline-none rounded-md w-full" />
          </div>

          <div>
            <label class="block mb-1 text-gray-600 font-semibold">Maand</label>
            <select v-model="inputMonth" class="bg-gray-100 px-4 py-2 outline-none rounded-md w-full">
              <option value="JJ00">Gemiddelde</option>
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
        <div class="mt-4 w-full py-2 rounded-md text-lg tracking-wide text-center">
<!--          TODO display gulden instead of € if input year is < 2002-->
          <p v-if="output !== -1">{{ input }}€ in {{ inputYear }} is {{ output }}€ in {{ outputYear }}</p>
          <p v-else>Vul alstublieft een geldig getal in</p>
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
  inputMonth: string = 'JJ00'

  outputYear: number = 2021

  guilderToEuroConversionRate: number = 0.453780
  euroToGuilderConversionRate: number = 2.20371

  rounding: number = 10000

  get output(): number {
    return this.calculateInflation(this.input, (this.inputYear + this.inputMonth), (this.outputYear + this.inputMonth))
  }

  calculateInflation(value: number, period1: string, period2: string): number {
    if (value > 9999999 || value <= 0) {
      return -1
    }

    const yearMutationCpi: number = this.calculateYearMutationCPI(period1, period2)

    return (Math.round(value * (yearMutationCpi / 100) * 100) / 100).toFixed(2)
  }

  calculateYearMutationCPI(period1: string, period2: string): number {
    const item1: YearData|undefined = this.getItemByDate(period1)
    const item2: YearData|undefined = this.getItemByDate(period2)

    if (!item1 || !item2) {
      return -1
    }

    const year1: number = parseInt(item1.Perioden.substring(0,4))
    const year2: number = parseInt(item2.Perioden.substring(0,4))

    const yearDifference: number = year2 - year1

    let yearMutationCPI: number = 100

    if (yearDifference > 0) {
      for (let i: number = 1; i <= yearDifference; i++) {
        let yearData: YearData|undefined = this.getItemByDate((year1+i) + this.inputMonth)

        if (parseInt(yearData!.Perioden.substring(0,4)) === 2002) {
          yearMutationCPI = (Math.round((yearMutationCPI * this.guilderToEuroConversionRate) * this.rounding) / this.rounding)
        }

        yearMutationCPI = (Math.round((yearMutationCPI * (((parseFloat(yearData!.JaarmutatieCPI_1.replace(/\s/g, ''))) / 100) + 1)) * this.rounding) / this.rounding)
      }
    } else {
      for (let i = 1; i <= Math.abs(yearDifference); i++) {
        let yearData: YearData|undefined = this.getItemByDate((this.inputYear-i) + this.inputMonth)

        if (parseInt(yearData!.Perioden.substring(0,4)) === 2002) {
          yearMutationCPI = (Math.round((yearMutationCPI * this.euroToGuilderConversionRate) * this.rounding) / this.rounding)
        }

        yearMutationCPI = (Math.round((yearMutationCPI * (-Math.abs(parseFloat(yearData!.JaarmutatieCPI_1.replace(/\s/g, '')) / 100) + 1)) * this.rounding) / this.rounding)
      }
    }

    return yearMutationCPI
  }

  getItemByDate(period: string): YearData|undefined {
    return this.data.find(object => object.Perioden === period)
  }
}
</script>

<style scoped>
</style>
