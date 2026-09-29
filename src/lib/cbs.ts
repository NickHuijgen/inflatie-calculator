// The one way this project talks to CBS. Both datasets in inflation.ts and the
// cao-loonindex in cao.ts go through it, so a failure always looks the same and
// always fails the build -- which is the point: the previous deployment stays
// live rather than a page going out with figures nobody checked.

export async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`CBS request failed: ${response.status} ${response.statusText} (${url})`);
  }

  return await response.json() as T;
}
