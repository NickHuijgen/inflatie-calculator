import { fetchCaoData, fetchCaoModified, type CaoData } from './cao';
import { fetchDatasetModified, fetchInflationData, type InflationData } from './inflation';

export interface BuildData {
  data: InflationData;
  /** When CBS last updated its price data. */
  datasetModified: Date;
  /** The cao-loonindex, used by /salaris (see cao.ts). */
  cao: CaoData;
  /** When CBS last updated the cao data. */
  caoModified: Date;
}

let buildData: Promise<BuildData> | undefined;

/**
 * The CBS data every page is built from, fetched once per build rather than
 * once per page (the year pages would otherwise make ~250 requests). If CBS
 * is down, the build fails and the previous deployment stays live.
 */
export function loadBuildData(): Promise<BuildData> {
  buildData ??= Promise.all([fetchInflationData(), fetchDatasetModified(), fetchCaoData(), fetchCaoModified()])
    .then(([data, datasetModified, cao, caoModified]) => ({ data, datasetModified, cao, caoModified }));

  return buildData;
}
