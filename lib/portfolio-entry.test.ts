import { describe, expect, it } from "vitest";

import {
  getUrlWithoutPortfolioEntry,
  parsePortfolioEntry,
} from "@/lib/portfolio-entry";

describe("parsePortfolioEntry", () => {
  it("accepts the documented Summitodoro portfolio entry", () => {
    expect(
      parsePortfolioEntry(
        "?entry=portfolio&project=summitodoro&transition=mountain-zoom",
      ),
    ).toEqual({
      projectId: "summitodoro",
      transitionType: "mountain-zoom",
    });
  });

  it.each([
    "",
    "?entry=portfolio",
    "?entry=direct&project=summitodoro&transition=mountain-zoom",
    "?entry=portfolio&project=another-project&transition=mountain-zoom",
    "?entry=portfolio&project=summitodoro&transition=unknown",
  ])("rejects an invalid entry URL: %s", (search) => {
    expect(parsePortfolioEntry(search)).toBeNull();
  });
});

describe("getUrlWithoutPortfolioEntry", () => {
  it("removes only transition parameters and retains the hash", () => {
    expect(
      getUrlWithoutPortfolioEntry({
        pathname: "/hike",
        search:
          "?entry=portfolio&project=summitodoro&transition=mountain-zoom&ref=home",
        hash: "#trail",
      }),
    ).toBe("/hike?ref=home#trail");
  });
});
