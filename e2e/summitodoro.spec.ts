import { expect, test } from "@playwright/test";

test("loads directly into the expedition dashboard", async ({ page }) => {
  const hydrationErrors: string[] = [];
  const mapboxRequests: string[] = [];
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      message.text().includes("A tree hydrated but some attributes")
    ) {
      hydrationErrors.push(message.text());
    }
  });
  page.on("request", (request) => {
    if (new URL(request.url()).hostname.endsWith("mapbox.com")) {
      mapboxRequests.push(request.url());
    }
  });

  await page.goto("/");
  await expect(page.getByText("No active expedition")).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Select mountain" }),
  ).toHaveValue("mt-ulap");
  await expect(
    page.getByRole("combobox", { name: "Select mountain" }).locator("option"),
  ).toHaveCount(3);
  await expect(
    page.getByRole("heading", { name: "Focus control" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Virtual expedition map" }),
  ).toBeVisible();
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await expect(page.locator(".maplibregl-ctrl-attrib")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Reset camera" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Fit trail" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Toggle terrain" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", {
      name: "Show map attribution and safety information",
    }),
  ).toBeVisible();
  expect(hydrationErrors).toEqual([]);
  expect(mapboxRequests).toEqual([]);
});

test("switches mountains and explains scaled checkpoint timing", async ({
  page,
}) => {
  await page.goto("/");
  const mountainSelect = page.getByRole("combobox", {
    name: "Select mountain",
  });

  await expect(
    page.getByText(/Unlocks at 08:45 elapsed/).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "5 min", exact: true }).click();
  await expect(
    page.getByText(/Unlocks at 01:45 elapsed/).first(),
  ).toBeVisible();

  await mountainSelect.selectOption("mt-pulag");
  await expect(page).toHaveURL(/\/hike\/mt-pulag$/);
  await expect(mountainSelect).toHaveValue("mt-pulag");
  await expect(page.getByText("Mossy Forest").first()).toBeVisible();

  await mountainSelect.selectOption("mt-pinatubo");
  await expect(page).toHaveURL(/\/hike\/mt-pinatubo$/);
  await expect(page.getByText("Lahar Canyon").first()).toBeVisible();
});

test("starts, pauses, and restores a session after refresh", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "5 min", exact: true }).click();
  await page.getByRole("button", { name: "Deploy hiker" }).click();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  await page.getByRole("button", { name: "Pause" }).click();
  await expect(page.getByRole("button", { name: "Resume" })).toBeVisible();
});

test("keeps timer controls available when the map provider fails", async ({
  page,
}) => {
  await page.route("https://tiles.openfreemap.org/**", (route) =>
    route.abort("failed"),
  );
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Deploy hiker" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("img", { name: /Virtual trail progress/ }),
  ).toBeVisible();
});

test("recovers an elapsed session directly at the summit", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "summitodoro:session:mt-ulap",
      JSON.stringify({
        version: 1,
        session: {
          id: "recovered-session",
          durationMs: 1_000,
          startedAt: Date.now() - 5_000,
          pausedAt: null,
          accumulatedPausedMs: 0,
          status: "running",
        },
        reachedCheckpointIds: ["pine-ridge", "grassland-view"],
      }),
    );
  });

  await page.goto("/hike/mt-ulap");
  const completion = page.getByRole("dialog", { name: "Summit secured!" });
  await expect(completion).toBeVisible();
  await expect(completion.getByText("+100 XP")).toBeVisible();
});
