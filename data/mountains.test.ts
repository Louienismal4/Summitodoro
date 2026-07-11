import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { mountains } from "./mountains";
import { validateTrailFeature } from "@/lib/trail/trail-engine";

describe("mountain catalog", () => {
  it("contains three uniquely addressable focus routes", () => {
    expect(mountains).toHaveLength(3);
    expect(new Set(mountains.map(({ slug }) => slug)).size).toBe(
      mountains.length,
    );
  });

  it.each(mountains)("loads valid trail geometry for $name", (mountain) => {
    const trailPath = resolve(
      process.cwd(),
      "public",
      mountain.trailAssetUrl.replace(/^\//, ""),
    );
    const feature = validateTrailFeature(
      JSON.parse(readFileSync(trailPath, "utf8")),
    );

    expect(feature.properties.id).toContain(mountain.slug);
    expect(feature.geometry.coordinates.length).toBeGreaterThan(2);
    expect(
      mountain.checkpoints.every(
        ({ progress }, index) =>
          progress > 0 &&
          progress < 1 &&
          (index === 0 || progress > mountain.checkpoints[index - 1].progress),
      ),
    ).toBe(true);
  });

  it.each(mountains)(
    "attributes the $name route snapshot to OpenStreetMap",
    (mountain) => {
      expect(mountain.source.provider).toBe("OpenStreetMap contributors");
      expect(mountain.source.license).toContain("ODbL");
      expect(mountain.source.reference).toContain("OpenStreetMap ways");
      expect(mountain.trailAssetUrl).toContain("-osm-");
    },
  );
});
