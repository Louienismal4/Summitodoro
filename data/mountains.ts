import type { Mountain } from "@/types/mountain";

export const mountains = [
  {
    id: "mt-ulap",
    slug: "mt-ulap",
    name: "Mt. Ulap",
    region: "Cordillera Administrative Region",
    province: "Benguet",
    tagline: "Find your rhythm above the clouds.",
    description:
      "A focused virtual ascent inspired by the open ridgelines of the Cordilleras. This prototype uses illustrative route geometry for the productivity experience.",
    difficulty: "moderate",
    defaultDurationMinutes: 25,
    trailName: "Summitodoro Prototype Trail",
    trailAssetUrl: "/data/trails/mt-ulap-prototype-v1.geojson",
    trailVersion: 1,
    checkpoints: [
      {
        id: "pine-ridge",
        name: "Pine Ridge",
        description:
          "The canopy opens and your first focused stretch is behind you.",
        progress: 0.35,
      },
      {
        id: "grassland-view",
        name: "Grassland View",
        description:
          "The summit is in sight. Hold your pace through the final stretch.",
        progress: 0.7,
      },
    ],
    source: {
      provider: "Summitodoro",
      license: "Prototype use only",
      attribution:
        "Illustrative geometry by Summitodoro; basemap © Mapbox © OpenStreetMap",
      reference:
        "Synthetic line based near Mt. Ulap for technical prototyping only",
      retrievedAt: "2026-07-11",
    },
    mapCenter: [120.6302, 16.2915],
  },
] as const satisfies readonly Mountain[];

export const getMountain = (slug: string): Mountain | undefined =>
  mountains.find((mountain) => mountain.slug === slug);
