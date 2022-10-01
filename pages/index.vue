<template>
  <div>
    {{ output }}
  </div>
</template>

<script lang="ts">
import {Component, Vue} from 'vue-property-decorator'
import inflationData from '~/static/data.json'

@Component
export default class index extends Vue {
  data: any[] = inflationData

  input: number = 100
  inputYear: string = '2005'
  inputMonth: string = '00'

  yearOrMonth: string = 'JJ'

  output: number = 0
  outputYear: string = '2021'

 mounted() {
   this.output = this.calculateInflation(this.input, (this.inputYear + this.yearOrMonth + this.inputMonth), (this.outputYear + this.yearOrMonth + this.inputMonth))
 }

 calculateInflation(value: number, period1: string, period2: string) {
    const yearMutationCpi = this.calculateYearMutationCPI(period1, period2)

    return ((value * (yearMutationCpi / 100) * 100) / 100)
 }

 calculateYearMutationCPI(period1: string, period2: string): number {
   const item1 = this.getItemByDate(period1)
   const item2 = this.getItemByDate(period2)

   if (!item1 || !item2) {
     return 100;
   }

   const year1 = parseInt(period1.substring(0,4))
   const year2 = parseInt(period2.substring(0,4))

   const timePeriod = period1.substring(4,6)
   const month = period1.substring(6,8)

   const yearDifference = year2 - year1

   let yearMutationCPI = 100

   for (let i = 0; i <= yearDifference; i++) {
     let yearData = this.getItemByDate((year1+i) + timePeriod + month)

     yearMutationCPI = (Math.round((yearMutationCPI * ((parseFloat(yearData.JaarmutatieCPI_1.replace(/\s/g, '')) / 100) + 1)) * 100) / 100)
   }

   return yearMutationCPI
 }

  getItemByDate(period: string) {
    return this.data.find(object => object.Perioden === period)
  }
}
</script>

<style scoped>
</style>
