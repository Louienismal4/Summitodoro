import { afterEach, describe, expect, it, vi } from "vitest";

import { loadTrailAsset } from "@/lib/trail/trail-cache";

const trail = {
  type: "Feature",
  properties: { id: "trail", name: "Trail", schemaVersion: 1 },
  geometry: {
    type: "LineString",
    coordinates: [
      [120, 15],
      [120.1, 15.1],
    ],
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("loadTrailAsset", () => {
  it("loads a previously cached trail while offline", async () => {
    vi.stubGlobal("caches", {
      match: vi.fn().mockResolvedValue(new Response(JSON.stringify(trail))),
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadTrailAsset("/data/trails/test.geojson")).resolves.toEqual(
      trail,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("stores a successful trail response for later visits", async () => {
    const put = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("caches", {
      match: vi.fn().mockResolvedValue(undefined),
      open: vi.fn().mockResolvedValue({ put }),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(trail), {
          status: 200,
          headers: { "content-type": "application/geo+json" },
        }),
      ),
    );

    await expect(loadTrailAsset("/data/trails/test.geojson")).resolves.toEqual(
      trail,
    );
    await vi.waitFor(() => expect(put).toHaveBeenCalledOnce());
  });
});
