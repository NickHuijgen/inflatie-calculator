export default class YearData {
  ID?: number|null = null
  Perioden: string = ''
  JaarmutatieCPI_1: string = ''
  JaarmutatieCPIAfgeleid_2?: string|null = null

  public constructor(data: Partial<YearData>) {
    Object.assign(this, data)
  }
}
