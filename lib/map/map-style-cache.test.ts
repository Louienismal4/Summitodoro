import { afterEach, describe, expect, it, vi } from "vitest";

import { loadMapStyle, offlineMapStyle } from "@/lib/map/map-style-cache";

const remoteStyle = {
  version: 8 as const,
  sources: {},
  layers: [{ id: "background", type: "background" as const }],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("loadMapStyle", () => {
  it("uses a cached style without waiting for the network", async () => {
    const match = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(remoteStyle), {
        headers: { "content-type": "application/json" },
      }),
    );
    const fetchMock = vi.fn();
    vi.stubGlobal("caches", { match });
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadMapStyle("https://maps.example/style")).resolves.toEqual(
      remoteStyle,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back to a local style when the provider is unavailable", async () => {
    vi.stubGlobal("caches", { match: vi.fn().mockResolvedValue(undefined) });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    await expect(loadMapStyle("https://maps.example/style")).resolves.toEqual(
      offlineMapStyle,
    );
  });
});
