import { fetchDatasetModified, fetchInflationData, type InflationData } from './inflation';

export interface BuildData {
  data: InflationData;
  /** When CBS last updated its data. */
  datasetModified: Date;
}

let buildData: Promise<BuildData> | undefined;

/**
 * The CBS data every page is built from, fetched once per build rather than
 * once per page (the year pages would otherwise make ~250 requests). If CBS
 * is down, the build fails and the previous deployment stays live.
 */
export function loadBuildData(): Promise<BuildData> {
  buildData ??= Promise.all([fetchInflationData(), fetchDatasetModified()])
    .then(([data, datasetModified]) => ({ data, datasetModified }));

  return buildData;
}
