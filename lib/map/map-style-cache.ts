import type { StyleSpecification } from "maplibre-gl";

const MAP_STYLE_CACHE = "summitodoro-map-style-v1";
const MAP_STYLE_TIMEOUT_MS = 2_500;

export const offlineMapStyle: StyleSpecification = {
  version: 8,
  name: "Summitodoro low-data map",
  sources: {},
  layers: [
    {
      id: "low-data-background",
      type: "background",
      paint: {
        "background-color": "#e6ebe4",
      },
    },
  ],
};

const isStyleSpecification = (value: unknown): value is StyleSpecification => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StyleSpecification>;
  return (
    candidate.version === 8 &&
    Array.isArray(candidate.layers) &&
    typeof candidate.sources === "object"
  );
};

const readStyleResponse = async (
  response: Response,
): Promise<StyleSpecification | null> => {
  try {
    const value: unknown = await response.json();
    return isStyleSpecification(value) ? value : null;
  } catch {
    return null;
  }
};

const getCachedStyle = async (
  styleUrl: string,
): Promise<StyleSpecification | null> => {
  if (!("caches" in globalThis)) return null;

  try {
    const response = await caches.match(styleUrl);
    return response ? readStyleResponse(response) : null;
  } catch {
    return null;
  }
};

const cacheStyle = async (styleUrl: string, response: Response) => {
  if (!("caches" in globalThis)) return;

  try {
    const cache = await caches.open(MAP_STYLE_CACHE);
    await cache.put(styleUrl, response);
  } catch {
    // Cache Storage can be unavailable in private browsing. The live map still
    // works, and the low-data style remains the final fallback.
  }
};

const fetchStyle = async (
  styleUrl: string,
  signal?: AbortSignal,
): Promise<StyleSpecification | null> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MAP_STYLE_TIMEOUT_MS);
  const abortFromCaller = () => controller.abort();
  signal?.addEventListener("abort", abortFromCaller, { once: true });

  try {
    const response = await fetch(styleUrl, {
      signal: controller.signal,
      cache: "no-cache",
    });
    if (!response.ok) return null;

    const style = await readStyleResponse(response.clone());
    if (!style) return null;
    void cacheStyle(styleUrl, response.clone());
    return style;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abortFromCaller);
  }
};

export async function loadMapStyle(
  styleUrl: string,
  signal?: AbortSignal,
): Promise<StyleSpecification> {
  const cached = await getCachedStyle(styleUrl);
  if (cached) return cached;
  if (signal?.aborted) return offlineMapStyle;

  return (await fetchStyle(styleUrl, signal)) ?? offlineMapStyle;
}
