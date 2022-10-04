export default class YearData {
  id?: number|null = null
  period: string = ''
  yearmutation_cpi: string = ''
  yearmutation_cpi_derivative?: string|null = null

  public constructor(data: Partial<YearData>) {
    Object.assign(this, data)
  }
}
