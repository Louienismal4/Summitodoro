const TRAIL_CACHE = "summitodoro-trails-v1";

const getCachedTrail = async (trailUrl: string): Promise<Response | null> => {
  if (!("caches" in globalThis)) return null;

  try {
    return (await caches.match(trailUrl)) ?? null;
  } catch {
    return null;
  }
};

const cacheTrail = async (trailUrl: string, response: Response) => {
  if (!("caches" in globalThis)) return;

  try {
    const cache = await caches.open(TRAIL_CACHE);
    await cache.put(trailUrl, response);
  } catch {
    // Trail caching is an optimization. A successful live response remains
    // usable when Cache Storage is unavailable.
  }
};

export async function loadTrailAsset(
  trailUrl: string,
  signal?: AbortSignal,
): Promise<unknown> {
  const cached = await getCachedTrail(trailUrl);
  if (cached) return cached.json() as Promise<unknown>;

  const response = await fetch(trailUrl, { signal });
  if (!response.ok) {
    throw new Error(`Trail request failed (${response.status}).`);
  }

  void cacheTrail(trailUrl, response.clone());
  return response.json() as Promise<unknown>;
}
