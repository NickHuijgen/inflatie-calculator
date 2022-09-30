<template>
  <div>
    {{ data.find(x => x.ID === 1).Perioden }}
  </div>
</template>

<script lang="ts">
import {Component, Vue} from 'vue-property-decorator'
import inflationData from '~/static/data.json'

@Component
export default class index extends Vue {
  data: any[] = inflationData

 mounted() {
    console.log(this.getItemByDate('2022MM05'))
 }

 getItemByDate(period: string): object {
    return this.data.find(object => object.Perioden === period)
 }
}
</script>

<style scoped>
</style>
